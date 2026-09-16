import { addPage, Page } from '@hydrooj/ui-default';

// 管理员用户名颜色，改这里即可
const ADMIN_COLOR = '#9c3dcf';

const style = `
/* 隐藏 SU / MOD 徽章和 LV 等级标签 */
.user-profile-badge.badge--su,
.user-profile-badge.badge--mod,
.user-profile-badge[class*="badge--lv"] {
  display: none !important;
}

/* 同一个 .user-profile-link 里带 SU/MOD 徽章的用户名变紫（徽章虽隐藏，仍在 DOM 里） */
.user-profile-link:has(.badge--su) .user-profile-name,
.user-profile-link:has(.badge--mod) .user-profile-name,
.user-profile-name.is-admin {
  color: ${ADMIN_COLOR} !important;
}
`;

// 旧浏览器不支持 :has()，用 JS 兜底加 class
function markAdmins(root: ParentNode = document) {
  root.querySelectorAll('.badge--su, .badge--mod').forEach((badge) => {
    const name = badge.closest('.user-profile-link')?.querySelector('.user-profile-name');
    if (name) name.classList.add('is-admin');
  });
}

addPage(new Page('admin-style', () => {
  const el = document.createElement('style');
  el.textContent = style;
  document.head.appendChild(el);
  markAdmins();
  // 动态加载的内容（分页、弹窗等）也处理
  new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => { if (n instanceof Element) markAdmins(n); });
    }
  }).observe(document.body, { childList: true, subtree: true });
}));
