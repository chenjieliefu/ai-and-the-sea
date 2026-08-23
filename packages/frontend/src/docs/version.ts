// Version number and update log management.
// - Version number is always shown in the top title bar (small gray text)
// - On page load, check localStorage:
//   1. No version (first visit) -> auto-expand right-hand API manual
//   2. Older or unrecognized version -> show update log
//   3. Write current version number (for next comparison)
import { el, modal } from '../ui/ui';
import { GAME_VERSION } from '@aiyu/shared';

export const VERSION = GAME_VERSION;
export const VERSION_KEY = 'aiyu.version';

export interface UpdateEntry {
    version: string;
    title: string;
    items: string[];
}

/** Update log (from newest to oldest) */
export const UPDATE_LOG: UpdateEntry[] = [
    {
        version: '1.0.0',
        title: 'v1.0.0 · AI与海 首发',
        items: [
            '## 全新海洋养鱼游戏',
            '《AI与海》正式上线: 编写 TypeScript 控制渔船, 在海洋里养鱼、赚取金钱',
            '四种水域: 鱼塘 / 深水 / 浅滩 / 咸水, 各有不同的生长与投喂倍率',
            '渔船可投放鱼苗、投喂、捕捞、拦截、传送、充能, 支持单人养鱼与多人竞技',
            '## 十种鱼 (体型决定分数)',
            '小虾 / 沙丁鱼 / 河豚 / 水母 / 螃蟹 / 鲤鱼 / 带鱼 / 金枪鱼 / 鲨鱼 / 鲸鱼',
            '体型越大 → 鱼苗越贵、长得越慢、分数越高',
            '特殊鱼: 螃蟹会横走扩散、水母能净化水质、金枪鱼能改造水域、鲤鱼会带动水流',
            '## 界面',
            '深蓝海洋主题配色, 全新 Logo 与鱼形图标',
            '渔船 / 水域 / 鱼全部使用全新贴图',
            '## 玩法机制',
            '水质系统: 鱼塘拥有水质属性, 水质过低会浅滩化, 过高会咸水化',
            '偷鱼与拦截: 竞技模式下可在对方水域偷鱼, 对方可用拦截回收',
            '能量机制: 渔船充能后可执行行/列范围操作',
            '## 更多',
            '内置 API 手册、排行榜、对局回放与分享海报',
        ],
    },
];

function versionOf(v: string): string {
    const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
    return m ? `${m[1]}.${m[2]}.${m[3]}` : '';
}

function isKnownVersion(stored: string): boolean {
    const s = versionOf(stored);
    const cur = versionOf(VERSION);
    return s !== '' && s === cur;
}

/** Show update log modal */
export function showUpdateLog(): void {
    const body = el('div', { class: 'update-log' });
    for (const entry of UPDATE_LOG) {
        // One card per release, with a version header and grouped change items.
        const card = el('section', { class: 'update-card' }, [
            el('header', { class: 'update-card-head' }, [
                el('span', { class: 'update-version', text: entry.title }),
                ...(entry.version === VERSION ? [el('span', { class: 'update-badge', text: '当前版本' })] : []),
            ]),
            el('div', { class: 'update-card-body' }, buildGroups(entry.items)),
        ]);
        body.append(card);
    }
    modal('更新日志', body);
}

/** Build group headings + item lists from a release's flat item array. */
function buildGroups(items: string[]): HTMLElement[] {
    const nodes: HTMLElement[] = [];
    let list: HTMLElement | null = null;
    for (const item of items) {
        // Items starting with "## " act as group subheadings; a new list starts after each.
        if (item.startsWith('## ')) {
            nodes.push(el('div', { class: 'update-group', text: item.slice(3) }));
            list = el('ul', { class: 'update-items' });
            nodes.push(list);
        } else {
            if (!list) {
                list = el('ul', { class: 'update-items' });
                nodes.push(list);
            }
            list.append(el('li', { class: 'update-item', text: item }));
        }
    }
    return nodes;
}

/** Check version on page load (first visit auto-expands API manual, version change shows update log). */
export function checkVersionOnLoad(autoExpandManual: () => void): void {
    let stored: string | null = null;
    try {
        stored = localStorage.getItem(VERSION_KEY);
    } catch {
        // Silently skip when localStorage is unavailable (private mode, etc.)
    }
    if (stored === null) {
        // First visit: auto-expand right-hand API manual, also show update log
        autoExpandManual();
        showUpdateLog();
    } else if (!isKnownVersion(stored)) {
        // Older or unrecognized version: show update log
        showUpdateLog();
    }
    try {
        localStorage.setItem(VERSION_KEY, VERSION);
    } catch {
        // Ignore write failure
    }
}
