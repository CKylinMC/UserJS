// ==UserScript==
// @name         哔哩哔哩宽屏模式不重定位
// @namespace    ckylin-script-bilibili-wide-screen-no-scroll
// @version      0.3
// @description  哔哩哔哩网页进入宽屏模式时取消b站官方的自动定位到播放器功能，防止与第三方某些脚本功能冲突。
// @author       CKylinMC
// @match        https://*.bilibili.com/*
// @grant        unsafeWindow
// @run-at       document-start
// @license      WTFPL License
// ==/UserScript==

(function () {
    const backup_scrollTo = unsafeWindow.scrollTo;
    unsafeWindow.scrollTo = function hackedScrollFn(){
        if(new Error().stack.indexOf("Object.player_widewin")>-1) return console.info("[WideScreenNoScroll] Rejected scrolling from 'player_widewin'.");
        backup_scrollTo.apply(this, arguments);
    }
    console.info("[WideScreenNoScroll] Injected.");
})();
