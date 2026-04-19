---
name: add-switch-images
description: >
  给 SwitchAtlas 中缺少图片的机械键盘轴体添加产品照片。可以通过两种方式补图：
  (1) 运行已有的自动爬虫从零售商网站批量抓取匹配图片；
  (2) 手动为单个轴体添加图片文件。技能涵盖完整流程：诊断当前覆盖率、
  选择补图策略、执行爬虫或手动放置、验证结果、触发构建管线。
  当用户说 "补图"、"加图片"、"add images"、"crawl images"、"提升覆盖率" 时使用。
---

# 给无图轴体添加图片

你正在帮助用户给 SwitchAtlas 项目中缺少产品照片的轴体补充图片。

---

## 项目背景

SwitchAtlas 是一个 Next.js 静态导出站点，展示机械键盘轴体的数据（力曲线、参数、图片）。
数据存放在 `data/vendors/<Vendor>/<Switch>/README.md`（frontmatter + Markdown）。
图片在构建时通过 `scripts/copy-images.js` 从 `data/vendors/` 复制到 `public/images/vendors/`。

**关键约定**：
- 没有图片的轴体在列表页被隐藏（`lib/data.ts` 的 `hasRealImage()` 过滤）
- 添加图片 = 让轴体在站点上可见
- 图片文件名 `switch-image.<ext>` 是主图（优先展示）

---

## 你的角色

你是一个**图片补充代理**。你的工作：
1. 诊断当前覆盖率
2. 帮用户选择最合适的补图策略
3. 执行补图操作
4. 验证结果并触发构建

---

## 架构概览

```
data/vendors/
├── Akko/
│   ├── Botany/
│   │   ├── README.md              ← frontmatter 含 sources.images 归因
│   │   ├── switch-image.png       ← 主图（爬虫或手动放置）
│   │   ├── switch-image.png.source ← 爬虫写入的所有权标记（JSON）
│   │   └── force-curve.csv
│   └── Air/
│       └── README.md              ← 无图 → 列表页不展示此轴

scripts/crawl_images/
├── run.js                         ← 爬虫入口
├── matcher.js                     ← 严格名称匹配器
├── downloader.js                  ← 限速下载 + .source 边车
├── attribution.js                 ← 写 README frontmatter 归因
├── lib/
│   ├── fs-utils.js                ← toSlug, findSwitchDirs, listVendors
│   └── http.js                    ← get, getJson, getText + UA
└── sources/
    ├── shopify.js                 ← Shopify 通用工厂
    ├── lumekeebs.js               ← Shopify 源 (priority 10)
    ├── kbdfans.js                 ← Shopify 源 (priority 11)
    ├── divinikey.js               ← Shopify 源 (priority 12)
    ├── novelkeys.js               ← Shopify 源 (priority 13)
    └── milktooth.js               ← JSON-LD 抓取源 (priority 20)

scripts/copy-images.js             ← 构建时：data/ → public/images/
lib/data.ts                        ← hasRealImage(), getSwitchesByVendor() 过滤
```

---

## 步骤 1：诊断当前覆盖率

运行以下命令了解现状：

```bash
# 总轴数 vs 有图轴数
cd <project-root>
total=$(find data/vendors -name README.md | wc -l | tr -d ' ')
with_img=$(find data/vendors -type d -exec sh -c \
  'ls "$1"/*.jpg "$1"/*.jpeg "$1"/*.png "$1"/*.webp 2>/dev/null | grep -v force-curve | head -1' _ {} \; \
  2>/dev/null | wc -l | tr -d ' ')
echo "覆盖率: $with_img / $total ($(echo "scale=1; $with_img * 100 / $total" | bc)%)"

# 按 vendor 分布
for v in data/vendors/*/; do
  vname=$(basename "$v")
  vt=$(find "$v" -name README.md | wc -l | tr -d ' ')
  vi=$(find "$v" -type d -exec sh -c \
    'ls "$1"/*.jpg "$1"/*.jpeg "$1"/*.png "$1"/*.webp 2>/dev/null | grep -v force-curve | head -1' _ {} \; \
    2>/dev/null | wc -l | tr -d ' ')
  echo "$vname: $vi/$vt"
done
```

把结果展示给用户，让他们知道哪些 vendor 缺口最大。

---

## 步骤 2：选择补图策略

使用 **AskUserQuestion** 引导用户选择：

**问题**："你想怎么补图？"
**选项**：
- **自动爬虫（批量）**：运行 `npm run crawl:images` 从零售商网站自动匹配和下载。适合批量提升覆盖率。
- **自动爬虫（定向）**：指定 vendor 或 source 运行。适合补特定 vendor 的缺口。
- **手动添加单个图片**：手动下载图片放入对应目录。适合爬虫匹配不到的特殊轴体。
- **添加新的爬虫源**：为一个新的零售商网站编写 source adapter。适合现有源已触及覆盖天花板。

