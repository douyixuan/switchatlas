# Scope: Next.js 骨架 + 数据层

## Hill Position
✓ Done — 构建成功，512 个静态页面生成

## Must-Haves
- [x] Next.js App Router 项目初始化
- [x] TypeScript 配置 (strict mode, path aliases)
- [x] Tailwind v4 + PostCSS 配置
- [x] next.config.ts (output: 'export')
- [x] vercel.json 更新为 nextjs framework
- [x] Makefile 更新 (build/dev/preview)
- [x] lib/types.ts 类型定义
- [x] lib/data.ts 数据读取函数 (getAllVendors, getSwitchesByVendor, getSwitchBySlug, etc.)
- [x] YAML frontmatter 错误处理 (跳过解析失败的文件)
- [x] 力曲线 CSV 解析 (跳过前 5 行摘要, 采样 200 点)
- [x] 图片复制到 public 目录

## Nice-to-Haves (~)
- [ ] ~ 单元测试 for data layer functions
- [ ] ~ Slug 重复检测 + 报错

## Notes
- 发现部分 README.md 文件的 YAML frontmatter 格式不合法（name 字段含未转义引号），已通过 try/catch 优雅跳过
- Tailwind v4 使用 CSS-first 配置 (@theme 指令)，与 Package 中描述的 tailwind.config.ts 方式不同
