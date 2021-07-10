// ==UserScript==
// @name         [Bilibili] MarkAsRead
// @name:zh-CN   [Bilibili] 一键已读
// @namespace    ckylin-script-bilibili-mark-as-read
// @version      0.2
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
            if (el.classList.contains("list-item") && el.querySelector(".notify.notify-number")) await touch(el)
        }
        if (active) await touch(active)
    };
    const msgList = () => document.querySelector("div.list");
    const asRead = async () => await touchList(msgList());
    const settingList = () => document.querySelector("ul.list");
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
                e.target.onclick = () => alert("请勿重复、频繁操作！\n反复执行可能导致B站暂停你的消息发送功能数分钟！");
            };
            const item = document.createElement("li");
            item.classList.add("item");
            item.id = "CKMARKREAD-BTN";
            item.style.margin = "15px 0";
            item.appendChild(a);
            settingList().appendChild(item);
        }
    };
    const delayedInjectTask = async () => {
        await wait(1000);
        injectBtn()
    };
    delayedInjectTask();
})();