---

## 步骤 3A：自动爬虫（批量或定向）

### 3A.1 干跑（Dry Run）— 先看报告再下载

**永远先干跑。** 干跑只抓取目录和匹配，不下载任何图片。

```bash
# 全量干跑
npm run crawl:images:dry

# 定向：只跑某个 source
node scripts/crawl_images/run.js --dry-run --source lumekeebs

# 定向：只看某个 vendor
node scripts/crawl_images/run.js --dry-run --source lumekeebs --vendor Akko
```

干跑会输出：
- `[baseline]` 当前覆盖率
- 每个 source 的 fetched / matched / unmatched / ambiguous 计数
- `would_download_new` — 实际会新增多少张图
- 报告文件在 `scripts/crawl_images/reports/` 下

**检查报告**：
```bash
# 查看未匹配的（可能需要手动处理）
cat scripts/crawl_images/reports/lumekeebs/unmatched.log | head -20

# 查看匹配结果
cat scripts/crawl_images/reports/lumekeebs/matched.log | head -20
```

### 3A.2 执行下载

确认干跑结果合理后：

```bash
# 全量运行
npm run crawl:images

# 定向运行（推荐：先小范围验证）
node scripts/crawl_images/run.js --source lumekeebs --vendor Akko --limit 5
```

### 3A.3 爬虫做了什么

对每个匹配的轴体，爬虫会：
1. **下载图片** → `data/vendors/<V>/<Switch>/switch-image.<ext>`
2. **写 `.source` 边车** → `switch-image.<ext>.source`（JSON: `{source, priority, url, sourceUrl, fetched}`）
3. **更新 README.md 归因** → frontmatter 的 `sources.images` 数组追加条目

**覆盖策略**（由 `.source` 边车控制）：
| 现有文件 | 有 .source？ | 动作 |
|----------|-------------|------|
| 无 | — | 下载 |
| 有 | 无（手动放置） | **跳过** — 永不覆盖人工图 |
| 有 | 有，同 URL | 跳过 — 已有 |
| 有 | 有，优先级 ≥ 新源 | 跳过 |
| 有 | 有，优先级 < 新源 | **覆盖** |

### 3A.4 验证

```bash
# 检查覆盖率变化
total=$(find data/vendors -name README.md | wc -l | tr -d ' ')
with_img=$(find data/vendors -type d -exec sh -c \
  'ls "$1"/*.jpg "$1"/*.jpeg "$1"/*.png "$1"/*.webp 2>/dev/null | grep -v force-curve | head -1' _ {} \; \
  2>/dev/null | wc -l | tr -d ' ')
echo "覆盖率: $with_img / $total ($(echo "scale=1; $with_img * 100 / $total" | bc)%)"

# 复制新图片到 public/
node scripts/copy-images.js

# 构建站点验证
npm run build
```

用浏览器打开验证新图片是否正确显示（`npm run dev` 或检查构建输出）。

---

## 步骤 3B：手动添加单个图片

当爬虫匹配不到某个轴体时（出现在 `unmatched.log`），或用户有自己的照片：

### 3B.1 放置图片文件

```bash
# 找到目标轴体目录
ls data/vendors/<Vendor>/<Switch>/

# 放入图片（命名为 switch-image）
cp /path/to/photo.jpg data/vendors/<Vendor>/<Switch>/switch-image.jpg
```

**命名规则**：
- 主图：`switch-image.<ext>`（jpg/png/webp）— 这是 `lib/data.ts` 优先读取的
- 额外图片：任意名称（会按字母序排在主图后面）
- **不要**命名为 `force-curve.*` — 那是力曲线专用

### 3B.2 不要写 `.source` 边车

手动放置的图片**不需要** `.source` 文件。没有 `.source` 的文件被视为"人工标记"——
爬虫永远不会覆盖它。这是设计上的安全保障。

### 3B.3（可选）更新归因

如果图片来自某个网站，可以手动更新 README.md frontmatter：

```yaml
sources:
  images:
    - file: switch-image.jpg
      site: reddit
      url: https://example.com/original-image.jpg
      sourceUrl: https://reddit.com/r/switchmodders/post/xxx
      fetched: '2026-04-19'
```

### 3B.4 验证

```bash
node scripts/copy-images.js  # 复制到 public/
npm run build                 # 构建验证
```

---

## 步骤 3C：添加新的爬虫源

