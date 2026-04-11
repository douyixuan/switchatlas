# Package: SwitchAtlas UI 重建

**Feature ID**: 001
**Created**: 2026-04-11
**Frame**: [frame.md](./frame.md)
**Status**: Shaping

---

## Problem

当机械键盘爱好者或新手第一次访问 SwitchAtlas 时，页面看起来像临时的学生项目——简陋的 hero 区域、缺乏层次感的卡片网格、三套视觉不统一的可切换主题。内容质量实际上不错（数百个轴体规格、力曲线、Markdown 描述），但视觉包装完全没有发挥出内容价值。

当前基线：整个前端由单个 `build_static.js` 文件生成（~744 行），CSS 和 HTML 模板硬编码在 JavaScript 字符串中，无法进行快速设计迭代。

## Appetite

Big Batch: 4-5 sessions

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | 网站视觉呈现专业可信，应用 DESIGN.md 设计系统（Mintlify 风格：Inter 字体、品牌绿 `#18E299`、5% 透明度边框、pill 圆角按钮） | Core goal |
| R1 | 迁移到 Next.js App Router 框架，组件化架构，静态导出 | Must-have |
| R2 | 首页包含完整的大气渐变 hero 区域 + 特色轴体展示 | Must-have |
| R3 | 厂商列表页展示轴体卡片（初期每厂商 2-3 个，后续扩展） | Must-have |
| R4 | 轴体详情页展示规格表、Markdown 描述、力曲线图（当有数据时） | Must-have |
| R5 | 响应式设计（mobile <768px / tablet 768-1024px / desktop >1024px） | Must-have |
| R6 | 暗黑模式支持（基于 DESIGN.md 第 7 节的颜色反转） | Nice-to-have |
| R7 | 动效和微交互（页面加载动画、卡片 hover、按钮过渡） | Nice-to-have |
| R8 | 数据层复用现有 `data/vendors/` 的 Markdown + YAML frontmatter，不改变数据格式 | Must-have |
| R9 | 全屏 Gallery 模式：博物馆画展风格，每次展示一个轴体，支持左右滑动浏览全库所有轴体 | Must-have |

## Solution

用 Next.js App Router + Tailwind CSS 替代当前的 `build_static.js` 单文件构建系统。保持文件系统数据库（`data/vendors/`）不变，新建统一的数据读取层 (`lib/data.ts`) 在构建时解析所有轴体数据。将 DESIGN.md 的设计 token 映射到 Tailwind 配置，组件化所有 UI 元素。使用 `output: 'export'` 进行纯静态导出，与 Vercel 部署兼容。额外增加全屏 Gallery 模式——博物馆画展风格的沉浸式单轴体浏览体验。

### Element: Next.js 项目骨架

**What**: Next.js App Router 项目初始化，替代 `build_static.js` 构建管线
**Where**: 项目根目录，新建 `app/`、`next.config.js`、`tsconfig.json`
**Wiring**:
- `next.config.js` 设置 `output: 'export'`，静态导出到 `out/` 目录
- `vercel.json` 更新为 `{ "framework": "nextjs" }`（移除 `buildCommand` 和 `outputDirectory`，Vercel 自动检测）
- `package.json` 新增依赖：`next`、`react`、`react-dom`、`typescript`、`gray-matter`、`tailwindcss`、`@tailwindcss/typography`
- `Makefile` 的 `build` 目标改为 `npx next build`
- TypeScript 配置（`tsconfig.json`）：strict mode、path aliases `@/` → 项目根
- `build_static.js` 保留但不再作为主构建入口
**Affected code**: `package.json`、`vercel.json`、`Makefile`、新建 `next.config.js`、`tsconfig.json`、`app/layout.tsx`
**Complexity**: Medium
**Status**: ✅ Validated — Next.js 静态导出是成熟功能，`npx create-next-app` 可直接生成骨架

#### Place: 构建管线

**Code Affordances:**
| Affordance | Type | Wires Out | Returns To |
|------------|------|-----------|------------|
| `next build` | CLI command | 读取 `app/` 路由 + `lib/data.ts` | 输出 `out/` 静态文件 |
| `next.config.js` | Config | `output: 'export'` 指示纯静态 | Next.js build process |
| `vercel.json` | Config | `framework: 'nextjs'` | Vercel 自动构建 |

