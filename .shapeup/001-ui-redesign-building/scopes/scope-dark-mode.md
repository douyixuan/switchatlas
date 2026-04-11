# Scope: 暗黑模式

## Hill Position
✓ Done

## Must-Haves
- [x] ThemeToggle 组件 (sun/moon icon 切换)
- [x] localStorage 持久化 theme 偏好
- [x] FOUC 防闪烁 (layout.tsx head script)
- [x] CSS 变量 light/dark 模式 (globals.css)
- [x] Navbar 集成 ThemeToggle
- [x] 组件使用 CSS 变量而非硬编码颜色

## Notes
- ThemeToggle 使用 `mounted` 状态防止 SSR 水合不匹配
- 暗黑模式下品牌绿保持不变
