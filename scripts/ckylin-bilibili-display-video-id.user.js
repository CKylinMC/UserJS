// ==UserScript==
// @name         哔哩哔哩视频页面常驻显示AV/BV号[已完全重构，支持显示分P标题]
// @namespace    ckylin-bilibili-display-video-id
// @version      1.18.0
// @description  完全自定义你的视频标题下方信息栏，排序，增加，删除！
// @author       CKylinMC
// @match        https://www.bilibili.com/video*
// @match        https://www.bilibili.com/medialist/play/*
// @resource     cktools https://greasyfork.org/scripts/429720-cktools/code/CKTools.js?version=1034581
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
        { name: 'cktools', type: 'js' },
        { name: 'timeago', type: 'js' },
        { name: 'popjs', type: 'js' },
        { name: 'popcss', type: 'css' },
        { name: 'popcsspatch', type: 'rawcss', content: "div.popNotifyUnitFrame{z-index:110000!important;}.CKTOOLS-modal-content{color: #616161!important;max-height: 80vh;overflow: auto;}" },
    ]
    function applyResource() {
        resloop: for (let res of resourceList) {
            if (!document.querySelector("#" + res.name)) {
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
                el.innerHTML = res.type.startsWith('raw') ? res.content : GM_getResourceText(res.name);
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
        hideTime: true,
        firstTimeLoad: true,
        defaultTextTime: true,
        foldedWarningTip: true,
        showInNewLine: false,
        forceGap: false,
        jssafetyWarning: true,
        pnmaxlength: 18,
        orders: ['openGUI', 'showArgue', 'showPic', 'showAv', 'showPn'],
        all: ['showAv', 'showSAv', 'showSBv', 'showPn', 'showCid', 'showCate', 'openGUI', 'showPic', 'showSize', 'showMore', 'showCTime', 'showViews', 'showDmk', 'showTop', 'showArgue'],
        copyitems: ['currTime', 'short', 'shareTime', 'vid'],
        copyitemsAll: ['curr', 'currTime', 'short', 'share', 'shareTime', 'md', 'bb', 'html', 'vid'],
        customcopyitems: {},
        customComponents: {},
        vduration: 0,
        running: {}
    };
    const ignoredConfigKeys = ["all", "vduration", "firstTimeLoad", "running"];
    const menuId = {
        defaultAv: -1,
        foldedWarningTip: -1,
        showInNewLine: -1,
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
        showArgue: "显示危险提示",
        curr: "当前视频地址",
        currTime: "当前视频地址(含视频进度)",
        short: "短地址",
        share: "快速分享",
        shareTime: "快速分享(含视频进度)",
        md: "Markdown 格式",
        bb: "BBCode 格式",
        html: "HTML 格式",
        vid: "视频编号",
        openGUI: "设置选项"
    };
    const descCn = {
        showAv: "展示视频号(AV号/BV号右键单击可切换)，左键单击快速复制(包含当前播放时间)，左键长按打开更多格式复制窗口",
        showSAv: "展示视频AV号,左键单击快速复制(包含当前播放时间)，左键长按打开更多格式复制窗口",
        showSBv: "展示视频BV号，左键单击快速复制(包含当前播放时间)，左键长按打开更多格式复制窗口",
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
        showArgue: "如果视频有危险提示，则显示危险提示",
        curr: "提供当前视频纯净地址",
        currTime: "提供当前视频地址，并在播放时提供含跳转时间的地址(可以直接跳转到当前进度)。",
        short: "提供当前视频的b23.tv短地址",
        share: "提供当前视频的标题和地址组合文本。",
        shareTime: "提供当前视频的标题和地址组合文本，在播放时提供含跳转时间的地址(可以直接跳转到当前进度)。",
        md: "提供Markdown特殊语法的快速复制。",
        bb: "提供BBCode特殊语法的快速复制。",
        html: "提供HTML格式的快速复制。",
        vid: "提供当前视频av号/BV号/CID号。请注意此项目不支持快速复制。",
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
        showArgue: 1,
        openGUI: 1
    };
    let globalinfos = {};
    // https://stackoverflow.com/questions/10726638
    String.prototype.mapReplace = function (map) {
        var regex = [];
        for (var key in map)
            regex.push(key.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"));
        return this.replace(new RegExp(regex.join('|'), "g"), function (word) {
            return map[word];
        });
    };

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

    function exec(code,binding=this){
        return (async function(){
            eval(code);
        }).bind(binding);
    }

    async function saveAllConfig() {
        for (let configKey of Object.keys(config)) {
            if (ignoredConfigKeys.includes(configKey)) continue;
            await GM_setValue(configKey, config[configKey]);
        }
        popNotify.success("配置保存成功");
    }

    async function initScript(flag = false) {
        for (let menuitem of Object.keys(menuId)) {
            if (menuId[menuitem] != -1) GM_unregisterMenuCommand(menuId[menuitem]);
        }
        for (let configKey of Object.keys(config)) {
            if (ignoredConfigKeys.includes(configKey)) continue;
            if (typeof (await GM_getValue(configKey)) === 'undefined') {
                await GM_setValue(configKey, config[configKey]);
            } else {
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
        `, "showav_pnlen", "update", document.head);
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
        let target = document.querySelector("#" + id);
        if (!target) {
            target = document.createElement("span");
            target.id = id;
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

    function getHEVC(){
        return document.querySelector(".bilibili-player-video bwp-video")
    }

    async function registerVideoChangeHandler() {
        const video = await waitForDom(".bilibili-player-video video");
        const HEVCplayer = getHEVC();// must behind video loaded(no more waitfordom)
        let target = HEVCplayer || video;
        if(!target) return;
        const observer = new MutationObserver(async e => {
            if (e[0].target.src) {
                tryInject(true);
            }
        });
        observer.observe(target, { attribute: true, attributes: true, childList: false });
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

    async function feat_showCate() {
        const { av_root, infos } = this;
        const cate_span = getOrNew("bilibiliShowCate", av_root);
        //if (config.showCate) {
        cate_span.style.textOverflow = "ellipsis";
        cate_span.style.whiteSpace = "nowarp";
        cate_span.style.overflow = "hidden";
        cate_span.title = "分区: " + infos.tname;
        cate_span.innerText = "分区: " + infos.tname;
        //} else cate_span.remove();
    }

    async function feat_showStaticAv() {
        const func = feat_showAv.bind(this);
        func(true);
    }

    async function feat_showStaticBv() {
        const func = feat_showAv.bind(this);
        func(true, 'bv');
    }

    async function prepareData(infos,el=null){
        const defaultVid = el?el.innerText:'av'+infos.aid;
        const currpage = new URL(location.href);
        let part = infos.p==currpage.searchParams.get("p")
            ? infos.p
            : (currpage.searchParams.get("p") ? currpage.searchParams.get("p") : infos.p);
        let url = new URL(location.protocol + "//" + location.hostname + "/video/" + defaultVid);
        part == 1 || url.searchParams.append("p", part);
        let vidurl = new URL(url);
        let shorturl = new URL(location.protocol + "//b23.tv/" + defaultVid);
        let t = await getPlayerSeeks();
        if (t && t != "0" && t != ("" + config.vduration)) url.searchParams.append("t", t);  
        try {
            partinfo = infos.pages[infos.p - 1];
        } catch (e) {
            partinfo = infos.pages[0];
        }
        return {currpage,partinfo,url,vidurl,shorturl,part,t,infos}
    }
    
    async function getCopyItem(copyitem,infos,av_span=null){
        const {partinfo,url,vidurl,shorturl,part,t} = await prepareData(infos,av_span);
        switch (copyitem) {
            case "curr":
                return {
                    title: "当前地址",
                    content: vidurl,
                    type: "copiable"
                };
            case "currTime":
                return {
                    title: "含视频进度地址(仅在播放时提供)",
                    content: url,
                    type: "copiable"
                };
            case "short":
                return {
                    title: "短地址格式",
                    content: shorturl,
                    type: "copiable"
                };
            case "share":
                return {
                    title: "快速分享",
                    content: `${infos.title}_地址:${shorturl}`,
                    type: "copiable"
                };
            case "shareTime":
                return {
                    title: "快速分享(含视频进度)",
                    content: `${infos.title}_地址:${url}`,
                    type: "copiable"
                };
            case "md":
                return {
                    title: "MarkDown格式",
                    content: `[${infos.title}](${vidurl})`,
                    type: "copiable"
                };
            case "bb":
                return {
                    title: "BBCode格式",
                    content: `[url=${vidurl}]${infos.title}[/url]`,
                    type: "copiable"
                };
            case "html":
                return {
                    title: "HTML格式",
                    content: `<a href="${vidurl}">${infos.title}</a>`,
                    type: "copiable"
                };
            case "vid":
                return {
                    title: "视频编号",
                    content: `<div class="shoav_expandinfo">
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
                `,
                    type: "component",
                    copyaction: function(){
                        copy(this.av_span.innerText);
                        popNotify.success("已复制到剪贴板",this.av_span.innerText);
                    }
                };
            default:
                if (Object.keys(config.customcopyitems).includes(copyitem)) {
                    let ccopyitem = config.customcopyitems[copyitem];
                    let pat = ccopyitem.content ? ccopyitem.content : "无效内容";
                    pat = apiBasedVariablesReplacement(pat.mapReplace({
                        "%timeurl%": url,
                        "%vidurl%": vidurl,
                        "%shorturl%": shorturl,
                        "%seek%": t,
                        "%title%": infos.title,
                        "%av%": infos.aid,
                        "%bv%": infos.bvid,
                        "%cid%": infos.cid,
                        "%p%": part,
                        "%pname%": partinfo.part,
                        "'": "\'"
                    }));
                    return {
                        title: `(自定义) ${ccopyitem.title}`,
                        content: pat,
                        type: "copiable"
                    }
                }else return null;
        }
    };

    function apiBasedVariablesReplacement(txt='',infos=globalinfos){
        log("apiBasedVariablesReplacement",infos);
        const vars = [...txt.matchAll(/\%[a-zA-Z.]+\%/g)].map(k=>k[0]);
        if(vars.length==0) return txt;
        const map = {};
        for(let replaceVar of vars){
            const varName = replaceVar.substring(1,replaceVar.length-1);
            const apiResult = recursiveApiResolver(varName,infos);
            if(!apiResult) continue;
            map[replaceVar] = apiResult;
        }
        return txt.mapReplace(map);
    }

    function recursiveApiResolver(name,infos=globalinfos){
        const pargs = name.split(".").filter(arr=>arr.length);
        if([pargs[0],pargs[pargs.length-1]].includes("")) return null;
        let target = infos;
        for(let parg of pargs){
            if(target.hasOwnProperty(parg)){
                target = target[parg];
            }else return null;
        }
        return target.toString();
    }

    async function feat_showAv(force = false, mode = 'av'/* 'bv' */) {
        const { av_root, infos } = this;
        const av_span = getOrNew("bilibiliShowAV" + (force ? mode : ''), av_root);
        //if (config.showAv) {
        if (force) {
            if (mode == 'bv') {
                av_span.innerText = infos.bvid;
            } else {
                av_span.innerText = 'av' + infos.aid;
            }
        } else if (config.defaultAv)
            av_span.innerText = 'av' + infos.aid;
        else
            av_span.innerText = infos.bvid;
        av_span.style.overflow = "hidden";
        const video = await waitForDom("video");
        if (video) {
            config.vduration = Math.floor(video.duration);
        }
        let title = `左键单击复制，${force?'右键单击切换显示，':''}长按打开窗口`;
        if(config.copyitems.length){
            const firstCopyItem = config.copyitems[0];
            const firstInfo = await getCopyItem(firstCopyItem,globalinfos,av_span);
            if(firstInfo!==null){
                if(firstInfo.type=="copiable"||firstInfo.type=="component"){
                    av_span.setAttribute('title',title + '\n默认复制: '+firstInfo.title);
                }
            }else av_span.setAttribute('title',title + '\n没有默认复制行为');
        }else{
            av_span.setAttribute('title',title + '\n没有默认复制行为');
        }
        if (av_span.getAttribute("setup") != globalinfos.cid) {
            if (!force)
                av_span.oncontextmenu = e => {
                    if (e.target.innerText.startsWith('av')) e.target.innerText = infos.bvid;
                    else av_span.innerText = 'av' + infos.aid;
                    e.preventDefault();
                };
            let runningCfg = config.running['avspanHC'+(force ? mode : '')];
            if(runningCfg) runningCfg.uninstall();
            runningCfg = new CKTools.HoldClick(av_span);
            runningCfg.onclick(async e => {
                for (let copyitem of config.copyitems) {
                    const copyiteminfo = await getCopyItem(copyitem,globalinfos,av_span);
                    if(copyiteminfo===null) {
                        log(`[ADVCOPY] warning: unknown custom copy item id "${copyitem}", maybe should clean settings up.`);
                        continue;
                    }
                    if(copyiteminfo.type=="copiable"){
                        copy(copyiteminfo.content);
                        popNotify.success(copyiteminfo.title+"复制成功", copyiteminfo.content);
                        return;
                    }
                    else if(copyiteminfo.type=="component"){
                        if(typeof(copyiteminfo.copyaction)==="function"){
                            try{
                                const func = copyiteminfo.copyaction.bind({av_span});
                                func();
                            }catch(e){log(copyiteminfo,e);}
                        }else{
                            copy(copyiteminfo.copyaction.toString());
                            popNotify.success("已复制到剪贴板",copyiteminfo.copyaction.toString())
                        }
                        return;
                    }
                    else continue;
                }
                popNotify.error("快速复制失败","没有任何已启用的可用快速复制设定");
            });
            runningCfg.onhold(async e => {
                let modalcontent = `
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
                <b>点击输入框可以快速复制</b><br>`;
                for (let copyitem of config.copyitems) {
                    const copyiteminfo = await getCopyItem(copyitem,globalinfos,av_span);
                    if(copyiteminfo.type=="copiable"){
                        modalcontent+=`<span class="copyitem-title">${copyiteminfo.title}</span><input readonly value="${copyiteminfo.content}" onclick="showav_fastcopy(this);" />`
                    }
                    else{
                        modalcontent+=copyiteminfo.content;
                    }
                }
                modalcontent += `<br><hr><a href="javascript:void(0)" onclick="showav_guisettings_advcopy()">⚙ 复制设置</a><br>
                <a href="https://github.com/CKylinMC/UserJS/issues/new?assignees=CKylinMC&labels=&template=feature-request.yaml&title=%5BIDEA%5D+ShowAV%E8%84%9A%E6%9C%AC%E9%A2%84%E8%AE%BE%E9%93%BE%E6%8E%A5%E6%A0%BC%E5%BC%8F%E8%AF%B7%E6%B1%82&target=[%E8%84%9A%E6%9C%AC%EF%BC%9A%E8%A7%86%E9%A2%91%E9%A1%B5%E9%9D%A2%E5%B8%B8%E9%A9%BB%E6%98%BE%E7%A4%BAAV/BV%E5%8F%B7]&desp=%E6%88%91%E5%B8%8C%E6%9C%9B%E6%B7%BB%E5%8A%A0%E6%96%B0%E7%9A%84%E9%A2%84%E8%AE%BE%E9%93%BE%E6%8E%A5%E6%A0%BC%E5%BC%8F%EF%BC%8C%E5%A6%82%E4%B8%8B...">缺少你需要的格式？反馈来添加...</a>
                `;
                modalcontent+= closeButton().outerHTML;
                CKTools.modal.alertModal("高级复制", modalcontent, "关闭");
            });
            av_span.setAttribute("setup", globalinfos.cid);
            config.running['avspanHC'+(force ? mode : '')] = runningCfg;
        }
        //} else av_span.remove();
    }

    async function feat_showMore() {
        const { av_root } = this;
        const more_span = getOrNew("bilibiliShowMore", av_root);
        more_span.innerHTML = '⋯';
        more_span.title = "展示更多信息";
        more_span.style.cursor = "pointer";
        if (more_span.getAttribute("setup") != globalinfos.cid) {
            more_span.addEventListener('click', async e => {
                let part, videoData = globalinfos;
                try {
                    part = videoData.pages[globalinfos.p - 1];
                } catch (e) {
                    part = videoData.pages[0];
                }
                let currentPageName = part.part.length ? part.part : '';
                let currentPageNum;
                if (videoData.videos != 1) {
                    currentPageNum = `P ${globalinfos.p}/${videoData.videos}`;
                } else {
                    currentPageNum = "P 1/1";
                }
                CKTools.modal.alertModal("视频信息", `
            <style scoped>
                li{
                    line-height: 2em;
                }
            </style>
            <li>
                <b>AV号: </b>av${globalinfos.aid}
            </li>
            <li>
                <b>BV号: </b>${globalinfos.bvid}
            </li>
            <li>
                <b>CID: </b>${globalinfos.cid}
            </li>
            <li>
                <b>分P: </b>${currentPageNum}
            </li>
            <li>
                <b>P名: </b>${currentPageName}
            </li>
            <li>
                <b>长度: </b>${globalinfos.duration}s
            </li>
            <li>
                <b>投稿: </b>${timeago.format(globalinfos.ctime * 1000, 'zh_CN')}
            </li>
            <li>
                <b>分区: </b>${globalinfos.tname}
            </li>
            <li>
                <b>大小: </b>${globalinfos.dimension.width}x${globalinfos.dimension.height}
            </li>
            <li>
                <b>封面: </b><a href="${globalinfos.pic}" target="_blank">点击查看</a>
            </li>
            `, "确定");
            })
            more_span.setAttribute("setup", globalinfos.cid);
        }
    }

    async function feat_showCTime() {
        const { av_root, infos } = this;
        const ct_span = getOrNew("bilibiliShowCTime", av_root);
        ct_span.style.textOverflow = "ellipsis";
        ct_span.style.whiteSpace = "nowarp";
        ct_span.style.overflow = "hidden";
        const d = new Date(infos.ctime * 1000);
        let txttime = timeago.format(infos.ctime * 1000, 'zh_CN');
        let rawtime = `${d.getFullYear()}-${(d.getMonth() + 1) < 10 ? '0' + (d.getMonth() + 1) : d.getMonth() + 1}-${d.getDate() < 10 ? '0' + d.getDate() : d.getDate()} ${d.getHours() < 10 ? '0' + d.getHours() : d.getHours()}:${d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes()}:${d.getSeconds() < 10 ? '0' + d.getSeconds() : d.getSeconds()}`;

        ct_span.title = "投稿时间 " + (config.defaultTextTime ? rawtime : txttime);
        ct_span.innerHTML = config.defaultTextTime ? txttime : rawtime
        if (config.hideTime) ct_span.innerHTML += `
        <style>
        .video-data>span:nth-child(3),.video-data>span.pupdate{
            display:none!important;
        }
        </style>`;
    }

    async function feat_showViews() {
        const { av_root, infos } = this;
        const v_span = getOrNew("bilibiliShowViews", av_root);
        v_span.style.textOverflow = "ellipsis";
        v_span.style.whiteSpace = "nowarp";
        v_span.style.overflow = "hidden";
        v_span.title = `播放量 ${infos.stat.view}`;
        v_span.innerHTML = (() => {
            const res = numberFormat(infos.stat.view);
            return `${res.value}${res.unit}播放`;
        })();
        v_span.innerHTML += `
        <style>
        .video-data>span.view{
            display:none!important;
        }
        </style>`;
    }

    async function feat_showDmk() {
        const { av_root, infos } = this;
        const dmk_span = getOrNew("bilibiliShowDmk", av_root);
        dmk_span.style.textOverflow = "ellipsis";
        dmk_span.style.whiteSpace = "nowarp";
        dmk_span.style.overflow = "hidden";
        dmk_span.title = `${infos.stat.danmaku}条弹幕`;
        dmk_span.innerHTML = (() => {
            const res = numberFormat(infos.stat.danmaku);
            return `${res.value}${res.unit}条弹幕`;
        })();
        dmk_span.innerHTML += `
        <style>
        .video-data>span.dm{
            display:none!important;
        }
        </style>`;
    }

    async function feat_showTop() {
        const { av_root, infos } = this;
        const top_span = getOrNew("bilibiliShowTop", av_root);
        top_span.style.textOverflow = "ellipsis";
        top_span.style.whiteSpace = "nowarp";
        top_span.style.overflow = "hidden";
        top_span.title = `全站最高排行第${infos.stat.his_rank}名`;
        top_span.innerHTML = ''
        top_span.innerHTML += `
        <style>
        .video-data>span.rank,.video-data>a.honor{
            display:none!important;
        }
        </style>`;
        if (infos.stat.his_rank === 0) {
            top_span.style.display = "none";
            setTimeout(() => {
                if (top_span.nextElementSibling) {
                    top_span.nextElementSibling.style.marginLeft = 0;
                }
            }, 100);
        } else {
            top_span.innerHTML += '📊 ' + infos.stat.his_rank;
        }
    }

    async function feat_showPic() {
        const { av_root, infos } = this;
        const pic_span = getOrNew("bilibiliShowPic", av_root);
        pic_span.style.textOverflow = "ellipsis";
        pic_span.style.whiteSpace = "nowarp";
        pic_span.style.overflow = "hidden";
        pic_span.title = "查看封面";
        pic_span.innerHTML = "🖼️";
        pic_span.style.cursor = "pointer";
        if (pic_span.getAttribute("setup") != globalinfos.cid) {
            config.running.picHC && config.running.picHC.uninstall();
            config.running.picHC = new CKTools.HoldClick(pic_span);
            config.running.picHC.onclick(() => {
                CKTools.modal.alertModal("封面", `
            <img src="${globalinfos.pic}" style="width:100%" onload="this.parentElement.style.width='100%'" />
            `, "关闭");
            });
            config.running.picHC.onhold(() => {
                open(globalinfos.pic);
            });
            pic_span.setAttribute("setup", globalinfos.cid);
        }
    }

    async function feat_showCid() {
        const { av_root, infos } = this;
        const cid_span = getOrNew("bilibiliShowCID", av_root);
        //if (config.showCid) {
        cid_span.style.textOverflow = "ellipsis";
        cid_span.style.whiteSpace = "nowarp";
        cid_span.style.overflow = "hidden";
        cid_span.title = "CID:" + infos.cid;
        cid_span.innerText = "CID:" + infos.cid;
        if (cid_span.getAttribute("setup") != globalinfos.cid) {
            config.running.cidspanHC && config.running.cidspanHC.uninstall();
            config.running.cidspanHC = new CKTools.HoldClick(cid_span);
            config.running.cidspanHC.onclick(() => {
                copy(currentPageName);
                popNotify.success("CID复制成功", globalinfos.cid);
            });
            config.running.cidspanHC.onhold(() => {
                CKTools.modal.alertModal("CID信息", `
                <input readonly style="width:440px" value="${globalinfos.cid}" />
                `, "关闭");
            });
            cid_span.setAttribute("setup", globalinfos.cid);
        }
        //} else cid_span.remove();
    }

    async function feat_showSize() {
        const { av_root, infos } = this;
        const size_span = getOrNew("bilibiliShowSize", av_root);
        //if (config.showCid) {
        size_span.style.textOverflow = "ellipsis";
        size_span.style.whiteSpace = "nowarp";
        size_span.style.overflow = "hidden";
        size_span.title = `${infos.dimension.width}x${infos.dimension.height}`;
        size_span.innerText = `${infos.dimension.width}x${infos.dimension.height}`;
        //} else cid_span.remove();
    }

    async function feat_openGUI() {
        const { av_root, infos } = this;
        const gui_span = getOrNew("bilibiliShowGUISettings", av_root);
        gui_span.innerHTML = "⚙";
        gui_span.title = "ShowAV 设置";
        gui_span.style.overflow = "hidden";
        gui_span.style.cursor = "pointer";
        gui_span.onclick = e => GUISettings();
    }

    async function feat_showArgue() {
        const { av_root, infos } = this;
        const argue_span = getOrNew("bilibiliShowArgue", av_root);
        const original = document.querySelector(".argue.item");
        if(!original) argue_span.style.display = "none";
        else argue_span.style.display = "block";
        argue_span.style.color = "rgb(255, 170, 44)";
        argue_span.innerHTML = "<i class='van-icon-info_warning'></i>";
        argue_span.title = (original&&original.title)||"警告";
        argue_span.style.overflow = "hidden";
    }

    async function feat_showPn() {
        const { av_root, infos } = this;
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
        let currentPageName = part.part.length ? part.part : '';
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

        if (pn_span.getAttribute("setup") != globalinfos.cid) {
            config.running.pnspanHC && config.running.pnspanHC.uninstall();
            config.running.pnspanHC = new CKTools.HoldClick(pn_span);
            config.running.pnspanHC.onclick(() => {
                copy(currentPageName);
                popNotify.success("分P标题复制成功", currentPageName);
            });
            config.running.pnspanHC.onhold(() => {
                CKTools.modal.alertModal("分P标题", `
                <input readonly style="width:440px" value="${currentPageName}" />
                `, "关闭");
            });
            pn_span.setAttribute("setup", globalinfos.cid);
        }
        //} else pn_span.remove();
    }

    async function feat_custom(itemid){
        const { av_root, infos } = this;
        const that = this;
        that.window = unsafeWindow;
        const custom_span = getOrNew("bilibili_"+itemid, av_root);
        const {partinfo,url,vidurl,shorturl,part,t} = await prepareData(infos);
        const parseTxt = txt=>apiBasedVariablesReplacement(txt.mapReplace({
            "%timeurl%": url,
            "%vidurl%": vidurl,
            "%shorturl%": shorturl,
            "%seek%": t,
            "%title%": infos.title,
            "%av%": infos.aid,
            "%bv%": infos.bvid,
            "%cid%": infos.cid,
            "%p%": part,
            "%pname%": partinfo.part,
            "'": "\'"
        }));
        if(Object.keys(config.customComponents).includes(itemid)){
            const item = config.customComponents[itemid];
            let content = item.content;
            if(item.content.startsWith("js:")){
                content = item.content.replace("js:","");
            }
            else content = parseTxt(item.content);
            custom_span.style.overflow = "hidden";
            try{
                if(item.title.startsWith("js:")){
                    let itemtitle = item.title.substr(3);
                    custom_span.innerHTML = eval(parseTxt(itemtitle));
                }else 
                custom_span.innerHTML = parseTxt(item.title);
            }catch(e){
                custom_span.innerHTML = parseTxt(item.title);
            }
            custom_span.title = `自定义组件: ${item.title}\n长按管理自定义组件`;
            if(custom_span.getAttribute("setup")!=globalinfos.cid){
                custom_span.setAttribute("setup",globalinfos.cid);
                config.running[itemid] && config.running[itemid].uninstall();
                config.running[itemid] = new CKTools.HoldClick(custom_span);
                config.running[itemid].onclick(e => {
                    console.log(item.content)
                    if(item.content.startsWith("js:")){
                        log("executing:",content);
                        exec(content,that)();
                    }else{
                        copy(content);
                        popNotify.success("已复制"+item.title,content);
                    }
                });
                config.running[itemid].onhold(e=>{
                    GUISettings_customcomponents();
                })
            }
        }else{
            log("Errored while handling custom components:",k,"not found");
            custom_span.remove();
        }
    } 

    function getSideloadModules(){
        if(!unsafeWindow.ShowAVModules) return {};
        const mods = {};
        for(const modName of Object.keys(unsafeWindow.ShowAVModules)){
            const mod = unsafeWindow.ShowAVModules[modName];
            if(mod&&(typeof(mod.name)==='string')&&(typeof(mod.onload)==='function')&&(typeof(mod.onclick)==='function')&&(typeof(mod.onhold)==='function')){
                mods[modName] = mod;
            }
        }
        return mods;
    }

    function mappedSideloadModules(){
        const sideloads = getSideloadModules();
        const mods = {};
        for(const modName of Object.keys(sideloads)){
            mods['sideload_'+modName] = sideloads[modName];
        }
        return mods;
    }

    async function runSideloadModule(module,moduleInternalID = (Math.floor(Math.random()*10000))){
        let slm_span = null;
        try{
            const { av_root }=this;
            const onloadFn = module.onload.bind(this);
            const onclickFn = module.onclick.bind(this);
            const onholdFn = module.onhold.bind(this);
            const name = "showav_slm_" + moduleInternalID;
            slm_span = getOrNew(name, av_root);
            slm_span.innerHTML = '';
            slm_span.style.textOverflow = "ellipsis";
            slm_span.style.whiteSpace = "nowarp";
            slm_span.style.overflow = "hidden";
            slm_span.title = "模块:" + module.name;
            if(module.tip){
                if(typeof(module.tip)=='function') slm_span.title+='\n'+module.tip.bind(this)();
                else slm_span.title+='\n'+module.tip;
            }else if(module.description){
                slm_span.title+='\n'+module.description;
            }
            slm_span.appendChild(await onloadFn(slm_span));
            if (slm_span.getAttribute("setup") != globalinfos.cid) {
                config.running[name] && config.running[name].uninstall();
                config.running[name] = new CKTools.HoldClick(slm_span);
                config.running[name].onclick(onclickFn);
                config.running[name].onhold(onholdFn);
                slm_span.setAttribute("setup", globalinfos.cid);
            }
        }catch(e){
            log('[ERR]',module.name,e);
            (slm_span&&(slm_span instanceof HTMLElement)&&slm_span.remove());
        }
    }

    async function tryInject(flag) {
        if (flag && config.orders.length === 0) return log('Terminated because no option is enabled.');
        if (!(await playerReady())) return log('Can not load player in time.');

        if (config.firstTimeLoad) {
            registerVideoChangeHandler();
            config.firstTimeLoad = false;
        }
        
        CKTools.addStyle(`.video-container-v1>.copyright.item{display:none!important;}.video-container-v1>.video-data{flex-wrap: wrap!important;}`,"showav_patchNewPlayer","update",document.head);

        if (config.forceGap) {
            CKTools.addStyle(`#bilibiliShowInfos{margin-left: 12px!important;}`,"showav_forceGapCss","update",document.head);
        }else{
            CKTools.addStyle(``,"showav_forceGapCss","update",document.head);
        }

        if (location.pathname.startsWith("/medialist")) {
            let aid = unsafeWindow.aid;
            if (!aid) {
                log("Variable 'aid' is not available from unsafeWindow.");
                let activeVideo = await waitForDom(".player-auxiliary-playlist-item-active");
                aid = activeVideo.getAttribute("data-aid");
            }
            let apidata = await getAidAPI(aid);
            globalinfos = apidata.data;
        } else {
            if (flag)
            globalinfos = (await getAPI(unsafeWindow.bvid)).data;
            else globalinfos = unsafeWindow.vd;
        }
        globalinfos.p = getUrlParam("p") || getPageFromCid(unsafeWindow.cid, globalinfos);

        const av_infobar = await waitForDom(".video-data");
        if (!av_infobar) return log('Can not load info-bar in time.');
        let av_root;
        if (config.showInNewLine) {
            av_root = getOrNew("bilibiliShowInfos", av_infobar.parentElement);
        } else {
            let rootel = document.querySelector("#bilibiliShowInfos");
            if (!rootel) {
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
        // av_root.style.overflow = "hidden";
        
        const that = {
            av_root, config, av_infobar, infos : globalinfos, CKTools, popNotify, tools:{
                copy, wait, waitForPageVisible, log, getPlayerSeeks, getHEVC, waitForDom, getOrNew, playerReady, variablesReplace:apiBasedVariablesReplacement
            },
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
            showArgue: feat_showArgue.bind(that),
            openGUI: feat_openGUI.bind(that),
            customDriver: feat_custom.bind(that)
        }

        const sideloads = mappedSideloadModules();

        config.orders.forEach(async k => {
            if(Object.keys(functions).includes(k)) await functions[k]();
            else if(Object.keys(sideloads).includes(k)) await runSideloadModule.bind(that)(sideloads[k], k);
            else{
                try{
                    await functions.customDriver(k);
                }catch(e){
                    log(`Custom component "${k}" throwed an error:`,e)
                };
            }
        });
        
        const titleobj = document.querySelector("span.tit");
        if(titleobj&&!titleobj.getAttribute("data-copy-action-registered")){
            titleobj.onclick = e => {
                let content = e.target.innerText;
                let tip = "已复制视频标题";
                if(unsafeWindow.getSelection().toString().length){
                    content = unsafeWindow.getSelection().toString();
                    tip = "已复制视频标题选中部分";
                }
                copy(content);
                popNotify.success(tip,content);
            }
            titleobj.setAttribute("data-copy-action-registered",true);
        }

        setupWarningAutoFolding();
    }

    function setupWarningAutoFolding(){
        //if(config.foldedWarningTip)
            /*CKTools.addStyle(
                "span.argue{margin-right: 10px !important;margin-left: 0 !important;overflow: hidden !important;width: 15px !important;text-overflow: clip !important;padding: 3px 4px !important}span.argue>i{margin-right: 5px!important}",
                "showav_foldWarningTip","update");*/
            CKTools.addStyle(
                "span.argue{display:none!important}",
                "showav_foldWarningTip","update");
        /*else
        CKTools.addStyle(
            "span.argue{margin-right: 10px !important;margin-left: 0 !important;}",
            "showav_foldWarningTip","update");*/
    }

    function closeButton(){
        const closebtn = document.createElement("div");
        closebtn.innerHTML = " × ";
        closebtn.style.position = "absolute";
        closebtn.style.top = "10px";
        closebtn.style.right = "10px";
        closebtn.style.cursor = "pointer";
        closebtn.style.fontWeight = 900;
        closebtn.style.fontSize = "larger";
        closebtn.setAttribute("onclick","CKTools.modal.hideModal()");
        return closebtn;
    }

    async function GUISettings() {
        if (CKTools.modal.isModalShowing()) {
            CKTools.modal.hideModal();
            await wait(300);
        }
        CKTools.modal.openModal("ShowAV / 设置", await CKTools.domHelper("div", async container => {
            container.style.alignItems = "stretch";
            container.style.minWidth = "300px";
            [
                closeButton(),
                await CKTools.domHelper("div", async tip => {
                    tip.style.lineHeight = "2em";
                    tip.style.fontSize = "small";
                    tip.style.fontStyle = "italic";
                    tip.style.width = "100%";
                    tip.innerText = "修改设置后记得点击保存哦";
                }),
                await CKTools.domHelper("li", async list => {
                    list.classList.add("showav_menuitem");
                    list.onclick = e => GUISettings_options();
                    [
                        await CKTools.domHelper("label", label => {
                            label.innerHTML = "功能选项";
                        }),
                        await CKTools.domHelper("span", label => {
                            label.innerHTML = "调整每个功能模块的单独选项";
                            label.style.marginLeft = "6px";
                        }),
                    ].forEach(e => list.appendChild(e));
                }),
                await CKTools.domHelper("li", async list => {
                    list.classList.add("showav_menuitem");
                    list.onclick = e => GUISettings_components();
                    [
                        await CKTools.domHelper("label", label => {
                            label.innerHTML = "组件设置";
                        }),
                        await CKTools.domHelper("span", label => {
                            label.innerHTML = "启用/排序/自定义功能组件";
                            label.style.marginLeft = "6px";
                        }),
                    ].forEach(e => list.appendChild(e));
                }),
                await CKTools.domHelper("li", async list => {
                    list.classList.add("showav_menuitem");
                    list.onclick = e => GUISettings_customcomponents(()=>GUISettings());
                    [
                        await CKTools.domHelper("label", label => {
                            label.innerHTML = "自定义组件设置";
                        }),
                        await CKTools.domHelper("span", label => {
                            label.innerHTML = "添加或删除自定义的信息栏组件";
                            label.style.marginLeft = "6px";
                        }),
                    ].forEach(e => list.appendChild(e));
                }),
                await CKTools.domHelper("li", async list => {
                    list.classList.add("showav_menuitem");
                    list.onclick = e => GUISettings_advcopy(()=>GUISettings());
                    [
                        await CKTools.domHelper("label", label => {
                            label.innerHTML = "高级复制设置";
                        }),
                        await CKTools.domHelper("span", label => {
                            label.innerHTML = "自定义复制弹窗和默认动作";
                            label.style.marginLeft = "6px";
                        }),
                    ].forEach(e => list.appendChild(e));
                }),
            ].forEach(e => container.appendChild(e));
        }));
    }

    async function GUISettings_options() {
        if (CKTools.modal.isModalShowing()) {
            CKTools.modal.hideModal();
            await wait(300);
        }
        CKTools.modal.openModal("ShowAV / 设置 / 功能选项", await CKTools.domHelper("div", async container => {
            container.style.alignItems = "stretch";
            [
                closeButton(),
                await CKTools.domHelper("li", sectiontitle=>{
                    sectiontitle.innerText = "信息栏";
                    sectiontitle.className = "showav_settings_sectiontitle";
                }),
                await CKTools.domHelper("li", async list => {
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.domHelper("input", input => {
                            input.type = "checkbox";
                            input.id = "showav_forcegap";
                            input.name = "showav_forcegap";
                            input.style.display = "none";
                            input.checked = config.forceGap;
                            input.addEventListener("change",e=>{
                                const label = document.querySelector("#showav_forcegaptip");
                                if(!label) return;
                                if(input.checked){
                                    label.innerHTML = "在第一个组件前<b>强制添加</b>间隔(点击切换)"
                                }else{
                                    label.innerHTML = "在第一个组件前<b>保持默认</b>间隔(点击切换)"
                                }
                            })
                        }),
                        await CKTools.domHelper("label", label => {
                            label.id = "showav_forcegaptip";
                            label.setAttribute('for', "showav_forcegap");
                            if(config.forceGap){
                                label.innerHTML = "在第一个组件前<b>强制添加</b>间隔(点击切换)"
                            }else{
                                label.innerHTML = "在第一个组件前<b>保持默认</b>间隔(点击切换)"
                            }
                        }),
                        await CKTools.domHelper("div", div => {
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `可选扩展信息栏和原版信息栏之间强制添加一个间隔，或保持默认`;
                        })
                    ].forEach(e => list.appendChild(e));
                }),
                await CKTools.domHelper("li", async list => {
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.domHelper("input", input => {
                            input.type = "checkbox";
                            input.id = "showav_newline";
                            input.style.display = "none";
                            input.name = "showav_newline";
                            input.checked = config.showInNewLine;
                            input.addEventListener("change",e=>{
                                const label = document.querySelector("#showav_showinnewlinetip");
                                if(!label) return;
                                if(input.checked){
                                    label.innerHTML = "在<b>新的一行中</b>显示扩展信息栏(点击切换)"
                                }else{
                                    label.innerHTML = "在<b>当前位置后</b>显示扩展信息栏(点击切换)"
                                }
                            })
                        }),
                        await CKTools.domHelper("label", label => {
                            label.id = "showav_showinnewlinetip";
                            label.setAttribute('for', "showav_newline");
                            if(config.showInNewLine){
                                label.innerHTML = "在<b>新的一行中</b>显示扩展信息栏(点击切换)"
                            }else{
                                label.innerHTML = "在<b>当前位置后</b>显示扩展信息栏(点击切换)"
                            }
                        }),
                        await CKTools.domHelper("div", div => {
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `可选将扩展信息栏显示在下一行，尽量减少对原信息栏的修改`;
                        })
                    ].forEach(e => list.appendChild(e));
                }),
                await CKTools.domHelper("li", async list => {
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.domHelper("label", label => {
                            label.style.paddingLeft = "3px";
                            label.id = "showav_foldvidwarn_tip";
                            label.setAttribute('for', "showav_foldvidwarn");
                            //if (config.foldedWarningTip)
                                //label.innerHTML = "默认 <b>隐藏</b> 视频警告文字(点击切换)";
                            //else
                                label.innerHTML = "默认 <b>隐藏</b> 视频警告文字";
                        }),
                        /*await CKTools.domHelper("input", input => {
                            input.type = "checkbox";
                            input.id = "showav_foldvidwarn";
                            input.name = "showav_foldvidwarn";
                            input.style.display = "none";
                            input.checked = config.foldedWarningTip;
                            input.addEventListener('change', e => {
                                const label = document.querySelector("#showav_foldvidwarn_tip");
                                if (!label) return;
                                if (input.checked)
                                    label.innerHTML = "默认 <b>折叠</b> 视频警告文字(点击切换)";
                                else
                                    label.innerHTML = "默认 <b>展示</b> 视频警告文字(点击切换)";
                            })
                        }),*/
                        await CKTools.domHelper("div", div => {
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `将视频警告(如 含有危险行为)折叠为图标，防止占用过多信息栏空间。由于新版本播放器适配问题，默认隐藏原版提示，请前往组件管理开启或关闭组件中的警告提示。`;
                        })
                    ].forEach(e => list.appendChild(e));
                }),
                await CKTools.domHelper("li", sectiontitle=>{
                    sectiontitle.innerText = "组件: 显示视频分P信息";
                    sectiontitle.className = "showav_settings_sectiontitle";
                }),
                await CKTools.domHelper("li", async list => {
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.domHelper("label", label => {
                            label.style.paddingLeft = "3px";
                            label.setAttribute('for', "showav_pnwid");
                            label.innerHTML = "字数限制";
                        }),
                        await CKTools.domHelper("input", input => {
                            input.type = "number";
                            input.id = "showav_pnwid";
                            input.name = "showav_pnwid";
                            input.setAttribute('min', 5);
                            input.setAttribute('max', 100);
                            input.style.width = "3em";
                            input.style.textAlign = "center";
                            input.style.marginLeft = "1em";
                            input.style.lineHeight = "1em";
                            input.value = config.pnmaxlength;
                            const updatePreview = () =>
                                wait(2).then(() => CKTools.addStyle(`
                                #showav_lengthpreview{
                                    max-width: ${input.value}em !important;
                                }
                                `, "showav_lengthpreviewcss", "update"));
                            input.addEventListener("input", updatePreview);
                            wait(300).then(updatePreview);
                        }),
                        await CKTools.domHelper("span", span => {
                            span.id = "showav_lengthpreview";
                            span.innerText = "这里是一条长度预览，你可以在这里查看长度限制的效果。好吧，我承认，后面这几个字只是为了凑个字数而已的。等等，你还要更长？？？相信我，你不会想要这么长的。";
                            span.style.maxWidth = "0em";
                            span.style.marginLeft = "30px";
                            span.style.textOverflow = "ellipsis";
                            span.style.whiteSpace = "nowarp";
                            span.style.overflow = "hidden";
                            span.style.whiteSpace = "nowrap";
                            span.style.display = "block";
                            span.style.fontSize = "12px";
                            span.style.transition = "all .5s";
                        }),
                        await CKTools.domHelper("div", div => {
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `限制分P信息显示时的最大长度`;
                        })
                    ].forEach(e => list.appendChild(e));
                }),
                await CKTools.domHelper("li", sectiontitle=>{
                    sectiontitle.innerText = "组件: 显示视频编号和高级复制";
                    sectiontitle.className = "showav_settings_sectiontitle";
                }),
                await CKTools.domHelper("li", async list => {
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.domHelper("label", label => {
                            label.style.paddingLeft = "3px";
                            label.id = "showav_defaultav_tip";
                            label.setAttribute('for', "showav_defaultav");
                            if (config.defaultAv)
                                label.innerHTML = "默认展示 <b>视频AV号</b> (点击切换)";
                            else
                                label.innerHTML = "默认展示 <b>视频BV号</b> (点击切换)";
                        }),
                        await CKTools.domHelper("input", input => {
                            input.type = "checkbox";
                            input.id = "showav_defaultav";
                            input.name = "showav_defaultav";
                            input.style.display = "none";
                            input.checked = config.defaultAv;
                            input.addEventListener('change', e => {
                                const label = document.querySelector("#showav_defaultav_tip");
                                if (!label) return;
                                if (input.checked)
                                    label.innerHTML = "默认展示 <b>视频AV号</b> (点击切换)";
                                else
                                    label.innerHTML = "默认展示 <b>视频BV号</b> (点击切换)";

                            })
                        }),
                        await CKTools.domHelper("div", div => {
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `仅对<b>可切换视频编号和高级复制</b>功能起效。<br>
                            可切换视频编号和高级复制组件可以使用右键临时切换显示内容。<br>
                            高级复制和快速复制默认读取对应组件显示内容，因此此处设置也会影响可切换视频编号组件的默认复制内容。`;
                        })
                    ].forEach(e => list.appendChild(e));
                }),
                await CKTools.domHelper("li", sectiontitle=>{
                    sectiontitle.innerText = "组件: 显示视频投稿时间";
                    sectiontitle.className = "showav_settings_sectiontitle";
                }),
                await CKTools.domHelper("li", async list => {
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.domHelper("label", label => {
                            label.style.paddingLeft = "3px";
                            label.id = "showav_hidetime_tip";
                            label.setAttribute('for', "showav_hidetime");
                            if (config.hideTime)
                                label.innerHTML = "<b>隐藏</b>原版发布时间 (点击切换)";
                            else
                                label.innerHTML = "<b>显示</b>原版发布时间 (点击切换)";
                        }),
                        await CKTools.domHelper("input", input => {
                            input.type = "checkbox";
                            input.id = "showav_hidetime";
                            input.name = "showav_hidetime";
                            input.style.display = "none";
                            input.checked = config.hideTime;
                            input.addEventListener('change', e => {
                                const label = document.querySelector("#showav_hidetime_tip");
                                if (!label) return;
                                if (input.checked)
                                    label.innerHTML = "<b>隐藏</b>原版发布时间 (点击切换)";
                                else
                                    label.innerHTML = "<b>显示</b>原版发布时间 (点击切换)";
                            })
                        }),
                        await CKTools.domHelper("div", div => {
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `仅在开启<b>视频投稿时间</b>功能时起效。<br>
                            插件添加的视频投稿时间可以选择显示两种时间格式，并且可排序。`;
                        })
                    ].forEach(e => list.appendChild(e));
                }),
                await CKTools.domHelper("li", async list => {
                    list.style.lineHeight = "2em";
                    [
                        await CKTools.domHelper("label", label => {
                            label.style.paddingLeft = "3px";
                            label.id = "showav_deftxttime_tip";
                            label.setAttribute('for', "showav_deftxttime");
                            if (config.defaultTextTime)
                                label.innerHTML = "显示<b>相对时间</b> (点击切换)";
                            else
                                label.innerHTML = "显示<b>完整时间戳</b> (点击切换)";
                        }),
                        await CKTools.domHelper("input", input => {
                            input.type = "checkbox";
                            input.id = "showav_deftxttime";
                            input.name = "showav_deftxttime";
                            input.style.display = "none";
                            input.checked = config.defaultTextTime;
                            input.addEventListener('change', e => {
                                const label = document.querySelector("#showav_deftxttime_tip");
                                if (!label) return;
                                if (input.checked)
                                    label.innerHTML = "显示<b>相对时间</b> (点击切换)";
                                else
                                    label.innerHTML = "显示<b>完整时间戳</b> (点击切换)";
                            })
                        }),
                        await CKTools.domHelper("div", div => {
                            div.style.paddingLeft = "20px";
                            div.style.color = "#919191";
                            div.innerHTML = `<b>相对时间格式:</b> 如  1周前<br><b>完整时间戳格式:</b> 如  2021-09-10 11:21:03<br>仅对<b>视频投稿时间</b>功能起效。`;
                        })
                    ].forEach(e => list.appendChild(e));
                }),
                await CKTools.domHelper("div", async btns => {
                    btns.style.display = "flex";
                    btns.style.alignItems = "flex-end";
                    btns.appendChild(await CKTools.domHelper("button", btn => {
                        btn.className = "CKTOOLS-toolbar-btns";
                        btn.innerHTML = "保存并返回";
                        btn.onclick = e => {
                            config.defaultAv = document.querySelector("#showav_defaultav").checked;
                            config.forceGap = document.querySelector("#showav_forcegap").checked;
                            config.hideTime = document.querySelector("#showav_hidetime").checked;
                            config.defaultTextTime = document.querySelector("#showav_deftxttime").checked;
                            config.foldedWarningTip = document.querySelector("#showav_foldvidwarn").checked;
                            config.pnmaxlength = parseInt(document.querySelector("#showav_pnwid").value);
                            config.showInNewLine = document.querySelector("#showav_newline").checked;
                            saveAllConfig();
                            CKTools.addStyle(``, "showav_lengthpreviewcss", "update");
                            CKTools.modal.hideModal();
                            let old = document.querySelector("#bilibiliShowInfos")
                            if (old) old.remove();
                            initScript(true);
                            wait(300).then(()=>GUISettings());
                        }
                    }))
                    btns.appendChild(await CKTools.domHelper("button", btn => {
                        btn.className = "CKTOOLS-toolbar-btns";
                        btn.innerHTML = "返回";
                        btn.style.background = "#ececec";
                        btn.style.color = "black";
                        btn.onclick = e => {
                            CKTools.addStyle(``, "showav_lengthpreviewcss", "update");
                            CKTools.modal.hideModal();
                            wait(300).then(()=>GUISettings());
                        }
                    }))
                })
            ].forEach(e => container.appendChild(e));
        }));
    }

    async function GUISettings_components() {
        if (CKTools.modal.isModalShowing()) {
            CKTools.modal.hideModal();
            await wait(300);
        }
        CKTools.modal.openModal("ShowAV / 设置 / 组件", await CKTools.domHelper("div", async container => {
            container.style.alignItems = "stretch";
            [
                closeButton(),
                // dragable code from ytb v=jfYWwQrtzzY
                await CKTools.domHelper("li", async list => {
                    const makeDragable = async id => {
                        return await CKTools.domHelper("div", draggable => {
                            draggable.className = "showav_dragableitem";
                            draggable.setAttribute("draggable", true);
                            draggable.setAttribute("data-id", id);
                            if (id.split("_")[0] === "custom") {
                                draggable.innerHTML = config.customComponents[id].title;
                                const node = document.createElement("div");
                                node.appendChild(document.createTextNode(config.customComponents[id].content));
                                draggable.appendChild(node);
                            }else if (id.split("_")[0] == "sideload") {
                                let ids = id.split("_");
                                ids.shift();
                                const modname = ids.join('_');
                                draggable.innerHTML = getSideloadModules()[modname].name;
                                const node = document.createElement("div");
                                node.appendChild(document.createTextNode(getSideloadModules()[modname].description??'外挂组件'));
                                draggable.appendChild(node);
                            } else {
                                draggable.innerHTML = txtCn[id];
                                draggable.innerHTML += `<div>${descCn[id]}</div>`;
                            }
                            let expanded = false;
                            draggable.addEventListener('dragstart', e => {
                                if (expanded) draggable.classList.remove('showav_expand');
                                draggable.classList.add('showav_dragging');
                                [...document.querySelectorAll('.showav_dragablediv')].forEach(e => e.classList.add('showav_child_dragging'))
                            })
                            draggable.addEventListener('dragend', e => {
                                if (expanded) draggable.classList.add('showav_expand');
                                draggable.classList.remove('showav_dragging');
                                [...document.querySelectorAll('.showav_child_dragging')].forEach(e => e.classList.remove('showav_child_dragging'))
                            })
                            draggable.addEventListener('click', e => {
                                expanded = draggable.classList.toggle('showav_expand');
                            })
                        })
                    };
                    function getClosestItem(container, y) {
                        const draggables = [...container.querySelectorAll(".showav_dragableitem:not(.showav_dragging)")];
                        return draggables.reduce((closest, child) => {
                            const box = child.getBoundingClientRect();
                            const offset = y - box.top - box.height / 2;
                            if (offset < 0 && offset > closest.offset) return { offset, element: child };
                            else return closest;
                        }, { offset: Number.NEGATIVE_INFINITY }).element;
                    }
                    function registerDragEvent(draggablediv) {
                        draggablediv.addEventListener('dragover', e => {
                            e.preventDefault();
                            const closestElement = getClosestItem(draggablediv, e.clientY);
                            const dragging = document.querySelector(".showav_dragging");
                            if (closestElement === null) {
                                draggablediv.appendChild(dragging);
                            } else {
                                draggablediv.insertBefore(dragging, closestElement);
                            }
                        })
                    }
                    [
                        await CKTools.domHelper("div", div => {
                            div.innerHTML = `<b>拖动下面的功能模块进行排序</b>`;
                        }),
                        await CKTools.domHelper("div", async enableddiv => {
                            enableddiv.innerHTML = `<b>启用</b>`;
                            enableddiv.className = "showav_dragablediv showav_enableddiv";
                            config.orders.forEach(async k => {
                                enableddiv.appendChild(await makeDragable(k));
                            });
                            registerDragEvent(enableddiv);
                        }),
                        await CKTools.domHelper("div", async disableddiv => {
                            disableddiv.innerHTML = `<b>禁用</b>`;
                            disableddiv.className = "showav_dragablediv showav_disableddiv";
                            const sideloads = getSideloadModules();
                            const sideloaditems = Object.keys(sideloads).map(k => 'sideload_'+k);
                            [...config.all,...sideloaditems].forEach(async k => {
                                if (config.orders.includes(k)) return;
                                disableddiv.appendChild(await makeDragable(k));
                            });
                            registerDragEvent(disableddiv);
                        }),
                        await CKTools.domHelper("div", async div => {
                            div.style.lineHeight = "2em";
                            div.style.cursor = "pointer";
                            div.style.color = "#1976d2";
                            div.style.fontWeight = "bold";
                            div.innerHTML = `功能设置`;
                            div.onclick = e => GUISettings_options();
                        }),
                        await CKTools.domHelper("div", async div => {
                            div.style.lineHeight = "2em";
                            div.style.cursor = "pointer";
                            div.style.color = "#1976d2";
                            div.style.fontWeight = "bold";
                            div.innerHTML = `管理自定义组件`;
                            div.onclick = e => GUISettings_customcomponents();
                        }),
                        await CKTools.domHelper("div", async div => {
                            div.style.lineHeight = "2em";
                            div.innerHTML = `<a href="https://github.com/CKylinMC/UserJS/issues/new?assignees=CKylinMC&labels=&template=feature-request.yaml&title=%5BIDEA%5D+ShowAV%E8%84%9A%E6%9C%AC%E6%98%BE%E7%A4%BA%E5%8A%9F%E8%83%BD%E8%AF%B7%E6%B1%82&target=[%E8%84%9A%E6%9C%AC%EF%BC%9A%E8%A7%86%E9%A2%91%E9%A1%B5%E9%9D%A2%E5%B8%B8%E9%A9%BB%E6%98%BE%E7%A4%BAAV/BV%E5%8F%B7]&desp=%E6%88%91%E5%B8%8C%E6%9C%9B%E6%B7%BB%E5%8A%A0%E6%96%B0%E7%9A%84%E5%BF%AB%E6%8D%B7%E5%B1%95%E7%A4%BA%E5%8A%9F%E8%83%BD%EF%BC%8C%E5%8A%9F%E8%83%BD%E7%9A%84%E4%BD%9C%E7%94%A8%E5%92%8C%E6%95%88%E6%9E%9C%E5%A6%82%E4%B8%8B...">需要添加其他的显示或快捷功能？反馈来添加...</a>`
                        }),
                        await CKTools.domHelper("div", async div => {
                            div.appendChild(await CKTools.domHelper("div", async btns => {
                                btns.style.display = "flex";
                                btns.appendChild(await CKTools.domHelper("button", btn => {
                                    btn.className = "CKTOOLS-toolbar-btns";
                                    btn.innerHTML = "保存并返回";
                                    btn.onclick = e => {
                                        const enableddiv = document.querySelector(".showav_enableddiv");
                                        const elements = enableddiv.querySelectorAll(".showav_dragableitem");
                                        let enabledArray = [];
                                        for (let element of [...elements]) {
                                            enabledArray.push(element.getAttribute('data-id'));
                                        }
                                        config.orders = enabledArray;
                                        saveAllConfig();
                                        CKTools.modal.hideModal();
                                        let old = document.querySelector("#bilibiliShowInfos")
                                        if (old) old.remove();
                                        initScript(true);
                                        wait(310).then(()=>GUISettings());
                                    }
                                }))
                                btns.appendChild(await CKTools.domHelper("button", btn => {
                                    btn.className = "CKTOOLS-toolbar-btns";
                                    btn.innerHTML = "返回";
                                    btn.style.background = "#ececec";
                                    btn.style.color = "black";
                                    btn.onclick = e => {
                                        CKTools.modal.hideModal();
                                        wait(310).then(()=>GUISettings());
                                    }
                                }))
                            }))
                        }),
                    ].forEach(e => list.appendChild(e));
                })
            ].forEach(e => container.appendChild(e));
        }));
    }

    async function GUISettings_advcopy(back=null) {
        if (CKTools.modal.isModalShowing()) {
            CKTools.modal.hideModal();
            await wait(300);
        }
        CKTools.modal.openModal("ShowAV / 设置 / 快速复制设置", await CKTools.domHelper("div", async container => {
            container.style.alignItems = "stretch";
            [
                closeButton(),
                // dragable code from ytb v=jfYWwQrtzzY
                await CKTools.domHelper("li", async list => {
                    const makeDragable = async id => {
                        return await CKTools.domHelper("div", draggable => {
                            draggable.className = "showav_dragableitem copyitem";
                            draggable.setAttribute("draggable", true);
                            draggable.setAttribute("data-id", id);
                            if (id.split("_")[0] === "custom") {
                                draggable.innerHTML = config.customcopyitems[id].title;
                                const node = document.createElement("div");
                                node.appendChild(document.createTextNode(config.customcopyitems[id].content));
                                draggable.appendChild(node);
                            } else {
                                draggable.innerHTML = txtCn[id];
                                draggable.innerHTML += `<div>${descCn[id]}</div>`;
                            }
                            draggable.removeItem = draggable.remove;
                            let expanded = false;
                            draggable.addEventListener('dragstart', e => {
                                if (expanded) draggable.classList.remove('showav_expand');
                                draggable.classList.add('showav_dragging');
                                [...document.querySelectorAll('.showav_dragablediv')].forEach(e => e.classList.add('showav_child_dragging'))
                            })
                            draggable.addEventListener('dragend', e => {
                                if (expanded) draggable.classList.add('showav_expand');
                                draggable.classList.remove('showav_dragging');
                                [...document.querySelectorAll('.showav_child_dragging')].forEach(e => e.classList.remove('showav_child_dragging'))
                            })
                            draggable.addEventListener('click', e => {
                                expanded = draggable.classList.toggle('showav_expand');
                            })
                        })
                    };
                    function getClosestItem(container, y) {
                        const draggables = [...container.querySelectorAll(".showav_dragableitem:not(.showav_dragging)")];
                        return draggables.reduce((closest, child) => {
                            const box = child.getBoundingClientRect();
                            const offset = y - box.top - box.height / 2;
                            if (offset < 0 && offset > closest.offset) return { offset, element: child };
                            else return closest;
                        }, { offset: Number.NEGATIVE_INFINITY }).element;
                    }
                    function registerDragEvent(draggablediv) {
                        draggablediv.addEventListener('dragover', e => {
                            e.preventDefault();
                            const closestElement = getClosestItem(draggablediv, e.clientY);
                            const dragging = document.querySelector(".showav_dragging");
                            if (closestElement === null) {
                                draggablediv.appendChild(dragging);
                            } else {
                                draggablediv.insertBefore(dragging, closestElement);
                            }
                        })
                    }
                    [
                        await CKTools.domHelper("div", div => {
                            div.innerHTML = `<b>拖动下面的功能模块进行排序</b>，第一个单项将成为默认快速复制项目。`;
                        }),
                        await CKTools.domHelper("div", async enableddiv => {
                            enableddiv.innerHTML = `<b>启用</b>`;
                            enableddiv.className = "showav_dragablediv showav_enableddiv";
                            config.copyitems.forEach(async k => {
                                enableddiv.appendChild(await makeDragable(k));
                            });
                            registerDragEvent(enableddiv);
                        }),
                        await CKTools.domHelper("div", async disableddiv => {
                            disableddiv.innerHTML = `<b>禁用</b>`;
                            disableddiv.className = "showav_dragablediv showav_disableddiv";
                            config.copyitemsAll.forEach(async k => {
                                if (config.copyitems.includes(k)) return;
                                disableddiv.appendChild(await makeDragable(k));
                            });
                            registerDragEvent(disableddiv);
                        }),
                        await CKTools.domHelper("li", async list => {
                            const makeItem = (copyitemid,focus=false) => {
                                const item = config.customcopyitems[copyitemid];
                                const node = document.createElement("li");
                                node.className = "copyitem";
                                if(focus){
                                    node.classList.add("actionpending");
                                    setTimeout(() => {
                                        node.classList.remove("actionpending");
                                        node.scrollIntoView();
                                    },20);
                                }
                                node.setAttribute("data-id", copyitemid);
                                node.innerHTML = `${item.title}<br>`;
                                node.style.borderRadius = "3px";
                                node.style.border = "solid 2px grey";
                                node.style.padding = "3px";
                                node.style.margin = "1px";
                                const smallp = document.createElement("p");
                                smallp.style.fontSize = "small";
                                smallp.style.color = "grey";
                                smallp.style.overflow = "hidden";
                                smallp.style.wordWrap = "nowarp";
                                smallp.appendChild(document.createTextNode(item.content));
                                node.appendChild(smallp);
                                node.removeItem = ()=>{
                                    node.classList.add("actionpending");
                                    setTimeout(()=>node.remove(),350);
                                };
                                node.onclick = async e => {
                                    if(node.classList.contains("preremove")){
                                        if (config.copyitems.includes(copyitemid)) {
                                            config.copyitems.splice(config.copyitems.indexOf(copyitemid), 1);
                                        }
                                        if (config.copyitemsAll.includes(copyitemid)) {
                                            config.copyitemsAll.splice(config.copyitemsAll.indexOf(copyitemid), 1);
                                        }
                                        delete config.customcopyitems[copyitemid];
                                        saveAllConfig();
                                        [...document.querySelectorAll(`.copyitem[data-id="${copyitemid}"]`)].forEach(e => e.removeItem());
                                    }else{
                                        [...document.querySelectorAll("li.copyitem.preremove")].forEach(e=>{
                                            e.classList.remove("preremove");
                                            try{if(e.clearTimer){
                                                clearTimeout(e.clearTimer);
                                            }}catch(e){};
                                        });
                                        node.classList.add("preremove");
                                        node.clearTimer = setTimeout(() => {
                                            node.classList.remove("preremove");
                                            node.clearTimer = null;
                                        },5000);
                                    }
                                }
                                return node;
                            };
                            [
                                await CKTools.domHelper("label", label => {
                                    label.style.paddingLeft = "3px";
                                    label.style.fontWeight = "bold";
                                    label.innerHTML = "添加自定义复制项目";
                                }),
                                await CKTools.domHelper("div", async div => {
                                    div.style.paddingLeft = "20px";
                                    [
                                        await CKTools.domHelper("input", async input => {
                                            input.id = "showav_customcopytitle";
                                            input.setAttribute("type", "text");
                                            input.style.width = "60%";
                                            input.style.margin = "6px 0 0 0";
                                            input.style.padding = "6px";
                                            input.style.borderRadius = "6px";
                                            input.style.border = "solid 2px grey";
                                            input.setAttribute("placeholder", "自定义标题");
                                        }),
                                        await CKTools.domHelper("input", async input => {
                                            input.id = "showav_customcopycontent";
                                            input.setAttribute("type", "text");
                                            input.style.width = "60%";
                                            input.style.margin = "6px 0 0 0";
                                            input.style.padding = "6px";
                                            input.style.borderRadius = "6px";
                                            input.style.border = "solid 2px grey";
                                            input.setAttribute("placeholder", "自定义内容");
                                        }),
                                        await CKTools.domHelper("div", div => {
                                            div.style.paddingLeft = "20px";
                                            div.style.color = "#919191";
                                            div.innerHTML = `变量提示<br><ul>
                                            <li>%timeurl% => 包含时间的完整地址</li>
                                            <li>%vidurl% => 视频纯净地址</li>
                                            <li>%shorturl% => 短地址</li>
                                            <li>%seek% => 当前视频播放秒数</li>
                                            <li>%title% => 视频标题</li>
                                            <li>%av% => av号</li>
                                            <li>%bv% => BV号</li>
                                            <li>%cid% => CID号</li>
                                            <li>%p% => 分P</li>
                                            <li>%pname% => 分P名</li>
                                            <li>%tname% => 分区名</li>
                                            </ul>`;
                                            div.style.maxHeight = '2rem';
                                            div.style.overflow = 'hidden';
                                            div.style.transition = 'all .3s';
                                            let expanded = false;
                                            div.onclick = e => {
                                                expanded = !expanded;
                                                if (expanded) {
                                                    div.style.maxHeight = "30rem";
                                                } else {
                                                    div.style.maxHeight = '2rem';
                                                }
                                            }
                                        }),
                                        await CKTools.domHelper("button", btn => {
                                            btn.className = "CKTOOLS-toolbar-btns";
                                            btn.innerHTML = "添加";
                                            btn.style.background = "#ececec";
                                            btn.style.color = "black";
                                            btn.onclick = async e => {
                                                const ccid = "custom_" + Math.random().toString(36).replace('.', '');
                                                const title = document.querySelector("#showav_customcopytitle").value;
                                                const content = document.querySelector("#showav_customcopycontent").value;
                                                if (title.trim().length < 1 || content.trim().length < 1) {
                                                    popNotify.warn("无法添加自定义项目", "标题或内容为空");
                                                    return;
                                                }
                                                config.customcopyitems[ccid] = { title, content };
                                                if (!config.copyitemsAll.includes(ccid)) config.copyitemsAll.push(ccid);
                                                saveAllConfig();
                                                const disablediv = document.querySelector(".showav_disableddiv");
                                                disablediv && disablediv.appendChild(await makeDragable(ccid));
                                                const customlist = document.querySelector("#showav_customitems");
                                                customlist && customlist.appendChild(makeItem(ccid,true));
                                                document.querySelector("#showav_customcopytitle").value = "";
                                                document.querySelector("#showav_customcopycontent").value = "";
                                            }
                                        })
                                    ].forEach(e => div.appendChild(e));
                                }),
                                await CKTools.domHelper("label", label => {
                                    label.style.paddingLeft = "3px";
                                    label.style.fontWeight = "bold";
                                    label.innerHTML = "已有自定义复制项目 <small>(点击移除)</small>";
                                }),
                                await CKTools.domHelper("ul", ul => {
                                    ul.style.paddingLeft = "3px";
                                    ul.id = "showav_customitems";
                                    for (let copyitemid of Object.keys(config.customcopyitems)) {
                                        ul.appendChild(makeItem(copyitemid));
                                    }
                                }),
                            ].forEach(e => list.appendChild(e));
                        }),
                        await CKTools.domHelper("div", async div => {
                            div.appendChild(await CKTools.domHelper("div", async btns => {
                                btns.style.display = "flex";
                                btns.appendChild(await CKTools.domHelper("button", btn => {
                                    btn.className = "CKTOOLS-toolbar-btns";
                                    btn.innerHTML = "保存并关闭";
                                    if(back!=null)
                                        btn.innerHTML = "保存并返回";
                                    btn.onclick = e => {
                                        const enableddiv = document.querySelector(".showav_enableddiv");
                                        const elements = enableddiv.querySelectorAll(".showav_dragableitem");
                                        let enabledArray = [];
                                        for (let element of [...elements]) {
                                            enabledArray.push(element.getAttribute('data-id'));
                                        }
                                        config.copyitems = enabledArray;
                                        saveAllConfig();
                                        initScript(true);
                                        if(back!=null) back();
                                        else CKTools.modal.hideModal();
                                    }
                                }))
                                btns.appendChild(await CKTools.domHelper("button", btn => {
                                    btn.className = "CKTOOLS-toolbar-btns";
                                    btn.innerHTML = "关闭";
                                    if(back!=null)
                                        btn.innerHTML = "返回";
                                    btn.onclick = e => {
                                        if(back!=null) back();
                                        else CKTools.modal.hideModal();
                                    }
                                }))
                            }))
                        }),
                    ].forEach(e => list.appendChild(e));
                })
            ].forEach(e => container.appendChild(e));
        }));
    }

    async function GUISettings_customcomponents(back=GUISettings_components) {
        if (CKTools.modal.isModalShowing()) {
            CKTools.modal.hideModal();
            await wait(300);
        }
        CKTools.modal.openModal("ShowAV / 设置 / 组件 / 自定义组件", await CKTools.domHelper("div", async container => {
            container.style.alignItems = "stretch";
            [
                closeButton(),
                // dragable code from ytb v=jfYWwQrtzzY
                await CKTools.domHelper("li", async list => {
                    [
                        await CKTools.domHelper("li", async list => {
                            const makeItem = (customitemid,focus=false) => {
                                const item = config.customComponents[customitemid];
                                const node = document.createElement("li");
                                node.className = "copyitem";
                                if(focus){
                                    node.classList.add("actionpending");
                                    setTimeout(() => {
                                        node.classList.remove("actionpending");
                                        node.scrollIntoView();
                                    },20);
                                }
                                node.setAttribute("data-id", customitemid);
                                node.innerHTML = `${item.title}<br>`;
                                node.style.borderRadius = "3px";
                                node.style.border = "solid 2px grey";
                                node.style.padding = "3px";
                                node.style.margin = "1px";
                                const smallp = document.createElement("p");
                                smallp.style.fontSize = "small";
                                smallp.style.color = "grey";
                                smallp.style.overflow = "hidden";
                                smallp.style.wordWrap = "nowarp";
                                smallp.appendChild(document.createTextNode(item.content));
                                node.appendChild(smallp);
                                node.removeItem = ()=>{
                                    node.classList.add("actionpending");
                                    setTimeout(()=>node.remove(),350);
                                };
                                node.onclick = async e => {
                                    if(node.classList.contains("preremove")){
                                        if (config.orders.includes(customitemid)) {
                                            config.orders.splice(config.orders.indexOf(customitemid), 1);
                                        }
                                        if (config.all.includes(customitemid)) {
                                            config.all.splice(config.all.indexOf(customitemid), 1);
                                        }
                                        delete config.customComponents[customitemid];
                                        saveAllConfig();
                                        [...document.querySelectorAll(`.copyitem[data-id="${customitemid}"]`)].forEach(e => e.removeItem());
                                    }else{
                                        [...document.querySelectorAll("li.copyitem.preremove")].forEach(e=>{
                                            e.classList.remove("preremove");
                                            try{if(e.clearTimer){
                                                clearTimeout(e.clearTimer);
                                            }}catch(e){};
                                        });
                                        node.classList.add("preremove");
                                        node.clearTimer = setTimeout(() => {
                                            node.classList.remove("preremove");
                                            node.clearTimer = null;
                                        },5000);
                                    }
                                }
                                return node;
                            };
                            [
                                await CKTools.domHelper("label", label => {
                                    label.style.paddingLeft = "3px";
                                    label.style.fontWeight = "bold";
                                    label.innerHTML = "添加组件";
                                }),
                                await CKTools.domHelper("div", async div => {
                                    div.style.paddingLeft = "20px";
                                    [
                                        await CKTools.domHelper("input", async input => {
                                            input.id = "showav_customcopntitle";
                                            input.setAttribute("type", "text");
                                            input.style.width = "60%";
                                            input.style.margin = "6px 0 0 0";
                                            input.style.padding = "6px";
                                            input.style.borderRadius = "6px";
                                            input.style.border = "solid 2px grey";
                                            input.setAttribute("placeholder", "自定义显示文本");
                                            input.addEventListener("keydown",e=>{
                                                const contentel = document.querySelector("#showav_customcopncontent");
                                                if(!contentel) return;
                                                if(contentel.getAttribute("data-sync")!=="1") return;
                                                setTimeout(()=>contentel.value = input.value,10);
                                            })
                                        }),
                                        await CKTools.domHelper("input", async input => {
                                            input.id = "showav_customcopncontent";
                                            input.setAttribute("type", "text");
                                            input.style.width = "60%";
                                            input.style.margin = "6px 0 0 0";
                                            input.style.padding = "6px";
                                            input.style.borderRadius = "6px";
                                            input.style.border = "solid 2px grey";
                                            input.title = `默认与自定义显示文本同步\n使用"js:"开头时将在点击时执行脚本`;
                                            input.setAttribute("data-sync","1");
                                            input.setAttribute("placeholder", "自定义复制内容或脚本");
                                            input.addEventListener("keydown",e=>input.setAttribute("data-sync","0"));
                                            input.addEventListener("keydown",async e=>{
                                                await wait(1);
                                                if(input.value.startsWith("js:")){
                                                    if(config.jssafetyWarning){
                                                        config.jssafetyWarning = !confirm(`安全性警告：\n\n"js:"开头的内容将作为JS脚本执行。\n\nJS脚本拥有您在当前页面的所有权限，请勿复制和执行未知来源的脚本！\n请仅在了解你输入的内容情况下使用此功能！\n\n如果不点击确定，则每次输入"js:"时都会弹出此消息。\n\n继续输入吗？`);
                                                        if(config.jssafetyWarning){
                                                            saveAllConfig();
                                                        }else{
                                                            input.value = input.value.replace("js:","");
                                                        }
                                                    }else{
                                                        document.querySelector("#showav_custom_txttip").style.display = "none";
                                                        document.querySelector("#showav_custom_jstip").style.display = "block";
                                                    }
                                                }else{
                                                    document.querySelector("#showav_custom_jstip").style.display = "none";
                                                    document.querySelector("#showav_custom_txttip").style.display = "block";
                                                }
                                            })
                                        }),
                                        await CKTools.domHelper("div", div => {
                                            div.style.paddingLeft = "20px";
                                            div.id = "showav_custom_txttip";
                                            div.style.color = "#919191";
                                            div.innerHTML = `变量提示<br><ul>
                                            <li>%timeurl% => 包含时间的完整地址</li>
                                            <li>%vidurl% => 视频纯净地址</li>
                                            <li>%shorturl% => 短地址</li>
                                            <li>%seek% => 当前视频播放秒数</li>
                                            <li>%title% => 视频标题</li>
                                            <li>%av% => av号</li>
                                            <li>%bv% => BV号</li>
                                            <li>%cid% => CID号</li>
                                            <li>%p% => 分P</li>
                                            <li>%pname% => 分P名</li>
                                            <li>%tname% => 分区名</li>
                                            </ul>`;
                                            div.style.maxHeight = '2rem';
                                            div.style.overflow = 'hidden';
                                            div.style.transition = 'all .3s';
                                            let expanded = false;
                                            div.onclick = e => {
                                                expanded = !expanded;
                                                if (expanded) {
                                                    div.style.maxHeight = "30rem";
                                                } else {
                                                    div.style.maxHeight = '2rem';
                                                }
                                            }
                                        }),
                                        await CKTools.domHelper("div", div => {
                                            div.style.paddingLeft = "20px";
                                            div.id = "showav_custom_jstip";
                                            div.style.display = "none";
                                            div.style.color = "#919191";
                                            div.innerHTML = `脚本提示<br><ul>
                                            <li>变量 infos => 视频信息</li>
                                            <li>方法 parseTxt("string") => 解析文本</li>
                                            <li>方法 copy("string") => 复制文字</li>
                                            </ul>`;
                                            div.style.maxHeight = '2rem';
                                            div.style.overflow = 'hidden';
                                            div.style.transition = 'all .3s';
                                            let expanded = false;
                                            div.onclick = e => {
                                                expanded = !expanded;
                                                if (expanded) {
                                                    div.style.maxHeight = "30rem";
                                                } else {
                                                    div.style.maxHeight = '2rem';
                                                }
                                            }
                                        }),
                                        await CKTools.domHelper("button", btn => {
                                            btn.className = "CKTOOLS-toolbar-btns";
                                            btn.innerHTML = "添加";
                                            btn.style.background = "#ececec";
                                            btn.style.color = "black";
                                            btn.onclick = async e => {
                                                const ccid = "custom_" + Math.random().toString(36).replace('.', '');
                                                const title = document.querySelector("#showav_customcopntitle").value;
                                                const content = document.querySelector("#showav_customcopncontent").value;
                                                if (title.trim().length < 1 || content.trim().length < 1) {
                                                    popNotify.warn("无法添加自定义组件", "标题或内容为空");
                                                    return;
                                                }
                                                config.customComponents[ccid] = { title, content };
                                                if (!config.all.includes(ccid)) config.all.push(ccid);
                                                saveAllConfig();
                                                const customlist = document.querySelector("#showav_customitems");
                                                customlist && customlist.appendChild(makeItem(ccid,true));
                                                document.querySelector("#showav_customcopntitle").value = "";
                                                document.querySelector("#showav_customcopncontent").value = "";
                                            }
                                        })
                                    ].forEach(e => div.appendChild(e));
                                }),
                                await CKTools.domHelper("label", label => {
                                    label.style.paddingLeft = "3px";
                                    label.style.fontWeight = "bold";
                                    label.innerHTML = "已有自定义组件 <small>(点击移除)</small>";
                                }),
                                await CKTools.domHelper("ul", ul => {
                                    ul.style.paddingLeft = "3px";
                                    ul.id = "showav_customitems";
                                    for (let itemid of Object.keys(config.customComponents)) {
                                        ul.appendChild(makeItem(itemid));
                                    }
                                }),
                            ].forEach(e => list.appendChild(e));
                        }),
                        await CKTools.domHelper("label", label => {
                            label.style.width = "100%";
                            label.style.display = "block";
                            label.style.textAlign = "center";
                            label.innerHTML = "此页面内容自动保存";
                        }),
                        await CKTools.domHelper("div", async div => {
                            div.appendChild(await CKTools.domHelper("div", async btns => {
                                btns.style.display = "flex";
                                btns.appendChild(await CKTools.domHelper("button", btn => {
                                    btn.className = "CKTOOLS-toolbar-btns";
                                    btn.innerHTML = "返回";
                                    btn.onclick = e => {
                                        saveAllConfig();
                                        back();
                                    }
                                }))
                                btns.appendChild(await CKTools.domHelper("button", btn => {
                                    btn.className = "CKTOOLS-toolbar-btns";
                                    btn.innerHTML = "关闭";
                                    btn.onclick = e => {
                                        saveAllConfig();
                                        CKTools.modal.hideModal();
                                    }
                                }))
                            }))
                        }),
                    ].forEach(e => list.appendChild(e));
                })
            ].forEach(e => container.appendChild(e));
        }));
    }

    const copy = function copy(text) {
        if (!navigator.clipboard) {
            prompt('请手动复制', text);
            return;
        }
        navigator.clipboard.writeText(text).then(function () {
            log('Copy OK');
        }, function (err) {
            log('Auto Copy Failed:', err);
            prompt('请手动复制', text);
        });
    }

    unsafeWindow.showav_fastcopy = (el) => {
        copy(el.value);
        popNotify.success("复制成功", el.value);
    }

    unsafeWindow.showav_guisettings = GUISettings;
    unsafeWindow.showav_guisettings_advcopy = GUISettings_advcopy;
    unsafeWindow.showav_guisettings_customcomponents = GUISettings_customcomponents;

    CKTools.modal.initModal();
    CKTools.modal.hideModal();
    const blockwin = CKTools.get("#CKTOOLS-blockWindow");
    blockwin&&(blockwin.onclick = CKTools.modal.hideModal);
    CKTools.addStyle(`
    #CKTOOLS-modal{
        width: fit-content!important;
        max-width: 80%!important;
    }
    .CKTOOLS-modal-content li label b {
        color: #1976d2!important;
    }
    .showav_menuitem{
        line-height: 2em;
        width: 100%;
        transition: all .3s;
        cursor: pointer;
    }
    .showav_menuitem:hover{
        transform: translateX(6px);
    }
    .showav_menuitem>label{
        color: #1976d2;
        font-weight: bold;
        font-size: large;
        display: block;
    }
    .showav_dragablediv {
        width: 400px;
        max-width: 80%;
        max-width: 400px;
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
    .showav_settings_sectiontitle{
        display: block;
        width: 100%;
        font-weight: bold;
        color: #1976d2;
        border-bottom: 2px solid #1976d2;
        margin: 18px 0 3px 0;
    }
    .showav_settings_sectiontitle:first-of-type{
        margin-top: 0!important;
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
    ul#showav_customitems{
        min-height: 60px;
    }
    ul#showav_customitems::after{
        content:"目前没有自定义项目。当添加了自定义项目时，可以在这里删除。";
        padding: 6px;
        display: block;
        opacity: 0;
        transition: all.3s;
        overflow: hidden;
        height: 0px;
    }
    ul#showav_customitems:empty::after{
        opacity: 1;
        height: 4rem!important;
    }
    li.copyitem{
        transition: all 0.3s;
        opacity: 1;
        max-height: 8em;
    }
    li.copyitem.preremove{
        color: red!important;
        border-color: red!important;
    }
    li.copyitem::after{
        transition: all 0.3s;
        line-height: 0px!important;
        content:"再次点击以移除";
        display: block;
        overflow: hidden;
        color: red!important;
        opacity: 0;
        max-height: 8em;
    }
    li.copyitem.actionpending{
        transition: all 0.5s;
        padding: 0px!important;
        border-width: 0px;
        margin-top: 0px!important;
        margin-bottom: 0px!important;
        max-height: 0em!important;
        opacity: 0;
    }
    li.copyitem.preremove::after{
        line-height: 2rem!important;
        opacity: 1;
    }
    #bilibiliShowInfos {
        display: flex;
        column-gap: 12px;
        flex-wrap: wrap;
    }
    `, 'showav_dragablecss', "unique", document.head);

    initScript(false);
})();
