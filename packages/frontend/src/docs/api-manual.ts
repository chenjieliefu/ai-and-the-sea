// Boat API manual: right-hand large sidebar, collapsed by default, toggled via right-edge icon.
// Content grouped into tabs: Operations / Functions / Data / Fishs / Rules.
// Docs come from shared/src/docs.ts (single source of truth, shared with the backend MCP server).
// The main menu "API manual" modal reuses the same content (apiManualContent, fully expanded).
import { el } from '../ui/ui';
import { icon } from '../ui/icon';
import { fishDocEntries, FISHES, FishType, DOC_FUNCTIONS, DOC_OPERATIONS, DOC_OVERVIEW, DOC_RULES, DOC_TYPES, DocEntry } from '@aiyu/shared';

/** 根据鱼种类与颜色生成各自专属的内联 SVG 图标 (data URI)。 */
function fishIconDataUri(type: FishType, color: string): string {
  const eye = (x: number, y: number, r = 2): string =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="#0b1c30"/>`;
  let body = '';
  switch (type) {
    case FishType.Shrimp:
      body =
        `<path d="M12 30 Q10 16 28 16 Q44 16 52 26 Q54 32 50 38 Q32 30 18 34 Q10 38 12 30 Z" fill="${color}"/>` +
        `<path d="M50 20 L62 10 L58 28 Z" fill="${color}"/>` +
        `<path d="M50 44 L62 54 L56 38 Z" fill="${color}"/>` +
        `<path d="M16 20 Q9 10 3 13" stroke="#0b1c30" stroke-width="1.4" fill="none"/>` +
        `<path d="M16 24 Q9 22 3 27" stroke="#0b1c30" stroke-width="1.4" fill="none"/>` +
        eye(20, 26, 1.8);
      break;
    case FishType.Sardine:
      body =
        `<path d="M6 32 L16 20 L16 44 Z" fill="${color}"/>` +
        `<path d="M14 32 Q14 20 32 18 Q50 18 57 30 Q50 46 32 46 Q14 44 14 32 Z" fill="${color}"/>` +
        eye(47, 28, 1.9);
      break;
    case FishType.Pufferfish:
      body =
        `<path d="M55 32 L45 26 L45 38 Z" fill="${color}"/>` +
        `<circle cx="30" cy="32" r="21" fill="${color}"/>` +
        `<path d="M30 6 L26 12 L34 12 Z" fill="${color}"/>` +
        `<path d="M10 18 L14 14 L18 20 Z" fill="${color}"/>` +
        `<path d="M6 32 L12 30 L12 36 Z" fill="${color}"/>` +
        `<path d="M10 46 L14 42 L18 48 Z" fill="${color}"/>` +
        `<path d="M30 58 L26 52 L34 52 Z" fill="${color}"/>` +
        `<path d="M50 46 L46 42 L42 48 Z" fill="${color}"/>` +
        `<path d="M54 32 L48 30 L48 36 Z" fill="${color}"/>` +
        eye(38, 27, 2.4) +
        `<path d="M42 37 Q46 40 46 35" stroke="#0b1c30" stroke-width="1.3" fill="none"/>`;
      break;
    case FishType.Hairtail:
      body =
        `<path d="M4 28 Q20 24 40 28 Q56 32 60 36 L60 38 Q44 40 28 38 Q12 36 4 34 Z" fill="${color}"/>` +
        `<path d="M2 30 L6 30 L6 34 L2 34 Z" fill="${color}"/>` +
        eye(55, 34, 1.6);
      break;
    case FishType.Shark:
      body =
        `<path d="M52 14 L46 19 L48 27 L10 27 Q3 27 3 32 Q3 37 10 37 L48 37 L46 45 L52 50 Z" fill="${color}"/>` +
        `<path d="M26 27 L36 10 L42 27 Z" fill="${color}"/>` +
        `<path d="M22 37 L30 52 L36 37 Z" fill="${color}"/>` +
        eye(14, 30, 1.9);
      break;
    case FishType.Whale:
      body =
        `<ellipse cx="30" cy="34" rx="24" ry="15" fill="${color}"/>` +
        `<path d="M52 28 L64 19 L62 34 Z" fill="${color}"/>` +
        `<path d="M52 40 L64 49 L62 34 Z" fill="${color}"/>` +
        `<path d="M24 12 Q27 3 33 7 Q30 14 30 12" stroke="#7cc8f4" stroke-width="2" fill="none"/>` +
        `<path d="M18 44 Q30 50 42 44" stroke="#cfeaff" stroke-width="2" fill="none"/>` +
        eye(40, 29, 2.2);
      break;
    case FishType.Jellyfish:
      body =
        `<path d="M12 24 Q12 8 32 8 Q52 8 52 24 Z" fill="${color}"/>` +
        `<path d="M14 26 Q16 36 12 46" stroke="${color}" stroke-width="2.2" fill="none"/>` +
        `<path d="M24 27 Q26 38 22 50" stroke="${color}" stroke-width="2.2" fill="none"/>` +
        `<path d="M32 28 Q32 40 30 52" stroke="${color}" stroke-width="2.2" fill="none"/>` +
        `<path d="M40 27 Q40 38 42 50" stroke="${color}" stroke-width="2.2" fill="none"/>` +
        `<path d="M48 26 Q48 36 52 46" stroke="${color}" stroke-width="2.2" fill="none"/>` +
        eye(26, 17, 1.6) +
        eye(38, 17, 1.6);
      break;
    case FishType.Crab:
      body =
        `<ellipse cx="32" cy="38" rx="17" ry="11" fill="${color}"/>` +
        `<path d="M16 28 L4 18 Q1 15 6 15 L16 22 Z" fill="${color}"/>` +
        `<circle cx="7" cy="14" r="4.5" fill="${color}"/>` +
        `<path d="M48 28 L60 18 Q63 15 58 15 L48 22 Z" fill="${color}"/>` +
        `<circle cx="57" cy="14" r="4.5" fill="${color}"/>` +
        `<path d="M18 42 L6 46 M18 47 L6 53 M46 42 L58 46 M46 47 L58 53" stroke="${color}" stroke-width="2" fill="none"/>` +
        eye(26, 36, 1.5) +
        eye(38, 36, 1.5);
      break;
    case FishType.Carp:
      body =
        `<path d="M10 32 L22 20 L18 44 Z" fill="${color}"/>` +
        `<ellipse cx="34" cy="32" rx="17" ry="12" fill="${color}"/>` +
        `<path d="M24 21 Q30 12 38 21 Z" fill="${color}"/>` +
        eye(43, 28, 2);
      break;
    case FishType.Tuna:
      body =
        `<path d="M8 32 L20 20 L20 44 Z" fill="${color}"/>` +
        `<path d="M18 32 Q18 20 34 18 Q52 18 58 30 Q52 46 34 46 Q18 44 18 32 Z" fill="${color}"/>` +
        `<path d="M30 18 L34 7 L42 18 Z" fill="${color}"/>` +
        `<path d="M30 46 L34 57 L42 46 Z" fill="${color}"/>` +
        eye(48, 28, 2);
      break;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${body}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function codeBlock(code: string): HTMLElement {
  return el('pre', { class: 'manual-code', text: code });
}

function section(title: string, ...children: (Node | string)[]): HTMLElement {
  return el('div', {}, [el('h3', { text: title }), ...children]);
}

/** Render text: backtick spans -> inline code, [text](#ref) -> in-doc hyperlink, **bold**, *italic* */
function fmt(text: string): HTMLElement {
  const tokens = text.split(/(`[^`]*`|\[[^\]]*\]\(#[^)]*\)|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  const out: (Node | string)[] = [];
  for (const tok of tokens) {
    if (tok.startsWith('`') && tok.endsWith('`')) {
      out.push(el('code', { text: tok.slice(1, -1) }));
    } else if (tok.startsWith('**') && tok.endsWith('**')) {
      out.push(el('strong', { text: tok.slice(2, -2) }));
    } else if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 1) {
      out.push(el('em', { text: tok.slice(1, -1) }));
    } else if (tok.startsWith('[')) {
      const m = tok.match(/^\[([^\]]*)\]\(#([^)]*)\)$/);
      if (m) out.push(refLink(m[1], m[2]));
      else out.push(document.createTextNode(tok));
    } else {
      out.push(document.createTextNode(tok));
    }
  }
  return el('span', {}, out);
}

/** Unordered list */
function list(items: string[]): HTMLElement {
  const ul = el('ul', { class: 'doc-list' });
  for (const item of items) ul.append(el('li', {}, [fmt(item)]));
  return ul;
}

/** In-doc hyperlink: click to jump to the entry/panel referenced by data-ref */
function refLink(text: string, ref: string): HTMLAnchorElement {
  const a = document.createElement('a');
  a.className = 'doc-link';
  a.textContent = text;
  a.setAttribute('data-ref', ref);
  a.href = `#${ref}`;
  return a;
}

/** Render a doc entry (content from shared docs) */
function docEntry(e: DocEntry): HTMLElement {
  const rows: HTMLElement[] = [
    el('h4', { text: e.name }),
    el('p', {}, [el('b', { text: '定义: ' }), el('code', { text: e.def })]),
    el('p', {}, [el('b', { text: '描述: ' }), fmt(e.desc)]),
  ];
  if (e.params) {
    rows.push(el('p', {}, [el('b', { text: '参数: ' })]), list(e.params));
  }
  if (e.returns) rows.push(el('p', {}, [el('b', { text: '返回: ' }), fmt(e.returns)]));
  if (e.example) {
    rows.push(el('p', {}, [el('b', { text: '示例: ' })]), codeBlock(e.example));
  }
  return el('div', { class: 'doc-entry', id: e.id }, rows);
}

/** Render one rule paragraph. A leading short "label:" is split off into a badge so the dense rules tier into scannable term + description rows; backticked code keeps its chip styling. */
function ruleParagraph(text: string): HTMLElement {
  const m = text.match(/^([^:：]{1,12}?)\s*[:：]\s*(.+)$/s);
  const p = el('p', { class: 'rule-card-p' });
  if (m) {
    p.append(el('span', { class: 'rule-label', text: m[1].trim() }));
    p.append(fmt(m[2]));
  } else {
    p.append(fmt(text));
  }
  return p;
}

/** Rule section: each rendered as a card with an accent left border + heading, so the dense rules break into scannable blocks instead of a flat wall of text. */
function ruleSection(rs: { title: string; paragraphs: string[] }): HTMLElement {
  return el('div', { class: 'rule-card' }, [
    el('h3', { class: 'rule-card-title', text: rs.title }),
    ...rs.paragraphs.map(ruleParagraph),
  ]);
}

/** Content per tab (order matches tabs; panel ids used for hyperlink jumps) */
function buildSections(): HTMLElement[] {
  return [
    // ---- 1. Operations ----
    el('div', { class: 'api-panel', id: 'tab-ops' }, [
      section(
        '渔船操作',
        el('p', { class: 'hint', text: '`run(boatId)` 函数必须返回本章指定的类型，表示渔船执行特定操作; 或返回 null 表示本回合不动。' }),
        ...DOC_OPERATIONS.map(docEntry)
      ),
    ]),

    // ---- 2. Functions ----
    el('div', { class: 'api-panel', id: 'tab-fns' }, [
      section(
        'API 函数',
        el('p', { class: 'hint', text: '坐标均为 `[x, y]` 元组, x 向右, y 向下; 越界访问返回 `null`。' }),
        ...DOC_FUNCTIONS.map(docEntry)
      ),
    ]),

    // ---- 3. Data ----
    el('div', { class: 'api-panel', id: 'tab-data' }, [
      section('数据类型', ...DOC_TYPES.map(docEntry)),
    ]),

    // ---- 4. Fishs ----
    el('div', { class: 'api-panel', id: 'tab-fish' }, [
      section('鱼种一览', fishSection()),
    ]),

    // ---- 5. Rules ----
    el('div', { class: 'api-panel', id: 'tab-rules' }, [
      el('div', { class: 'rule-card rule-card-lead' }, [
        el('h3', { class: 'rule-card-title', text: DOC_OVERVIEW.title }),
        ...DOC_OVERVIEW.paragraphs.map(ruleParagraph),
      ]),
      el('div', { class: 'rule-cards' }, DOC_RULES.map(ruleSection)),
    ]),
  ];
}

/** Fish list: icon (mature sprite) + name/code header + compact stat tags + description. */
function fishSection(): HTMLElement {
  const fishList = el('div', { class: 'fish-list' });
  for (const entry of fishDocEntries()) {
    const cfg = Object.values(FISHES).find((c) => c.name === entry.name);
    const icon = el('img', { class: 'fish-icon', src: cfg ? fishIconDataUri(cfg.type, cfg.color) : '' });
    const codeName = entry.def.replace(/^代码名: `|`$/g, '');
    // Render each param ("label: value") as a compact stat tag instead of a bullet list.
    const tags = (entry.params ?? []).map((p) => {
      const m = p.match(/^([^:：]+?)\s*[:：]\s*(.+)$/);
      return el('span', { class: 'fish-tag' }, [
        el('span', { class: 'fish-tag-key', text: m ? m[1].trim() : p }),
        m ? el('span', { class: 'fish-tag-val', text: m[2].trim() }) : el('span'),
      ]);
    });
    const card = el('div', { class: 'fish-card' }, [
      icon,
      el('div', { class: 'fish-card-body' }, [
        el('div', { class: 'fish-card-head' }, [
          el('span', { class: 'fish-name', text: entry.name }),
          el('code', { class: 'fish-code', text: codeName }),
        ]),
        el('div', { class: 'fish-tags' }, tags),
        el('p', { class: 'fish-desc' }, [fmt(entry.desc)]),
      ]),
    ]);
    fishList.append(card);
  }
  return fishList;
}

/** Enable in-doc hyperlinks: activate the target tab first if its panel is hidden */
function wireDocLinks(root: HTMLElement, tabBar: HTMLElement | null, panels: HTMLElement[]): void {
  root.querySelectorAll<HTMLAnchorElement>('a.doc-link[data-ref]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(a.dataset.ref ?? '');
      if (!target) return;
      if (tabBar && panels.length > 0) {
        const panel = target.closest('.api-panel') as HTMLElement | null;
        const idx = panel ? panels.indexOf(panel) : -1;
        if (idx >= 0) {
          tabBar.querySelectorAll<HTMLButtonElement>('.api-tab').forEach((b, j) => {
            b.classList.toggle('active', j === idx);
            panels[j].style.display = j === idx ? '' : 'none';
          });
        }
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/** Full manual body (used by main menu modal, fully expanded) */
export function apiManualContent(): HTMLElement {
  const root = el('div', { class: 'manual' }, buildSections());
  wireDocLinks(root, null, []);
  return root;
}

/** For the right sidebar: tab-grouped API manual */
function apiManualTabs(): HTMLElement {
  const names = ['操作', '函数', '数据', '鱼种', '规则'];
  const panels = buildSections();
  const tabBar = el('div', { class: 'api-tabs' });
  const buttons: HTMLButtonElement[] = [];
  names.forEach((name, i) => {
    const b = el('button', { class: 'api-tab' + (i === 0 ? ' active' : ''), text: name });
    buttons.push(b);
    b.addEventListener('click', () => {
      buttons.forEach((x, j) => {
        x.classList.toggle('active', j === i);
        panels[j].style.display = j === i ? '' : 'none';
      });
    });
  });
  tabBar.append(...buttons);
  panels.forEach((p, i) => {
    if (i !== 0) p.style.display = 'none';
  });
  const root = el('div', { class: 'api-tabs-root' }, [tabBar, ...panels]);
  wireDocLinks(root, tabBar, panels);
  return root;
}

/** Mount right-hand API manual sidebar (collapsed by default, click icon to toggle) */
export function mountApiManual(): () => void {
  const sidebar = el('div', { class: 'api-sidebar' });
  const closeBtn = el('button', { class: 'btn btn-small', title: '关闭', onClick: () => setOpen(false) }, [icon('close', 14)]);
  const head = el('div', { class: 'api-sidebar-head' }, [el('h3', { text: '渔船 API 手册' }), closeBtn]);
  const body = el('div', { class: 'api-sidebar-body' }, [apiManualTabs()]);
  // Toggle icon is part of the sidebar (on its left edge): sticks to right screen edge when collapsed, moves with panel when open
  const toggle = el('button', { class: 'api-toggle', title: 'API 手册' }, [icon('book', 26)]);
  sidebar.append(toggle, head, body);
  document.body.append(sidebar);

  let open = false;
  function setOpen(v: boolean): void {
    open = v;
    sidebar.classList.toggle('open', v);
    toggle.classList.toggle('active', v);
  }
  toggle.addEventListener('click', () => setOpen(!open));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setOpen(false);
  });
  // Return control handle (for auto-expand on first visit)
  return () => setOpen(true);
}
