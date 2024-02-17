// ==UserScript==
// @name         [Bilibili] 关注管理器
// @namespace    ckylin-bilibili-foman
// @version      0.2.22
// @description  快速排序和筛选你的关注列表，一键取关不再关注的UP等
// @author       CKylinMC
// @updateURL    https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-bilibili-unfollow.user.js
// @supportURL   https://github.com/CKylinMC/UserJS
// @require      https://greasyfork.org/scripts/429720-cktools/code/CKTools.js?version=1034581
// @require      https://update.greasyfork.org/scripts/470305/1216506/md5-func.js
// @include      http://space.bilibili.com/*
// @include      https://space.bilibili.com/*
// @connect      api.bilibili.com
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceText
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_removeValue
// @grant        unsafeWindow
// @license      GPL-3.0-only
// @compatible   chrome 80+
// @compatible   firefox 74+
// ==/UserScript==
;(function () {
    'use strict';
    const s = {
        get(key, def) {
            const val = GM_getValue(key);
            if (typeof (val) == 'undefined' || val === null) return def;
            return val;
        },
        set(key, val) {
            GM_setValue(key, val);
        },
        del(key) {
            if (typeof (GM_removeValue) == 'function') GM_removeValue(key);
            else GM_setValue(key, undefined);
        }
    };
    const datas = {
        status: 0,
        total: 0,
        fetched: 0,
        pages: 0,
        followings: [],
        mappings: {},
        dommappings: {},
        checked: [],
        tags: {},
        self: 0,
        isSelf: false,
        currUid: 0,
        fetchstat: "OK",
        currInfo: {
            black: -1,
            follower: -1,
            following: -1,
            mid: -1,
            whisper: -1,
        },
        preventUserCard: false,
        settings: {
            get autoExtendInfo() {
                return s.get('autoExtendInfo', true);
            },
            set autoExtendInfo(val) {
                s.set('autoExtendInfo', val);
            },
            get lazyRenderForList() {
                return s.get('lazyRenderForList', true);
            },
            set lazyRenderForList(val) {
                s.set('lazyRenderForList', val);
            },
            get batchOperationDelay() {
                return s.get('batchOperationDelay', .5);
            },
            set batchOperationDelay(val) {
                s.set('batchOperationDelay', val);
            },
            get enableExpermentals() {
                return s.get('enableExpermentals', false);
            },
            set enableExpermentals(val) {
                return s.set('enableExpermentals', val);
            },
        }
    };
    const cfg = {
        debug: !false,
        retrial: 3,
        enableNewModules: false,
        VERSION: "0.2.22",
        infobarTemplate: () => `共读取 ${datas.fetched} 条关注`,
        titleTemplate: () => `<h1>关注管理器 FoMan <small>v${cfg.VERSION} ${cfg.debug ? "debug" : ""}</small> ${datas.settings.enableExpermentals ? "!" : ""}</h1>`,

        // Turn this on will abort all alerts.
        I_KNOW_WHAT_IM_DOING: false
    }
    const get = q => document.querySelector(q);
    const getAll = q => document.querySelectorAll(q);
    const wait = t => new Promise(r => setTimeout(r, t));
    const batchDelay = async () => await wait(datas.settings.batchOperationDelay * 1000);
    const log = (...m) => cfg.debug && console.warn('[FoMan]', ...m);
    const mdi = (name, asHTML = true, px = '10', extras = []) => {
        const i = CKTools.domHelper('i', {
            classnames: ['mdi', `mdi-${name}`, `mdi-${px}px`, ...extras],
            text: ' '
        });
        return asHTML ? i.outerHTML : i;
    };
    const getSelfId = async () => {
        let stat = unsafeWindow.UserStatus;
        let retrial = 20;
        while (stat === null || stat === undefined) {
            if (--retrial < 0) return 0;
            log("Waiting for userstatus...")
            await wait(200);
        }
        if (!stat.userInfo.isLogin) {
            log("NOT LOGIN");
            return -1
        }
        log("User:", stat.userInfo.mid, stat.userInfo);
        return stat.userInfo.mid;
    };
    async function copy(txt = '') {
        try {
            await navigator.clipboard.writeText(txt);
            return true;
        } catch (e) {
            return false;
        }
    }
    function download(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }
    const makeDom = async (domname, func = () => {
    }) => {
        if (CKTools.domHelper) return CKTools.domHelper(domname, func);
        const d = document.createElement(domname);
        if (typeof (func) == 'function') func.constructor.name == 'AsyncFunction' ? await func(d) : func(d);
        return d;
    };
    const isHardCoreMember = d => d.is_senior_member === 1;
    const isFans = d => d.attribute === 6;
    const isWhisper = d => d.attribute === 1;
    const isNearly = d => {
        const nearly = (new Date).getTime() - (60 * 60 * 24 * 7 * 4 * 3 * 1000);
        return parseInt(d + "000") > nearly;
    }
    const isLongAgo = (d) => {
        const loneAgo = (new Date).getTime() - (60 * 60 * 24 * 7 * 4 * 12 * 2 * 1000);
        return parseInt(d + "000") < loneAgo;
    }
    /* StackOverflow 10730362 */
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
    const getCSRFToken = () => getCookie("bili_jct");
    const getBgColor = () => {/*兼容blbl进化的夜间模式*/
        try {
            let color = getComputedStyle(document.body).backgroundColor;
            if (color === "rgba(0, 0, 0, 0)") return "white";
            else return color;
        } catch (e) {
            return "white"
        }
    }

    const getCurrentUid = async () => {
        setInfoBar("正在查询当前用户UID");
        let paths = location.pathname.split('/');
        if (paths.length > 1) {
            return paths[1];
        } else throw "Failed to get current ID";
    };
    const getHeaders = () => {
        return {
            "user-agent": unsafeWindow.navigator.userAgent,
            "cookie": unsafeWindow.document.cookie.split('; ').map(it => it.split("=")).map(it => it.map(i => i.match(/[^\x00-\x7F]/gm) ? encodeURIComponent(i) : i)).map(it => it.join("=")).join(", "),
            "origin": "space.bilibili.com",
            "referer": "https://www.bilibili.com/"
        }
    };
    const getUInfoURL = () => `https://api.bilibili.com/x/space/wbi/acc/info`;//wbi,mid
    const getGroupURL = () => `https://api.bilibili.com/x/relation/tags`;
    const getWhispersURL = (pn, ps = 50) => `https://api.bilibili.com/x/relation/whispers?pn=${pn}&ps=${ps}&order=desc&order_type=attention`;// removed
    const getFetchURL = (uid, pn) => `https://api.bilibili.com/x/relation/followings?vmid=${uid}&pn=${pn}&ps=50&order=desc&order_type=attention`;
    const getUnfolURL = () => `https://api.bilibili.com/x/relation/modify`;
    const getFollowURL = () => `https://api.bilibili.com/x/relation/batch/modify`;
    const getLatestVidURL = () => `https://api.bilibili.com/x/space/wbi/arc/search`;//wbi,?mid=${uid}&ps=1&pn=1`;
    const getSubInfoURL = uid => `https://api.bilibili.com/x/relation/stat?vmid=${uid}`;
    const getCreateGroupURL = () => `https://api.bilibili.com/x/relation/tag/create`;
    const getRenameGroupURL = () => `https://api.bilibili.com/x/relation/tag/update`;
    const getRemoveGroupURL = () => `https://api.bilibili.com/x/relation/tag/del`;
    const getMoveToGroupURL = () => `https://api.bilibili.com/x/relation/tags/addUsers`;
    const getCopyToGroupURL = () => `https://api.bilibili.com/x/relation/tags/copyUsers`;
    const getDynamicURL = (selfid, hostid) => `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?visitor_uid=${selfid}&host_uid=${hostid}&offset_dynamic_id=0&need_top=1&platform=web`;
    const getRequest = path => new Request(path, {
        method: 'GET',
        headers: getHeaders(),
        credentials: "include"
    });
    const getPostRequest = (path, body = null) => new Request(path, {
        method: 'POST',
        headers: getHeaders(),
        credentials: "include",
        body
    });
    const cacheGroupList = async () => {
        setInfoBar("正在获取分组信息...");
        try {
            const jsonData = await (await fetch(getRequest(getGroupURL()))).json();
            if (jsonData && jsonData.code === 0) {
                datas.tags = [];
                for (let tag of jsonData.data) {
                    datas.tags[tag.tagid] = tag;
                }
                return true;
            } else {
                log(jsonData);
                return false;
            }
        } catch (err) {
            log(err);
            return false;
        }
    };
    const createGroup = async (tagname) => {
        setInfoBar(`正在创建新的分组"${tagname}"...`);
        try {
            const jsonData = await (await fetch(
                getPostRequest(getCreateGroupURL(),
                    new URLSearchParams({
                        tag: tagname,
                        csrf: getCSRFToken()
                    }))));
            if (jsonData.code === 0) return true;
            else throw new Error(jsonData.message);
        } catch (err) {
            log(err);
            return false;
        } finally {
            await cacheGroupList();
            CacheManager.save();
        }
    }
    const renameGroup = async (tagid, tagname) => {
        setInfoBar(`正在修改分组为"${tagname}"...`);
        try {
            const jsonData = await (await fetch(
                getPostRequest(getRenameGroupURL(),
                    new URLSearchParams({
                        tagid,
                        name: tagname,
                        csrf: getCSRFToken()
                    }))));
            if (jsonData.code === 0) return true;
            else throw new Error(jsonData.message);
        } catch (err) {
            log(err);
            return false;
        } finally {
            await cacheGroupList();
            CacheManager.save();
            await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
            resetInfoBar();
        }
    }
    const removeGroup = async (tagid) => {
        setInfoBar(`正在移除分组"${tagid}"...`);
        try {
            const jsonData = await (await fetch(
                getPostRequest(getRemoveGroupURL(),
                    new URLSearchParams({
                        tagid,
                        csrf: getCSRFToken()
                    }))));
            if (jsonData.code === 0) return true;
            else throw new Error(jsonData.message);
        } catch (err) {
            log(err);
            return false;
        } finally {
            await cacheGroupList();
            CacheManager.save();
            await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
            resetInfoBar();
        }
    }
    const moveUserToDefaultGroup = uids => moveUserToGroup(uids, [0]);//unused
    const moveUserToGroup = async (uids, tagids) => {
        setInfoBar(`正在移动用户分组...`);
        try {
            const jsonData = await (await fetch(
                getPostRequest(getMoveToGroupURL(),
                    new URLSearchParams({
                        fids: uids.join(','),
                        tagids: tagids.join(','),
                        csrf: getCSRFToken()
                    }))).json());
            if (jsonData.code === 0) {
                for (let uid of uids) {
                    const u = parseInt(uid);
                    let targetUser;
                    if (datas.mappings.includes(u)) {
                        targetUser = datas.mappings[u];
                    } else if (datas.mappings.includes(uid)) {
                        targetUser = datas.mappings[uid];
                    } else {
                        //TODO: need reload
                    }
                    targetUser.tag = tagids.map(i => parseInt(i))
                }
                return true;
            }
            else throw new Error(jsonData.message);
        } catch (err) {
            log(err);
            return false;
        }
    }
    const copyUserToGroup = async (uids, tagids) => {
        setInfoBar(`正在添加用户分组...`);
        try {
            const jsonData = await (await fetch(
                getPostRequest(getCopyToGroupURL(),
                    new URLSearchParams({
                        fids: uids.join(','),
                        tagids: tagids.join(','),
                        csrf: getCSRFToken()
                    }))).json());
            log(jsonData, jsonData.code, jsonData.code === 0);//TODO:BUG
            if (jsonData.code == 0) {
                for (let uid of uids) {
                    const u = parseInt(uid);
                    let targetUser;
                    if (datas.mappings.includes(u)) {
                        targetUser = datas.mappings[u];
                    } else if (datas.mappings.includes(uid)) {
                        targetUser = datas.mappings[uid];
                    } else {
                        //TODO: need reload
                    }
                    targetUser.tag = (function () {
                        const tag = [];
                        for (const tid of [...targetUser.tag, ...tagids]) {
                            const ntid = parseInt(tid);
                            if (!tag.includes(ntid)) tag.push(ntid)
                        }
                        return tag;
                    })()
                }
                return true;
            }
            else throw new Error(jsonData.message);
        } catch (err) {
            log(err);
            return false;
        }
    }
    const getCurrSubStat = async uid => {
        try {
            const jsonData = await (await fetch(getRequest(getSubInfoURL(uid)))).json();
            if (jsonData && jsonData.code === 0) {
                return jsonData.data;
            } else {
                log("Failed fetch self info: unexpected response", jsonData);
                return null;
            }
        } catch (e) {
            log("Failed fetch self info: error found", e);
            return null;
        }
    }
    const getLatestVideoPublishDate = async uid => {
        try {
            const jsonData = await (await fetch(getRequest(getLatestVidURL() + "?" + await getWbiSignedParams({
                mid: uid, ps: 1, pn: 1
            })))).json();
            if (jsonData && jsonData.code === 0) {
                if (
                    jsonData.data
                    && jsonData.data.list
                ) {
                    let mostCates = "";
                    if (jsonData.data.list.tlist.length !== 0) {
                        let max = 0, name = "";
                        for (let itemname of Object.keys(jsonData.data.list.tlist)) {
                            const item = jsonData.data.list.tlist[itemname];
                            if (item.count > max) {
                                max = item.count;
                                name = item.name;
                            } else if (item.count === max) {
                                name += "、" + item.name;
                            }
                        }
                        mostCates = name;
                    }
                    if (jsonData.data.list.vlist.length === 0) {
                        return { ok: false, mostCates: mostCates }
                    }
                    const vid = jsonData.data.list.vlist[0];
                    return { ok: true, value: vid.created, vinfo: { aid: vid.aid, title: vid.title, pic: vid.pic, play: vid.play }, mostCates: mostCates }
                } else {
                    return { ok: false }
                }
            } else {
                return { ok: false }
            }
        } catch (e) {
            log(uid, e)
            return { ok: false }
        }
    };
    const getTypeNameFromDynamicTypeID = (id, fallback = '?') => {
        switch (+id) {
            case 1:
                return mdi('share') + "转发动态";
            case 2:
                return mdi('image-multiple') + "相册图片";
            case 4:
                return mdi('text');//文字动态
            case 8:
                return mdi('youtube') + "视频投稿";
            case 16:
                return mdi('video-box') + "小视频";
            case 64:
                return mdi('newspaper-variant-outline') + "专栏文章";
            case 128:
                return fallback;
            case 256:
                return mdi('playlist-music') + "音频投稿";
            case 512:
                return mdi('filmstrip-box-multiple') + "番剧更新";
            case 1024:
                return fallback;
            case 2048:
                return mdi('playlist-play') + "歌单分享";
            case 4300:
                return mdi('playlist-star') + "收藏夹";
            default: return fallback;
        }
    }
    const getContentFromDynamic = (card) => {
        if (!card) return '无法解析内容(空内容)';
        if (card.item?.content) return card.item.content;
        if (card.aid) return 'av' + card.aid + ' | <b>' + card.title + "</b><br>简介: " + card.desc;
        if (card.item?.pictures) return card.item.pictures_count + '张图片';
        if (card.origin) return `转发自${card?.user?.uname}: ${card.item?.content}`;
        if (card.item?.description) return card.item.description;
        if (card.summary) return `cv${card.id} | <b>${card.title}</b><br>简介: ${card.summary}`
        return '无法解析内容(未知特征)';
    }
    const parseDynamic = (d) => {
        const dynamic = {
            id: d.desc.dynamic_id_str,
            sender: d.desc.user_profile,
            like: d.desc.like,
            comment: d.desc.comment,
            repost: d.desc.repost,
            status: d.desc.status,
            timestamp: d.desc.timestamp,
            type: d.desc.type,
            content: getContentFromDynamic(d.card),
            origin: (d.desc.orig_dy_id && d.desc.orig_dy_id !== 0) ? (
                d.card.origin = JSON.parse(d.card.origin),
                getContentFromDynamic(d.card.origin)
            ) : null,
            istop: d.extra.is_space_top === 1,
            isrepost: d.desc.orig_dy_id && d.desc.orig_dy_id !== 0,
            publisher: d.desc.orig_dy_id ? (d.desc.orig_dy_id === 0 ? d.card.user : d.card.origin_user.info) : d.card.user,
            prefix: getTypeNameFromDynamicTypeID(d.desc.type),
            origprefix: getTypeNameFromDynamicTypeID(d.desc.orig_type)
        };
        return dynamic;
    }
    const getDynamic = async uid => {
        try {
            const jsonData = await (await fetch(getRequest(getDynamicURL(datas.self, uid)))).json();
            if (jsonData && jsonData.code === 0) {
                const data = jsonData.data.cards;
                const dynamics = {
                    top: null,
                    next: null,
                }
                if (!data || data.length === 0) {
                    return dynamics;
                }
                let d = data.shift();
                d.card = JSON.parse(d.card);
                let obj = parseDynamic(d);
                if (obj.istop) {
                    dynamics.top = obj;
                    let nd = data.shift();
                    nd.card = JSON.parse(nd.card);
                    let nobj = parseDynamic(nd);
                    dynamics.next = nobj;
                } else {
                    dynamics.next = obj;
                }
                return dynamics;
            } else {
                log("Failed fetch self info: unexpected response", jsonData);
                return null;
            }
        } catch (e) {
            log("Failed fetch self info: error found", e);
            return null;
        }
    }
    const getUserStats = async (uid, withraw = false) => {
        try {
            const jsonData = await (await fetch(getRequest(getUInfoURL()+"?"+await getWbiSignedParams({mid:uid})))).json();
            if (jsonData && jsonData.code === 0) {
                const udata = jsonData.data;
                const parsedData = {
                    ok: true,
                    level: udata.level,
                    banned: udata.silence === 1,
                    RIP: udata.sys_notice === 20,
                    disputed: udata.sys_notice === 8,
                    notice: udata.sys_notice,
                    sign: udata.sign,
                    cates: udata.tags,
                    lives: udata.live_room,
                    official_verify: udata.official_verify ?? udata.official,
                };
                if (withraw) {
                    return Object.assign({}, udata, parsedData);
                }
                return parsedData
            }
        } catch (e) {
            log("UINFO failed:",e.message)
        }
        return { ok: false }
    }
    const fillUserStatus = async (uid, refresh = false) => {
        setInfoBar(`正在为${uid}填充用户信息`)
        uid = parseInt(uid);
        if (datas.mappings[uid] && datas.mappings[uid].filled) {
            log(uid, "already filled")
            resetInfoBar();
            return datas.mappings[uid];
        }
        const userinfo = await getUserStats(uid, refresh);
        if (userinfo.ok) {
            if (refresh) datas.mappings[uid] = userinfo;
            datas.mappings[uid].level = userinfo.level;
            datas.mappings[uid].banned = userinfo.banned;
            datas.mappings[uid].RIP = userinfo.RIP;
            datas.mappings[uid].disputed = userinfo.disputed;
            datas.mappings[uid].notice = userinfo.notice;
            datas.mappings[uid].sign = userinfo.sign;
            datas.mappings[uid].cates = userinfo.cates;
            datas.mappings[uid].lives = userinfo.lives;
            datas.mappings[uid].filled = true;
            if (!userinfo.banned && !userinfo.RIP) {
                const lastUpdate = await getLatestVideoPublishDate(uid);
                log(uid, lastUpdate)
                if (lastUpdate.ok) {
                    datas.mappings[uid].lastUpdate = lastUpdate.value;
                    datas.mappings[uid].lastUpdateInfo = lastUpdate.vinfo;
                }
                if (lastUpdate.mostCates) datas.mappings[uid].mostCates = lastUpdate.mostCates;
            }
            log(uid, datas.mappings[uid]);
        } else {
            log(uid, "fetch space info failed");
        }
        resetInfoBar();
        return datas.mappings[uid];
    }
    const RELE_ACTION = {
        FOLLOW: 1,
        UNFOLLOW: 2,
        WHISPER: 3,
        UNWHISPER: 4,
        BLOCK: 5,
        UNBLOCK: 6,
        KICKFANS: 7
    }
    const batchOperateUser = async (uids = [], actCode) => {
        if (uids.length === 0) return { ok: false, res: "UIDS is empty" };
        if (!Object.values(RELE_ACTION).includes(actCode)) {
            if (Object.keys(RELE_ACTION).includes(actCode)) {
                actCode = RELE_ACTION[actCode];
            } else {
                return { ok: false, res: "Unknown action code" };
            }
        }
        const act = actCode;
        log("Batch Operating with Action Code", act);
        const operate = async (_uids, _act) => {
            try {
                const jsonData = await (await fetch(getPostRequest(getFollowURL(), new URLSearchParams(`fids=${_uids.join(',')}&act=${_act}&re_src=11&jsonp=jsonp&csrf=${getCSRFToken()}`)))).json()
                if (jsonData && jsonData.code === 0) return { ok: true, uids, res: "" };
                return { ok: false, uids, res: jsonData.message, data: jsonData.data };
            } catch (e) {
                return { ok: false, uids, res: e.message };
            }
        }
        const list = [...uids];
        const results = { ok: true, uids, res: "", data: { failed_fids: [], failed_results: [] } };//failed_fids
        if (list.length > 50) log("WARNING: Operating with more than 50 items, it may cause some issues.");
        while (list.length) {
            const currents = list.splice(0, 50);
            const result = await operate(currents, act);
            if (!result.ok) {
                results.ok = false;
                results.res = "部分请求出现错误";
                results.data.failed_fids.concat(result.data.failed_fids);
                results.data.failed_results.push(result);
            }
        }
        log("Results:", results);
        return results;
    }
    const convertToWhisper = async (uids) => {
        log("Unfollowing", uids);
        let unfo = uids.length === 1 ? await operateUser(uids[0], RELE_ACTION.UNFOLLOW) : await batchOperateUser(uids, RELE_ACTION.UNFOLLOW);
        log("Unfollowed:", unfo);
        if (!unfo.ok) return unfo;
        log("Whispering", uids);
        let whis = uids.length === 1 ? await operateUser(uids[0], RELE_ACTION.WHISPER) : await batchOperateUser(uids, RELE_ACTION.WHISPER);
        log("Whispered:", whis);
        return whis;
    }
    const convertToFollow = async (uids) => {
        log("Unwhispering", uids);
        let unwh = uids.length === 1 ? await operateUser(uids[0], RELE_ACTION.UNWHISPER) : await batchOperateUser(uids, RELE_ACTION.UNWHISPER);
        log("Unwhispered:", unwh);
        if (!unwh.ok) return unwh;
        log("Following", uids);
        let foll = uids.length === 1 ? await operateUser(uids[0], RELE_ACTION.FOLLOW) : await batchOperateUser(uids, RELE_ACTION.FOLLOW);
        log("Followed:", foll);
        return foll;
    }
    // CSDN https://blog.csdn.net/namechenfl/article/details/91968396
    function numberFormat(value) {
        let param = {};
        let k = 10000,
            sizes = ['', '万', '亿', '万亿'],
            i;
        if (value < k) {
            param.value = value
            param.unit = ''
        } else {
            i = Math.floor(Math.log(value) / Math.log(k));
            param.value = ((value / Math.pow(k, i))).toFixed(2);
            param.unit = sizes[i];
        }
        return param;
    }
    const operateUser = async (uid, actCode) => {
        if (!Object.values(RELE_ACTION).includes(actCode)) {
            if (Object.keys(RELE_ACTION).includes(actCode)) {
                actCode = RELE_ACTION[actCode];
            } else {
                return { ok: false, res: "Unknown action code" };
            }
        }
        const act = actCode;
        log("Operating with Action Code", act);
        try {
            const jsonData = await (await fetch(getPostRequest(getUnfolURL(), new URLSearchParams(`fid=${uid}&act=${act}&re_src=11&jsonp=jsonp&csrf=${getCSRFToken()}`)))).json()
            if (jsonData && jsonData.code === 0) return { ok: true, uid, res: "" };
            return { ok: false, uid, res: jsonData.message };
        } catch (e) {
            return { ok: false, uid, res: e.message };
        }
    }
    const unfollowUser = async (uid, iswhisper = false) => {
        try {
            if (datas.isSelf) {
                iswhisper = datas.mappings[uid].attribute === 1 || datas.mappings[uid].isWhisper;
            }
            return operateUser(uid, iswhisper ? RELE_ACTION.UNWHISPER : RELE_ACTION.UNFOLLOW);
        } catch (e) {
            return { ok: false, uid, res: e.message };
        }
    }
    const unfollowUsers = async uids => {
        let okgroup = [];
        let errgroup = [];
        for (let uid of uids) {
            setInfoBar(`正在取关 ${uid} ...`)
            let result = await unfollowUser(uid);
            log(result);
            if (result.ok) {
                okgroup.push(uid);
            } else {
                errgroup.push(uid);
            }
            await batchDelay();
        }
        setInfoBar(`取关完成`)
        return {
            ok: errgroup.length === 0,
            okgroup, errgroup
        }
    }
    const fetchFollowings = async (uid, page = 1) => {
        let retry = cfg.retrial;
        while (retry-- > 0) {
            try {
                const jsonData = await (await fetch(getRequest(getFetchURL(uid, page)))).json();
                if (jsonData) {
                    if (jsonData.code === 0) return jsonData;
                    if (jsonData.code === 22007) {
                        retry = -1;
                        datas.fetchstat = "GUEST-LIMIT";
                        throw "Not the owner of uid " + uid;
                    }
                    if (jsonData.code === 22115) {
                        retry = -1;
                        datas.fetchstat = "PERMS-DENIED";
                        throw "Permission denied.";
                    }
                }
                log("Unexcept fetch result", "retry:", retry, "uid:", uid, "p:", page, "data", jsonData)
            } catch (e) {
                if (datas.fetchstat === "OK") datas.fetchstat = "ERRORED";
                log("Errored while fetching followings", "retry:", retry, "uid:", uid, "p:", page, "e:", e);
            }
        }
        return null;
    }
    const fetchWhisperFollowings = async (uid, page = 1) => {
        if (!datas.isSelf) return null;
        let retry = cfg.retrial;
        while (retry-- > 0) {
            try {
                const jsonData = await (await fetch(getRequest(getWhispersURL(page)))).json();
                if (jsonData) {
                    if (jsonData.code === 0) {
                        for (let item of jsonData.data.list) {
                            item.isWhisper = true;
                        }
                        return jsonData;
                    }
                    if (jsonData.code === 22007) {
                        retry = -1;
                        datas.fetchstat = "GUEST-LIMIT";
                        throw "Not the owner of uid " + uid;
                    }
                    if (jsonData.code === 22115) {
                        retry = -1;
                        datas.fetchstat = "PERMS-DENIED";
                        throw "Permission denied.";
                    }
                }
                log("Unexcept fetch result", "retry:", retry, "uid:", uid, "p:", page, "data", jsonData)
            } catch (e) {
                if (datas.fetchstat === "OK") datas.fetchstat = "ERRORED";
                log("Errored while fetching followings", "retry:", retry, "uid:", uid, "p:", page, "e:", e);
            }
        }
        return null;
    }
    const getFollowings = async (force = false) => {
        if (datas.status === 1) {
            log("Task canceled due to busy");
            return;
        }
        log("Fetching followings with param force =", force ? "true" : "false");
        cfg.infobarTemplate = () => `共读取 ${datas.fetched} 条关注`;
        datas.status = 1;
        datas.checked = [];
        let currentPageNum = 1;
        const uid = await getCurrentUid();
        const self = await getSelfId();
        datas.currUid = uid;
        datas.self = self;
        if (self === -1) {
            if (!cfg.I_KNOW_WHAT_IM_DOING) alertModal("没有登录", "你没有登录，部分功能可能无法正常工作。", "确定");
            log("Not login");
        } else if (self === 0) {
            if (!cfg.I_KNOW_WHAT_IM_DOING) alertModal("获取当前用户信息失败", "无法得知当前页面是否为你的个人空间，因此部分功能可能无法正常工作。", "确定");
            log("Failed fetch current user");
        } else if (self + "" !== uid) {
            if (!cfg.I_KNOW_WHAT_IM_DOING) alertModal("他人的关注列表", "这不是你的个人空间，因此获取的关注列表也不是你的列表。<br>非本人关注列表最多显示前250个关注。<br>你仍然可以对其进行筛选，但是不能进行操作。", "确定");
            log("Other's space.");
        } else if (self + "" === uid) {
            datas.isSelf = true;
        }
        unsafeWindow.FoMan_CurrentUser = () => createUserInfoCardFromOthers(datas.currUid);
        cfg.titleTemplate = () => `<h1>关注管理器 <small>v${cfg.VERSION} ${cfg.debug ? "debug" : ""} ${datas.settings.enableExpermentals ? "!" : ""} <span style="color:grey;font-size:x-small;margin-right:12px;float:right">当前展示: UID:${datas.currUid} ${datas.isSelf ? "(你)" : `(${document.title.replace("的个人空间_哔哩哔哩_bilibili", "").replace("的个人空间_哔哩哔哩_Bilibili", "")})`} <a href='javascript:void(0)' onclick='FoMan_CurrentUser()'>👁️‍🗨️</a></span></small></h1>`
        setTitle();
        let needreload = force || !CacheManager.load();
        const currInfo = await getCurrSubStat(uid);
        if (datas.currInfo.following !== -1 && currInfo !== null) {
            if (force === false && datas.currInfo.following === currInfo.following && datas.currInfo.whisper === currInfo.whisper) {
                if (datas.fetched > 0)
                    needreload = false;
            } else if (!needreload && (datas.currInfo.following !== currInfo.following || datas.currInfo.whisper !== currInfo.whisper)) {
                alertModal("自动重新加载", "检测到数据变化，已经自动重新加载。", "确定");
                needreload = true;
            }
        }
        datas.currInfo = currInfo;
        if (needreload) {
            datas.followings = [];
            datas.mappings = {};
            datas.fetched = 0;
            const firstPageData = await fetchFollowings(uid, currentPageNum);
            if (!firstPageData) throw "Failed to fetch followings";
            datas.total = firstPageData.data.total;
            datas.pages = Math.floor(datas.total / 50) + (datas.total % 50 ? 1 : 0);
            datas.followings = datas.followings.concat(firstPageData.data.list);
            datas.fetched += firstPageData.data.list.length;
            firstPageData.data.list.forEach(it => {
                datas.mappings[parseInt(it.mid)] = it;
            })
            currentPageNum += 1;
            for (; currentPageNum <= datas.pages; currentPageNum++) {
                const currentData = await fetchFollowings(uid, currentPageNum);
                if (!currentData) break;
                datas.followings = datas.followings.concat(currentData.data.list);
                datas.fetched += currentData.data.list.length;
                currentData.data.list.forEach(it => {
                    datas.mappings[parseInt(it.mid)] = it;
                });
                setInfoBar(`正在查询关注数据：已获取 ${datas.fetched} 条数据`);
            }
            log("isSelf? ", datas.isSelf);
            if (datas.isSelf) {
                setInfoBar(`正在查询悄悄关注数据`);
                let whisperPageNum = 1;
                let fetched = 0;
                const whisperPages = Math.floor(datas.currInfo.whisper / 50) + (datas.currInfo.whisper % 50 ? 1 : 0);
                for (; whisperPageNum <= whisperPages; whisperPageNum++) {
                    const currentData = await fetchWhisperFollowings(whisperPageNum);
                    log(currentData);
                    if (!currentData) break;
                    datas.followings = datas.followings.concat(currentData.data.list);
                    fetched += currentData.data.list.length;
                    currentData.data.list.forEach(it => {
                        datas.mappings[parseInt(it.mid)] = it;
                    });
                    setInfoBar(`正在查询悄悄关注数据：已获取 ${fetched} 条数据`);
                }
            }
            CacheManager.save();
        } else {
            log("Using last result.");
            cfg.infobarTemplate = () => `共读取 ${datas.fetched} 条关注(缓存,<a href="javascript:void(0)" onclick="openFollowManager(true)">点此重新加载</a>)`
            setInfoBar("使用上次数据");
        }
        datas.status = 2;
        log("fetch completed.");
        autoCacheCleaner();
    }
    const autoCacheCleaner = (force = false) => {
        let size = CacheManager.getSize();
        if (force || size >= 2) {
            setInfoBar("正在整理缓存空间...");
            alertModal('请稍等', '由于缓存空间到达警戒值，正在自动整理缓存，请稍等...');
            CacheManager.prune();
            let aftersize = CacheManager.getSize();
            if (aftersize >= 2) {
                alertModal('请稍等', '缓存空间仍然处于警戒值以上，整理缓存无效，正在自动清理缓存，请稍等...');
                CacheManager.clean();
            }
            aftersize = CacheManager.getSize();
            alertModal('清理完成', '本次自动清理释放了' + (size - aftersize) + ' MB缓存空间。', "确定");
            resetInfoBar();
        }
    }
    unsafeWindow.FoManCleaner = (force = false) => autoCacheCleaner(force);
    const CacheProvider = {
        storage: window.localStorage,
        prefix: "Unfollow_",
        expire: 1000 * 60 * 60 * 2,
        getKey: (key) => CacheProvider.prefix + key,
        valueWrapper: (value = '', no = false) => {
            log(JSON.stringify({
                et: no ? (new Date('2999/1/1')).getTime() : (new Date()).getTime() + CacheProvider.expire,
                vl: value
            }));
            return JSON.stringify({
                et: no ? (new Date('2999/1/1')).getTime() : (new Date()).getTime() + CacheProvider.expire,
                vl: value
            });
        },
        getValue: (value = "{}", key = null, noprefix = false) => {
            try {
                const itemArc = JSON.parse(value);
                if (itemArc.hasOwnProperty('et') && itemArc.et >= (new Date()).getTime()) {
                    return itemArc.vl;
                }
                if (key) CacheProvider.del(key, noprefix);
                return null;
            } catch (e) {
                if (key) CacheProvider.del(key, noprefix);
                return null;
            }
        },
        list: () => Object.keys(CacheProvider.storage).filter(el => el.startsWith(CacheProvider.prefix)),
        has: (key, noprefix = false) => {
            if (!noprefix) {
                key = CacheProvider.getKey(key);
            }
            return CacheProvider.storage.getItem(key) === null;
        },
        valid: (key, noprefix = false) => {
            if (!noprefix) {
                key = CacheProvider.getKey(key);
            }
            if (CacheProvider.has(key, true)) {
                const value = CacheProvider.storage.getItem(key);
                return CacheProvider.getValue(value, key, true) !== null;
            } else return false;
        },
        set: (key, val, noexpire = false, noprefix = false) => {
            if (!noprefix) {
                key = CacheProvider.getKey(key);
            }
            CacheProvider.storage.setItem(key, CacheProvider.valueWrapper(val, noexpire));
        },
        get: (key, fallback = null, noprefix = false) => {
            if (!noprefix) {
                key = CacheProvider.getKey(key);
            }
            const result = CacheProvider.storage.getItem(key);
            log('Cache-get-with-key', key, result);
            if (result === null) return fallback;
            log('Cache-get-parsed-value', key, CacheProvider.getValue(result, key, true));
            return CacheProvider.getValue(result, key, true);
        },
        del: (key, noprefix = false) => {
            if (!noprefix) {
                key = CacheProvider.getKey(key);
            }
            delete CacheProvider.storage[key];
        },
        prune: () => {
            const count = {
                valid: 0, expired: 0
            };
            CacheProvider.list().forEach(it => {
                if (!it) return;
                if (CacheProvider.valid(it, true)) {
                    count.valid++;
                } else {
                    count.expired++;
                }
            })
            return;
        },
        getSize: (filter = (key) => key.startsWith(CacheProvider.prefix)) => {
            const sum = (...args) => args.reduce((a, b) => a + b, 0);
            return sum(...Object.keys(CacheProvider.storage).filter(filter).map(it => CacheProvider.storage.getItem(it).length));
        }
    }
    const CacheManager = {
        version: 1,
        save: (uid = datas.currUid) => {
            const { total, fetched, pages, followings, tags, currInfo } = datas;
            const tagclone = {};
            for (let tn of Object.keys(tags)) {
                tagclone[tn + ''] = tags[tn];
            }
            /*log({
                total,fetched,pages,followings,mappings,tagclone,currInfo
            });*/
            CacheProvider.set(`cache_${uid}`, {
                total, fetched, pages, followings, tagclone, currInfo, cacheVersion: CacheManager.version
            });
        },
        load: (uid = datas.currUid) => {
            if (!datas.isSelf) return false;
            const cached = CacheProvider.get(`cache_${uid}`);
            if (cached === null) return false;
            else {
                const { total, fetched, pages, followings, tagclone, currInfo } = cached;
                if (!cached.cacheVersion || cached.cacheVersion < CacheManager.version) {
                    CacheProvider.del(`cache_${uid}`);
                    return false;
                }
                const tags = {};
                for (let tn of Object.keys(tagclone)) {
                    tags[parseInt(tn)] = tagclone[tn];
                }
                const mappings = {};
                for (const follow of followings) {
                    mappings[+follow.mid] = follow;
                }
                const cdata = { total, fetched, pages, followings, mappings, tags, currInfo };
                for (let n of Object.keys(cdata)) {
                    datas[n] = cdata[n];
                }
                return true;
            }
        },
        prune: () => {
            CacheProvider.prune();
            try {
                CacheProvider.list().forEach(el => {
                    const value = CacheProvider.get(el, null, true);
                    if (!value.cacheVersion || value.cacheVersion < CacheManager.version) CacheProvider.del(el, true);
                });
                return true;
            } catch (e) {
                log(e);
                return false;
            }
        },
        clean: () => {
            try {
                CacheProvider.list().forEach(el => CacheProvider.del(el, true));
                return true;
            } catch (e) {
                log(e);
                return false;
            }
        },
        getSize: () => {
            return (CacheProvider.getSize() / 1024 / 1024).toFixed(2);
        }
    }
    const clearStyles = (className = "CKFOMAN") => {
        let dom = document.querySelectorAll("style." + className);
        if (dom) [...dom].forEach(e => e.remove());
    }
    const addStyle = (s, className = "CKFOMAN", mode = "append") => {
        switch (mode) {
            default:
            case "append":
                break;
            case "unique":
                if (document.querySelector("style." + className)) return;
                break;
            case "update":
                clearStyles(className);
                break;
        }
        let style = document.createElement("style");
        style.classList.add(className);
        style.innerHTML = s;
        document.body.appendChild(style);
    }
    const setTitle = (val = null) => {
        const title = get("#CKFOMAN-titledom");
        if (val != null) title.innerHTML = val;
        else title.innerHTML = cfg.titleTemplate();
    }
    const getFloatWindow = () => {
        addMdiBtnStyle();
        addStyle(`
        #CKFOMAN{
            position: fixed;
            z-index: 99000;
            top: 50%;
            left: 50%;
            width: 800px;
            width: 60vw;
            height: 800px;
            height: 80vh;
            background: white;
            border-radius: 8px;
            padding: 12px;
            transform: translate(-50%,-50%);
            transition: all .3s;
            box-shadow: 0 2px 8px grey;
        }
        #CKFOMAN.hide{
            opacity: 0;
            pointer-events: none;
            transform: translate(-50%,-50%) scale(0.95);
        }
        #CKFOMAN.show{
            transform: translate(-50%,-50%) scale(1);
        }
        #CKFOMAN-container{
            width: 100%;
            /*overflow-y: auto;
            overflow-x: hidden;
            max-height: calc(80vh - 70px);*/
            position: relative;
            display: flex;
            flex-direction: column;
            flex-wrap: nowrap;
            justify-content: flex-start;
            align-items: stretch;
        }
        .CKFOMAN-scroll-list{
            margin: 6px auto;
            overflow-y: auto;
            overflow-x: hidden;
            display: flex;
            flex-wrap: nowrap;
            flex-direction: column;
            max-height: calc(80vh - 80px);
        }
        .CKFOMAN-data-inforow{
            border-radius: 6px;
            flex: 1;
            width: 100%;
            display: flex;
            padding: 6px;
            color: #aaa;
            transition: background .3s;
        }
        .CKFOMAN-data-inforow:hover{
            background: #2196f361;
            transition: background .1s;
        }
        .CKFOMAN-data-inforow-toggle{
            margin: 3px 8px;
        }
        .CKFOMAN-toolbar-btns{
            flex: 1;
            border: none;
            background: #2196f3;
            border-radius: 3px;
            margin: 0 6px;
            padding: 3px;
            color: white;
            box-shadow: 0 2px 3px grey;
            /*box-sizing: border-box;*/
            /*border: 2px solid #00000000;*/
            transition: all .5s;
        }
        .CKFOMAN-toolbar-btns:hover{
            /*filter: brightness(0.85);*/
            background: #00467e!important;
            transition: all .15s;
            /*border-bottom: solid 2px white;*/
        }
        .CKFOMAN-toolbar-btns.red{
            background: #e91e63!important;
        }
        .CKFOMAN-toolbar-btns:hover.red{
            background: #8c002f!important;
        }
        .CKFOMAN-toolbar-btns.green{
            background: #4caf50!important;
        }
        .CKFOMAN-toolbar-btns:hover.green{
            background: #1b5e20!important;
        }
        .CKFOMAN-toolbar-btns.orange{
            background: #e64a19!important;
        }
        .CKFOMAN-toolbar-btns:hover.orange{
            background: #bf360c!important;
        }
        .CKFOMAN-toolbar-btns.grey{
            background: #949494!important;
            color: grey!important;
        }
        .CKFOMAN-toolbar-btns:hover.grey{
            background: #878787!important;
            color: grey!important;
        }
        #CKFOMAN-sortbtns-container>button{
            flex: 1 0 40% !important;
            margin: 4px 4px;
        }
        #CKFOMAN .mdi-close:hover{
            color: #ff5722;
        }
        .CKFOMAN-aliastext{
            font-weight: lighter;
            color: gray;
        }
        `, "CKFOMAN-mainWindowcss", "unique");
        const id = "CKFOMAN";
        let win = document.querySelector("#" + id);
        if (win) return win;
        win = document.createElement("div");
        win.id = id;

        const closebtn = document.createElement("div");
        closebtn.innerHTML = `<i class="mdi mdi-18px mdi-close"></i>`
        closebtn.style.float = "right";
        closebtn.style.color = (getBgColor() === "white") ? "black" : "white";
        closebtn.onclick = hidePanel;
        win.appendChild(closebtn);

        const titleText = document.createElement("div");
        titleText.id = "CKFOMAN-titledom";
        titleText.innerHTML = cfg.titleTemplate();
        win.appendChild(titleText);

        const infoBar = document.createElement("div");
        infoBar.style.height = "30px";
        infoBar.style.lineHeight = "30px";
        infoBar.style.width = "100%";
        infoBar.style.textAlign = "center";
        infoBar.id = id + "-infobar";
        win.appendChild(infoBar);

        const container = document.createElement("div");
        container.id = id + "-container";
        win.appendChild(container);

        win.className = "hide";
        document.body.appendChild(win);
        return win;
    }
    const getContainer = () => {
        return getFloatWindow().querySelector("#CKFOMAN-container");
    }
    const setInfoBar = (content = '') => {
        const bar = getFloatWindow().querySelector("#CKFOMAN-infobar");
        if (bar) bar.innerHTML = content;
        return bar;
    }
    const resetInfoBar = () => {
        wait(50).then(() => {
            let str = cfg.infobarTemplate();
            if (datas.checked.length > 0) {
                str += `，已选中 ${datas.checked.length} 条`;
            }
            setInfoBar(str);
        });
    }
    const divider = () => {
        const div = document.createElement("div");
        div.style.width = "30%";
        div.style.borderBottom = "solid grey 2px";
        div.style.lineHeight = "3px";
        div.style.margin = "0 auto";
        div.style.marginBottom = "3px";
        div.style.height = "6px";
        div.style.overflow = "hidden";
        div.style.padding = "0";
        return div;
    }
    const showPanel = () => {
        const panel = getFloatWindow();
        panel.style.backgroundColor = getBgColor();
        panel.className = "show";
    }
    const hidePanel = () => {
        const panel = getFloatWindow();
        panel.className = "hide";
    }
    const openModal = (title = '', content) => {
        blockWindow();
        let modal = get("#CKFOMAN-modal");
        if (!modal) modal = initModal();
        modal.setTitle(title);
        modal.setContent(content);
        modal.show();
    }
    const isModalShowing = () => {
        let modal = get("#CKFOMAN-modal");
        if (modal) return modal.classList.contains("show");
        else return false;
    }
    const hideModal = () => {
        blockWindow(false);
        let modal = get("#CKFOMAN-modal");
        if (modal) modal.hide();
    }
    const initModal = () => {
        addStyle(`
        #CKFOMAN-modal{
            position: fixed;
            z-index: 99010;
            top: 50%;
            left: 50%;
            width: 300px;
            width: 30vw;
            /*height: 300px;
            height: 50vh;*/
            background: white;
            border-radius: 8px;
            padding: 12px;
            transform: translate(-50%,-50%);
            transition: all .3s;
            box-shadow: 0 2px 8px grey;
            max-height: 95vh;
            overflow-y: auto;
        }
        #CKFOMAN-modal.show{
            opacity: 1;
            transform: translate(-50%,-50%) scale(1);
        }
        #CKFOMAN-modal.hide{
            opacity: 0;
            pointer-events: none;
            transform: translate(-50%,-50%) scale(0.9);
        }
        .CKFOMAN-modal-content>div{
            display: flex;
            margin: 6px 10px;
            flex-wrap: wrap;
            flex-direction: column;
            align-content: space-around;
            justify-content: space-between;
            align-items: stretch;
        }
        .CKFOMAN-modal-content button,
        .CKFOMAN-modal-content input,
        .CKFOMAN-modal-content keygen,
        .CKFOMAN-modal-content optgroup,
        .CKFOMAN-modal-content select,
        .CKFOMAN-modal-content textarea
        {
            border-width: 2px;
            border-color: transparent;
            margin: 2px;
            border-radius: 3px;
            transition: all .3s;
        }
        .CKFOMAN-modal-content button:hover,
        .CKFOMAN-modal-content input:hover,
        .CKFOMAN-modal-content keygen:hover,
        .CKFOMAN-modal-content optgroup:hover,
        .CKFOMAN-modal-content select:hover,
        .CKFOMAN-modal-content textarea:hover
        {
            border-color: grey;
        }

        .CKFOMAN-toolbar-btns>i.mdi {
            float: right;
        }
        `, "CKFOMAN-modal-css", "unique");
        const modal = document.createElement("div");
        modal.id = "CKFOMAN-modal";
        modal.className = "hide";

        const header = document.createElement("h2");
        header.className = "CKFOMAN-modal-title"
        modal.appendChild(header);

        modal.setTitle = (t = '') => {
            header.innerHTML = t;
        }

        const contents = document.createElement("div");
        contents.className = "CKFOMAN-modal-content";
        modal.appendChild(contents);

        modal.setContent = async (c) => {
            let ct = c;
            if (ct instanceof Function) {
                ct = await ct();
            }
            if (ct instanceof HTMLElement) {
                contents.innerHTML = '';
                contents.appendChild(ct);
                return;
            }
            if (ct instanceof String) {
                contents.innerHTML = ct;
                return;
            }
            log("unknown: ", ct);
        }
        modal.addContent = async (c) => {
            let ct = c;
            if (ct instanceof Function) {
                ct = await ct();
            }
            if (ct instanceof HTMLElement) {
                contents.appendChild(ct);
                return;
            }
            if (ct instanceof String) {
                contents.innerHTML += ct;
                return;
            }
            log("unknown: ", ct);
        }

        modal.close = closeModal;
        modal.open = openModal;
        modal.show = () => {
            modal.style.backgroundColor = getBgColor();
            modal.className = "show";
        }
        modal.hide = () => {
            modal.className = "hide";
        }

        document.body.appendChild(modal);
        return modal;
    }
    const closeModal = () => {
        blockWindow(false);
        let modal = get("#CKFOMAN-modal");
        if (modal) modal.remove();
    }
    const addMdiBtnStyle = () => {
        if (document.querySelector("#CKFOMAN-MDICSS")) return;
        document.head.innerHTML += `<link id="CKFOMAN-MDICSS" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@5.9.55/css/materialdesignicons.min.css"/>`;
    }
    const refreshChecked = () => {
        setInfoBar(`正在刷新后台数据...`);
        const all = getAll("#CKFOMAN .CKFOMAN-data-inforow-toggle");
        if (!all) return;
        for (let it of all) {
            const mid = it.getAttribute("data-targetmid");
            if (it.checked) {
                if (!datas.checked.includes(mid) && !datas.checked.includes(parseInt(mid))) {
                    datas.checked.push(mid);
                }
            } else {
                if (datas.checked.includes(mid)) {
                    datas.checked.splice(datas.checked.indexOf(mid), 1);
                } else if (datas.checked.includes(parseInt(mid))) {
                    datas.checked.splice(datas.checked.indexOf(parseInt(mid)), 1);
                }
            }
        }
        resetInfoBar();
        return datas.checked;
    }
    const toggleSwitch = (mid, status = false, operateDom = true) => {
        setToggleStatus(mid, status, operateDom);
        //unsafeWindow.postMessage(`CKFOMANSTATUSCHANGES|${mid}|${status ? 1 : 0}`)
    }
    const isAliasPluginInstalled = () => unsafeWindow.FoManPlugins?.UpAlias ?? false;
    const getAliasPlugin = () => unsafeWindow.FoManPlugins.UpAlias;
    const upinfoline = async data => {
        let invalid = isInvalid(data);
        let info = datas.mappings[parseInt(data.mid)] || {};
        return await makeDom("li", async item => {
            item.className = "CKFOMAN-data-inforow";
            if (datas.settings.lazyRenderForList) item.style.contentVisibility = "auto";
            item.onclick = e => {
                if (e.target.classList.contains("CKFOMAN-data-inforow-name")) {
                    //open("https://space.bilibili.com/" + data.mid);
                    createUserInfoCard(info);
                } else if (e.target.tagName !== "INPUT") {
                    const toggle = item.querySelector("input");
                    toggleSwitch(data.mid, !toggle.checked);
                    //toggle.checked = !toggle.checked;
                } else {
                    const toggle = item.querySelector("input");
                    wait(50).then(() => toggleSwitch(data.mid, toggle.checked, false))
                }
                //resetInfoBar();
            }
            item.oncontextmenu = e => {
                e.preventDefault();
                open("https://space.bilibili.com/" + data.mid);
            }
            item.setAttribute("data-special", data.special);
            item.setAttribute("data-invalid", data.invalid ? "1" : "0");
            item.setAttribute("data-fans", data.attribute === 6 ? "1" : "0");
            item.setAttribute("data-vip", data.vip.vipType !== 0 ? "1" : "0");
            item.setAttribute("data-official", data.official_verify.type === 1 ? "1" : "0");
            let title = data.mid + "";
            item.appendChild(await makeDom("input", toggle => {
                toggle.className = "CKFOMAN-data-inforow-toggle";
                toggle.type = "checkbox";
                toggle.checked = datas.checked.includes(data.mid + "") || datas.checked.includes(parseInt(data.mid));
                toggle.setAttribute("data-targetmid", data.mid);
                toggle.onchange = e => {
                    toggleSwitch(data.mid, toggle.checked);
                }
                // toggle.onchange = e =>{
                //     if(toggle.checked){
                //         if(!datas.checked.includes(data.mid)){
                //             datas.checked.push(data.mid);
                //         }
                //     }else{
                //         if(datas.checked.includes(data.mid)){
                //             datas.checked.splice(datas.checked.indexOf(data.mid),1);
                //         }
                //     }
                // }
            }));
            item.appendChild(await makeDom("img", avatar => {
                avatar.src = data.face;
                avatar.style.flex = "1";
                avatar.style.height = "18px";
                avatar.style.maxWidth = "18px";
                avatar.style.borderRadius = "50%";
                avatar.style.verticalAlign = "middle";
                avatar.style.marginRight = "18px";
                avatar.loading = "lazy";
            }));
            item.appendChild(await makeDom("span", name => {
                name.className = "CKFOMAN-data-inforow-name";
                name.innerText = data.uname;
                name.style.flex = "1";
                if (isAliasPluginInstalled()) {
                    name.innerHTML += ` <span class="CKFOMAN-aliastext alias-content-${data.mid}">${getAliasPlugin().provider.getAlias(+data.mid, "")}</span>`
                }
                if (invalid) {
                    name.style.textDecoration = "line-through 3px red";
                } else {
                    name.style.fontWeight = "bold";
                    if (data.isWhisper === true || data.attribute === 1) {
                        name.innerHTML = `<i class="mdi mdi-18px mdi-eye-off" style="vertical-align: middle;color:gray!important" title="悄悄关注"></i>` + name.innerHTML;
                        title += " | 悄悄关注";
                    }
                    if (data.special === 1) {
                        name.innerHTML = `<i class="mdi mdi-18px mdi-heart" style="vertical-align: middle;color:orangered!important" title="特别关注"></i>` + name.innerHTML;
                        title += " | 特别关注";
                    }
                    if (data.attribute === 6) {
                        name.innerHTML = `<i class="mdi mdi-18px mdi-swap-horizontal" style="vertical-align: middle;color:orangered!important" title="互相关注"></i>` + name.innerHTML;
                        title += " | 互相关注";
                    }
                    if (data.vip.vipType !== 0) {
                        name.style.color = "#e91e63";
                    }
                    if (data.official_verify.type > -1) {
                        name.style.textDecoration = "underline";
                        name.style.color = "#c67927";
                        title += " | 认证账号";
                    }
                    if (info.banned) {
                        name.style.color = "grey";
                        name.innerHTML = `<i class="mdi mdi-18px mdi-cancel" style="vertical-align: middle;color:red!important" title="账号已封禁"></i>` + name.innerHTML;
                        title += " | 账号已封禁";
                    }
                    if (info.RIP) {
                        name.innerHTML = `<i class="mdi mdi-18px mdi-candle" style="vertical-align: middle;color:black!important" title="纪念账号"></i>` + name.innerHTML;
                        title += " | 纪念账号";
                    }
                    if (info.disputed) {
                        name.innerHTML = name.innerHTML + `<i class="mdi mdi-18px mdi-frequently-asked-questions" style="vertical-align: middle;color:orangered!important" title="账号有争议"></i>`;
                        title += " | 账号有争议";
                    }
                    if (info.notice && info.notice.content && !info.banned && !info.RIP && !info.disputed) {
                        name.innerHTML = name.innerHTML + `<i class="mdi mdi-18px mdi-information" style="vertical-align: middle;color:grey!important" title="${info.notice.toString()}"></i>`;
                        title += " | " + (info.notice.content ? info.notice.content : "账号状态未知");
                    }
                }
            }));
            item.appendChild(await makeDom("span", subtime => {
                subtime.style.flex = "1";
                subtime.innerHTML = "关注于" + (new Intl.DateTimeFormat('zh-CN').format(data.mtime + "000"));
                if (isNearly(data.mtime)) {
                    title += " | 最近关注";
                } else if (isLongAgo(data.mtime)) {
                    title += " | 很久前关注";
                }
            }));
            item.appendChild(await makeDom("span", tagsdom => {
                tagsdom.style.flex = "1";
                if (data.tag === null || data.tag.length === 0 || ["[0]", "[-10]"].includes(JSON.stringify(data.tag)))
                    tagsdom.innerHTML = "";
                else {
                    let name = "";
                    for (let gid of data.tag) {
                        if (gid === 0 || gid === -10) continue;
                        if (name !== "") name += ",";
                        if (gid in datas.tags) {
                            name += datas.tags[gid].name;
                        } else {
                            name += "?";
                        }
                    }
                    tagsdom.innerHTML = name;
                }
            }));
            item.appendChild(await makeDom("span", mark => {
                mark.style.flex = "1";
                if (invalid) {
                    title += " | 账号已注销";
                } else {
                    if (data.special === 1) {
                        mark.innerHTML = "特别关注&nbsp;&nbsp;";
                    }
                    if (data.official_verify.type > -1) {
                        mark.innerText = data.official_verify.desc.substring(0, 25);
                        mark.title = data.official_verify.desc;
                    } else if (data.vip.vipType !== 0) {
                        mark.innerText = data.vip.vipType === 1 ? "大会员" : "年费大会员"
                        title += " | " + mark.innerText;
                    }
                    if (info.lastUpdate) {
                        if (isLongAgo(info.lastUpdate)) {
                            title += " | 很久没有发布视频";
                        }
                        if (isNearly(info.lastUpdate)) {
                            title += " | 最近有发布视频";
                        }
                    }
                }
            }));
            log(info, title);
            title += "\n简介: " + data.sign + (data.official_verify.type > -1 ? "\n认证: " + data.official_verify.desc : "")
            item.setAttribute("title", title);
        });
    }
    const taginfoline = (data, clickCallback = () => { }, selected = false, showExtras = true, hideOptions = false) => {
        return makeDom("li", async item => {
            let couldRename = true;
            item.className = "CKFOMAN-data-inforow";
            item.onclick = e => {
                if (e.path.filter(el => el.tagName === "BUTTON" || el.tagName === "INPUT").length) {
                    return;
                } else {
                    clickCallback(e, data);
                }
            }
            item.setAttribute("data-id", data.tagid);
            item.setAttribute("data-name", data.name);
            item.setAttribute("data-count", data.count);
            item.setAttribute("data-tip", data.tip);
            if (!hideOptions) item.appendChild(await makeDom("input", toggle => {
                toggle.className = "CKFOMAN-data-inforow-toggle";
                toggle.type = "checkbox";
                toggle.checked = selected;
                toggle.setAttribute("data-tagid", data.tagid);
            }));
            item.appendChild(await makeDom("span", name => {
                name.className = "CKFOMAN-data-inforow-name";
                switch (data.tagid) {
                    case 0:
                    case '0':
                        couldRename = false;
                        name.innerHTML = `默认分类`.italics();
                        item.setAttribute("title", "默认的关注分类，包含全部未分组的关注项目。\n不可删除");
                        break;
                    case -10:
                    case '-10':
                        couldRename = false;
                        name.innerHTML = `特别关注`.italics();
                        item.setAttribute("title", "默认的特别关注分类，包含全部特别关注的关注项目。\n不可删除");
                        break;
                    default:
                        name.innerText = `${data.name}`;
                        item.setAttribute("title", `用户创建的分组 "${data.name}"\n删除后用户将被移动到默认分类`);
                }
                name.style.flex = "1";
            }));
            item.appendChild(await makeDom("span", subtime => {
                subtime.style.flex = "1";
                subtime.innerHTML = `${data.tagid}`;
            }));
            item.appendChild(await makeDom("span", subtime => {
                subtime.style.flex = "1";
                subtime.innerHTML = `包含 ${data.count} 个内容`;
            }));
            if (showExtras) item.appendChild(await makeDom("button", renamebtn => {
                renamebtn.style.flex = ".4";
                renamebtn.innerHTML = `更名`;
                renamebtn.style.height = "23px";
                renamebtn.style.margin = "0";
                renamebtn.style.padding = "2px";
                renamebtn.classList.add("CKFOMAN-toolbar-btns");
                if (!couldRename) {
                    renamebtn.setAttribute("disabled", true);
                    renamebtn.classList.add("grey");
                }
                renamebtn.onclick = async () => {
                    let newname = prompt("请输入新的分类名字", data.name).trim();
                    if (newname.length !== 0) {
                        if (newname != data.name) {
                            const result = await renameGroup(data.tagid, newname);
                            if (result) {
                                await alertModal("分组重命名", "分组重命名成功，重新打开窗口以显示修改后的数据。", "确定");
                            } else {
                                await alertModal("分组重命名", "分组重命名完成，但是不能确定结果。请刷新页面，然后查看是否生效。", "确定");
                            }
                        }
                    }
                };
            }));
        });
    }
    const doUnfollowChecked = async () => {
        const checked = datas.checked;
        if (!checked || checked.length === 0) return alertModal("无法操作", "实际选中数量为0，没有任何人被选中取关。", "");
        await alertModal("正在取消关注...", `正在取关${checked.length}个用户，请耐心等候~`);
        const result = await unfollowUsers(checked);
        if (result.ok) {
            await alertModal("操作结束", `已取关 ${result.okgroup.length} 个用户。`, "继续");
        } else {
            await alertModal("操作结束", `已取关 ${result.okgroup.length} 个用户，但有另外 ${result.errgroup.length} 个用户取关失败。`, "继续");
        }
        datas.checked = [];
        log("取关结果", result);
        createMainWindow();
    }
    const isInvalid = data => {
        return (data.face === "http://i0.hdslb.com/bfs/face/member/noface.jpg"
            || data.face === "https://i0.hdslb.com/bfs/face/member/noface.jpg")
            && data.uname === "账号已注销";
    }
    const alertModal = async (title = "", content = "", okbtn = "hidden") => {
        if (isModalShowing()) {
            hideModal();
            await wait(200);
        }
        openModal(title, await makeDom("div", async container => {
            container.appendChild(await makeDom("div", tip => {
                tip.innerHTML = content;
            }))
            if (okbtn !== "hidden")
                container.appendChild(await makeDom("div", async btns => {
                    btns.style.display = "flex";
                    btns.appendChild(await makeDom("button", btn => {
                        btn.className = "CKFOMAN-toolbar-btns";
                        btn.innerHTML = okbtn;
                        btn.onclick = e => hideModal();
                    }))
                }))
        }))
        await wait(300);
    }
    const showCacheQuotaModal = async () => {
        hideModal();
        await wait(300);
        const size = CacheManager.getSize();
        let content = "本地缓存空间已占用 " + size + " MB。";
        if (size < 1.8) {
            content += "无需处理。定期整理缓存可以减少空间占用。";
        } else if (size < 2.5) {
            content += "<b>建议整理缓存。</b>";
        } else {
            content += "<b>建议整理或清理缓存以避免缓存空间超出配额。</b>";
        }
        content += "<br><br>FoMan使用本地存储空间保存缓存，本地存储在不同浏览器中有不同的限额，最小的为2.5MB(Opera)，最大的为10MB(Chromium)。请注意此空间非FoMan独占，B站自身和其他插件也会占用此空间，因此建议经常进行整理。";
        content += "<br><br><b>整理缓存</b>仅会清理过期和过时的缓存。<br><br>默认情况下，FoMan存储的缓存有效期为2小时，超过2小时的缓存和数据总数发生变化时都会触发强制放弃缓存重新加载。"
        content += "<br><br><b>清空缓存</b>会清理所有由FoMan产生的缓存。若配额达到上限，或经常查看其他人关注列表，则建议使用此功能。"
        alertModal("缓存使用说明", content, "确定");
    }
    const enableExpermentalFeaturesModal = async () => {
        hideModal();
        openModal("启用实验性功能", await makeDom("div", async container => {
            [
                await makeDom("span", span => {
                    span.innerHTML = "你正在启用实验性功能。<br /><br />实验性功能意味着不稳定、不安全、结果可能非预期，并且有可能导致你的账号出现异常的功能。这些功能默认都是关闭的。<br /><br />如果你打开这些功能，就意味着你决定承担使用这些功能所导致的风险。<br /><br />你可以选择随时关闭实验性功能开关。";
                }),
                await makeDom("div", async btns => {
                    btns.style.display = "flex";
                    [
                        await makeDom("button", btn => {
                            btn.classList.add("CKFOMAN-toolbar-btns", "red");
                            btn.innerText = "启用";
                            btn.onclick = () => {
                                datas.settings.enableExpermentals = true;
                                hideModal();
                            }
                        }),
                        await makeDom("button", btn => {
                            btn.classList.add("CKFOMAN-toolbar-btns");
                            btn.innerText = "禁用";
                            btn.onclick = () => {
                                datas.settings.enableExpermentals = false;
                                hideModal();
                            }
                        })
                    ].forEach(el => btns.appendChild(el));
                })
            ].forEach(el => container.appendChild(el));
        }));
    }
    const createUserInfoCardFromOthers = async (uid) => {
        if (!uid) return;
        const i = await fillUserStatus(uid, true).catch(err => log(err));
        await createUserInfoCard(i, false, true);
    };
    const createUserInfoCard = async (info, refilldata = true, noactions = false) => {
        if (datas.preventUserCard) return;
        log(info);
        if (datas.settings.autoExtendInfo) {
            alertModal("请稍后...");
            if (refilldata) await fillUserStatus(info.mid).catch(err => log(err));
            info.dynamics = await getDynamic(info.mid).catch(err => log(err));
            info['stats'] = await getCurrSubStat(info.mid);
        }
        hideModal();
        await wait(300);
        openModal("", await makeDom("div", async container => {
            const infocard = await makeDom("div", async card => {
                card.style.display = "flex";
                card.style.flexDirection = "row";
                card.style.minHeight = "100px";
                card.style.minWidth = "400px";
                [
                    await makeDom("img", async img => {
                        img.style.flex = "1";
                        img.style.maxWidth = "70px";
                        img.setAttribute("loading", "lazy");
                        img.src = info.face;
                        img.style.width = "70px";
                        img.style.height = "70px";
                        img.style.borderRadius = "50%";
                        img.style.margin = "0 30px";
                    }),
                    await makeDom("div", async upinfo => {
                        upinfo.style.flex = "1";
                        upinfo.style.maxWidth = "300px";
                        upinfo.innerHTML = `<b style="color:${info.vip['nickname_color']};font-size: large">${info.uname ?? info.name ?? '未知昵称'}</b> <span style="display:inline-block;transform: translateY(-5px);font-size:xx-small;line-height:1.2;padding:1px 3px;border-radius:6px;background: ${info.vip.vipType > 0 ? (info.vip.label['bg_color'] || "#f06292") : "rgba(0,0,0,0)"};color: ${info.vip.label['text_color'] || "white"}">${info.vip.vipType > 1 ? info.vip.label.text : info.vip.vipType > 0 ? "大会员" : ""}</span>`;
                        if (info.level) {
                            upinfo.innerHTML += `<div style="display: inline-block;border-radius:3px;line-height: 1.2;padding: 1px 3px;background:#f06292;margin-left: 12px;color:white">LV${info.level}${isHardCoreMember(info) ? " ⚡ (硬核)" : ""}</div>`;
                        }
                        upinfo.innerHTML += `<div style="color:gray;border-left: 2px solid gray;padding-left: 2px;font-style: italic;">${info.sign}</div>`;
                        if (info.official_verify.type !== -1) {
                            let color = "gray";
                            switch (info.official_verify.type) {
                                case 0:
                                    color = "goldenrod";
                                    break;
                                case 1:
                                    color = "#FB7299";
                                    break;
                                case 2:
                                    color = "dodgerblue";
                                    break;
                            }
                            upinfo.innerHTML += `<div style="color:${color}">${info.official_verify.desc}</div>`;
                        }
                        if (isAliasPluginInstalled()) {
                            document.querySelector("#CKFOMAN-showalias")?.remove();
                            upinfo.innerHTML += `<div id="CKFOMAN-showalias" style="color:gray"></div>`;
                            const refreshAlias = async () => {
                                const aliasdom = document.querySelector("#CKFOMAN-showalias");
                                aliasdom.innerHTML = '';
                                if (!aliasdom) return;
                                [...document.querySelectorAll(`.alias-content-${info.mid}`)].map(el => el.innerText = getAliasPlugin().provider.getAlias(+info.mid, ""))
                                if (getAliasPlugin().provider.hasAlias(+info.mid)) {
                                    aliasdom.innerHTML += `别名: <span class="alias-content-${info.mid}">` + getAliasPlugin().provider.getAlias(+info.mid, "无别名") + "</span> ";
                                    aliasdom.appendChild(await makeDom("a", async a => {
                                        a.innerText = "修改";
                                        a.onclick = async () => {
                                            await getAliasPlugin().actions.setFor(info.mid, info.uname);
                                            refreshAlias();
                                        }
                                    }))
                                    aliasdom.appendChild(document.createTextNode(" / "));
                                    aliasdom.appendChild(await makeDom("a", async a => {
                                        a.innerText = "删除";
                                        a.onclick = async () => {
                                            await getAliasPlugin().actions.removeFor(info.mid, info.uname);
                                            refreshAlias();
                                        }
                                    }))
                                } else {
                                    aliasdom.appendChild(await makeDom("a", async a => {
                                        a.innerText = "设置别名";
                                        a.onclick = async () => {
                                            await getAliasPlugin().actions.setFor(info.mid, info.uname);
                                            refreshAlias();
                                        }
                                    }))
                                }
                            }
                            setTimeout(() => refreshAlias(), 20);
                        }
                        if (info.stats) {
                            const { follower, following } = info.stats;
                            const [fans, subs] = [numberFormat(follower), numberFormat(following)];
                            upinfo.innerHTML += `<div style="color:gray">${fans.value}${fans.unit}粉丝 / ${subs.value}${subs.unit}关注</div>`;
                        }
                        if (info.tag) {
                            let folders = "分类:";
                            for (let t of info.tag) {
                                if (t in datas.tags) {
                                    folders += " " + datas.tags[t].name;
                                }
                            }
                            upinfo.innerHTML += `<div style="color:gray;font-weight:bold">${folders}</div>`;
                        }
                        let subinfo = "";
                        if (info.special === 1) {
                            subinfo += `<span style="color:deeppink;margin-right:6px;">特别关注</span>`;
                        }
                        if (info.attribute === 6) {
                            subinfo += `<span style="color:indianred;margin-right:6px;">互相关注</span>`;
                        }
                        if (info.isWhisper === true || info.attribute === 1) {
                            subinfo += `<span style="color:yellowgreen;margin-right:6px;">悄悄关注</span>`;
                        }
                        if (subinfo.length) {
                            upinfo.innerHTML += `<div>${subinfo}</div>`
                        }
                        if (info.notice && info.notice.id) {
                            upinfo.innerHTML += `<div style="border-radius:6px;padding:3px;background:${info.notice.bg_color};color:${info.notice.text_color};"><a href="${info.notice.url}">${info.notice.content}</a></div>`;
                        }
                        if (info.banned) {
                            upinfo.innerHTML += `<div style="border-radius:6px;padding:3px;background:black;color:white;">账号已封禁</div>`;
                        }
                        if (info.cates && info.cates.length) {
                            upinfo.innerHTML += `<div style="color:gray">标签: ${info.cates.join(", ")}</div>`;
                        }
                        if (info.mostCates && info.mostCates.length) {
                            upinfo.innerHTML += `<div style="color:gray">主要投稿分区: ${info.mostCates}</div>`;
                        }
                        if (info.mid) {
                            upinfo.innerHTML += `<div style="color:gray">UID: ${info.mid}</div>`;
                        }
                        if (info.mtime) {
                            const regdate = new Date(info.mtime * 1000);
                            upinfo.innerHTML += `<div style="color:gray">关注于 ${regdate.getFullYear()}年${regdate.getMonth() + 1}月${regdate.getDate()}日</div>`;
                        }
                    })
                ].forEach(el => card.appendChild(el));
            })
            container.appendChild(infocard);
            if (unsafeWindow.FoManPlugins && unsafeWindow.FoManPlugins.RememberFollows) {
                const followinfo = unsafeWindow.FoManPlugins.RememberFollows.get(+info.mid);
                if (followinfo) {
                    const fodate = new Date(followinfo.timestamp);
                    [
                        divider(),
                        await makeDom("div", async post => {
                            post.innerHTML = "<h3 style='padding: 6px 0;'>关注记录</h3>";
                            post.appendChild(await makeDom("div", async vidcard => {
                                vidcard.style.display = "flex";
                                vidcard.style.flexDirection = "row";
                                vidcard.style.minHeight = "80px";
                                vidcard.style.minWidth = "400px";
                                [
                                    await makeDom("div", async vidinfo => {
                                        vidinfo.innerHTML = `<div style="font-weight:bold;font-size:larger;color:grey">${followinfo.videoName}</div>`;
                                        vidinfo.innerHTML += `<div style="color:grey">${fodate.getFullYear()}年${fodate.getMonth() + 1}月${fodate.getDate()}日 · 当时UP名: <a href="https://space.bilibili.com/${followinfo.mid}">${followinfo.upName}</a></div>`;
                                    })
                                ].forEach(el => vidcard.appendChild(el));
                                vidcard.onclick = () => open(`https://www.bilibili.com/video/${followinfo.videoId}`)
                            }))
                        })
                    ].forEach(el => container.appendChild(el));
                }
            }
            if (info.dynamics) {
                if (info.dynamics.top) {
                    let dynamic = info.dynamics.top;
                    let content = (() => {
                        if (!dynamic.content || dynamic.content.length === 0) return "无内容";
                        let short = dynamic.content.substring(0, 300);
                        short = short.split("\n").slice(0, 4).join("\n");
                        if (short != dynamic.content) short += "...";

                        return short.replaceAll("\n", "<br>");
                    })();
                    const pushdate = new Date(dynamic.timestamp * 1000);
                    [
                        divider(),
                        await makeDom("div", async post => {
                            post.innerHTML = "<h3 style='padding: 6px 0;'>置顶动态</h3>";
                            post.appendChild(await makeDom("div", async vidcard => {
                                vidcard.style.display = "flex";
                                vidcard.style.flexDirection = "row";
                                vidcard.style.minHeight = "80px";
                                vidcard.style.minWidth = "400px";
                                [
                                    await makeDom("div", async vidinfo => {
                                        vidinfo.innerHTML = `<div style="font-weight:normal;font-size:smaller;color:#858585">[${dynamic.prefix}] ${content}</div>`;
                                        vidinfo.innerHTML += `<div style="color:grey"><i class="mdi mdi-10px mdi-chevron-double-right"></i> ${pushdate.getFullYear()}年${pushdate.getMonth() + 1}月${pushdate.getDate()}日 - ${dynamic.like ?? '?'}点赞 ${dynamic.repost ?? '?'}转发 ${dynamic.comment ?? '?'}评论</div>`;
                                        if (dynamic.isrepost) {
                                            vidinfo.innerHTML += `<div style="color:grey"><i class="mdi mdi-10px mdi-share"></i> 转发自<b onclick="open('https://space.bilibili.com/${dynamic.publisher.uid}')">${dynamic.publisher.uname}</b> 的 [${dynamic.origprefix}]:<div style='border-left: 2px solid gray;padding-left:6px'>${dynamic.origin.substr(0, 100)}...</div></div>`;
                                        }
                                    })
                                ].forEach(el => vidcard.appendChild(el));
                                vidcard.onclick = () => open(`https://t.bilibili.com/${dynamic.id}?tab=2`)
                            }))
                        })
                    ].forEach(el => container.appendChild(el));
                }
                if (info.dynamics.next) {
                    let dynamic = info.dynamics.next;
                    let content = (() => {
                        if (!dynamic.content || dynamic.content.length === 0) return "无内容";
                        let short = dynamic.content.substring(0, 300);
                        short = short.split("\n").slice(0, 4).join("\n");
                        if (short != dynamic.content) short += "...";
                        return short.replaceAll("\n", "<br>");
                    })();
                    const pushdate = new Date(dynamic.timestamp * 1000);
                    [
                        divider(),
                        await makeDom("div", async post => {
                            post.innerHTML = "<h3 style='padding: 6px 0;'>最新动态</h3>";
                            post.appendChild(await makeDom("div", async vidcard => {
                                vidcard.style.display = "flex";
                                vidcard.style.flexDirection = "row";
                                vidcard.style.minHeight = "80px";
                                vidcard.style.minWidth = "400px";
                                [
                                    await makeDom("div", async vidinfo => {
                                        vidinfo.innerHTML = `<div style="font-weight:normal;font-size:smaller;color:#858585">[${dynamic.prefix}] ${content}</div>`;
                                        vidinfo.innerHTML += `<div style="color:grey"><i class="mdi mdi-10px mdi-chevron-double-right"></i> ${pushdate.getFullYear()}年${pushdate.getMonth() + 1}月${pushdate.getDate()}日 - ${dynamic.like ?? '?'}点赞 ${dynamic.repost ?? '?'}转发 ${dynamic.comment ?? '?'}评论</div>`;
                                        if (dynamic.isrepost) {
                                            vidinfo.innerHTML += `<div style="color:grey"><i class="mdi mdi-10px mdi-share"></i> 转发自<b onclick="open('https://space.bilibili.com/${dynamic.publisher.uid}')">${dynamic.publisher.uname}</b> 的 [${dynamic.origprefix}]:<div style='border-left: 2px solid gray;padding-left:6px'>${dynamic.origin.substr(0, 100)}...</div></div>`;
                                        }
                                    })
                                ].forEach(el => vidcard.appendChild(el));
                                vidcard.onclick = () => open(`https://t.bilibili.com/${dynamic.id}?tab=2`)
                            }))
                        })
                    ].forEach(el => container.appendChild(el));
                }
            }
            if (info.lastUpdate && info.lastUpdateInfo) {
                const pushdate = new Date(info.lastUpdate * 1000);
                [
                    divider(),
                    await makeDom("div", async post => {
                        post.innerHTML = "<h3 style='padding: 6px 0;'>最新投稿</h3>";
                        post.appendChild(await makeDom("div", async vidcard => {
                            vidcard.style.display = "flex";
                            vidcard.style.flexDirection = "row";
                            vidcard.style.minHeight = "80px";
                            vidcard.style.minWidth = "400px";
                            [
                                await makeDom("img", img => {
                                    img.style.flex = "1";
                                    img.style.maxWidth = "80px";
                                    img.style.height = "50px";
                                    img.setAttribute("loading", "lazy");
                                    img.src = info.lastUpdateInfo.pic;
                                    img.style.borderRadius = "6px";
                                    img.style.margin = "0px 12px 0px 10px";
                                }),
                                await makeDom("div", async vidinfo => {
                                    vidinfo.innerHTML = `<div style="font-weight:bold;font-size:larger;color:grey">${info.lastUpdateInfo.title}</div>`;
                                    vidinfo.innerHTML += `<div style="color:grey">${pushdate.getFullYear()}年${pushdate.getMonth() + 1}月${pushdate.getDate()}日</div>`;
                                })
                            ].forEach(el => vidcard.appendChild(el));
                            vidcard.onclick = () => open(`https://www.bilibili.com/av${info.lastUpdateInfo.aid}`)
                        }))
                    })
                ].forEach(el => container.appendChild(el));
            }
            if (info.lives && info.lives.liveStatus !== 0) {
                [
                    divider(),
                    await makeDom("div", async post => {
                        post.innerHTML = "<h3 style='padding: 6px 0;'>直播间</h3>";
                        post.appendChild(await makeDom("div", async vidcard => {
                            vidcard.style.display = "flex";
                            vidcard.style.flexDirection = "row";
                            vidcard.style.minHeight = "80px";
                            vidcard.style.minWidth = "400px";
                            [
                                await makeDom("img", img => {
                                    img.style.flex = "1";
                                    img.style.maxWidth = "80px";
                                    img.style.height = "50px";
                                    img.setAttribute("loading", "lazy");
                                    img.src = info.lives.cover;
                                    img.style.borderRadius = "6px";
                                    img.style.margin = "0px 12px 0px 10px";
                                }),
                                await makeDom("div", async vidinfo => {
                                    vidinfo.innerHTML = `<div style="font-weight:bold;font-size:larger;color:grey">${info.lives.title}</div>`;
                                    vidinfo.innerHTML += `<div style="color:grey">正在${info.lives.liveStatus === 2 ? '轮' : '直'}播 - 房间号: ${info.lives.roomid}</div>`;
                                })
                            ].forEach(el => vidcard.appendChild(el));
                            vidcard.onclick = () => open(`https://live.bilibili.com/${info.lives.roomid}`)
                        }))
                    })
                ].forEach(el => container.appendChild(el));
            }
            async function addBtn(info, container) {
                container.style.display = "flex";
                container.style.flexDirection = "column";
                container.style.position = "sticky";
                container.style.bottom = 0;
                container.style.background = getBgColor();
                container.innerHTML = "";
                if (!noactions) {
                    if (info.attribute === 0) {
                        container.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns red";
                            btn.style.margin = "4px 0";
                            btn.innerHTML = "立刻关注";
                            btn.onclick = async e => {
                                btn.innerHTML = "正在关注...";
                                btn.setAttribute("disabled", true)
                                btn.classList.add("grey");
                                const res = await batchOperateUser([info.mid], RELE_ACTION.FOLLOW);
                                if (!res.ok) {
                                    log(res)
                                    btn.innerHTML = "关注失败";
                                    btn.removeAttribute("disabled")
                                    btn.classList.remove("grey");
                                } else {
                                    datas.mappings[info.mid].attribute = 1;
                                    btn.remove();
                                    addBtn(datas.mappings[info.mid], container);
                                }
                            }
                        }))
                        /*container.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns blue";
                            btn.style.margin = "4px 0";
                            btn.innerHTML = "悄悄关注";
                            btn.onclick = async e => {
                                btn.innerHTML = "正在关注...";
                                btn.setAttribute("disabled",true)
                                btn.classList.add("grey");
                                const res = await batchOperateUser([info.mid],RELE_ACTION.WHISPER);
                                if(!res.ok){
                                    log(res)
                                    btn.innerHTML = "关注失败";
                                    btn.removeAttribute("disabled")
                                    btn.classList.remove("grey");
                                }else{
                                    datas.mappings[info.mid].attribute = 1;
                                    btn.remove();
                                    addBtn(datas.mappings[info.mid],container);
                                }
                            }
                        }))*/
                    } else {
                        container.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns red";
                            btn.style.margin = "4px 0";
                            btn.innerHTML = "立刻取关(谨慎)";
                            btn.onclick = async e => {
                                btn.innerHTML = "正在取关...";
                                btn.setAttribute("disabled", true)
                                btn.classList.add("grey");
                                const res = await unfollowUser(info.mid);
                                if (!res.ok) {
                                    log(res);
                                    btn.innerHTML = "取关失败";
                                    btn.removeAttribute("disabled")
                                    btn.classList.remove("grey");
                                } else {
                                    datas.mappings[info.mid].attribute = 0;
                                    btn.remove();
                                    addBtn(datas.mappings[info.mid], container);
                                }
                            }
                        }))
                        /*if(info.attribute===1){
                            container.appendChild(await makeDom("button", btn => {
                                btn.className = "CKFOMAN-toolbar-btns blue";
                                btn.style.margin = "4px 0";
                                btn.innerHTML = "转为普通关注(不保留关注时间)";
                                btn.onclick = async e => {
                                    btn.innerHTML = "正在转换...";
                                    btn.setAttribute("disabled",true)
                                    btn.classList.add("grey");
                                    const res = await convertToFollow([info.mid]);
                                    if(!res.ok){
                                        log(res)
                                        btn.innerHTML = "关注失败";
                                        btn.removeAttribute("disabled")
                                        btn.classList.remove("grey");
                                    }else{
                                        datas.mappings[info.mid].attribute = 1;
                                        datas.mappings[info.mid].isWhisper = false;
                                        btn.remove();
                                        if(datas.dommappings[info.mid+""]&& datas.dommappings[info.mid+""] instanceof HTMLElement){
                                            datas.dommappings[info.mid+""].replaceWith(await upinfoline(datas.mappings[info.mid]));
                                        }
                                        //addBtn(datas.mappings[info.mid],container);
                                        hideModal();
                                    }
                                }
                            }))
                        }else{
                            container.appendChild(await makeDom("button", btn => {
                                btn.className = "CKFOMAN-toolbar-btns blue";
                                btn.style.margin = "4px 0";
                                btn.innerHTML = "转为悄悄关注(不保留关注时间)";
                                btn.onclick = async e => {
                                    btn.innerHTML = "正在悄悄关注...";
                                    btn.setAttribute("disabled",true)
                                    btn.classList.add("grey");
                                    const res = await convertToWhisper([info.mid]);
                                    if(!res.ok){
                                        log(res)
                                        btn.innerHTML = "关注失败";
                                        btn.removeAttribute("disabled")
                                        btn.classList.remove("grey");
                                    }else{
                                        datas.mappings[info.mid].attribute = 2;
                                        datas.mappings[info.mid].isWhisper = true;
                                        btn.remove();
                                        if(datas.dommappings[info.mid+""]&& datas.dommappings[info.mid+""] instanceof HTMLElement){
                                            datas.dommappings[info.mid+""].replaceWith(await upinfoline(datas.mappings[info.mid]));
                                        }
                                        //addBtn(datas.mappings[info.mid],container);
                                        hideModal();
                                    }
                                }
                            }))
                        }*/
                    }
                }
                container.appendChild(await makeDom("button", btn => {
                    btn.className = "CKFOMAN-toolbar-btns";
                    btn.style.margin = "4px 0";
                    btn.innerHTML = "个人主页";
                    btn.onclick = () => open(`https://space.bilibili.com/${info.mid}`)
                }))
                container.appendChild(await makeDom("button", btn => {
                    btn.className = "CKFOMAN-toolbar-btns";
                    btn.style.margin = "4px 0";
                    btn.innerHTML = "隐藏";
                    btn.onclick = () => hideModal();
                }))
            }
            const btns = document.createElement("div");
            await addBtn(info, btns);
            container.appendChild(btns);
        }));
    }
    const createGroupInfoModal = async () => {
        hideModal();
        await wait(300);
        openModal("分组管理", await makeDom("div", async container => {
            container.appendChild(await makeDom("div", tip => {
                tip.style.fontWeight = "bold";
                tip.innerHTML = `若修改过分组信息，建议刷新页面再进行其他操作。`;
            }))
            container.appendChild(divider());
            const taglistdom = document.createElement('div');
            taglistdom.className = "CKFOMAN-scroll-list";
            taglistdom.style.width = "100%";
            taglistdom.style.maxHeight = "calc(50vh - 100px)";
            const refreshList = async () => renderTagListTo(taglistdom, [], async (e, data) => {
                if (e.target.tagName === "INPUT") return;
                if (['0', '-10'].includes(data.tagid + '')) return;
                let dom = e.path.filter(it => it['classList'] && it.classList.contains('CKFOMAN-data-inforow'))[0];
                if (!dom) return log('no target');
                if (dom.hasAttribute('data-del-pending')) {
                    if (dom.removePendingTimer) clearTimeout(dom.removePendingTimer);
                    removeGroup(data.tagid).then(() => refreshList());
                    //cfg.infobarTemplate = `共读取 ${datas.fetched} 条关注 (已修改分组,<a href="javascript:void(0)" onclick="openFollowManager(true)">点此重新加载</a>)`;
                    await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                    resetInfoBar();
                } else {
                    dom.setAttribute('data-del-pending', 'waiting');
                    let namedom = dom.querySelector('.CKFOMAN-data-inforow-name');
                    if (!namedom) return;
                    let text = namedom.innerHTML;
                    namedom.innerHTML = '再次点击以移除'.fontcolor('red');
                    dom.removePendingTimer = setTimeout(() => {
                        if (dom.hasAttribute('data-del-pending')) dom.removeAttribute('data-del-pending');
                        if (dom.removePendingTimer) clearTimeout(dom.removePendingTimer);
                        namedom.innerHTML = text;
                    }, 5000);
                }
            }, true);
            container.appendChild(taglistdom);
            container.appendChild(await makeDom("div", async btns => {
                btns.style.display = "flex";
                [
                    await makeDom("button", btn => {
                        btn.className = "CKFOMAN-toolbar-btns";
                        btn.innerHTML = "添加分组";
                        btn.style.height = "30px";
                        btn.onclick = async () => {
                            const tagname = prompt("请输入新分组的标题");
                            if (!tagname) return;
                            createGroup(tagname).then(() => refreshList());
                        };
                    }),
                    await makeDom("button", btn => {
                        btn.className = "CKFOMAN-toolbar-btns";
                        btn.style.height = "30px";
                        btn.innerHTML = "关闭";
                        btn.onclick = () => hideModal();
                    }),
                ].forEach(el => btns.appendChild(el));
            }))
            refreshList();
        }))
    }
    const createGroupChangeModal = async (mode = 'copy'/*move*/) => {
        hideModal();
        await wait(300);
        refreshChecked();
        let uids = datas.checked;
        let users = [];
        let groups = [];
        let act = mode === 'copy' ? '复制' : '移动';
        for (let uid of uids) {
            users.push(datas.mappings[uid]);
            let tags = datas.mappings[uid].tag;
            tags && tags.forEach(t => groups.includes(t) || groups.push(t))
        }
        log(users, groups);
        openModal("分组修改:" + act, await makeDom("div", async container => {
            container.appendChild(await makeDom("div", tip => {
                tip.style.fontWeight = "bold";
                tip.innerHTML = `若修改过分组信息，建议刷新页面再进行其他操作。`;
            }))
            container.appendChild(divider());
            const taglistdom = document.createElement('div');
            taglistdom.className = "CKFOMAN-scroll-list";
            taglistdom.style.width = "100%";
            taglistdom.style.maxHeight = "calc(50vh - 100px)";
            const refreshList = async () => renderTagListTo(taglistdom, mode === 'copy' ? [] : groups, async (e, data) => {
                const row = e.path.filter(el => el.classList?.contains('CKFOMAN-data-inforow'));
                if (row.length) {
                    const cb = row[0].querySelector("input[type='checkbox']");
                    if (cb) cb.checked = !cb.checked
                }
            }, false);
            container.appendChild(taglistdom);
            container.appendChild(await makeDom("div", async btns => {
                btns.style.display = "flex";
                [
                    await makeDom("button", btn => {
                        btn.className = "CKFOMAN-toolbar-btns";
                        btn.style.height = "30px";
                        btn.innerHTML = "管理分组 (Beta)";
                        btn.onclick = async () => createGroupInfoModal();
                    }),
                    await makeDom("button", btn => {
                        btn.className = "CKFOMAN-toolbar-btns";
                        btn.style.height = "30px";
                        btn.innerHTML = "取消";
                        btn.onclick = () => hideModal();
                    }),
                    await makeDom("button", btn => {
                        btn.className = "CKFOMAN-toolbar-btns";
                        btn.style.height = "30px";
                        btn.innerHTML = "确定";
                        btn.onclick = async () => {
                            const allOptions = [...document.querySelectorAll('.CKFOMAN-data-inforow-toggle[data-tagid]')]
                            const selections = allOptions.map((option) => {
                                return { tagid: parseInt(option.getAttribute('data-tagid')), checked: option.checked }
                            })
                            const checked = selections.filter((selection) => selection.checked)
                            await alertModal("正在处理...", `正在${act}成员到新分组，请稍候`);
                            if (checked.length === 0) checked.push({ tagid: 0, checked: true });
                            switch (mode) {
                                case 'copy':
                                    copyUserToGroup(uids, checked.map(c => c.tagid));
                                    break;
                                case 'move':
                                    moveUserToGroup(uids, checked.map(c => c.tagid));
                                    break;
                                // default:
                                //     moveUserToDefaultGroup(uids);
                            }
                            await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                            hideModal();
                            cfg.infobarTemplate = () => `共读取 ${datas.fetched} 条关注 (已修改分组,<a href="javascript:void(0)" onclick="openFollowManager(true)">点此重新加载</a>)`;
                            resetInfoBar();
                        }
                    }),
                ].forEach(el => btns.appendChild(el));
            }))
            refreshList();
        }))
    }
    const makeButtons = (btns = []) => {
        const dom = CKTools.domHelper;
        return dom('div', {
            css: {
                'display': 'flex',
                'flex-direction': 'column'
            },
            init: el => {
                for (const btncfg of btns) {
                    let opt = Object.assign({
                        text: '按钮',
                        extras: '',
                        init: () => { },
                        onclick: () => { }
                    }, btncfg);
                    dom('button', {
                        classnames: ['CKFOMAN-toolbar-btns', ...opt.extras],
                        text: opt.text, init: opt.init, listeners: { click: opt.onclick },
                        append: el
                    })
                }
            }
        });
    }
    const createBlockOrFollowModal = async (isBlock = true) => {
        hideModal();
        await wait(300);
        refreshChecked();
        if (datas.checked.length === 0) {
            if (!cfg.I_KNOW_WHAT_IM_DOING) alertModal("无法继续", "你没有选中任何项，请选中一些项然后再进行操作。", "确认");
            return;
        }
        const ui = {
            action: isBlock ? "拉黑" : "关注",
            title: isBlock ? "批量拉黑" : "批量关注",
            desc: isBlock ? "确认要拉黑的用户列表。<br>他们不会从你的关注中消失。" : "确认要关注的用户列表。<br>重复关注可能导致你变成新粉丝。",
        }
        openModal(ui.title, await makeDom("div", async container => {
            container.appendChild(await makeDom("div", tip => {
                tip.style.fontWeight = "bold";
                tip.innerHTML = ui.desc;
            }))
            container.appendChild(divider());
            container.appendChild(await makeDom("div", async checkedlistdom => {
                checkedlistdom.className = "CKFOMAN-scroll-list";
                checkedlistdom.style.width = "100%";
                checkedlistdom.style.maxHeight = "calc(50vh - 100px)";
                const checkedList = [];
                for (let uid of datas.checked) {
                    if (uid in datas.mappings)
                        checkedList.push(datas.mappings[uid])
                }
                await renderListTo(checkedlistdom, checkedList, false);
            }))
            container.appendChild(await makeDom("div", async btns => {
                btns.style.display = "flex";
                [
                    await makeDom("button", btn => {
                        btn.className = "CKFOMAN-toolbar-btns red";
                        btn.innerHTML = "确认";
                        btn.onclick = async e => {
                            if (datas.checked.length === 0)
                                if (!cfg.I_KNOW_WHAT_IM_DOING) return alertModal("无需继续", "你没有选中任何项。", "确定");
                            const finalList = datas.checked;
                            await alertModal("正在" + ui.action, `正在${ui.action}${finalList.length}个关注...`);
                            const result = await batchOperateUser(finalList, isBlock ? RELE_ACTION.BLOCK : RELE_ACTION.FOLLOW);
                            if (result.ok) {
                                await alertModal(ui.action + "完成", `${finalList.length}个关注全部${ui.action}成功！`, "确定");
                                return createMainWindow(true);
                            } else {
                                if ("data" in result) {
                                    if (result.data !== null && "failed_fids" in result.data)
                                        await alertModal(ui.action + "完成，但部分失败", `尝试${ui.action}了${finalList.length}个关注，但是有${result.data.failed_fids.length}个${ui.action}失败：
                                                                                <br>
                                                                                <textarea readonly onclick="this.select()">${result.data.failed_fids.join(',')}</textarea>`, "确定");
                                    else
                                        await alertModal(ui.action + "失败", `尝试${ui.action}了${finalList.length}个关注但失败了，原因：<br><pre>${result.res}</pre>`, "确定");
                                    return createMainWindow(true);
                                } else {
                                    await alertModal(ui.action + "失败", `尝试${ui.action}了${finalList.length}个关注但失败了，原因：<br><pre>${result.res}</pre>`, "确定");
                                    return createMainWindow(true);
                                }
                            }
                        }
                    }),
                    await makeDom("button", btn => {
                        btn.className = "CKFOMAN-toolbar-btns";
                        btn.innerHTML = "取消";
                        btn.onclick = e => hideModal();
                    }),
                ].forEach(el => btns.appendChild(el));
            }))
        }))
    }
    const createOtherSpaceAlert = () => cfg.I_KNOW_WHAT_IM_DOING || alertModal("无法执行操作", "此功能只能在你的个人空间使用，当前是在别人的空间。", "确定");
    const createUnfollowModal = async () => {
        refreshChecked();
        if (datas.checked.length === 0) {
            if (!cfg.I_KNOW_WHAT_IM_DOING) alertModal("取消关注", `你没有勾选任何人，所以无法取关。请勾选后再点击取关按钮。`, "知道了")
        } else
            hideModal();
        await wait(300);
        openModal("取关这些Up？", await makeDom("div", async container => {
            container.appendChild(await makeDom("div", tip => {
                tip.style.color = "red";
                tip.style.fontWeight = "bold";
                tip.innerHTML = `请注意，一旦你确认这个操作，没有任何方法可以撤销！<br>就算你重新关注，也算是新粉丝的哦！`;
            }))
            container.appendChild(await makeDom("div", delaySettings => {
                delaySettings.style.color = "blue";
                delaySettings.style.fontWeight = "bold";
                delaySettings.innerHTML = `操作间隔：<input id="CKFOMAN-form-delay" type="number" step="0.01" value="${datas.settings.batchOperationDelay}" />`;
            }))
            container.appendChild(divider());
            container.appendChild(await makeDom("div", async unfolistdom => {
                unfolistdom.className = "CKFOMAN-scroll-list";
                unfolistdom.style.width = "100%";
                unfolistdom.style.maxHeight = "calc(50vh - 100px)";
                const unfolist = [];
                for (let unfoid of datas.checked) {
                    if (unfoid in datas.mappings)
                        unfolist.push(datas.mappings[unfoid])
                }
                await renderListTo(unfolistdom, unfolist, false);
            }))
            container.appendChild(await makeDom("div", async btns => {
                btns.style.display = "flex";
                [
                    await makeDom("button", btn => {
                        btn.className = "CKFOMAN-toolbar-btns red";
                        btn.innerHTML = "确认";
                        btn.onclick = e => {
                            const delayDom = get("#CKFOMAN-form-delay");
                            if (delayDom) {
                                try {
                                    let delay = parseFloat(delayDom.value);
                                    datas.settings.batchOperationDelay = Math.max(delay, 0);
                                } catch { }
                            }
                            doUnfollowChecked()
                        }
                    }),
                    await makeDom("button", btn => {
                        btn.className = "CKFOMAN-toolbar-btns";
                        btn.innerHTML = "取消";
                        btn.onclick = e => hideModal();
                    }),
                ].forEach(el => btns.appendChild(el));
            }))
        }))
    }
    const applyFilters = async config => {// TODO: pending a code refactor
        setInfoBar(`正在处理 ...`);
        await alertModal("请稍等", "正在应用选择的筛选器...");
        const cfg = {
            clear: config.clear || "0",
            invalid: config.invalid || "-2",
            vip: config.vip || "-2",
            official: config.official || "-2",
            fans: config.fans || "-2",
            groups: config.groups || "-4",
            special: config.special || "-2",
            beforetime: {
                enabled: config.beforetime.enabled || false,
                before: config.beforetime.before || (new Date).getTime()
            },
            aftertime: {
                enabled: config.aftertime.enabled || false,
                after: config.aftertime.after || 0
            },
            nickKeywordInclude: {
                enabled: config.nickKeywordInclude.enabled || false,
                keyword: config.nickKeywordInclude.keyword || ""
            },
            nickKeywordExclude: {
                enabled: config.nickKeywordExclude.enabled || false,
                keyword: config.nickKeywordExclude.keyword || ""
            },
            verifyKeywordInclude: {
                enabled: config.verifyKeywordInclude.enabled || false,
                keyword: config.verifyKeywordInclude.keyword || ""
            },
            verifyKeywordExclude: {
                enabled: config.verifyKeywordExclude.enabled || false,
                keyword: config.verifyKeywordExclude.keyword || ""
            },
        };
        log("filter", { cfg });
        if (
            cfg.clear === "0"
            && cfg.invalid === "-2"
            && cfg.vip === "-2"
            && cfg.official === "-2"
            && cfg.fans === "-2"
            && cfg.groups === "-4"
            && cfg.special === "-2"
            && cfg.beforetime.enabled === false
            && cfg.aftertime.enabled === false
            && cfg.nickKeywordInclude.enabled === false
            && cfg.nickKeywordExclude.enabled === false
            && cfg.verifyKeywordInclude.enabled === false
            && cfg.verifyKeywordExclude.enabled === false
        ) {
            resetInfoBar();
            return;
        }
        if (cfg.clear === "0") {
            datas.checked = [];
        }
        const filters = {};
        if (cfg.invalid !== "-2") {
            filters.invalid = cfg.invalid === "1";
        }
        if (cfg.vip !== "-2") {
            filters.vip = cfg.vip;
        }
        if (cfg.official !== "-2") {
            filters.official = cfg.official;
        }
        if (cfg.fans !== "-2") {
            filters.fans = cfg.fans;
        }
        if (cfg.special !== "-2") {
            filters.special = cfg.special;
        }
        if (cfg.groups !== "-4") {
            filters.groups = cfg.groups;
        }
        if (cfg.beforetime.enabled) {
            filters.beforetime = parseInt(cfg.beforetime.before);
        }
        if (cfg.aftertime.enabled) {
            filters.aftertime = parseInt(cfg.aftertime.after);
        }
        if (cfg.nickKeywordInclude.enabled && cfg.nickKeywordInclude.keyword.length) {
            filters.nickKeywordInclude = cfg.nickKeywordInclude.keyword;
        }
        if (cfg.nickKeywordExclude.enabled && cfg.nickKeywordExclude.keyword.length) {
            filters.nickKeywordExclude = cfg.nickKeywordExclude.keyword;
        }
        if (cfg.verifyKeywordInclude.enabled && cfg.verifyKeywordInclude.keyword.length) {
            filters.verifyKeywordInclude = cfg.verifyKeywordInclude.keyword;
        }
        if (cfg.verifyKeywordExclude.enabled && cfg.verifyKeywordExclude.keyword.length) {
            filters.verifyKeywordExclude = cfg.verifyKeywordExclude.keyword;
        }
        let checked = [];
        try {
            userloop: for (let mid in datas.mappings) {
                const uid = parseInt(mid);
                const user = datas.mappings[mid];
                log(uid, user);
                for (let filter in filters) {
                    const value = filters[filter];
                    switch (filter) {
                        case "invalid":
                            if (isInvalid(user) !== value) continue userloop;
                            break;
                        case "vip":
                            if (user.vip.vipType != value) continue userloop;
                            break;
                        case "official":
                            if (user.official_verify.type != value) continue userloop;
                            break;
                        case "fans":
                            if (user.attribute == value) continue userloop;
                            break;
                        case "special":
                            if (user.special != value) continue userloop;
                            break;
                        case "groups":
                            switch (value) {
                                case "-3":
                                    if (user.tag !== null) continue userloop;
                                    break;
                                case "-2":
                                    if (user.tag === null) continue userloop;
                                    break;
                                default:
                                    if (!((user.tag instanceof Array) && user.tag.includes(parseInt(value)))) continue userloop;
                            }
                            break;
                        case "beforetime":
                            if (parseInt(user.mtime + "000") > value) continue userloop;
                            break;
                        case "aftertime":
                            if (parseInt(user.mtime + "000") < value) continue userloop;
                            break;
                        case "nickKeywordInclude":
                            log("NickKwInc finding", value.toLowerCase(), "in", user.uname.toLowerCase(), "and", user.sign.toLowerCase());
                            if (!user.uname.toLowerCase().includes(value.toLowerCase()) && !user.sign.toLowerCase().includes(value.toLowerCase())) continue userloop;
                            break;
                        case "nickKeywordExclude":
                            if (user.uname.toLowerCase().includes(value.toLowerCase()) || user.sign.toLowerCase().includes(value.toLowerCase())) continue userloop;
                            break;
                        case "verifyKeywordInclude":
                            if (!user.official_verify?.desc.toLowerCase().includes(value.toLowerCase())) continue userloop;
                            break;
                        case "verifyKeywordExclude":
                            if (user.official_verify?.desc.toLowerCase().includes(value.toLowerCase())) continue userloop;
                            break;
                    }
                }
                checked.push(uid);
                if (!datas.checked.includes(uid) && !datas.checked.includes(uid + "")) {
                    datas.checked.push(uid);
                }
            }
            setInfoBar("正在将筛选应用到列表...");
            await wait(1);
            datas.followings.forEach(it => toggleSwitch(it.mid, datas.checked.includes(parseInt(it.mid))));
            setInfoBar("正在按已选中优先排序...");
            await wait(1);
            datas.followings.sort((x, y) => {
                const xint = (datas.checked.includes(x.mid + "") || datas.checked.includes(parseInt(x.mid))) ? 1 : 0;
                const yint = (datas.checked.includes(y.mid + "") || datas.checked.includes(parseInt(y.mid))) ? 1 : 0;
                return yint - xint;
            })
            await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
            hideModal();
        } catch (e) {
            alertModal("抱歉", "筛选时出现错误，未能完成筛选。");
            log(e);
        }
        resetInfoBar();
        return checked;
    }
    const createMainWindow = async (forceRefetch = false) => {
        showPanel();
        setInfoBar("正在准备获取关注数据...");
        await createScreen(await makeDom("div", dom => {
            dom.style.position = "fixed";
            dom.style.left = "50%";
            dom.style.top = "50%";
            dom.style.transform = "translate(-50%,-50%)";
            dom.style.textAlign = "center";
            dom.innerHTML = `<h2><i class="mdi mdi-account-search-outline" style="color:cornflowerblue"></i><br>正在获取数据</h2>请稍等片刻，不要关闭窗口。`;
        }));
        if (!(await cacheGroupList())) alertModal("警告", "分组数据获取失败。", "确定");
        return getFollowings(forceRefetch)
            .then(async () => {
                return createScreen(await makeDom("div", async screen => {
                    const toolbar = await makeDom("div", async toolbar => {
                        toolbar.style.display = "flex";
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns";
                            btn.innerHTML = '批量操作 <i class="mdi mdi-18px mdi-chevron-down"></i>';
                            //btn.style.background = "#e91e63";
                            btn.onclick = async e => {
                                await openModal("批量操作", await makeDom("div", async container => {
                                    container.style.alignContent = "stretch";
                                    [
                                        datas.isSelf ? await makeDom("button", async btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = '取关选中';
                                            btn.onclick = () => createUnfollowModal();
                                        }) : null,
                                        datas.isSelf ? await makeDom("button", async btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = '复制到分组';
                                            btn.onclick = () => createGroupChangeModal('copy');
                                        }) : null,
                                        datas.isSelf ? await makeDom("button", async btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = '修改分组';
                                            btn.onclick = () => createGroupChangeModal('move');
                                        }) : null,
                                        await makeDom("button", async btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = '批量拉黑(测试)';
                                            btn.onclick = () => createBlockOrFollowModal(true);
                                        }),
                                        (() => {
                                            if (!datas.isSelf) {
                                                return makeDom("button", async btn => {
                                                    btn.className = "CKFOMAN-toolbar-btns";
                                                    btn.style.margin = "4px 0";
                                                    btn.innerHTML = '批量关注(测试)';
                                                    btn.onclick = () => createBlockOrFollowModal(false);
                                                })
                                            } else return null;
                                        })(),
                                        divider(),
                                        await makeDom("button", async btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.innerHTML = '返回';
                                            btn.onclick = () => hideModal();
                                        }),
                                    ].forEach(el => el && container.appendChild(el));
                                }));
                            };
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns";
                            btn.innerHTML = '全选';
                            btn.onclick = e => {
                                setInfoBar("正在处理全选...");
                                const all = getAll(".CKFOMAN-data-inforow-toggle");
                                if (all) {
                                    [...all].forEach(it => {
                                        it.checked = true;
                                        it.onchange();
                                    });
                                }
                                refreshChecked();
                                resetInfoBar();
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns";
                            btn.innerHTML = '反选';
                            btn.onclick = e => {
                                setInfoBar("正在处理反选...");
                                const all = getAll(".CKFOMAN-data-inforow-toggle");
                                if (all) {
                                    [...all].forEach(it => {
                                        it.checked = !it.checked;
                                        it.onchange();
                                    });
                                }
                                refreshChecked();
                                resetInfoBar();
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns";
                            btn.innerHTML = '全不选';
                            btn.onclick = e => {
                                setInfoBar("正在处理取选...");
                                const all = getAll(".CKFOMAN-data-inforow-toggle");
                                if (all) {
                                    [...all].forEach(it => {
                                        it.checked = false;
                                        it.onchange();
                                    });
                                }
                                refreshChecked();
                                resetInfoBar();
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns";
                            btn.innerHTML = '间选';
                            btn.onclick = e => {
                                setInfoBar("正在处理间选...");
                                const all = getAll(".CKFOMAN-data-inforow-toggle");
                                if (all) {
                                    let shouldCheck = false;
                                    for (let el of [...all]) {
                                        if (el.checked === true) {
                                            shouldCheck = !shouldCheck;
                                        } else {
                                            if (shouldCheck) setToggleStatus(el.getAttribute("data-targetmid"), true);
                                        }
                                    }
                                }
                                resetInfoBar();
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns";
                            btn.innerHTML = '筛选 <i class="mdi mdi-18px mdi-chevron-down"></i>';
                            btn.onclick = async e => {
                                //alertModal("施工中", "此功能尚未实现！", "返回");
                                openModal("筛选", await makeDom("div", async container => {
                                    const filtersid = "CKFOMAN-filters";
                                    [
                                        await makeDom("div", async tip => {
                                            tip.innerHTML = "勾选要生效的筛选器"
                                        }),
                                        divider(),
                                        await makeDom("form", async filters => {
                                            filters.id = filtersid;
                                            filters.style.display = "flex";
                                            filters.style.textAlign = "center";
                                            filters.style.flexDirection = "column";
                                            filters.style.flexWrap = "nowrap";
                                            filters.style.alignContent = "center";
                                            filters.style.justifyContent = "space-between";
                                            filters.style.alignItems = "stretch";
                                            [
                                                await makeDom("select", async select => {
                                                    select.id = filtersid + "-clear";
                                                    select.name = "val-clear";
                                                    [
                                                        await makeDom("option", opt => {
                                                            opt.value = "0";
                                                            opt.innerHTML = "应用筛选器时取消已选择项目"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "1";
                                                            opt.innerHTML = "应用筛选器时保留已选择项目"
                                                        }),
                                                    ].forEach(s => select.appendChild(s));
                                                }),
                                                await makeDom("div", div => div.innerHTML = "+"),
                                                await makeDom("select", async select => {
                                                    select.id = filtersid + "-invalid";
                                                    select.name = "val-invalid";
                                                    [
                                                        await makeDom("option", opt => {
                                                            opt.value = "-2";
                                                            opt.innerHTML = "不使用注销账户选择器"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "0";
                                                            opt.innerHTML = "正常账户"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "1";
                                                            opt.innerHTML = "已注销账户"
                                                        }),
                                                    ].forEach(s => select.appendChild(s));
                                                }),
                                                await makeDom("div", div => div.innerHTML = "+"),
                                                await makeDom("select", async select => {
                                                    select.id = filtersid + "-special";
                                                    select.name = "val-special";
                                                    [
                                                        await makeDom("option", opt => {
                                                            opt.value = "-2";
                                                            opt.innerHTML = "不使用特别关注选择器"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "0";
                                                            opt.innerHTML = "非特别关注"
                                                            if (!datas.isSelf) opt.disabled = true;
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "1";
                                                            opt.innerHTML = "特别关注"
                                                            if (!datas.isSelf) opt.disabled = true;
                                                        }),
                                                    ].forEach(s => select.appendChild(s));
                                                }),
                                                await makeDom("div", div => div.innerHTML = "+"),
                                                await makeDom("select", async select => {
                                                    select.id = filtersid + "-vip";
                                                    select.name = "val-vip";
                                                    [
                                                        await makeDom("option", opt => {
                                                            opt.value = "-2";
                                                            opt.innerHTML = "不使用会员选择器"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "0";
                                                            opt.innerHTML = "没有大会员的用户"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "1";
                                                            opt.innerHTML = "月度大会员用户"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "6";
                                                            opt.innerHTML = "年度大会员用户"
                                                        }),
                                                    ].forEach(s => select.appendChild(s));
                                                }),
                                                await makeDom("div", div => div.innerHTML = "+"),
                                                await makeDom("select", async select => {
                                                    select.id = filtersid + "-official";
                                                    select.name = "val-official";
                                                    [
                                                        await makeDom("option", opt => {
                                                            opt.value = "-2";
                                                            opt.innerHTML = "不使用认证账户选择器"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "0";
                                                            opt.innerHTML = "没有认证的用户"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "1";
                                                            opt.innerHTML = "认证用户"
                                                        }),
                                                    ].forEach(s => select.appendChild(s));
                                                }),
                                                await makeDom("div", div => div.innerHTML = "+"),
                                                await makeDom("select", async select => {
                                                    select.id = filtersid + "-fans";
                                                    select.name = "val-fans";
                                                    [
                                                        await makeDom("option", opt => {
                                                            opt.value = "-2";
                                                            opt.innerHTML = "不使用互粉选择器"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "2";
                                                            opt.innerHTML = "单项关注的用户"
                                                            if (!datas.isSelf) opt.disabled = true;
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "6";
                                                            opt.innerHTML = "互粉用户"
                                                            if (!datas.isSelf) opt.disabled = true;
                                                        }),
                                                    ].forEach(s => select.appendChild(s));
                                                }),
                                                await makeDom("div", div => div.innerHTML = "+"),
                                                await makeDom("select", async select => {
                                                    select.id = filtersid + "-groups";
                                                    select.name = "val-groups";
                                                    [
                                                        await makeDom("option", opt => {
                                                            opt.value = "-4";
                                                            opt.innerHTML = "不使用分组选择器"
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "-3";
                                                            opt.innerHTML = "没有分组的用户"
                                                            if (!datas.isSelf) opt.disabled = true;
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "-2";
                                                            opt.innerHTML = "已有分组的用户"
                                                            if (!datas.isSelf) opt.disabled = true;
                                                        }),
                                                    ].forEach(s => select.appendChild(s));
                                                    if (datas.isSelf && Object.keys(datas.tags).length > 0) {
                                                        select.appendChild(await makeDom("option", opt => {
                                                            opt.innerHTML = "------------";
                                                            opt.disabled = true;
                                                        }));
                                                        for (let tag of Object.values(datas.tags)) {
                                                            select.appendChild(await makeDom("option", opt => {
                                                                opt.innerHTML = tag.name;
                                                                opt.value = tag.tagid;
                                                            }))
                                                        }
                                                    }
                                                }),
                                                divider(),
                                                await makeDom("input", async ipt => {
                                                    ipt.id = filtersid + "-keyword-nick-include";
                                                    ipt.name = "val-keyword-nick-include";
                                                    ipt.setAttribute("type", "text");
                                                    ipt.setAttribute("placeholder", "昵称或简介包含关键词");
                                                }),
                                                await makeDom("input", async ipt => {
                                                    ipt.id = filtersid + "-keyword-nick-exclude";
                                                    ipt.name = "val-keyword-nick-exclude";
                                                    ipt.setAttribute("type", "text");
                                                    ipt.setAttribute("placeholder", "昵称或简介排除关键词");
                                                }),
                                                await makeDom("input", async ipt => {
                                                    ipt.id = filtersid + "-keyword-verify-include";
                                                    ipt.name = "val-keyword-verify-include";
                                                    ipt.setAttribute("type", "text");
                                                    ipt.setAttribute("placeholder", "认证包含关键词");
                                                }),
                                                await makeDom("input", async ipt => {
                                                    ipt.id = filtersid + "-keyword-verify-exclude";
                                                    ipt.name = "val-keyword-verify-exclude";
                                                    ipt.setAttribute("type", "text");
                                                    ipt.setAttribute("placeholder", "认证排除关键词");
                                                }),
                                                divider(),
                                                await makeDom("label", async label => {
                                                    label.setAttribute("for", filtersid + "-beforetime");
                                                    label.innerHTML = "在什么日期前关注：";
                                                }),
                                                await makeDom("input", async choose => {
                                                    choose.id = filtersid + "-beforetime";
                                                    choose.name = "val-beforetime";
                                                    choose.setAttribute("type", "date");
                                                }),
                                                divider(),
                                                await makeDom("label", async label => {
                                                    label.setAttribute("for", filtersid + "-aftertime");
                                                    label.innerHTML = "在什么日期后关注：";
                                                }),
                                                await makeDom("input", async choose => {
                                                    choose.id = filtersid + "-aftertime";
                                                    choose.name = "val-aftertime";
                                                    choose.setAttribute("type", "date");
                                                }),
                                            ].forEach(el => filters.appendChild(el));
                                        }),
                                        divider(),
                                        await makeDom("div", async btns => {
                                            btns.style.display = "flex";
                                            btns.style.flexDirection = "row";
                                            btns.style.flexWrap = "nowrap";
                                            btns.style.alignContent = "stretch";
                                            btns.style.justifyContent = "space-around";
                                            btns.style.alignItems = "stretch";
                                            [
                                                await makeDom("button", btn => {
                                                    btn.className = "CKFOMAN-toolbar-btns";
                                                    btn.innerHTML = "应用";
                                                    btn.onclick = async () => {
                                                        const form = get("#" + filtersid);
                                                        const config = {
                                                            clear: form['val-clear'].value + "",
                                                            invalid: form['val-invalid'].value + "",
                                                            vip: form['val-vip'].value + "",
                                                            official: form['val-official'].value + "",
                                                            fans: form['val-fans'].value + "",
                                                            groups: form['val-groups'].value + "",
                                                            special: form['val-special'].value + "",
                                                            beforetime: {
                                                                enabled: form['val-beforetime'].value.length > 0,
                                                                before: form['val-beforetime'].valueAsNumber
                                                            },
                                                            aftertime: {
                                                                enabled: form['val-aftertime'].value.length > 0,
                                                                after: form['val-aftertime'].valueAsNumber
                                                            },
                                                            nickKeywordInclude: {
                                                                enabled: form['val-keyword-nick-include'].value.length > 0,
                                                                keyword: form['val-keyword-nick-include'].value
                                                            },
                                                            nickKeywordExclude: {
                                                                enabled: form['val-keyword-nick-exclude'].value.length > 0,
                                                                keyword: form['val-keyword-nick-exclude'].value
                                                            },
                                                            verifyKeywordInclude: {
                                                                enabled: form['val-keyword-verify-include'].value.length > 0,
                                                                keyword: form['val-keyword-verify-include'].value
                                                            },
                                                            verifyKeywordExclude: {
                                                                enabled: form['val-keyword-verify-exclude'].value.length > 0,
                                                                keyword: form['val-keyword-verify-exclude'].value
                                                            },
                                                        };
                                                        await applyFilters(config);
                                                        hideModal();
                                                    }
                                                }),
                                                await makeDom("button", btn => {
                                                    btn.className = "CKFOMAN-toolbar-btns";
                                                    btn.innerHTML = "取消";
                                                    btn.onclick = () => hideModal();
                                                }),
                                            ].forEach(el => btns.appendChild(el));
                                        })
                                    ].forEach(el => el && container.appendChild(el));
                                }))
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns";
                            btn.innerHTML = '排序 <i class="mdi mdi-18px mdi-chevron-down"></i>';
                            btn.onclick = async e => {
                                openModal("选择排序方式", await makeDom("div", async select => {
                                    select.style.alignContent = "stretch";
                                    select.style.flexDirection = "row";
                                    select.id = "CKFOMAN-sortbtns-container";
                                    [
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "反向当前排序";
                                            btn.onclick = async e => {
                                                setInfoBar("正在反转当前排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.reverse();
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "按昵称排序";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按昵称排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => x.uname.localeCompare(y.uname, "zh-u-kf-lower-kn-true"));
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "已选中优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按已选中优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => {
                                                    const xint = (datas.checked.includes(x.mid + "") || datas.checked.includes(parseInt(x.mid))) ? 1 : 0;
                                                    const yint = (datas.checked.includes(y.mid + "") || datas.checked.includes(parseInt(y.mid))) ? 1 : 0;
                                                    return yint - xint;
                                                })
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "按最新关注";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按最新关注排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.mtime) - parseInt(x.mtime))
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "按最早关注";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按最早关注排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(x.mtime) - parseInt(y.mtime))
                                                await renderListTo(get("#CKFOMAN-MAINLIST"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "大会员优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按大会员优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.vip.vipType) - parseInt(x.vip.vipType))
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "无会员优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按无会员优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(x.vip.vipType) - parseInt(y.vip.vipType))
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "认证优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按认证优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.official_verify.type) - parseInt(x.official_verify.type))
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "无认证优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按无认证优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(x.official_verify.type) - parseInt(y.official_verify.type))
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "已注销优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按已注销优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => {
                                                    const xint = isInvalid(x) ? 1 : 0;
                                                    const yint = isInvalid(y) ? 1 : 0;
                                                    return yint - xint;
                                                })
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "特别关注优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按特别关注优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.special) - parseInt(x.special))
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "互相关注优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按互相关注优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.attribute) - parseInt(x.attribute))
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, true);
                                                hideModal();
                                            }
                                        }),
                                        //divider(),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns CKFOMAN-sortbtns";
                                            btn.innerHTML = "不修改 | 取消";
                                            btn.onclick = e => hideModal();
                                        })
                                    ].forEach(el => select.appendChild(el));
                                }));
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKFOMAN-toolbar-btns";
                            btn.innerHTML = '更多 <i class="mdi mdi-18px mdi-chevron-down"></i>';
                            btn.onclick = async e => {
                                openModal("更多...", await makeDom("div", async select => {
                                    select.style.alignContent = "stretch";
                                    [
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "快速选中...";
                                            btn.onclick = async e => {
                                                hideModal();
                                                await wait(300);
                                                openModal("快速选中", await makeDom("div", async select => {
                                                    select.style.alignContent = "stretch";
                                                    [
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "加选: 悄悄关注用户";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理加选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (d.attribut === 1 || d.isWhisper) {
                                                                        toggleSwitch(d.mid, true);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "加选: 所有已注销用户";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理加选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (isInvalid(d)) {
                                                                        toggleSwitch(d.mid, true);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "加选: 所有两年前的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理加选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (isLongAgo(d.mtime)) {
                                                                        toggleSwitch(d.mid, true);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "加选: 所有两个月内的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理加选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (isNearly(d.mtime)) {
                                                                        toggleSwitch(d.mid, true);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        divider(),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 悄悄关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (d.attribute === 1 || d.isWhisper) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 所有两年前的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (isLongAgo(d.mtime)) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 所有两个月内的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (isNearly(d.mtime)) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 所有有大会员的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                const hasVIP = d => {
                                                                    return d.vip.vipType !== 0;
                                                                }
                                                                for (let d of datas.followings) {
                                                                    if (hasVIP(d)) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 所有认证账号的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                const isVerified = d => {
                                                                    return d.official_verify.type > 0;
                                                                }
                                                                for (let d of datas.followings) {
                                                                    if (isVerified(d)) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 所有特别关注的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                const isSpecial = d => {
                                                                    return d.special === 1;
                                                                }
                                                                for (let d of datas.followings) {
                                                                    if (isSpecial(d)) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 所有互相关注的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (isFans(d)) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 所有有分组的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                const hasGroup = d => {
                                                                    return d.tag !== null;
                                                                }
                                                                for (let d of datas.followings) {
                                                                    if (hasGroup(d)) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        divider(),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKFOMAN-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "不修改 | 取消";
                                                            btn.onclick = e => hideModal();
                                                        })
                                                    ].forEach(el => select.appendChild(el));
                                                }));
                                            }
                                        }),
                                        divider(),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "管理分组 (增加/删除) (Beta)";
                                            if (!datas.isSelf) {
                                                btn.classList.add("grey");
                                                btn.disabled = true;
                                                btn.title = "非个人空间，无法操作。";
                                                btn.onclick = () => createOtherSpaceAlert();
                                            } else btn.onclick = e => createGroupInfoModal();
                                        }),
                                        divider(),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            refreshChecked();
                                            if (datas.checked.length > 0)
                                                btn.innerHTML = "导出所有选中的UID列表..."
                                            else
                                                btn.innerHTML = "导出所有关注的UID列表...";
                                            btn.onclick = async e => {
                                                let list;
                                                if (datas.checked.length > 0)
                                                    list = datas.checked.join(',');
                                                else
                                                    list = Object.keys(datas.mappings).join(',');
                                                let mtitle = "";
                                                if (await copy(list)) {
                                                    mtitle += "✅ 内容已经自动复制到剪贴板, 你可以粘贴到别处";
                                                } else {
                                                    mtitle += "请单击列表并按Ctrl+C手动复制";
                                                }
                                                unsafeWindow.CKFOMAN_EXPORTUIDS = list;
                                                unsafeWindow.CKFOMAN_EXPORTTOFILE = () => {
                                                    download("export_uids.txt", unsafeWindow.CKFOMAN_EXPORTUIDS);
                                                }
                                                mtitle += `，或者：<button class="CKFOMAN-toolbar-btns" onclick="CKFOMAN_EXPORTTOFILE()">保存为文件</button>`
                                                await alertModal("导出UID", `
                                                ${mtitle}
                                                <br>
                                                <textarea readonly style="width: 400px;" onclick="this.select()" >${list}</textarea>
                                                `, "确定");
                                                resetInfoBar();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            refreshChecked();
                                            if (datas.checked.length > 0)
                                                btn.innerHTML = "导出所有选中的UID结构数据..."
                                            else
                                                btn.innerHTML = "导出所有关注的UID结构数据...";
                                            btn.onclick = async e => {
                                                let list;
                                                if (datas.checked.length > 0)
                                                    list = datas.checked//listdom;
                                                else
                                                    list = Object.keys(datas.mappings);
                                                const mapToObj = (uid) => {
                                                    if (datas.mappings.hasOwnProperty(+uid)) {
                                                        const { mid, name, uname, tag } = datas.mappings[+uid];
                                                        let tags = tag?.map(t => datas.tags[t]?.name ?? null).filter(t => !!t);
                                                        return { mid, name: name ?? uname ?? '', tag: tags ?? [] };
                                                    } else return null;
                                                }
                                                let infoList = list.map(it => mapToObj(it)).filter(it => !!it);
                                                let copyList = JSON.stringify(infoList);
                                                let mtitle = "";
                                                if (await copy(copyList)) {
                                                    mtitle += "✅ 内容已经自动复制到剪贴板, 你可以粘贴到别处";
                                                } else {
                                                    mtitle += "请单击列表并按Ctrl+C手动复制";
                                                }
                                                unsafeWindow.CKFOMAN_EXPORTUIDS = copyList;
                                                unsafeWindow.CKFOMAN_EXPORTTOFILE = () => {
                                                    download("export_uids.json", unsafeWindow.CKFOMAN_EXPORTUIDS);
                                                }
                                                mtitle += `，或者：<button class="CKFOMAN-toolbar-btns" onclick="CKFOMAN_EXPORTTOFILE()">保存为文件</button>`
                                                await alertModal("导出UID结构数据", `
                                                ${mtitle}
                                                <br>
                                                <textarea readonly style="width: 400px;" onclick="this.select()" >${copyList}</textarea>
                                                `, "确定");
                                                resetInfoBar();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            refreshChecked();
                                            if (datas.checked.length > 0)
                                                btn.innerHTML = "导出所有被选中的UP的当前缓存数据..."
                                            else
                                                btn.innerHTML = "导出所有关注的UP的当前缓存数据...";
                                            btn.onclick = async e => {
                                                let list;
                                                if (datas.checked.length > 0)
                                                    list = datas.checked;//listdom;
                                                else
                                                    list = Object.keys(datas.mappings);
                                                const mapToObj = (uid) => {
                                                    try {
                                                        console.log(1001, { uid })
                                                        if (datas.mappings.hasOwnProperty(+uid)) {
                                                            const full = datas.mappings[+uid];
                                                            let tags = full.tag?.map(t => datas.tags[t]?.name ?? null).filter(t => !!t);
                                                            return { ...full, tag: tags ?? [] };
                                                        } else return null;
                                                    } catch (err) {
                                                        console.error('e!!', err);
                                                        return null;
                                                    }
                                                }
                                                let infoList = list.map(it => mapToObj(it)).filter(it => !!it);
                                                let copyList = JSON.stringify(infoList);
                                                let mtitle = "";
                                                if (await copy(copyList)) {
                                                    mtitle += "✅ 内容已经自动复制到剪贴板, 你可以粘贴到别处";
                                                } else {
                                                    mtitle += "请单击列表并按Ctrl+C手动复制";
                                                }
                                                unsafeWindow.CKFOMAN_EXPORTUIDS = copyList;
                                                unsafeWindow.CKFOMAN_EXPORTTOFILE = () => {
                                                    download("export_userdetails.json", unsafeWindow.CKFOMAN_EXPORTUIDS);
                                                }
                                                mtitle += `，或者：<button class="CKFOMAN-toolbar-btns" onclick="CKFOMAN_EXPORTTOFILE()">保存为文件</button>`
                                                await alertModal("导出完整缓存数据", `
                                                    ${mtitle}
                                                    <br>
                                                    <textarea readonly style="width: 400px;" onclick="this.select()" >${copyList}</textarea>
                                                    `, "确定");
                                                resetInfoBar();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "从UID列表导入关注...";
                                            if (!datas.isSelf) {
                                                btn.classList.add("grey");
                                                btn.disabled = true;
                                                btn.title = "非个人空间，无法操作。";
                                                btn.onclick = () => createOtherSpaceAlert();
                                            } else
                                                btn.onclick = async e => {
                                                    hideModal();
                                                    await wait(300);
                                                    openModal("导入UID", await makeDom("div", async modaldiv => {
                                                        [
                                                            await makeDom("tip", tip => tip.innerHTML = "请输入导入的UID列表，用英文半角逗号','分割"),
                                                            await makeDom("textarea", input => {
                                                                input.id = "CKFOMAN-import-textarea";
                                                                input.placeholder = "1111111,2222222,3333333..."
                                                            }),
                                                            divider(),
                                                            await makeDom("div", async btns => {
                                                                btns.style.display = "flex";
                                                                [
                                                                    await makeDom("button", btn => {
                                                                        btn.className = "CKFOMAN-toolbar-btns orange";
                                                                        btn.innerHTML = "批量关注";
                                                                        btn.onclick = async e => {
                                                                            const value = get("#CKFOMAN-import-textarea").value;
                                                                            if (value.length === 0) {
                                                                                await alertModal("无法导入", "空白数据", "确定");
                                                                                return;
                                                                            }
                                                                            setInfoBar("正在验证导入");
                                                                            await alertModal("正在导入", "正在处理刚刚输入的列表，请稍等...");
                                                                            const parts = value.split(',');
                                                                            const finalList = [];
                                                                            const followed = Object.keys(datas.mappings);
                                                                            for (let part of parts) {
                                                                                if (part.trim().length === 0) {
                                                                                    log(part, "is empty, skipped");
                                                                                } else if (part.trim().match(/[^0-9]/) === null) {
                                                                                    const int = parseInt(part.trim());
                                                                                    if (followed.includes(int) || followed.includes(int + "")) {
                                                                                        log(part, "has already followed, skipped");
                                                                                    } else if (int <= 0) {
                                                                                        log(part, "smaller than zero, skipped");
                                                                                    } else {
                                                                                        finalList.push(int);
                                                                                    }
                                                                                } else {
                                                                                    log(part, "is not a number, skipped");
                                                                                }
                                                                            }
                                                                            await alertModal("正在导入", `正在导入${finalList.length}个关注...`);
                                                                            const result = await batchOperateUser(finalList, RELE_ACTION.FOLLOW);
                                                                            if (result.ok) {
                                                                                await alertModal("导入完成", `${finalList.length}个关注全部导入成功！`, "确定");
                                                                                return createMainWindow(true);
                                                                            } else {
                                                                                if ("data" in result) {
                                                                                    if (result.data !== null && "failed_fids" in result.data)
                                                                                        await alertModal("导入完成，但部分失败", `尝试导入了${finalList.length}个关注，但是有${result.data.failed_fids.length}个导入失败：
                                                                                <br>
                                                                                <textarea readonly onclick="this.select()">${result.data.failed_fids.join(',')}</textarea>`, "确定");
                                                                                    else
                                                                                        await alertModal("导入失败", `尝试导入了${finalList.length}个关注但失败了，原因：<br><pre>${result.res}</pre>`, "确定");
                                                                                    return createMainWindow(true);
                                                                                } else {
                                                                                    await alertModal("导入失败", `尝试导入了${finalList.length}个关注但失败了，原因：<br><pre>${result.res}</pre>`, "确定");
                                                                                    return createMainWindow(true);
                                                                                }
                                                                            }
                                                                        };
                                                                    }),
                                                                    await makeDom("button", btn => {
                                                                        btn.className = "CKFOMAN-toolbar-btns";
                                                                        btn.innerHTML = "取消操作";
                                                                        btn.onclick = e => hideModal();
                                                                    })
                                                                ].forEach(el => btns.appendChild(el));
                                                            })
                                                        ].forEach(el => modaldiv.appendChild(el));
                                                    }));
                                                }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "基于UID列表批量取关...";
                                            if (!datas.isSelf) {
                                                btn.classList.add("grey");
                                                btn.disabled = true;
                                                btn.title = "非个人空间，无法操作。";
                                                btn.onclick = () => createOtherSpaceAlert();
                                            } else
                                                btn.onclick = async e => {
                                                    hideModal();
                                                    await wait(300);
                                                    openModal("取关UID", await makeDom("div", async modaldiv => {
                                                        [
                                                            await makeDom("tip", tip => tip.innerHTML = "请输入取关的UID列表，用英文半角逗号','分割"),
                                                            await makeDom("textarea", input => {
                                                                input.id = "CKFOMAN-import-textarea";
                                                                input.placeholder = "1111111,2222222,3333333..."
                                                            }),
                                                            divider(),
                                                            await makeDom("div", async btns => {
                                                                btns.style.display = "flex";
                                                                [
                                                                    await makeDom("button", btn => {
                                                                        btn.className = "CKFOMAN-toolbar-btns orange";
                                                                        btn.innerHTML = "批量取关";
                                                                        btn.onclick = async e => {
                                                                            const value = get("#CKFOMAN-import-textarea").value;
                                                                            if (value.length === 0) {
                                                                                await alertModal("无法取关", "空白数据", "确定");
                                                                                return;
                                                                            }
                                                                            setInfoBar("正在验证数据");
                                                                            await alertModal("正在取关", "正在处理刚刚输入的列表，请稍等...");
                                                                            const parts = value.split(',');
                                                                            const finalList = [];
                                                                            const followed = Object.keys(datas.mappings);
                                                                            for (let part of parts) {
                                                                                if (part.trim().length === 0) {
                                                                                    log(part, "is empty, skipped");
                                                                                } else if (part.trim().match(/[^0-9]/) === null) {
                                                                                    const int = parseInt(part.trim());
                                                                                    if (!followed.includes(int) && !followed.includes(int + "")) {
                                                                                        log(part, "has not been followed, skipped");
                                                                                    } else if (int <= 0) {
                                                                                        log(part, "smaller than zero, skipped");
                                                                                    } else {
                                                                                        finalList.push(int);
                                                                                    }
                                                                                } else {
                                                                                    log(part, "is not a number, skipped");
                                                                                }
                                                                            }
                                                                            await alertModal("正在取关", `正在取消${finalList.length}个关注...`);
                                                                            const result = await unfollowUsers(finalList);
                                                                            if (result.ok) {
                                                                                await alertModal("批量取关完成", `${finalList.length}个关注全部取关成功！`, "确定");
                                                                                return createMainWindow(true);
                                                                            } else {
                                                                                if ("data" in result) {
                                                                                    if (result.data !== null && "failed_fids" in result.data)
                                                                                        await alertModal("批量取关完成，但部分失败", `尝试移除了${finalList.length}个关注，但是有${result.data.failed_fids.length}个移除失败：
                                                                                <br>
                                                                                <textarea readonly onclick="this.select()">${result.data.failed_fids.join(',')}</textarea>`, "确定");
                                                                                    else
                                                                                        await alertModal("批量取关失败", `尝试移除了${finalList.length}个关注但失败了，原因：<br><pre>${result.res}</pre>`, "确定");
                                                                                    return createMainWindow(true);
                                                                                } else {
                                                                                    await alertModal("批量取关失败", `尝试移除了${finalList.length}个关注但失败了，原因：<br><pre>${result.res}</pre>`, "确定");
                                                                                    return createMainWindow(true);
                                                                                }
                                                                            }
                                                                        };
                                                                    }),
                                                                    await makeDom("button", btn => {
                                                                        btn.className = "CKFOMAN-toolbar-btns";
                                                                        btn.innerHTML = "取消操作";
                                                                        btn.onclick = e => hideModal();
                                                                    })
                                                                ].forEach(el => btns.appendChild(el));
                                                            })
                                                        ].forEach(el => modaldiv.appendChild(el));
                                                    }));
                                                }
                                        }),
                                        divider(),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "重新载入列表";
                                            btn.onclick = async e => {
                                                await alertModal("重新载入列表", "正在重新载入列表。此重载不会重新获取数据。");
                                                datas.dommappings = {};
                                                await renderListTo(get("#CKFOMAN-MAINLIST"), datas.followings, false);
                                                resetInfoBar();
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "重新载入数据";
                                            btn.onclick = async e => {
                                                await alertModal("重新载入数据", "正在重新载入数据和列表。将会重新获取所有数据。");
                                                datas.dommappings = {};
                                                await createMainWindow(true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("div", div => {
                                            div.style.margin = "4px 0";
                                            const size = CacheManager.getSize();
                                            div.innerHTML = "ℹ 本地缓存空间已占用 " + size + " MB。";
                                            if (size < 1.8) {
                                                div.innerHTML += "无需处理。定期整理缓存可以减少空间占用。";
                                            } else if (size < 2.5) {
                                                div.innerHTML += "<b>建议整理缓存。</b>";
                                            } else {
                                                div.innerHTML += "<b>建议整理或清理缓存以避免缓存空间超出配额。</b>";
                                            }
                                            div.onclick = e => showCacheQuotaModal();
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "整理缓存";
                                            btn.onclick = async e => {
                                                await alertModal("整理缓存", "正在整理缓存并移除额外数据，稍后会重新加载。");
                                                CacheManager.prune();
                                                await alertModal("重新载入数据", "正在重新载入数据和列表。");
                                                datas.dommappings = {};
                                                await createMainWindow();
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "清空缓存";
                                            btn.onclick = async e => {
                                                await alertModal("清空全部缓存", "正在清空全部缓存，稍后会自动重新加载所有数据。");
                                                CacheManager.clean();
                                                await alertModal("重新载入数据", "正在重新载入数据和列表。将会重新获取所有数据。");
                                                datas.dommappings = {};
                                                await createMainWindow(true);
                                                hideModal();
                                            }
                                        }),
                                        divider(),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = `实验性功能(${datas.settings.enableExpermentals ? "已启用" : "已禁用"})`;
                                            btn.onclick = async e => {
                                                enableExpermentalFeaturesModal();
                                            }
                                        }),
                                        divider(),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "关于和反馈";
                                            btn.onclick = async e => {
                                                await alertModal("关于 “关注管理器 FoMan”", (await makeDom("div", async div => {
                                                    div.style.textAlign = "left";
                                                    div.style.width = "400px";
                                                    [
                                                        document.createElement("br"),
                                                        await makeDom("i", i => {
                                                            i.className = "mdi mdi-48px mdi-broom"
                                                            i.style.color = "#0091ea";
                                                            i.style.textAlign = "center";
                                                            i.style.display = "block";
                                                            i.style.width = "fit-content";
                                                            i.style.margin = "0 auto";
                                                        }),
                                                        document.createElement("br"),
                                                        await makeDom("p", span =>
                                                            span.innerHTML = `版本: v${cfg.VERSION}<br>`
                                                            + `License: GPLv3<br>`
                                                            + `作者: CKylinMC`
                                                        ),
                                                        await makeDom("p", span =>
                                                            span.innerHTML = `脚本首页: <a href="https://greasyfork.org/zh-CN/scripts/428895">GreasyFork</a> | <a href="https://github.com/CKylinMC/UserJS">Github</a>`
                                                        ),
                                                        divider(),
                                                        await makeDom("p", span =>
                                                            span.innerHTML = `如果出现问题，请前往GreasyFork反馈区或Github Issues进行反馈，如果好用，还请给我一个好评！十分感谢！`
                                                        ),
                                                        document.createElement("br"),
                                                    ].forEach(el => div.appendChild(el));
                                                })).outerHTML, "确定");
                                                resetInfoBar();
                                            }
                                        }),
                                        divider(),
                                        await makeDom("button", btn => {
                                            btn.className = "CKFOMAN-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "返回";
                                            btn.onclick = e => hideModal();
                                        })
                                    ].forEach(el => select.appendChild(el));
                                }));
                            }
                        }))
                    });
                    const list = await makeDom("div", async list => {
                        list.className = "CKFOMAN-scroll-list";
                        list.id = "CKFOMAN-MAINLIST";
                        await renderListTo(list, datas.followings, !forceRefetch);
                    })
                    screen.appendChild(toolbar);
                    screen.appendChild(list);
                }));
            })
            .catch(async (e) => {
                log(e);
                setInfoBar();
                let errtitle = "获取数据失败";
                let errdesc = "请尝试刷新页面重试";
                log(datas.fetchstat);
                switch (datas.fetchstat) {
                    case "GUEST-LIMIT":
                        errtitle = "访客限制";
                        errdesc = "由于访客限制，获取数据失败。"
                        break;
                    case "PERMS-DENIED":
                        errtitle = "无权查看";
                        errdesc = "由于当前空间主人已设置访客不可见，因此无法查看到任何信息。"
                        break;
                }
                createScreen(await makeDom("div", dom => {
                    dom.style.position = "fixed";
                    dom.style.left = "50%";
                    dom.style.top = "50%";
                    dom.style.transform = "translate(-50%,-50%)";
                    dom.style.textAlign = "center";
                    dom.innerHTML = `<h2><i class="mdi mdi-alert-remove" style="color:orangered;font-size: xx-large"></i><br>${errtitle}</h2>${errdesc}`;
                }));
            })
    }
    const setToggleStatus = (mid, status = false, operateDom = true) => {
        if (operateDom) {
            const selection = getAll(`input.CKFOMAN-data-inforow-toggle[data-targetmid="${mid}"]`);
            if (selection) {
                for (let el of selection) {
                    el.checked = status;
                }
            }
        }
        if (status) {
            if (!datas.checked.includes(mid + "") && !datas.checked.includes(parseInt(mid)))
                datas.checked.push(mid);
        } else {
            if (datas.checked.includes(mid + "")) datas.checked.splice(datas.checked.indexOf(mid + ""), 1);
            else if (datas.checked.includes(parseInt(mid))) datas.checked.splice(datas.checked.indexOf(parseInt(mid)), 1);
        }
        resetInfoBar();
    }
    const renderListTo = async (dom, datalist = datas.followings, cacheAndreuse = false) => {
        setInfoBar("正在渲染列表...");
        await wait(1);
        const isMainList = cacheAndreuse || datalist === datas.followings;
        dom.innerHTML = '';
        const getDomForData = async it => {
            if (cacheAndreuse && (datas.dommappings[it.mid + ""] && datas.dommappings[it.mid + ""] instanceof HTMLElement)) return datas.dommappings[it.mid + ""];
            return upinfoline(it);
        }
        for (let it of datalist) {
            const upinfolinedom = await getDomForData(it);
            dom.appendChild(upinfolinedom);
            if (isMainList) datas.dommappings[it.mid + ""] = upinfolinedom;
        }
        resetInfoBar();
    }
    const renderTagListTo = async (dom, selectedId = [], cb = () => { }, inManager = true) => {
        setInfoBar("正在渲染列表...");
        await wait(100);
        dom.innerHTML = '';
        for (let it of Object.values(datas.tags)) {
            log(it);
            dom.appendChild(await taginfoline(it, cb, selectedId.includes(it.tagid), inManager, inManager));
        }
        resetInfoBar();
    }
    const createScreen = async (content) => {
        getContainer().innerHTML = '';
        getContainer().appendChild(content);
    }

    const callAlertWindow = () => {
        cfg.closedByBlocker++;
        if (cfg.I_KNOW_WHAT_IM_DOING) return hideModal();
        cfg.disableCloseModalFromBlockWindow = true;
        const waitTimer = cfg.debug ? 10 : 5;
        alertModal("等一下，这不是正确的关闭方式！",
            `点击空白处可以关闭弹窗，但是有些窗口下这样可能会导致未知问题，<b>请尽量减少使用此方式关闭弹窗。</b>${cfg.debug ? "<br><br><i>修改脚本第53行附近的'I_KNOW_WHAT_IM_DOING:false'的false为true可以永久阻止此弹窗出现直到下一次更新。</i>" : ""}<br><br>此消息每页面只会显示一次，此窗口 ${waitTimer} 秒后自动关闭。<br><progress value=0 max=100 style="width: 100%;height: 4px" id='CKFOMAN-TIMERPROGRESS'></progress>`);
        wait(10).then(async () => {
            await CKTools.waitForDom('#CKFOMAN-TIMERPROGRESS');
            const interval = setInterval(() => {
                const pg = CKTools.get('#CKFOMAN-TIMERPROGRESS');
                if (!pg) return (log('pg not found', pg ?? null), clearInterval(interval));
                pg.value = pg.value + (cfg.debug ? 1 : 2);
                if (pg > 100) return (log('pg is full', pg ?? null), clearInterval(interval));
            }, 100);
        });
        wait((waitTimer * 1000) + 100).then(() => {
            cfg.disableCloseModalFromBlockWindow = false;
            hideModal();
        });
    }


    // modified from https://socialsisteryi.github.io/bilibili-API-collect/docs/misc/sign/wbi.html#javascript
    const mixinKeyEncTab = [
        46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
        33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
        61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
        36, 20, 34, 44, 52
    ];
    function getMixinKey(orig) {
        let temp = ''
        mixinKeyEncTab.forEach((n) => {
            temp += orig[n]
        })
        return temp.slice(0, 32)
    }
    function encWbi(params, img_key, sub_key) {
        const mixin_key = getMixinKey(img_key + sub_key),
            curr_time = Math.round(Date.now() / 1000),
            chr_filter = /[!'()*]/g
        let query = []
        Object.assign(params, { wts: curr_time })
        Object.keys(params).sort().forEach((key) => {
            query.push(
                `${encodeURIComponent(key)}=${encodeURIComponent(
                    params[key].toString().replace(chr_filter, '')
                )}`
            )
        })
        let querystr = query.join('&')
        const wbi_sign = md5(querystr + mixin_key)
        return querystr + '&w_rid=' + wbi_sign
    }
    async function getWbiKeys() {
        if (s.get('wbi.keys')) return s.get('wbi.keys');
        const resp = await fetch('https://api.bilibili.com/x/web-interface/nav', {
        }).then(resp => resp.json()).catch(e => { log("Failed to fetch wbi identity:", e) }),
            json_content = resp,
            img_url = json_content.data.wbi_img.img_url,
            sub_url = json_content.data.wbi_img.sub_url

        const keys = {
            img_key: img_url.slice(
                img_url.lastIndexOf('/') + 1,
                img_url.lastIndexOf('.')
            ),
            sub_key: sub_url.slice(
                sub_url.lastIndexOf('/') + 1,
                sub_url.lastIndexOf('.')
            )
        }
        s.set('wbi.keys', keys);
        log("Refreshed WBI keys");
        return keys;
    }
    async function getWbiSignedParams(params = {}) {
        return new Promise(r => {
            getWbiKeys().then((wbi_keys) => {
                const query = encWbi(
                    params,
                    wbi_keys.img_key,
                    wbi_keys.sub_key
                )
                r(query);
            })
        })
    }

    const closeModalFromBlockWindow = () => {
        if (cfg.disableCloseModalFromBlockWindow) return;
        if (!cfg.closedByBlocker) {
            cfg.closedByBlocker = 1;
        } else if (cfg.closedByBlocker == 3) {
            callAlertWindow();
        } else {
            cfg.closedByBlocker++;
            closeModal();
        }
    }

    const blockWindow = (block = true) => {
        addStyle(`
        #CKFOMAN-blockWindow{
            z-index: 99005;
            display: block;
            background: #00000080;
            opacity: 0;
            transition: all .3s;
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
        }
        #CKFOMAN-blockWindow.hide{
            pointer-events: none;
            opacity: 0;
        }
        #CKFOMAN-blockWindow.show{
            opacity: 1;
        }
        `, "CKFOMAN-blockWindow-css", "unique");
        let dom = get("#CKFOMAN-blockWindow");
        if (!dom) {
            dom = document.createElement("div");
            dom.id = "CKFOMAN-blockWindow";
            dom.className = "hide";
            document.body.appendChild(dom);
        }
        dom.onclick = e => closeModalFromBlockWindow();
        datas.preventUserCard = block;
        if (block) {
            dom.className = "show";
        } else {
            dom.className = "hide";
        }
    }

    const injectSideBtn = () => {
        addStyle(`
        #CKFOMAN-floatbtn{
            box-sizing: border-box;
            z-index: 9999;
            position: fixed;
            left: -15px;
            width: 30px;
            height: 30px;
            background: black;
            opacity: 0.8;
            color: white;
            cursor: pointer;
            border-radius: 50%;
            text-align: right;
            line-height: 24px;
            border: solid 3px #00000000;
            transition: opacity .3s 1s, background .3s, color .3s, left .3s, border .3s;
            top: 120px;
            top: 30vh;
        }
        #CKFOMAN-floatbtn::after,#CKFOMAN-floatbtn::before{
            z-index: 9990;
            content: "关注管理器";
            pointer-events: none;
            position: fixed;
            left: -20px;
            height: 30px;
            background: black;
            opacity: 0;
            color: white;
            cursor: pointer;
            border-radius: 8px;
            padding: 0 12px;
            text-align: right;
            line-height: 30px;
            transition: all .3s;
            top: 123px;
            top: 30vh;
        }
        #CKFOMAN-floatbtn::after{
            content: "← 关注管理器";
            animation:CKFOMAN-tipsOut forwards 5s 3.5s;
        }
        #CKFOMAN-floatbtn:hover::before{
            left: 30px;
            opacity: 1;
        }
        #CKFOMAN-floatbtn:hover{
            border: solid 3px black;
            transition: opacity .3s 0s, background .3s, color .3s, left .3s, border .3s;
            background: white;
            color: black;
            opacity: 1;
            left: -5px;
        }
        #CKFOMAN-floatbtn.hide{
            left: -40px;
        }
        @keyframes CKFOMAN-tipsOut{
            5%,95%{
                opacity: 1;
                left: 20px;
            }
            0%,100%{
                left: -20px;
                opacity: 0;
            }
        }
        `, "CKFOMAN-floatbtn-css", "unique");

        const toggle = document.createElement("div");
        toggle.id = "CKFOMAN-floatbtn";
        toggle.innerHTML = `<i class="mdi mdi-18px mdi-wrench" style="display: inline-block;transform: rotateY(180deg) translateX(3px);"></i>`;
        toggle.onclick = () => createMainWindow();
        document.body.appendChild(toggle);
    }

    const startInject = () => {
        if (!unsafeWindow.FoManPlugins) {
            unsafeWindow.FoManPlugins = {}
        }
        initModal();
        // unsafeWindow.addEventListener("message", event => {
        //     if (!event.data) return;
        //     if (!(event.data instanceof String)) return;
        //     if (event.data.startsWith("CKFOMANSTATUSCHANGES|")) {
        //         log(event.data)
        //         const parts = event.data.split("|");
        //         setToggleStatus(parts[1], parts[2] === "1");
        //     }
        // })
        injectSideBtn();
        if (cfg.debug) {
            unsafeWindow.CKFOMAN_DBG = {
                cfg, datas
            }
        }
        unsafeWindow.openFollowManager = forceRefetch => createMainWindow(forceRefetch);
    };

    startInject();
})();
