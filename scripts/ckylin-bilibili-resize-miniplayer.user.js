// ==UserScript==
// @name         哔哩哔哩-修改迷你播放器大小位置
// @namespace    ckylin-bilibili-resize-miniplayer
// @version      0.7
// @description  手动设置哔哩哔哩迷你播放器大小和位置并记住
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.info
// @grant        GM.registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @license      GPL-3.0
// ==/UserScript==
/*
 * 致用户：
 *   每次脚本更新会展示更新的代码，但是应该不显示更新日志。
 *   如果需要可以前往：
 *     更新日志地址 https://greasyfork.org/zh-CN/scripts/404623
 *   查看，如果有bug或者想法也请前往：
 *     反馈区 https://greasyfork.org/zh-CN/scripts/404623/feedback
 *   发帖反馈。
 *   其他的我的有关于哔哩哔哩的脚本：
 *     脚本合集 https://greasyfork.org/zh-CN/scripts?set=403506
 *   感谢支持。
 *
 *
 * 致大佬：
 *   代码写的比较粗糙，因为我只是业余时间在学习和制作这些，最初也只是
 *   自己用的着所以写了，然后顺便发出来，发现有其他人也用得到，于是便
 *   把其他的脚本也发出来，有时候还有人有需求也写一写这样。
 *   但是不可否认的是本人编码水平确实不高:P
 *
 *   所以：如果各位大佬有任何的编码方面的建议、问题指导还请直接指出，
 *   发在反馈区就可以，看到必尽力修改，对于所有技术方面的指导本人均
 *   感激不尽。
 */

//==预留选项
// 此处预留一些代码层面的选项，一般不需要修改。
// 出现问题时去脚本发布页面重新安装即可。

// 使用新版样式加载方式（非强制加载），新版加载方式略有延迟，但是可以保证播放器可以拖动
window.CK_SoftMode = true;

// 自动加载迷你播放器样式补丁，用于防止迷你播放器窗口过大时错误出现多余控件的问题。
window.CK_ApplyStylePatch = true;

//==以下代码不建议修改

GM_registerMenuCommand("大窗口 - 640x360", () => {
    window.CK_setMiniPlayerSize(640, 360);
});
GM_registerMenuCommand("中窗口 - 480x270", () => {
    window.CK_setMiniPlayerSize(480, 270);
});
GM_registerMenuCommand("小窗口 - 320x210", () => {
    window.CK_setMiniPlayerSize(320, 210);
});
GM_registerMenuCommand("官方默认 - 400x225", () => {
    window.CK_setMiniPlayerSize(400, 225);
});
GM_registerMenuCommand("自定义", () => {
    var CK_w = prompt("宽度(px)", 320);
    var CK_h = prompt("高度(px)", CK_w/16*9);
    window.CK_setMiniPlayerSize(CK_w, CK_h);
});
GM_registerMenuCommand("记忆当前迷你播放器位置", () => {
    window.CK_savePos();
});
GM_registerMenuCommand("重置全部", () => {
    window.CK_RemoveAllStyle(true);
});

