# 方案包：Switch Image Crawler

**功能 ID**：003
**创建日期**：2026-04-18
**框架**：[frame.md](./frame.md)
**时间预算**：Medium Batch（2-3 个会话）
**状态**：塑形通过 — 于 2026-04-18 批准

---

## 问题

`data/vendors/` 下约 512 个开关文件夹，只有 ~1 个有产品照（`<1%` 视觉覆盖率）。详情页在规格/力曲线存在的情况下仍然"看起来像半成品"，用户被迫去 switchesdb/lumekeebs 离站确认开关长相。详见 [frame.md](./frame.md)。

## 需求（R）

| ID | 需求 | 状态 |
|----|------|------|
| R0 | popular vendors 下 ≥50% 的开关至少拥有 1 张产品照 | 核心目标 |
| R1 | 图片落地到 `data/vendors/<V>/<switch-path>/`，与现有 README.md 同级，沿用 `switch-image.*` 命名约定 | 必须项 |
| R2 | 每张下载的图片有归因元数据（源站点 + 源 URL） | 必须项 |
| R3 | 爬虫遵守 robots.txt，≥1s 限速，声明身份的 User-Agent | 必须项 |
| R4 | 严格名称匹配；不匹配的写入审查文件供人工修正 | 必须项 |
| R5 | 按源优先级覆盖（高优先级源的结果可覆盖低优先级源的结果，但不覆盖人工标记的文件） | 必须项 |
| R6 | 运行产出报告（匹配/跳过/失败计数，便于 PR review） | 必须项 |
| R7 | 可增量重跑（不重复下载已有文件，不重复命中 API） | 必须项 |
| R8 | 每个开关 >1 张图（画廊） | 可选项 |

## 解决方案

三阶段管线：**（1）抓取源目录 → 规范化产品记录**，**（2）严格匹配产品名到 data/vendors 路径**，**（3）下载匹配的图片 + 写入归因**。与现有 `scripts/copy-images.js` 管线无缝衔接——图片落在数据目录，复制脚本不变。

所有代码进入 `scripts/crawl_images/`；输出唯一落盘位置是 `data/vendors/*` 的图片文件和每个开关 README.md 的 `sources.images` 前缀块。无数据库，无新运行时依赖。

---

### 元素：源适配器（lumekeebs）

**What**：一个从 `https://lumekeebs.com/collections/switches/products.json?page=N&limit=250` 分页读取所有开关产品的模块，产出规范化的 `ProductRecord { vendor, title, images: {src, position}[], sourceUrl }`。

**Where**：新文件 `scripts/crawl_images/sources/lumekeebs.js`。

**Wiring**：被 `scripts/crawl_images/run.js` 调用；返回 `ProductRecord[]`。下游：matcher。

**受影响的代码**：新建。

**状态**：✅ 已验证 —— 探针确认 HTTP 200，250 个产品覆盖 Cherry(5)/Gateron(35)/Akko(11)/TTC(13)/Outemu(13)/Durock(4)/JWK(1)/Kailh(3) 等我们的 popular vendors，每个产品带 `vendor` 字段和 `images[].src` 数组。

---

### 元素：源适配器（milktooth）

**What**：milktooth.com 使用 Next.js 而非 Shopify 标准 `/products.json`（探针返回 HTML 404）。方案：抓取 `https://milktooth.com/collections/switches` 的 Next.js `__NEXT_DATA__` JSON 岛，或直接调用 Next.js 的 RSC/API 路由（需要 runbook 里的探针二次确认）。

**Where**：新文件 `scripts/crawl_images/sources/milktooth.js`。

**Wiring**：同 lumekeebs 适配器接口。

**受影响的代码**：新建。

**状态**：✅ 已验证通过修补 —— 见兔子洞 "milktooth 非 Shopify"。v1 将此源**声明超出范围**；如果时间允许在会话 3 中作为可选项加回。

---

### 元素：开关名匹配器（严格）

**What**：把 `ProductRecord.vendor + title` 规范化后在 `data/vendors/<vendor>/` 树下查找唯一匹配路径。规则（参照 `lib/data.ts:toSlug`）：
1. 用户选择的是严格匹配——归一化（小写、去标点、折叠空格/连字符）后必须与某个开关目录相对路径的归一化形式**完全相等**。
2. 源记录 `vendor` 字段必须等于或属于我们的 `popular vendors` 白名单。
3. 0 匹配 → 写入 `scripts/crawl_images/unmatched.log`。多匹配 → 写入 `ambiguous.log`（理论上严格模式下不应出现，但防御性记录）。

