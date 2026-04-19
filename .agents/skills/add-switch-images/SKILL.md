---
name: add-switch-images
description: >
  给 SwitchAtlas 中缺少图片的机械键盘轴体添加产品照片。涵盖完整流程：
  诊断覆盖率、运行自动爬虫批量抓取、手动为单个轴体放图、编写新零售商爬虫源、
  调试匹配失败、验证结果并触发构建。当用户提到 "补图"、"加图片"、"add images"、
  "crawl images"、"提升覆盖率"、"image coverage"、"没有图片的轴"、"missing images"、
  "run crawler"、"new source adapter" 时使用。即使用户只是随口提到某个轴没图，
  也应该使用这个技能来诊断和解决。
---

# 给轴体添加图片

> **参考索引** — 按需读取，不要全部预加载。
>
> | 文件 | 内容 | 何时读 |
> |------|------|--------|
> | `references/crawler-guide.md` | 匹配器原理、调试不匹配、覆盖策略、归因、爬虫伦理 | 调试匹配问题或理解覆盖策略时 |
> | `references/new-source-guide.md` | 编写新 Shopify/JSON-LD 源适配器的完整指南 | 需要添加新零售商时 |
> | `scripts/check-coverage.sh` | 按 vendor 统计图片覆盖率 | 诊断阶段直接运行 |

---

## 背景

SwitchAtlas 中，没有图片的轴体在列表页被自动隐藏（`lib/data.ts` 的
`hasRealImage()` 过滤，见 ADR 0005）。**添加图片 = 让轴体可见。**

图片的生命周期：

```
来源（零售商/手动）
    ↓
data/vendors/<V>/<Switch>/switch-image.<ext>     ← 原始位置
    ↓  scripts/copy-images.js
public/images/vendors/<V>/<slug>/switch-image.<ext>  ← 构建产物
    ↓  next build
站点页面上可见
```

---

## 步骤 1：诊断

先了解现状再决定策略。运行打包的覆盖率检查脚本：

```bash
bash <skill-dir>/scripts/check-coverage.sh
```

输出按 vendor 的有图/总数/百分比表。展示给用户，指出缺口最大的 vendor。

---

## 步骤 2：选策略

根据诊断结果，用 **AskUserQuestion** 引导用户选择：

| 策略 | 适用场景 | 操作量 |
|------|---------|--------|
| **自动爬虫（全量）** | 首次批量提升覆盖率 | `npm run crawl:images` |
| **自动爬虫（定向）** | 补特定 vendor 或用特定源 | `--source X --vendor Y` |
| **手动放图** | 单个轴、爬虫匹配不到、有自己的照片 | 复制文件 |
| **添加新源** | 现有 5 个源已触顶 (~13%) | 写 adapter |

---

## 步骤 3：执行

### 路径 A：自动爬虫

**永远先干跑。** 干跑只抓目录和匹配，不下载任何图片。错误匹配 = 错误图片，
比没有图更糟。

```bash
# 干跑（全量）
npm run crawl:images:dry

# 干跑（定向 — vendor 或 source）
node scripts/crawl_images/run.js --dry-run --source lumekeebs
node scripts/crawl_images/run.js --dry-run --vendor Akko
```

检查干跑报告里的 `matched` / `unmatched` / `would_download_new` 计数。
如果 unmatched 数量异常高，先读 `references/crawler-guide.md` 的调试章节。

确认合理后，执行下载：

```bash
# 推荐：先小范围
node scripts/crawl_images/run.js --source lumekeebs --vendor Akko --limit 5

# 全量
npm run crawl:images
```

爬虫对每个匹配的轴会做三件事：
1. 下载图片 → `switch-image.<ext>`
2. 写所有权标记 → `switch-image.<ext>.source`（JSON 边车）
3. 更新 README.md 归因 → `sources.images` frontmatter 数组

### 路径 B：手动放图

```bash
# 放入主图 — 文件名必须是 switch-image.<ext>
cp ~/photo.jpg data/vendors/Cherry/MX\ Black/switch-image.jpg
```

三条规则：
- **命名 `switch-image.<ext>`** — `lib/data.ts` 优先读取这个名称作为主图
- **不要创建 `.source` 文件** — 没有 `.source` = "人工放置"，爬虫永远不会覆盖它
- **不要命名为 `force-curve.*`** — 那个前缀是力曲线专用

