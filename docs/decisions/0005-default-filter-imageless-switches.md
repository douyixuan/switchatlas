# ADR 0005：数据层默认过滤无图轴（opt-out 模式）

**状态**：已接受
**日期**：2026-04-19
**功能**：004 — 上线门面：隐藏无图轴

## 上下文

SwitchAtlas 有 499 个轴体条目，但只有 64 个（12.8%）有真实图片。其余 435 个在所有列表页展示同一张 `default-switch.svg` 占位图。站点即将对外分享，满屏占位图会让首次访问者判定站点"未完成 / 不可信"。

过滤可以发生在多个层：UI 组件层（条件渲染）、页面层（Server Component 过滤 props）、或数据层（`getSwitchesByVendor` 本身）。站点有 5 个消费 switch 列表数据的入口，如果逐个改动既冗余又容易遗漏。

同时，无图轴的详情页 URL 必须保持可访问（分享链接不能断裂），而 Next.js 的 `generateStaticParams` 决定哪些页面被静态生成。

## 决策

在 `lib/data.ts` 的 `getSwitchesByVendor()` 加入 `options.includeImageless` 参数（默认 `false`），让数据层默认只返回有真实图片的轴。需要全量数据的调用者（如 `generateStaticParams`）通过 `{ includeImageless: true }` opt-out。

新增 `hasRealImage(sw)` 谓词使用 `.endsWith('/images/default-switch.svg')` 判断，覆盖 `BASE_PATH` 为空和非空两种情况。

新增 `getVendorsWithImages()` 基于过滤后结果筛除无图 vendor。

## 理由

- **高杠杆**：4/5 消费者通过 `getSwitchesByVendor` 取数据；`getAllSwitches` 和 `getAllSwitchesFlat` 也委托给它。一处变更自动传播到首页、vendor 页、gallery、sidebar。
- **安全默认值**：默认过滤意味着新消费者自动获得正确行为，不需要记住"要过滤占位图"。
- **直链安全**：`getSwitchBySlug()` 走独立的 `slugToPathMap` 路径，完全不受过滤逻辑影响。`generateStaticParams` 的 opt-out 确保全量静态生成。
- **Small Batch 约束**：一个会话内完成，变更集中在 6 个源文件 + 2 个 i18n 文件。

## 考虑的替代方案

- **UI 组件层过滤**（在每个 `SwitchCard` 或列表组件中 `if (!hasImage) return null`）：需要修改每个消费组件，容易遗漏新组件，且计数逻辑需要额外同步。
- **页面层过滤**（在每个 Server Component 中 `.filter()`）：5 个页面各写一遍过滤，不 DRY，且 `switches.length` 计数需要用过滤后的值。
- **数据库/文件系统层过滤**（不创建无图轴的 `Switch` 对象）：太激进——会破坏 `getSwitchBySlug` 和直链访问。
- **默认 `includeImageless: true`，由消费者 opt-in 过滤**：反向默认值意味着每个新消费者都可能忘记过滤，产生占位图泄漏。

## 后果

**正面**：
- 列表页从"87% 占位图"变为"64 条精选有图条目"，首屏信任感大幅提升
- 新增的列表消费者自动获得正确过滤行为
- 修复了排序得分中 `BASE_PATH` 非空时的预存 bug

**负面 / 权衡**：
- `getSwitchesByVendor` 的调用者语义变了——默认不再返回全量。已有的 `generateStaticParams` 调用需要显式 opt-out。
- 无图 vendor 从导航中消失，用户无法通过导航发现它们存在（直链仍可访问）

**未来考虑**：
- 当图片覆盖率提升到 >50% 时，可能需要重新评估是否仍需隐藏
- R4（覆盖率信号 UI "已收录 N/M 轴"）可作为独立 Small Batch 补充
- 如果加入搜索功能，搜索应独立决定是否包含无图轴
