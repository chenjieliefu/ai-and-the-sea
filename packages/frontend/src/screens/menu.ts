// Main menu.
import { el, button } from '../ui/ui';
import { showUpdateLog } from '../docs/version';
import gsap from 'gsap';

export function menuScreen(root: HTMLElement): void {
  root.replaceChildren();

  const hero = el('div', { class: 'menu-hero' }, [
    el('button', {
      class: 'btn-hero',
      onClick: () => (location.hash = '#/single'),
    }, [
      el('img', { class: 'hero-icon hero-icon-single', src: '/sprites/icon_single.svg', alt: '' }),
      el('span', { class: 'hero-label', text: '单人养鱼' }),
    ]),
    el('button', {
      class: 'btn-hero',
      onClick: () => (location.hash = '#/match'),
    }, [
      el('img', { class: 'hero-icon hero-icon-match', src: '/sprites/icon_match.svg', alt: '' }),
      el('span', { class: 'hero-label', text: '多人竞技' }),
    ]),
  ]);

  // Remaining entries laid out below the two hero buttons (simulate has moved into the "multiplayer" page)
  const grid = el('div', { class: 'menu-grid' }, [
    button('观战', () => (location.hash = '#/spectate'), { class: 'btn' }),
    button('回放', () => (location.hash = '#/replay'), { class: 'btn' }),
    button('API 文档', () => (location.hash = '#/api-docs'), { class: 'btn' }),
    button('更新日志', () => showUpdateLog(), { class: 'btn' }),
  ]);

  const box = el('div', { class: 'menu-box' }, [
    el('div', { class: 'menu-logo-wrap' }, [
      el('img', { class: 'menu-logo', src: '/sprites/logo.svg', alt: 'AI与海' }),
      el('span', { class: 'menu-slogan', text: '让代码在大海里遨游' }),
    ]),
    el('div', { class: 'menu-tagline', text: '基于 TypeScript 编程的回合制海洋养鱼游戏' }),
    hero,
    grid,
    el('div', { class: 'menu-footer' }, [
      el('span', { class: 'menu-powered', text: 'AI与海 · 写代码养鱼' }),
    ]),
  ]);
  root.append(box);

  // Entrance animation: stagger the menu box children (logo, hero, grid) on first open.
  const items = Array.from(box.children);
  gsap.fromTo(
    items,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
  );
}
