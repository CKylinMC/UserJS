// ==UserScript==
// @name         [Bilibili] 关注管理器
// @namespace    ckylin-bilibili-manager
// @version      0.1.12
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
        checked: [],
        tags: {},
        self: 0,
        isSelf: false,
        currInfo: {
            black: -1,
            follower: -1,
            following: -1,
            mid: -1,
            whisper: -1,
        }
    };
    const cfg = {
        debug: false,
        test: 4,
        retrial: 3,
        VERSION: "0.1.12 Preview",
        infobarTemplate: ()=>`共读取 ${datas.fetched} 条关注`,
        titleTemplate: ()=>`<h1>关注管理器 <small>v${cfg.VERSION} ${cfg.debug?"debug":""}</small></h1>`
    }
    const get = q => document.querySelector(q);
    const getAll = q => document.querySelectorAll(q);
    const wait = t => new Promise(r => setTimeout(r, t));
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
    const getFetchURL = (uid, pn) => `https://api.bilibili.com/x/relation/followings?vmid=${uid}&pn=${pn}&ps=50&order=desc&order_type=attention`;
    const getUnfolURL = () => `https://api.bilibili.com/x/relation/modify`;
    const getFollowURL = () => `https://api.bilibili.com/x/relation/batch/modify`;
    const getLatestVidURL = uid => `https://api.bilibili.com/x/space/arc/search?mid=${uid}&ps=1&pn=1`
    const getSubInfoURL = uid => `https://api.bilibili.com/x/relation/stat?vmid=${uid}`;
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
                    && jsonData.data.list.vlist
                ) {
                    if (jsonData.data.list.vlist.length === 0) {
                        return {ok: false}
                    }
                    const vid = jsonData.data.list.vlist[0];
                    return {ok: true, value: vid.created}
                } else {
                    return {ok: false}
                }
            } else {
                return {ok: false}
            }
        } catch (e) {
            return {ok: false}
        }
    };
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
                }
            }
        } catch (e) {

        }
        return {ok: false}
    }
    const fillUserStatus = async uid => {
        setInfoBar(`正在为${uid}填充用户信息`)
        uid = parseInt(uid);
        const userinfo = await getUserStats(uid);
        if (userinfo.ok) {
            datas.mappings[uid].level = userinfo.level;
            datas.mappings[uid].banned = userinfo.banned;
            datas.mappings[uid].RIP = userinfo.RIP;
            datas.mappings[uid].disputed = userinfo.disputed;
            datas.mappings[uid].notice = userinfo.notice;
            datas.mappings[uid].sign = userinfo.sign;
            if (!userinfo.banned && !userinfo.RIP) {
                const lastUpdate = await getLatestVideoPublishDate(uid);
                if (lastUpdate.ok) datas.mappings[uid].lastUpdate = lastUpdate.value;
            }
            log(uid, datas.mappings[uid]);
        } else {
            log(uid, "fetch space info failed");
        }
    }
    const batchOperateUser = async (uids = [], isBlock = false) => {
        if (uids.length === 0) return {ok: false, res: "UIDS is empty"};
        const act = isBlock ? 5 : 1;
        try {
            const jsonData = await (await fetch(getPostRequest(getFollowURL(), new URLSearchParams(`fids=${uids.join(',')}&act=${act}&re_src=11&jsonp=jsonp&csrf=${getCSRFToken()}`)))).json()
            if (jsonData && jsonData.code === 0) return {ok: true, uids, res: ""};
            return {ok: false, uids, res: jsonData.message, data: jsonData.data};
        } catch (e) {
            return {ok: false, uids, res: e.message};
        }
    }
    const unfollowUser = async uid => {
        try {
            const jsonData = await (await fetch(getPostRequest(getUnfolURL(), new URLSearchParams(`fid=${uid}&act=2&re_src=11&jsonp=jsonp&csrf=${getCSRFToken()}`)))).json()
            if (jsonData && jsonData.code === 0) return {ok: true, uid, res: ""};
            return {ok: false, uid, res: jsonData.message};
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
                        throw "Not the owner of uid " + uid;
                    }
                }
                log("Unexcept fetch result", "retry:", retry, "uid:", uid, "p:", page, "data", jsonData)
            } catch (e) {
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
        cfg.titleTemplate = ()=>`<h1>关注管理器 <small>v${cfg.VERSION} ${cfg.debug?"debug":""} <span style="color:grey;font-size:x-small;margin-right:12px;float:right">当前展示: UID:${datas.self} ${datas.isSelf?"(你)":`(${document.title.replace("的个人空间_哔哩哔哩_Bilibili","")})`}</span></small></h1>`
        setTitle();
        let needreload = true;
        const currInfo = await getCurrSubStat(uid);
        if (datas.currInfo.following !== -1 && currInfo !== null) {
            if (force === false && datas.currInfo.following === currInfo.following) {
                if (datas.fetched > 0)
                    needreload = false;
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
        }else{
            log("Using last result.");
            cfg.infobarTemplate = ()=>`共读取 ${datas.fetched} 条关注(缓存,<a href="javascript:void(0)" onclick="openFollowManager(true)">点此重新加载</a>)`
            setInfoBar("使用上次数据");
        }
        datas.status = 2;
        log("fetch completed.");
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
                    open("https://space.bilibili.com/" + data.mid);
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
                    if (data.special === 1) {
                        name.innerHTML = `<i class="mdi mdi-18px mdi-heart" style="color:orangered!important" title="特别关注"></i>` + name.innerHTML;
                        title += " | 特别关注";
                    }
                    if (data.attribute === 6) {
                        name.innerHTML = `<i class="mdi mdi-18px mdi-swap-horizontal" style="color:orangered!important" title="互相关注"></i>` + name.innerHTML;
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
                        name.innerHTML = `<i class="mdi mdi-18px mdi-cancel" style="color:red!important" title="账号已封禁"></i>` + name.innerHTML;
                        title += " | 账号已封禁";
                    }
                    if (info.RIP) {
                        name.innerHTML = `<i class="mdi mdi-18px mdi-candle" style="color:black!important" title="纪念账号"></i>` + name.innerHTML;
                        title += " | 纪念账号";
                    }
                    if (info.disputed) {
                        name.innerHTML = name.innerHTML + `<i class="mdi mdi-18px mdi-frequently-asked-questions" style="color:orangered!important" title="账号有争议"></i>`;
                        title += " | 账号有争议";
                    }
                    if (info.notice && info.notice.content && !info.banned && !info.RIP && !info.disputed) {
                        name.innerHTML = name.innerHTML + `<i class="mdi mdi-18px mdi-information" style="color:grey!important" title="${info.notice.toString()}"></i>`;
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
    const createExtendedInfoModal = async () => {
        hideModal();
        await wait(300);
        openModal("获取更多信息: 谨慎操作!", await makeDom("div", async container => {
            [
                await makeDom("div", tip => {
                    tip.innerHTML = `你正在尝试为选中的关注用户获取更多信息。<br><br><b>由于B站官方限制，不推荐一次性获取大量用户的更多信息。强行获取大量用户的更多信息，可能会导致你的IP地址被封禁，在一段时间内不能访问B站甚至更严重后果，由于具体限制和惩罚尚不明确，因此请谨慎使用此功能。</b><br><br>一般来说，扩展信息仅在不了解部分用户或想要快速获得多个关注用户的状态时使用，<b>因此请尽量减少选中数量然后再使用此功能</b>。`
                }),
                await makeDom("button", btn => {
                    btn.className = "CKUNFOLLOW-toolbar-btns orange";
                    btn.style.margin = "4px 0";
                    btn.innerHTML = "知道了，继续"
                    btn.onclick = async () => {
                        hideModal();
                        await wait(300);
                        refreshChecked();
                        openModal("获取更多信息", await makeDom("div", async container => {
                            container.appendChild(await makeDom("div", tip => {
                                tip.style.color = "red";
                                tip.style.fontWeight = "bold";
                                tip.innerHTML = `确认要获取信息的用户列表。<br>请尽量减少一次性选中的数量。`;
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
                                await renderListTo(checkedlistdom, checkedList);
                            }))
                            container.appendChild(await makeDom("div", async btns => {
                                btns.style.display = "flex";
                                [
                                    await makeDom("button", btn => {
                                        btn.className = "CKUNFOLLOW-toolbar-btns red";
                                        btn.innerHTML = "确认";
                                        btn.onclick = async e => {
                                            await alertModal("正在获取信息...", `正在为${datas.checked.length}个用户获取信息，请耐心等候~`);
                                            for (let uid of datas.checked) {
                                                await fillUserStatus(uid)
                                            }
                                            await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                            hideModal();
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
                }),
                await makeDom("button", btn => {
                    btn.className = "CKUNFOLLOW-toolbar-btns";
                    btn.style.margin = "4px 0";
                    btn.innerHTML = "我再考虑下";
                    btn.onclick = () => hideModal();
                }),
            ].forEach(el => container.appendChild(el));
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
                await renderListTo(checkedlistdom, checkedList);
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
                            const result = await batchOperateUser(finalList, isBlock);
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
                await renderListTo(unfolistdom, unfolist);
            }))
            container.appendChild(await makeDom("div", async btns => {
                btns.style.display = "flex";
                [
                    await makeDom("button", btn => {
                        btn.className = "CKUNFOLLOW-toolbar-btns red";
                        btn.innerHTML = "确认";
                        btn.onclick = e => {
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
            setInfoBar("正在按已选中优先排序...");
            await wait(1);
            datas.followings.sort((x, y) => {
                const xint = (datas.checked.includes(x.mid + "") || datas.checked.includes(parseInt(x.mid))) ? 1 : 0;
                const yint = (datas.checked.includes(y.mid + "") || datas.checked.includes(parseInt(y.mid))) ? 1 : 0;
                return yint - xint;
            })
            await renderListTo(get(".CKUNFOLLOW-scroll-list"));
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
        getFollowings(forceRefetch)
            .then(async () => {
                createScreen(await makeDom("div", async screen => {
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
                                        await makeDom("button", async btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = '扩展信息';
                                            btn.onclick = () => createExtendedInfoModal();
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
                                    [
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
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
                                                await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "按最新关注";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按最新关注排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.mtime) - parseInt(x.mtime))
                                                await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "按最早关注";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按最早关注排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(x.mtime) - parseInt(y.mtime))
                                                await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "大会员优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按大会员优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.vip.vipType) - parseInt(x.vip.vipType))
                                                await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "无会员优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按无会员优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(x.vip.vipType) - parseInt(y.vip.vipType))
                                                await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "认证优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按认证优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.official_verify.type) - parseInt(x.official_verify.type))
                                                await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "无认证优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按无认证优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(x.official_verify.type) - parseInt(y.official_verify.type))
                                                await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
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
                                                await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "特别关注优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按特别关注优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.special) - parseInt(x.special))
                                                await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                                hideModal();
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "互相关注优先";
                                            btn.onclick = async e => {
                                                setInfoBar("正在按互相关注优先排序...");
                                                await alertModal("正在排序...", "请稍等...");
                                                refreshChecked();
                                                datas.followings.sort((x, y) => parseInt(y.attribute) - parseInt(x.attribute))
                                                await renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                                hideModal();
                                            }
                                        }),
                                        divider(),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "不修改|取消";
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
                                                            btn.innerHTML = "减选: 所有两年前的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (!isLongAgo(d)) {
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
                                                            btn.innerHTML = "减选: 所有两个月内的关注";
                                                            btn.onclick = async e => {
                                                                setInfoBar("正在处理减选");
                                                                await alertModal("正在处理...", "请稍等...");
                                                                for (let d of datas.followings) {
                                                                    if (!isNearly(d)) {
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
                                                            btn.innerHTML = "不修改|取消";
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
                                                await alertModal("导出UID", `
                                                UID列表(请手动复制)
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
                                                                            const result = await batchOperateUser(finalList, false);
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
                                        divider(),
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
                        await renderListTo(list);
                    })
                    screen.appendChild(toolbar);
                    screen.appendChild(list);
                }));
            })
            .catch(async (e) => {
                log(e);
                setInfoBar();
                createScreen(await makeDom("div", dom => {
                    dom.style.position = "fixed";
                    dom.style.left = "50%";
                    dom.style.top = "50%";
                    dom.style.transform = "translate(-50%,-50%)";
                    dom.style.textAlign = "center";
                    dom.innerHTML = `<h2><i class="mdi mdi-alert-remove" style="color:orangered"></i><br>获取数据出错</h2>请注意，当前仅支持查询自己的关注<br>如果打开的时自己的关注页面，请重新打开窗口重试<br><button onclick="location.href='https://space.bilibili.com/'">前往你的个人空间</button>`;
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
    const renderListTo = async (dom, datalist = datas.followings) => {
        setInfoBar("正在渲染列表...");
        await wait(1);
        dom.innerHTML = '';
        for (let it of datalist) {
            dom.appendChild(await upinfoline(it));
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
            log("TEST",cfg.test)
        }
        unsafeWindow.openFollowManager = forceRefetch=>createMainWindow(forceRefetch);
    };

    startInject();
})();
