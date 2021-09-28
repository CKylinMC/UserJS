// ==UserScript==
// @name         [Bilibili]动态页面默认投稿视频页面
// @namespace    ckylin-script-bilibili-dynamix-default-tab
// @version      0.1
// @description  让哔哩哔哩动态页面默认显示投稿视频
// @author       CKylinMC
// @match        https://t.bilibili.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @license      WTFPL
// ==/UserScript==
 
(function() {
    const getUrlParam = key=>(new URL(location.href)).searchParams.get(key)
    const wait = ms=>new Promise(r=>setTimeout(r,ms));
    const waitForDom = async (query,domparent=document,maxRetries=20,gagms=200)=>{
		let i = maxRetries;
		while(--i>0){
			if(domparent.querySelector(query)) return true;
			await wait(gagms);
		}
		return false;
	}
    async function trySwitch(){
        const tabBtn = document.querySelector(".tab-bar>.tab:nth-child(2)>a.tab-text");
        if(tabBtn&&!tabBtn.classList.contains("selected")){
            let maxClick = 20;
            while(--maxClick && !tabBtn.classList.contains("selected")){
                tabBtn.click();
                await wait(200);
            }
        }
    }
    async function way1(){
        if(getUrlParam("tab")) return;
        await waitForDom(".tab-bar");
        await trySwitch();
    }
    function way2(){
        if(!getUrlParam("tab")) return location.href = "?tab=8";
    }
 
    let menuIds = [];
    let menus = {};
    const registerMenu = (text, callback) => menuIds.push(GM_registerMenuCommand(text, callback));
    const clearMenu = () => { menuIds.forEach(id => GM_unregisterMenuCommand(id)); menuIds = []; };
 
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
 
    function setWayMethodA(){
        GM_setValue("useJump",true);
        setWayMenuB();
    }
 
    function setWayMethodB(){
        GM_setValue("useJump",false);
        setWayMenuA();
    }
 
    function setWayMenuA(noapply = false) {
        setMenu("WAY", "改为使用跳转方案", setWayMethodA, noapply);
    }
 
    function setWayMenuB(noapply = false) {
        setMenu("WAY", "改为使用自动点击方案", setWayMethodB, noapply);
    }
 
    function init(){
        let targetMethod = way1;
        if(GM_getValue("useJump")){
            setWayMenuB();
            targetMethod = way2;
        }else{
            setWayMenuA();
        }
        targetMethod();
    }
    init();
})();