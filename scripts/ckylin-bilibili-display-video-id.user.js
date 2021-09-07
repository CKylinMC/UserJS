// ==UserScript==
// @name         哔哩哔哩视频页面常驻显示AV/BV号[已完全重构，支持显示分P标题]
// @namespace    ckylin-bilibili-display-video-id
// @version      1.9
// @description  始终在哔哩哔哩视频页面标题下方显示当前视频号，默认显示AV号，右键切换为BV号，单击弹窗可复制链接
// @author       CKylinMC
// @match        https://www.bilibili.com/video*
// @match        https://www.bilibili.com/medialist/play/*
// @resource     cktools https://greasyfork.org/scripts/429720-cktools/code/CKTools.js?version=967994
// @resource     popjs https://cdn.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.js
// @resource     popcss https://cdn.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.css
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceText
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @license      GPL-3.0-only
// ==/UserScript==

(function () {
    //======[Apply all resources]
    const resourceList = [
        {name:'cktools',type:'js'},
        {name:'popjs',type:'js'},
        {name:'popcss',type:'css'},
        {name:'popcsspatch',type:'rawcss',content:"div.popNotifyUnitFrame{z-index:110000!important;}"},
    ]
    function applyResource() {
        resloop:for(let res of resourceList){
            if(!document.querySelector("#"+res.name)){
                let el;
                switch (res.type) {
                    case 'js':
                    case 'rawjs':
                        el = document.createElement("script");
                        break;
                    case 'css':
                    case 'rawcss':
                        el = document.createElement("style");
                        break;
                    default:
                        console.log('Err:unknown type', res);
                        continue resloop;
                }
                el.id = res.name;
                el.innerHTML = res.type.startsWith('raw')?res.content:GM_getResourceText(res.name);
                document.head.appendChild(el);
            }
        }
    }
    applyResource();
    //======
    const wait = (t) => new Promise(r => setTimeout(r, t));
    const waitForPageVisible = async () => {
        return document.hidden && new Promise(r => document.addEventListener("visibilitychange", r))
    }
    const log = (...m) => console.log('[ShowAV]', ...m);
    const getAPI = (bvid) => fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid).then(raw => raw.json());
    const getAidAPI = (aid) => fetch('https://api.bilibili.com/x/web-interface/view?aid=' + aid).then(raw => raw.json());
    const config = {
        showAv: true,
        defaultAv: true,
        showPn: true,
        firstTimeLoad: true,
        showInNewLine: false,
        showCid: false,
        showCate: false,
        vduration: 0
    };
    const menuId = {
        showAv: -1,
        defaultAv: -1,
        showInNewLine:-1,
        showPn: -1,
        showCate:-1,
        showCid: -1,
    };
    let infos = {};

    async function initScript(flag = false) {
        for(let menuitem of Object.keys(menuId)){
            if(menuId[menuitem]!=-1) GM_unregisterMenuCommand(menuId[menuitem]);
        }
        for(let configKey of Object.keys(config)){
            if(typeof(await GM_getValue(configKey))==='undefined'){
                await GM_setValue(configKey, config[configKey]);
            }
        }
        if ((await GM_getValue("showAv"))) {
            config.showAv = true;
            menuId.showAv = GM_registerMenuCommand("隐藏视频编号[当前显示]", async () => {
                await GM_setValue("showAv", false);
                initScript(true);
            });
        } else {
            config.showAv = false;
            menuId.showAv = GM_registerMenuCommand("显示视频编号[当前隐藏]", async () => {
                await GM_setValue("showAv", true);
                initScript(true);
            });
        }
        if ((await GM_getValue("defaultAv"))) {
            config.defaultAv = true;
            menuId.defaultAv = GM_registerMenuCommand("默认显示BV号[当前显示av号]", async () => {
                await GM_setValue("defaultAv", false);
                initScript(true);
            });
        } else {
            config.defaultAv = false;
            menuId.defaultAv = GM_registerMenuCommand("默认显示av号[当前显示BV号]", async () => {
                await GM_setValue("defaultAv", true);
                initScript(true);
            });
        }
        if ((await GM_getValue("showPn"))) {
            config.showPn = true;
            menuId.showPn = GM_registerMenuCommand("隐藏视频分P信息[当前显示]", async () => {
                await GM_setValue("showPn", false);
                initScript(true);
            });
        } else {
            config.showPn = false;
            menuId.showPn = GM_registerMenuCommand("显示视频分P信息[当前隐藏]", async () => {
                await GM_setValue("showPn", true);
                initScript(true);
            });
        }
        if ((await GM_getValue("showCate"))) {
            config.showCate = true;
            menuId.showCate = GM_registerMenuCommand("隐藏视频分区信息[当前显示]", async () => {
                await GM_setValue("showCate", false);
                initScript(true);
            });
        } else {
            config.showCate = false;
            menuId.showCate = GM_registerMenuCommand("显示视频分区信息[当前隐藏]", async () => {
                await GM_setValue("showCate", true);
                initScript(true);
            });
        }
        if ((await GM_getValue("showCid"))) {
            config.showCid = true;
            menuId.showCid = GM_registerMenuCommand("隐藏视频CID信息[当前显示]", async () => {
                await GM_setValue("showCid", false);
                initScript(true);
            });
        } else {
            config.showCid = false;
            menuId.showCid = GM_registerMenuCommand("显示视频CID信息[当前隐藏]", async () => {
                await GM_setValue("showCid", true);
                initScript(true);
            });
        }
        if ((await GM_getValue("showInNewLine"))) {
            config.showInNewLine = true;
            menuId.showInNewLine = GM_registerMenuCommand("显示模式: 换行 [点击切换]", async () => {
                await GM_setValue("showInNewLine", false);
                let old = document.querySelector("#bilibiliShowInfos")
                if(old)old.remove();
                initScript(true);
            });
        } else {
            config.showInNewLine = false;
            menuId.showInNewLine = GM_registerMenuCommand("显示模式: 附加 [点击切换]", async () => {
                await GM_setValue("showInNewLine", true);
                let old = document.querySelector("#bilibiliShowInfos")
                if(old)old.remove();
                initScript(true);
            });
        }
        tryInject(flag);
    }

    function atleastOne(){
        let k = 0;
        [...arguments].map(v=>k+=v);
        return k>0;
    }

    async function playerReady() {
        let i = 150;
        while (--i > 0) {
            await wait(100);
            if (!('player' in unsafeWindow)) continue;
            if (!('isInitialized' in unsafeWindow.player)) continue;
            if (!unsafeWindow.player.isInitialized()) continue;
            break;
        }
        if (i < 0) return false;
        await waitForPageVisible();
        while (1) {
            await wait(200);
            if (document.querySelector(".bilibili-player-video-control-wrap")) return true;
        }
    }

    async function waitForDom(q) {
        let i = 50;
        let dom;
        while (--i >= 0) {
            if (dom = document.querySelector(q)) break;
            await wait(100);
        }
        return dom;
    }

    function getUrlParam(key) {
        return (new URL(location.href)).searchParams.get(key);
    }

    function getOrNew(id, parent,) {
        let marginDirection = config.showInNewLine ? "Right" : "Left";
        let target = document.querySelector("#" + id);
        if (!target) {
            target = document.createElement("span");
            target.id = id;
            target.style['margin'+marginDirection] = "16px";
            parent.appendChild(target);
        }
        return target;
    }

    async function getPlayerSeeks() {
        const video = await waitForDom(".bilibili-player-video video");
        let seconds = 0;
        if (video) {
            seconds = Math.floor(video.currentTime);
        }
        if (seconds == 0) {
            let fromParam = getUrlParam("t") || 0;
            return fromParam;
        } else return seconds;
    }

    async function registerVideoChangeHandler() {
        const video = await waitForDom(".bilibili-player-video video");
        if (!video) return;
        const observer = new MutationObserver(async e => {
            if (e[0].target.src) {
                tryInject(true);
            }
        });
        observer.observe(video, {attribute: true, attributes: true, childList: false});
    }

    function getPageFromCid(cid, infos) {
        if (!cid || !infos || !infos.pages) return 1;
        let pages = infos.pages;
        if (pages.length == 1) return 1;
        let page;
        for (page of pages) {
            if (!page) continue;
            if (page.cid == cid) return page.page;
        }
        return 1;
    }

    async function tryInject(flag) {
        if (flag && !atleastOne(
            config.showAv,
            config.showPn,
            config.showCid,
            config.showCate
        )) return log('Terminated because no option is enabled.');
        if (!(await playerReady())) return log('Can not load player in time.');

        if (config.firstTimeLoad) {
            registerVideoChangeHandler();
            config.firstTimeLoad = false;
        }

        if (location.pathname.startsWith("/medialist")) {
            let aid = unsafeWindow.aid;
            if (!aid) {
                console.log("SHOWAV", "Variable 'aid' is not available from unsafeWindow.");
                let activeVideo = await waitForDom(".player-auxiliary-playlist-item-active");
                aid = activeVideo.getAttribute("data-aid");
                //console.log("SHOWAV",activeVideo);
            }
            console.log("SHOWAV", aid);
            let apidata = await getAidAPI(aid);
            //console.log("SHOWAV",apidata);
            infos = apidata.data;
        } else {
            if (flag)
                infos = (await getAPI(unsafeWindow.bvid)).data;
            else infos = unsafeWindow.vd;
        }
        infos.p = getUrlParam("p") || getPageFromCid(unsafeWindow.cid, infos);

        const av_infobar = await waitForDom(".video-data");
        if (!av_infobar) return log('Can not load info-bar in time.');
        let av_root;
        if(config.showInNewLine){
            av_root = getOrNew("bilibiliShowInfos",av_infobar.parentElement);
        }else{
            let rootel = document.querySelector("#bilibiliShowInfos");
            if(!rootel){
                rootel = document.createElement("span");
                rootel.id = "bilibiliShowInfos";
                av_infobar.appendChild(rootel);
            }
            av_root = rootel;
        }
        //const av_root = getOrNew("bilibiliShowInfos",av_infobar);
        //const av_root = av_infobar;

        const cate_span = getOrNew("bilibiliShowCate", av_root);
        if (config.showCate) {
            cate_span.style.textOverflow = "ellipsis";
            cate_span.style.whiteSpace = "nowarp";
            cate_span.style.overflow = "hidden";
            cate_span.title = "分区:"+infos.tname;
            cate_span.innerText = "分区:"+infos.tname;
        } else cate_span.remove();

        const av_span = getOrNew("bilibiliShowAV", av_root);
        if (config.showAv) {
            if (config.defaultAv)
                av_span.innerText = 'av' + infos.aid;
            else
                av_span.innerText = infos.bvid;
            av_span.style.overflow = "hidden";
            av_span.oncontextmenu = e => {
                if (e.target.innerText.startsWith('av')) e.target.innerText = infos.bvid;
                else av_span.innerText = 'av' + infos.aid;
                e.preventDefault();
            }
            const video = await waitForDom("video");
            if (video) {
                config.vduration = Math.floor(video.duration);
            }
            const avspanHC = new CKTools.HoldClick(av_span);
            avspanHC.onclick(async e=>{
                let url = new URL(location.protocol + "//" + location.hostname + "/video/" + e.target.innerText);
                infos.p == 1 || url.searchParams.append("p", infos.p);
                let t = await getPlayerSeeks();
                if (t && t != "0" && t != ("" + config.vduration)) url.searchParams.append("t", t);
                copy(url);
                popNotify.success("完整地址复制成功", url);
            });
            avspanHC.onhold(async e=>{
                let url = new URL(location.protocol + "//" + location.hostname + "/video/" + e.target.innerText);
                infos.p == 1 || url.searchParams.append("p", infos.p);
                let vidurl = new URL(url);
                let t = await getPlayerSeeks();
                if (t && t != "0" && t != ("" + config.vduration)) url.searchParams.append("t", t);
                CKTools.modal.alertModal("高级复制",`
                <b>点击输入框可以快速复制</b><br>
                当前地址
                <input readonly style="width:440px" value="${vidurl}" onclick="showav_fastcopy(this);" /><br>
                含视频进度地址(仅在播放时提供)
                <input readonly style="width:440px" value="${url}" onclick="showav_fastcopy(this);" /><br>
                快速分享
                <input readonly style="width:440px" value="${infos.title}_地址:${vidurl}" onclick="showav_fastcopy(this);" /><br>
                快速分享(含视频进度)
                <input readonly style="width:440px" value="${infos.title}_地址:${url}" onclick="showav_fastcopy(this);" /><br>
                MarkDown格式
                <input readonly style="width:440px" value="[${infos.title}](${vidurl})" onclick="showav_fastcopy(this);" /><br>
                BBCode格式
                <input readonly style="width:440px" value="[url=${vidurl}]${infos.title}[/url]" onclick="showav_fastcopy(this);" /><br><br>
                <hr>
                AV号
                <input readonly style="width:440px" value="av${infos.aid}" onclick="showav_fastcopy(this);" /><br>
                BV号
                <input readonly style="width:440px" value="${infos.bvid}" onclick="showav_fastcopy(this);" /><br>
                资源CID
                <input readonly style="width:440px" value="${infos.cid}" onclick="showav_fastcopy(this);" /><br>
                `,"关闭");
            });
        } else av_span.remove();

        const cid_span = getOrNew("bilibiliShowCID", av_root);
        if (config.showCid) {
            cid_span.style.textOverflow = "ellipsis";
            cid_span.style.whiteSpace = "nowarp";
            cid_span.style.overflow = "hidden";
            cid_span.title = "CID:"+infos.cid;
            cid_span.innerText = "CID:"+infos.cid;
            const cidspanHC = new CKTools.HoldClick(cid_span);
            cidspanHC.onclick(()=>{
                copy(currentPageName);
                popNotify.success("CID复制成功", infos.cid);
            });
            cidspanHC.onhold(()=>{
                CKTools.modal.alertModal("CID信息",`
                <input readonly style="width:440px" value="${infos.cid}" />
                `,"关闭");
            });
        } else cid_span.remove();

        const pn_span = getOrNew("bilibiliShowPN", av_root);
        if (config.showPn) {
            const videoData = infos;
            if (!videoData) return;
            let part = {
                part: 'P' + infos.p
            }
            try {
                part = videoData.pages[infos.p - 1];
            } catch (e) {
                part = videoData.pages[0];
            }
            let currentPageName = part.part.length ? `《${part.part}》` : '';
            let currentPageNum;
            let delimiters;
            if (videoData.videos != 1) {
                currentPageNum = `P ${infos.p}/${videoData.videos}`;
                delimiters = ["\n", " "];
            } else {
                currentPageNum = "";
                delimiters = ["", ""];
            }
            pn_span.style.textOverflow = "ellipsis";
            pn_span.style.whiteSpace = "nowarp";
            pn_span.style.overflow = "hidden";
            pn_span.title = currentPageNum + delimiters[0] + currentPageName
            pn_span.innerText = currentPageNum + delimiters[1] + currentPageName;
            const pnspanHC = new CKTools.HoldClick(pn_span);
            pnspanHC.onclick(()=>{
                copy(currentPageName);
                popNotify.success("分P标题复制成功", currentPageName);
            });
            pnspanHC.onhold(()=>{
                CKTools.modal.alertModal("分P标题",`
                <input readonly style="width:440px" value="${currentPageName}" />
                `,"关闭");
            });
        } else pn_span.remove();
        log('infos',infos);
    }

    const copy = function copy(text) {
        if (!navigator.clipboard) {
            prompt('请手动复制',text);
            return;
        }
        navigator.clipboard.writeText(text).then(function() {
            log('Copy OK');
        }, function(err) {
            log('Auto Copy Failed:',err);
            prompt('请手动复制',text);
        });
    }

    unsafeWindow.showav_fastcopy = (el)=>{
        copy(el.value);
        popNotify.success("复制成功", el.value);
    }

    initScript(false);
})();
