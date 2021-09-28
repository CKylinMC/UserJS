// ==UserScript==
// @name         [Bilibili] 创作中心顺滑回顶
// @namespace    ckylin-script-bilibili-upload-smooth-totop
// @version      0.1
// @description  让哔哩哔哩的创作中心翻页回顶部时更顺滑一些。
// @author       CKylinMC
// @run-at       document-idle
// @match        https://member.bilibili.com/*
// @grant        unsafeWindow
// @license      WTFPL
// ==/UserScript==
 
(function() {
    'use strict';
    const wait = ms=>new Promise(r=>setTimeout(r,ms))
 
    async function waitFor(objname,objparent){
        while(true){
            if(objname in objparent) return objparent[objname]
            console.log("waiting...")
            await wait(200)
        }
    }
 
    async function inject(){
        await waitFor("jQuery",unsafeWindow)
        var organi = unsafeWindow.$.fn.animate
        unsafeWindow.$.fn.animate = function(a,b,c,d){
            try{
                console.log("gotop?",a,b,c,d,this,"\n\n",a.scrollTop,a.scrollTop==0)
                if(a.scrollTop==0){
                    scrollTo({top:0,behavior:"smooth"})
                    return;
                }
            }
            catch(e){console.log(e)}
            organi.bind(this)(a,b,c,d)
        }
        console.log("injected")
    }
    inject()
})();