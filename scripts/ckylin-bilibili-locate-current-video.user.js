// ==UserScript==
// @name         [Bilibili] 合集定位视频按钮
// @namespace    ckylin-bilibili-locate-current-video
// @version      v0.1
// @description  合集定位到当前视频
// @author       You
// @match        https://www.bilibili.com/video/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        unsafeWindow
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    function locateVideoPos(){
        unsafeWindow.document.querySelector(`[data-scrolled="true"]`)?.scrollIntoView({behavior:"smooth",block:"center",container:"all"});
    }

    function locateVideoPosWithAnim(){
        const vid = unsafeWindow.document.querySelector(`[data-scrolled="true"]`);
        if(!vid) return;
        vid.scrollIntoView({behavior:"smooth",block:"center",container:"all"});
        setTimeout(()=>{
            vid.style.animation = "locate-anim 0.5s forwards"
            setTimeout(()=>{
                vid.style.animation = "";
            },500);
        },1500);
    }

    function initObserver() {
        let frameRequested = false;

        const observer = new MutationObserver((mutations) => {
            let hasNewNode = false;
            for (let i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes.length > 0) {
                    hasNewNode = true;
                    break;
                }
            }

            if (hasNewNode && !frameRequested) {
                frameRequested = true;
                window.requestAnimationFrame(() => {
                    tryInjectButton();
                    frameRequested = false;
                });
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });

        tryInjectButton();
    }

    function tryInjectButton(){
        if(document.getElementById("cky-locate-btn")) return;
        const div = document.createElement("div");
        div.classList.add("locate-btn");
        div.id = "cky-locate-btn";
        div.innerText = "定位";
        div.addEventListener("click", locateVideoPosWithAnim);
        const container = unsafeWindow.document.querySelector(`div.rcmd-tab > div.video-pod.video-pod > div.video-pod__header > div.header-bottom > div.right`);
        if(!container) return;
        const lastBtn = container.querySelector(`div:not(.flagged)`);
        if(lastBtn) container.insertBefore(div, lastBtn);
        else container.appendChild(div);
    }

    function init(){
        unsafeWindow.locateVideoPos = locateVideoPos;

        GM_addStyle(`
        div.rcmd-tab > div.video-pod.video-pod > div.video-pod__header > div.header-bottom > div.right {
            display: flex;
        }
        div.locate-btn {
            margin: 0 3px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: var(--brand_blue);
            width: 70px;
            height: 24px;
            border-radius: 2px;
            border: 1px solid var(--brand_blue);
            transition: all 0.3s;
        }
        @keyframes locate-anim{
            0%, 100%{
                transform: scale(1);
            }
            50%{
                transform: scale(1.5);
            }
        }
        `);

        initObserver();
    }

    setTimeout(()=>{
        init();
    },1500);
})();
