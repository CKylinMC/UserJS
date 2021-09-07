// ==UserScript==
// @name         哔哩哔哩视频页面常驻显示AV/BV号[已完全重构，支持显示分P标题]
// @namespace    ckylin-bilibili-display-video-id
// @version      1.10
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
        {name:'popcsspatch',type:'rawcss',content:"div.popNotifyUnitFrame{z-index:110000!important;}.CKTOOLS-modal-content{color: #616161!important;}"},
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
        defaultAv: true,
        firstTimeLoad: true,
        showInNewLine: false,
        pnmaxlength: 18,
        orders: ['openGUI','showPic','showAv','showPn'],
        all: ['showAv','showPn','showCid','showCate','openGUI','showPic','showSize'],
        vduration: 0
    };
    const menuId = {
        defaultAv: -1,
        showInNewLine:-1,
    };
    const txtCn = {
        showAv: "视频编号和高级复制",
        showPn: "视频分P名",
        showCid: "视频CID编号",
        showCate: "视频所在分区",
        showPic: "视频封面",
        showSize: "视频分辨率",
        openGUI: "设置选项"
    };
    let infos = {};

    async function saveAllConfig(){
        for(let configKey of Object.keys(config)){
            if([
                "all","vduration","firstTimeLoad"
            ].includes(configKey)) continue;
            await GM_setValue(configKey, config[configKey]);
        }
        popNotify.success("配置保存成功");
    }

    async function initScript(flag = false) {
        for(let menuitem of Object.keys(menuId)){
            if(menuId[menuitem]!=-1) GM_unregisterMenuCommand(menuId[menuitem]);
        }
        for(let configKey of Object.keys(config)){
            if([
                "all","vduration","firstTimeLoad"
            ].includes(configKey)) continue;
            if(typeof(await GM_getValue(configKey))==='undefined'){
                await GM_setValue(configKey, config[configKey]);
            }else{
                config[configKey] = await GM_getValue(configKey);
            }
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
        GM_registerMenuCommand("打开设置", async () => {
            await GUISettings();
        });
        CKTools.addStyle(`
            #bilibiliShowPN{
                max-width: ${config.pnmaxlength}em!important;
            }
        `,"showav_pnlen","update",document.head);
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

    async function feat_showCate(){
        const {av_root,infos} = this;
        const cate_span = getOrNew("bilibiliShowCate", av_root);
        //if (config.showCate) {
            cate_span.style.textOverflow = "ellipsis";
            cate_span.style.whiteSpace = "nowarp";
            cate_span.style.overflow = "hidden";
            cate_span.title = "分区:"+infos.tname;
            cate_span.innerText = "分区:"+infos.tname;
        //} else cate_span.remove();
    }

    async function feat_showAv(){
        const {av_root,infos} = this;
        const av_span = getOrNew("bilibiliShowAV", av_root);
        //if (config.showAv) {
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
        //} else av_span.remove();
    }

    async function feat_showPic(){
        const {av_root,infos} = this;
        const pic_span = getOrNew("bilibiliShowPic", av_root);
        pic_span.style.textOverflow = "ellipsis";
        pic_span.style.whiteSpace = "nowarp";
        pic_span.style.overflow = "hidden";
        pic_span.title = "查看封面";
        pic_span.innerHTML = "🖼️";
        pic_span.style.cursor = "pointer";
        const picHC = new CKTools.HoldClick(pic_span);
        picHC.onclick(()=>{
            CKTools.modal.alertModal("封面",`
            <img src="${infos.pic}" style="width:100%" onload="this.parentElement.style.width='100%'" />
            `,"关闭");
        });
        picHC.onhold(()=>{
            open(infos.pic);
        });
    }

    async function feat_showCid(){
        const {av_root,infos} = this;
        const cid_span = getOrNew("bilibiliShowCID", av_root);
        //if (config.showCid) {
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
        //} else cid_span.remove();
    }

    async function feat_showSize(){
        const {av_root,infos} = this;
        const size_span = getOrNew("bilibiliShowSize", av_root);
        //if (config.showCid) {
            size_span.style.textOverflow = "ellipsis";
            size_span.style.whiteSpace = "nowarp";
            size_span.style.overflow = "hidden";
            size_span.title = `${infos.dimension.width}x${infos.dimension.height}`;
            size_span.innerText = `${infos.dimension.width}x${infos.dimension.height}`;
        //} else cid_span.remove();
    }

    async function feat_openGUI(){
        const {av_root,infos} = this;
        const gui_span = getOrNew("bilibiliShowGUISettings", av_root);
        gui_span.innerHTML = "⚙";
        gui_span.title = "ShowAV 设置";
        gui_span.style.overflow = "hidden";
        gui_span.style.cursor = "pointer";
        gui_span.onclick = e=>GUISettings();
    }

    async function feat_showPn(){
        const {av_root,infos} = this;
        const pn_span = getOrNew("bilibiliShowPN", av_root);
        //if (config.showPn) {
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
        //} else pn_span.remove();
    }

    async function tryInject(flag) {
        if (flag && config.orders.length===0) return log('Terminated because no option is enabled.');
        if (!(await playerReady())) return log('Can not load player in time.');

        if (config.firstTimeLoad) {
            registerVideoChangeHandler();
            config.firstTimeLoad = false;
        }

        if (location.pathname.startsWith("/medialist")) {
            let aid = unsafeWindow.aid;
            if (!aid) {
                log("Variable 'aid' is not available from unsafeWindow.");
                let activeVideo = await waitForDom(".player-auxiliary-playlist-item-active");
                aid = activeVideo.getAttribute("data-aid");
                //console.log("SHOWAV",activeVideo);
            }
            log(aid);
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
        
        av_root.style.textOverflow = "ellipsis";
        av_root.style.whiteSpace = "nowarp";
        av_root.style.overflow = "hidden";
        const that = {
            av_root,config,av_infobar,infos,CKTools
        };

        const functions = {
            showAv: feat_showAv.bind(that),
            showCate: feat_showCate.bind(that),
            showCid: feat_showCid.bind(that),
            showPn: feat_showPn.bind(that),
            showPic: feat_showPic.bind(that),
            showSize: feat_showSize.bind(that),
            openGUI: feat_openGUI.bind(that)
        }

        config.orders.forEach(k=>functions[k]());
    }

    async function GUISettings(){
        CKTools.addStyle(`
        .showav_dragablediv {
            width: 300px;
            min-height: 60px;
            border: dotted;
            border-radius: 8px;
            padding: 12px;
            margin: 5px;
            position: relative;
            margin: 3px auto;
        }
        .showav_dragableitem {
            background: white;
            margin: 3px;
            padding: 3px;
            border-radius: 4px;
            border: solid #bdbdbd 2px;
            color: black;
            transition: all .3s;
        }
        .showav_dragableitem::after {
            content: "拖动排序";
            float: right;
            font-size: xx-small;
            padding: 3px;
            color: #bbbbbb !important;
        }
        .showav_dragging {
            background: grey;
            color: white;
            border: solid #515050 2px;
            transform: scale(1.1);
            transition: all .3s;
        }
        .showav_dragablediv:not(.showav_child_dragging) .showav_dragableitem:hover:not(.showav_dragging) {
            background: grey;
            color: white;
            border: solid #515050 2px;
            transform: scale(1.03);
            transition: all .3s;
        }
        .showav_dragablediv>b {
            position: absolute;
            left: -4rem;
        }
        .showav_disableddiv .showav_dragableitem {
            color: grey;
        }
        .showav_enableddiv{
            background: #dcedc8;
        }
        .showav_disableddiv{
            background: #ffcdd2;
        }   
        `,'showav_dragablecss',"unique",document.head);
        CKTools.modal.openModal("ShowAV / 设置",await CKTools.makeDom("div",async container=>{
            container.style.alignItems = "stretch";
            [
                await CKTools.makeDom("li",async list=>{
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.makeDom("input",input=>{
                            input.type="checkbox";
                            input.id = "showav_newline";
                            input.name = "showav_newline";
                            input.checked = config.showInNewLine;
                        }),
                        await CKTools.makeDom("label",label=>{ 
                            label.style.paddingLeft = "3px";
                            label.setAttribute('for',"showav_newline");
                            label.innerHTML = "在新的一行中显示信息(当显示信息过多时推荐开启)";
                        })
                    ].forEach(e=>list.appendChild(e));
                }),
                await CKTools.makeDom("li",async list=>{
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.makeDom("label",label=>{
                            label.style.paddingLeft = "3px";
                            label.setAttribute('for',"showav_pnwid");
                            label.innerHTML = "视频分P信息字数限制";
                        }),
                        await CKTools.makeDom("input",input=>{
                            input.type="number";
                            input.id = "showav_pnwid";
                            input.name = "showav_pnwid";
                            input.setAttribute('min',5);
                            input.setAttribute('max',100);
                            input.style.width = "3em";
                            input.style.textAlign = "center";
                            input.style.marginLeft = "1em";
                            input.style.lineHeight = "1em";
                            input.value = config.pnmaxlength;
                        })
                    ].forEach(e=>list.appendChild(e));
                }),
                // dragable code from ytb v=jfYWwQrtzzY
                await CKTools.makeDom("li", async list=>{
                    const makeDragable = async id=>{
                        return await CKTools.makeDom("div",draggable=>{
                            draggable.className = "showav_dragableitem";
                            draggable.setAttribute("draggable",true);
                            draggable.setAttribute("data-id",id);
                            draggable.innerHTML = txtCn[id];
                            draggable.addEventListener('dragstart',e=>{
                                draggable.classList.add('showav_dragging');
                                [...document.querySelectorAll('.showav_dragablediv')].forEach(e=>e.classList.add('showav_child_dragging'))
                            })
                            draggable.addEventListener('dragend',e=>{
                                draggable.classList.remove('showav_dragging');
                                [...document.querySelectorAll('.showav_child_dragging')].forEach(e=>e.classList.remove('showav_child_dragging'))
                            })
                        })
                    };
                    function getClosestItem(container,y){
                        const draggables = [...container.querySelectorAll(".showav_dragableitem:not(.showav_dragging)")];
                        return draggables.reduce((closest,child)=>{
                            const box = child.getBoundingClientRect();
                            const offset = y - box.top - box.height / 2;
                            if(offset < 0 && offset > closest.offset) return {offset,element:child};
                            else return closest;
                        },{offset:Number.NEGATIVE_INFINITY}).element;
                    }
                    function registerDragEvent (draggablediv){
                        draggablediv.addEventListener('dragover',e=>{
                            e.preventDefault();
                            const closestElement = getClosestItem(draggablediv,e.clientY);
                            const dragging = document.querySelector(".showav_dragging");
                            if(closestElement===null){
                                draggablediv.appendChild(dragging);
                            }else{
                                draggablediv.insertBefore(dragging,closestElement);
                            }
                        })
                    }
                    [
                        await CKTools.makeDom("div",div=>{
                            div.innerHTML = `<b>拖动下面的功能模块进行排序</b>`;
                        }),
                        await CKTools.makeDom("div",async enableddiv=>{
                            enableddiv.innerHTML = `<b>启用</b>`;
                            enableddiv.className = "showav_dragablediv showav_enableddiv";
                            config.orders.forEach(async k=>{
                                enableddiv.appendChild(await makeDragable(k));
                            });
                            registerDragEvent(enableddiv);
                        }),
                        await CKTools.makeDom("div",async disableddiv=>{
                            disableddiv.innerHTML = `<b>禁用</b>`;
                            disableddiv.className = "showav_dragablediv showav_disableddiv";
                            config.all.forEach(async k=>{
                                if(config.orders.includes(k)) return;
                                disableddiv.appendChild(await makeDragable(k));
                            });
                            registerDragEvent(disableddiv);
                        }),
                        await CKTools.makeDom("div",async div => {
                            div.appendChild(await CKTools.makeDom("div", async btns => {
                                btns.style.display = "flex";
                                btns.appendChild(await CKTools.makeDom("button", btn => {
                                    btn.className = "CKTOOLS-toolbar-btns";
                                    btn.innerHTML = "保存并关闭";
                                    btn.onclick = e => {
                                        const enableddiv = document.querySelector(".showav_enableddiv");
                                        const elements = enableddiv.querySelectorAll(".showav_dragableitem");
                                        let enabledArray = [];
                                        for(let element of [...elements]){
                                            enabledArray.push(element.getAttribute('data-id'));
                                        }
                                        config.orders = enabledArray;
                                        config.pnmaxlength = parseInt(document.querySelector("#showav_pnwid").value);
                                        config.showInNewLine = document.querySelector("#showav_newline").checked;
                                        saveAllConfig();
                                        CKTools.modal.hideModal();
                                        let old = document.querySelector("#bilibiliShowInfos")
                                        if(old)old.remove();
                                        initScript(true);
                                    }
                                }))
                                btns.appendChild(await CKTools.makeDom("button", btn => {
                                    btn.className = "CKTOOLS-toolbar-btns";
                                    btn.innerHTML = "关闭";
                                    btn.onclick = e => {
                                        CKTools.modal.hideModal();
                                    }
                                }))
                            }))
                        }),
                    ].forEach(e=>list.appendChild(e));
                })
            ].forEach(e=>container.appendChild(e));
        }));
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

    unsafeWindow.showav_guisettings = GUISettings;

    CKTools.modal.initModal();
    CKTools.modal.hideModal();

    initScript(false);
})();