---

### Element: 数据层 (Data Layer)

**What**: 统一的数据读取函数库，构建时从 `data/vendors/` 读取所有轴体数据
**Where**: 新建 `lib/data.ts`、`lib/types.ts`
**Wiring**:
- `getAllVendors()` → `fs.readdirSync('data/vendors/')` → 过滤目录 → 返回 `string[]`
- `getSwitchesByVendor(vendor: string, limit?: number)` → 递归遍历厂商子目录 → 排除 `page_N.md` 文件 → `gray-matter` 解析每个 `README.md` → 优先返回有完整数据（非 Unknown、force > 0）的条目 → 可选 limit 参数控制返回数量（初期 2-3 个）→ 返回 `Switch[]`
- `getSwitchBySlug(vendor: string, slug: string)` → 通过 slug→path 映射找到目录 → 解析 frontmatter + body → `marked` 渲染 Markdown → 返回 `SwitchDetail`
- `getAllSwitches()` → 遍历所有厂商 → 每个厂商取前 4 个 → 返回 featured 列表
- `parseForceCurve(csvPath: string)` → 逐行读取 CSV → 跳过前 5 行摘要 → 解析 `Force`/`Displacement` 列 → 返回 `{force: number, displacement: number}[]`
- 图片处理：构建时调用 `copyImagesToPublic()` 将 `data/vendors/` 中的 `.jpg`/`.png` 复制到 `public/images/vendors/<vendor>/<slug>/`。当前只有 3 个轴体有实际图片，其余使用 `public/images/default-switch.png`
- slug 生成：`toSlug(relativePath: string)` → 小写化 + 空格和 `/` 替换为 `-` + 移除特殊字符 → 如 `Ink/Black_V2` → `ink-black-v2`，`MX Red (5 Pin)` → `mx-red-5-pin`
- slug 解码：构建时建立 `Map<string, string>` slug→dirPath 映射，无需运行时解析
**Affected code**: 新建 `lib/data.ts`、`lib/types.ts`、`scripts/copy-images.ts`
**Complexity**: Medium
**Status**: ✅ Validated — `gray-matter` 是 Next.js 生态中解析 frontmatter 的标准库；slug 逻辑在构建时完成

**类型定义** (`lib/types.ts`):
```typescript
interface Switch {
  slug: string;
  name: string;
  vendor: string;
  type: string;         // 'Linear' | 'Tactile' | 'Clicky' | 'Unknown'
  force: {
    actuation: number;  // 0 表示未知
    bottom_out: number;
  };
  travel: {
    actuation: number;
    total: number;
  };
  sound?: string;
  color?: string;
  mount?: string;
  image: string;        // 图片 URL 或默认图
  curve?: string;       // 力曲线图片 URL
  hasForceCurveData: boolean;
}

interface SwitchDetail extends Switch {
  bodyHtml: string;     // Markdown 渲染后的 HTML
  forceCurveData?: { force: number; displacement: number }[];
}
```

#### Place: 数据管线

**Code Affordances:**
| Affordance | Type | Wires Out | Returns To |
|------------|------|-----------|------------|
| `getAllVendors()` | Function | `fs.readdirSync('data/vendors/')` | `string[]` → Layout sidebar |
| `getSwitchesByVendor()` | Function | 递归遍历 + `gray-matter` 解析 | `Switch[]` → Vendor page |
| `getSwitchBySlug()` | Function | `gray-matter` + `marked.parse()` | `SwitchDetail` → Detail page |
| `getAllSwitches()` | Function | 遍历所有厂商，每厂商取 4 个 | `Switch[]` → Home page featured |
| `parseForceCurve()` | Function | 读取 CSV → 解析数据行 | `{force, displacement}[]` → 客户端图表 |
| `toSlug()` | Function | 相对路径字符串处理 | URL 安全 slug |

---

### Element: 设计系统 (Tailwind + DESIGN.md Tokens)

