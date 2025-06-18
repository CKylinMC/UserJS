// ==UserScript==
// @name         [Bilibili] MarkAsRead
// @name:zh-CN   [Bilibili] 一键已读
// @namespace    ckylin-script-bilibili-mark-as-read
// @version      0.7
// @description  Mark all sessions as read with one click!
// @description:zh-CN 一键设置所有会话已读！
// @author       CKylinMC
// @match        https://message.bilibili.com/*
// @grant        unsafeWindow
// @supportURL   https://github.com/CKylinMC/UserJS
// @license      GPL-3.0-only
// @downloadURL https://update.greasyfork.org/scripts/429152/%5BBilibili%5D%20MarkAsRead.user.js
// @updateURL https://update.greasyfork.org/scripts/429152/%5BBilibili%5D%20MarkAsRead.meta.js
// ==/UserScript==

/*
提示：若你的功能现在还正常，请先不要更新。否则，你可能需要去脚本页面下载 0.6 旧版本。
0.7版本仅适配新页面。
*/

if (typeof (unsafeWindow) === "undefined") var unsafeWindow = window;
(function () {
    'use strict';
    const blacklist_elTitle = ["我的应援团","未关注人消息","疑似不良消息"];
    const wait = t => new Promise(r => setTimeout(r, t));
    const touchList = async () => {
        for(const item of [...document.querySelectorAll("._SessionItem_dnmx0_1")]){
            if(item.getAttribute("data-id")?.startsWith("group")) continue;
            if(blacklist_elTitle.includes(item.querySelector("._SessionItem__Name_dnmx0_67")?.textContent.trim())) continue;
            item.click();
            await wait(100);
        }
        //document.querySelector("._SessionItem_dnmx0_1").click();
        location.hash = "#/whisper";
    };
    const asRead = async () => await touchList();
    const settingList = () => document.querySelector("ul.message-sidebar__settings");
    const msgList = () => document.querySelector("._SessionList_1im8i_1");
    const intervalLog = {
        intervalId: null,
        lastHash: location.hash,
        lastState: false
    };
    const intervalHashChecker = ()=>{
        if(location.hash!==intervalLog.lastHash) {
            hashChecker();
            intervalLog.lastHash = location.hash;
        }
    }
    const hashChecker = ()=>{
        if(location.hash.startsWith("#/whisper")) {
            if(!intervalLog.lastState) {
                injectBtn();
                intervalLog.lastState = true;
            }
        }
        else{
            if(!intervalLog.lastState) return;
            let old;
            if (old = document.querySelector("#CKMARKREAD-BTN")) {
                old.style.transition = "margin .3s .2s, opacity .5s";
                old.style.opacity = "0";
                old.style.margin = "0px 0px";
                setTimeout(()=>old.remove(),300);
            }
            intervalLog.lastState = false;
        }
    };
    const waitFor = async (func, waitt = 100, retries = 100) => {
        while (--retries > 0) {
            try {
                const val = await func();
                if (val) return val;
                await wait(waitt);
            } catch (e) {
                console.log(e);
                await wait(100);
            }
        }
        return false;
    };
    const settingsBtn = (icon, text)=>{
        return `<div class="message-sidebar__item-icon">${icon}</div><div class="message-sidebar__item-name">${text}</div>`
    }
    const injectBtn = async () => {
        if (await waitFor(() => settingList())) {
            let old;
            if (old = document.querySelector("#CKMARKREAD-BTN")) old.remove();
            const item = document.createElement("li");
            item.classList.add("message-sidebar__item");
            item.innerHTML = settingsBtn('💬', '全部标为已读');
            item.onclick = async (e) => {
                e.target.innerHTML = settingsBtn('🕓', '请稍等...');
                await waitFor(() => msgList());
                await asRead();
                e.target.innerHTML = settingsBtn('✔', '已标为已读');
                e.target.onclick = ev => ev.target.innerHTML = settingsBtn('✔', '无需操作');
                setTimeout(()=>{
                    e.target.parentElement.style.transition = "margin .3s .2s, opacity .5s";
                    e.target.parentElement.style.opacity = "0";
                    e.target.parentElement.style.margin = "0px 0px";
                    setTimeout(()=>e.target.parentElement.remove(),300);
                },3000);
            };
            settingList().appendChild(item);
        }
    };
    const delayedInjectTask = async () => {
        await wait(1000);
        hashChecker();
        if(intervalLog.intervalId)clearInterval(intervalLog.intervalId);
        intervalLog.intervalId = setInterval(intervalHashChecker,300);
    };
    delayedInjectTask();
})();
