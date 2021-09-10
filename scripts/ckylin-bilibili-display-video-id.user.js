// ==UserScript==
// @name         哔哩哔哩视频页面常驻显示AV/BV号[已完全重构，支持显示分P标题]
// @namespace    ckylin-bilibili-display-video-id
// @version      1.14
// @description  完全自定义你的视频标题下方信息栏，排序，增加，删除！
// @author       CKylinMC
// @match        https://www.bilibili.com/video*
// @match        https://www.bilibili.com/medialist/play/*
// @resource     cktools https://greasyfork.org/scripts/429720-cktools/code/CKTools.js?version=967994
// @resource     popjs https://cdn.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.js
// @resource     popcss https://cdn.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.css
// @resource     timeago https://unpkg.com/timeago.js@4.0.2/dist/timeago.min.js
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
        {name:'timeago',type:'js'},
        {name:'popjs',type:'js'},
        {name:'popcss',type:'css'},
        {name:'popcsspatch',type:'rawcss',content:"div.popNotifyUnitFrame{z-index:110000!important;}.CKTOOLS-modal-content{color: #616161!important;max-height: 80vh;overflow: auto;}"},
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
        hideTime: false,
        firstTimeLoad: true,
        defaultTextTime: true,
        foldedWarningTip: true,
        showInNewLine: false,
        pnmaxlength: 18,
        orders: ['openGUI','showPic','showAv','showPn'],
        all: ['showAv','showSAv','showSBv','showPn','showCid','showCate','openGUI','showPic','showSize','showMore','showCTime','showViews','showDmk','showTop'],
        vduration: 0
    };
    const menuId = {
        defaultAv: -1,
        foldedWarningTip: -1,
        showInNewLine:-1,
    };
    const txtCn = {
        showAv: "可切换视频编号和高级复制",
        showSAv: "视频AV号和高级复制",
        showSBv: "视频BV号和高级复制",
        showPn: "视频分P名",
        showCid: "视频CID编号",
        showCate: "视频所在分区",
        showPic: "视频封面",
        showSize: "视频分辨率",
        showMore: "更多信息",
        showCTime: "视频投稿时间",
        showViews: "替换视频播放量",
        showDmk: "替换视频弹幕量",
        showTop: "替换全站排名提示",
        openGUI: "设置选项"
    };
    const descCn = {
        showAv: "展示视频号(AV号/BV号可切换)，右键单击可以切换，左键单击快速复制(包含当前播放时间)，左键长按打开更多格式复制窗口",
        showSAv: "展示视频AV号，右键单击可以切换，左键单击快速复制(包含当前播放时间)，左键长按打开更多格式复制窗口",
        showSBv: "展示视频BV号，右键单击可以切换，左键单击快速复制(包含当前播放时间)，左键长按打开更多格式复制窗口",
        showPn: "展示视频分P信息以及缓存名(分P名)。可能较长，建议放在最下面，并调整最大长度。",
        showCid: "展示视频资源CID编号，通常不需要展示。",
        showCate: "展示视频所在的子分区。",
        showPic: "提供按钮一键查看封面，长按可以在新标签页打开大图。",
        showSize: "展示视频当前分辨率(宽高信息)。",
        showMore: "查看视频更多信息。",
        showCTime: "用文字方式描述投稿时间，如：一周前",
        showViews: "替换展示视频播放量(由于内容相同，将自动隐藏原版播放量信息)",
        showDmk: "替换展示视频弹幕量(由于内容相同，将自动隐藏原版弹幕量信息)",
        showTop: "替换原版全站排名信息",
        openGUI: "提供按钮快速进入设置选项。"
    };
    const idTn = {
        showAv: 2,
        showSAv: 2,
        showSBv: 2,
        showPn: 5,
        showCid: 2,
        showCate: 3,
        showPic: 1,
        showSize: 2,
        showMore: 1,
        showCTime: -4,
        showViews: -2,
        showDmk: -2,
        showTop: 0,
        openGUI: 1
    };
    let infos = {};

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

    async function feat_showStaticAv(){
        const func = feat_showAv.bind(this);
        func(true);
    }

    async function feat_showStaticBv(){
        const func = feat_showAv.bind(this);
        func(true,'bv');
    }

    async function feat_showAv(force = false,mode = 'av'/* 'bv' */){
        const {av_root,infos} = this;
        const av_span = getOrNew("bilibiliShowAV"+(force?mode:''), av_root);
        //if (config.showAv) {
            if(force){
                if(mode == 'bv'){
                    av_span.innerText = infos.bvid;
                }else{
                    av_span.innerText = 'av' + infos.aid;
                }
            }else if (config.defaultAv)
                av_span.innerText = 'av' + infos.aid;
            else
                av_span.innerText = infos.bvid;
            av_span.style.overflow = "hidden";
            if(!force)
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
                let shorturl = new URL(location.protocol + "//b23.tv/"+e.target.innerText);
                let t = await getPlayerSeeks();
                if (t && t != "0" && t != ("" + config.vduration)) url.searchParams.append("t", t);
                CKTools.modal.alertModal("高级复制",`
                <style scoped>
                input:not(.shortinput){
                    width:100%;
                    display:block;
                }
                .shoav_expandinfo>div {
                    text-align: center;
                    flex: 1;
                }
                input.shortinput {
                    width: 7.8em;
                    text-align: center;
                }
                .CKTOOLS-modal-content>div>div{
                    width: 440px!important;
                }
                .shoav_expandinfo{
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    align-content: center;
                    justify-content: space-around;
                    align-items: stretch;
                }
                </style>
                <b>点击输入框可以快速复制</b><br>
                当前地址
                <input readonly value="${vidurl}" onclick="showav_fastcopy(this);" />
                含视频进度地址(仅在播放时提供)
                <input readonly value="${url}" onclick="showav_fastcopy(this);" />
                短地址格式
                <input readonly value="${shorturl}" onclick="showav_fastcopy(this);" />
                快速分享
                <input readonly value="${infos.title}_地址:${shorturl}" onclick="showav_fastcopy(this);" />
                快速分享(含视频进度)
                <input readonly value="${infos.title}_地址:${url}" onclick="showav_fastcopy(this);" />
                MarkDown格式
                <input readonly value="[${infos.title}](${vidurl})" onclick="showav_fastcopy(this);" />
                BBCode格式
                <input readonly value="[url=${vidurl}]${infos.title}[/url]" onclick="showav_fastcopy(this);" />
                HTML格式
                <input readonly value='<a href="${vidurl}">${infos.title}</a>' onclick="showav_fastcopy(this);" /><br>
                <hr>
                <div class="shoav_expandinfo">
                    <div>
                    AV号
                    <input class="shortinput" readonly value="av${infos.aid}" onclick="showav_fastcopy(this);" />
                    </div>
                    <div>
                    BV号
                    <input class="shortinput" readonly value="${infos.bvid}" onclick="showav_fastcopy(this);" />
                    </div>
                    <div>
                    资源CID
                    <input class="shortinput" readonly value="${infos.cid}" onclick="showav_fastcopy(this);" />
                    </div>
                </div>
                <br><hr>
                <a href="https://github.com/CKylinMC/UserJS/issues/new?assignees=CKylinMC&labels=&template=feature-request.yaml&title=%5BIDEA%5D+ShowAV%E8%84%9A%E6%9C%AC%E9%A2%84%E8%AE%BE%E9%93%BE%E6%8E%A5%E6%A0%BC%E5%BC%8F%E8%AF%B7%E6%B1%82&target=[%E8%84%9A%E6%9C%AC%EF%BC%9A%E8%A7%86%E9%A2%91%E9%A1%B5%E9%9D%A2%E5%B8%B8%E9%A9%BB%E6%98%BE%E7%A4%BAAV/BV%E5%8F%B7]&desp=%E6%88%91%E5%B8%8C%E6%9C%9B%E6%B7%BB%E5%8A%A0%E6%96%B0%E7%9A%84%E9%A2%84%E8%AE%BE%E9%93%BE%E6%8E%A5%E6%A0%BC%E5%BC%8F%EF%BC%8C%E5%A6%82%E4%B8%8B...">缺少你需要的格式？反馈来添加...</a>
                `,"关闭");
            });
        //} else av_span.remove();
    }

    async function feat_showMore(){
        const {av_root,infos} = this;
        log('infos',infos);
        const more_span = getOrNew("bilibiliShowMore", av_root);
        more_span.innerHTML = '⋯';
        more_span.title = "展示更多信息";
        more_span.style.cursor = "pointer";
        more_span.addEventListener('click',async e=>{
            let part,videoData=infos;
            try {
                part = videoData.pages[infos.p - 1];
            } catch (e) {
                part = videoData.pages[0];
            }
            let currentPageName = part.part.length ? part.part : '';
            let currentPageNum;
            if (videoData.videos != 1) {
                currentPageNum = `P ${infos.p}/${videoData.videos}`;
            } else {
                currentPageNum = "P 1/1";
            }
            CKTools.modal.alertModal("视频信息",`
            <style scoped>
                li{
                    line-height: 2em;
                }
            </style>
            <li>
                <b>AV号: </b>av${infos.aid}
            </li>
            <li>
                <b>BV号: </b>${infos.bvid}
            </li>
            <li>
                <b>CID: </b>${infos.cid}
            </li>
            <li>
                <b>分P: </b>${currentPageNum}
            </li>
            <li>
                <b>P名: </b>${currentPageName}
            </li>
            <li>
                <b>长度: </b>${infos.duration}s
            </li>
            <li>
                <b>投稿: </b>${timeago.format(infos.ctime*1000,'zh_CN')}
            </li>
            <li>
                <b>分区: </b>${infos.tname}
            </li>
            <li>
                <b>大小: </b>${infos.dimension.width}x${infos.dimension.height}
            </li>
            <li>
                <b>封面: </b><a href="${infos.pic}" target="_blank">点击查看</a>
            </li>
            `,"确定");
        })
    }

    async function feat_showCTime(){
        const {av_root,infos} = this;
        const ct_span = getOrNew("bilibiliShowCTime", av_root);
        ct_span.style.textOverflow = "ellipsis";
        ct_span.style.whiteSpace = "nowarp";
        ct_span.style.overflow = "hidden";
        const d = new Date(infos.ctime*1000);
        let txttime = timeago.format(infos.ctime*1000,'zh_CN');
        let rawtime = `${d.getFullYear()}-${(d.getMonth()+1)<10?'0'+(d.getMonth()+1):d.getMonth()+1}-${d.getDate()<10?'0'+d.getDate():d.getDate()} ${d.getHours()<10?'0'+d.getHours():d.getHours()}:${d.getMinutes()<10?'0'+d.getMinutes():d.getMinutes()}:${d.getSeconds()<10?'0'+d.getSeconds():d.getSeconds()}`;

        ct_span.title = "投稿时间 "+(config.defaultTextTime?rawtime:txttime);
        ct_span.innerHTML = config.defaultTextTime?txttime:rawtime
        if(config.hideTime) ct_span.innerHTML+= `
        <style>
        .video-data>span:nth-child(3){
            display:none;
        }
        #bilibiliShowInfos>*:nth-child(1){
            margin-left: 0!important;
        }
        </style>`;
    }

    async function feat_showViews(){
        const {av_root,infos} = this;
        const v_span = getOrNew("bilibiliShowViews", av_root);
        v_span.style.textOverflow = "ellipsis";
        v_span.style.whiteSpace = "nowarp";
        v_span.style.overflow = "hidden";
        v_span.title = `播放量 ${infos.stat.view}`;
        v_span.innerHTML = (()=>{
            const res = numberFormat(infos.stat.view);
            return `${res.value}${res.unit}播放`;
        })();
        v_span.innerHTML+= `
        <style>
        .video-data>span:nth-child(1){
            display:none;
        }
        #bilibiliShowInfos>*:nth-child(1){
            margin-left: 0!important;
        }
        </style>`;
    }

    async function feat_showDmk(){
        const {av_root,infos} = this;
        const dmk_span = getOrNew("bilibiliShowDmk", av_root);
        dmk_span.style.textOverflow = "ellipsis";
        dmk_span.style.whiteSpace = "nowarp";
        dmk_span.style.overflow = "hidden";
        dmk_span.title = `${infos.stat.danmaku}条弹幕`;
        dmk_span.innerHTML = (()=>{
            const res = numberFormat(infos.stat.danmaku);
            return `${res.value}${res.unit}条弹幕`;
        })();
        dmk_span.innerHTML+= `
        <style>
        .video-data>span:nth-child(2){
            display:none;
        }
        #bilibiliShowInfos>*:nth-child(1){
            margin-left: 0!important;
        }
        </style>`;
    }

    async function feat_showTop(){
        const {av_root,infos} = this;
        const top_span = getOrNew("bilibiliShowTop", av_root);
        top_span.style.textOverflow = "ellipsis";
        top_span.style.whiteSpace = "nowarp";
        top_span.style.overflow = "hidden";
        top_span.title = `全站最高排行第${infos.stat.his_rank}名`;
        top_span.innerHTML = ''
        top_span.innerHTML+= `
        <style>
        .video-data>span.rank{
            display:none;
        }
        </style>`;
        if(infos.stat.his_rank===0){
            top_span.style.display = "none";
            setTimeout(()=>{
                if(top_span.nextElementSibling){
                    top_span.nextElementSibling.style.marginLeft = 0;
                }
            },100);
        }else{
            top_span.innerHTML+= '📊 '+infos.stat.his_rank;
        }
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
            showSAv: feat_showStaticAv.bind(that),
            showSBv: feat_showStaticBv.bind(that),
            showCate: feat_showCate.bind(that),
            showCid: feat_showCid.bind(that),
            showPn: feat_showPn.bind(that),
            showPic: feat_showPic.bind(that),
            showSize: feat_showSize.bind(that),
            showMore: feat_showMore.bind(that),
            showCTime: feat_showCTime.bind(that),
            showDmk: feat_showDmk.bind(that),
            showViews: feat_showViews.bind(that),
            showTop: feat_showTop.bind(that),
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
            max-height: 2rem;
        }
        .showav_dragableitem.showav_expand {
            max-height: 8rem;
        }
        .showav_dragableitem>div {
            color: #adadad;
            margin: 0 6px;
            opacity: 0;
            transition: all .3s ease-in-out;
            transform: translateX(-10px);
            font-size: small;
            overflow: hidden;
            max-height: 0;
        }
        .showav_dragableitem.showav_expand>div{
            transform: translateX(0px);
            max-height: 8rem;
            opacity: 1;
        }
        .showav_dragableitem::before {
            content: "⋮⋮";
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
            color: #a9a8a8;
        }
        .showav_enableddiv{
            background: #dcedc8;
        }
        .showav_disableddiv{
            background: #ffcdd2;
        }
        #showav_newlinetip{
            font-size: small;
            display: inline-block;
            padding: 0 2px;
            line-height: 1.5em;
            border-radius: 3px;
            background: #ff5722;
            color: white;
            overflow: hidden;
            transition: all .3s;
            opacity: 0;
        }
        #showav_newlinetip.showav_newlinetip_ok{
            background: #0288d1!important;
        }
        #showav_newlinetip.showav_newlinetip{
            opacity: 1;
        }
        `,'showav_dragablecss',"unique",document.head);
        CKTools.modal.openModal("ShowAV / 设置",await CKTools.makeDom("div",async container=>{
            container.style.alignItems = "stretch";
            const refreshRecommendShield = ()=>{
                let shield = document.querySelector("#showav_newlinetip");
                if(!shield) return;
                let enabledArray = [];
                const enableddiv = document.querySelector(".showav_enableddiv");
                const elements = enableddiv.querySelectorAll(".showav_dragableitem");
                for(let element of [...elements]){
                    enabledArray.push(element.getAttribute('data-id'));
                }
                let sum = 0;
                enabledArray.forEach(k=>sum+=idTn[k]);
                if(sum>=6){
                    shield.classList.add('showav_newlinetip');
                }else{
                    shield.classList.remove('showav_newlinetip');
                }
            }
            [
                await CKTools.makeDom("li",async list=>{
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.makeDom("input",input=>{
                            input.type="checkbox";
                            input.id = "showav_newline";
                            input.name = "showav_newline";
                            input.checked = config.showInNewLine;
                            input.addEventListener("change", e=>{
                                let shield = document.querySelector("#showav_newlinetip");
                                if(!shield) return;
                                if(input.checked) shield.classList.add('showav_newlinetip_ok');
                                else shield.classList.remove('showav_newlinetip_ok');
                            })
                        }),
                        await CKTools.makeDom("label",label=>{
                            label.style.paddingLeft = "3px";
                            label.setAttribute('for',"showav_newline");
                            label.innerHTML = "在新的一行中显示信息 <span id='showav_newlinetip'>建议开启</span>";
                        })
                    ].forEach(e=>list.appendChild(e));
                }),
                await CKTools.makeDom("li",async list=>{
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.makeDom("label",label=>{
                            label.style.paddingLeft = "3px";
                            label.setAttribute('for',"showav_pnwid");
                            label.innerHTML = "视频分P名: 字数限制";
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
                await CKTools.makeDom("li",async list=>{
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.makeDom("label",label=>{
                            label.style.paddingLeft = "3px";
                            label.id = "showav_defaultav_tip";
                            label.setAttribute('for',"showav_defaultav");
                            if(config.defaultAv)
                                label.innerHTML = "视频编号: 默认展示 <b>视频AV号</b> (点击切换)";
                            else
                                label.innerHTML = "视频编号: 默认展示 <b>视频BV号</b> (点击切换)";
                        }),
                        await CKTools.makeDom("input",input=>{
                            input.type="checkbox";
                            input.id = "showav_defaultav";
                            input.name = "showav_defaultav";
                            input.style.display="none";
                            input.checked = config.defaultAv;
                            input.addEventListener('change',e=>{
                                const label = document.querySelector("#showav_defaultav_tip");
                                if(!label) return;
                                if(input.checked)
                                    label.innerHTML = "视频编号: 默认展示 <b>视频AV号</b> (点击切换)";
                                else
                                    label.innerHTML = "视频编号: 默认展示 <b>视频BV号</b> (点击切换)";

                            })
                        }),
                        await CKTools.makeDom("div",div=>{
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `此功能仅对<b>可切换视频编号和高级复制</b>功能起效。`;
                        })
                    ].forEach(e=>list.appendChild(e));
                }),
                await CKTools.makeDom("li",async list=>{
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.makeDom("label",label=>{
                            label.style.paddingLeft = "3px";
                            label.id = "showav_foldvidwarn_tip";
                            label.setAttribute('for',"showav_foldvidwarn");
                            if(config.foldedWarningTip)
                                label.innerHTML = "显示优化: 默认 <b>折叠</b> 视频警告文字(点击切换)";
                            else
                                label.innerHTML = "显示优化: 默认 <b>展示</b> 视频警告文字(点击切换)";
                        }),
                        await CKTools.makeDom("input",input=>{
                            input.type="checkbox";
                            input.id = "showav_foldvidwarn";
                            input.name = "showav_foldvidwarn";
                            input.style.display="none";
                            input.checked = config.foldedWarningTip;
                            input.addEventListener('change',e=>{
                                const label = document.querySelector("#showav_foldvidwarn_tip");
                                if (!label) return;
                                if (input.checked)
                                    label.innerHTML = "显示优化: 默认 <b>折叠</b> 视频警告文字(点击切换)";
                                else
                                    label.innerHTML = "显示优化: 默认 <b>展示</b> 视频警告文字(点击切换)";
                            })
                        }),
                        await CKTools.makeDom("div",div=>{
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `此功能可将视频警告(如 含有危险行为)折叠为图标，防止占用信息栏空间。`;
                        })
                    ].forEach(e=>list.appendChild(e));
                }),
                await CKTools.makeDom("li",async list=>{
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.makeDom("label",label=>{
                            label.style.paddingLeft = "3px";
                            label.id = "showav_hidetime_tip";
                            label.setAttribute('for',"showav_hidetime");
                            if(config.hideTime)
                                label.innerHTML = "投稿时间: <b>隐藏</b>原版发布时间 (点击切换)";
                            else
                                label.innerHTML = "投稿时间: <b>显示</b>原版发布时间 (点击切换)";
                        }),
                        await CKTools.makeDom("input",input=>{
                            input.type="checkbox";
                            input.id = "showav_hidetime";
                            input.name = "showav_hidetime";
                            input.style.display="none";
                            input.checked = config.hideTime;
                            input.addEventListener('change',e=>{
                                const label = document.querySelector("#showav_hidetime_tip");
                                if (!label) return;
                                if (input.checked)
                                    label.innerHTML = "投稿时间: <b>隐藏</b>原版发布时间 (点击切换)";
                                else
                                    label.innerHTML = "投稿时间: <b>显示</b>原版发布时间 (点击切换)";
                            })
                        }),
                        await CKTools.makeDom("div",div=>{
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `此功能仅在开启<b>视频投稿时间</b>功能时起效，视频投稿时间可以显示两种时间格式，并且可排序。`;
                        })
                    ].forEach(e=>list.appendChild(e));
                }),
                await CKTools.makeDom("li",async list=>{
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.makeDom("label",label=>{
                            label.style.paddingLeft = "3px";
                            label.id = "showav_deftxttime_tip";
                            label.setAttribute('for',"showav_deftxttime");
                            if(config.defaultTextTime)
                                label.innerHTML = "投稿时间: 显示<b>相对时间</b> (点击切换)";
                            else
                                label.innerHTML = "投稿时间: 显示<b>完整时间戳</b> (点击切换)";
                        }),
                        await CKTools.makeDom("input",input=>{
                            input.type="checkbox";
                            input.id = "showav_deftxttime";
                            input.name = "showav_deftxttime";
                            input.style.display="none";
                            input.checked = config.defaultTextTime;
                            input.addEventListener('change',e=>{
                                const label = document.querySelector("#showav_deftxttime_tip");
                                if (!label) return;
                                if (input.checked)
                                    label.innerHTML = "投稿时间: 显示<b>相对时间</b> (点击切换)";
                                else
                                    label.innerHTML = "投稿时间: 显示<b>完整时间戳</b> (点击切换)";
                            })
                        }),
                        await CKTools.makeDom("div",div=>{
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `<b>相对时间格式:</b> 如  1周前<br><b>完整时间戳格式:</b> 如  2021-09-10 11:21:03<br>此功能仅对<b>视频投稿时间</b>功能起效。`;
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
                            draggable.innerHTML+= `<div>${descCn[id]}</div>`;
                            let expanded = false;
                            draggable.addEventListener('dragstart',e=>{
                                if(expanded) draggable.classList.remove('showav_expand');
                                draggable.classList.add('showav_dragging');
                                [...document.querySelectorAll('.showav_dragablediv')].forEach(e=>e.classList.add('showav_child_dragging'))
                            })
                            draggable.addEventListener('dragend',e=>{
                                if(expanded) draggable.classList.add('showav_expand');
                                draggable.classList.remove('showav_dragging');
                                [...document.querySelectorAll('.showav_child_dragging')].forEach(e=>e.classList.remove('showav_child_dragging'))
                                refreshRecommendShield();
                            })
                            draggable.addEventListener('click',e=>{
                                expanded = draggable.classList.toggle('showav_expand');
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
                        await CKTools.makeDom("div",async div=>{
                            div.style.lineHeight = "2em";
                            div.innerHTML = `<a href="https://github.com/CKylinMC/UserJS/issues/new?assignees=CKylinMC&labels=&template=feature-request.yaml&title=%5BIDEA%5D+ShowAV%E8%84%9A%E6%9C%AC%E6%98%BE%E7%A4%BA%E5%8A%9F%E8%83%BD%E8%AF%B7%E6%B1%82&target=[%E8%84%9A%E6%9C%AC%EF%BC%9A%E8%A7%86%E9%A2%91%E9%A1%B5%E9%9D%A2%E5%B8%B8%E9%A9%BB%E6%98%BE%E7%A4%BAAV/BV%E5%8F%B7]&desp=%E6%88%91%E5%B8%8C%E6%9C%9B%E6%B7%BB%E5%8A%A0%E6%96%B0%E7%9A%84%E5%BF%AB%E6%8D%B7%E5%B1%95%E7%A4%BA%E5%8A%9F%E8%83%BD%EF%BC%8C%E5%8A%9F%E8%83%BD%E7%9A%84%E4%BD%9C%E7%94%A8%E5%92%8C%E6%95%88%E6%9E%9C%E5%A6%82%E4%B8%8B...">需要添加其他的显示或快捷功能？反馈来添加...</a>`
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
                                        config.defaultAv = document.querySelector("#showav_defaultav").checked;
                                        config.hideTime = document.querySelector("#showav_hidetime").checked;
                                        config.defaultTextTime = document.querySelector("#showav_deftxttime").checked;
                                        config.foldedWarningTip = document.querySelector("#showav_foldvidwarn").checked;
                                        config.pnmaxlength = parseInt(document.querySelector("#showav_pnwid").value);
                                        config.showInNewLine = document.querySelector("#showav_newline").checked;
                                        saveAllConfig();
                                        CKTools.modal.hideModal();
                                        if (config.foldedWarningTip) {
                                            CKTools.addStyle(`
                                                .video-data>span.argue{
                                                    width: 0.5rem;
                                                    margin-left: 0!important;
                                                    margin-right: 16px;
                                                }
                                            `, 'showav_hidevidwarn', 'update');
                                        } else {
                                            CKTools.addStyle('', 'showav_hidevidwarn', 'update');
                                        }
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
            setTimeout(refreshRecommendShield,500);
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
