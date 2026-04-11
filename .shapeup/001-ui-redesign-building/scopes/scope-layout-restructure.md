# Scope: 布局重构 (Route Groups)

## Hill Position
✓ Done

## Must-Haves
- [x] Route group `(browse)` — 厂商/详情页带 sidebar
- [x] 根布局仅包含 Navbar
- [x] 首页全宽 Hero (不受 sidebar 约束)
- [x] Gallery 全屏 (不受任何布局约束)
- [x] 首页增加 "Browse by Vendor" 区块
- [x] 所有路由保持 `/vendors/[vendor]` URL 不变

## Notes
- Next.js route groups `(browse)` 不影响 URL 路径
- 首页现在有两个区块：Featured Switches + Browse by Vendor
