// ==UserScript==
// @name         哔哩哔哩宽屏模式不重定位
// @namespace    ckylin-script-bilibili-wide-screen-no-scroll
// @version      0.2
// @description  哔哩哔哩网页进入宽屏模式时取消b站官方的自动定位到播放器功能，防止与第三方某些脚本功能冲突。
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @grant        unsafeWindow
// @license      WTFPL License
// ==/UserScript==

(function () {

    setTimeout(() => {
        var script = document.createElement("script");
        script.innerHTML = `
function tryInjectWideWinHacks() {
    //console.log("[WideScreenNoScroll] Try inject...");
    //console.log(window.PlayerAgent,PlayerAgent.show1080p);
    if (!window.PlayerAgent || !window.PlayerAgent.show1080p) return false;
    window.clearInterval(window.injectWideWinHacksTimer);
    if (!window.orgscrollTo) {
        window.orgscrollTo = window.scrollTo;
        window.orgwidewin = window.PlayerAgent.player_widewin
        window.scrollTo = function () {
            if (window.ignoreScrolling) {
                window.ignoreScrolling = false;
                return;
            }
            window.orgscrollTo.apply(this, arguments);
        }
        window.PlayerAgent.player_widewin = function () {
            window.ignoreScrolling = true;
            window.orgwidewin.apply(this, arguments);
        }
        console.log("[WideScreenNoScroll] Injected.");
        return true;
    }
}
 
function startInjectWideWinHacks() {
    console.log("[WideScreenNoScroll] Start inject");
    window.injectWideWinHacksTimer = window.setInterval(tryInjectWideWinHacks, 50);
}
startInjectWideWinHacks();
`;
        unsafeWindow.document.body.appendChild(script);
    }, 1000);
})();