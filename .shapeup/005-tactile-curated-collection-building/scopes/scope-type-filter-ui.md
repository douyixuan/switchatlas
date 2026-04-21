# 范围：type-filter-ui

## 山形图位置
▲ 上坡 — Gallery/Vendor UI 的 type filter 状态机与导航集成未验证

## 必须项
- [ ] `lib/data.ts`：`getSwitchesByVendor` 增加 `{ type? }` 过滤选项（并支持全量无 limit）
- [ ] `components/gallery.tsx`：增加 All/Linear/Tactile/Clicky chips + 结果计数 + 过滤导航
- [ ] `components/vendor-content.tsx`：增加 type chips + 过滤后计数，改为加载 vendor 全量
- [ ] `app/(browse)/vendors/[vendor]/page.tsx`：向 VendorContent 传递全量数据

## 可选项（~）
- [ ] ~ 类型导航入口（sidebar/home-content 中的"按类型浏览"）

## 备注
此范围依赖 session 1 的数据补全（type 字段有值），
但 UI 本身不依赖 session 1 的代码，可并行实现。
兔子洞 4 修补：vendor 页改为取全量数据再前端过滤。
