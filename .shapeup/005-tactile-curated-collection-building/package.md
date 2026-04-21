# 方案包：按类型发现轴体（Linear / Tactile / Clicky）

**功能 ID**：005
**创建日期**：2026-04-19
**框架**：[frame.md](./frame.md)
**时间预算**：Medium Batch（2-3 个会话）
**状态**：塑形通过 — 于 2026-04-21 批准

---

## Problem

## 问题

当前 `data/vendors/` 下共有 **499** 个轴体目录（`README.md`），但 `type` 字段几乎全部是 `Unknown`（496+）。用户无法按最基础的维度（Linear / Tactile / Clicky）进行发现，只能靠逐个点进 vendor 或猜名称。与此同时，UI 侧也没有按类型筛选入口，导致数据库“有数据但不可发现”。

基线：
- 499 个轴体中，`type` 基本未补全；`sound` 仅 1 条
- `gallery` 是平面轮播，`vendor` 页只显示固定数量卡片，不支持类型筛选
- 用户最常见的选轴心智模型（先按类型）无法完成

## Appetite

## 时间预算

**Medium Batch（2-3 个会话）**

- 会话 1：元数据补全管线（type + sound）与报告
- 会话 2：类型筛选 UI（gallery + vendor）
- 会话 3：人工复核低置信结果、收尾与测试

## Requirements

## 需求（R）

| ID | 需求 | 状态 |
|----|------|------|
| R0 | 用户可以按轴体类型（Linear / Tactile / Clicky）浏览与发现轴体 | 核心目标 |
| R1 | 499 个轴体的 `type` 从 Unknown 补全为可用分类 | 必须项 |
| R2 | Gallery 与 Vendor 列表页提供按类型筛选入口 | 必须项 |
| R3 | `sound` 字段同步补全（至少 Silent 类可确定值） | 必须项 |
| R4 | 分类结果具备可审计准确率（自动推断 + 人工复核） | 必须项 |
| R5 | 导航层增加按类型入口（不破坏现有 vendor 浏览） | 可选项 |

## Solution

## 解决方案

采用“两段式方案”：
1) **离线补全数据**（脚本批处理 + 报告 + 人工复核）把 `type/sound` 从“不可用”提升到“可筛选”；
2) **前端筛选入口**（gallery/vendor）直接消费已有字段，避免新后端服务与数据库迁移。

方案优先利用已存在的力曲线资产（`force-curve*.csv` 覆盖 **497/499**），再用名称/来源 URL 关键词做交叉校验。低置信样本进入人工复核清单，确保最终可交付质量。

---

### Element: 分类与补全运行器（批处理）

**What**：新增一条批处理命令，遍历 `data/vendors/**/README.md`，对每个轴体推断 `type` 与 `sound`，并回写 frontmatter。

**Where**：
- 新建 `scripts/classify_switches/run.js`
- 新建 `scripts/classify_switches/frontmatter.js`（读写 frontmatter，复用 `gray-matter`）
- `package.json` 新增脚本（如 `classify:metadata`）

**Wiring**：
`README + force-curve*.csv + name/sourceUrl` → 分类器 → 回写 `README.md` frontmatter → 产出 report/review 文件。

**受影响的代码**：
- `data/vendors/*/*/README.md`（批量字段更新）
- `scripts/classify_switches/*`（新增）
- `package.json`（新增 npm script）

**复杂度**：中

**状态**：✅ 已验证（探针）
- 递归统计：`README.md = 499`
- 力曲线文件：`force-curve.csv | force-curve-simu.csv = 497`

---

### Element: 力曲线形状分类器（核心）

**What**：基于按压阶段的力-位移曲线形状识别类型：
- 存在明显 bump（峰值后下降）→ Tactile
- 无 bump（近单调上升）→ Linear
- Clicky 由“关键词 + 人工复核”判定（不依赖曲线单独判定）

**Where**：新建 `scripts/classify_switches/curve.js`

**Wiring**：
`run.js` 读取每个轴体曲线 → `curve.js` 输出 `{type, confidence, signals}` → 与关键词证据融合 → 最终 type。

**受影响的代码**：`scripts/classify_switches/run.js`, `scripts/classify_switches/curve.js`

**复杂度**：中

**状态**：✅ 已验证（探针）
- 已用 Node 探针跑完整树并产出可分布结果（Linear/Tactile/Clicky 均可分配）
- 曲线可读覆盖远高于名称关键词覆盖（8% vs ~99%）

---

### Element: 关键词证据层 + 复核队列

**What**：名称与来源 URL 关键词作为二次证据：
- `clicky|jade|navy|blue` 等 → Clicky 候选
- `tactile|brown|clear|orange` 等 → Tactile 候选
- `linear` → Linear 候选
- 曲线结果与关键词冲突时，写入人工复核清单

**Where**：`scripts/classify_switches/run.js`（融合策略）

