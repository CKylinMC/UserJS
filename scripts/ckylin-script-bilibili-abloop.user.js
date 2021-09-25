// ==UserScript==
// @name         哔哩哔哩AB循环
// @namespace    ckylin-script-bilibili-abloop
// @version      0.8
// @description  让播放器在AB点之间循环！
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @license      GPLv3 License
// ==/UserScript==

(function() {
    'use strict';

    //if (!('ABLOOPDEBUG' in unsafeWindow)) unsafeWindow.ABLOOPDEBUG = false;

    const get = q => document.querySelector(q);
    const wait = t => new Promise(r => setTimeout(r, t));
    const waitForPageVisible = async () => document.hidden && new Promise(r=>document.addEventListener("visibilitychange",r));
    const log = (...m) => console.log('[ABLoop]', ...m);
    //const d = (...m) => unsafeWindow.ABLOOPDEBUG ? console.log('[ABLoop Debug]', ...m) : 0;
    const registerMenu = (text, callback) => menuIds.push(GM_registerMenuCommand(text, callback));
    const clearMenu = () => { menuIds.forEach(id => GM_unregisterMenuCommand(id)); menuIds = []; };
    const getTotalTime = async () => await waitForAttribute(cfg.video,'duration');
    const getCurrentTime = () => cfg.video.currentTime;
    const setTime = (t,countincrease=false) => [unsafeWindow.player.seek(t),countincrease ? (function(){cfg.loopcounter+=1;showAnim({ico:'motion-play',txt:`回到开头 已循环 ${cfg.loopcounter} 次`})})() : null];
    const play = () => unsafeWindow.player.play();
    const pause = () => unsafeWindow.player.pause();
    const cfg = {
        a: 0,
        b: 999,
        loopcounter: 0,
        video: null,
        isLooping: false,
        showAnimTip: true,
        initok: false,
        listener: () => getCurrentTime() >= (cfg.b-0.2) ? setTime(cfg.a,true) : 0
    }
    const guibar = {
        toBar: null,
        fromBar:null
    }
    let menuIds = [];
    let menus = {};
    
    cfg.showAnimTip = ["null","undefined"].includes(typeof(GM_getValue('animtipenabled')))?cfg.showAnimTip:GM_getValue('animtipenabled');

    async function playerReady(){
        let i=50;
        while(--i>=0){
            await wait(200);
            if(!('player' in unsafeWindow)) continue;
            if(!('isInitialized' in unsafeWindow.player)) continue;
            if(!unsafeWindow.player.isInitialized()) continue;
            return true;
        }
        return false;
    }

    async function waitForDom(q) {
        let i = 50;
        let dom;
        while (--i >= 0) {
            if (dom = get(q)) break;
            await wait(100);
        }
        return dom;
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

    function applyMenus() {
        clearMenu();
        for (let item in menus) {
            if(!menus.hasOwnProperty(item)) continue;
            let menu = menus[item];
            registerMenu(menu.text, menu.callback);
        }
    }

    function setMenu(id,text,callback,noapply = false) {
        menus[id] = { text, callback };
        if (!noapply) applyMenus();
    }

    function triggerAPoint() {
        cfg.a = getCurrentTime();
        //d('getCurrentTime', getCurrentTime());
        setFromBarPos();
        setAPointMenu();
        showAnim({ico:"alpha-a-box",txt:`起始点已设置: ${cfg.a}`});
    }

    function triggerBPoint() {
        cfg.b = getCurrentTime();
        //d('getCurrentTime', getCurrentTime());
        setToBarPos();
        setBPointMenu();
        showAnim({ico:"alpha-b-box",txt:`结束点已设置: ${cfg.b}`});
    }

    function triggerToggleDoStop(fast=false) {
        if(!fast)cfg.isLooping = !cfg.isLooping;
        cfg.video.removeEventListener('timeupdate',cfg.listener);
        pause();
        if(!fast)hideBars();
        if(!fast)setLoopListenerMenu(false);
        if(!fast)forgiveAllPoint()
        if(!fast)showAnim({ico:"play",txt:`回到正常播放模式`,icoextra:"moveright"});
    }

    function triggerToggleDoStart(autostart=true) {
        triggerToggleDoStop(true);
        cfg.loopcounter = 0;
        cfg.isLooping = !cfg.isLooping;
        cfg.video.addEventListener('timeupdate',cfg.listener);
        setTime(cfg.a);
        if(autostart)play();
        showBars();
        setLoopListenerMenu(false);
        saveAllPoint()
        showAnim({ico:"sync",txt:`开始循环 ${cfg.a} - ${cfg.b}`,icoextra:"rotate"});
    }

    function triggerToggleDoAuto() {
        if (cfg.isLooping) {
            triggerToggleDoStop();
        } else {
            triggerToggleDoStart();
        }
    }

    function triggerAnimTipStatus(update=true,noapply = false){
        if(update){
            cfg.showAnimTip=!cfg.showAnimTip;
        }
        GM_setValue("animtipenabled",cfg.showAnimTip);
        cfg.showAnimTip ? setAnimTipEnabled(noapply) : setAnimTipDisabled(noapply);
        initAnimCss();
    }

    function setAnimTipEnabled(noapply = false){
        setMenu("ANIMTIP", "点此不再显示动作提示框", triggerAnimTipStatus, noapply);
    }

    function setAnimTipDisabled(noapply = false){
        setMenu("ANIMTIP", "点此恢复显示动作提示框", triggerAnimTipStatus, noapply);
    }

    function setAPointMenu(noapply = false) {
        setMenu("APOINT", "设置A点 (当前A点:" + (Math.floor(cfg.a*100)/100) + ")", triggerAPoint, noapply);
    }

    function setBPointMenu(noapply = false) {
        setMenu("BPOINT", "设置B点 (当前B点:" + (Math.floor(cfg.b*100)/100) + ")", triggerBPoint, noapply);
    }

    function setSavePointMenu(noapply = false) {
        setMenu("SAVEPOINT", "记住此页循环设置", saveAllPoint, noapply);
    }

    function setForgivePointMenu(noapply = false) {
        setMenu("SAVEPOINT", "清除此页循环设置", forgiveAllPoint, noapply);
    }

    function setLoopListenerMenu(noapply = false) {
        if (cfg.isLooping) {
            setMenu("LOOP", "停止循环", triggerToggleDoStop, noapply);
        } else {
            setMenu("LOOP", "开始循环", triggerToggleDoStart, noapply);
        }
    }

    function removeDom(...qs){
        qs.forEach(q=>{
            if (q) {
                let target;
                if (q instanceof Element) target = q;
                else target = document.querySelectorAll(q);
                if(target&&target.length){
                    target.forEach(e=>e.remove());
                }
            }
        });
    }

    function newBar() {
        let bar = document.createElement("div");
        bar.classList.add("bui-bar");
        bar.classList.add("abloop-custombar");
        bar.style.transform = "scaleX(0)";
        return bar;
    }

    function addStyleOnce(id,css) {
        let style = document.querySelector("#abloop-css-" + id);
        if (style) return;
        style = document.createElement("style");
        style.id = "abloop-css-" + id;
        style.innerHTML = css;
        document.body.appendChild(style);
        return;
    }

    async function setAPointBarPos(){
        let point = cfg.a;
        let duration = await getTotalTime();
        let dt = point/duration;
        if (!guibar.fromBar) await createMarkBar();
        const playbar = await waitForDom(".bui-bar.bui-bar-normal");
        if (!playbar) return;
        guibar.fromBar.style.transform = `scaleX(${dt})`;
        showBarA();
    }

    async function setBPointBarPos(){
        let point = cfg.b;
        let duration = await getTotalTime();
        let dt = point/duration;
        if (!guibar.toBar) await createMarkBar();
        const playbar = await waitForDom(".bui-bar.bui-bar-normal");
        if (!playbar) return;
        guibar.toBar.style.transform = `scaleX(${dt})`;
        showBarA();
    }

    async function setFromBarPos() {
        if (!guibar.fromBar) await createMarkBar();
        const playbar = await waitForDom(".bui-bar.bui-bar-normal");
        if (!playbar) return;
        guibar.fromBar.style.transform = playbar.style.transform;
        showBarA();
    }

    async function setToBarPos() {
        if (!guibar.toBar) await createMarkBar();
        const playbar = await waitForDom(".bui-bar.bui-bar-normal");
        if (!playbar) return;
        guibar.toBar.style.transform = playbar.style.transform;
        showBarB()
    }

    function showBars() {
        let bars = document.querySelectorAll(".abloop-custombar");
        bars.forEach(bar => {
            if (!bar.classList.contains("show")) bar.classList.add("show");
        })
    }

    function showBarA() {
        if (guibar.fromBar && !guibar.fromBar.classList.contains("show")) guibar.fromBar.classList.add("show");
    }

    function showBarB() {
        if (guibar.toBar && !guibar.toBar.classList.contains("show")) guibar.toBar.classList.add("show");
    }

    function hideBars() {
        let bars = document.querySelectorAll(".abloop-custombar");
        bars.forEach(bar => {
            if (bar.classList.contains("show")) bar.classList.remove("show");
        })
    }

    async function createMarkBar(){
        removeDom(guibar.fromBar, guibar.toBar);
        const playbar = await waitForDom(".bui-bar.bui-bar-normal");
        if (!playbar) return;
        addStyleOnce('markbar', `
            .abloop-custombar{
                opacity: 0;
                transform: scale(0);
            }
            .abloop-custombar.show{
                opacity: 1!important;
                transition: transform ease .3s,opacity .2s;
            }
        `);
        guibar.fromBar = newBar();
        guibar.fromBar.style.background = "#9e9e9e";
        guibar.fromBar.style.backgroundColor = "#9e9e9e";
        guibar.fromBar.style.transform = "scale(0)";
        guibar.fromBar.setAttribute('style', 'background:#9e9e9e!important');
        playbar.parentNode.appendChild(guibar.fromBar, playbar);
        guibar.toBar = newBar();
        guibar.toBar.style.background = "#8bc34a";
        guibar.toBar.style.backgroundColor = "#8bc34a";
        guibar.toBar.style.transform = "scale(1)";
        guibar.toBar.setAttribute('style', 'background:#8bc34a!important');
        playbar.parentNode.insertBefore(guibar.toBar, playbar);
    }
    function hotKeyHandler(e) {
        log(1,e);
        if (['KeyA', 'KeyB', 'KeyO'].includes(e.code)) {
            log(2,e);
            if (e.ctrlKey || e.altKey || e.shiftKey) return;
            if ([...e.path.filter(t => t.tagName == "TEXTAREA" || t.tagName == "INPUT")].length) return;
            switch (e.key) {
                case "a":
                    triggerAPoint();
                    e.preventDefault();
                    break;
                case "b":
                    triggerBPoint();
                    e.preventDefault();
                    break;
                case "o":
                    triggerToggleDoAuto();
                    e.preventDefault();
                    break;
            }
        }
    }

    function regHotKey() {
        unsafeWindow.removeEventListener('keypress', hotKeyHandler);
        unsafeWindow.addEventListener('keypress', hotKeyHandler);
    }

    function str2float(str,fallback=-1){
        try{
            let num = parseFloat(str);
            if(isNaN(num)) return fallback;
            if(typeof(num)==='undefined') return fallback;
            return num;
        }catch(e){ return fallback; }
    }

    function forgiveAllPoint(){
        GM_setValue(`a:${location.pathname}`,-1);
        GM_setValue(`b:${location.pathname}`,-1);
        setSavePointMenu();
    }

    function saveAllPoint(){
        saveAPoint();
        saveBPoint();
        setForgivePointMenu();
    }

    function saveAPoint(){
        GM_setValue(`a:${location.pathname}`,cfg.a);
    }

    function saveBPoint(){
        GM_setValue(`b:${location.pathname}`,cfg.b);
    }

    function getAPoint(){
        return str2float(GM_getValue(`a:${location.pathname}`));
    }

    function getBPoint(){
        return str2float(GM_getValue(`b:${location.pathname}`));
    }

    async function loadFromSavedData(){
        let a = getAPoint();
        let b = getBPoint();
        let loopauto = false;
        if(a>=0){
            cfg.a = a;
            setAPointBarPos();
            setAPointMenu(false);
            loopauto=true;
        }
        if(b>=0){
            cfg.b = Math.min(b,await getTotalTime());
            setBPointBarPos();
            setBPointMenu(false);
            loopauto=true;
        }
        if(loopauto) {
            setForgivePointMenu();
            triggerToggleDoStart(false);
        }
        return loopauto;
    }

    async function loadFromURL(){
        let url = new URL(location.href);
        let a = str2float(url.searchParams.get('ta'));
        let b = str2float(url.searchParams.get('tb'));
        let loopauto = false;
        if(a>=0){
            cfg.a = a;
            saveAPoint();
            setAPointBarPos();
            setAPointMenu(false);
            loopauto=true;
        }
        if(b>=0){
            cfg.b = Math.min(b,await getTotalTime());
            saveBPoint();
            setBPointBarPos();
            setBPointMenu(false);
            loopauto=true;
        }
        if(loopauto) {
            setForgivePointMenu();
            triggerToggleDoStart(false);
        }
        return loopauto;
    }

    function removeAllAnim(){
        removeDom(".abloop-loopcontainer",".abloop-loopanim",".abloop-asetanim",".abloop-bsetanim",".abloop-stopanim");
    }

    function makeAnimContainer(extraClass = "",outside=false){
        const container = document.createElement("div");
        container.classList.add("abloop-loopcontainer",...extraClass.split(' '));
        let target = outside?null:document.querySelector("#bilibiliPlayer");
        (target||document.body).appendChild(container);
        return container;
    }

    function makeIcon(name="",extras=""){
        const icon = document.createElement("span");
        icon.className = "mdi mdi-"+name+" abloop-anim-icon abloop-ico-"+extras;
        return icon;
    }

    function makeTipText(text=""){
        const tip = document.createElement("span");
        tip.className = "abloop-anim-tip";
        tip.innerHTML = text;
        return tip;
    }

    async function showAnim(options){
        if(!cfg.showAnimTip) return;
        await waitForDom("#abloop-css-anim-tip-css");
        const{
            icoextra = '',
            forwards = false,
            ico = '',
            txt = 'Empty Tip',
            waitPlayer = true,
            injectToBody = false,
        } = options;
        if(waitPlayer)await playerReady();
        removeAllAnim();
        const base = makeAnimContainer("abloop-loopanim"+(forwards ? " forwards" : ""),injectToBody);
        const icon = makeIcon(ico,icoextra);
        base.appendChild(icon);
        const tip = makeTipText(txt);
        base.appendChild(tip);
    }

    async function handleLoadFail(){
        log("No player found on this page.");
        initAnimCss();
        unsafeWindow.abloop_reinit = ()=>[
            delete unsafeWindow.abloop_reinit,
            init(true),showAnim({
            waitPlayer:false,
            injectToBody:true,
            ico:"alert-circle-check-outline",
            txt:"正在尝试重新加载"
        })];
        unsafeWindow.abloop_ignore = ()=>[showAnim({
            waitPlayer:false,
            injectToBody:true,
            ico:"alert-circle-check-outline",
            txt:"已忽略。本次播放将无法加载AB循环功能，可以刷新重试。"
        }),delete unsafeWindow.abloop_ignore];
        showAnim({waitPlayer:false,injectToBody:true,forwards:true,ico:"alert-circle-outline",txt:`未能按时加载。<br><span style="padding:0 10px;display:inline-block">如果你是后台打开的标签页面，这可能很常见。<br>你可以尝试：<a style="color:#83ff7e" href="javascript:void(0)" onclick="abloop_reinit()">重新加载</a> 或 <a style="color:#83ff7e" href="javascript:void(0)" onclick="abloop_ignore()">暂时禁用AB循环</a></span>`});
    }
    unsafeWindow.abloop_testfail = handleLoadFail;
    function initAnimCss(){
        if(cfg.showAnimTip)setTimeout(() => {
        if (!document.querySelector("#mdiiconcss"))
            document.head.innerHTML += `<link id="mdiiconcss" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@6.1.95/css/materialdesignicons.min.css"/>`
        addStyleOnce('anim-tip-css', `
        .abloop-anim-icon{
            margin: 0 10px;
        }
        .abloop-ico-rotate::before{
            animation: abloop-ico-anim-rotate forwards .5s .5s ease-in-out;
        }
        .abloop-ico-moveright::before{
            animation: abloop-ico-anim-move forwards .5s .5s ease-in-out;
        }
        .abloop-loopcontainer{
            position: fixed;
            top: 0;
            left: 50%;
            max-height: 3rem !important;
            transform: translateX(-50%);
            border-radius: 0 0 6px 6px;
            z-index: 900000;
            background: #000000a1;
            backdrop-filter: blur(4px);
            text-shadow: 0 0 3px white;
            color:white;
            font-size: 1.5rem;
            min-height: 3rem;
            transition: all .3s;
            padding-right: 10px;
            overflow: hidden;
            white-space: nowrap;
            line-height: 3rem;
            animation: abloop-in forwards 1.2s ease-in-out, abloop-in forwards reverse 1.2s 4.2s ease-in-out;
        }
        .abloop-loopcontainer:not(.forwards)::before {
            background: #ffffff30;
            content: " ";
            position: fixed;
            top: 0;
            left: 50%;
            height: 100%;
            width: 100%;
            transform: translateX(-150%);
            animation: abloop-progress forwards 3s 1.2s linear, abloop-fadeout forwards .3s 4.2s linear;
        }
        .abloop-loopcontainer:hover{
            max-height: 10rem !important;
            transition: all .3s ease-in-out;
        }
        .abloop-loopcontainer.forwards{
            animation: abloop-in forwards 1.2s ease-in-out !important;
        }
        @keyframes abloop-in{
            0%{
                opacity: 0;
                max-width: 2.2rem;
                top:-100%;
            }
            45%,55%{
                opacity:1;
                top:0rem;
                max-width: 2.2rem;
            }
            100%{
                max-width: 40rem;
            }
        }
        @keyframes abloop-progress{
            0%{
                transform: translateX(-150%);
            }
            100%{
                transform: translateX(-50%);
            }
        }
        @keyframes abloop-fadeout{
            0%{
                opacity: 1;
            }
            100%{
                opacity: 0;
            }
        }
        @keyframes abloop-ico-anim-move{
            0%,100%{
                transform: translateX(0px);
            }
            50%{
                transform: translateX(10px);
            }
        }
        @keyframes abloop-ico-anim-rotate{
            0%{
                transform: rotate(0deg);
            }
            100%{
                transform: rotate(-180deg);
            }
        }
        `);
    }, 300);
    }

    async function init(tip_when_ok=false) {
        cfg.initok = false;
        await waitForPageVisible();
        log("Waiting for player to be ready...");
        if(!(await playerReady())) return handleLoadFail();
        initAnimCss();
        cfg.video = await waitForDom(".bilibili-player-video video");
        //d('video', get(".bilibili-player-video video"));
        //d('total', await getTotalTime());
        cfg.video = get(".bilibili-player-video video");
        cfg.b = (await getTotalTime())-0.1;
        triggerAnimTipStatus(false,true);
        setAPointMenu(true);
        setBPointMenu(true);
        setLoopListenerMenu(true);
        setSavePointMenu();
        await createMarkBar();
        regHotKey();
        log("Initialization OK");
        if(tip_when_ok){
            showAnim({
                ico:"alert-circle-check-outline",
                txt:"加载成功"
            });
        }
        cfg.initok = true;
        if((await loadFromSavedData())+(await loadFromURL())) showBars();
    }

    // API
    unsafeWindow.abloop_setAPoint = (t=getCurrentTime(),remeber=false)=>{
        cfg.a = t;
        if(remeber)saveAPoint();
        setAPointBarPos();
        setAPointMenu();
    }
    unsafeWindow.abloop_setBPoint = (t=getCurrentTime(),remeber=false)=>{
        cfg.b = t;
        if(remeber)saveBPoint();
        setBPointBarPos();
        setBPointMenu();
    }
    unsafeWindow.abloop_isinited = ()=>cfg.initok;
    unsafeWindow.abloop_isLooping = ()=>cfg.isLooping;
    unsafeWindow.abloop_getLoopCount = ()=>cfg.loopcounter;
    unsafeWindow.abloop_startloop = triggerToggleDoStart;
    unsafeWindow.abloop_stoploop = triggerToggleDoStop;
    unsafeWindow.abloop_showTip = showAnim;
    unsafeWindow.abloop_setTipStatus = (enabled=cfg.showAnimTip)=>cfg.showAnimTip=enabled;
    unsafeWindow.abloop_init = init;

    init();

})();
