# 山形图 — Switch Image Crawler

**更新时间**：2026-04-18
**会话**：01

## 范围

  ▲ shared-utils + lumekeebs-source — 上坡（方法已验证 via probe，需要垂直集成）
  ▲ matcher — 上坡（噪音 token 归一化策略未验证命中率）
  ▲ dry-run-runner — 上坡（R0 viability 未验证；首个垂直切片）
  ▲ downloader — 上坡（robots/限速/sidecar/覆盖策略未编码）
  ▲ attribution — 上坡（gray-matter 写回幂等性未验证）
  ▲ runner-report — 上坡（CLI + JSON 报告 + 覆盖率差异）
  ~ 多图（--multi-image） — 可选项

## 风险

最有风险：matcher 命中率。如果严格归一化只能匹配极少数，整个 v1 价值崩塌。
缓解：先做 dry-run 切片验证命中数，再投入 downloader/attribution。

## 下一步

构建首个垂直切片：lumekeebs source → matcher → 干跑报告，命中数 ≥50 视为 R0 修正版本可达。