当现有 5 个源已触及覆盖天花板（~13%），需要新零售商。

### 3C.1 探测新源

先确认目标网站可以提供结构化数据：

```bash
# Shopify 站点检测
curl -s "https://example.com/collections/switches/products.json?page=1&limit=1" | head -c 500

# 非 Shopify：检查 sitemap
curl -s "https://example.com/sitemap.xml" | head -50

# 检查 JSON-LD
curl -s "https://example.com/products/some-switch" | grep -o 'application/ld+json' | head -1
```

### 3C.2 Shopify 源（最简单）

如果是 Shopify 站点，只需 5 行：

```javascript
// scripts/crawl_images/sources/newstore.js
const { createShopifySource } = require('./shopify')

module.exports = createShopifySource({
  name: 'newstore',
  priority: 14,          // 10-19 给 Shopify 零售商
  base: 'https://newstore.com',
  collection: '/collections/switches/products.json',
})
```

### 3C.3 非 Shopify 源（JSON-LD 抓取）

参考 `sources/milktooth.js` 的模式：
1. 从 sitemap 获取产品 URL 列表
2. 对每个页面提取 `<script type="application/ld+json">` 中的 `@type: Product`
3. 输出标准 `ProductRecord`：
   ```javascript
   {
     source: 'newstore',
     sourcePriority: 21,
     vendor: String,        // 必须匹配 data/vendors/ 下的目录名
     title: String,         // 产品名（matcher 会 normalize）
     handle: String,        // URL slug
     sourceUrl: String,     // 产品页 URL
     images: [{ src: String, position: Number }]
   }
   ```

### 3C.4 注册新源

在 `scripts/crawl_images/run.js` 的 `SOURCES` 对象中注册：

```javascript
const { fetchCatalog: fetchNewstore } = require('./sources/newstore')

const SOURCES = {
  // ... existing sources ...
  newstore: { fetchCatalog: fetchNewstore, priority: 14 },
}
```

### 3C.5 优先级分配

| 范围 | 用途 | 现有分配 |
|------|------|---------|
| 10-19 | Shopify 零售商 | lumekeebs=10, kbdfans=11, divinikey=12, novelkeys=13 |
| 20-29 | 高质量/策划型源 | milktooth=20 |
| 30+ | 保留给社区/聚合源 | 未分配 |
| ∞ | 手动放置（无 .source） | 隐式 — 永不被覆盖 |

更高的数字 = 更高优先级。高优先级源的图片会覆盖低优先级源的。

### 3C.6 测试新源

```bash
# 干跑
node scripts/crawl_images/run.js --dry-run --source newstore

# 检查匹配率
cat scripts/crawl_images/reports/newstore/matched.log | wc -l
cat scripts/crawl_images/reports/newstore/unmatched.log | wc -l

# 小范围下载测试
node scripts/crawl_images/run.js --source newstore --limit 3

# 验证下载的图片
ls data/vendors/*/*/switch-image.* | tail -5
```

---

## 步骤 4：构建管线

补完图后的完整构建流程：

```bash
# 1. 复制图片到 public/
node scripts/copy-images.js

# 2. 构建站点
npm run build

# 3. 检查页面数变化（更多有图轴 = 更多列表页可见）
# 注意：因为 hasRealImage() 过滤，新增图片会让轴体从隐藏变为可见
```

---

## 匹配器工作原理

理解匹配器对调试"为什么某个轴没被匹配到"很关键。

### 匹配流程

```
ProductRecord { vendor: "Akko", title: "Akko CS Jelly Pink Linear Switch 5-Pin 10PCS" }
                    │
                    ▼
          1. normalizeVendor("Akko") → "Akko"
          2. 在 data/vendors/ 找到 "Akko" 目录 ✓
                    │
                    ▼
          3. normalizeTitleForMatch("Akko", "Akko CS Jelly Pink Linear Switch 5-Pin 10PCS")
             → 去掉 vendor 前缀: "CS Jelly Pink Linear Switch 5-Pin 10PCS"
             → stripNoise: 去掉 "Linear", "Switch", "5-Pin", "10PCS"
             → 剩余: "CS Jelly Pink"
             → toSlug: "cs-jelly-pink"
                    │
                    ▼
          4. normalizeDirNameForMatch("CS Jelly Pink")
             → toSlug: "cs-jelly-pink"
                    │
                    ▼
          5. 严格相等: "cs-jelly-pink" === "cs-jelly-pink" → ✅ 匹配!
```

### 不匹配时怎么调试

