// 游戏 API 文档的单一事实来源 (shared)。
// 前端右侧手册与后端 MCP 服务器都从这里生成内容, 保证两边一致。
import { FISHES } from './registry';

export interface DocEntry {
    /** 条目锚点 id (供前端文档内跳转) */
    id: string;
    name: string;
    /** 定义/签名 */
    def: string;
    /** 正式文字描述 (支持 `反引号代码` 与 [text](#ref) 链接) */
    desc: string;
    /** 参数列表 (每项支持反引号) */
    params?: string[];
    /** 返回值说明 */
    returns?: string;
    example?: string;
}

export interface DocSection {
    id: string;
    title: string;
    entries: DocEntry[];
}

export const DOC_OPERATIONS: DocEntry[] = [
    {
        id: 'doc-Move',
        name: 'Move',
        def: 'class Move extends BoatOperation',
        desc: '使渔船在回合结束时移动到指定的相邻格。仅支持周围 8 格 (含斜向); 超出范围、目标越界或被其他渔船占据时操作无效并报错。',
        params: ['`to`: `[number, number]` — 目标坐标 (x, y)'],
        example: 'return new Move([2, 3]);',
    },
    {
        id: 'doc-Teleport',
        name: 'Teleport',
        def: 'class Teleport extends BoatOperation',
        desc: '传送到指定位置 (任意距离), 消耗 ceil(欧氏距离) 点能量; 传送失败 (目标越界 / 被占据) 时能量不退还。竞技模式只能从我方半场传送到我方半场。',
        params: ['`to`: `[number, number]` — 目标坐标 (x, y)'],
        example: 'return new Teleport([6, 3]);',
    },
    {
        id: 'doc-Stock',
        name: 'Stock',
        def: 'class Stock extends BoatOperation',
        desc: '在渔船当前所在格投放鱼苗, 立即扣除成本。目标格需为空且可养; 竞技模式下可在对方半场投放 (占用对方水域)。',
        params: ['`fish`: `FishType` — 鱼种类, 可用鱼见鱼种文档'],
        example: 'return new Stock(\'shrimp\');',
    },
    {
        id: 'doc-CollectFeed',
        name: 'CollectFeed',
        def: 'class CollectFeed extends BoatOperation',
        desc: '在深水区上取饲料, 一次取满 (上限 5 格)。不在深水区上或已满时操作无效。',
        example: 'return new CollectFeed();',
    },
    {
        id: 'doc-Feed',
        name: 'Feed',
        def: 'class Feed extends BoatOperation',
        desc: '给当前格的缺食鱼投喂, 消耗 1 格饲料, 鱼恢复生长。当前格没有缺食鱼或无饲料可用时操作无效。',
        example: 'return new Feed();',
    },
    {
        id: 'doc-FeedRow',
        name: 'FeedRow',
        def: 'class FeedRow extends BoatOperation',
        desc: '给以渔船为中心的行内 3 格鱼从左到右投喂, 直到饲料耗尽为止, 跳过不需要投喂的鱼, 消耗 3 能量。',
        example: 'return new FeedRow();',
    },
    {
        id: 'doc-StockRow',
        name: 'StockRow',
        def: 'class StockRow extends BoatOperation',
        desc: '在以渔船为中心的行内 3 格从左到右按 stocks 数组顺序投放, 跳过无法投放的格子 (水域不适配 / 已有鱼 / 金钱不足), 消耗 3 能量。',
        params: ['`stocks`: `FishType[]` — 鱼种类数组 (非空), 按顺序逐个投放'],
        example: "return new StockRow(['shrimp', 'sardine', 'shark']);",
    },
    {
        id: 'doc-StockCol',
        name: 'StockCol',
        def: 'class StockCol extends BoatOperation',
        desc: '在以渔船为中心的列内 3 格从上到下按 stocks 数组顺序投放, 跳过无法投放的格子 (水域不适配 / 已有鱼 / 金钱不足), 消耗 3 能量。',
        params: ['`stocks`: `FishType[]` — 鱼种类数组 (非空), 按顺序逐个投放'],
        example: "return new StockCol(['shrimp', 'shrimp']);",
    },
    {
        id: 'doc-FeedCol',
        name: 'FeedCol',
        def: 'class FeedCol extends BoatOperation',
        desc: '给所在列鱼从上到下投喂, 直到饲料耗尽为止, 跳过不需要投喂的鱼, 消耗 3 能量。',
        example: 'return new FeedCol();',
    },
    {
        id: 'doc-Catch',
        name: 'Catch',
        def: 'class Catch extends BoatOperation',
        desc: '捕捞当前格已成熟的鱼, 获得其价值。竞技模式下在对方半场捕捞会进入渔船临时资金池 (偷鱼)。',
        example: 'return new Catch();',
    },
    {
        id: 'doc-CatchRow',
        name: 'CatchRow',
        def: 'class CatchRow extends BoatOperation',
        desc: '一次性捕捞以渔船为中心的行内 3 格全部成熟鱼, 消耗 4 能量。竞技模式仅捕捞自己半场的鱼 (不产生偷鱼)。',
        example: 'return new CatchRow();',
    },
    {
        id: 'doc-CatchCol',
        name: 'CatchCol',
        def: 'class CatchCol extends BoatOperation',
        desc: '一次性捕捞以渔船为中心的列内 3 格全部成熟鱼, 消耗 4 能量。竞技模式仅捕捞自己半场的鱼 (不产生偷鱼)。',
        example: 'return new CatchCol();',
    },
    {
        id: 'doc-Clear',
        name: 'Clear',
        def: 'class Clear extends BoatOperation',
        desc: '放掉当前格鱼。竞技模式下仅限己方半场。',
        example: 'return new Clear();',
    },
    {
        id: 'doc-Intercept',
        name: 'Intercept',
        def: 'class Intercept extends BoatOperation',
        desc: '竞技模式专用: 指定一个拦截格, 若对方携带偷鱼资金的渔船在该回合结束时位于该格, 则其资金池清空并返还给你。',
        params: ['`at`: `[number, number]` — 拦截目标坐标 (x, y)'],
        example: 'return new Intercept([5, 3]);',
    },
    {
        id: 'doc-InterceptRow',
        name: 'InterceptRow',
        def: 'class InterceptRow extends BoatOperation',
        desc: '竞技模式专用: 回合结束时拦截以施法点为中心的行内 3 格中全部携带偷鱼资金的对方渔船, 消耗 6 能量。',
        example: 'return new InterceptRow();',
    },
    {
        id: 'doc-InterceptCol',
        name: 'InterceptCol',
        def: 'class InterceptCol extends BoatOperation',
        desc: '竞技模式专用: 回合结束时拦截以施法点为中心的列内 3 格中全部携带偷鱼资金的对方渔船, 消耗 6 能量。',
        example: 'return new InterceptCol();',
    },
    {
        id: 'doc-NewBoat',
        name: 'NewBoat',
        def: 'class NewBoat extends BoatOperation',
        desc: '花费 4000 金钱在指定位置创建一艘新的渔船 (该渔船下一回合开始执行代码)。前提: 金钱足够 / 渔船数量未达上限 (单人 2 / 竞技 3, 见 getGame().boatLimit) / 指定位置没有渔船。',
        params: ['`at`: `[number, number]` — 创建位置坐标 (x, y)'],
        example: 'return new NewBoat([6, 3]);',
    },
    {
        id: 'doc-Charge',
        name: 'Charge',
        def: 'class Charge extends BoatOperation',
        desc: '充能: 本回合原地不动, 能量 +5 (上限 10)。能量用于行/列范围操作。',
        example: 'return new Charge();',
    },
    {
        id: 'doc-ChangeTile',
        name: 'ChangeTile',
        def: 'class ChangeTile extends BoatOperation',
        desc: '将脚下水域转换为指定类型 (pond / deep / shoal), 消耗 3 能量; 转为鱼塘时水质为 0。前提: 上下左右必须有至少一个与目标类型相同的水域, 不允许凭空创造; 有鱼的水域不能转换。',
        params: ['`tileType`: `\'pond\' | \'deep\' | \'shoal\'` — 目标水域类型'],
        example: 'return new ChangeTile(\'deep\');',
    },
    {
        id: 'doc-Purify',
        name: 'Purify',
        def: 'class Purify extends BoatOperation',
        desc: '给脚下鱼塘改善水质 (水质 +3), 消耗 3 能量; 若不是鱼塘则失败且不扣能量。',
        params: [],
        example: 'return new Purify();',
    },
    {
        id: 'doc-PurifyRow',
        name: 'PurifyRow',
        def: 'class PurifyRow extends BoatOperation',
        desc: '给以自己为中心的行 3 格内鱼塘改善水质 (水质 +3), 非鱼塘格子跳过 (不返还能量), 消耗 8 能量。',
        params: [],
        example: 'return new PurifyRow();',
    },
    {
        id: 'doc-PurifyCol',
        name: 'PurifyCol',
        def: 'class PurifyCol extends BoatOperation',
        desc: '给以自己为中心的列 3 格内鱼塘改善水质 (水质 +3), 非鱼塘格子跳过 (不返还能量), 消耗 8 能量。',
        params: [],
        example: 'return new PurifyCol();',
    },
];