**Where**：新文件 `scripts/crawl_images/matcher.js`。复用 `scripts/copy-images.js` 中的 `toSlug` 和 `findSwitchDirs`。

**Wiring**：输入 `ProductRecord[]` + `data/vendors` 扫描结果 → 输出 `MatchedRecord { dirPath, product }[]` + unmatched/ambiguous 日志。

**受影响的代码**：新建；从 `copy-images.js` 提取 `toSlug` + `findSwitchDirs` 到 `scripts/crawl_images/lib/fs-utils.js` 并在两处引用（避免重复）。

**状态**：✅ 已验证 —— `toSlug` 逻辑已存在，reuse；`popular vendors` 白名单 = `data/vendors/` 下的顶级目录（已在 `lib/data.ts:getAllVendors()` 验证）。

---

### 元素：下载器（限速 + robots）

**What**：
- 每个源维护独立的 rate-limit 令牌桶（≥1 req/s）。
- 启动时拉取每个源的 `/robots.txt`；若目标路径被 disallow，跳过整个源并在报告中标注。
- User-Agent: `SwitchAtlasCrawler/1.0 (+https://github.com/<org>/switchatlas)`。
- 流式下载到临时文件，校验 `Content-Type: image/*`，然后原子 rename 到目标路径。
- **覆盖策略（R5）**：每个图片文件旁附带 `.source` 元文件记录源优先级（lumekeebs=10，milktooth=20，manual=∞）。如果现有文件没有 `.source`（即人工放置）→ 跳过。如果现有 `.source` 的优先级数值更低/等于新源 → 保留。否则覆盖。
- **增量（R7）**：文件已存在且 `.source` 来自同一 URL → 跳过下载。

**Where**：新文件 `scripts/crawl_images/downloader.js`。

**Wiring**：输入 `MatchedRecord[]` → 写文件到 `data/vendors/...` + `.source` 边车。

**受影响的代码**：新建。使用 Node 内置 `https` 模块（已在 `probe_sources.js` 中验证过），不引入新依赖。

**状态**：✅ 已验证。

---

### 元素：归因写入器

**What**：更新开关目录的 `README.md` 前置元数据，追加/合并 `sources.images` 数组：
```yaml
sources:
  images:
    - file: switch-image.jpg
      site: lumekeebs
      url: https://lumekeebs.com/products/hmx-xinhai
      fetched: 2026-04-18
```

**Where**：新文件 `scripts/crawl_images/attribution.js`。使用仓库已有的 `gray-matter`（见 `package.json`）解析/序列化 frontmatter。

**Wiring**：下载器写入文件后调用；幂等（重跑同一 URL 不追加重复条目）。

**受影响的代码**：
- 新建 `attribution.js`。
- **无需修改 `lib/data.ts`**——前置元数据中的 `sources.images` 对现有 loader 透明（它只读 `data.images.curve` 和文件系统中的图片）。v1 不在 UI 渲染归因；用户查看仓库/PR 即可见。
- 可选：后续功能把 `sources.images` 渲染到详情页"Credits"区（声明**超出 003 范围**）。

**状态**：✅ 已验证。

---

### 元素：命名约定 + 多图

**What**：每个开关目录下，第一张下载图命名 `switch-image.<ext>`（触发 `lib/data.ts` 的 primary 优先级），后续为 `source-lumekeebs-01.<ext>`、`source-lumekeebs-02.<ext>`……。这利用了 `lib/data.ts` 第 64 行 `orderedFiles = primaryFile ? [primaryFile, ...otherFiles]` 的已有行为。

**Where**：`scripts/crawl_images/downloader.js` 中的命名函数。

**Wiring**：无 UI 改动。

**状态**：✅ 已验证（读过 `lib/data.ts` 第 59-75 行）。

---

### 元素：运行器 + 报告

**What**：`scripts/crawl_images/run.js` 作为入口：
1. 解析 CLI 参数（`--source lumekeebs`、`--vendor Akko`、`--dry-run`、`--limit N`）。
2. 对每个启用的源：抓取 → 匹配 → 下载。
3. 输出 `scripts/crawl_images/report-<timestamp>.json`：
   ```json
   { "source": "lumekeebs", "fetched": 250, "matched": 87,
     "downloaded": 142, "skipped_existing": 15,
     "unmatched": 163, "errors": 2 }
   ```
4. 在 stdout 打印摘要 + 覆盖率差异（运行前 vs 运行后的 "has-image" 开关数）。

