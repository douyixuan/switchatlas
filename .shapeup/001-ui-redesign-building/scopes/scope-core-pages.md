# Scope: 核心页面 (首页 + 厂商 + 详情)

## Hill Position
✓ Done — 全宽首页重构 + 卡片 hover 打磨 + 视觉验证通过

## Must-Haves
- [x] Root Layout (Navbar + Sidebar + main)
- [x] Navbar 组件 (sticky, backdrop-blur, mobile hamburger)
- [x] Sidebar 组件 (厂商列表, 当前项高亮)
- [x] Hero 组件 (渐变背景, 标题, 双 CTA)
- [x] SwitchCard 组件 (图片, badge, 规格, hover 动画)
- [x] Badge 组件 (Linear/Tactile/Clicky/Unknown 颜色)
- [x] 首页 (Hero + Featured 网格)
- [x] 厂商列表页 (generateStaticParams + 卡片网格)
- [x] 轴体详情页 (图片 + SpecTable + ForceCurveChart + Markdown)
- [x] SpecTable 组件 (键值对表格)
- [x] ForceCurveChart 组件 (SVG 渲染, 客户端)

## Nice-to-Haves (~)
- [ ] ~ 视觉打磨 — 间距微调, 字体大小验证
- [ ] ~ 响应式断点验证 (mobile/tablet/desktop)
- [ ] ~ 空状态处理 (无图片时的占位组件优化)

## Notes
- 所有页面均使用静态生成 (generateStaticParams)
- 详情页的 Markdown 使用 dangerouslySetInnerHTML