export const DOC_FUNCTIONS: DocEntry[] = [
    {
        id: 'doc-getSelf',
        name: 'getSelf()',
        def: 'getSelf(): BoatInfo',
        desc: '返回当前由 `run(boatId)` 控制的渔船信息, 包括本地编号、位置、饲料量与归属。',
        returns: '`BoatInfo` — 字段说明见 [BoatInfo](#doc-BoatInfo)',
        example: 'const self = getSelf();\nif (self.feed === 0) return new CollectFeed();',
    },
    {
        id: 'doc-getGame',
        name: 'getGame()',
        def: 'getGame(): GameInfo',
        desc: '返回游戏模式、当前回合、总回合数与自己的金钱, 用于编写策略分支。',
        returns: '`GameInfo` — 字段说明见 [GameInfo](#doc-GameInfo)',
        example: 'const g = getGame();\nif (g.turn === 1) return new Stock(\'shrimp\');',
    },
    {
        id: 'doc-getMap',
        name: 'getMap()',
        def: 'getMap(): { width: number; height: number }',
        desc: '返回地图尺寸, 用于坐标越界判断。',
        example: 'const m = getMap();\nif (x < m.width) ...',
    },
    {
        id: 'doc-getTile',
        name: 'getTile([x, y])',
        def: 'getTile(position: Position): TileInfo | null',
        desc: '返回指定格的水域信息 (鱼塘/深水、是否有鱼及鱼详情)。坐标越界返回 `null`。',
        params: ['`position`: `[number, number]` — 格子的坐标 (x, y)'],
        returns: '`TileInfo | null` — 字段说明见 [TileInfo](#doc-TileInfo)',
        example: 'const t = getTile([1, 1]);\nif (t?.type === \'deep\') return new CollectFeed();',
    },
    {
        id: 'doc-getFish',
        name: 'getFish([x, y])',
        def: 'getFish(position: Position): FishInfo | null',
        desc: '返回指定格的鱼信息; 无鱼或越界返回 `null`。',
        params: ['`position`: `[number, number]` — 格子的坐标 (x, y)'],
        returns: '`FishInfo | null` — 字段说明见 [FishInfo](#doc-FishInfo)',
        example: 'const c = getFish([3, 3]);\nif (c?.state === \'grown\') return new Catch();',
    },
    {
        id: 'doc-getBoat',
        name: 'getBoat([x, y])',
        def: 'getBoat(position: Position): BoatInfo | null',
        desc: '返回指定格上的渔船信息 (含对方渔船), 用于侦察与避让。',
        params: ['`position`: `[number, number]` — 格子的坐标 (x, y)'],
        returns: '`BoatInfo | null` — 字段说明见 [BoatInfo](#doc-BoatInfo)',
        example: 'const d = getBoat([2, 2]);\nif (d) return null; // 被占, 本回合不动',
    },
    {
        id: 'doc-console',
        name: 'console.log(...)',
        def: 'console.log(...args: unknown[]): void',
        desc: '输出日志到界面日志面板, 用于调试; 每回合日志有数量上限。',
        params: ['`...args`: `unknown[]` — 任意个数的输出值'],
        example: 'console.log(\'money\', getGame().money);',
    },
];