**What**: 将 DESIGN.md 的完整设计 token 映射到 Tailwind CSS 配置
**Where**: 新建 `tailwind.config.ts`、`app/globals.css`、`app/layout.tsx` 中的字体加载
**Wiring**:
- `tailwind.config.ts` 扩展 theme：
  - `colors.brand`: `{ DEFAULT: '#18E299', light: '#d4fae8', deep: '#0fa76e' }`
  - `colors.near-black`: `#0d0d0d`
  - `colors.gray`: 50→900 映射 DESIGN.md 的灰阶值
  - `colors.warning`: `#c37d0d`、`colors.info`: `#3772cf`、`colors.error`: `#d45656`
  - `borderRadius`: `{ sm: '4px', md: '8px', standard: '16px', lg: '24px', pill: '9999px' }`
  - `fontSize`: `{ display: ['64px', { lineHeight: '1.15', letterSpacing: '-1.28px', fontWeight: '600' }], section: ['40px', { lineHeight: '1.10', letterSpacing: '-0.8px', fontWeight: '600' }], ... }` 覆盖 DESIGN.md 第 3 节全部 13 个层级
  - `boxShadow`: `{ card: 'rgba(0,0,0,0.03) 0px 2px 4px', button: 'rgba(0,0,0,0.06) 0px 1px 2px' }`
- `app/layout.tsx` 用 `next/font/google` 加载 Inter（weights 400/500/600）和 Geist Mono
- `app/globals.css` 定义 CSS 变量用于暗黑模式反转 + `@tailwind` 指令
- `darkMode: 'class'` 策略 — `<html class="dark">` 触发暗黑模式
**Affected code**: 新建 `tailwind.config.ts`、`app/globals.css`、`app/layout.tsx`、`postcss.config.js`
**Complexity**: Low
**Status**: ✅ Validated — Tailwind 自定义 theme 扩展是标准用法，DESIGN.md 的 token 可直接映射

#### Place: 设计系统配置

**Code Affordances:**
| Affordance | Type | Wires Out | Returns To |
|------------|------|-----------|------------|
| `tailwind.config.ts` | Config | 定义所有 design tokens | Tailwind 编译时注入 CSS |
| `next/font` Inter | Font loader | Google Fonts CDN | `--font-inter` CSS 变量 |
| `next/font` Geist Mono | Font loader | 本地或 CDN | `--font-geist-mono` CSS 变量 |
| CSS 变量 (`:root` / `.dark`) | Styles | DESIGN.md 颜色反转 | 暗黑模式切换 |

---

### Element: 页面路由 + 布局

**What**: Next.js App Router 页面结构，3 种页面类型 + 共享布局
**Where**: 新建 `app/` 目录下的路由文件
**Wiring**:

```
app/
├── layout.tsx              → 根布局：Navbar + Sidebar + main 容器
├── page.tsx                → 首页：Hero + Featured Switches 网格
├── gallery/
│   └── page.tsx            → Gallery 模式：全屏沉浸式单轴浏览
├── vendors/
│   └── [vendor]/
│       ├── page.tsx        → 厂商列表页：卡片网格
│       └── [slug]/
│           └── page.tsx    → 轴体详情页：规格 + 描述 + 力曲线
```

- `app/layout.tsx`:
  - 调用 `getAllVendors()` 获取厂商列表（服务端，构建时执行一次）
  - 渲染 `<Navbar>` + `<Sidebar vendors={vendors}>` + `<main>{children}</main>`
  - 加载全局 CSS 和字体

- `app/page.tsx`:
  - 调用 `getAllSwitches()` 获取 featured 轴体
  - 渲染 `<Hero>` + `<SwitchCard>` 网格
  - `export const dynamic = 'force-static'`

- `app/vendors/[vendor]/page.tsx`:
  - `generateStaticParams()` → `getAllVendors().map(v => ({ vendor: v }))`
  - 调用 `getSwitchesByVendor(params.vendor, 3)` → 初期每厂商展示 2-3 个精选轴体
  - 渲染厂商标题 + `<SwitchCard>` 网格（无需分页）

- `app/vendors/[vendor]/[slug]/page.tsx`:
  - `generateStaticParams()` → 遍历所有厂商所有轴体 → `[{ vendor, slug }]`
  - 调用 `getSwitchBySlug(params.vendor, params.slug)` → 获取完整数据
  - 渲染 `<SwitchDetail>` 组件

