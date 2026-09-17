import { addPage, Page } from '@hydrooj/ui-default';

// 用户名颜色，改这里即可
const NAME_COLOR = '#9c3dcf';

// 所有用户名统一变紫；SU / MOD / LV 等徽章原样保留
const style = `
.user-profile-name {
  color: ${NAME_COLOR} !important;
}
`;

addPage(new Page('admin-style', () => {
  const el = document.createElement('style');
  el.textContent = style;
  document.head.appendChild(el);
}));
