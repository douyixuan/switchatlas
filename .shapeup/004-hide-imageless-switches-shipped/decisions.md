# 做出的决策 — 上线门面：隐藏无图轴

**功能 ID**：004
**交付时间**：2026-04-19
**时间预算**：Small Batch（1 个会话）
**实际工作量**：1 个构建会话

## 关键架构决策
- **数据层默认过滤 + opt-out**：在 `getSwitchesByVendor` 默认过滤无图轴，`generateStaticParams` 通过 `includeImageless: true` opt-out。高杠杆——一处变更传播到所有消费者。
- **`hasRealImage()` 用 `.endsWith()` 而非全等**：覆盖 `BASE_PATH` 为空和非空两种部署场景。

## 被削减的内容（范围削减）
- **R4 覆盖率信号 UI**（"已收录 N/M 轴"）：需要 i18n key + 计数透传 + UI 组件，独立 Small Batch 范畴。
- **"显示全部"切换开关**：增加前端状态管理复杂度，本次不做。
- **搜索联动**：站点当前无搜索，留给未来功能独立决策。

## 出乎意料的内容
- **比预期更简单**：`getSwitchesByVendor` 的杠杆极高——`getAllSwitches`、`getAllSwitchesFlat` 都委托给它，4/5 消费者自动受益，无需逐个改。
- **排序 bug 是真实的**：排序得分里硬编码 `'/images/default-switch.svg'` 在 `BASE_PATH` 非空时会失效，但当前 `BASE_PATH=''` 掩盖了问题。顺手修复。

## 未来改进领域
- **覆盖率信号 UI**：当图片覆盖率提升后，用 "64/499 已收录" 把残缺转为增长故事
- **覆盖率 >50% 时重新评估**：当大多数轴有图时，隐藏可能不再必要
- **搜索中的无图轴**：如果加入搜索，需要独立决定是否包含无图结果