/** FishType 枚举条目 (数据来自注册表, 新增鱼自动列出) */
function fishTypeDocEntry(): DocEntry {
    return {
        id: 'doc-FishType',
        name: 'FishType',
        def: 'enum FishType',
        desc: '鱼种类枚举, 作为 `Stock` 的参数与 `FishInfo.type` 的值。完整属性见鱼种文档。',
        params: Object.values(FISHES).map(
            (c) =>
                `\`${c.type}\`: ${c.name} — 成本 ${c.stockCost}, 分数 ${c.value}, ` +
                `${c.growCyclesBase} 回合长大, ${c.hungerCountBase === 0 ? '无需投喂' : `总投喂 ${c.hungerCountBase} 次`}`
        ),
    };
}

export const DOC_TYPES: DocEntry[] = [
    {
        id: 'doc-BoatInfo',
        name: 'BoatInfo',
        def: 'interface BoatInfo',
        desc: '渔船的运行时信息。`id` 为本地编号 (自己的渔船 0..N-1); `isOpponent` 区分敌我; `bounty` 为对方渔船携带的偷鱼资金。',
        params: [
            '`id`: `number` — 本地渔船编号',
            '`position`: `[number, number]` — 当前坐标',
            '`feed`: `number` — 饲料量 (0..5)',
            '`energy`: `number` — 能量 (0..10, 经 Charge 补充, 供行/列范围操作消耗)',
            '`isOpponent`: `boolean` — 是否为对方渔船',
            '`bounty`: `number` — 偷鱼资金池 (仅对方渔船有意义)',
        ],
    },
    {
        id: 'doc-TileInfo',
        name: 'TileInfo',
        def: 'interface TileInfo',
        desc: '水域信息: `type` 为鱼塘/深水/浅滩, `fish` 为该格鱼 (无鱼时为 `null`)。',
        params: [
            '`type`: `\'pond\' | \'deep\' | \'shoal\' | \'brine\'` — 水域类型 (浅滩上生长周期 ×3)',
            '`hasFish`: `boolean` — 是否有鱼',
            '`fish`: `FishInfo | null` — 鱼信息',
        ],
    },
    fishTypeDocEntry(),
    {
        id: 'doc-FishState',
        name: 'FishState',
        def: 'enum FishState',
        desc: '鱼状态: `growing` 生长中 / `hungry` 缺食 (不投喂则长期保持, 生长暂停, 不死亡) / `grown` 成熟可捕捞。',
        params: [
            '`growing`: 正在生长, `cyclesToGrown` 为剩余回合数',
            '`hungry`: 缺食, `cyclesToGrown` 为暂停时的剩余回合数, 投喂后继续生长',
            '`grown`: 成熟, 可捕捞',
        ],
    },
    {
        id: 'doc-FishInfo',
        name: 'FishInfo',
        def: 'interface FishInfo',
        desc: '鱼信息: `state` 为生长/缺食/成熟; `cyclesToGrown` 为剩余回合数 (成熟时为 0)。',
        params: [
            '`type`: `FishType` — 鱼种类, 见 [FishType](#doc-FishType)',
            '`state`: `\'growing\' | \'hungry\' | \'grown\'` — 鱼状态, 见 [FishState](#doc-FishState)',
            '`cyclesToGrown`: `number` — 剩余成熟回合数 (grown 为 0)',
        ],
    },
    {
        id: 'doc-GameInfo',
        name: 'GameInfo',
        def: 'interface GameInfo',
        desc: '对局全局信息: `mode` 为单人或竞技, `money` 为自己的金钱。',
        params: [
            '`mode`: `\'single\' | \'combat\'` — 游戏模式',
            '`turn`: `number` — 当前回合',
            '`maxTurns`: `number` — 总回合数',
            '`money`: `number` — 自己的金钱 (初始 20)',
        ],
    },
];

