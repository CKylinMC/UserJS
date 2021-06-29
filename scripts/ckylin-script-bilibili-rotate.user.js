// ==UserScript==
// @name         [Bilibili] 视频旋转
// @namespace    ckylin-script-bilibili-rotate
// @version      0.4
// @description  旋转和缩放视频，防止某些视频伤害到你的脖子或眼睛！
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @include      http*://www.bilibili.com/medialist/play/*
// @include      http*://www.bilibili.com/bangumi/play/*
// @include      http*://bangumi.bilibili.com/anime/*/play*
// @include      http*://bangumi.bilibili.com/movie/*
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        unsafeWindow
// @license      GPLv3 License
// ==/UserScript==

(function () {
    'use strict';
    let effects = [];
    const wait = (t) => {
        return new Promise(r => setTimeout(r, t));
    }

    async function playerReady() {
        let i = 50;
        while (--i >= 0) {
            await wait(100);
            if (!('player' in unsafeWindow)) continue;
            if (!('isInitialized' in unsafeWindow.player)) continue;
            if (!unsafeWindow.player.isInitialized()) continue;
            return true;
        }
        return false;
    }

    function bindKeys() {
        unsafeWindow.addEventListener("keypress", e => {
            if (e.key == "Q") {
                if (!e.shiftKey) return;
                if (["INPUT", "TEXTARREA"].includes(e.target.tagName)) return;
                leftR();
                e.preventDefault();
            } else if (e.key == "E") {
                if (!e.shiftKey) return;
                if (["INPUT", "TEXTARREA"].includes(e.target.tagName)) return;
                rightR();
                e.preventDefault();
            } else if (e.key == "A") {
                if (!e.shiftKey) return;
                if (["INPUT", "TEXTARREA"].includes(e.target.tagName)) return;
                smartLR();
                e.preventDefault();
            } else if (e.key == "D") {
                if (!e.shiftKey) return;
                if (["INPUT", "TEXTARREA"].includes(e.target.tagName)) return;
                smartRR();
                e.preventDefault();
            } else if (e.key == "R") {
                if (!e.shiftKey) return;
                if (["INPUT", "TEXTARREA"].includes(e.target.tagName)) return;
                cleanEffects();
                clearStyles();
                e.preventDefault();
            } else if (e.key == "+") {
                if (!e.shiftKey) return;
                if (["INPUT", "TEXTARREA"].includes(e.target.tagName)) return;
                zoomIn();
                e.preventDefault();
            } else if (e.key == "-") {
                if (!e.shiftKey) return;
                if (["INPUT", "TEXTARREA"].includes(e.target.tagName)) return;
                zoomOut();
                e.preventDefault();
            }
        });
    }

    function addEffects(name, value, wait = false) {
        let effect = effects.filter(e => e.name == name);
        if (effect.length) {
            effect[0].value += value;
        } else {
            effects.push({name, value});
        }
        if (!wait) applyEffects();
    }

    function delEffect(name, wait = false) {
        effects.forEach((e, i) => {
            if (e.name == name)
                effects.splice(i, 1);
        })
        if (!wait) applyEffects();
    }

    function applyEffects() {
        let style = ".bilibili-player-video video { transform: ";
        effects.forEach(e => {
            let key = e.name;
            let value = e.value + "";
            switch (key) {
                case "rotate":
                    value += "deg";
                    break;
                case "translateY":
                case "translateX":
                    value += "px";
                    break;
                case "scale":
                    value = (1 - e.value) + "";
                    break;
            }
            style += ` ${key}(${value})`;
        });
        style += "}";
        console.log(style);
        clearStyles();
        addStyle(style);
    }

    function cleanEffects() {
        effects = [];
    }

    function clearStyles(className = "CKROTATE") {
        let dom = document.querySelectorAll("style." + className);
        if (dom) [...dom].forEach(e => e.remove());
    }

    function addStyle(s, className = "CKROTATE") {
        let style = document.createElement("style");
        style.classList.add(className);
        style.innerHTML = s;
        document.body.appendChild(style);
    }

    function leftR() {
        addEffects("rotate", -90);
    }

    function rightR() {
        //debug
        //alert("rightR");
        addEffects("rotate", 90);
    }

    function upR() {
        addEffects("rotate", 180);
    }

    function cR() {
        delEffect("rotate");
    }

    function zoomIn() {
        addEffects("scale", -0.1);
    }

    function zoomOut() {
        addEffects("scale", 0.1);
    }

    function cZ() {
        delEffect("scale");
    }

    function moveUp() {
        addEffects("translateY", -10);
    }

    function moveDown() {
        addEffects("translateY", 10);
    }

    function moveLeft() {
        addEffects("translateX", -10);
    }

    function moveRight() {
        addEffects("translateX", 10);
    }

    function cM() {
        delEffect("translateX");
        delEffect("translateY");
    }

    function smartLR() {
        let dom = document.querySelector(".bilibili-player-video video");
        if (!dom) return;
        let w = dom.videoWidth;
        let h = dom.videoHeight;
        let s = h / w;
        clearStyles();
        cleanEffects();
        addEffects("rotate", -90, true);
        addEffects("scale", 1 - s);
    }

    function smartRR() {
        let dom = document.querySelector(".bilibili-player-video video");
        if (!dom) return;
        let w = dom.videoWidth;
        let h = dom.videoHeight;
        let s = h / w;
        clearStyles();
        cleanEffects();
        addEffects("rotate", 90, true);
        addEffects("scale", 1 - s);
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
        setTimeout(closeTip, 10000);
    }

    function closeTip() {
        const toast = document.querySelector("#CKToast");
        if (toast) {
            toast.style.animation = null;
            toast.style.animation = "CKToastOut cubic-bezier(0.93, -0.32, 1, 1) .5s forwards";
            setTimeout(() => toast.remove(), 500);
        }
    }

    async function videoDetect() {
        if (!(await playerReady())) return;
        let dom = document.querySelector(".bilibili-player-video video");
        if (!dom) return;
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

    GM_registerMenuCommand("向上", () => {
        moveUp();
    });

    GM_registerMenuCommand("向下", () => {
        moveDown();
    });

    GM_registerMenuCommand("向左", () => {
        moveLeft();
    });

    GM_registerMenuCommand("向右", () => {
        moveRight();
    });

    GM_registerMenuCommand("清除旋转", () => {
        cR();
    });

    GM_registerMenuCommand("清除缩放", () => {
        cZ();
    });

    GM_registerMenuCommand("清除位移", () => {
        cM();
    });

    GM_registerMenuCommand("重置", () => {
        cleanEffects();
        clearStyles();
    });

    /* Thanks for yoringboy's contributings! */
    function makeButton(icon,contents,color) {
        document.head.innerHTML+=`<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@5.9.55/css/materialdesignicons.min.css"/>`
        let ico = document.createElement("i");
        ico.classList.add("mdi","mdi-18px","mdi-"+icon);
        if(color) ico.style.color = color;
        let btn = document.createElement("div");
        btn.classList.add("ckrotate-btn");
        // btn.innerHTML = contents;
        btn.appendChild(ico);
        btn.setAttribute("data-btnname",contents);
        return btn
    }
    function injectButtons(){
        addStyle(`
        #ckrotate-hidden-btn{
            position: fixed;
            left: -15px;
            width: 30px;
            height: 30px;
            background: black;
            opacity: 0.75;
            color: white;
            cursor: pointer;
            border-radius: 50%;
            text-align: right;
            line-height: 30px;
            transition: all .3s;
            top: 120px;
            top: 30vh;
        }
        #ckrotate-hidden-btn:hover{
            background: white;
            color: black;
        }
        #ckrotate-hidden-btn.hide{
            left: -40px;
        }
        #ckrotate-btn-base{
            position: fixed;
            top: 55px;
            left: 20px;
            width: 110px;
            height: 450px;
            opacity: 0.75;
            background: black;
            color: white;
            text-align: center;
            cursor: pointer;
            flex: 1;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            flex-wrap: wrap;
            align-content: stretch;
            justify-content: space-between;
            align-items: center;
            max-height: 90vh;
            transition: all .3s;
        }
        #ckrotate-btn-base.hide{
            left: -120px;
            opacity: 0;
        }
        #ckrotate-btn-base .ckrotate-btn{
            display: flex;
            width: 55px;
            flex-flow: column;
            min-height: 55px;
            flex-wrap: nowrap;
            align-content: center;
            justify-content: center;
            align-items: center;
            transition: all .3s;
            border-radius: 8px;
            background: black;
        }
        #ckrotate-btn-base .ckrotate-btn:hover{
            background: white;
            color: transparent;
        }
        #ckrotate-btn-base .ckrotate-btn:hover>*{
            opacity: 0;
        }
        #ckrotate-btn-base .ckrotate-btn:hover::after{
            color: black;
            content: attr(data-btnname);
            transform: translateY(-80%);
        }
        `,"CKRotateBtnsStyle");
        const togglePanel = show=>{
            const btn = document.querySelector("#ckrotate-hidden-btn");
            const panel = document.querySelector("#ckrotate-btn-base");
            if(show){
                btn.className = "hide";
                panel.className = "show";
            }else{
                btn.className = "show";
                panel.className = "hide";
            }
        };
        const toggle = document.createElement("div");
        toggle.id="ckrotate-hidden-btn";
        toggle.innerHTML = `<i class="mdi mdi-18px mdi-chevron-right"></i>`;
        toggle.onclick = ()=>togglePanel(true);
        const btnRoot = document.createElement("div");
        btnRoot.id="ckrotate-btn-base";
        btnRoot.classList.add("hide");
        let toggleBtn = makeButton("chevron-left","隐藏");
        toggleBtn.onclick = ()=>togglePanel(false);
        btnRoot.appendChild(toggleBtn);
        let LRBtn = makeButton("rotate-left","左转90","orange");
        LRBtn.onclick = function () {
            leftR();
        };
        btnRoot.appendChild(LRBtn);
        let RRBtn = makeButton("rotate-right","右转90","orange");
        RRBtn.onclick = function () {
            rightR();
        };
        btnRoot.appendChild(RRBtn);
        let RVBtn = makeButton("rotate-3d-variant","翻转","orange");
        RVBtn.onclick = function () {
            upR();
        };
        btnRoot.appendChild(RVBtn);
        let SLRBtn = makeButton("undo","智能左转","yellow");
        SLRBtn.onclick = function () {
            smartLR();
        };
        btnRoot.appendChild(SLRBtn);
        let SRRBtn = makeButton("redo","智能右转","yellow");
        SRRBtn.onclick = function () {
            smartRR();
        };
        btnRoot.appendChild(SRRBtn);
        let ZOBtn = makeButton("arrow-expand-all","放大","cadetblue");
        ZOBtn.onclick = function () {
            zoomIn();
        };
        btnRoot.appendChild(ZOBtn);
        let ZIBtn = makeButton("arrow-collapse-all","缩小","cadetblue");
        ZIBtn.onclick = function () {
            zoomOut();
        };
        btnRoot.appendChild(ZIBtn);
        let MUBtn = makeButton("pan-up","上移","forestgreen");
        MUBtn.onclick = function () {
            moveUp();
        };
        btnRoot.appendChild(MUBtn);
        let MDBtn = makeButton("pan-down","下移","forestgreen");
        MDBtn.onclick = function () {
            moveDown();
        };
        btnRoot.appendChild(MDBtn);
        let MLBtn = makeButton("pan-left","左移","forestgreen");
        MLBtn.onclick = function () {
            moveLeft();
        };
        btnRoot.appendChild(MLBtn);
        let MRBtn = makeButton("pan-right","右移","forestgreen");
        MRBtn.onclick = function () {
            moveRight();
        };
        btnRoot.appendChild(MRBtn);
        let CRBtn = makeButton("backup-restore","清除旋转","orange");
        CRBtn.onclick = function () {
            cR();
        };
        btnRoot.appendChild(CRBtn);
        let CZBtn = makeButton("magnify-remove-outline","清除缩放","cadetblue");
        CZBtn.onclick = function () {
            cZ();
        };
        btnRoot.appendChild(CZBtn);
        let CMBtn = makeButton("pan","清除位移","forestgreen");
        CMBtn.onclick = function () {
            cM();
        };
        btnRoot.appendChild(CMBtn);
        let RSBtn = makeButton("close-circle-outline","重置","orangered");
        RSBtn.onclick = function () {
            cleanEffects();
            clearStyles();
        };
        btnRoot.appendChild(RSBtn);
        document.body.appendChild(toggle);
        document.body.appendChild(btnRoot);
    }

    addStyle(".bilibili-player-video video{transition: transform cubic-bezier(0.61, 0.01, 0.44, 0.93) .5s;}", "CKANIMATION");
    bindKeys();
    injectButtons();
    videoDetect();
})();