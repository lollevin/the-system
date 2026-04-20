# AGENTS.md

## Learned User Preferences

- 用户偏好使用简体中文回复
- 避免使用 StrReplace 处理大型代码块，改用 Shell 的 Get-Content/Set-Content
- Write 工具经常出现 "Invalid arguments" 错误时，复制现有文件再修改

## Learned Workspace Facts

- 项目名称: "BurgerBro" 会员忠诚度系统 SaaS
- 技术栈: Next.js (App Router) + Supabase (SSR) + TailwindCSS + Shadcn/UI + Lucide Icons + Recharts
- 主题: 深色模式 (Zinc-950 背景)，主色调: Amber-500 (金色)
- 数据库表: profiles, transactions, menu_items, ai_campaigns, vouchers
- 三个门户: 客户 PWA (/pwa), 员工终端 (/staff), 管理仪表板 (/admin)
- 使用基于角色的中间件保护路由 (customer, operator, admin)
- 货币格式: MYR (马来西亚林吉特)
- AI 功能: 通过 OpenAI 生成 WhatsApp 营销消息
- Admin UI 重新设计: 全屏页面 (Overview, Customer Management, Settings, Growth) 移除了主侧边栏
- Banner 系统有 3 种类型: login (全屏), topbar (顶部横条), popup (游戏广告风格)
- Settings 页面重新设计为 Profile/Banner 标签页
- Customer Management 页面从多个菜单项整合为单一页面