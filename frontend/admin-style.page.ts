import { addPage, Page } from '@hydrooj/ui-default';

// SU 用户名颜色，改这里即可
const SU_COLOR = '#9c3dcf';

const style = `
a.user-profile-name.uname--su { color: ${SU_COLOR} !important; }
`;

function uidOf(a: HTMLAnchorElement) {
  const m = /\/user\/(\d+)(?:[?#]|$)/.exec(a.getAttribute('href') || '');
  return m ? +m[1] : null;
}

function mark(root: ParentNode) {
  const su: number[] = (window as any).UiContext?.suUids || [];
  if (!su.length) return;
  root.querySelectorAll<HTMLAnchorElement>('a.user-profile-name:not(.uname--su)').forEach((a) => {
    const uid = uidOf(a);
    if (uid !== null && su.includes(uid)) a.classList.add('uname--su');
  });
}

addPage(new Page('admin-style', () => {
  const el = document.createElement('style');
  el.textContent = style;
  document.head.appendChild(el);
  mark(document);
  // 讨论回复、分页等异步插入的内容
  new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => { if (n.nodeType === 1) mark(n as Element); });
    }
  }).observe(document.body, { childList: true, subtree: true });
}));
