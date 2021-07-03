// ==UserScript==
// @name         [Bilibili] 关注清理器
// @namespace    ckylin-bilibili-unfollow
// @version      0.01
// @description  快速查找和清理已关注但是不活跃的用户
// @author       CKylinMC
// @include      http://space.bilibili.com/*
// @include      https://space.bilibili.com/*
// @connect      api.bilibili.com
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceText
// @grant        unsafeWindow
// @license      GPLv3 License
// ==/UserScript==
(function () {
    'use strict';
    if (typeof (unsafeWindow) === "undefined") var unsafeWindow = window;
    const datas = {
        status: 0,
        total: 0,
        fetched: 0,
        pages: 0,
        followings: [],
        mappings: {},
        checked: [],
    };
    const cfg = {
        retrial: 3
    }
    const get = q => document.querySelector(q);
    const getAll = q => document.querySelectorAll(q);
    const wait = t => new Promise(r => setTimeout(r, t));
    const log = (...m) => console.log('[Unfollow]', ...m);
    const _ = async (func = () => {
    }, ...args) => await func(...args);
    const makeDom = async (domname, func = () => {
    }, ...args) => {
        const d = document.createElement(domname);
        await _(func, d, ...args);
        return d;
    };
    /* StackOverflow 10730362 */
    const getCookie = (name)=>{
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
    const getCSRFToken = ()=>getCookie("bili_jct");
    const getBgColor = () => {/*兼容blbl进化的夜间模式*/
        try {
            let color = getComputedStyle(document.body).backgroundColor;
            if (color === "rgba(0, 0, 0, 0)") return "white";
            else return color;
        } catch (e) {
            return "white"
        }
    }

    async function waitForAttribute(q, attr) {
        let i = 50;
        let value;
        while (--i >= 0) {
            if ((attr in q) &&
                q[attr] != null) {
                value = q[attr];
                break;
            }
            await wait(100);
        }
        return value;
    }

    const getCurrentUid = async () => {
        // setInfoBar("正在查询当前用户UID - 方案1");
        // let res = await waitForAttribute(unsafeWindow, "DedeUserID");
        // if (!res) {
        //     setInfoBar("正在查询当前用户UID - 方案2");
        //     res = await waitForAttribute(unsafeWindow, "UserStatus");
        //     if (res && res.userInfo && res.userInfo.mid) return res.userInfo.mid;
        //     else {
        //         setInfoBar("正在查询当前用户UID - 方案3");
        setInfoBar("正在查询当前用户UID");
        let paths = location.pathname.split('/');
        if (paths.length > 1) {
            return paths[1];
        } else throw "Failed to get current ID";
        //     }
        // } else return res;
    };
    const getHeaders = () => {
        return {
            "user-agent": unsafeWindow.navigator.userAgent,
            "cookie": unsafeWindow.document.cookie,
            "origin": "space.bilibili.com",
            "referer": "https://www.bilibili.com/"
        }
    };
    const getFetchURL = (uid, pn) => `https://api.bilibili.com/x/relation/followings?vmid=${uid}&pn=${pn}&ps=50&order=desc&order_type=attention`;
    const getUnfolURL = (uid, csrf) => `https://api.bilibili.com/x/relation/modify?fid=${uid}&act=2&re_src=11&jsonp=jsonp&csrf=${csrf}`;
    const getRequest = path => new Request(path, {
        method: 'GET',
        headers: getHeaders(),
        credentials: "include"
    });
    const getPostRequest = path => new Request(path, {
        method: 'POST',
        headers: getHeaders(),
        credentials: "include"
    });
    const unfollowUser = async uid=>{
        try{
            const jsonData = await (await fetch(getPostRequest(getUnfolURL(uid, getCSRFToken())))).json()
            if(jsonData&&jsonData.code===0) return {ok:true,res:""};
            return {ok:false,uid,res:jsonData.message};
        }catch (e) {
            return {ok:false,uid,res:e.message};
        }
    }
    const unfollowUsers = async uids=>{
        let okgroup = [];
        let errgroup = [];
        for(let uid of uids){
            setInfoBar(`正在取关 ${uid} ...`)
            let result = await unfollowUser(uid);
            log(result);
            if(result.ok){
                okgroup.push(uid);
            }else{
                errgroup.push(uid);
            }
        }
        setInfoBar(`取关完成`)
        return {
            ok: errgroup.length === 0,
            okgroup,errgroup
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
    const getFollowings = async () => {
        if (datas.status === 1) return;
        datas.status = 1;
        datas.followings = [];
        datas.fetched = 0;
        let currentPageNum = 1;
        const uid = await getCurrentUid();
        const firstPageData = await fetchFollowings(uid, currentPageNum);
        if (!firstPageData) throw "Failed to fetch followings";
        datas.total = firstPageData.data.total;
        datas.pages = Math.floor(datas.total / 50) + (datas.total % 50 ? 1 : 0);
        datas.followings = datas.followings.concat(firstPageData.data.list);
        datas.fetched += firstPageData.data.list.length;
        firstPageData.data.list.forEach(it => {
            datas.mappings[it.mid] = it;
        })
        currentPageNum += 1;
        for (; currentPageNum <= datas.pages; currentPageNum++) {
            const currentData = await fetchFollowings(uid, currentPageNum);
            if (!currentData) break;
            datas.followings = datas.followings.concat(currentData.data.list);
            datas.fetched += currentData.data.list.length;
            currentData.data.list.forEach(it => {
                datas.mappings[it.mid] = it;
            });
            setInfoBar(`正在查询关注数据：已获取 ${datas.fetched} 条数据`);
        }
        datas.status = 2;
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
            transform: translate(-50%,-50%) scale(0.6);
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
        }
        .CKUNFOLLOW-data-inforow:hover{
            background: #2196f361;
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
        }
        .CKUNFOLLOW-toolbar-btns:hover{
            filter: brightness(0.85);
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
        closebtn.style.color = "black";
        closebtn.onclick = hidePanel;
        win.appendChild(closebtn);

        const titleText = document.createElement("div");
        titleText.innerHTML = `<h1>关注筛选器</h1>`;
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
            transform: translate(-50%,-50%) scale(0.6);
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
            console.log("unknown: ", ct);
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
            console.log("unknown: ", ct);
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
        let modal = get("#CKUNFOLLOW-modal");
        if (modal) modal.remove();
    }
    const addMdiBtnStyle = () => {
        if (document.querySelector("#CKUNFOLLOW-MDICSS")) return;
        document.head.innerHTML += `<link id="CKUNFOLLOW-MDICSS" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@5.9.55/css/materialdesignicons.min.css"/>`;
    }
    const refreshChecked = () => {
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
        return datas.checked;
    }
    const toggleSwitch = (mid, status = false) => {
        unsafeWindow.postMessage(`CKUNFOLLOWSTATUSCHANGES|${mid}|${status ? 1 : 0}`)
    }
    const upinfoline = async data => {
        let invalid = isInvalid(data);
        return await makeDom("li", async item => {
            item.className = "CKUNFOLLOW-data-inforow";
            item.onclick = e => {
                if (e.target.classList.contains("CKUNFOLLOW-data-inforow-name")) {
                    open("https://space.bilibili.com/" + data.mid);
                } else if (e.target.tagName !== "INPUT") {
                    const toggle = item.querySelector("input");
                    toggle.checked = !toggle.checked;
                }
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
                }
            }));
            item.appendChild(await makeDom("span", subtime => {
                subtime.style.flex = "1";
                subtime.innerHTML = "关注于" + (new Intl.DateTimeFormat('zh-CN').format(data.mtime + "000"));
                const nearly = (new Date).getTime() - (60 * 60 * 24 * 7 * 4 * 3 * 1000);
                const loneAgo = (new Date).getTime() - (60 * 60 * 24 * 7 * 4 * 12 * 2 * 1000);
                if ((data.mtime + "000") > nearly) {
                    title += " | 两个月内关注";
                } else if ((data.mtime + "000") < loneAgo) {
                    title += " | 至少两年前关注";
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
                }
            }));
            item.setAttribute("title", title);
        });
    }
    const doUnfollowChecked = async ()=>{
        const checked = datas.checked;
        if(!checked || checked.length===0) return alertModal("无法操作","实际选中数量为0，没有任何人被选中取关。","");
        //alertModal("调试|模拟取关",`取关的列表：<br>`+checked.join(","));
        await alertModal("正在取消关注...",`正在取关${checked.length}个用户，请耐心等候~`);
        const result = await unfollowUsers(checked);
        if(result.ok){
            await alertModal("操作结束",`已取关 ${result.okgroup.length} 个用户。`,"继续");
        }else{
            await alertModal("操作结束",`已取关 ${result.okgroup.length} 个用户，但有另外 ${result.errgroup.length} 个用户取关失败。`,"继续");
        }
        datas.checked = [];
        log("取关结果",result);
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
    }
    const createUnfollowModal = async () => {
        refreshChecked();
        if (datas.checked.length === 0) {
            alertModal("取消关注", `你没有勾选任何人，所以无法取关。请勾选后再点击取关按钮。`, "知道了")
        } else
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
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.style.background = "red";
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
    const createMainWindow = async () => {
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
        getFollowings()
            .then(async () => {
                createScreen(await makeDom("div", async screen => {
                    const toolbar = await makeDom("div", async toolbar => {
                        toolbar.style.display = "flex";
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '取关选中';
                            btn.style.background = "#e91e63";
                            btn.onclick = e => {
                                createUnfollowModal();
                            };
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '全选';
                            btn.onclick = e => {
                                const all = getAll(".CKUNFOLLOW-data-inforow-toggle");
                                if (all) {
                                    [...all].forEach(it => {
                                        it.checked = true;
                                        it.onchange();
                                    });
                                }
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '反选';
                            btn.onclick = e => {
                                const all = getAll(".CKUNFOLLOW-data-inforow-toggle");
                                if (all) {
                                    [...all].forEach(it => {
                                        it.checked = !it.checked;
                                        it.onchange();
                                    });
                                }
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '全不选';
                            btn.onclick = e => {
                                const all = getAll(".CKUNFOLLOW-data-inforow-toggle");
                                if (all) {
                                    [...all].forEach(it => {
                                        it.checked = false;
                                        it.onchange();
                                    });
                                }
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '间选';
                            btn.onclick = e => {
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
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '筛选';
                            btn.onclick = async e => {
                                alertModal("施工中", "此功能尚未实现！", "返回");
                            }
                        }))
                        toolbar.appendChild(await makeDom("button", btn => {
                            btn.className = "CKUNFOLLOW-toolbar-btns";
                            btn.innerHTML = '排序';
                            btn.onclick = async e => {
                                openModal("选择排序方式", await makeDom("div", async select => {
                                    select.style.alignContent = "stretch";
                                    [
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "按最新关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在按最新关注排序...");
                                                datas.followings.sort((x, y) => parseInt(y.mtime) - parseInt(x.mtime))
                                                renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "按最早关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在按最早关注排序...");
                                                datas.followings.sort((x, y) => parseInt(x.mtime) - parseInt(y.mtime))
                                                renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "大会员优先";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在按大会员优先排序...");
                                                datas.followings.sort((x, y) => parseInt(y.vip.vipType) - parseInt(x.vip.vipType))
                                                renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "无会员优先";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在按无会员优先排序...");
                                                datas.followings.sort((x, y) => parseInt(x.vip.vipType) - parseInt(y.vip.vipType))
                                                renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "认证优先";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在按认证优先排序...");
                                                datas.followings.sort((x, y) => parseInt(y.official_verify.type) - parseInt(x.official_verify.type))
                                                renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "无认证优先";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在按无认证优先排序...");
                                                datas.followings.sort((x, y) => parseInt(x.official_verify.type) - parseInt(y.official_verify.type))
                                                renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "已注销优先";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在按已注销优先排序...");
                                                datas.followings.sort((x, y) => {
                                                    const xint = isInvalid(x) ? 1 : 0;
                                                    const yint = isInvalid(y) ? 1 : 0;
                                                    return yint - xint;
                                                })
                                                renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "特别关注优先";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在按特别关注优先排序...");
                                                datas.followings.sort((x, y) => parseInt(y.special) - parseInt(x.special))
                                                renderListTo(get(".CKUNFOLLOW-scroll-list"));
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "互相关注优先";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在按互相关注优先排序...");
                                                datas.followings.sort((x, y) => parseInt(y.attribute) - parseInt(x.attribute))
                                                renderListTo(get(".CKUNFOLLOW-scroll-list"));
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
                            btn.innerHTML = '快速工具';
                            btn.onclick = async e => {
                                openModal("选择排序方式", await makeDom("div", async select => {
                                    select.style.alignContent = "stretch";
                                    [
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "加选: 所有已注销用户";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在处理加选");
                                                for (let d of datas.followings) {
                                                    if (isInvalid(d)) {
                                                        toggleSwitch(d.mid, true);
                                                    }
                                                }
                                                setInfoBar("完成");
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "加选: 所有两年前的关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在处理加选");
                                                const isLongAgo = (d) => {
                                                    const loneAgo = (new Date).getTime() - (60 * 60 * 24 * 7 * 4 * 12 * 2 * 1000);
                                                    return (d.mtime + "000") < loneAgo;
                                                }
                                                for (let d of datas.followings) {
                                                    if (isLongAgo(d)) {
                                                        toggleSwitch(d.mid, true);
                                                    }
                                                }
                                                setInfoBar("完成");
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "加选: 所有两个月内的关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在处理加选");
                                                const isNearly = d => {
                                                    const nearly = (new Date).getTime() - (60 * 60 * 24 * 7 * 4 * 3 * 1000);
                                                    return (data.mtime + "000") > nearly;
                                                }
                                                for (let d of datas.followings) {
                                                    if (isNearly(d)) {
                                                        toggleSwitch(d.mid, true);
                                                    }
                                                }
                                                setInfoBar("完成");
                                            }
                                        }),
                                        divider(),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "减选: 所有两年前的关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在处理减选");
                                                const isLongAgo = (d) => {
                                                    const loneAgo = (new Date).getTime() - (60 * 60 * 24 * 7 * 4 * 12 * 2 * 1000);
                                                    return (d.mtime + "000") < loneAgo;
                                                }
                                                for (let d of datas.followings) {
                                                    if (!isLongAgo(d)) {
                                                        toggleSwitch(d.mid, true);
                                                    }
                                                }
                                                setInfoBar("完成");
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "减选: 所有两个月内的关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在处理减选");
                                                const isNearly = d => {
                                                    const nearly = (new Date).getTime() - (60 * 60 * 24 * 7 * 4 * 3 * 1000);
                                                    return (data.mtime + "000") > nearly;
                                                }
                                                for (let d of datas.followings) {
                                                    if (!isNearly(d)) {
                                                        toggleSwitch(d.mid, true);
                                                    }
                                                }
                                                setInfoBar("完成");
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "减选: 所有有大会员的关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在处理减选");
                                                const hasVIP = d => {
                                                    return d.vip.vipType !== 0;
                                                }
                                                for (let d of datas.followings) {
                                                    if (hasVIP(d)) {
                                                        toggleSwitch(d.mid, false);
                                                    }
                                                }
                                                setInfoBar("完成");
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "减选: 所有认证账号的关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在处理减选");
                                                const isVerified = d => {
                                                    return d.official_verify.type > 0;
                                                }
                                                for (let d of datas.followings) {
                                                    if (isVerified(d)) {
                                                        toggleSwitch(d.mid, false);
                                                    }
                                                }
                                                setInfoBar("完成");
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "减选: 所有特别关注的关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在处理减选");
                                                const isSpecial = d => {
                                                    return d.special === 1;
                                                }
                                                for (let d of datas.followings) {
                                                    if (isSpecial(d)) {
                                                        toggleSwitch(d.mid, false);
                                                    }
                                                }
                                                setInfoBar("完成");
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "减选: 所有互相关注的关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在处理减选");
                                                const isFans = d => {
                                                    return d.attribute === 6;
                                                }
                                                for (let d of datas.followings) {
                                                    if (isFans(d)) {
                                                        toggleSwitch(d.mid, false);
                                                    }
                                                }
                                                setInfoBar("完成");
                                            }
                                        }),
                                        await makeDom("button", btn => {
                                            btn.className = "CKUNFOLLOW-toolbar-btns";
                                            btn.style.margin = "4px 0";
                                            btn.innerHTML = "减选: 所有有分组的关注";
                                            btn.onclick = e => {
                                                hideModal();
                                                setInfoBar("正在处理减选");
                                                const hasGroup = d => {
                                                    return d.tag !== null;
                                                }
                                                for (let d of datas.followings) {
                                                    if (hasGroup(d)) {
                                                        toggleSwitch(d.mid, false);
                                                    }
                                                }
                                                setInfoBar("完成");
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
                    });
                    const list = await makeDom("div", async list => {
                        list.className = "CKUNFOLLOW-scroll-list";
                        await renderListTo(list);
                    })
                    screen.appendChild(toolbar);
                    screen.appendChild(list);
                }));
            })
            .catch(async () => {
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
    const setToggleStatus = (mid, status = false) => {
        const selection = getAll(`input.CKUNFOLLOW-data-inforow-toggle[data-targetmid="${mid}"]`);
        if (selection) {
            for (let el of selection) {
                el.checked = status;
            }
        }
        if (datas.checked.includes(mid + "")) datas.checked.splice(datas.checked.indexOf(mid + ""), 1);
        else if (datas.checked.includes(parseInt(mid))) datas.checked.splice(datas.checked.indexOf(parseInt(mid)), 1);
    }
    const renderListTo = async (dom, datalist = datas.followings) => {
        setInfoBar("正在生成列表...");
        dom.innerHTML = '';
        for (let it of datalist) {
            dom.appendChild(await upinfoline(it));
        }
        setInfoBar(`共读取 ${datas.fetched} 条关注`);
    }
    const createScreen = async (content) => {
        getContainer().innerHTML = '';
        getContainer().appendChild(content);
    }

    const injectSideBtn = () => {
        addStyle(`
        #CKUNFOLLOW-floatbtn{
            z-index: 9999;
            position: fixed;
            left: -15px;
            width: 30px;
            height: 30px;
            background: black;
            opacity: 0.4;
            color: white;
            cursor: pointer;
            border-radius: 50%;
            text-align: right;
            line-height: 30px;
            transition: opacity .3s 1s, background .3s, color .3s;
            top: 120px;
            top: 30vh;
        }
        #CKUNFOLLOW-floatbtn:hover{
            transition: opacity .3s 0s, background .3s, color .3s;
            background: white;
            color: black;
            opacity: 0.75;
        }
        #CKUNFOLLOW-floatbtn.hide{
            left: -40px;
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
        unsafeWindow.addEventListener("message", event => {
            if (!event.data) return;
            if (event.data.startsWith("CKUNFOLLOWSTATUSCHANGES|")) {
                const parts = event.data.split("|");
                setToggleStatus(parts[1], parts[2] === "1");
            }
        })
        injectSideBtn();
    };

    startInject();
})();