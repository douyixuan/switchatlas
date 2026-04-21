# 范围：frontmatter-io

## 山形图位置
✓ 完成 — 幂等写入已验证，7 项测试全绿

## 必须项
- [x] `readFrontmatter(readmePath)` → `{data, content}`
- [x] `writeFrontmatterPatch(readmePath, patch)` — 只更新 patch 中的字段，保留其他字段
- [x] 幂等性：多次调用结果相同（内容无多余空白/换行）
- [x] 单元测试：读取 → 修改 type → 写回 → 再读取，结果一致

## 可选项（~）
- [ ] ~ before/after diff 输出（可在 runner 层实现）

## 备注
可复用 `scripts/crawl_images/attribution.js` 中的 `gray-matter` 模式，
但需要确认 stringify 选项不会打乱 YAML 字段顺序。
