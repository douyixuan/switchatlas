# 方案包：上线门面——先隐藏无图轴

**功能 ID**：004
**创建日期**：2026-04-19
**框架**：`004-hide-imageless-switches-framing/frame.md`
**时间预算**：Small Batch（1 个会话）
**状态**：塑形中

---

## 问题

499 个轴中 435 个（87.2%）展示同一张 `default-switch.svg` 占位图。首访用户看到满屏灰方块会判定站点"未完成 / 不可信"。占位图是 `lib/data.ts:76` 硬编码 fallback，从不经过 UI 层——没有"此轴暂无图片"的状态，只有静默替换。

## 需求

- **R0**：列表页/首页/gallery 只展示有真实图片的轴（核心目标）
- **R1**：vendor 导航中的计数反映可见轴数量（必须项）
- **R2**：无图轴的直链 URL `/vendors/X/Y` 仍可访问、不 404（必须项）
- **R3**：全部轴都无图的 vendor，在侧边栏/首页不出现（必须项）
- **R4**：展示"已收录 N/M 轴"覆盖率信号（排除——需 i18n key + 计数传递，留给后续）

## 解决方案

在数据层 `getSwitchesByVendor()` 加入默认过滤（`includeImageless` 选项 opt-out），让所有列表消费者自动获得纯有图结果。`generateStaticParams` 用 opt-out 保持全量页面生成，保障直链。新增 `getVendorsWithImages()` 过滤空 vendor。

### 变更

| 文件/模块 | 变更 | 服务于 |
|----------|------|--------|
| `lib/data.ts` — 新增 `hasRealImage(sw)` | 判断 `sw.image` 是否以 `/images/default-switch.svg` 结尾（覆盖 `BASE_PATH` 为空和非空两种情况） | R0 基础设施 |
| `lib/data.ts` — `getSwitchesByVendor(vendor, limit?, options?)` | 新增第三参数 `{ includeImageless?: boolean }`，默认 `false`；排序后、截断前过滤 `hasRealImage` | R0, R1 |
| `lib/data.ts` — 排序得分（L140-146） | 将 `a.image !== '/images/default-switch.svg'` 替换为 `hasRealImage(a)`，修复 `BASE_PATH` 非空时的预存 bug | R0（附带修复） |
| `lib/data.ts` — 新增 `getVendorsWithImages()` | `getAllVendors().filter(v => getSwitchesByVendor(v).length > 0)` — 只返回有可见轴的 vendor | R3 |
| `app/page.tsx` | `getAllVendors()` → `getVendorsWithImages()` 用于 vendor 链接列表 | R3 |
| `app/(browse)/layout.tsx` | `getAllVendors()` → `getVendorsWithImages()` 用于 Sidebar | R3 |
| `app/(browse)/vendors/[vendor]/[slug]/page.tsx` — `generateStaticParams` | `getSwitchesByVendor(vendor)` → `getSwitchesByVendor(vendor, undefined, { includeImageless: true })` | R2 |
| `app/(browse)/vendors/[vendor]/page.tsx` — `generateStaticParams` | 保持 `getAllVendors()`（不换成 filtered）确保所有 vendor 页可访问 | R2 |
| `components/vendor-content.tsx` | `switches.length === 0` 时渲染空状态行（"暂无带图片的轴体"） | R3 |

**适配检查**：每个 R 至少映射到一个变更。没有缺口。
- R0 → `hasRealImage` + `getSwitchesByVendor` 过滤（自动波及 `getAllSwitches`、`getAllSwitchesFlat`、gallery）
- R1 → `VendorContent` 已用 `switches.length` 显示计数；过滤后自动正确
- R2 → `generateStaticParams` opt-out + `getSwitchBySlug` 不受影响
- R3 → `getVendorsWithImages()` + vendor-content 空状态
- R4 → 排除

## 兔子洞

- **`generateStaticParams` 过滤导致 404**：已修补——`includeImageless: true` opt-out 让静态生成覆盖全量 slug。`getSwitchBySlug()` 完全独立于过滤逻辑，详情页数据加载不受影响。
- **`BASE_PATH` 非空时 sort 比较失效**：已修补——`hasRealImage()` 用 `.endsWith()` 而非全等，覆盖所有 prefix。
- **空 vendor 页访问体验**：已修补——`VendorContent` 加空状态守卫；vendor 页的 `generateStaticParams` 保持全量 vendor 列表，不 404。
- **`getVendorsWithImages()` 性能**：已验证——10 个 vendor × `getSwitchesByVendor` 是构建期调用，<50ms。

## 排除项

- **R4 覆盖率信号 UI**：需要 i18n key、全量/可见计数透传、UI 元素。属于独立 Small Batch，不在本次预算内。
- **搜索功能**：站点当前无搜索。如果未来加搜索，搜索应该独立决定是否包含无图轴。
- **"显示全部"切换开关**：用户手动显示无图轴的开关。增加 UI 复杂度和前端状态管理，本次不做。

## 技术验证

**已审查的关键文件**：
- `lib/data.ts`（L1-260）：`parseSwitchDir`、`getSwitchesByVendor`、`getAllSwitches`、`getAllSwitchesFlat`、`getSwitchBySlug`
- `lib/types.ts`（L1-34）：`Switch`、`SwitchDetail` 接口
- `app/page.tsx`、`app/(browse)/layout.tsx`、`app/(browse)/vendors/[vendor]/page.tsx`、`app/(browse)/vendors/[vendor]/[slug]/page.tsx`、`app/gallery/page.tsx`：所有消费 switch 数据的页面
- `components/vendor-content.tsx`、`components/home-content.tsx`、`components/sidebar.tsx`、`components/gallery.tsx`：所有渲染 switch 列表的组件

**已验证的方法**：
- 过滤点在 `getSwitchesByVendor` 是最高杠杆位——4/5 消费者通过它取数据，变更自动传播
- `getSwitchBySlug` 走独立的 `slugToPathMap` 路径，不受 `getSwitchesByVendor` 过滤影响
- `getAllSwitches(limitPerVendor)` 和 `getAllSwitchesFlat()` 都委托 `getSwitchesByVendor`，无需单独改
- Next.js `force-static` 导出模式下，`generateStaticParams` 决定生成哪些页面；opt-out 参数确保全量生成

**测试策略**：
1. `next build` 通过——验证静态生成不报错
2. 手动检查：首页 featured 无占位图、vendor 页无占位图、gallery 无占位图
3. 手动检查：直链访问一个已知无图轴 → 页面正常加载（不 404）
4. 手动检查：无图 vendor 不出现在侧边栏和首页 vendor 列表

---

## 状态：已交付 — 于 2026-04-19 shipped
