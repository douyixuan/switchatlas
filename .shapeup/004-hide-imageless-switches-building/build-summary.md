# 构建摘要 — 上线门面：隐藏无图轴

**功能 ID**：004
**构建会话数**：1
**完成日期**：2026-04-19

## 构建了什么
- `hasRealImage(sw)` 谓词：用 `.endsWith('/images/default-switch.svg')` 判断，覆盖 `BASE_PATH` 为空和非空两种情况
- `getSwitchesByVendor()` 新增 `options.includeImageless` 参数（默认 `false`），排序后、截断前过滤
- `getVendorsWithImages()` 新函数：只返回有可见轴的 vendor（7/10）
- 排序得分中的硬编码 `'/images/default-switch.svg'` 替换为 `hasRealImage()`（修复 `BASE_PATH` 非空时的预存 bug）
- 首页 vendor 列表和侧边栏都换用 `getVendorsWithImages()`
- `generateStaticParams`（slug 页）加 `includeImageless: true` 保留全量静态生成
- `VendorContent` 空状态守卫 + i18n key（en/zh）
- 7 个单元测试覆盖谓词和过滤契约

## 被削减的内容（范围削减）
- **R4 覆盖率信号 UI**（"已收录 N/M 轴"）：需要 i18n key + 计数透传 + UI 组件，留给后续 Small Batch

## 变更的文件
- `lib/data.ts` — `hasRealImage()`, `getSwitchesByVendor()` 过滤, `getVendorsWithImages()`, 排序修复
- `app/page.tsx` — `getAllVendors()` → `getVendorsWithImages()`
- `app/(browse)/layout.tsx` — `getAllVendors()` → `getVendorsWithImages()`
- `app/(browse)/vendors/[vendor]/[slug]/page.tsx` — `generateStaticParams` opt-out
- `components/vendor-content.tsx` — 空状态守卫
- `lib/i18n/dictionaries/en.json` — 新增 `vendor.noSwitchesWithImages`
- `lib/i18n/dictionaries/zh.json` — 新增 `vendor.noSwitchesWithImages`
- `lib/__tests__/data-filter.test.ts` — 新增 7 个测试

## 出乎意料的内容
- 比预期更简单：过滤点在 `getSwitchesByVendor` 的杠杆极高，4/5 消费者（首页、vendor 页、gallery、sidebar）自动受益，无需逐个改
- `getAllSwitches` 和 `getAllSwitchesFlat` 委托 `getSwitchesByVendor`，完全不需要动
- 发现排序得分里的 `BASE_PATH` bug 是真实存在的（虽然当前 `BASE_PATH=''` 掩盖了问题），顺手修复