**Affected code**: 新建 `app/layout.tsx`、`app/page.tsx`、`app/gallery/page.tsx`、`app/vendors/[vendor]/page.tsx`、`app/vendors/[vendor]/[slug]/page.tsx`
**Complexity**: Medium
**Status**: ✅ Validated — `generateStaticParams()` 是 Next.js 静态导出的标准路由预渲染方式

#### Place: 首页 (/)

**UI Affordances:**
| Affordance | Type | Wires Out | Returns To |
|------------|------|-----------|------------|
| Hero 区域 | Display | — | 视觉印象 |
| "Get Started" CTA | Button (pill) | `<Link href="/vendors/Gateron">` | 厂商列表页 |
| Featured Switch 卡片 | Card (click) | `<Link href="/vendors/{vendor}/{slug}">` | 轴体详情页 |

#### Place: 厂商列表页 (/vendors/[vendor])

**UI Affordances:**
| Affordance | Type | Wires Out | Returns To |
|------------|------|-----------|------------|
| 厂商标题 + 数量 badge | Display | — | — |
| Switch 卡片网格 | Card × N (click) | `<Link>` → 详情页 | 详情页 |
| 分页按钮 | Button × 2 | 客户端 state 切换 page | 更新网格显示 |

#### Place: 轴体详情页 (/vendors/[vendor]/[slug])

**UI Affordances:**
| Affordance | Type | Wires Out | Returns To |
|------------|------|-----------|------------|
| 轴体图片 | Image | — | — |
| 规格表 | Table | — | — |
| Markdown 正文 | Content | `dangerouslySetInnerHTML` (已 sanitize) | — |
| 力曲线图 | Chart (客户端) | 读取内嵌 JSON 数据 | 渲染 SVG/Canvas |
| 返回按钮 | Link | `<Link href="/vendors/{vendor}">` | 厂商列表页 |

---

### Element: UI 组件 (DESIGN.md 风格)

**What**: 基于 DESIGN.md 设计系统的可复用 React 组件库
**Where**: 新建 `components/` 目录
**Wiring**: 所有组件使用 Tailwind 类 + DESIGN.md token，不使用 CSS-in-JS

**组件清单与规格**:

| 组件 | 文件 | 关键样式 (DESIGN.md) | 交互 |
|------|------|---------------------|------|
| `Navbar` | `components/navbar.tsx` | 白色 sticky，`backdrop-blur(12px)`，底部 `1px solid rgba(0,0,0,0.05)` | 无 |
| `Sidebar` | `components/sidebar.tsx` | Inter 14px/500，当前项品牌绿高亮，移动端汉堡菜单 | 移动端展开/收起 |
| `Hero` | `components/hero.tsx` | 绿白云状渐变背景，64px/600/-1.28px 标题，双 pill CTA | 无 |
| `SwitchCard` | `components/switch-card.tsx` | 白色，`16px` 圆角，`rgba(0,0,0,0.05)` 边框，hover translateY(-4px) + 边框加深 | hover 动画 |
| `SwitchDetail` | `components/switch-detail.tsx` | 左图 (400px, 24px 圆角) 右规格，响应式堆叠 | 无 |
| `SpecTable` | `components/spec-table.tsx` | 键值对表格，5% 边框分隔，缺失值显示 "N/A" | 无 |
| `ForceCurveChart` | `components/force-curve-chart.tsx` | 客户端组件 (`'use client'`)，用简单 SVG 渲染力曲线 | 无外部图表库 |
| `Pagination` | `components/pagination.tsx` | Pill 按钮 (9999px 圆角)，黑底白字主样式（初期不需要，后续扩展时加入） | 点击切换页码 |
| `ThemeToggle` | `components/theme-toggle.tsx` | 客户端组件 (`'use client'`)，切换 html.dark class，`localStorage` 持久化 | 点击切换 |
| `Badge` | `components/badge.tsx` | `#d4fae8` 背景 + `#0fa76e` 文字 (pill)，区分 Linear/Tactile/Clicky | 无 |
| `Gallery` | `components/gallery.tsx` | 全屏黑色背景 `#0d0d0d`，居中大图，极简白色文字，淡入淡出过渡 | 左右导航 + 触摸 + 键盘 |