/** 鱼种图鉴条目 (数据来自注册表, 供前端手册与 MCP 共用) */
export function fishDocEntries(): DocEntry[] {
    return Object.values(FISHES).map((cfg) => ({
        id: `fish-${cfg.type}`,
        name: cfg.name,
        def: `代码名: \`${cfg.type}\``,
        desc: cfg.description,
        params: [
            `鱼苗成本: ${cfg.stockCost}`,
            `分数 (卖价): ${cfg.value}`,
            `长大: ${cfg.growCyclesBase} 回合`,
            cfg.hungerCountBase === 0 ? '投喂: 无需投喂' : `投喂: ${cfg.hungerCountBase} 次`,
            `可养在: ${cfg.canStockDesc}`,
            // 水质消耗: 0 不显示; 负数 = 恢复水质
            cfg.qualityCost === 0
                ? null
                : cfg.qualityCost < 0
                    ? `水质: 恢复 ${-cfg.qualityCost}`
                    : `水质: 消耗 ${cfg.qualityCost}`,
        ].filter((p): p is string => p !== null),
    }));
}

export interface DocParagraphSection {
    title: string;
    paragraphs: string[];
}

/** 规则/机制说明 (Markdown 段落) */
export const DOC_RULES: DocParagraphSection[] = [
    {
        title: '回合制',
        paragraphs: [
            '游戏按照 [回合] 推进。每一回合, 所有场上的渔船同时执行自己的代码, 返回本回合自己执行的操作。',
            '代码的执行时间被限制在 **0.4s** 内, 若执行超过 **0.4s**, 则该渔船会因超时而跳过回合。',
            '如果两艘渔船的操作有冲突 (例如, 尝试移动到同一个格子上), 则代码执行时间更短的渔船抢占, 另一个渔船跳过回合。',
            '目前，游戏模式限制了总运行回合数，你需要在游戏结束时，取得尽可能多的金钱。',
        ],
    },
    {
        title: '渔船',
        paragraphs: [
            '渔船是玩家通过编程控制的 **主要单位**。场上同时可存在**多个**渔船。',
            '渔船通过 **API函数** 访问当前游戏内的各个信息, 包括 **水域，鱼，其他渔船，回合数，金钱** 等, 具体请查询 **API函数** 章节',
            '渔船在 `run` 函数返回 **操作**, 来决定本回合自己执行的动作，具体请查询 **操作** 章节'
        ]
    },
    {
        title: '鱼',
        paragraphs: [
            '鱼有 **生长中 / 缺食 / 成熟** 三种状态，一般而言会经过 [生长 → 多次缺食 → 多次被投喂 → 成熟] 的过程。',
            '鱼缺食时, 会在右上角显示 💧 图标，**生长将会停滞**。',
            '一种鱼在生长中，需要投喂的次数是**固定**的，且均匀地分布在鱼生长的整个阶段。',
            '当前版本存在如下特殊机制',
            '浅滩化:',
            '捕捞鱼时, 若该鱼周围存在浅滩, 则该格也转化为浅滩 (仅蚕食鱼塘, 不影响深水)。',
            '间作: ',
            '若鱼的四方向邻格至少有 2 个不同于自己种类的鱼, 捕捞收益 +20%。',
        ],
    },
    {
        title: '水域',
        paragraphs: [
            '当前版本存在 4 种水域 - **鱼塘，深水，浅滩，咸水**',
            '鱼塘:',
            '基础水域，能养绝大多数鱼',
            '深水:',
            '深水水域，渔船可在上方补给饲料。部分深水鱼可以在上面养',
            '浅滩:',
            '营养较少的水域, 部分鱼无法养; 在上面养的鱼, 生长周期为正常的 3 倍',
            '咸水:',
            '营养过多而不适宜养的水域，部分鱼无法养; 在上面养的鱼, 生长周期为正常的 1.5 倍，投喂次数为正常的 2 倍',
        ],
    },
    {
        title: '投喂机制',
        paragraphs: [
            '鱼会在生长的特定阶段需求投喂。如果没有投喂，则鱼停止生长。',
            '鱼的缺食时机是 **随机的**，最佳实践是通过游戏内 API 动态判定是否需要投喂。',
            '渔船拥有饲料储存能力，储料上限为 5, 初始为 0。',
            '获取: ',
            '当位于 *深水* 上时，渔船可执行 `CollectFeed` 操作，获得 5 格饲料。',
            '使用: ',
            '当位于 *缺食鱼* 上时，渔船可通过 `Feed` 系操作，消耗 1 格饲料，使鱼恢复生长。'
        ],
    },
    {
        title: '能量机制',
        paragraphs: [
            '渔船拥有能量 (上限 10, 初始 0)。能量多用于执行一些 **特殊的渔船操作**。',
            '获取: ',
            '渔船可执行 `Charge` 操作获得 5 点能量。',
            '使用: ',
            '渔船可消耗能量，执行',
            '- **单回合对多水域执行操作**。例如, `CatchRow` 操作会捕捞以渔船为中心，横向 3 格的成熟鱼。',
            '- **特殊操作**。例如, `Teleport` 操作允许渔船无视距离传送到指定位置',
            '合理利用能量，能 **批量投放鱼苗以取得更高收益**'
        ],
    },
    {
        title: '水质机制',
        paragraphs: [
            '**鱼塘** 水域现在拥有 "水质" 属性。游戏开始时，地图中的鱼塘水质均为 5',
            '渔船: ',
            '渔船可执行 `Purify` 等操作对鱼塘主动改善水质，该操作会消耗能量。',
            '鱼: ',
            '- 多数鱼会消耗水质, 如鲨鱼、鲸鱼等。',
            '- 少数鱼会给水域增加水质, 如水母、螃蟹等。',
            '转化: ',
            '鱼塘的水质上限为 10。',
            '- 若鱼塘水质下降至 0 以下, 则鱼塘转化为浅滩。',
            '- 若鱼塘水质提升至 10 以上, 则鱼塘转化为咸水。',
        ],
    },
    {
        title: '单人养鱼模式',
        paragraphs: [
            '在该模式下，你初始获得 1 艘渔船和一个固定的地图。你需要通过编程, 在 **500 个回合** 内尽可能多地养鱼赚取金钱。',
            '地图固定，尺寸为 7 x 7.',
        ],
    },
    {
        title: '多人竞技模式',
        paragraphs: [
            '在该模式下，你初始获得 2 艘渔船和一个对称的固定地图。',
            '除了尽可能挣得更多金钱，你还可以悄悄光顾对方的水域，捞走其养的鱼; 亦或是投放鱼苗，干扰对方的运营体系。',
            '但对方并非赤手空拳, **"拦截"** 操作会将你的非法所得悉数回收。',
            '地图固定，尺寸为 14 x 7, 两侧地图对称。你所在的半边区域为 **己方半场**, 另一半为 **对方半场**, 部分机制只能在特定场地发挥效果。',
        ],
    }
];

