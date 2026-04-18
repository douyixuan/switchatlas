# 范围：严格匹配器

## 山形图位置
▲ 上坡 — 噪音 token 归一化策略未验证

## 必须项
- [ ] `scripts/crawl_images/matcher.js` 导出 `matchProducts(records, switchDirs)`
- [ ] 归一化函数：lowercase、剥离 vendor 前缀、剥离 `5-pin/3-pin/pcs/switches/switch/x10/10pcs/(...)`、折叠空格/连字符、去标点
- [ ] vendor 白名单 = `data/vendors/` 顶级目录
- [ ] 输出 `MatchedRecord[]` + `unmatched.log` + `ambiguous.log`
- [ ] 单元测试：fixture 包含已知应匹配/不应匹配/歧义的产品

## 可选项（~）
- [ ] ~ 通过别名映射文件人工增补难匹配的命名