**Affected code**: 新建 `components/` 下 11 个文件
**Complexity**: Medium
**Status**: ✅ Validated — 标准 React 函数组件 + Tailwind 类，无外部 UI 库依赖

---

### Element: 暗黑模式 + 响应式

**What**: 基于 DESIGN.md 第 7/8 节的暗黑模式和多断点响应式
**Where**: `app/globals.css`、`tailwind.config.ts`、所有组件
**Wiring**:
- 暗黑模式颜色变量（在 `globals.css` 中定义）：
  - `.dark` → 背景 `#0d0d0d`，文字 `#ededed`，卡片 `#141414`，边框 `rgba(255,255,255,0.08)`
  - 品牌绿 `#18E299` 在暗黑模式中保持不变
  - Hero 渐变变为深色绿色大气效果
- `ThemeToggle` 组件（客户端）：
  - 读取 `localStorage` 中的 `theme` 值
  - 切换 `document.documentElement.classList.toggle('dark')`
  - 在 `layout.tsx` 中通过 `<script>` 标签防止 FOUC（flash of unstyled content）
- 响应式断点（Tailwind 默认 + 自定义）：
  - mobile (`<768px`)：单列布局，sidebar 折叠为汉堡菜单，hero 标题 40px
  - tablet (`md:`)：两列卡片网格，sidebar 可见
  - desktop (`lg:`)：三列卡片网格，完整侧边栏
  - 详情页：桌面 flex-row → 移动 flex-col，图片宽度从 400px 到 100%
**Affected code**: `app/globals.css`、`tailwind.config.ts`、`components/theme-toggle.tsx`、`app/layout.tsx`、所有组件的响应式类
**Complexity**: Low
**Status**: ✅ Validated — Tailwind `dark:` 修饰符 + `class` 策略是标准模式

---

### Element: Gallery 模式（博物馆画展）

**What**: 全屏沉浸式单轴体浏览模式，隐藏所有导航和 UI 噪音，像博物馆展品一样一次只展示一个轴体，支持左右滑动/键盘导航浏览全库
**Where**: 新建 `app/gallery/page.tsx`、`components/gallery.tsx`
**Wiring**:
- `app/gallery/page.tsx`（服务端）：
  - 调用 `getAllSwitches()` 获取全库所有轴体数据（初期为每厂商精选的 2-3 个）
  - 将数据序列化传入客户端 `<Gallery>` 组件
  - `generateStaticParams()` 不需要（单一路由 `/gallery`）
- `components/gallery.tsx`（`'use client'`）：
  - 全屏覆盖布局：`position: fixed; inset: 0; z-index: 50`，纯黑背景 `#0d0d0d`
  - 当前轴体居中展示：大图（或占位组件）+ 轴体名称 + 厂商 + 类型 badge + 关键规格
  - 左右导航：
    - 桌面端：左右箭头键 + 屏幕两侧透明 hover 热区（显示 `←` / `→` 图标）
    - 移动端：触摸滑动手势（`touchstart` / `touchend` 计算方向）
    - CSS transition：切换时图片和文字淡入/淡出 (`opacity` + `transform`)
  - 底部信息栏：极简设计，显示「3 / 28」计数器 + 厂商名
  - 退出按钮：右上角 `×` 按钮或 `Escape` 键 → 返回之前页面
  - 点击轴体名称或「查看详情」→ `<Link>` 跳转到详情页
- 入口点：
  - 首页 Hero 区域增加「Gallery」CTA 按钮（与 "Get Started" 并列）
  - 详情页增加「Gallery 模式浏览」按钮
  - 导航栏增加 Gallery 链接
**Affected code**: 新建 `app/gallery/page.tsx`、`components/gallery.tsx`；修改 `components/hero.tsx`（增加 CTA）、`components/navbar.tsx`（增加链接）
**Complexity**: Medium
**Status**: ✅ Validated — 纯客户端组件，CSS transition + 触摸事件 + 键盘事件，无外部依赖

#### Place: Gallery 全屏浏览 (/gallery)