**Wiring**：
曲线证据 + 文本证据 → 置信度评分 →
- 高置信：直接回写
- 低置信/冲突：写入 `scripts/classify_switches/reports/review-*.csv`

**受影响的代码**：`scripts/classify_switches/run.js`, `scripts/classify_switches/reports/*`

**复杂度**：中

**状态**：✅ 已验证（探针）
- 名称含 `tactile|clicky|linear|silent` 的样本仅 ~39/499，适合作为“校验层”而非主分类层

---

### Element: Sound 补全器

**What**：补全 `sound` 字段的“可确定值”：
- 名称或来源 URL 明确包含 `silent` → `sound: Silent`
- 已有 sound 值不覆盖
- 其他样本不强猜，留给后续更细分特征模型（避免错误标签污染）

**Where**：`scripts/classify_switches/run.js`

**Wiring**：frontmatter `name/sources` + existing sound → sound 决策 → frontmatter 回写。

**受影响的代码**：`data/vendors/*/*/README.md`, `scripts/classify_switches/run.js`

**复杂度**：低

**状态**：✅ 已验证（探针）
- 显式 `Silent` 名称命中约 27 条，可稳定补全

---

### Element: 类型筛选 UI（Gallery + Vendor）

**What**：在两个核心浏览场所增加类型筛选 chips（All / Linear / Tactile / Clicky），并展示当前过滤结果计数。

**Where**：
- `components/gallery.tsx`
- `components/vendor-content.tsx`
- `app/gallery/page.tsx`
- `app/(browse)/vendors/[vendor]/page.tsx`
- `lib/data.ts`（新增按 type 过滤能力）

**Wiring**：
页面加载 switch 列表 → 客户端 type filter state → 渲染过滤后的卡片/轮播集合。

**受影响的代码**：上述文件

**复杂度**：中

**状态**：✅ 已验证
- 每 vendor 数据量上限约 100（Gateron），前端过滤可承受

---

### Element: 按类型导航入口（可选）

**What**：在侧边栏或首页增加“按类型浏览”入口（不替代 vendor 入口）。

**Where**：
- `components/sidebar.tsx`（优先）或 `components/home-content.tsx`

**Wiring**：
类型入口 → 带类型上下文进入 gallery/vendor（query 或本地状态）

**受影响的代码**：`components/sidebar.tsx` / `components/home-content.tsx`

**复杂度**：低

**状态**：✅ 已验证（实现路径明确）

---

#### 场所：Gallery（`/gallery`）

**UI 功能点：**
| 功能点 | 类型 | 连出 | 返回到 |
|--------|------|------|--------|
| Type chips（All/Linear/Tactile/Clicky） | 分段按钮 | 更新本地 `activeType` | 过滤后的轮播序列 |
| 结果计数 | 文本状态 | 读取过滤后长度 | 顶部状态栏 |
| 上下切图、左右切轴 | 手势/按键 | 在过滤后数组内导航 | 当前轴卡片 |

**代码功能点：**
| 功能点 | 类型 | 连出 | 返回到 |
|--------|------|------|--------|
| `filterByType()` | 函数 | 读取 `switches` + `activeType` | `filteredSwitches` |
| `syncHashToFilteredIndex()` | 函数 | URL hash → filtered index | 初始 current |
| `navigateSwitch()` | 函数 | 过滤后数组边界处理 | 新 current |

---

#### 场所：Vendor 列表（`/vendors/[vendor]`）

**UI 功能点：**
| 功能点 | 类型 | 连出 | 返回到 |
|--------|------|------|--------|
| Type chips | 分段按钮 | 切换 type 过滤 | 过滤后卡片网格 |
| 已筛选数量 | 文本状态 | 读取过滤后结果 | 页头统计 |
| 清除筛选 | 按钮 | 重置为 All | 全量 vendor 列表 |

**代码功能点：**
| 功能点 | 类型 | 连出 | 返回到 |
|--------|------|------|--------|
| `getSwitchesByVendor(v, limit?, { type })` | 数据函数 | 读取 vendor 目录 | 按 type 过滤列表 |
| `VendorContent` 本地筛选状态 | React 状态 | 驱动网格重渲染 | 过滤后的 `SwitchCard[]` |
| `TypeBadge` 复用 | 组件 | 使用 `sw.type` | 可视分类标签 |

---

#### 场所：元数据批处理 CLI

**UI 功能点（CLI flag）：**
| 功能点 | 类型 | 连出 | 返回到 |
|--------|------|------|--------|
| `--dry-run` | flag | 不写回 README | 仅报告 |
| `--vendor <name>` | flag | 限定 vendor 子集 | 子集报告 |
| `--review-only` | flag | 只导出冲突/低置信项 | review CSV |
| `--apply` | flag | 回写 frontmatter | 更新后的数据树 |

