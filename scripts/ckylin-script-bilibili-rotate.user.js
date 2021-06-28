// ==UserScript==
// @name         [Bilibili] 视频旋转
// @namespace    ckylin-script-bilibili-rotate
// @version      0.3
// @description  旋转和缩放视频，防止某些视频伤害到你的脖子或眼睛！
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @license      GPLv3 License
// ==/UserScript==

(function() {
    'use strict';
    let effects = [];
    const wait = (t) => { return new Promise(r => setTimeout(r, t)); }

    async function playerReady(){
        let i=50;
        while(--i>=0){
            await wait(100);
            if(!('player' in unsafeWindow)) continue;
            if(!('isInitialized' in unsafeWindow.player)) continue;
            if(!unsafeWindow.player.isInitialized()) continue;
            return true;
        }
        return false;
    }

    function bindKeys(){
        unsafeWindow.addEventListener("keypress", e=>{
            if(e.key=="Q"){
                if(!e.shiftKey)return;
                if(["INPUT","TEXTARREA"].includes(e.target.tagName))return;
                leftR();
                e.preventDefault();
            }else
            if(e.key=="E"){
                if(!e.shiftKey)return;
                if(["INPUT","TEXTARREA"].includes(e.target.tagName))return;
                rightR();
                e.preventDefault();
            }else
            if(e.key=="A"){
                if(!e.shiftKey)return;
                if(["INPUT","TEXTARREA"].includes(e.target.tagName))return;
                smartLR();
                e.preventDefault();
            }else
            if(e.key=="D"){
                if(!e.shiftKey)return;
                if(["INPUT","TEXTARREA"].includes(e.target.tagName))return;
                smartRR();
                e.preventDefault();
            }else
            if(e.key=="R"){
                if(!e.shiftKey)return;
                if(["INPUT","TEXTARREA"].includes(e.target.tagName))return;
                cleanEffects();
                clearStyles();
                e.preventDefault();
            }else
            if(e.key=="+"){
                if(!e.shiftKey)return;
                if(["INPUT","TEXTARREA"].includes(e.target.tagName))return;
                zoomIn();
                e.preventDefault();
            }else
            if(e.key=="-"){
                if(!e.shiftKey)return;
                if(["INPUT","TEXTARREA"].includes(e.target.tagName))return;
                zoomOut();
                e.preventDefault();
            }
        });
    }

    function addEffects(name,value,wait=false){
        let effect = effects.filter(e=>e.name==name);
        if(effect.length){
            effect[0].value+=value;
        }else{
            effects.push({name,value});
        }
        if(!wait)applyEffects();
    }

    function delEffect(name,wait=false){
        effects.forEach((e,i)=>{
            if(e.name==name)
                effects.splice(i,1);
        })
        if(!wait)applyEffects();
    }

    function applyEffects(){
        let style = ".bilibili-player-video video { transform: ";
        effects.forEach(e=>{
            let key = e.name;
            let value = e.value+"";
            switch(key){
                case "rotate":
                    value+="deg";
                    break;
                case "transformY":
                case "transformX":
                    value+="px";
                    break;
                case "scale":
                    value = (1-e.value)+"";
                    break;
            }
            style+=` ${key}(${value})`;
        });
        style+="}";
        console.log(style);
        clearStyles();
        addStyle(style);
    }

    function cleanEffects(){
        effects = [];
    }

    function clearStyles(className="CKROTATE"){
        let dom = document.querySelectorAll("style."+className);
        if(dom) [...dom].forEach(e=>e.remove());
    }

    function addStyle(s,className="CKROTATE"){
        let style = document.createElement("style");
        style.classList.add(className);
        style.innerHTML = s;
        document.body.appendChild(style);
    }

    function leftR(){
        addEffects("rotate",-90);
    }

    function rightR(){
        addEffects("rotate",90);
    }

    function upR(){
        addEffects("rotate",180);
    }

    function cR(){
        delEffect("rotate");
    }

    function zoomIn(){
        addEffects("scale",-0.1);
    }

    function zoomOut(){
        addEffects("scale",0.1);
    }

    function cZ(){
        delEffect("scale");
    }

    function moveUp(){
        addEffects("transformY",-10);
    }

    function moveDown(){
        addEffects("transformY",10);
    }

    function moveLeft(){
        addEffects("transformX",-10);
    }

    function moveRight(){
        addEffects("transformX",10);
    }

    function cM(){
        delEffect("transformX");
        delEffect("transformY");
    }

    function smartLR(){
        let dom = document.querySelector(".bilibili-player-video video");
        if(!dom) return;
        let w = dom.videoWidth;
        let h = dom.videoHeight;
        let s = h/w;
        clearStyles();
        cleanEffects();
        addEffects("rotate",-90,true);
        addEffects("scale",1-s);
    }

    function smartRR(){
        let dom = document.querySelector(".bilibili-player-video video");
        if(!dom) return;
        let w = dom.videoWidth;
        let h = dom.videoHeight;
        let s = h/w;
        clearStyles();
        cleanEffects();
        addEffects("rotate",90,true);
        addEffects("scale",1-s);
    }

    function showTip() {
        addStyle(`
            #CKToast{
                background: white;
                position: fixed;
                top: 80px;
                right: 20px;
                border-radius: 3px;
                border-left: solid 4px #2196f3;
                padding: 10px;
                color: black;
                font-size: large;
                overflow: hidden;
                word-break: all;
                animation: CKToastIn cubic-bezier(0, 0, 0, 1.18) .5s forwards;
            }
            .dark #CKToast{
                background: #424242;
                color: white;
            }
 
            #CKToast button{
                border: none;
                background: #2196f3;
                color:white;
                padding:3px 6px;
                display: inline-block;
                margin: 3px;
                border-radius: 3px;
                cursor:pointer;
                font-size: medium;
                transition: all .3s;
            }
            #CKToast button:hover{
                filter: brightness(.5);
            }
            .dark #CKToast button{
                background: #1976d2;
            }
            @keyframes CKToastIn{
                from{
                    right: -100%;
                }
            }
            @keyframes CKToastOut{
                to{
                    right: -100%;
                }
            }
        `, "CKToastUIStyles");
        const toast = document.createElement("div");
        toast.id = "CKToast";
        toast.innerHTML = "检测到视频可能需要旋转<br>";
        const left = document.createElement("button");
        left.innerHTML = "左转90°";
        left.onclick = () => {
            smartLR();
            closeTip();
        }
        toast.appendChild(left);
        const right = document.createElement("button");
        right.innerHTML = "右转90°";
        right.onclick = () => {
            smartRR();
            closeTip();
        }
        toast.appendChild(right);
        const close = document.createElement("button");
        close.innerHTML = "关闭";
        close.style.background = "#d81b60";
        close.onclick = () => {
            closeTip();
        }
        toast.appendChild(close);
        document.body.appendChild(toast);
        setTimeout(closeTip,10000);
    }

    function closeTip() {
        const toast = document.querySelector("#CKToast");
        if (toast) {
            toast.style.animation = null;
            toast.style.animation = "CKToastOut cubic-bezier(0.93, -0.32, 1, 1) .5s forwards";
            setTimeout(() => toast.remove(),500);
        }
    }

    async function videoDetect() {
        if (!(await playerReady())) return;
        let dom = document.querySelector(".bilibili-player-video video");
        if(!dom) return;
        let w = dom.videoWidth;
        let h = dom.videoHeight;
        if (h > w) {
            showTip();
        }
    }

    GM_registerMenuCommand("左转90", () => {
        leftR();
    });

    GM_registerMenuCommand("右转90°", () => {
        rightR();
    });

    GM_registerMenuCommand("智能左转90", () => {
        smartLR();
    });

    GM_registerMenuCommand("智能右转90°", () => {
        smartRR();
    });

    GM_registerMenuCommand("180°", () => {
        upR();
    });

    GM_registerMenuCommand("放大", () => {
        zoomIn();
    });

    GM_registerMenuCommand("缩小°", () => {
        zoomOut();
    });

    GM_registerMenuCommand("清除旋转", () => {
        cR();
    });

    GM_registerMenuCommand("清除缩放", () => {
        cZ();
    });

    GM_registerMenuCommand("重置", () => {
        cleanEffects();
        clearStyles();
    });
    addStyle(".bilibili-player-video video{transition: transform cubic-bezier(0.61, 0.01, 0.44, 0.93) .5s;}", "CKANIMATION");
    bindKeys();
    videoDetect();
})();