可选：在 README.md frontmatter 里加归因（如果图片来自某个网站）：

```yaml
sources:
  images:
    - file: switch-image.jpg
      site: reddit
      url: https://example.com/original.jpg
      sourceUrl: https://reddit.com/r/...
      fetched: '2026-04-19'
```

### 路径 C：添加新源

读 `references/new-source-guide.md` 获取完整指南。简要流程：

1. **探测**：`curl` 检查目标站的 Shopify JSON 或 sitemap/JSON-LD
2. **写 adapter**：Shopify 站用 `createShopifySource()` 工厂（5 行代码）；
   非 Shopify 参考 `sources/milktooth.js` 模式
3. **注册**：在 `scripts/crawl_images/run.js` 的 `SOURCES` 对象中添加
4. **干跑测试**：`--dry-run --source newstore`

---

## 步骤 4：验证 + 构建

不管用哪条路径，最后都要：

```bash
# 1. 复制图片到 public/（必须！data/ 里的图不会自动出现在站点上）
node scripts/copy-images.js

# 2. 重新检查覆盖率
bash <skill-dir>/scripts/check-coverage.sh

# 3. 构建站点
npm run build
```

构建通过后，用浏览器验证新图片是否正确显示。注意 `hasRealImage()` 过滤意味着
新增图片的轴会从"隐藏"变为"列表页可见"——页面数会增加。

---

## 速查表

### "给 Akko 快速补几张图"

```bash
node scripts/crawl_images/run.js --dry-run --vendor Akko    # 看匹配情况
node scripts/crawl_images/run.js --vendor Akko               # 下载
node scripts/copy-images.js && npm run build                  # 构建
```

### "某个轴的图不对"

```bash
cat data/vendors/<V>/<Switch>/switch-image.jpg.source        # 看来源
rm data/vendors/<V>/<Switch>/switch-image.{jpg,jpg.source}   # 删爬虫图+边车
cp /correct.jpg data/vendors/<V>/<Switch>/switch-image.jpg   # 放正确的（不带 .source）
```

### "爬虫匹配不到 Cherry MX Black"

```bash
# 对比 normalize 结果
node -e "
  const m = require('./scripts/crawl_images/matcher');
  console.log('title:', m.normalizeTitleForMatch('Cherry', 'Cherry MX Black Linear Switch'));
  console.log('dir:  ', m.normalizeDirNameForMatch('MX Black'));
"
# 如果不同 → 见 references/crawler-guide.md 的调试章节
```

### "当前哪些 vendor 在站点上不可见？"

跑 `check-coverage.sh`，0 图的 vendor 在列表页/侧边栏中被隐藏。

---

## 关键文件速查

| 路径 | 作用 |
|------|------|
| `scripts/crawl_images/run.js` | 爬虫入口。CLI: `--dry-run`, `--source`, `--vendor`, `--limit` |
| `scripts/crawl_images/matcher.js` | 严格名称匹配。`VENDOR_ALIASES`, `NOISE_TOKENS` 在这里 |
| `scripts/crawl_images/downloader.js` | 限速下载 + `.source` 边车策略 |
| `scripts/crawl_images/sources/shopify.js` | Shopify 工厂。新 Shopify 源只需调用它 |
| `scripts/crawl_images/sources/milktooth.js` | JSON-LD 参考实现 |
| `scripts/copy-images.js` | data/ → public/ 图片复制（构建前必须运行） |
| `lib/data.ts` | `hasRealImage()` 谓词 + `getSwitchesByVendor()` 过滤逻辑 |

---

## 不要做的事

- **不干跑就下载** — 错误匹配会放上错误图片，比没有图更伤害信任度
- **给手动图写 `.source`** — 这会让爬虫认为可以覆盖你的手动图片
- **跳过 `copy-images.js`** — 图片在 `data/` 里不会自动出现在 `public/`
- **绕过爬虫限速/UA** — 被封了就换源或手动补，不要反伦理操作
- **改 `hasRealImage()` 来显示无图轴** — 那是展示层的设计决策（ADR 0005），不是图片问题
