# 范围：共享 fs-utils + lumekeebs 源适配器

## 山形图位置
▲ 上坡 — Shopify products.json 已通过 probe 验证；ProductRecord 形状未编码

## 必须项
- [ ] `scripts/crawl_images/lib/fs-utils.js` 提取 `toSlug`、`findSwitchDirs`、`listVendors`
- [ ] `scripts/crawl_images/lib/http.js` 共享的 https.get 包装器（流式 + UA + 错误）
- [ ] `scripts/crawl_images/sources/lumekeebs.js` 导出 `fetchCatalog()` 返回 `ProductRecord[]`
- [ ] 单元测试：fixture 切片 → 解析为正确 ProductRecord
- [ ] ProductRecord 形状：`{ vendor, title, handle, images: [{src, position}], sourceUrl }`

## 可选项（~）
- [ ] ~ 缓存 catalog 到磁盘以便重跑加速
