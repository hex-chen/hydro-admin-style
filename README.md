# hydro-admin-style

Hydro OJ 插件，两件事：

1. **隐藏用户名旁的 SU 徽章和 LV 等级标签，超级管理员用户名改为紫色**（默认 `#9c3dcf`，改 `frontend/admin-style.page.ts` 里的 `ADMIN_COLOR`）。MOD 徽章和用户自定义徽章照常显示。
2. **让 uid 1（默认超管账号）参与排名**。Hydro 原版在排行榜页、首页排行和 RP 脚本的名次/等级计算里都写死排除了 uid 1，本插件覆盖这三处。

适配 Hydro v5.0.x（对着 5.0.4 源码写的）。

## 安装

```bash
mkdir -p ~/.hydro/addons && cd ~/.hydro/addons
git clone https://github.com/hex-chen/hydro-admin-style.git
hydrooj addon add ~/.hydro/addons/hydro-admin-style
pm2 restart hydrooj
```

重启后到 **系统管理 → 脚本**，运行 `rp`（不填参数即全部域），uid 1 才会有名次和 LV。

## 卸载

```bash
hydrooj addon remove hydro-admin-style && pm2 restart hydrooj
```

卸载后再跑一次 `rp` 脚本，uid 1 的名次会重新清掉。

## 只想要样式、不想装插件

系统管理 → 系统设置 → `ui-default.footer_extra_html` 填下面**这一行**（这个设置按行拆分，必须写在一行里）：

```html
<style>.user-profile-badge.badge--su,.user-profile-badge[class*="badge--lv"]{display:none!important}.user-profile-link:has(.badge--su) .user-profile-name{color:#9c3dcf!important}</style>
```

## 附：RP 的几条规则（原版行为，插件没改）

- 题目上传者（owner）做自己的题不算题目 RP
- 隐藏题、比赛/作业内的提交不算题目 RP
- RP 按域独立计算
