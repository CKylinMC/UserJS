// ==UserScript==
// @name         [Bilibili] 关注管理器
// @namespace    ckylin-bilibili-manager
// @version      0.2.10
// @description  快速排序和筛选你的关注列表，一键取关不再关注的UP等
// @author       CKylinMC
// @updateURL    https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-bilibili-unfollow.user.js
// @supportURL   https://github.com/CKylinMC/UserJS
// @include      http://space.bilibili.com/*
// @include      https://space.bilibili.com/*
// @connect      api.bilibili.com
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceText
// @grant        unsafeWindow
// @license      GPL-3.0-only
// @compatible   chrome 80+
// @compatible   firefox 74+
// ==/UserScript==
(function () {
    'use strict';
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
        autoExtendInfo: true,
        batchOperationDelay: .5
    };
    const cfg = {
        debug: false,
        retrial: 3,
        VERSION: "0.2.10 Beta",
        infobarTemplate: ()=>`共读取 ${datas.fetched} 条关注`,
        titleTemplate: ()=>`<h1>关注管理器 <small>v${cfg.VERSION} ${cfg.debug?"debug":""}</small></h1>`
    }
    const get = q => document.querySelector(q);
    const getAll = q => document.querySelectorAll(q);
    const wait = t => new Promise(r => setTimeout(r, t));
    const batchDelay = async () => await wait(datas.batchOperationDelay*1000);
    const log = (...m) => cfg.debug && console.log('[Unfollow]', ...m);
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
    const _ = async (func = () => {
    }, ...args) => await func(...args);
    const makeDom = async (domname, func = () => {
    }, ...args) => {
        const d = document.createElement(domname);
        await _(func, d, ...args);
        return d;
    };
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
            "cookie": unsafeWindow.document.cookie,
            "origin": "space.bilibili.com",
            "referer": "https://www.bilibili.com/"
        }
    };
    const getUInfoURL = uid => `https://api.bilibili.com/x/space/acc/info?mid=${uid}`;
    const getGroupURL = () => `https://api.bilibili.com/x/relation/tags`;
    const getWhispersURL = (pn,ps=50) => `https://api.bilibili.com/x/relation/whispers?pn=${pn}&ps=${ps}&order=desc&order_type=attention`;
    const getFetchURL = (uid, pn) => `https://api.bilibili.com/x/relation/followings?vmid=${uid}&pn=${pn}&ps=50&order=desc&order_type=attention`;
    const getUnfolURL = () => `https://api.bilibili.com/x/relation/modify`;
    const getFollowURL = () => `https://api.bilibili.com/x/relation/batch/modify`;
    const getLatestVidURL = uid => `https://api.bilibili.com/x/space/arc/search?mid=${uid}&ps=1&pn=1`
    const getSubInfoURL = uid => `https://api.bilibili.com/x/relation/stat?vmid=${uid}`;
    const getCreateGroupURL = ()=> `https://api.bilibili.com/x/relation/tag/create`;
    const getRenameGroupURL = ()=> `https://api.bilibili.com/x/relation/tag/update`;
    const getRemoveGroupURL = ()=> `https://api.bilibili.com/x/relation/tag/del`;
    const getMoveToGroupURL = ()=> `https://api.bilibili.com/x/relation/tags/addUsers`;
    const getCopyToGroupURL = ()=> `https://api.bilibili.com/x/relation/tags/copyUsers`;
    const getDynamicURL = (selfid,hostid)=>`https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?visitor_uid=${selfid}&host_uid=${hostid}&offset_dynamic_id=0&need_top=1&platform=web`;
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
        }catch(err){
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
        }catch(err){
            log(err);
            return false;
        } finally {
            await cacheGroupList();
            CacheManager.save();
            await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
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
        }catch(err){
            log(err);
            return false;
        } finally {
            await cacheGroupList();
            CacheManager.save();
            await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
            resetInfoBar();
        }
    }
    const moveUserToDefaultGroup = uids => moveUserToGroup(uids, [0]);
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
                    targetUser.tag = tagids.map(i=>parseInt(i))
                }
                return true;
            }
            else throw new Error(jsonData.message);
        }catch(err){
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
            log(jsonData,jsonData.code,jsonData.code===0);//TODO:BUG
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
                            if(!tag.includes(ntid)) tag.push(ntid)
                        }
                        return tag;
                    })()
                }
                return true;
            }
            else throw new Error(jsonData.message);
        }catch(err){
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
            const jsonData = await (await fetch(getRequest(getLatestVidURL(uid)))).json();
            if (jsonData && jsonData.code === 0) {
                if (
                    jsonData.data
                    && jsonData.data.list
                ) {
                    let mostCates = "";
                    if (jsonData.data.list.tlist.length !== 0) {
                        let max = 0, name="";
                        for(let itemname of Object.keys(jsonData.data.list.tlist)){
                            const item = jsonData.data.list.tlist[itemname];
                            if(item.count>max){
                                max = item.count;
                                name= item.name;
                            }else if(item.count===max){
                                name+= "、"+item.name;
                            }
                        }
                        mostCates = name;
                    }
                    if (jsonData.data.list.vlist.length === 0) {
                        return {ok: false,mostCates:mostCates}
                    }
                    const vid = jsonData.data.list.vlist[0];
                    return {ok: true, value: vid.created,vinfo: {aid:vid.aid,title:vid.title,pic:vid.pic,play:vid.play},mostCates:mostCates}
                } else {
                    return {ok: false}
                }
            } else {
                return {ok: false}
            }
        } catch (e) {
            log(uid,e)
            return {ok: false}
        }
    };
    const parseDynamic = (d)=>{
        const dynamic = {
            id: d.desc.dynamic_id_str,
            sender:d.desc.user_profile,
            like: d.desc.like,
            comment: d.desc.comment,
            repost: d.desc.repost,
            status: d.desc.status,
            timestamp: d.desc.timestamp,
            type: d.desc.type,
            content: d.card.item.content||d.card.item.description,
            istop: d.extra.is_space_top===1,
            isrepost: d.desc.orig_dy_id!==0,
            publisher: d.desc.orig_dy_id===0?d.card.user:d.card.origin_user.info,
        };
        return dynamic;
    }
    const getDynamic = async uid => {
        try {
            const jsonData = await (await fetch(getRequest(getDynamicURL(datas.self,uid)))).json();
            if (jsonData && jsonData.code === 0) {
                const data = jsonData.data.cards;
                const dynamics = {
                    top:null,
                    next:null,
                }
                if(!data || data.length === 0) {
                    return dynamics;
                }
                let d = data.shift();
                d.card = JSON.parse(d.card);
                let obj = parseDynamic(d);
                if(obj.istop){
                    dynamics.top = obj;
                    let nd = data.shift();
                    nd.card = JSON.parse(nd.card);
                    let nobj = parseDynamic(nd);
                    dynamics.next = nobj;
                }else{
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
    const getUserStats = async uid => {
        try {
            const jsonData = await (await fetch(getRequest(getUInfoURL(uid)))).json();
            if (jsonData && jsonData.code === 0) {
                const udata = jsonData.data;
                return {
                    ok: true,
                    level: udata.level,
                    banned: udata.silence === 1,
                    RIP: udata.sys_notice === 20,
                    disputed: udata.sys_notice === 8,
                    notice: udata.sys_notice,
                    sign: udata.sign,
                    cates: udata.tags,
                    lives: udata.live_room
                }
            }
        } catch (e) {

        }
        return {ok: false}
    }
    const fillUserStatus = async uid => {
        setInfoBar(`正在为${uid}填充用户信息`)
        uid = parseInt(uid);
        if(datas.mappings[uid].filled){
            log(uid,"already filled")
            resetInfoBar();
            return;
        }
        const userinfo = await getUserStats(uid);
        if (userinfo.ok) {
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
                log(uid,lastUpdate)
                if (lastUpdate.ok) {
                    datas.mappings[uid].lastUpdate = lastUpdate.value;
                    datas.mappings[uid].lastUpdateInfo = lastUpdate.vinfo;
                }
                if(lastUpdate.mostCates) datas.mappings[uid].mostCates = lastUpdate.mostCates;
            }
            log(uid, datas.mappings[uid]);
        } else {
            log(uid, "fetch space info failed");
        }
        resetInfoBar();
    }
    const RELE_ACTION = {
        FOLLOW:1,
        UNFOLLOW:2,
        WHISPER:3,
        UNWHISPER:4,
        BLOCK:5,
        UNBLOCK:6,
        KICKFANS:7
    }
    const batchOperateUser = async (uids = [], actCode) => {
        if (uids.length === 0) return {ok: false, res: "UIDS is empty"};
        if(!Object.values(RELE_ACTION).includes(actCode)){
            if(Object.keys(RELE_ACTION).includes(actCode)){
                actCode = RELE_ACTION[actCode];
            }else{
                return {ok: false, res: "Unknown action code"};
            }
        }
        const act = actCode;
        log("Batch Operating with Action Code",act);
        const operate = async(_uids,_act)=>{
            try {
                const jsonData = await (await fetch(getPostRequest(getFollowURL(), new URLSearchParams(`fids=${_uids.join(',')}&act=${_act}&re_src=11&jsonp=jsonp&csrf=${getCSRFToken()}`)))).json()
                if (jsonData && jsonData.code === 0) return {ok: true, uids, res: ""};
                return {ok: false, uids, res: jsonData.message, data: jsonData.data};
            } catch (e) {
                return {ok: false, uids, res: e.message};
            }
        }
        const list = [...uids];
        const results = {ok:true,uids,res:"",data:{failed_fids:[],failed_results:[]}};//failed_fids
        if(list.length>50) log("WARNING: Operating with more than 50 items, it may cause some issues.");
        while(list.length){
            const currents = list.splice(0,50);
            const result = await operate(currents,act);
            if(!result.ok){
                results.ok = false;
                results.res="部分请求出现错误";
                results.data.failed_fids.concat(result.data.failed_fids);
                results.data.failed_results.push(result);
            }
        }
        log("Results:",results);
        return results;
    }
    const convertToWhisper = async (uids)=>{
        log("Unfollowing",uids);
        let unfo = uids.length===1?await operateUser(uids[0],RELE_ACTION.UNFOLLOW):await batchOperateUser(uids,RELE_ACTION.UNFOLLOW);
        log("Unfollowed:",unfo);
        if(!unfo.ok) return unfo;
        log("Whispering",uids);
        let whis = uids.length===1?await operateUser(uids[0],RELE_ACTION.WHISPER):await batchOperateUser(uids,RELE_ACTION.WHISPER);
        log("Whispered:",whis);
        return whis;
    }
    const convertToFollow = async (uids)=>{
        log("Unwhispering",uids);
        let unwh = uids.length===1?await operateUser(uids[0],RELE_ACTION.UNWHISPER):await batchOperateUser(uids,RELE_ACTION.UNWHISPER);
        log("Unwhispered:",unwh);
        if(!unwh.ok) return unwh;
        log("Following",uids);
        let foll = uids.length===1?await operateUser(uids[0],RELE_ACTION.FOLLOW):await batchOperateUser(uids,RELE_ACTION.FOLLOW);
        log("Followed:",foll);
        return foll;
    }
    const operateUser = async (uid, actCode) => {
        if(!Object.values(RELE_ACTION).includes(actCode)){
            if(Object.keys(RELE_ACTION).includes(actCode)){
                actCode = RELE_ACTION[actCode];
            }else{
                return {ok: false, res: "Unknown action code"};
            }
        }
        const act = actCode;
        log("Operating with Action Code",act);
        try {
            const jsonData = await (await fetch(getPostRequest(getUnfolURL(), new URLSearchParams(`fid=${uid}&act=${act}&re_src=11&jsonp=jsonp&csrf=${getCSRFToken()}`)))).json()
            if (jsonData && jsonData.code === 0) return {ok: true, uid, res: ""};
            return {ok: false, uid, res: jsonData.message};
        } catch (e) {
            return {ok: false, uid, res: e.message};
        }
    }
    const unfollowUser = async (uid,iswhisper=false) => {
        try {
            if(datas.isSelf){
                iswhisper = datas.mappings[uid].attribute===1 || datas.mappings[uid].isWhisper;
            }
            return operateUser(uid,iswhisper?RELE_ACTION.UNWHISPER:RELE_ACTION.UNFOLLOW);
        } catch (e) {
            return {ok: false, uid, res: e.message};
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
                    if(jsonData.code === 22115) {
                        retry = -1;
                        datas.fetchstat = "PERMS-DENIED";
                        throw "Permission denied.";
                    }
                }
                log("Unexcept fetch result", "retry:", retry, "uid:", uid, "p:", page, "data", jsonData)
            } catch (e) {
                if(datas.fetchstat==="OK")datas.fetchstat = "ERRORED";
                log("Errored while fetching followings", "retry:", retry, "uid:", uid, "p:", page, "e:", e);
            }
        }
        return null;
    }
    const fetchWhisperFollowings = async (uid, page = 1) => {
        if(!datas.isSelf) return null;
        let retry = cfg.retrial;
        while (retry-- > 0) {
            try {
                const jsonData = await (await fetch(getRequest(getWhispersURL(page)))).json();
                if (jsonData) {
                    if (jsonData.code === 0) {
                        for(let item of jsonData.data.list){
                            item.isWhisper = true;
                        }
                        return jsonData;
                    }
                    if (jsonData.code === 22007) {
                        retry = -1;
                        datas.fetchstat = "GUEST-LIMIT";
                        throw "Not the owner of uid " + uid;
                    }
                    if(jsonData.code === 22115) {
                        retry = -1;
                        datas.fetchstat = "PERMS-DENIED";
                        throw "Permission denied.";
                    }
                }
                log("Unexcept fetch result", "retry:", retry, "uid:", uid, "p:", page, "data", jsonData)
            } catch (e) {
                if(datas.fetchstat==="OK")datas.fetchstat = "ERRORED";
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
        log("Fetching followings with param force =",force?"true":"false");
        cfg.infobarTemplate = ()=>`共读取 ${datas.fetched} 条关注`;
        datas.status = 1;
        datas.checked = [];
        let currentPageNum = 1;
        const uid = await getCurrentUid();
        const self = await getSelfId();
        datas.currUid = uid;
        datas.self = self;
        if (self === -1) {
            alertModal("没有登录", "你没有登录，部分功能可能无法正常工作。", "确定");
            log("Not login");
        } else if (self === 0) {
            alertModal("获取当前用户信息失败", "无法得知当前页面是否为你的个人空间，因此部分功能可能无法正常工作。", "确定");
            log("Failed fetch current user");
        } else if (self + "" !== uid) {
            alertModal("他人的关注列表", "这不是你的个人空间，因此获取的关注列表也不是你的列表。<br>非本人关注列表最多显示前250个关注。<br>你仍然可以对其进行筛选，但是不能进行操作。", "确定");
            log("Other's space.");
        } else if (self + "" === uid) {
            datas.isSelf = true;
        }
        cfg.titleTemplate = ()=>`<h1>关注管理器 <small>v${cfg.VERSION} ${cfg.debug?"debug":""} <span style="color:grey;font-size:x-small;margin-right:12px;float:right">当前展示: UID:${datas.currUid} ${datas.isSelf?"(你)":`(${document.title.replace("的个人空间_哔哩哔哩_bilibili","")})`}</span></small></h1>`
        setTitle();
        let needreload = force || !CacheManager.load();
        const currInfo = await getCurrSubStat(uid);
        if (datas.currInfo.following !== -1 && currInfo !== null) {
            if (force === false && datas.currInfo.following === currInfo.following && datas.currInfo.whisper === currInfo.whisper) {
                if (datas.fetched > 0)
                    needreload = false;
            } else if(!needreload && (datas.currInfo.following !== currInfo.following || datas.currInfo.whisper !== currInfo.whisper)){
                alertModal("自动重新加载","检测到数据变化，已经自动重新加载。","确定");
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
            log("isSelf? ",datas.isSelf);
            if(datas.isSelf){
                setInfoBar(`正在查询悄悄关注数据`);
                let whisperPageNum =1;
                let fetched = 0;
                const whisperPages = Math.floor(datas.currInfo.whisper / 50) + (datas.currInfo.whisper % 50 ? 1 : 0);
                for(; whisperPageNum<=whisperPages;whisperPageNum++){
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
        }else{
            log("Using last result.");
            cfg.infobarTemplate = ()=>`共读取 ${datas.fetched} 条关注(缓存,<a href="javascript:void(0)" onclick="openFollowManager(true)">点此重新加载</a>)`
            setInfoBar("使用上次数据");
        }
        datas.status = 2;
        log("fetch completed.");
    }
    const CacheProvider = {
        storage: window.localStorage,
        prefix: "Unfollow_",
        expire: 1000*60*60*2,
        getKey:(key)=>CacheProvider.prefix+key,
        valueWrapper: (value='',no=false)=>{
            log(JSON.stringify({
                et: no?(new Date('2999/1/1')).getTime():(new Date()).getTime()+CacheProvider.expire,
                vl: value
            }));
            return JSON.stringify({
                et: no?(new Date('2999/1/1')).getTime():(new Date()).getTime()+CacheProvider.expire,
                vl: value
            });
        },
        getValue: (value="{}")=>{
            try{
                let itemArc = JSON.parse(value);
                if(itemArc.hasOwnProperty('et')&&itemArc.et>=(new Date()).getTime()){
                    return itemArc.vl;
                }
                return null;
            }catch{return null}
        },
        has: (key,noprefix=false)=>{
            if(!noprefix){
                key = CacheProvider.getKey(key);
            }
            return CacheProvider.storage.getItem(key)===null;
        },
        valid: (key,noprefix=false)=>{
            if(!noprefix){
                key = CacheProvider.getKey(key);
            }
            if(CacheProvider.has(key,true)){
                const value = CacheProvider.storage.getItem(key);
                return CacheProvider.getValue(value)!==null;
            }else return false;
        },
        set: (key,val,noexpire=false,noprefix = false)=>{
            if(!noprefix){
                key = CacheProvider.getKey(key);
            }
            CacheProvider.storage.setItem(key,CacheProvider.valueWrapper(val,noexpire));
        },
        get: (key,fallback=null,noprefix=false)=>{
            if(!noprefix){
                key = CacheProvider.getKey(key);
            }
            const result = CacheProvider.storage.getItem(key);
            log('Cache-get-with-key',key,result);
            if(result===null) return fallback;
            log('Cache-get-parsed-value',key,CacheProvider.getValue(result));
            return CacheProvider.getValue(result);
        },
        del: (key,noprefix=false)=>{
            if(!noprefix){
                key = CacheProvider.getKey(key);
            }
            CacheProvider.set(key,null,true);
        }
    }
    const CacheManager = {
        save:(uid=datas.currUid)=>{
            const {total,fetched,pages,followings,mappings,tags,currInfo} = datas;
            const tagclone = {};
            for(let tn of Object.keys(tags)){
                tagclone[tn+''] = tags[tn];
            }
            log({
                total,fetched,pages,followings,mappings,tagclone,currInfo
            });
            CacheProvider.set(`cache_${uid}`,{
                total,fetched,pages,followings,mappings,tagclone,currInfo
            });
        },
        load:(uid=datas.currUid)=>{
            if(!datas.isSelf) return false;
            const cached = CacheProvider.get(`cache_${uid}`);
            if(cached===null) return false;
            else{
                const {total,fetched,pages,followings,mappings,tagclone,currInfo} = cached;
                const tags = {};
                for(let tn of Object.keys(tagclone)){
                    tags[parseInt(tn)] = tagclone[tn];
                }
                const cdata = {total,fetched,pages,followings,mappings,tags,currInfo};
                for(let n of Object.keys(cdata)){
                    datas[n] = cdata[n];
                }
                return true;
            }
        }
    }
    const clearStyles = (className = "CKUNFOLLOW") => {
        let dom = document.querySelectorAll("style." + className);
        if (dom) [...dom].forEach(e => e.remove());
    }
    const addStyle = (s, className = "CKUNFOLLOW", mode = "append") => {
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
    const setTitle = (val = null)=>{
        const title = get("#CKUNFOLLOW-titledom");
        if(val!=null) title.innerHTML = val;
        else title.innerHTML = cfg.titleTemplate();
    }
    const getFloatWindow = () => {
        addMdiBtnStyle();
        addStyle(`
        #CKUNFOLLOW{
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
        #CKUNFOLLOW.hide{
            opacity: 0;
            pointer-events: none;
            transform: translate(-50%,-50%) scale(0.95);
        }
        #CKUNFOLLOW.show{
            transform: translate(-50%,-50%) scale(1);
        }
        #CKUNFOLLOW-container{
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
        .CKUNFOLLOW-scroll-list{
            margin: 6px auto;
            overflow-y: auto;
            overflow-x: hidden;
            display: flex;
            flex-wrap: nowrap;
            flex-direction: column;
            max-height: calc(80vh - 80px);
        }
        .CKUNFOLLOW-data-inforow{
            border-radius: 6px;
            flex: 1;
            width: 100%;
            display: flex;
            padding: 6px;
            color: #aaa;
            transition: background .3s;
        }
        .CKUNFOLLOW-data-inforow:hover{
            background: #2196f361;
            transition: background .1s;
        }
        .CKUNFOLLOW-data-inforow-toggle{
            margin: 3px 8px;
        }
        .CKUNFOLLOW-toolbar-btns{
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
        .CKUNFOLLOW-toolbar-btns:hover{
            /*filter: brightness(0.85);*/
            background: #00467e!important;
            transition: all .15s;
            /*border-bottom: solid 2px white;*/
        }
        .CKUNFOLLOW-toolbar-btns.red{
            background: #e91e63!important;
        }
        .CKUNFOLLOW-toolbar-btns:hover.red{
            background: #8c002f!important;
        }
        .CKUNFOLLOW-toolbar-btns.green{
            background: #4caf50!important;
        }
        .CKUNFOLLOW-toolbar-btns:hover.green{
            background: #1b5e20!important;
        }
        .CKUNFOLLOW-toolbar-btns.orange{
            background: #e64a19!important;
        }
        .CKUNFOLLOW-toolbar-btns:hover.orange{
            background: #bf360c!important;
        }
        .CKUNFOLLOW-toolbar-btns.grey{
            background: #949494!important;
            color: grey!important;
        }
        .CKUNFOLLOW-toolbar-btns:hover.grey{
            background: #878787!important;
            color: grey!important;
        }
        #CKUNFOLLOW-sortbtns-container>button{
            flex: 1 0 40% !important;
            margin: 4px 4px;
        }
        #CKUNFOLLOW .mdi-close:hover{
            color: #ff5722;
        }
        `, "CKUNFOLLOW-mainWindowcss", "unique");
        const id = "CKUNFOLLOW";
        let win = document.querySelector("#" + id);
        if (win) return win;
        win = document.createElement("div");
        win.id = id;

        const closebtn = document.createElement("div");
        closebtn.innerHTML = `<i class="mdi mdi-18px mdi-close"></i>`
        closebtn.style.float = "right";
        closebtn.style.color = (getBgColor()==="white")?"black":"white";
        closebtn.onclick = hidePanel;
        win.appendChild(closebtn);

        const titleText = document.createElement("div");
        titleText.id="CKUNFOLLOW-titledom";
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
        return getFloatWindow().querySelector("#CKUNFOLLOW-container");
    }
    const setInfoBar = (content = '') => {
        const bar = getFloatWindow().querySelector("#CKUNFOLLOW-infobar");
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
        let modal = get("#CKUNFOLLOW-modal");
        if (!modal) modal = initModal();
        modal.setTitle(title);
        modal.setContent(content);
        modal.show();
    }
    const isModalShowing = () => {
        let modal = get("#CKUNFOLLOW-modal");
        if (modal) return modal.classList.contains("show");
        else return false;
    }
    const hideModal = () => {
        blockWindow(false);
        let modal = get("#CKUNFOLLOW-modal");
        if (modal) modal.hide();
    }
    const initModal = () => {
        addStyle(`
        #CKUNFOLLOW-modal{
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
        }
        #CKUNFOLLOW-modal.show{
            opacity: 1;
            transform: translate(-50%,-50%) scale(1);
        }
        #CKUNFOLLOW-modal.hide{
            opacity: 0;
            pointer-events: none;
            transform: translate(-50%,-50%) scale(0.9);
        }
        .CKUNFOLLOW-modal-content>div{
            display: flex;
            margin: 6px 10px;
            flex-wrap: wrap;
            flex-direction: column;
            align-content: space-around;
            justify-content: space-between;
            align-items: stretch;
        }
        .CKUNFOLLOW-modal-content button, 
        .CKUNFOLLOW-modal-content input, 
        .CKUNFOLLOW-modal-content keygen, 
        .CKUNFOLLOW-modal-content optgroup, 
        .CKUNFOLLOW-modal-content select, 
        .CKUNFOLLOW-modal-content textarea
        {
            border-width: 2px;
            border-color: transparent;
            margin: 2px;
            border-radius: 3px;
            transition: all .3s;
        }
        .CKUNFOLLOW-modal-content button:hover, 
        .CKUNFOLLOW-modal-content input:hover, 
        .CKUNFOLLOW-modal-content keygen:hover, 
        .CKUNFOLLOW-modal-content optgroup:hover, 
        .CKUNFOLLOW-modal-content select:hover, 
        .CKUNFOLLOW-modal-content textarea:hover
        {
            border-color: grey;
        }
        `, "CKUNFOLLOW-modal-css", "unique");
        const modal = document.createElement("div");
        modal.id = "CKUNFOLLOW-modal";
        modal.className = "hide";

        const header = document.createElement("h2");
        header.className = "CKUNFOLLOW-modal-title"
        modal.appendChild(header);

        modal.setTitle = (t = '') => {
            header.innerHTML = t;
        }

        const contents = document.createElement("div");
        contents.className = "CKUNFOLLOW-modal-content";
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
        let modal = get("#CKUNFOLLOW-modal");
        if (modal) modal.remove();
    }
    const addMdiBtnStyle = () => {
        if (document.querySelector("#CKUNFOLLOW-MDICSS")) return;
        document.head.innerHTML += `<link id="CKUNFOLLOW-MDICSS" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@5.9.55/css/materialdesignicons.min.css"/>`;
    }
    const refreshChecked = () => {
        setInfoBar(`正在刷新后台数据...`);
        const all = getAll("#CKUNFOLLOW .CKUNFOLLOW-data-inforow-toggle");
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
        //unsafeWindow.postMessage(`CKUNFOLLOWSTATUSCHANGES|${mid}|${status ? 1 : 0}`)
    }
    const upinfoline = async data => {
        let invalid = isInvalid(data);
        let info = datas.mappings[parseInt(data.mid)] || {};
        return await makeDom("li", async item => {
            item.className = "CKUNFOLLOW-data-inforow";
            item.onclick = e => {
                if (e.target.classList.contains("CKUNFOLLOW-data-inforow-name")) {
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
            item.setAttribute("data-special", data.special);
            item.setAttribute("data-invalid", data.invalid ? "1" : "0");
            item.setAttribute("data-fans", data.attribute === 6 ? "1" : "0");
            item.setAttribute("data-vip", data.vip.vipType !== 0 ? "1" : "0");
            item.setAttribute("data-official", data.official_verify.type === 1 ? "1" : "0");
            let title = data.mid + "";
            item.appendChild(await makeDom("input", toggle => {
                toggle.className = "CKUNFOLLOW-data-inforow-toggle";
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
                name.className = "CKUNFOLLOW-data-inforow-name";
                name.innerText = data.uname;
                name.style.flex = "1";
                if (invalid) {
                    name.style.textDecoration = "line-through 3px red";
                } else {
                    name.style.fontWeight = "bold";
                    if (data.isWhisper === true || data.attribute=== 1) {
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
                    if (data.official_verify.type === 1) {
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
                    if (data.official_verify.type === 1) {
                        mark.innerText = data.official_verify.desc.substring(0, 15);
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
            item.setAttribute("title", title);
        });
    }
    const taginfoline = (data,clickCallback=()=>{},selected = false,showExtras = true,hideOptions = false) => {
        return makeDom("li", async item => {
            let couldRename = true;
            item.className = "CKUNFOLLOW-data-inforow";
            item.onclick = e => {
                if(e.path.filter(el=>el.tagName==="BUTTON"||el.tagName==="INPUT").length){
                    return;
                }else{
                    clickCallback(e,data);
                }
            }
            item.setAttribute("data-id", data.tagid);
            item.setAttribute("data-name", data.name);
            item.setAttribute("data-count", data.count);
            item.setAttribute("data-tip", data.tip);
            if(!hideOptions)item.appendChild(await makeDom("input", toggle => {
                toggle.className = "CKUNFOLLOW-data-inforow-toggle";
                toggle.type = "checkbox";
                toggle.checked = selected;
                toggle.setAttribute("data-tagid", data.tagid);
            }));
            item.appendChild(await makeDom("span", name => {
                name.className = "CKUNFOLLOW-data-inforow-name";
                switch(data.tagid){
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
            if(showExtras)item.appendChild(await makeDom("button", renamebtn => {
                renamebtn.style.flex = ".4";
                renamebtn.innerHTML = `更名`;
                renamebtn.style.height = "23px";
                renamebtn.style.margin = "0";
                renamebtn.style.padding = "2px";
                renamebtn.classList.add("CKUNFOLLOW-toolbar-btns");
                if(!couldRename){
                    renamebtn.setAttribute("disabled",true);
                    renamebtn.classList.add("grey");
                }
                renamebtn.onclick = async ()=>{
                    let newname = prompt("请输入新的分类名字",data.name).trim();
                    if(newname.length!==0){
                        if(newname!=data.name){
                            const result = await renameGroup(data.tagid,newname);
                            if(result){
                                await alertModal("分组重命名","分组重命名成功，重新打开窗口以显示修改后的数据。","确定");
                            }else{
                                await alertModal("分组重命名","分组重命名完成，但是不能确定结果。请刷新页面，然后查看是否生效。","确定");
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
                        btn.className = "CKUNFOLLOW-toolbar-btns";
                        btn.innerHTML = okbtn;
                        btn.onclick = e => hideModal();
                    }))
                }))
        }))
        await wait(300);
    }
    const createUserInfoCard = async info=>{
        if(datas.preventUserCard) return;
        log(info);
        if(datas.autoExtendInfo){
            alertModal("请稍后...");
            await fillUserStatus(info.mid).catch(err => log(err));
            info.dynamics = await getDynamic(info.mid).catch(err => log(err));
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
                        img.setAttribute("loading","lazy");
                        img.src = info.face;
                        img.style.width = "70px";
                        img.style.height = "70px";
                        img.style.borderRadius = "50%";
                        img.style.margin = "0 30px";
                    }),
                    await makeDom("div", async upinfo=>{
                        upinfo.style.flex = "1";
                        upinfo.style.maxWidth = "300px";
                        upinfo.innerHTML = `<b style="color:${info.vip['nickname_color']};font-size: large">${info.uname}</b> <span style="display:inline-block;transform: translateY(-5px);font-size:xx-small;line-height:1.2;padding:1px 3px;border-radius:6px;background: ${info.vip.vipType>0?(info.vip.label['bg_color']||"#f06292"):"rgba(0,0,0,0)"};color: ${info.vip.label['text_color']||"white"}">${info.vip.vipType>1?info.vip.label.text:info.vip.vipType>0?"大会员":""}</span>`;
                        if(info.level){
                            upinfo.innerHTML+= `<div style="display: inline-block;border-radius:3px;line-height: 1.2;padding: 1px 3px;background:#f06292;margin-left: 12px;color:white">LV${info.level}</div>`;
                        }
                        upinfo.innerHTML+= `<div style="color:gray">${info.sign}</div>`;
                        if(info.official_verify.type!==-1){
                            let color = "gray";
                            switch(info.official_verify.type){
                                case 0:
                                    color="goldenrod";
                                    break;
                                case 1:
                                    color="#FB7299";
                                    break;
                                case 2:
                                    color="dodgerblue";
                                    break;
                            }
                            upinfo.innerHTML+= `<div style="color:${color}">${info.official_verify.desc}</div>`;
                        }
                        if(info.tag!==null){
                            let folders = "分类:";
                            for(let t of info.tag){
                                if(t in datas.tags){
                                    folders +=" "+datas.tags[t].name;
                                }
                            }
                            upinfo.innerHTML+= `<div style="color:gray;font-weight:bold">${folders}</div>`;
                        }
                        let subinfo = "";
                        if(info.special===1){
                            subinfo+= `<span style="color:deeppink;margin-right:6px;">特别关注</span>`;
                        }
                        if(info.attribute===6){
                            subinfo+= `<span style="color:indianred;margin-right:6px;">互相关注</span>`;
                        }
                        if(info.isWhisper === true || info.attribute=== 1){
                            subinfo+= `<span style="color:yellowgreen;margin-right:6px;">悄悄关注</span>`;
                        }
                        if(subinfo.length){
                            upinfo.innerHTML+= `<div>${subinfo}</div>`
                        }
                        if(info.notice && info.notice.id){
                            upinfo.innerHTML+= `<div style="border-radius:6px;padding:3px;background:${info.notice.bg_color};color:${info.notice.text_color};"><a href="${info.notice.url}">${info.notice.content}</a></div>`;
                        }
                        if(info.banned){
                            upinfo.innerHTML+= `<div style="border-radius:6px;padding:3px;background:black;color:white;">账号已封禁</div>`;
                        }
                        if(info.cates && info.cates.length){
                            upinfo.innerHTML+= `<div style="color:gray">标签: ${info.cates.join(", ")}</div>`;
                        }
                        if(info.mostCates && info.mostCates.length){
                            upinfo.innerHTML+= `<div style="color:gray">主要投稿分区: ${info.mostCates}</div>`;
                        }
                        if(info.mid){
                            upinfo.innerHTML+= `<div style="color:gray">UID: ${info.mid}</div>`;
                        }
                        if(info.mtime){
                            const regdate = new Date(info.mtime*1000);
                            upinfo.innerHTML+= `<div style="color:gray">关注于 ${regdate.getFullYear()}年${regdate.getMonth()+1}月${regdate.getDate()}日</div>`;
                        }
                    })
                ].forEach(el=>card.appendChild(el));
            })
            container.appendChild(infocard);
            if(info.dynamics){
                if(info.dynamics.top){
                    let dynamic = info.dynamics.top;
                    let content = (()=>{
                        if(!dynamic.content || dynamic.content.length===0) return "无内容";
                        let short = dynamic.content.substring(0,300);
                        short = short.split("\n").slice(0,4).join("\n");
                        if(short!=dynamic.content) short+="...";

                        return short.replaceAll("\n","<br>");
                    })();
                    const pushdate = new Date(dynamic.timestamp*1000);
                    [
                        divider(),
                        await makeDom("div",async post=>{
                            post.innerHTML = "<h3 style='padding: 6px 0;'>置顶动态</h3>";
                            post.appendChild(await makeDom("div",async vidcard=>{
                                vidcard.style.display = "flex";
                                vidcard.style.flexDirection = "row";
                                vidcard.style.minHeight = "80px";
                                vidcard.style.minWidth = "400px";
                                [
                                    await makeDom("div",async vidinfo=>{
                                        vidinfo.innerHTML = `<div style="font-weight:normal;font-size:smaller;color:#858585">${content}</div>`;
                                        vidinfo.innerHTML+= `<div style="color:grey"><i class="mdi mdi-10px mdi-chevron-double-right"></i> ${pushdate.getFullYear()}年${pushdate.getMonth()+1}月${pushdate.getDate()}日 - ${dynamic.like}点赞 ${dynamic.repost}转发 ${dynamic.comment}评论</div>`;
                                        if(dynamic.isrepost){
                                            vidinfo.innerHTML+= `<div style="color:grey"><i class="mdi mdi-10px mdi-share"></i> 转发自<b onclick="open('https://space.bilibili.com/${dynamic.publisher.uid}')">${dynamic.publisher.uname}</b></div>`;
                                        }
                                    })
                                ].forEach(el=>vidcard.appendChild(el));
                                vidcard.onclick = ()=>open(`https://t.bilibili.com/${dynamic.id}?tab=2`)
                            }))
                        })
                    ].forEach(el=>container.appendChild(el));
                }
                if(info.dynamics.next){
                    let dynamic = info.dynamics.next;
                    let content = (()=>{
                        if(!dynamic.content || dynamic.content.length===0) return "无内容";
                        let short = dynamic.content.substring(0,300);
                        short = short.split("\n").slice(0,4).join("\n");
                        if(short!=dynamic.content) short+="...";
                        return short.replaceAll("\n","<br>");
                    })();
                    const pushdate = new Date(dynamic.timestamp*1000);
                    [
                        divider(),
                        await makeDom("div",async post=>{
                            post.innerHTML = "<h3 style='padding: 6px 0;'>最新动态</h3>";
                            post.appendChild(await makeDom("div",async vidcard=>{
                                vidcard.style.display = "flex";
                                vidcard.style.flexDirection = "row";
                                vidcard.style.minHeight = "80px";
                                vidcard.style.minWidth = "400px";
                                [
                                    await makeDom("div",async vidinfo=>{
                                        vidinfo.innerHTML = `<div style="font-weight:normal;font-size:smaller;color:#858585">${content}</div>`;
                                        vidinfo.innerHTML+= `<div style="color:grey"><i class="mdi mdi-10px mdi-chevron-double-right"></i> ${pushdate.getFullYear()}年${pushdate.getMonth()+1}月${pushdate.getDate()}日 - ${dynamic.like}点赞 ${dynamic.repost}转发 ${dynamic.comment}评论</div>`;
                                        if(dynamic.isrepost){
                                            vidinfo.innerHTML+= `<div style="color:grey"><i class="mdi mdi-10px mdi-share"></i> 转发自<b onclick="open('https://space.bilibili.com/${dynamic.publisher.uid}')">${dynamic.publisher.uname}</b></div>`;
                                        }
                                    })
                                ].forEach(el=>vidcard.appendChild(el));
                                vidcard.onclick = ()=>open(`https://t.bilibili.com/${dynamic.id}?tab=2`)
                            }))
                        })
                    ].forEach(el=>container.appendChild(el));
                }
            }
            if(info.lastUpdate && info.lastUpdateInfo){
                const pushdate = new Date(info.lastUpdate*1000);
                [
                    divider(),
                    await makeDom("div",async post=>{
                        post.innerHTML = "<h3 style='padding: 6px 0;'>最新投稿</h3>";
                        post.appendChild(await makeDom("div",async vidcard=>{
                            vidcard.style.display = "flex";
                            vidcard.style.flexDirection = "row";
                            vidcard.style.minHeight = "80px";
                            vidcard.style.minWidth = "400px";
                            [
                                await makeDom("img", img=>{
                                    img.style.flex = "1";
                                    img.style.maxWidth = "80px";
                                    img.style.height = "50px";
                                    img.setAttribute("loading","lazy");
                                    img.src = info.lastUpdateInfo.pic;
                                    img.style.borderRadius = "6px";
                                    img.style.margin = "0px 12px 0px 10px";
                                }),
                                await makeDom("div",async vidinfo=>{
                                    vidinfo.innerHTML = `<div style="font-weight:bold;font-size:larger;color:grey">${info.lastUpdateInfo.title}</div>`;
                                    vidinfo.innerHTML+= `<div style="color:grey">${pushdate.getFullYear()}年${pushdate.getMonth()+1}月${pushdate.getDate()}日</div>`;
                                })
                            ].forEach(el=>vidcard.appendChild(el));
                            vidcard.onclick = ()=>open(`https://www.bilibili.com/av${info.lastUpdateInfo.aid}`)
                        }))
                    })
                ].forEach(el=>container.appendChild(el));
            }
            if(info.lives && info.lives.liveStatus!==0){
                [
                    divider(),
                    await makeDom("div",async post=>{
                        post.innerHTML = "<h3 style='padding: 6px 0;'>直播间</h3>";
                        post.appendChild(await makeDom("div",async vidcard=>{
                            vidcard.style.display = "flex";
                            vidcard.style.flexDirection = "row";
                            vidcard.style.minHeight = "80px";
                            vidcard.style.minWidth = "400px";
                            [
                                await makeDom("img", img=>{
                                    img.style.flex = "1";
                                    img.style.maxWidth = "80px";
                                    img.style.height = "50px";
                                    img.setAttribute("loading","lazy");
                                    img.src = info.lives.cover;
                                    img.style.borderRadius = "6px";
                                    img.style.margin = "0px 12px 0px 10px";
                                }),
                                await makeDom("div",async vidinfo=>{
                                    vidinfo.innerHTML = `<div style="font-weight:bold;font-size:larger;color:grey">${info.lives.title}</div>`;
                                    vidinfo.innerHTML+= `<div style="color:grey">正在直播 - 房间号: ${info.lives.roomid}</div>`;
                                })
                            ].forEach(el=>vidcard.appendChild(el));
                            vidcard.onclick = ()=>open(`https://live.bilibili.com/${info.lives.roomid}`)
                        }))
                    })
                ].forEach(el=>container.appendChild(el));
            }
            async function addBtn(info,container){
                container.style.display="flex";
                container.style.flexDirection="column";
                container.innerHTML = "";
                if(info.attribute===0){
                    container.appendChild(await makeDom("button", btn => {
                        btn.className = "CKUNFOLLOW-toolbar-btns red";
                        btn.style.margin = "4px 0";
                        btn.innerHTML = "立刻关注";
                        btn.onclick = async e => {
                            btn.innerHTML = "正在关注...";
                            btn.setAttribute("disabled",true)
                            btn.classList.add("grey");
                            const res = await batchOperateUser([info.mid],RELE_ACTION.FOLLOW);
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
                    }))
                    container.appendChild(await makeDom("button", btn => {
                        btn.className = "CKUNFOLLOW-toolbar-btns blue";
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
                    }))
                }else{
                    container.appendChild(await makeDom("button", btn => {
                        btn.className = "CKUNFOLLOW-toolbar-btns red";
                        btn.style.margin = "4px 0";
                        btn.innerHTML = "立刻取关(谨慎)";
                        btn.onclick = async e => {
                            btn.innerHTML = "正在取关...";
                            btn.setAttribute("disabled",true)
                            btn.classList.add("grey");
                            const res = await unfollowUser(info.mid);
                            if(!res.ok){
                                log(res);
                                btn.innerHTML = "取关失败";
                                btn.removeAttribute("disabled")
                                btn.classList.remove("grey");
                            }else{
                                datas.mappings[info.mid].attribute = 0;
                                btn.remove();
                                addBtn(datas.mappings[info.mid],container);
                            }
                        }
                    }))
                    if(info.attribute!==2){
                        container.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns blue";
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
                            btn.className = "CKUNFOLLOW-toolbar-btns blue";
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
                    }
                }
                container.appendChild(await makeDom("button", btn => {
                    btn.className = "CKUNFOLLOW-toolbar-btns";
                    btn.style.margin = "4px 0";
                    btn.innerHTML = "个人主页";
                    btn.onclick = () => open(`https://space.bilibili.com/${info.mid}`)
                }))
                container.appendChild(await makeDom("button", btn => {
                    btn.className = "CKUNFOLLOW-toolbar-btns";
                    btn.style.margin = "4px 0";
                    btn.innerHTML = "隐藏";
                    btn.onclick = () => hideModal();
                }))
            }
            const btns = document.createElement("div");
            await addBtn(info,btns);
            container.appendChild(btns);
        }));
    }
    const createGroupInfoModal = async () => {
        hideModal();
        await wait(300);
        openModal("分组管理", await makeDom("div", async container=>{
            container.appendChild(await makeDom("div", tip => {
                tip.style.fontWeight = "bold";
                tip.innerHTML = `若修改过分组信息，建议刷新页面再进行其他操作。`;
            }))
            container.appendChild(divider());
            const taglistdom = document.createElement('div');
            taglistdom.className = "CKUNFOLLOW-scroll-list";
            taglistdom.style.width = "100%";
            taglistdom.style.maxHeight = "calc(50vh - 100px)";
            const refreshList = async ()=>renderTagListTo(taglistdom,[],async (e,data)=>{
                if(e.target.tagName==="INPUT") return;
                if(['0','-10'].includes(data.tagid+'')) return;
                let dom = e.path.filter(it=>it['classList']&&it.classList.contains('CKUNFOLLOW-data-inforow'))[0];
                if(!dom) return log('no target');
                if(dom.hasAttribute('data-del-pending')){
                    if(dom.removePendingTimer) clearTimeout(dom.removePendingTimer);
                    removeGroup(data.tagid).then(()=>refreshList());
                    //cfg.infobarTemplate = `共读取 ${datas.fetched} 条关注 (已修改分组,<a href="javascript:void(0)" onclick="openFollowManager(true)">点此重新加载</a>)`;
                    await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                    resetInfoBar();
                }else{
                    dom.setAttribute('data-del-pending','waiting');
                    let namedom = dom.querySelector('.CKUNFOLLOW-data-inforow-name');
                    if(!namedom) return;
                    let text = namedom.innerHTML;
                    namedom.innerHTML = '再次点击以移除'.fontcolor('red');
                    dom.removePendingTimer = setTimeout(()=>{
                        if(dom.hasAttribute('data-del-pending')) dom.removeAttribute('data-del-pending');
                        if(dom.removePendingTimer) clearTimeout(dom.removePendingTimer);
                        namedom.innerHTML = text;
                    },5000);
                }
            },true);
            container.appendChild(taglistdom);
            container.appendChild(await makeDom("div", async btns => {
                btns.style.display = "flex";
                [
                    await makeDom("button", btn => {
                        btn.className = "CKUNFOLLOW-toolbar-btns";
                        btn.innerHTML = "添加分组";
                        btn.style.height = "30px";
                        btn.onclick = async () => {
                            const tagname = prompt("请输入新分组的标题");
                            if(!tagname) return;
                            createGroup(tagname).then(()=>refreshList());
                        };
                    }),
                    await makeDom("button", btn => {
                        btn.className = "CKUNFOLLOW-toolbar-btns";
                        btn.style.height = "30px";
                        btn.innerHTML = "关闭";
                        btn.onclick = () => hideModal();
                    }),
                ].forEach(el => btns.appendChild(el));
            }))
            refreshList();
        }))
    }
    const createGroupChangeModal = async (mode='copy'/*move*/) => {
        hideModal();
        await wait(300);
        refreshChecked();
        let uids = datas.checked;
        let users = [];
        let groups = [];
        let act = mode==='copy'?'复制':'移动';
        for(let uid of uids){
            users.push(datas.mappings[uid]);
            let tags = datas.mappings[uid].tag;
            tags && tags.forEach(t=>groups.includes(t)||groups.push(t))
        }
        log(users,groups);
        openModal("分组修改:"+act, await makeDom("div", async container=>{
            container.appendChild(await makeDom("div", tip => {
                tip.style.fontWeight = "bold";
                tip.innerHTML = `若修改过分组信息，建议刷新页面再进行其他操作。`;
            }))
            container.appendChild(divider());
            const taglistdom = document.createElement('div');
            taglistdom.className = "CKUNFOLLOW-scroll-list";
            taglistdom.style.width = "100%";
            taglistdom.style.maxHeight = "calc(50vh - 100px)";
            const refreshList = async ()=>renderTagListTo(taglistdom,mode==='copy'?[]:groups,async (e,data)=>{
                const row = e.path.filter(el=>el.classList?.contains('CKUNFOLLOW-data-inforow'));
                if(row.length){
                    const cb = row[0].querySelector("input[type='checkbox']");
                    if(cb) cb.checked = !cb.checked
                }
            },false);
            container.appendChild(taglistdom);
            container.appendChild(await makeDom("div", async btns => {
                btns.style.display = "flex";
                [
                    await makeDom("button", btn => {
                        btn.className = "CKUNFOLLOW-toolbar-btns";
                        btn.style.height = "30px";
                        btn.innerHTML = "管理分组 (Beta)";
                        btn.onclick = async () => createGroupInfoModal();
                    }),
                    await makeDom("button", btn => {
                        btn.className = "CKUNFOLLOW-toolbar-btns";
                        btn.style.height = "30px";
                        btn.innerHTML = "取消";
                        btn.onclick = () => hideModal();
                    }),
                    await makeDom("button", btn => {
                        btn.className = "CKUNFOLLOW-toolbar-btns";
                        btn.style.height = "30px";
                        btn.innerHTML = "确定";
                        btn.onclick = async () => {
                            const allOptions = [...document.querySelectorAll('.CKUNFOLLOW-data-inforow-toggle[data-tagid]')]
                            const selections = allOptions.map((option)=>{
                                return {tagid:parseInt(option.getAttribute('data-tagid')),checked:option.checked}
                            })
                            const checked = selections.filter((selection) => selection.checked)
                            await alertModal("正在处理...", `正在${act}成员到新分组，请稍候`);
                            if(checked.length===0) checked.push({tagid:0,checked:true});
                            switch(mode){
                                case 'copy':
                                    copyUserToGroup(uids,checked.map(c=>c.tagid));
                                    break;
                                case 'move':
                                    moveUserToGroup(uids,checked.map(c=>c.tagid));
                                    break;
                                // default:
                                //     moveUserToDefaultGroup(uids);
                            }
                            await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                            hideModal();
                            cfg.infobarTemplate = ()=>`共读取 ${datas.fetched} 条关注 (已修改分组,<a href="javascript:void(0)" onclick="openFollowManager(true)">点此重新加载</a>)`;
                            resetInfoBar();
                        }
                    }),
                ].forEach(el => btns.appendChild(el));
            }))
            refreshList();
        }))
    }
    const createBlockOrFollowModal = async (isBlock = true) => {
        hideModal();
        await wait(300);
        refreshChecked();
        if (datas.checked.length === 0) {
            alertModal("无法继续", "你没有选中任何项，请选中一些项然后再进行操作。", "确认");
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
                checkedlistdom.className = "CKUNFOLLOW-scroll-list";
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
                        btn.className = "CKUNFOLLOW-toolbar-btns red";
                        btn.innerHTML = "确认";
                        btn.onclick = async e => {
                            if (datas.checked.length === 0)
                                return alertModal("无需继续", "你没有选中任何项。", "确定");
                            const finalList = datas.checked;
                            await alertModal("正在" + ui.action, `正在${ui.action}${finalList.length}个关注...`);
                            const result = await batchOperateUser(finalList, isBlock?RELE_ACTION.BLOCK:RELE_ACTION.FOLLOW);
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
                        btn.className = "CKUNFOLLOW-toolbar-btns";
                        btn.innerHTML = "取消";
                        btn.onclick = e => hideModal();
                    }),
                ].forEach(el => btns.appendChild(el));
            }))
        }))
    }
    const createOtherSpaceAlert = () => alertModal("无法执行操作", "此功能只能在你的个人空间使用，当前是在别人的空间。", "确定");
    const createUnfollowModal = async () => {
        refreshChecked();
        if (datas.checked.length === 0) {
            alertModal("取消关注", `你没有勾选任何人，所以无法取关。请勾选后再点击取关按钮。`, "知道了")
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
                delaySettings.innerHTML = `操作间隔：<input id="ckunfollow-form-delay" type="number" step="0.01" value="${datas.batchOperationDelay}" />`;
            }))
            container.appendChild(divider());
            container.appendChild(await makeDom("div", async unfolistdom => {
                unfolistdom.className = "CKUNFOLLOW-scroll-list";
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
                        btn.className = "CKUNFOLLOW-toolbar-btns red";
                        btn.innerHTML = "确认";
                        btn.onclick = e => {
                            const delayDom = get("#ckunfollow-form-delay");
                            if(delayDom) {
                                try{
                                    let delay = parseFloat(delayDom.value);
                                    datas.batchOperationDelay = Math.max(delay,0);
                                }catch{}
                            }
                            doUnfollowChecked()
                        }
                    }),
                    await makeDom("button", btn => {
                        btn.className = "CKUNFOLLOW-toolbar-btns";
                        btn.innerHTML = "取消";
                        btn.onclick = e => hideModal();
                    }),
                ].forEach(el => btns.appendChild(el));
            }))
        }))
    }
    const applyFilters = async config => {
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
            }
        };
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
                    }
                }
                checked.push(uid);
                if (!datas.checked.includes(uid) && !datas.checked.includes(uid + "")) {
                    datas.checked.push(uid);
                }
            }
            setInfoBar("正在将筛选应用到列表...");
            await wait(1);
            datas.followings.forEach(it=>toggleSwitch(it.mid,datas.checked.includes(parseInt(it.mid))));
            setInfoBar("正在按已选中优先排序...");
            await wait(1);
            datas.followings.sort((x, y) => {
                const xint = (datas.checked.includes(x.mid + "") || datas.checked.includes(parseInt(x.mid))) ? 1 : 0;
                const yint = (datas.checked.includes(y.mid + "") || datas.checked.includes(parseInt(y.mid))) ? 1 : 0;
                return yint - xint;
            })
            await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
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
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '批量操作 <i class="mdi mdi-18px mdi-chevron-down"></i>';
                            //btn.style.background = "#e91e63";
                            btn.onclick = async e => {
                                await openModal("批量操作", await makeDom("div", async container => {
                                    container.style.alignContent = "stretch";
                                    [
                                        await _(() => {
                                            if (datas.isSelf) {
                                                return makeDom("button", async btn => {
                                                    btn.className = "CKUNFOLLOW-toolbar-btns";
                                                    btn.style.margin = "4px 0";
                                                    btn.innerHTML = '取关选中';
                                                    btn.onclick = () => createUnfollowModal();
                                                })
                                            } else return null;
                                        }),
                                        await _(() => {
                                            if (datas.isSelf) {
                                                return makeDom("button", async btn => {
                                                    btn.className = "CKUNFOLLOW-toolbar-btns";
                                                    btn.style.margin = "4px 0";
                                                    btn.innerHTML = '复制到分组';
                                                    btn.onclick = () => createGroupChangeModal('copy');
                                                })
                                            } else return null;
                                        }),
                                        await _(() => {
                                            if (datas.isSelf) {
                                                return makeDom("button", async btn => {
                                                    btn.className = "CKUNFOLLOW-toolbar-btns";
                                                    btn.style.margin = "4px 0";
                                                    btn.innerHTML = '修改分组';
                                                    btn.onclick = () => createGroupChangeModal('move');
                                                })
                                            } else return null;
                                        }),
                                        await _(() => {
                                            if (datas.isSelf) {
                                                return makeDom("button", async btn => {
                                                    btn.className = "CKUNFOLLOW-toolbar-btns grey";
                                                    btn.style.margin = "4px 0";
                                                    btn.innerHTML = '添加到分组';
                                                    btn.title = "原分组信息保留，并添加到新分组。";
                                                    btn.onclick = () => alertModal("施工中", "功能尚未完成", "确定");
                                                })
                                            } else
                                                return null;
                                        }),
                                        await _(() => {
                                            if (datas.isSelf) {
                                                return makeDom("button", async btn => {
                                                    btn.className = "CKUNFOLLOW-toolbar-btns grey";
                                                    btn.style.margin = "4px 0";
                                                    btn.innerHTML = '设置分组';
                                                    btn.title = "丢失原分组信息，并设置到新分组。";
                                                    btn.onclick = () => alertModal("施工中", "功能尚未完成", "确定");
                                                })
                                            } else
                                                return null;
                                        }),
                                        await makeDom("button", async btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = '批量拉黑(测试)';
                                            btn.onclick = () => createBlockOrFollowModal(true);
                                        }),
                                        await _(() => {
                                            if (!datas.isSelf) {
                                                return makeDom("button", async btn => {
                                                    btn.className = "CKUNFOLLOW-toolbar-btns";
                                                    btn.style.margin = "4px 0";
                                                    btn.innerHTML = '批量关注(测试)';
                                                    btn.onclick = () => createBlockOrFollowModal(false);
                                                })
                                            } else return null;
                                        }),
                                        divider(),
                                        await makeDom("button", async btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.innerHTML = '返回';
                                            btn.onclick = () => hideModal();
                                        }),
                                    ].forEach(el => el && container.appendChild(el));
                                }));
                            };
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '全选';
                            btn.onclick = e => {
                                setInfoBar("正在处理全选...");
                                const all = getAll(".CKUNFOLLOW-data-inforow-toggle");
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
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '反选';
                            btn.onclick = e => {
                                setInfoBar("正在处理反选...");
                                const all = getAll(".CKUNFOLLOW-data-inforow-toggle");
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
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '全不选';
                            btn.onclick = e => {
                                setInfoBar("正在处理取选...");
                                const all = getAll(".CKUNFOLLOW-data-inforow-toggle");
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
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '间选';
                            btn.onclick = e => {
                                setInfoBar("正在处理间选...");
                                const all = getAll(".CKUNFOLLOW-data-inforow-toggle");
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
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '筛选 <i class="mdi mdi-18px mdi-chevron-down"></i>';
                            btn.onclick = async e => {
                                //alertModal("施工中", "此功能尚未实现！", "返回");
                                openModal("筛选", await makeDom("div", async container => {
                                    const filtersid = "CKUNFOLLOW-filters";
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
                                                            if(!datas.isSelf) opt.disabled = true;
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "1";
                                                            opt.innerHTML = "特别关注"
                                                            if(!datas.isSelf) opt.disabled = true;
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
                                                            if(!datas.isSelf) opt.disabled = true;
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "6";
                                                            opt.innerHTML = "互粉用户"
                                                            if(!datas.isSelf) opt.disabled = true;
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
                                                            if(!datas.isSelf) opt.disabled = true;
                                                        }),
                                                        await makeDom("option", opt => {
                                                            opt.value = "-2";
                                                            opt.innerHTML = "已有分组的用户"
                                                            if(!datas.isSelf) opt.disabled = true;
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
                                                await makeDom("label", async label => {
                                                    label.setAttribute("for", filtersid + "-beforetime");
                                                    label.innerHTML = "在什么时间前关注：";
                                                }),
                                                await makeDom("input", async choose => {
                                                    choose.id = filtersid + "-beforetime";
                                                    choose.name = "val-beforetime";
                                                    choose.setAttribute("type", "datetime-local");
                                                }),
                                                divider(),
                                                await makeDom("label", async label => {
                                                    label.setAttribute("for", filtersid + "-aftertime");
                                                    label.innerHTML = "在什么时间后关注：";
                                                }),
                                                await makeDom("input", async choose => {
                                                    choose.id = filtersid + "-aftertime";
                                                    choose.name = "val-aftertime";
                                                    choose.setAttribute("type", "datetime-local");
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
                                                    btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                                            }
                                                        };
                                                        await applyFilters(config);
                                                        hideModal();
                                                    }
                                                }),
                                                await makeDom("button", btn => {
                                                    btn.className = "CKUNFOLLOW-toolbar-btns";
                                                    btn.innerHTML = "取消";
                                                    btn.onclick = () => hideModal();
                                                }),
                                            ].forEach(el => btns.appendChild(el));
                                        })
                                    ].forEach(el => container.appendChild(el));
                                }))
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '排序 <i class="mdi mdi-18px mdi-chevron-down"></i>';
                            btn.onclick = async e => {
                                openModal("选择排序方式", await makeDom("div", async select => {
                                    select.style.alignContent = "stretch";
                                    select.style.flexDirection = "row";
                                    select.id = "CKUNFOLLOW-sortbtns-container";
                                    [
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
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
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
                                            btn.innerHTML = "按最新关注";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按最新关注排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.mtime) - parseInt(x.mtime))
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
                                            btn.innerHTML = "按最早关注";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按最早关注排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(x.mtime) - parseInt(y.mtime))
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
                                            btn.innerHTML = "大会员优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按大会员优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.vip.vipType) - parseInt(x.vip.vipType))
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
                                            btn.innerHTML = "无会员优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按无会员优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(x.vip.vipType) - parseInt(y.vip.vipType))
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
                                            btn.innerHTML = "认证优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按认证优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.official_verify.type) - parseInt(x.official_verify.type))
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
                                            btn.innerHTML = "无认证优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按无认证优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(x.official_verify.type) - parseInt(y.official_verify.type))
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
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
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
                                            btn.innerHTML = "特别关注优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按特别关注优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.special) - parseInt(x.special))
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
                                            btn.innerHTML = "互相关注优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按互相关注优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.attribute) - parseInt(x.attribute))
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,true);
                                                hideModal();
                                            }
                                        }),
                                        //divider(),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns CKUNFOLLOW-sortbtns";
                                            btn.innerHTML = "不修改 | 取消";
                                            btn.onclick = e => hideModal();
                                        })
                                    ].forEach(el => select.appendChild(el));
                                }));
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '更多 <i class="mdi mdi-18px mdi-chevron-down"></i>';
                            btn.onclick = async e => {
                                openModal("更多...", await makeDom("div", async select => {
                                    select.style.alignContent = "stretch";
                                    [
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "快速选中...";
                                            btn.onclick = async e => {
                                                hideModal();
                                                await wait(300);
                                                openModal("快速选中", await makeDom("div", async select => {
                                                    select.style.alignContent = "stretch";
                                                    [
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "加选: 悄悄关注用户";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理加选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (d.attribute===1||d.isWhisper) {
                                                                        toggleSwitch(d.mid, true);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "加选: 所有两年前的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理加选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (isLongAgo(d)) {
                                                                        toggleSwitch(d.mid, true);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "加选: 所有两个月内的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理加选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (isNearly(d)) {
                                                                        toggleSwitch(d.mid, true);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        divider(),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 悄悄关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (d.attribute===1||d.isWhisper) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 所有两年前的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (isLongAgo(d)) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 所有两个月内的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (isNearly(d)) {
                                                                        toggleSwitch(d.mid, false);
                                                                    }
                                                                }
                                                                resetInfoBar();
                                                                hideModal();
                                                            }
                                                        }),
                                                        await makeDom("button", btn => {
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                                            btn.style.margin = "4px 0";
                                                            btn.innerHTML = "减选: 所有互相关注的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                const isFans = d => {
                                                                    return d.attribute === 6;
                                                                }
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
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                                if(await copy(list)){
                                                    mtitle+="✅ 内容已经自动复制到剪贴板, 你可以粘贴到别处";
                                                }else{
                                                    mtitle+="请单击列表并按Ctrl+C手动复制";
                                                }
                                                unsafeWindow.CKFOMAN_EXPORTUIDS = list;
                                                unsafeWindow.CKFOMAN_EXPORTTOFILE = ()=>{
                                                    download("export_uids.txt",unsafeWindow.CKFOMAN_EXPORTUIDS);
                                                }
                                                mtitle+=`，或者：<button class="CKUNFOLLOW-toolbar-btns" onclick="CKFOMAN_EXPORTTOFILE()">保存为文件</button>`
                                                await alertModal("导出UID", `
                                                ${mtitle}
                                                <br>
                                                <textarea readonly style="width: 400px;" onclick="this.select()" >${list}</textarea>
                                                `, "确定");
                                                resetInfoBar();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                                                input.id = "CKUNFOLLOW-import-textarea";
                                                                input.placeholder = "1111111,2222222,3333333..."
                                                            }),
                                                            divider(),
                                                            await makeDom("div", async btns => {
                                                                btns.style.display = "flex";
                                                                [
                                                                    await makeDom("button", btn => {
                                                                        btn.className = "CKUNFOLLOW-toolbar-btns orange";
                                                                        btn.innerHTML = "批量关注";
                                                                        btn.onclick = async e => {
                                                                            const value = get("#CKUNFOLLOW-import-textarea").value;
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
                                                                        btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                                                input.id = "CKUNFOLLOW-import-textarea";
                                                                input.placeholder = "1111111,2222222,3333333..."
                                                            }),
                                                            divider(),
                                                            await makeDom("div", async btns => {
                                                                btns.style.display = "flex";
                                                                [
                                                                    await makeDom("button", btn => {
                                                                        btn.className = "CKUNFOLLOW-toolbar-btns orange";
                                                                        btn.innerHTML = "批量取关";
                                                                        btn.onclick = async e => {
                                                                            const value = get("#CKUNFOLLOW-import-textarea").value;
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
                                                                        btn.className = "CKUNFOLLOW-toolbar-btns";
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
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "重新载入列表";
                                            btn.onclick = async e => {
                                                await alertModal("重新载入列表", "正在重新载入列表。此重载不会重新获取数据。");
                                                datas.dommappings = {};
                                                await renderListTo(get("#CKUNFOLLOW-MAINLIST"),datas.followings,false);
                                                resetInfoBar();
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "重新载入数据";
                                            btn.onclick = async e => {
                                                await alertModal("重新载入数据", "正在重新载入数据和列表。将会重新获取所有数据。");
                                                datas.dommappings = {};
                                                await createMainWindow(true);
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "关于和反馈";
                                            btn.onclick = async e => {
                                                await alertModal("关于 “关注管理器”", (await makeDom("div", async div => {
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
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
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
                        list.className = "CKUNFOLLOW-scroll-list";
                        list.id = "CKUNFOLLOW-MAINLIST";
                        await renderListTo(list,datas.followings,!forceRefetch);
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
                switch(datas.fetchstat){
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
            const selection = getAll(`input.CKUNFOLLOW-data-inforow-toggle[data-targetmid="${mid}"]`);
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
        const isMainList = cacheAndreuse||datalist===datas.followings;
        dom.innerHTML = '';
        const getDomForData = async it=>{
            if(cacheAndreuse&&(datas.dommappings[it.mid+""]&& datas.dommappings[it.mid+""] instanceof HTMLElement)) return datas.dommappings[it.mid+""];
            return upinfoline(it);
        }
        for (let it of datalist) {
            const upinfolinedom = await getDomForData(it);
            dom.appendChild(upinfolinedom);
            if(isMainList) datas.dommappings[it.mid+""] = upinfolinedom;
        }
        resetInfoBar();
    }
    const renderTagListTo = async (dom,selectedId=[],cb = ()=>{},inManager = true) => {
        setInfoBar("正在渲染列表...");
        await wait(100);
        dom.innerHTML = '';
        for (let it of Object.values(datas.tags)) {
            log(it);
            dom.appendChild(await taginfoline(it,cb,selectedId.includes(it.tagid),inManager,inManager));
        }
        resetInfoBar();
    }
    const createScreen = async (content) => {
        getContainer().innerHTML = '';
        getContainer().appendChild(content);
    }

    const blockWindow = (block = true) => {
        addStyle(`
        #CKUNFOLLOW-blockWindow{
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
        #CKUNFOLLOW-blockWindow.hide{
            pointer-events: none;
            opacity: 0;
        }
        #CKUNFOLLOW-blockWindow.show{
            opacity: 1;
        }
        `, "CKUNFOLLOW-blockWindow-css", "unique");
        let dom = get("#CKUNFOLLOW-blockWindow");
        if (!dom) {
            dom = document.createElement("div");
            dom.id = "CKUNFOLLOW-blockWindow";
            dom.className = "hide";
            document.body.appendChild(dom);
        }
        datas.preventUserCard = block;
        if (block) {
            dom.className = "show";
        } else {
            dom.className = "hide";
        }
    }

    const injectSideBtn = () => {
        addStyle(`
        #CKUNFOLLOW-floatbtn{
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
        #CKUNFOLLOW-floatbtn::after,#CKUNFOLLOW-floatbtn::before{
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
        #CKUNFOLLOW-floatbtn::after{
            content: "← 关注管理器";
            animation:CKUNFOLLOW-tipsOut forwards 5s 3.5s;
        }
        #CKUNFOLLOW-floatbtn:hover::before{
            left: 30px;
            opacity: 1;
        }
        #CKUNFOLLOW-floatbtn:hover{
            border: solid 3px black;
            transition: opacity .3s 0s, background .3s, color .3s, left .3s, border .3s;
            background: white;
            color: black;
            opacity: 1;
            left: -5px;
        }
        #CKUNFOLLOW-floatbtn.hide{
            left: -40px;
        }
        @keyframes CKUNFOLLOW-tipsOut{
            5%,95%{
                opacity: 1;
                left: 20px;
            }
            0%,100%{
                left: -20px;
                opacity: 0;
            }
        }
        `, "CKUNFOLLOW-floatbtn-css", "unique");

        const toggle = document.createElement("div");
        toggle.id = "CKUNFOLLOW-floatbtn";
        toggle.innerHTML = `<i class="mdi mdi-18px mdi-wrench" style="display: inline-block;transform: rotateY(180deg) translateX(3px);"></i>`;
        toggle.onclick = () => createMainWindow();
        document.body.appendChild(toggle);
    }

    const startInject = () => {
        initModal();
        // unsafeWindow.addEventListener("message", event => {
        //     if (!event.data) return;
        //     if (!(event.data instanceof String)) return;
        //     if (event.data.startsWith("CKUNFOLLOWSTATUSCHANGES|")) {
        //         log(event.data)
        //         const parts = event.data.split("|");
        //         setToggleStatus(parts[1], parts[2] === "1");
        //     }
        // })
        injectSideBtn();
        if (cfg.debug) {
            unsafeWindow.CKUNFOLLOW_DBG = {
                cfg, datas
            }
        }
        unsafeWindow.openFollowManager = forceRefetch=>createMainWindow(forceRefetch);
    };

    startInject();
})();