**UI Affordances:**
| Affordance | Type | Wires Out | Returns To |
|------------|------|-----------|------------|
| 轴体大图/占位组件 | Image (居中) | — | — |
| 轴体名称 | Display (Inter 40px/600) | — | — |
| 类型 Badge | Badge (pill) | — | — |
| 关键规格行 | Display (Geist Mono) | — | — |
| 左箭头热区 / 左滑 | Navigation | 更新 currentIndex - 1 | 上一个轴体 |
| 右箭头热区 / 右滑 | Navigation | 更新 currentIndex + 1 | 下一个轴体 |
| 计数器 「3 / 28」 | Display | — | — |
| 退出按钮 / Escape | Button | `router.back()` 或 `<Link href="/">` | 之前页面 |
| 「查看详情」链接 | Link | `<Link href="/vendors/{vendor}/{slug}">` | 详情页 |

**Code Affordances:**
| Affordance | Type | Wires Out | Returns To |
|------------|------|-----------|------------|
| `useState(currentIndex)` | React state | 控制当前显示的轴体 | Gallery 渲染 |
| `useEffect` keyboard | Event listener | `ArrowLeft` / `ArrowRight` / `Escape` | 更新 index 或退出 |
| Touch handlers | Event listener | `touchstart` / `touchend` 方向计算 | 更新 index |
| CSS transition | Animation | `opacity 0→1`、`transform translateX` | 视觉过渡 |

---

## Fit Check (R x Solution)

| | E1: Next.js 骨架 | E2: 数据层 | E3: 设计系统 | E4: 页面路由 | E5: UI 组件 | E6: 暗黑+响应式 | E7: Gallery |
|---|---|---|---|---|---|---|---|
| R0: 专业可信视觉 | | | ✅ | | ✅ | | ✅ |
| R1: Next.js + 组件化 | ✅ | | | ✅ | ✅ | | |
| R2: 首页 hero + featured | | ✅ | | ✅ | ✅ | | |
| R3: 厂商列表页 | | ✅ | | ✅ | ✅ | | |
| R4: 详情页规格+力曲线 | | ✅ | | ✅ | ✅ | | |
| R5: 响应式设计 | | | | | | ✅ | ✅ |
| R6: 暗黑模式 | | | ✅ | | | ✅ | |
| R7: 动效微交互 | | | | | ✅ | | ✅ |
| R8: 数据层复用 | | ✅ | | | | | |
| R9: Gallery 全屏模式 | | ✅ | | ✅ | | | ✅ |

每个 R 行至少有 1 个 ✅。每个 Element 列至少有 1 个 ✅。无覆盖空白。

## Rabbit Holes

- **Slug 编码冲突**：不同轴体可能在 slug 化后产生相同 URL（如 `MX Red (3 Pin)` 和 `MX Red (5 Pin)` 都变成 `mx-red-3-pin` / `mx-red-5-pin`——实测无冲突）。**解决方案**：slug 生成时保留括号内的数字，构建时检测重复 slug 并报错。已排除风险。

- **力曲线 CSV 格式不一致**：前 5 行是摘要信息（Maximum/Minimum/Average 等），实际数据从第 6 行开始。不同文件采样点数不同（2000～2400 行）。**解决方案**：`parseForceCurve()` 跳过前 5 行，按表头行解析列位置，采样每 N 个点只取 ~200 个数据点用于 SVG 渲染（减少页面体积）。已解决。

- **静态导出不支持 searchParams 分页**：Next.js `output: 'export'` 模式下没有服务端，不能用 URL search params 做分页。**解决方案**：初期每厂商只展示 2-3 个精选轴体（优先有图片和完整数据的），无需分页。后续扩展到全部轴体时再实现客户端分页。已解决。

- **图片极度稀缺**：~500 个轴体中只有 3 个有实际图片文件。大量默认占位图可能影响视觉效果。**解决方案**：设计一个美观的占位图组件（显示轴体类型的图标 + 品牌色渐变背景），而非简单的灰色图片。这比默认 PNG 占位图更专业。已解决。

