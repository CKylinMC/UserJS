// ==UserScript==
// @name         [Bilibili] MarkAsRead
// @name:zh-CN   [Bilibili] 一键已读
// @namespace    ckylin-script-bilibili-mark-as-read
// @version      0.3
// @description  Mark all sessions as read with one click!
// @description:zh-CN 一键设置所有会话已读！
// @author       CKylinMC
// @match        https://message.bilibili.com/*
// @grant        unsafeWindow
// @updateURL    https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-script-bilibili-mark-as-read.user.js
// @supportURL   https://github.com/CKylinMC/UserJS
// @license      GPL-3.0-only
// ==/UserScript==

if (typeof (unsafeWindow) === "undefined") var unsafeWindow = window;
(function () {
    'use strict';
    const wait = t => new Promise(r => setTimeout(r, t));
    const touch = async el => {
        el.click();
        await wait(100)
    };
    const touchList = async div => {
        let active = div.querySelector(".active");
        for (let el of [...div.children].splice(1)) {
            if (el.classList.contains("list-item") && el.querySelector(".notify")) await touch(el)
        }
        if (active) await touch(active)
        else location.hash = "#/whisper";
    };
    const msgList = () => document.querySelector("div.list");
    const asRead = async () => await touchList(msgList());
    const settingList = () => document.querySelector("ul.list");
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
    const injectBtn = async () => {
        if (await waitFor(() => settingList())) {
            let old;
            if (old = document.querySelector("#CKMARKREAD-BTN")) old.remove();
            const a = document.createElement("a");
            a.href = "javascript:void(0)";
            a.innerHTML = "💬 全部标为已读";
            a.onclick = async (e) => {
                e.target.innerHTML = "🕓 请稍等...";
                await waitFor(() => msgList());
                await asRead();
                e.target.innerHTML = "✔ 已标为已读";
                e.target.onclick = e => e.target.innerHTML = "✔ 无需操作";
                setTimeout(()=>{
                    e.target.parentElement.style.transition = "margin .3s .2s, opacity .5s";
                    e.target.parentElement.style.opacity = "0";
                    e.target.parentElement.style.margin = "0px 0px";
                    setTimeout(()=>e.target.parentElement.remove(),300);
                },3000);
            };
            const item = document.createElement("li");
            item.classList.add("item");
            item.id = "CKMARKREAD-BTN";
            item.style.opacity = "0";
            item.style.margin = "0px 0";
            item.style.transition = "all .3s";
            item.appendChild(a);
            settingList().appendChild(item);
            setTimeout(()=>{
                if(item){
                    item.style.margin = "15px 0";
                    item.style.opacity = "1";
                }
            },50)
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