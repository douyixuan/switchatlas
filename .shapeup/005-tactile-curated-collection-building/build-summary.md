# 构建摘要 — 按类型发现轴体

**功能 ID**：005  
**构建会话数**：2  
**完成日期**：2026-04-21

## 构建了什么

### 会话 1 — 数据分类流水线
- `scripts/classify_switches/curve.js` — 力曲线凸包检测器：用 `earlyZone`（0.3–1.5mm）定位早期峰，测量峰后压降，置信度评分
- `scripts/classify_switches/frontmatter.js` — 幂等 frontmatter 读写，`readFrontmatter()` + `writeFrontmatterPatch()`
- `scripts/classify_switches/run.js` — CLI 编排器：关键词推断（`inferTypeFromKeywords`）、声音标签（`inferSound`）、证据融合（`fuseEvidence`）、`--dry-run`/`--apply` 双模式
- 499 个 README.md 全部写入 `type` 字段（Linear: 351，Tactile: 137，Clicky: 11，Unknown: 0）
- 36 项自动化测试覆盖三个模块

### 会话 2 — 类型筛选 UI
- `components/gallery.tsx` — 顶栏新增 All/Linear/Tactile/Clicky 芯片；`filteredSwitches` 状态；计数器与芯片联动（例：64 → 23 Tactile）
- `components/vendor-content.tsx` — 标题区新增同款芯片；计数徽章实时显示筛选后数量
- `app/(browse)/vendors/[vendor]/page.tsx` — 移除硬编码 `limit: 12`，全量传入，由客户端筛选
- `lib/i18n/dictionaries/en.json` + `zh.json` — 新增 `type.All` / `全部`
- `lib/__tests__/data-filter.test.ts` — 新增 5 项类型筛选契约测试（共 12 项）

## 测试覆盖
- `data-filter.test.ts`：12/12 通过
- `curve.test.js`：10/10 通过
- `frontmatter.test.js`：7/7 通过
- `run.test.js`：19/19 通过
- `matcher.test.js`：4/4 通过（既有，未变动）
- **合计：52 项，全部通过**

## 被削减的内容
- **type-nav-entry**（可选）：侧边栏/首页按类型导航入口——未实现，此范围标记为可选，不影响核心价值交付

## 变更的文件
- `scripts/classify_switches/curve.js` — 新增（力曲线分类器）
- `scripts/classify_switches/frontmatter.js` — 新增（frontmatter I/O）
- `scripts/classify_switches/run.js` — 新增（CLI 编排器）
- `scripts/classify_switches/__tests__/` — 新增（36 项测试）
- `data/vendors/**/README.md` — 499 个文件写入 `type` 字段
- `components/gallery.tsx` — 新增类型芯片 + 筛选逻辑
- `components/vendor-content.tsx` — 新增类型芯片 + 筛选逻辑
- `app/(browse)/vendors/[vendor]/page.tsx` — 移除 limit: 12
- `lib/i18n/dictionaries/en.json` — 新增 `type.All`
- `lib/i18n/dictionaries/zh.json` — 新增 `type.All`（全部）
- `lib/__tests__/data-filter.test.ts` — 新增 5 项类型筛选测试

## 出乎意料的内容
- **凸包检测算法迭代**：初版用全局峰位比例判断，Tactile 测试夹具失败（峰后力值仍高于峰值）。改为 `earlyZone` 窗口后稳定通过。
- **关键词误报**：`orange` 和 `clear` 触发 Tactile（Hirose Clear/Orange 实为 Linear）。从 `TACTILE_KEYWORDS` 中移除，人工复核条目从 25 降至 15。
- **全量加载性能**：移除 limit: 12 后 Cherry vendor 页立即从 10 项（全部有图）渲染为 10 项（与之前相同——Cherry 本就只有 10 个有图轴），Akko 页则从 12 → 全量，筛选可正常工作。
