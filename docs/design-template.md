# SOVIA 构成主义视觉模板

## 方向
构成主义 × 未来档案馆。通过不对称构图、朱红圆形、斜向结构和巨幅排版建立游戏官网的辨识度；用暖白留白、细分隔线和克制的交互承载实际内容。

## 入口
- 首页参考：src/features/home/ui/home-page.tsx
- 首页主视觉布局：src/features/home/ui/home-hero.tsx
- 统一插画组件：src/features/home/ui/constructivist-art.tsx（七种原创 SVG 构图）
- 设计系统：src/app/(site)/constructivist.css
- 基础主题：src/app/(site)/site.css
- 通用卡片：src/shared/ui/card.tsx
- 公共页框架：src/features/layout/ui/layout-main.tsx

## 配色与版式
- 暖白纸面：#F0EFE8；正文：#1D201E。
- 主视觉朱红：--design-accent / #E04432。
- 深色舞台：--design-stage / #191E1B；舞台文字：#F0EEE5。
- 操作按钮使用更深的 #B43122，保证浅色文字的可读性。
- 页面宽度：--design-width / 1320px；左右留白：--design-gutter。
- 段落之间的距离：--design-space；细线与次要文字自动继承亮暗主题。
- 主站按语言使用 next/font 的 Noto Sans、JP、KR、SC、TC，通用 UI 与后台使用 Geist。字体采用 swap 显示策略，同时保留系统字体兜底。标题大且紧凑，正文保持舒展行距。
- 大块红色集中在视觉焦点；普通内容依靠层级、编号与细线组织。

## 复用
新页面沿用 LayoutMain；主要操作使用 btn-primary，次要操作使用 btn-outline；小标签使用 meta，分隔线使用 hr。内容入口使用 Card，提供 title、subTitle、serial、route 和正文。页面分区标题可使用 section-heading，正文块使用 manifesto。

首页通过 HomeCopy、SharedCopy 和 locale 注入内容；新文案需要同步六种主站语言。内部跳转用 Next Link。后台与测试题库文案保持各自现有体系。

## 响应与动效
桌面首页采用双栏首屏与三列入口卡片；平板卡片降为两列；手机首屏上下排列，卡片单列。主视觉是装饰内容，对读屏隐藏。焦点保持可见，交互轻微位移，遵循 prefers-reduced-motion。

## 使用原则
几何装置可以换成角色、产品或封面，保留文字区与视觉区的比例。不要让每个区块都抢占主视觉，也不要在普通信息卡片中叠加厚重阴影。以首页作为后续页面的实际代码模板。

## 字体下载与证书

字体在编译时从 Google 下载，由 Next.js 本地托管。开发命令通过 Node 的 --use-system-ca 使用系统信任证书，要求 Node 22.15+（建议使用当前项目环境的 Node 24 LTS）；Turbopack 构建通过 experimental.turbopackUseSystemTlsCerts 启用系统证书。证书配置保留 HTTPS 校验。修改启动参数后需重启 pnpm dev。

## 第二轮视觉细化

背景使用低对比点纹、网格和斜向色块；首屏通过渐变光照、投影与分层 SVG 建立空间感。首页六个入口各自使用歌词纸张、唱片、几何装置、画框、连接节点和信封构图。图形统一由 ConstructivistArt 输出，HomeCardArt 只负责首页类型映射和容器；Card 的可选 visual 属性负责承载。

动效只包含不超过 4.5 秒的单次入场和精确指针设备上的悬停反馈；prefers-reduced-motion 下关闭动效。手机使用原有单栏布局，插画按比例缩放。所有新增图形均为装饰，不增加图片下载或 Sharp 处理依赖。

## 统一插画组件

所有几何插画由 src/features/home/ui/constructivist-art.tsx 管理，并从 @sovia/home 导出。variant 必须是 monument（主视觉）、archive（档案）、record（唱片）、structure（构成）、frames（图像）、network（社区）或 envelope（信封）。

```tsx
import { ConstructivistArt } from "@sovia/home";

<ConstructivistArt variant="record" className="your-art-layout" />
```

组件统一处理 viewBox、装饰图的无障碍属性与颜色默认值；可通过容器的 --art-accent、--art-paper、--art-grooves 和 color 调色。尺寸、背景、边框、动效由容器和设计系统负责。新增图形应扩展 variant 类型和内部构图，不在页面中另写一套 SVG。当前插画属于首页视觉体系，因此留在 home 模块，不扩大 shared 的依赖范围。

## 页面切换

PageTransition 位于 src/features/layout/ui/page-transition.tsx，在 LayoutMain 中统一包裹页面内容。路径变化后播放单层低对比斜向薄幕和轻微正文入场；桌面时长 1000ms，手机 800ms。薄幕最高不透明度为 12%，水平移动总计 24px；正文从 88% 不透明度恢复，上移 4px，无等待延迟。取消全屏红黑色块交替和标记闪现，减少亮度突变。首次加载、查询参数和页内锚点变化不触发。

使用浏览器 Web Animations API，不拦截链接、不延迟路由、不使用 pathname 作为内容 key。保留 Next.js 的页面状态、滚动与焦点行为；再次导航或组件卸载会取消动画，切换减少动态效果偏好会立即停止动画。独立 CSS Module 管理图层外观，所有选择器均使用局部类。