(function () {
    function CK_addBtn() {
        var c = document.querySelector(".float-nav .nav-menu");
        if (!c) return false;
        if(window.CK_SoftMode) CK_restoreRemeberedStyles();
        var alreadySet = document.querySelector("#ck_setminiplayersize");
        if (alreadySet) {
            alreadySet.remove();
        }
        var ckbtn = document.createElement("div");
        ckbtn.title = "点击设置播放器大小";
        ckbtn.className = "item mini";
        ckbtn.innerHTML = "<span>设置</span><span>大小</span>"
        ckbtn.id = "ck_setminiplayersize"
        ckbtn.onclick = function () {
            var CK_w = prompt("宽度(px)", 320);
            var CK_h = prompt("高度(px)", CK_w/16*9);
            window.CK_setMiniPlayerSize(CK_w, CK_h);
        };
        c.appendChild(ckbtn);
        return true;
    }

    window.CK_restoreRemeberedStyles = function CK_restoreRemeberedStyles(){
        if(!window.CK_restoredStyleFlag){
            window.CK_restoredStyleFlag = true;
        }
        CK_restoreMiniPlayerSize();
        CK_restoreMiniPlayerPos();
    }

    window.CK_restoreMiniPlayerSize = async function CK_restoreMiniPlayerSize () {
        if(!(await GM.getValue("CK_miniPlayerSize_remebered"))) return;
        var w_h = await CK_getSavedSize();
        window.CK_setMiniPlayerSize(w_h.w,w_h.h);
    }

    window.CK_getSavedSize = async function CK_getSavedSize () {
        var w = await GM.getValue("CK_miniPlayerSize_w");
        var h = await GM.getValue("CK_miniPlayerSize_h");
        return {w: w, h: h};
    }

    window.CK_restoreMiniPlayerPos = async function CK_restoreMiniPlayerPos () {
        if(!(await GM.getValue("CK_miniPlayerPos_remebered"))) return;
        var t_l = await CK_getSavedPos();
        window.CK_setMiniPlayerPos(t_l.l,t_l.t);
    }

    window.CK_getSavedPos = async function CK_getSavedPos () {
        var l = await GM.getValue("CK_miniPlayerPos_Left");
        var t = await GM.getValue("CK_miniPlayerPos_Top");
        return {t:t,l:l};
    }

    window.CK_savePos = function CK_savePos(){
        var pos = window.CK_getCurrentPos();
        if(!pos) return;
        window.CK_remeberPos(pos.l,pos.t);
    }

    window.CK_getCurrentPos = function(){
        var p = document.querySelector("#bilibili-player");
        if(!p)return null;
        var t = p.style.top.replace("px","");
        var l = p.style.left.replace("px","");
        return {t:t,l:l};
    }

    window.CK_remeberPos = function(l,t){
        GM.setValue("CK_miniPlayerPos_remebered", true);
        GM.setValue("CK_miniPlayerPos_Left", l);
        GM.setValue("CK_miniPlayerPos_Top", t);
    }

    window.CK_remeberSize = function (w, h) {
        GM.setValue("CK_miniPlayerSize_remebered", true);
        GM.setValue("CK_miniPlayerSize_w", w);
        GM.setValue("CK_miniPlayerSize_h", h);
    }

    window.CK_RemoveAllStyle = function () {
        GM.setValue("CK_miniPlayerSize_remebered", false);
        GM.setValue("CK_miniPlayerPos_remebered", false);
        [...document.querySelectorAll(".CK_PlayerMods_Styles")].forEach(e => e.remove());
    }

    window.CK_addStyle = function (str) {
        var s = document.createElement("style");
        s.innerHTML = str;
        s.classList.add("CK_PlayerMods_Styles");
        document.body.appendChild(s);
    }

    window.CK_setWH = function (w, h) {
        window.CK_addStyle("#bilibili-player.mini-player .player{width: " + w + "!important;height: " + h + "!important;}")
        window.CK_addStyle("#bilibili-player.mini-player:before{width: " + w + "!important;height: " + h + "!important;}")
        window.CK_addStyle("#bilibili-player.mini-player{width: " + w + "!important;height: " + h + "!important;}")
        //window.CK_addStyle("#bilibili-player{width: " + w + "!important;height: " + h + "!important;}")
    }

    window.CK_setLT = function (l, t) {
        window.CK_addStyle("#bilibili-player{left: " + l + "!important;top: " + t + "!important;}")
    }

    window.CK_setMiniPlayerSize = function CK_setMiniPlayerSize (w, h) {
        var CK_w = w + "px";
        var CK_h = h + "px";
        window.CK_remeberSize(w, h);
        window.CK_setWH(CK_w, CK_h);
    }

    window.CK_setMiniPos = function(left,top){
        var p = document.querySelector("#bilibili-player");
        if(!p)return;
        var applied = false;
        var ob = new MutationObserver(function(){
            if(!applied){
                if(!p.classList.contains("mini-player"))return;
                applied = true;
                p.style.top = top+"px";
                p.style.left = left+"px";
                var d = document.querySelector("div.mini-player-drag-mask");
                if(d) CK_MiniPlayerEventsTrigger(d);
                ob.disconnect();
            }
        });
        ob.observe(p, { attributes: true, childList: false });
    }

    window.CK_setMiniPlayerPos = function CK_setMiniPlayerPos (l, t) {
        var CK_l = l + "px";
        var CK_t = t + "px";
        window.CK_remeberPos(l, t);
        //window.CK_setLT(CK_l, CK_t);
        CK_setMiniPos(l,t);
    }

    window.CK_MiniPlayerEventsTrigger = function CK_MiniPlayerEventsTrigger (node) {
        var mousedown = document.createEvent ('MouseEvents');
        mousedown.initEvent ("mousedown", true, true);
        node.dispatchEvent (mousedown);
        var mousemove = document.createEvent ('MouseEvents');
        mousemove.initEvent ("mousemove", true, true);
        node.dispatchEvent (mousemove);
        var mouseup = document.createEvent ('MouseEvents');
        mouseup.initEvent ("mouseup", true, true);
        node.dispatchEvent (mouseup);
    }

    window.CK_applyMiniPlayerPatch = function (){
        window.CK_addStyle(`
div#bilibili-player.mini-player .bilibili-player-video-control-wrap,
div#bilibili-player.mini-player .bilibili-player-video-bottom-area{
display:none!important;
}
 
div#bilibili-player.mini-player .bilibili-player-drag-mask-progress{
display:block;
}
`);
    }

    // var CK_LOOP_MP;
    function CK_load() {
        if (CK_addBtn()) clearInterval(window.CK_LOOP_MP);
    }
    setTimeout(function () {
        window.CK_LOOP_MP = setInterval(function () {
            CK_load()
        }, 1000);
    }, 3000);
    if(!window.CK_SoftMode) CK_restoreRemeberedStyles();
    if(window.CK_ApplyStylePatch) CK_applyMiniPlayerPatch();
})();