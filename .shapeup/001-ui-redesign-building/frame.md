# Frame: SwitchAtlas UI 重建

**Feature ID**: 001
**Created**: 2026-04-11
**Status**: Framing

---

## Problem

当一个机械键盘爱好者或新手第一次访问 SwitchAtlas 时，页面看起来像一个临时的学生项目——不像一个值得信赖的数据源。用户看到的是一个简陋的 hero 区域、缺乏层次感的卡片网格、和三套视觉上不统一的可切换主题（soft / neumorphism / glassmorphism）。

**当前基线**：网站内容质量实际上不错——数百个轴体的详细规格数据、力曲线图、Markdown 格式的描述。但视觉包装完全没有发挥出内容的价值。整个前端由一个 `build_static.js` 文件生成，CSS 和 HTML 模板硬编码在 JavaScript 字符串中，无法进行快速的设计迭代。

**具体断裂时刻**：用户打开首页 → 看到简陋的界面 → 不信任这个数据源的权威性 → 关闭页面或不愿分享给他人。好内容被差包装埋没了。

## Affected Segment

- **主要受众**：机械键盘爱好者（发烧友）和新入坑的新手——两者都需要一个可信赖的轴体参考数据库
- **规模**：机械键盘社区是一个活跃的小众社区（Reddit r/MechanicalKeyboards 200万+成员，各类论坛/Discord活跃）
- **战略价值**：这是一个内容驱动的工具型网站，目标用户的口碑传播是核心增长引擎。第一印象直接影响用户是否愿意收藏和分享

## Business Value

1. **可信度和口碑**：专业的视觉呈现让用户信任数据质量，愿意作为参考来源引用和分享，形成社区影响力
2. **技术基础**：迁移到现代框架后，后续功能（搜索、筛选、对比、用户偏好）可以快速迭代，而不是每次都在一个巨型 JS 字符串里挣扎
3. **留存和探索深度**：美观且易用的界面让用户停留更久、探索更多轴体，提升网站价值

## Evidence

- 当前全站 CSS + HTML 模板硬编码在单个 `build_static.js` 文件中（~750 行），维护成本极高
- 三套主题（soft / neumorphism / glassmorphism）风格差异大，缺乏统一的品牌识别
- 已有完整的 DESIGN.md 设计系统文档（基于 Mintlify 风格），详细定义了颜色、字体、组件、间距、暗黑模式——但从未被应用
- 数据层健康：按厂商/型号组织的 Markdown + YAML frontmatter，已有数百个轴体条目
- Vercel 部署已就绪（`vercel.json` 配置完成）

## Appetite

**Big Batch: 4-5 sessions**

- Session 1: 搭建新框架（Next.js）+ 基础设计系统（DESIGN.md tokens）+ 布局骨架
- Session 2: 首页 + 厂商列表页，应用完整设计系统
- Session 3: 轴体详情页 + 数据展示组件
- Session 4: 响应式适配 + 暗黑模式 + 导航体验
- Session 5: 打磨细节 + 动效 + 性能优化

## Frame Statement

> "如果我们能在 4-5 个 session 内将 SwitchAtlas 从一个临时的静态站点重建为一个基于 DESIGN.md 设计系统的现代 Web 应用，它将**建立 SwitchAtlas 作为可信赖的轴体参考数据库的品牌形象**，并**为后续功能迭代奠定可维护的技术基础**。"

---

## Status: Frame Go — approved 2026-04-11
