// ==UserScript==
// @name         哔哩哔哩-平滑展开视频信息
// @namespace    ckylin-bilibili-animated-showfullinfo
// @version      0.2
// @description  平滑展开视频信息
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @grant        none
// @license      GPL-3.0-only
// ==/UserScript==

function CK_elementOk(){
    return document.querySelector("#v_desc>div.info")||document.querySelector(".desc-info.desc-v2");
}
function CK_getRealHeight(){
    try{
    return document.querySelector("#v_desc>div.info").scrollHeight;
    }catch(e){
    return document.querySelector(".desc-info.desc-v2").scrollHeight;
    }
}
window.CK_animatedFullInfo = false;
function CK_doAnimateFullInfoInject(){
    if(window.CK_animatedFullInfo) return true;
    if(!CK_elementOk()) return false;
    let targetDom = document.querySelector("#CK_animatedFullInfoCSS");
    if(targetDom) targetDom.remove();
    targetDom = document.createElement("style");
    targetDom.id = "CK_animatedFullInfoCSS";
    targetDom.innerHTML = "#v_desc>div.info.open,.desc-info.desc-v2.open{height: "+CK_getRealHeight()+"px!important;}";
    document.body.appendChild(targetDom);
    window.CK_animatedFullInfo = true;
    return true;
}
function CK_recheckAFI(){
    if(!CK_doAnimateFullInfoInject()) setTimeout(()=>{CK_recheckAFI()},1000);
}
setInterval(()=>{CK_recheckAFI()},5000);
