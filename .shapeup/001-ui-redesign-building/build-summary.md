# Build Summary — SwitchAtlas UI 重建

**Feature ID**: 001
**Build sessions**: 2
**Date completed**: 2026-04-11

## What Was Built
- Next.js 16 App Router 项目，替代 `build_static.js` 单文件构建系统
- 统一数据层 (`lib/data.ts`) 从 `data/vendors/` 读取 500+ 轴体数据，处理嵌套目录、YAML 错误、slug 生成
- DESIGN.md 设计系统完整映射到 Tailwind v4 CSS-first 配置
- 全宽首页：大气渐变 Hero + Featured Switches 网格 + Browse by Vendor 卡片
- 厂商列表页：带 sidebar 的卡片网格，desktop sidebar + mobile dropdown
- 轴体详情页：图片 + 规格表 + 力曲线 SVG 图表 + Markdown 渲染
- Gallery 全屏模式：博物馆风格单轴体浏览，键盘/触摸/鼠标导航，预加载
- 暗黑模式：ThemeToggle + localStorage + FOUC 防闪
- 响应式：mobile/tablet/desktop 三断点适配
- 512 个静态页面成功生成（`output: 'export'`）

## What Was Cut (Scope Hammering)
- 额外动效微交互：基础 fade-in/slide-up 已足够，更多动画留给后续
- 单元测试：构建验证已通过，正式测试留给后续
- Slug 重复检测：实测无冲突
- Gallery 自动播放 / 缩略图导航
- 搜索功能、对比功能（No-Go）

## Files Changed
- **配置**: `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `package.json`, `vercel.json`, `Makefile`, `.gitignore`
- **数据层**: `lib/types.ts`, `lib/data.ts`
- **设计系统**: `app/globals.css`
- **布局**: `app/layout.tsx`, `app/(browse)/layout.tsx`
- **页面**: `app/page.tsx`, `app/(browse)/vendors/[vendor]/page.tsx`, `app/(browse)/vendors/[vendor]/[slug]/page.tsx`, `app/gallery/page.tsx`
- **组件**: `components/navbar.tsx`, `components/sidebar.tsx`, `components/hero.tsx`, `components/switch-card.tsx`, `components/badge.tsx`, `components/spec-table.tsx`, `components/force-curve-chart.tsx`, `components/gallery.tsx`, `components/theme-toggle.tsx`
- **资源**: `public/images/default-switch.svg`

## What Surprised Us
- Tailwind v4 的 CSS-first 配置方式与 Package 中描述的 `tailwind.config.ts` 完全不同，需要用 `@theme` 指令代替
- Next.js 16 的 `params` 参数变为 Promise，需要 `await params` 
- 部分轴体数据的 YAML frontmatter 格式不合法（name 含未转义引号），需要 try/catch 优雅跳过
- Route groups 是解决"首页全宽 vs 浏览页带 sidebar"的最优方案
- 暗黑模式的 ThemeToggle 需要 `mounted` 状态来防止 SSR 水合不匹配