export const DOC_OVERVIEW: DocParagraphSection = {
    title: '游戏概览',
    paragraphs: [
        '`AI与海` 是一个以 **玩家编程** 为核心的海洋养鱼游戏。',
        '你需要编写 `Typescript` 控制渔船，在限定的场地和回合数内，通过合理投放鱼苗、养鱼，并利用鱼类的布局与特殊性质来实现最大化收益。',
    ],
};

// ---------------------------------------------------------------------------
// Markdown 渲染 (MCP / AI 使用)
// ---------------------------------------------------------------------------

function plain(text: string): string {
    // 去掉文档内锚点链接, 保留反引号
    return text.replace(/\[([^\]]*)\]\(#[^)]*\)/g, '$1');
}

function entryMarkdown(e: DocEntry, heading: string): string {
    const lines: string[] = [];
    lines.push(`${heading} ${e.name}`);
    lines.push('');
    lines.push(`- 定义: \`${e.def}\``);
    lines.push(`- 描述: ${plain(e.desc)}`);
    if (e.params) {
        for (const p of e.params) lines.push(`- 参数: ${plain(p)}`);
    }
    if (e.returns) lines.push(`- 返回: ${plain(e.returns)}`);
    if (e.example) {
        lines.push('  示例:');
        lines.push('  ```typescript');
        lines.push(...e.example.split('\n').map((l) => '  ' + l));
        lines.push('  ```');
    }
    lines.push('');
    return lines.join('\n');
}

export function sectionMarkdown(section: string): string {
    const out: string[] = [];
    switch (section) {
        case 'overview':
            out.push(`# ${DOC_OVERVIEW.title}`, '');
            out.push(...DOC_OVERVIEW.paragraphs.map((p) => plain(p)), '');
            break;
        case 'operations':
            out.push('# 渔船操作', '');
            out.push('所有操作继承自 `BoatOperation`, 引擎按类名识别; `run()` 返回 null 表示本回合不动。', '');
            for (const e of DOC_OPERATIONS) out.push(entryMarkdown(e, '##'));
            break;
        case 'functions':
            out.push('# API 函数', '');
            for (const e of DOC_FUNCTIONS) out.push(entryMarkdown(e, '##'));
            break;
        case 'types':
            out.push('# 数据类型', '');
            for (const e of DOC_TYPES) out.push(entryMarkdown(e, '##'));
            break;
        case 'fish':
            out.push('# 鱼种一览', '');
            for (const e of fishDocEntries()) out.push(entryMarkdown(e, '##'));
            break;
        case 'rules':
            out.push('# 规则', '');
            for (const s of DOC_RULES) {
                out.push(`## ${s.title}`, '');
                out.push(...s.paragraphs.map((p) => plain(p)), '');
            }
            break;
        case 'all':
            out.push(sectionMarkdown('overview'));
            out.push(sectionMarkdown('operations'));
            out.push(sectionMarkdown('functions'));
            out.push(sectionMarkdown('types'));
            out.push(sectionMarkdown('fish'));
            out.push(sectionMarkdown('rules'));
            break;
        default:
            throw new Error(`未知文档章节: ${section}`);
    }
    return out.join('\n');
}

/** 可用的文档章节 id */
export const DOC_SECTIONS = ['overview', 'operations', 'functions', 'types', 'fish', 'rules', 'all'] as const;
export type DocSectionId = (typeof DOC_SECTIONS)[number];
