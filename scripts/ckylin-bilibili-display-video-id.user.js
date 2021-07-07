// ==UserScript==
// @name         哔哩哔哩视频页面常驻显示AV/BV号[已完全重构，支持显示分P标题]
// @namespace    ckylin-bilibili-display-video-id
// @version      1.6
// @description  始终在哔哩哔哩视频页面标题下方显示当前视频号，默认显示AV号，右键切换为BV号，单击弹窗可复制链接
// @author       CKylinMC
// @match        https://www.bilibili.com/video*
// @match        https://www.bilibili.com/medialist/play/*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @license      GPL-3.0-only
// ==/UserScript==

(function () {
    const wait = (t) => new Promise(r => setTimeout(r, t));
    const log = (...m) => console.log('[ShowAV]', ...m);
    const getAPI = (bvid)=>fetch('https://api.bilibili.com/x/web-interface/view?bvid='+bvid).then(raw=>raw.json());
    const getAidAPI = (aid)=>fetch('https://api.bilibili.com/x/web-interface/view?aid='+aid).then(raw=>raw.json());
    const config = {
        showAv: true,
        defaultAv: true,
        showPn: true,
        firstTimeLoad: true,
        vduration: 0
    };
    const menuId = {
        showAv: -1,
        defaultAv: -1,
        showPn: -1
    };
    let infos = {};
    async function initScript(flag = false) {
        if (menuId.showAv != -1) GM_unregisterMenuCommand(menuId.showAv);
        if (menuId.defaultAv != -1) GM_unregisterMenuCommand(menuId.defaultAv);
        if (menuId.showPn != -1) GM_unregisterMenuCommand(menuId.showPn);
        if (!(await GM_getValue("inited"))) {
            await GM_setValue("showAv", true);
            await GM_setValue("defaultAv", true);
            await GM_setValue("showPn", true);
            await GM_setValue("inited", true);
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
        tryInject(flag);
    }
    async function playerReady() {
        let i = 90;
        while (--i >= 0) {
            await wait(100);
            if (!('player' in unsafeWindow)) continue;
            if (!('isInitialized' in unsafeWindow.player)) continue;
            if (!unsafeWindow.player.isInitialized()) continue;
            return true;
        }
        return false;
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

    function getOrNew(id, parent) {
        let target = document.querySelector("#" + id);
        if (!target) {
            target = document.createElement("span");
            target.id = id;
            target.style.marginLeft = "16px";
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
        observer.observe(video, {attribute:true,attributes:true,childList:false});
    }
    function getPageFromCid(cid,infos){
        if(!cid||!infos||!infos.pages) return 1;
        let pages = infos.pages;
        if(pages.length==1) return 1;
        let page;
        for(page of pages){
            if(!page) continue;
            if(page.cid==cid) return page.page;
        }
        return 1;
    }
    async function tryInject(flag) {
        if (flag && !config.showAv && !config.showPn) return log('Terminated because no option is enabled.');
        if (!(await playerReady())) return log('Can not load player in time.');

        if (config.firstTimeLoad) {
            registerVideoChangeHandler();
            config.firstTimeLoad = false;
        }

        if(location.pathname.startsWith("/medialist")){
            let aid = unsafeWindow.aid;
            if(!aid){
                console.log("SHOWAV","Variable 'aid' is not available from unsafeWindow.");
                let activeVideo = await waitForDom(".player-auxiliary-playlist-item-active");
                aid = activeVideo.getAttribute("data-aid");
                //console.log("SHOWAV",activeVideo);
            }
            console.log("SHOWAV",aid);
            let apidata = await getAidAPI(aid);
            //console.log("SHOWAV",apidata);
            infos = apidata.data;
        }else{
            if (flag)
                infos = (await getAPI(unsafeWindow.bvid)).data;
            else infos = unsafeWindow.vd;
        }
        infos.p = getUrlParam("p") || getPageFromCid(unsafeWindow.cid,infos);

        const av_root = await waitForDom(".video-data");
        if (!av_root) return log('Can not load info-bar in time.');
        const av_span = getOrNew("bilibiliShowAV", av_root);
        if (config.showAv) {
            if(config.defaultAv)
                av_span.innerText = 'av' + infos.aid;
            else
                av_span.innerText = infos.bvid;
            av_span.oncontextmenu = e => {
                if (e.target.innerText.startsWith('av')) e.target.innerText = infos.bvid;
                else av_span.innerText = 'av' + infos.aid;
                e.preventDefault();
            }
            const video = await waitForDom("video");
            if(video){
                config.vduration = Math.floor(video.duration);
            }
            av_span.onclick = async e => {
                let url = new URL(location.protocol + "//" + location.hostname + "/video/"+e.target.innerText);
                infos.p == 1 || url.searchParams.append("p", infos.p);
                let t = await getPlayerSeeks();
                if (t && t != "0" && t!=(""+config.vduration)) url.searchParams.append("t", t);
                prompt("当前视频地址：", url);
            }
        } else av_span.remove();

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
            if(videoData.videos!=1){
                currentPageNum = `P ${infos.p}/${videoData.videos}`;
                delimiters = ["\n"," "];
            }else{
                currentPageNum = "";
                delimiters = ["",""];
            }
            pn_span.style.textOverflow = "ellipsis";
            pn_span.style.whiteSpace = "nowarp";
            pn_span.style.overflow = "hidden";
            pn_span.title = currentPageNum + delimiters[0] + currentPageName
            pn_span.innerText = currentPageNum + delimiters[1] + currentPageName;
        } else pn_span.remove();
    }
    initScript(false);
})();