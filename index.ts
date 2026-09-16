/**
 * hydro-admin-style
 *  1. 前端样式（frontend/admin-style.page.ts）：隐藏 SU / LV 标签，SU 用户名紫色
 *  2. 让 uid 1（默认超管）参与排名：
 *     - 排行榜页 /ranking 和首页排行不再过滤 uid 1
 *     - 重算 RP 时 uid 1 也分配名次和等级（LV）
 *
 * Hydro 原版在三处写死排除 uid 0/1：DomainRankHandler、HomeHandler.getRanking、script/rating.ts 的 calcLevel。
 * 这里分别覆盖。适配 Hydro v5.0.x。
 */
import {
    Context, db, DomainModel, PERM, PRIV, Schema, STATUS, UserModel,
} from 'hydrooj';

// 只排除游客（uid 0），其余全部参与
const RANK_FILTER = { uid: { $gt: 0 }, rp: { $gt: 0 } };

// ---------- 1. 排行榜页 & 首页排行 ----------

function patchHandlers(ctx: Context) {
    ctx.withHandlerClass('DomainRankHandler', (H: any) => {
        // 原版 get 带 @query 装饰器，装饰器把参数对象解析后再传入；
        // 直接替换 prototype.get 会绕过装饰器，所以这里自己从 args 里取
        H.prototype.get = async function get(args: any) {
            const domainId: string = args?.domainId ?? this.args.domainId;
            const page = Math.max(1, parseInt(args?.page ?? this.args.page, 10) || 1);
            const [dudocs, upcount, ucount] = await this.paginate(
                DomainModel.getMultiUserInDomain(domainId, { ...RANK_FILTER, join: true }).sort({ rp: -1 }),
                page,
                'ranking',
            );
            const udict = await UserModel.getList(domainId, dudocs.map((d) => d.uid));
            const udocs = dudocs.map((i) => udict[i.uid]);
            this.response.template = 'ranking.html';
            this.response.body = {
                udocs, upcount, ucount, page,
            };
        };
    });

    ctx.withHandlerClass('HomeHandler', (H: any) => {
        H.prototype.getRanking = async function getRanking(domainId: string, limit = 50) {
            if (!this.user.hasPerm(PERM.PERM_VIEW_RANKING)) return [];
            const dudocs = await DomainModel.getMultiUserInDomain(domainId, RANK_FILTER)
                .sort({ rp: -1 }).project({ uid: 1 }).limit(limit).toArray();
            const uids = dudocs.map((d) => d.uid);
            this.collectUser(uids);
            return uids;
        };
    });
}

// ---------- 2. RP 脚本：名次 / 等级计算包含 uid 1 ----------
// 以下逻辑复制自 hydrooj/src/script/rating.ts，只改了 calcLevel 里的 uid 过滤条件。

type Report = (data: any) => void;

function Counter(): Record<string, number> {
    return new Proxy({}, { get: (self, key) => self[key] || 0 }) as any;
}

async function calcLevel(domainId: string, report: Report) {
    await DomainModel.setMultiUserInDomain(domainId, {}, { level: 0, rank: null });
    let last: any = { rp: null };
    let rank = 0;
    let count = 0;
    const coll = db.collection('domain.user');
    // 原版：uid: { $nin: [0, 1], $gt: -1000 }
    const filter = { rp: { $gt: 0 }, uid: { $nin: [0], $gt: -1000 } };
    const ducur = DomainModel.getMultiUserInDomain(domainId, filter)
        .project({ rp: 1 })
        .sort({ rp: -1 });
    let bulk = coll.initializeUnorderedBulkOp();
    for await (const dudoc of ducur) {
        count++;
        dudoc.rp ||= null;
        if (dudoc.rp !== last.rp) rank = count;
        bulk.find({ _id: dudoc._id }).updateOne({ $set: { rank } });
        last = dudoc;
        if (count % 100 === 0) report({ message: `#${count}: Rank ${rank}` });
    }
    if (!count) return;
    await bulk.execute();
    const levels: number[] = global.Hydro.model.builtin.LEVELS;
    bulk = coll.initializeUnorderedBulkOp();
    for (let i = 0; i < levels.length; i++) {
        const query: any = {
            domainId,
            $and: [{ rank: { $lte: (levels[i] * count) / 100 } }],
        };
        if (i < levels.length - 1) query.$and.push({ rank: { $gt: (levels[i + 1] * count) / 100 } });
        bulk.find(query).update({ $set: { level: i } });
    }
    await bulk.execute();
}

async function runInDomain(domainId: string, report: Report) {
    const RpTypes = global.Hydro.model.rp; // 原版 rating.ts 挂到全局的各类 RP 计算器，直接复用
    const results: Record<string, Record<string, number>> = {};
    const udict = Counter();
    await db.collection('domain.user').updateMany({ domainId }, { $set: { rpInfo: {} } });
    for (const type in RpTypes) {
        results[type] = new Proxy({}, { get: (self, key) => self[key] || RpTypes[type].base });
        await RpTypes[type].run([domainId], results[type], report);
        const bulk = db.collection('domain.user').initializeUnorderedBulkOp();
        for (const uid in results[type]) {
            const udoc = await UserModel.getById(domainId, +uid);
            if (!udoc?.hasPriv(PRIV.PRIV_USER_PROFILE)) continue;
            bulk.find({ domainId, uid: +uid }).updateOne({ $set: { [`rpInfo.${type}`]: results[type][uid] } });
            udict[+uid] += results[type][uid];
        }
        if (bulk.batches.length) await bulk.execute();
    }
    await DomainModel.setMultiUserInDomain(domainId, {}, { rp: 0 });
    const bulk = db.collection('domain.user').initializeUnorderedBulkOp();
    for (const uid in udict) {
        bulk.find({ domainId, uid: +uid }).upsert().update({ $set: { rp: Math.max(0, udict[uid]) } });
    }
    if (bulk.batches.length) await bulk.execute();
    await calcLevel(domainId, report);
}

async function run({ domainId }: { domainId?: string }, report: Report) {
    if (!domainId) {
        const domains = await DomainModel.getMulti().toArray();
        await report({ message: `Found ${domains.length} domains` });
        for (const i in domains) {
            const start = Date.now();
            await runInDomain(domains[i]._id, report);
            await report({
                case: {
                    status: STATUS.STATUS_ACCEPTED,
                    message: `Domain ${domains[i]._id} finished`,
                    time: Date.now() - start,
                    memory: 0,
                    score: 0,
                },
                progress: Math.floor(((+i + 1) / domains.length) * 100),
            });
        }
    } else await runInDomain(domainId, report);
    return true;
}

function patchScript(ctx: Context) {
    const original = global.Hydro.script.rp;
    delete global.Hydro.script.rp;
    ctx.addScript(
        'rp', 'Calculate rp of a domain, or all domains (uid 1 included in ranking)',
        Schema.object({ domainId: Schema.string() }), run,
    );
    // 插件卸载时恢复原版脚本
    ctx.on('dispose', () => {
        if (original && !global.Hydro.script.rp) global.Hydro.script.rp = original;
    });
}

export function apply(ctx: Context) {
    patchHandlers(ctx);
    // Hydro 先加载插件、后加载内置脚本（见 src/entry/worker.ts），
    // 所以要等 app/started 之后再替换 rp 脚本，否则会被内置的覆盖/报重复注册
    ctx.on('app/started', () => patchScript(ctx));
}
