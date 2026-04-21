# 范围：classify-runner

## 山形图位置
✓ 完成 — 全量 dry-run + apply 通过，499/499 已分类，0 Unknown，15 项人工复核

## 必须项
- [x] `scanSwitchDirs(dataDir)` → 返回 `{dirPath, vendor, name, sourceUrl}[]`
- [x] 关键词证据层：`inferTypeFromKeywords(name, sourceUrl)` → `{type, confidence}`
- [x] Sound 补全：`inferSound(name, sourceUrl, existingSound)` → sound 字符串或 undefined
- [x] 证据融合策略：曲线置信 vs 关键词置信，决定最终 type
- [x] report 输出：`scripts/classify_switches/reports/report-<timestamp>.json` + `review-<timestamp>.csv`
  - report: 按 vendor 汇总 Linear/Tactile/Clicky/Unknown 数量
  - review CSV: 冲突项与低置信项列表（vendor, name, curve_type, keyword_type, final_type）
- [x] CLI flags：`--dry-run`（默认）、`--apply`（写回）、`--vendor <name>`、`--review-only`
- [x] `package.json` 新增 `classify:metadata` 脚本

## 可选项（~）
- [ ] ~ `--limit N` flag（调试用）
- [ ] ~ before/after 统计（Unknown 减少了多少）

## 备注
session 1 目标：`--dry-run` 模式 + report 输出。
`--apply` 模式（实际回写）可在同一 session 内完成或留到 session 2 初。