**代码功能点：**
| 功能点 | 类型 | 连出 | 返回到 |
|--------|------|------|--------|
| `scanSwitchDirs()` | 函数 | 递归 `data/vendors` | switch entries |
| `inferType()` | 函数 | 曲线 + 关键词融合 | `{type, confidence}` |
| `inferSound()` | 函数 | name/source/sound existing | sound 值 |
| `writeFrontmatterPatch()` | 函数 | gray-matter stringify | README 更新 |
| `emitReport()` | 函数 | 输出 JSON/CSV | 复核与审计资产 |

## Fit Check

## 适配检查（R × 解决方案）

| | 元素：批处理运行器 | 元素：力曲线分类器 | 元素：关键词+复核 | 元素：Sound 补全 | 元素：类型筛选 UI | 元素：类型导航入口 |
|---|---|---|---|---|---|---|
| R0：按类型发现轴体 | ✅ | ✅ | ✅ |  | ✅ | ✅ |
| R1：499 条 type 补全 | ✅ | ✅ | ✅ |  |  |  |
| R2：Gallery/Vendor 筛选入口 |  |  |  |  | ✅ |  |
| R3：sound 同步补全 | ✅ |  | ✅ | ✅ |  |  |
| R4：准确率可审计 | ✅ | ✅ | ✅ |  |  |  |
| R5：导航按类型入口（可选） |  |  |  |  |  | ✅ |

每个 R 至少映射 1 个元素；无覆盖缺口。

## Rabbit Holes

## 兔子洞

- **兔子洞 1：Clicky 是否能单靠曲线可靠识别？**
  - 结论：不能在本批次作为唯一依据。
  - 处理：**修补漏洞**。Clicky 采用“关键词证据 + 人工复核”；曲线只做 tactile/linear 主分流。

- **兔子洞 2：若强行补满 499 条会不会引入错误标签？**
  - 结论：纯自动会有低置信样本。
  - 处理：**修补漏洞**。引入 `review-*.csv`，把冲突项与低置信项集中人工确认；交付前确保 Unknown=0。

- **兔子洞 3：sound 字段没有统一词表，如何避免污染？**
  - 结论：自由文本全量推断风险高。
  - 处理：**缩减**。本批次只补全确定性 `Silent`（含既有值保留）；其余不猜测，后续单独演进 sound taxonomy。

- **兔子洞 4：Vendor 页当前只取 12 条，筛选后可能“看起来没结果”**
  - 结论：会造成体验假阴性。
  - 处理：**修补漏洞**。Vendor 页改为加载该 vendor 全量（上限约 100），再本地筛选。

- **兔子洞 5：批量改 499 个 README 的回归风险**
  - 结论：需要可回滚与可审计。
  - 处理：**修补漏洞**。默认 `--dry-run`，`--apply` 才写入；每次输出 before/after 统计与变更清单，配合 PR review。

## No-Gos

## 排除项

- 不做新的后端服务、数据库迁移或在线推断 API。
- 不在本批次引入复杂声音分类（如 Thocky/Clacky 的自动判别模型）。
- 不做像素级 UI 重设计，仅增加筛选/导航功能点。
- 不改动图片爬虫主流程（`scripts/crawl_images/*`）的责任边界。

## 技术验证

**已审查的代码库**：
- `lib/types.ts`（type 联合类型与 sound 字段）
- `lib/data.ts`（目录扫描、frontmatter 读取、vendor 聚合）
- `components/gallery.tsx`（轮播状态机与键盘/手势导航）
- `components/vendor-content.tsx`、`components/sidebar.tsx`（浏览入口）
- `app/gallery/page.tsx`、`app/(browse)/vendors/[vendor]/page.tsx`（数据注入点）
- `scripts/crawl_images/attribution.js`（frontmatter 幂等写入模式）

**已验证的方法（探针）**：
- `find data/vendors -name README.md` → 499
- `find data/vendors -name force-curve.csv -o -name force-curve-simu.csv` → 497
- Vendor 规模上限：Gateron 100 / Kailh 93 / TTC 91（全量前端筛选可承受）
- Node 探针已可跑完整树并输出可分布分类结果

**已解决的标记未知因素**：
- Clicky 识别不再依赖单一曲线信号（已修补）
- sound 采用确定性补全策略（已缩减）
- Vendor 页 12 条限制导致的筛选误导（已修补）
- 批量写入回滚/审计问题（已修补）

**测试策略（TDD）**：
- `scripts/classify_switches/__tests__/curve.test.js`：曲线分类（linear/tactile）样本测试
- `scripts/classify_switches/__tests__/infer.test.js`：关键词融合与冲突分流测试
- `scripts/classify_switches/__tests__/frontmatter.test.js`：幂等写入与保留已有字段
- 前端组件测试：type chips 切换与结果计数
- 回归验证：`type` 分布统计 + `Unknown` 计数归零断言 + `sound: Silent` 命中断言

---

## 状态：塑形通过 — 于 2026-04-21 批准
