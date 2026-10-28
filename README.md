# Bamilen Archive

Bamilen 档案库是《死潮》世界观下的同人档案站，由埃德里奥（Etherial）维护。站点采用蓝白色科研实验室风格，使用与 [SPA 中央档案库](https://ksayus.top/SPA-Archive/) 相同的 Supabase 项目与身份系统。

## 站点

- 线上地址：<https://ksayus.top/Bamilen-Archive/>
- 主站：<https://ksayus.top/SPA-Archive/>
- 技术栈：静态 HTML + ES module + Supabase Auth / Postgres RLS
- 构建：`npm run build`（esbuild）

## 本地开发

```bash
npm install
npm run build
```

本地预览可直接打开 `index.html`，或使用任意静态服务器。

## 数据库

Bamilen 使用独立的 `bamilen_*` 内容表，并复用 SPA 项目的 `profiles`、`my_clearance()` 与 `can_read_archive()`：

```bash
node scripts/db-push.mjs supabase/migrations/0001_bamilen.sql
node scripts/db-push.mjs supabase/seed/0001_catalog.sql
```

数据库连接信息放在本地 `.env.local`，该文件已被 `.gitignore` 忽略。

## 内容与权限

- 档案正文与种子内容存放在本地 `content/` 目录，不进入公开仓库。
- 公开目录只返回元数据；正文由行级安全策略保护。
- 限制层与封存层需要对应权限；锁定详情页只显示简洁的“权限不足”状态。
- 账号与 SPA 档案库共用。Bamilen 登记码为 `BML-ENLIST-2026`，登记后使用同一 `profiles` 权限档案。

## 边界

本站为同人创作，与现实中任何组织、企业或政府无关。世界观与角色源自《死潮》设定整理；新增档案为同人补写。