- **嵌套目录 vs 扁平目录**：`Gateron/Ink/Black_V2/` 是嵌套的，`Gateron/Oil King/` 是扁平的。两种结构都需要正确处理。**解决方案**：`getSwitchesByVendor()` 递归遍历所有子目录，任何包含 `README.md` 的目录都视为一个轴体条目（排除厂商根目录的 README）。slug 从相对于厂商根的路径生成。已解决。

- **page_N.md 文件干扰**：厂商目录下存在旧的 `page_1.md`～`page_9.md` 分页文件，不是轴体数据。**解决方案**：数据层遍历时只识别名为 `README.md` 的文件，忽略所有其他 `.md` 文件。已解决。

- **Gallery 数据量与页面体积**：全库 ~500 个轴体，如果将所有数据序列化到 Gallery 页面中，HTML 体积可能过大。**解决方案**：Gallery 页面只加载轻量的 `Switch` 数据（name/vendor/type/force/image/slug），不包含 bodyHtml 和 forceCurveData。每个轴体约 200 bytes，500 个约 100KB——完全可接受。已解决。

- **Gallery 触摸手势与浏览器后退冲突**：移动端左滑可能与浏览器的"返回上一页"手势冲突。**解决方案**：Gallery 使用 `touch-action: pan-y` 只允许垂直滚动，水平滑动由自定义处理。或用按钮代替手势——初期用屏幕两侧的触摸按钮，比手势更可靠。已解决。

## No-Gos

- **搜索功能**：本次不实现全站搜索。这是一个独立的功能需求，应单独 frame。
- **轴体对比功能**：不实现并排对比两个轴体的功能。
- **用户账户/收藏功能**：不实现任何用户状态相关功能。
- **SSR/ISR**：不使用服务器端渲染或增量静态再生。纯静态导出。
- **数据格式统一**：不在本次范围内修复 `type: Unknown` 或 `force: 0` 的数据质量问题。UI 层优雅处理缺失数据即可。
- **外部图表库**：不引入 Chart.js / D3 等外部库渲染力曲线。使用简单 SVG 路径即可满足需求。
- **国际化 (i18n)**：不实现多语言支持。

## Technical Validation

**Codebase reviewed**:
- `scripts/build_static.js` — 完整阅读，理解了所有模板结构、CSS、数据遍历逻辑
- `data/vendors/` — 检查了 Gateron/Cherry/Akko/TTC/Kailh 多个厂商的目录结构和 README.md 格式
- `data/vendors/Cherry/MX Red (5 Pin)/force-curve.csv` — 理解了 CSV 格式（前 5 行摘要 + 表头 + 数据）
- `vercel.json` — 确认当前部署配置
- `package.json` — 确认当前依赖（`marked`、`mintlify`）
- `Makefile` — 确认构建流程（`reorganize_vendors.js` → `build_static.js`）
- `DESIGN.md` (`~/.config/DESIGN.md`) — 完整阅读，理解了所有 design token、组件规格、暗黑模式、响应式规则

**Approach validated**:
- Next.js `output: 'export'` 在 Vercel 上部署是官方支持的方式
- `gray-matter` 是 Next.js 生态中解析 Markdown frontmatter 的事实标准库
- Tailwind CSS 自定义 theme 扩展可以完整映射 DESIGN.md 的所有 token
- `generateStaticParams()` 可以在构建时遍历文件系统生成所有路由
- `next/font` 加载 Inter 和 Geist Mono 可消除 FOUT
- 客户端分页（React state）适用于每厂商 <100 个轴体的数据量

**Flagged unknowns resolved**: 图片处理 (✅ 构建时复制 + 占位组件) 和 Slug 编码 (✅ 小写化+连字符化+构建时 Map) 均已解决。所有未知项已关闭。

**Test strategy**:
- 构建验证：`next build` 成功完成且无错误
- 路由验证：所有 `generateStaticParams()` 生成的路径在 `out/` 目录中有对应 HTML
- 数据验证：`lib/data.ts` 的每个函数应有单元测试（可选，appetite 允许时）
- 视觉验证：`next dev` 本地预览，对照 DESIGN.md 检查各组件
- 暗黑模式验证：light/dark 切换无 FOUC
- 响应式验证：Chrome DevTools 检查 3 个断点

---

## Status: Shape Go — approved 2026-04-11