**Where**：新建 `scripts/crawl_images/run.js`。

**Wiring**：`package.json` 新增脚本 `"crawl:images": "node scripts/crawl_images/run.js"`。

**状态**：✅ 已验证。

---

### 场所：CLI 运行器

**UI 功能点**（CLI）：
| 功能点 | 类型 | 连出 | 返回到 |
|--------|------|------|--------|
| `--source <name>` | flag | 选择适配器 | sources/<name>.js |
| `--vendor <V>` | flag | 筛选 MatchedRecord | matcher |
| `--dry-run` | flag | 跳过 downloader 写入 | 仍输出报告 |
| `--limit N` | flag | 每源最多下载 N 个新文件 | downloader |

**代码功能点**：
| 功能点 | 类型 | 连出 | 返回到 |
|--------|------|------|--------|
| `fetchCatalog(source)` | async fn | Shopify/Next.js endpoint | `ProductRecord[]` |
| `matchProducts(records, vendors)` | fn | 扫描 `data/vendors/` | `MatchedRecord[]` + logs |
| `downloadImages(matches)` | async fn | HTTPS GET + 限速 | 写文件 + `.source` |
| `writeAttribution(dir, entry)` | fn | gray-matter 解析/写 README | 更新 README frontmatter |
| `emitReport(stats)` | fn | fs.writeFile | `report-*.json` + stdout |

---

## 适配检查（R × 解决方案）

| | lumekeebs 源 | milktooth 源 | matcher | downloader | attribution | 命名约定 | 运行器 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| R0：≥50% 覆盖率 | ✅ | | ✅ | ✅ | | | ✅ |
| R1：落地 data/vendors | | | ✅ | ✅ | | ✅ | |
| R2：归因 | | | | ✅ | ✅ | | |
| R3：robots + 限速 | | | | ✅ | | | |
| R4：严格匹配 + 审查 | | | ✅ | | | | ✅ |
| R5：按优先级覆盖 | | | | ✅ | | | |
| R6：运行报告 | | | ✅ | ✅ | | | ✅ |
| R7：增量 | | | | ✅ | ✅ | | |
| R8：多图（可选） | ✅ | | | | | ✅ | |

每个 R 至少一个 ✅；milktooth 列本身可为空——在 v1 被削减（见兔子洞），如 v2 加回则填充 R0/R8 列。

---

## 兔子洞

- **milktooth 非 Shopify**：探针返回 HTTP 404 JSON 端点 + Next.js HTML。HTML 抓取的 `__NEXT_DATA__` 结构会随 Next.js 构建而变，脆弱。
  - 详情：**声明超出 v1 范围**。v1 仅用 lumekeebs（已确认覆盖所有 popular vendors）。如果会话 3 有余量，作为最后任务加回；否则留给后续功能。

- **switchesdb / ThereminGoat 没有独立产品照**：探针显示 `heralden/switchesdb` 只是 Clojure 前端 + 两个子模块（theremingoat、bluepylons）；ThereminGoat 开关目录只有 `.xlsx/.csv/.pdf`，没有 `.jpg/.png`。
  - 详情：**声明超出范围**——框架中列出这些是误解。图片来源只有零售/电商站。如果未来要从 PDF 提取封面照，属于独立功能。

- **严格匹配 → 低命中率**：lumekeebs 用 `HMX Xinhai (5-Pin)` 这样的标题，我们数据目录用 `Xinhai`。严格归一化会漏掉大量应匹配的。
  - 详情：**修补**——matcher 的归一化除了小写/去标点，额外剥离一组"噪音 token"：`5-pin`、`3-pin`、`pcs`、`switches`、`switch`、数字包装规格（`10pcs`、`x10`）。这仍然是"严格"（不做编辑距离 / 模糊），只是规范化更激进。不匹配的行为仍是写入 `unmatched.log` 供人工修正，不自动模糊配对。

- **同一开关多张图去重**：lumekeebs 一个产品 ~9 张图（盒子、配件、多角度）。全下会塞满目录。
  - 详情：**修补**——v1 默认每产品只取 `position=1`（主图）。R8（多图）默认关闭，通过 `--multi-image` flag 开启，最多每产品取 3 张。

- **GitHub API 限速 / 下载失败**：`probe_sources.js` 已做过 GitHub API 调用，已知 60 req/h 未认证上限。本功能不使用 GitHub API（仅 Shopify JSON + CDN 直连），不受影响——记录在此以防塑形后误加。
  - 详情：**非问题**，明确记录以避免未来混淆。

