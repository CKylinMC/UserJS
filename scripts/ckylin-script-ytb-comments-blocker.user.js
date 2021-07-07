// ==UserScript==
// @name         Youtube 评论区屏蔽工具
// @name:en      Youtube comments blocker
// @namespace    ckylin-script-ytb-comments-blocker
// @version      0.1
// @description  屏蔽指定上传者的视频下方评论
// @description:en Block comments from specified uploader's videos.
// @author       CKylinMC
// @match        https://www.youtube.com/watch?v=*
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @license      GPL-3.0-only
// ==/UserScript==

(function() {
    'use strict';

    const wait = t => new Promise(r => setTimeout(r,t));
    const waitFor = async q => {
        let trialTimes = 50;
        while(--trialTimes>=0){
            let dom = document.querySelector(q);
            if(dom) return dom;
            await wait(200);
        }
        return null;
    }
    const hasBlocked = async link => (await GM_getValue(link))=="Blocked";
    const addBlock = async link => {
        if(!(await hasBlocked(link))){
            await GM_setValue(link,"Blocked");
        }
    }
    const unBlock = async link => {
        if((await hasBlocked(link))){
            await GM_setValue(link,"0");
        }
    }
    const rmStyle = () => {
        const doms = document.querySelectorAll("style.CK-ytb-blocker");
        if(doms) [...doms].forEach(e=>e.remove());
    }
    const addStyle = s =>{
        const style = document.createElement("style");
        style.classList.add("CK-ytb-blocker");
        style.innerHTML = s;
        document.head.appendChild(style);
    }
    const menuId = {
        lastMenu: null
    }

    function addBlockMenu(link){
        if(menuId.lastMenu) GM_unregisterMenuCommand(menuId.lastMenu);
        menuId.lastMenu = GM_registerMenuCommand("屏蔽此Uploader / Block this Uploader", async () => {
            await addBlock(link);
            tryDetect();
        });
    }

    function addUnBlockMenu(link,ytd_comments){
        if(menuId.lastMenu) GM_unregisterMenuCommand(menuId.lastMenu);
        menuId.lastMenu = GM_registerMenuCommand("取消屏蔽此Uploader / Unblock this Uploader", async () => {
            await unBlock(link);
            const tip = document.querySelector("#CK-ytb-blocktip");
            if(tip) tip.remove();
            rmStyle();
            ytd_comments.style.display = "block";
            addBlockMenu(link);
        });
    }

    async function tryDetect(){
        const ytd_ch_link_q = "#text-container.ytd-channel-name a";
        const ytd_ch_link_dom = await waitFor(ytd_ch_link_q);
        if(!ytd_ch_link_dom) return console.log("[CommentsBlocker] No channel link detected.");
        const ytd_ch_link_href = ytd_ch_link_dom.href;
        if((await hasBlocked(ytd_ch_link_href))){
            //addStyle(`ytd-comments,#comments{display:none!important;}`);
            const ytd_comments = document.querySelector("#comments");
            const blocktip = document.createElement("center");
            addUnBlockMenu(ytd_ch_link_href,ytd_comments);
            blocktip.id = "CK-ytb-blocktip";
            blocktip.innerHTML = "Comments has been blocked.";
            blocktip.style.color = getComputedStyle(ytd_ch_link_dom).color;
            ytd_comments.parentNode.insertBefore(blocktip,ytd_comments);
            ytd_comments.style.display = "none";
        }else{
            addBlockMenu(ytd_ch_link_href);
        }
    }
    tryDetect();
})();