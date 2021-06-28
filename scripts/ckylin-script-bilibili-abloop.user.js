// ==UserScript==
// @name         哔哩哔哩AB循环
// @namespace    ckylin-script-bilibili-abloop
// @version      0.2
// @description  让播放器在AB点之间循环！
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @license      GPLv3 License
// ==/UserScript==

(function() {
    'use strict';

    //if (!('ABLOOPDEBUG' in unsafeWindow)) unsafeWindow.ABLOOPDEBUG = false;

    const get = q => document.querySelector(q);
    const wait = t => new Promise(r => setTimeout(r, t));
    const log = (...m) => console.log('[ABLoop]', ...m);
    //const d = (...m) => unsafeWindow.ABLOOPDEBUG ? console.log('[ABLoop Debug]', ...m) : 0;
    const registerMenu = (text, callback) => menuIds.push(GM_registerMenuCommand(text, callback));
    const clearMenu = () => { menuIds.forEach(id => GM_unregisterMenuCommand(id)); menuIds = []; };
    const getTotalTime = async () => await waitForAttribute(cfg.video,'duration');
    const getCurrentTime = () => cfg.video.currentTime;
    const setTime = t => unsafeWindow.player.seek(t);
    const play = () => unsafeWindow.player.play();
    const pause = () => unsafeWindow.player.pause();
    const cfg = {
        a: 0,
        b: 999,
        video: null,
        isLooping: false,
        listener: () => getCurrentTime() >= cfg.b ? setTime(cfg.a) : 0
    }
    const guibar = {
        toBar: null,
        fromBar:null
    }
    let menuIds = [];
    let menus = {};

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
    }

    function triggerBPoint() {
        cfg.b = getCurrentTime();
        //d('getCurrentTime', getCurrentTime());
        setToBarPos();
        setBPointMenu();
    }

    function triggerToggleDoStop() {
        cfg.isLooping = !cfg.isLooping;
        cfg.video.removeEventListener('timeupdate',cfg.listener);
        pause();
        hideBars();
        setLoopListenerMenu();
    }

    function triggerToggleDoStart() {
        cfg.isLooping = !cfg.isLooping;
        cfg.video.addEventListener('timeupdate',cfg.listener);
        setTime(cfg.a);
        play();
        showBars();
        setLoopListenerMenu();
    }

    function triggerToggleDoAuto() {
        if (cfg.isLooping) {
            triggerToggleDoStop();
        } else {
            triggerToggleDoStart();
        }
    }

    function setAPointMenu(noapply = false) {
        setMenu("APOINT", "设置A点 (当前A点:" + (Math.floor(cfg.a*100)/100) + ")", triggerAPoint, noapply);
    }

    function setBPointMenu(noapply = false) {
        setMenu("BPOINT", "设置B点 (当前B点:" + (Math.floor(cfg.b*100)/100) + ")", triggerBPoint, noapply);
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
        if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
            if (e.ctrlKey || e.altKey || e.shiftKey) return;
            if ([...e.path.filter(t => t.tagName == "TEXTAREA" || t.tagName == "INPUT")].length) return;
            switch (e.key) {
                case "1":
                    triggerAPoint();
                    break;
                case "2":
                    triggerBPoint();
                    break;
                case "3":
                    triggerToggleDoAuto();
                    break;
            }
        }
    }

    function regHotKey() {
        unsafeWindow.removeEventListener('keypress', hotKeyHandler);
        unsafeWindow.addEventListener('keypress', hotKeyHandler);
    }

    async function init() {
        log("Waiting for player to be ready...");
        if(!(await playerReady())) return log("No player found on this page.");
        cfg.video = await waitForDom(".bilibili-player-video video");
        //d('video', get(".bilibili-player-video video"));
        //d('total', await getTotalTime());
        cfg.video = get(".bilibili-player-video video");
        cfg.b = (await getTotalTime())-0.1;
        setAPointMenu(true);
        setBPointMenu(true);
        setLoopListenerMenu();
        createMarkBar();
        regHotKey();
        log("Initialization OK");
    }

    init();

})();