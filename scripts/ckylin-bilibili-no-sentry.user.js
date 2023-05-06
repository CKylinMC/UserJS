// ==UserScript==
// @name         [Bilibili] 不要Sentry!
// @namespace    ckylin-bilibili-no-sentry
// @version      1.2
// @description  不要Sentry!
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/bangumi/*
// @match        https://space.bilibili.com/*
// @match        https://t.bilibili.com/*
// @grant        unsafeWindow
// @license      GPL-3.0-only
// @run-at       document-start
// ==/UserScript==
Object.defineProperty(unsafeWindow,"Sentry",{
    value: {
        init:()=>{},
        Integrations:{
            Vue:function(){}
        },
        BrowserClient:function(){},
        getCurrentHub:function(){
            return {
                bindClient:()=>{}
            }
        }
    },
    writable: false
});
console.log("[NoSentry] Injected.",unsafeWindow.Sentry);
