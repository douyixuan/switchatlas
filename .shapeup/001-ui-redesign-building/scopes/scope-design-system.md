# Scope: 设计系统 (DESIGN.md Tokens)

## Hill Position
✓ Done — tokens 配置 + 组件应用 + 暗黑模式切换完成

## Must-Haves
- [x] 颜色 tokens (brand, near-black, grays, semantic colors)
- [x] 字体尺寸层级 (display → micro, 13 级)
- [x] 圆角尺寸 (sm/md/standard/lg/pill)
- [x] 阴影 (card, button)
- [x] CSS 变量 for light/dark mode
- [x] 动画 (fade-in, slide-up)
- [x] Inter + Geist Mono 字体加载 (next/font)
- [x] 默认轴体占位 SVG

## Nice-to-Haves (~)
- [ ] ~ FOUC 防闪烁 script 优化
- [ ] ~ 暗黑模式切换组件 (ThemeToggle)

## Notes
- 使用 Tailwind v4 @theme 指令代替传统的 tailwind.config.ts
- CSS 变量同时服务于 light/dark 模式切换