```bash
# 查看 unmatched.log — 每行是一个 JSON 对象
cat scripts/crawl_images/reports/<source>/unmatched.log | jq '.title, .normalized'

# 查看我们的目录名 normalize 后的样子
node -e "
  const { normalizeDirNameForMatch } = require('./scripts/crawl_images/matcher');
  console.log(normalizeDirNameForMatch('CS Jelly Pink'));
"
```

常见不匹配原因：
- **vendor 名不一致**：源用 "DUROCK" 而我们的目录是 "Durock" → 加 `VENDOR_ALIASES`
- **名称中有括号内容被过滤**：`stripNoise` 去掉了括号，但目录名保留了 → 检查目录名是否应该调整
- **噪音词表不全**：产品标题包含新噪音词 → 在 `NOISE_TOKENS` 数组中添加

### 添加 vendor 别名

在 `scripts/crawl_images/matcher.js` 的 `VENDOR_ALIASES` 对象中：

```javascript
const VENDOR_ALIASES = {
  'DUROCK': 'Durock',
  'SP Star': 'SP-Star',
  // 左边是源数据里的 vendor 字段，右边是 data/vendors/ 下的目录名
}
```

### 添加噪音词

在 `NOISE_TOKENS` 数组中添加（都是小写）：

```javascript
const NOISE_TOKENS = [
  // 现有的...
  'newword',  // ← 新增
]
```

---

## 爬虫礼仪

爬虫内置了以下礼仪措施：

1. **User-Agent 声明**：`SwitchAtlasCrawler/1.0 (+https://github.com/...)`
2. **robots.txt 遵守**：下载前检查每个 host 的 robots.txt
3. **限速**：per-host token bucket，默认 ≥1.1 秒/请求
4. **内容检查**：验证 `Content-Type: image/*`，大小上限 10MB
5. **原子写入**：先写 `.partial` 临时文件，完成后 rename

**不要绕过这些措施。** 如果目标站点封了爬虫，应该换源或手动补图，而不是改 User-Agent 或去掉限速。

---

## 常见场景速查

### "我想快速给 Akko 补几张图"
```bash
node scripts/crawl_images/run.js --dry-run --vendor Akko
# 查看报告，确认 matched 数量合理
node scripts/crawl_images/run.js --vendor Akko
node scripts/copy-images.js
npm run build
```

### "爬虫匹配不到 Cherry MX Black"
```bash
# 查看 unmatched log
grep -i "black" scripts/crawl_images/reports/*/unmatched.log
# 检查目录名
ls data/vendors/Cherry/ | grep -i black
# 可能是噪音词问题，手动检查 normalize 结果
node -e "
  const m = require('./scripts/crawl_images/matcher');
  console.log('title:', m.normalizeTitleForMatch('Cherry', 'Cherry MX Black Linear Switch'));
  console.log('dir:', m.normalizeDirNameForMatch('MX Black'));
"
```

### "某个轴有错误的图片"
```bash
# 检查图片来源
cat data/vendors/<V>/<Switch>/switch-image.jpg.source
# 如果是爬虫放的：删除图片 + .source，手动放正确的（不带 .source → 永不被覆盖）
rm data/vendors/<V>/<Switch>/switch-image.jpg
rm data/vendors/<V>/<Switch>/switch-image.jpg.source
cp /correct/photo.jpg data/vendors/<V>/<Switch>/switch-image.jpg
```

### "想看当前哪些轴在列表页可见"
```bash
# lib/data.ts 用 hasRealImage() 过滤：image 不以 /images/default-switch.svg 结尾的就是"有图"
# 快速检查哪些轴在 data/ 里有图片文件
for v in data/vendors/*/; do
  vname=$(basename "$v")
  for d in $(find "$v" -name README.md -exec dirname {} \;); do
    if ls "$d"/*.jpg "$d"/*.jpeg "$d"/*.png "$d"/*.webp 2>/dev/null | grep -qv force-curve; then
      echo "[有图] $vname/$(basename "$d")"
    fi
  done
done
```

---

## 要避免的反模式

- **不干跑直接下载**：永远先 `--dry-run` 看匹配情况。错误匹配 = 错误图片 = 比没有图更糟。
- **手动编辑 `.source` 文件**：`.source` 是爬虫的所有权标记。手动图片不需要 `.source`。
- **跳过 `copy-images.js`**：图片在 `data/` 里不会自动出现在 `public/`。必须运行复制脚本。
- **给手动图片写 `.source`**：这会让爬虫认为它可以覆盖你的手动图片。手动 = 不写 `.source`。
- **修改 `hasRealImage()` 逻辑**：如果你想让无图轴出现在列表页，这不是图片问题——去看 `lib/data.ts` 的过滤逻辑（feature 004 ADR 0005）。
