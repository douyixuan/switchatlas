# 范围：curve-classifier

## 山形图位置
✓ 完成 — 算法已用真实数据（Akko Air=Linear, Outemu Banana Green=Tactile）验证

## 必须项
- [x] `inferTypeFromCurve(csvPath)` → `{type, confidence, signals}`
  - 解析 CSV（跳过元数据头部行，提取位移/力数据）
  - 检测 Linear：按压阶段近单调上升，无显著 bump
  - 检测 Tactile：按压阶段存在明显 bump（峰值后下降 ≥ 阈值）
  - Clicky：不单独由曲线判定，返回 `Unknown` 供关键词层处理
  - 当曲线数据不足或解析失败时，返回置信度为 0 的 `Unknown`
- [x] 单元测试：使用真实数据文件路径（Linear 已知样本、Tactile 已知样本）
- [x] 测试：边缘情况（文件不存在、空文件、纯元数据头行）

## 可选项（~）
- [ ] ~ `confidence` 细分 0.5 / 0.8 / 1.0 三档（低/中/高置信度）
- [ ] ~ Clicky 的初步曲线辅助信号（不作为主判据）

## 备注
CSV 格式：前 5 行是元数据（Maximum/Minimum/Average/Data Quantity/Number of NG），
第 6 行是列头（可能无），数据从第 7 行开始（"No.XXXX"格式行）。
需要先探测几个真实文件确认格式一致性。