- **人工放置文件被误覆盖**：R5 要求"按优先级覆盖"但不能破坏人工curation。
  - 详情：**修补**——覆盖策略的守卫是**存在 `.source` 边车文件且 priority < 新源** 才覆盖。人工放置的文件**没有 `.source` 边车**，因此永远被跳过。`.source` 边车是 crawler 的所有权标记。

- **Shopify CDN 图片是 webp**：lumekeebs 的 `images[].src` 可能返回带 `_2048x2048` 后缀的变体 URL。
  - 详情：**修补**——下载时移除 URL 中的 `_<W>x<H>` 变体参数，请求原图，但给一个 `?width=1600` 上限避免极大文件。`Content-Length` > 10MB 的跳过并记录错误。

## 排除项

- **不爬取规格/型号/价格数据**——仅图片。
- **不处理 `other_vendors/`** 存档。
- **不做 AI 图像分类/裁剪/增强**。
- **不在 UI 中渲染归因**——数据已写入 frontmatter，UI 渲染是后续功能。
- **不改动 `lib/data.ts` 或 `scripts/copy-images.js`**——本功能靠进入文件系统约定而非代码耦合生效。
- **milktooth 源 v1 不交付**（见兔子洞）。

## 技术验证

**已审查的代码库**：
- [lib/data.ts](lib/data.ts#L38-L85)：图片读取逻辑——确认 `switch-image.*` primary + 其余字母序；确认 frontmatter 仅被读取 `images.curve`/`force`/`travel` 字段，新增 `sources.images` 字段不干扰。
- [lib/types.ts](lib/types.ts#L1-L30)：`Switch` 接口不需扩展（`image`/`images` 来自文件系统扫描而非 frontmatter）。
- [scripts/copy-images.js](scripts/copy-images.js#L1-L70)：确认 `data/vendors/<V>/<slug-path>/` → `public/images/vendors/<V>/<slug>/` 的复制逻辑——crawler 落地位置正确，无需改该脚本。
- [scripts/probe_sources.js](scripts/probe_sources.js#L1-L50)：确认 Node `https` 模块 + GitHub API 调用模式已在仓库中使用；爬虫复用同款。
- [package.json](package.json#L1-L30)：`gray-matter` 已是运行时依赖；无需新增包即可读写 frontmatter。

**已验证的方法**（活探针）：
- lumekeebs `/collections/switches/products.json?limit=250` → HTTP 200，产品带 `vendor` + `images` 字段，覆盖所有 popular vendors。
- milktooth `/products.json` → HTTP 404（非 Shopify），已削减到 v2。
- switchesdb GitHub repo → 仅 Clojure 前端 + 子模块，无图片资产，已移除。
- ThereminGoat switch dir → 仅 `.xlsx/.csv/.pdf`，无图片，已移除。

**已解决的标记未知因素**：所有 ⚠️ 要么转为 ✅（lumekeebs 验证、匹配策略、命名约定），要么通过削减/修补解决（milktooth 超出范围、switchesdb/ThereminGoat 无图、严格匹配噪音 token 归一化、多图默认关闭、覆盖守卫通过 `.source` 边车）。

**测试策略**：
- 每个模块（sources、matcher、downloader、attribution）单元测试使用固定 fixture（捕获的 lumekeebs JSON 切片 + 模拟的 `data/vendors/` 树）。
- `--dry-run` 端到端：对真实 lumekeebs 跑一次，断言报告中 `matched > 50 && downloaded == 0 && unmatched.log` 非空（期望有不匹配）。
- 归因幂等性：对同一 URL 跑两次，断言 README frontmatter 中 `sources.images` 条目数不变。
- 覆盖策略：fixture 中放入一个无 `.source` 的手工文件，断言 crawler 运行后该文件字节完全一致。

**预期 R0 命中**：lumekeebs 250 产品 × ~35% 严格匹配命中率（粗估）≈ 88 个开关 ≈ popular vendors 的 ~17%。若需到 50% 还需 milktooth（v2）或其它源——**v1 明确承诺的是"建立管线 + 落地首批 ≥15% 覆盖"**，50% 是多轮运行+扩源后的目标，不是单次 v1 交付。R0 需要相应下调：

> **R0 修正**：v1 交付"从 <1% 提升到 ≥15% 覆盖 + 可重复运行的管线"。≥50% 为后续迭代目标。

---

## 状态：已交付 — 于 2026-04-19 归档（原塑形通过 2026-04-18）
