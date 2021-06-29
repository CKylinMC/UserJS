// ==UserScript==
// @name         [Bilibili] 视频旋转
// @namespace    ckylin-script-bilibili-rotate
// @version      0.8
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

    class EventEmitter {
        handlers = {};

        on(name, func) {
            if (!(func instanceof Function)) throw "Param must be func!";
            if (!(name in this.handlers)) {
                this.handlers[name] = [];
            }
            this.handlers[name].push(func);
        }

        off(name, func) {
            if (!(func instanceof Function)) throw "Param must be func!";
            if (name in this.handlers) {
                for (let i = 0; i < this.handlers[name].length; i++) {
                    if (this.handlers[name][i] === func) {
                        this.handlers[name].splice(i, 1);
                        i--;
                    }
                }
            }
        }

        emit(name, ...args) {
            if (name in this.handlers) {
                for (let func of this.handlers[name]) {
                    try {
                        func(...args);
                    } catch (e) {
                        console.error('ERROR:', e);
                    }
                }
            }
        }
    }

    class HoldClick {
        dom;
        emitter = new EventEmitter;
        downTime = 0;
        holdingTime = 250;
        mouseDown = false;

        constructor(dom, holdingTime = 250) {
            if (dom instanceof HTMLElement) {
                this.dom = dom;
                this.initListener();
            }
            this.holdingTime = holdingTime;
        }

        onclick(func) {
            this.emitter.on("click", func);
            return this;
        }

        onhold(func) {
            this.emitter.on("hold", func);
            return this;
        }

        onup(func) {
            this.emitter.on("up", func);
            return this;
        }

        offclick(func) {
            this.emitter.off("click", func);
            return this;
        }

        offhold(func) {
            this.emitter.off("hold", func);
            return this;
        }

        offup(func) {
            this.emitter.off("up", func);
            return this;
        }

        handleMouseDown(e) {
            e.preventDefault();
            this.mouseDown = true;
            this.downTime = (new Date()).getTime();
            setTimeout(() => {
                if (this.mouseDown) {
                    console.log(this);
                    this.mouseDown = false;
                    this.downTime = 0;
                    this.emitter.emit("hold", e);
                }
            }, this.holdingTime)
        }

        handleMouseUp(e) {
            e.preventDefault();
            if (this.mouseDown) {
                this.mouseDown = false;
                const currTime = (new Date).getTime();
                if ((currTime - this.downTime) >= this.holdingTime) {
                    this.emitter.emit("hold", e);
                } else {
                    this.emitter.emit("click", e);
                }
                this.downTime = 0;
            }
            this.emitter.emit("up", e);
        }

        handleMouseOut(e) {
            e.preventDefault();
            if (this.mouseDown) {
                this.mouseDown = false;
                this.downTime = 0;
                this.emitter.emit("click", e);
            }
        }

        initListener() {
            this.dom.addEventListener("mouseup", this.handleMouseUp.bind(this))
            this.dom.addEventListener("mousedown", this.handleMouseDown.bind(this))
            this.dom.addEventListener("mouseout", this.handleMouseOut.bind(this))
        }
    }

    const dragger = {
        defaultHandler: (val) => console.log("DRAG:", val),
        waitForDragger: async (waitStatus = true) => {
            while (dragger.dragging !== waitStatus) await wait(10);
            return dragger;
        },
        regHandler: async (func) => {
            if (!(func instanceof Function)) throw "Param must be a func!";
            await dragger.waitForDragger(false);
            dragger.handler = func;
            return dragger;
        },
        handler: () => {
        },
        dragging: false,
        initialDragData: {
            x: 0,
            y: 0
        },
        lastDragData: {
            x: 0,
            y: 0
        },
        startDrag: (e) => {
            if (dragger.dragging) return;
            dragger.dragging = true;
            console.log(dragger.initialDragData);
            dragger.initialDragData.x = e.screenX;
            dragger.initialDragData.y = e.screenY;
            dragger.lastDragData.x = e.screenX;
            dragger.lastDragData.y = e.screenY;
            document.body.addEventListener("mouseup", dragger.stopDrag);
            document.body.addEventListener("mousemove", dragger.handleDrag);
            console.info("DRAG:", "Start Drag");
            return dragger;
        },
        handleDrag: (e) => {
            const currPos = {
                x: e.screenX,
                y: e.screenY
            };
            const initPos = dragger.initialDragData;
            const delta = {
                x: initPos.x - currPos.x,
                y: initPos.y - currPos.y
            }
            const lastdelta = {
                x: dragger.lastDragData.x - currPos.x,
                y: dragger.lastDragData.y - currPos.y
            }
            dragger.lastDragData = currPos;
            dragger.handler(delta, lastdelta);
        },
        stopDrag: () => {
            document.body.removeEventListener("mouseup", dragger.stopDrag);
            document.body.removeEventListener("mousemove", dragger.handleDrag);
            dragger.handler = dragger.defaultHandler;
            console.info("DRAG:", "Stop Drag");
            dragger.dragging = false;
            return dragger;
        },
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

    function setEffects(name, value, wait = false) {
        delEffect(name, true);
        addEffects(name, value, wait);
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
        if (className !== "CKROTATE") clearStyles(className);
        let style = document.createElement("style");
        style.classList.add(className);
        style.innerHTML = s;
        document.body.appendChild(style);
    }

    function setR(val = 0) {
        setEffects("rotate", val);
    }

    function leftR(val = 90) {
        addEffects("rotate", val * -1);
    }

    function rightR(val = 90) {
        //debug
        //alert("rightR");
        addEffects("rotate", val);
    }

    function upR() {
        addEffects("rotate", 180);
    }

    function cR() {
        delEffect("rotate");
    }

    function setZ(val = 0) {
        setEffects("scale", val);
    }

    function zoomIn(val = 0.1) {
        addEffects("scale", val * -1);
    }

    function zoomOut(val = 0.1) {
        addEffects("scale", val);
    }

    function cZ() {
        delEffect("scale");
    }

    function setMY(val = 0) {
        setEffects("translateY", val);
    }

    function moveUp(val = 10) {
        addEffects("translateY", val * -1);
    }

    function moveDown(val = 10) {
        addEffects("translateY", val);
    }

    function setMX(val = 0) {
        setEffects("translateX", val);
    }

    function setPos(x, y) {
        setEffects("translateX", x, true);
        setEffects("translateY", y);
    }

    function movePos(x, y) {
        addEffects("translateX", x, true);
        addEffects("translateY", y);
    }

    function moveLeft(val = 10) {
        addEffects("translateX", val * -1);
    }

    function moveRight(val = 10) {
        addEffects("translateX", val);
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
    function makeButton(icon, contents, color) {
        let ico = document.createElement("i");
        ico.classList.add("mdi", "mdi-18px", "mdi-" + icon);
        if (color) ico.style.color = color;
        let btn = document.createElement("div");
        btn.classList.add("ckrotate-btn");
        // btn.innerHTML = contents;
        btn.appendChild(ico);
        btn.setAttribute("data-btnname", contents);
        return btn
    }

    function injectButtons() {
        document.head.innerHTML += `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@5.9.55/css/materialdesignicons.min.css"/>`
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
        `, "CKRotateBtnsStyle");
        const togglePanel = show => {
            const btn = document.querySelector("#ckrotate-hidden-btn");
            const panel = document.querySelector("#ckrotate-btn-base");
            if (show) {
                btn.className = "hide";
                panel.className = "show";
            } else {
                btn.className = "show";
                panel.className = "hide";
            }
        };
        const toggle = document.createElement("div");
        toggle.id = "ckrotate-hidden-btn";
        toggle.innerHTML = `<i class="mdi mdi-18px mdi-chevron-right"></i>`;
        toggle.onclick = () => togglePanel(true);
        const btnRoot = document.createElement("div");
        btnRoot.id = "ckrotate-btn-base";
        btnRoot.classList.add("hide");
        let toggleBtn = makeButton("chevron-left", "隐藏");
        toggleBtn.onclick = () => togglePanel(false);
        btnRoot.appendChild(toggleBtn);
        let LRBtn = makeButton("rotate-left", "左转90", "orange");
        new HoldClick(LRBtn)
            .onclick(() => {
                leftR();
            })
            .onhold(async (e) => {
                disableAnim();
                await (await dragger.regHandler((delta, lastdelta) => leftR(lastdelta.y))).startDrag(e).waitForDragger(false).then(() => enableAnim());
            })
        // LRBtn.onclick = function () {
        //     leftR();
        // };
        // LRBtn.oncontextmenu = async function (e){
        //     e.preventDefault();
        //     disableAnim();
        //     await (await dragger.regHandler(delta => {
        //         setR(delta.y*-1);
        //     })).startDrag(e);
        //     enableAnim();
        // };
        btnRoot.appendChild(LRBtn);
        let RRBtn = makeButton("rotate-right", "右转90", "orange");
        new HoldClick(RRBtn)
            .onclick(() => {
                rightR();
            })
            .onhold(async (e) => {
                disableAnim();
                await (await dragger.regHandler((delta, lastdelta) => rightR(lastdelta.y))).startDrag(e).waitForDragger(false).then(() => enableAnim());
            })
        // RRBtn.onclick = function () {
        //     rightR();
        // };
        // RRBtn.oncontextmenu = async function (e){
        //     e.preventDefault();
        //     disableAnim();
        //     await (await dragger.regHandler(delta => {
        //         setR(delta.y);
        //     })).startDrag(e);
        //     enableAnim();
        // };
        btnRoot.appendChild(RRBtn);
        let RVBtn = makeButton("rotate-3d-variant", "翻转", "orange");
        RVBtn.onclick = function () {
            upR();
        };
        btnRoot.appendChild(RVBtn);
        let SLRBtn = makeButton("undo", "智能左转", "yellow");
        SLRBtn.onclick = function () {
            smartLR();
        };
        btnRoot.appendChild(SLRBtn);
        let SRRBtn = makeButton("redo", "智能右转", "yellow");
        SRRBtn.onclick = function () {
            smartRR();
        };
        btnRoot.appendChild(SRRBtn);
        let ZIBtn = makeButton("arrow-expand-all", "放大", "cadetblue");
        new HoldClick(ZIBtn)
            .onclick(() => {
                zoomIn();
            })
            .onhold(async (e) => {
                disableAnim();
                await (await dragger.regHandler((delta, lastdelta) => zoomIn(lastdelta.y * 0.01))).startDrag(e).waitForDragger(false).then(() => enableAnim());
            })
        // ZOBtn.onclick = function () {
        //     zoomIn();
        // };
        btnRoot.appendChild(ZIBtn);
        let ZOBtn = makeButton("arrow-collapse-all", "缩小", "cadetblue");
        new HoldClick(ZOBtn)
            .onclick(() => {
                zoomOut();
            })
            .onhold(async (e) => {
                disableAnim();
                await (await dragger.regHandler((delta, lastdelta) => zoomOut(lastdelta.y * 0.01))).startDrag(e).waitForDragger(false).then(() => enableAnim());
            })
        // ZIBtn.onclick = function () {
        //     zoomOut();
        // };
        btnRoot.appendChild(ZOBtn);
        let MUBtn = makeButton("pan-up", "上移", "forestgreen");
        new HoldClick(MUBtn)
            .onclick(() => {
                moveUp();
            })
            .onhold(async (e) => {
                disableAnim();
                await (await dragger.regHandler((delta, lastdelta) => movePos(lastdelta.x*-1, lastdelta.y*-1))).startDrag(e).waitForDragger(false).then(() => enableAnim());
            })
        // MUBtn.onclick = function () {
        //     moveUp();
        // };
        btnRoot.appendChild(MUBtn);
        let MDBtn = makeButton("pan-down", "下移", "forestgreen");
        new HoldClick(MDBtn)
            .onclick(() => {
                moveDown();
            })
            .onhold(async (e) => {
                disableAnim();
                await (await dragger.regHandler((delta, lastdelta) => movePos(lastdelta.x*-1, lastdelta.y*-1))).startDrag(e).waitForDragger(false).then(() => enableAnim());
            })
        // MDBtn.onclick = function () {
        //     moveDown();
        // };
        btnRoot.appendChild(MDBtn);
        let MLBtn = makeButton("pan-left", "左移", "forestgreen");
        new HoldClick(MLBtn)
            .onclick(() => {
                moveLeft();
            })
            .onhold(async (e) => {
                disableAnim();
                await (await dragger.regHandler((delta, lastdelta) => movePos(lastdelta.x*-1, lastdelta.y*-1))).startDrag(e).waitForDragger(false).then(() => enableAnim());
            })
        // MLBtn.onclick = function () {
        //     moveLeft();
        // };
        btnRoot.appendChild(MLBtn);
        let MRBtn = makeButton("pan-right", "右移", "forestgreen");
        new HoldClick(MRBtn)
            .onclick(() => {
                moveRight();
            })
            .onhold(async (e) => {
                disableAnim();
                await (await dragger.regHandler((delta, lastdelta) => movePos(lastdelta.x*-1, lastdelta.y*-1))).startDrag(e).waitForDragger(false).then(() => enableAnim());
            })
        // MRBtn.onclick = function () {
        //     moveRight();
        // };
        btnRoot.appendChild(MRBtn);
        let CRBtn = makeButton("backup-restore", "清除旋转", "orange");
        CRBtn.onclick = function () {
            cR();
        };
        btnRoot.appendChild(CRBtn);
        let CZBtn = makeButton("magnify-remove-outline", "清除缩放", "cadetblue");
        CZBtn.onclick = function () {
            cZ();
        };
        btnRoot.appendChild(CZBtn);
        let CMBtn = makeButton("pan", "清除位移", "forestgreen");
        CMBtn.onclick = function () {
            cM();
        };
        btnRoot.appendChild(CMBtn);
        let RSBtn = makeButton("close-circle-outline", "重置", "orangered");
        RSBtn.onclick = function () {
            cleanEffects();
            clearStyles();
        };
        btnRoot.appendChild(RSBtn);
        document.body.appendChild(toggle);
        document.body.appendChild(btnRoot);
    }

    function enableAnim() {
        addStyle(".bilibili-player-video video{transition: transform cubic-bezier(0.61, 0.01, 0.44, 0.93) .5s;}", "CKANIMATION");
    }

    function disableAnim() {
        clearStyles("CKANIMATION");
    }

    async function startInject() {
        enableAnim();
        bindKeys();
        videoDetect();
        while (!(await playerReady())) await wait(100);
        injectButtons();
    }

    startInject();
})();