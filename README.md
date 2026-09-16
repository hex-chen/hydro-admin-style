# hydro-admin-style

Hydro OJ 插件：**隐藏用户名旁的 SU / MOD 徽章和 LV 等级标签，管理员用户名改为紫色**。

- 超级管理员（SU）和域管理员（MOD）的用户名显示为紫色（默认 `#9c3dcf`，改 `frontend/admin-style.page.ts` 里的 `ADMIN_COLOR`）
- 用户自定义徽章（badge）照常显示
- 纯前端样式，不改数据、不加接口；适配 Hydro 4 / 5 的 ui-default

## 安装

```bash
mkdir -p ~/.hydro/addons && cd ~/.hydro/addons
git clone https://github.com/hex-chen/hydro-admin-style.git
hydrooj addon add ~/.hydro/addons/hydro-admin-style
pm2 restart hydrooj
```

启动日志出现 `UI addons built` 后刷新页面即生效（第一次编译可能要等十几秒）。

## 不装插件的替代做法

系统管理 → 系统设置 → `ui-default.footer_extra_html`，填入：

```html
<style>
.user-profile-badge.badge--su,.user-profile-badge.badge--mod,.user-profile-badge[class*="badge--lv"]{display:none!important}
.user-profile-link:has(.badge--su) .user-profile-name,.user-profile-link:has(.badge--mod) .user-profile-name{color:#9c3dcf!important}
</style>
```

保存即生效，无需重启。区别是依赖浏览器支持 CSS `:has()`（Chrome 105+ / Safari 15.4+ / Firefox 121+）。

## 只想紫 SU、不紫 MOD？

把两处 `.badge--mod` 相关的行删掉即可。
