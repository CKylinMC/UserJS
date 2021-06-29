// ==UserScript==
// @name         [Bilibili] 视频旋转
// @namespace    ckylin-script-bilibili-rotate
// @version      0.3
// @description  旋转和缩放视频，防止某些视频伤害到你的脖子或眼睛！
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @include     http*://www.bilibili.com/medialist/play/*
// @include     http*://www.bilibili.com/bangumi/play/*
// @include     http*://bangumi.bilibili.com/anime/*/play*
// @include     http*://bangumi.bilibili.com/movie/*
// @grant        GM_registerMenuCommand
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
                case "transformY":
                case "transformX":
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
        addEffects("transformY", -10);
    }

    function moveDown() {
        addEffects("transformY", 10);
    }

    function moveLeft() {
        addEffects("transformX", -10);
    }

    function moveRight() {
        addEffects("transformX", 10);
    }

    function cM() {
        delEffect("transformX");
        delEffect("transformY");
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


//------------------------------------------
    //https://blog.csdn.net/qq_41298974/article/details/108434838
    function func_button_1(var_param0, var_btn_name) {
        //一个是新元素，一个是body元素
        var mybutton, beasetag;
        //创建新元素
        mybutton = document.createElement("div");
        //搜寻body元素
        beasetag = document.querySelector("body");
        //将新元素作为子节点插入到body元素的最后一个子节点之后
        beasetag.appendChild(mybutton);
        //可以通过mybutton.innerHTML = "<button type='button'>启动</button><br><button type='button'>关闭</button>"来写入其他元素，如多个按钮
        //mybutton.innerHTML = "按钮";
        mybutton.innerHTML = var_btn_name;
        //css样式为
        //position:fixed;生成固定定位的元素，相对于浏览器窗口进行定位。元素的位置通过 "left", "top", "right" 以及 "bottom" 属性进行规定。
        //bottom:15px;距窗口底部15px
        //right:15px;距窗口右边15px
        //width:60px;内容的宽度60px
        //height:60px;内容的高度60px
        //background:black;内边距的颜色和内容的颜色设置为黑色，不包括外边距和边框
        //opacity:0.75;不透明度设置为0.75，1为完全不透明
        //color:white;指定文本的颜色为白色
        //text-align:center;指定元素文本的水平对齐方式为居中对齐
        //line-height:60px;设置行高，通过设置为等于该元素的内容高度的值，配合text-align:center;可以使div的文字居中
        //cursor:pointer;定义了鼠标指针放在一个元素边界范围内时所用的光标形状为一只手
        mybutton.style = var_param0
        // //通过匿名函数，设置点击该悬浮按钮后执行的函数
        // mybutton.onclick = function(){bindKeys22222();};
        return mybutton

    }

    //左转90
    //右转90
    //智能左转90
    //智能右转90
    //180°
    //放大
    //缩小
    //清除旋转
    //清除缩放
    //重置


    var ballStyle22 = "position:fixed;top:46px;left:5px;width:55px;height:55px;background:black;opacity:0.75;color:white;text-align:center;line-height:55px;cursor:pointer;";
    var ballStyle = ballStyle22;
    var mybutton = func_button_1(ballStyle, "左转90");
    mybutton.onclick = function () {
        leftR();
    };
    //------------------------------------------
    var step_value = 45;
    ballStyle = ballStyle22.replace("46", String(46 + step_value * 1));
    mybutton = func_button_1(ballStyle, "右转90");
    mybutton.onclick = function () {
        rightR();
    };
    //------------------------------------------
    ballStyle = ballStyle22.replace("46", String(46 + step_value * 2));
    mybutton = func_button_1(ballStyle, "智能左转90");
    mybutton.onclick = function () {
        smartLR();
    };
    //------------------------------------------

    ballStyle = ballStyle22.replace("46", String(46 + step_value * 3));
    mybutton = func_button_1(ballStyle, "智能右转90");
    mybutton.onclick = function () {
        smartRR();
    };
    //------------------------------------------
    ballStyle = ballStyle22.replace("46", String(46 + step_value * 4));
    mybutton = func_button_1(ballStyle, "180°");
    mybutton.onclick = function () {
        upR();
    };
    //------------------------------------------
    ballStyle = ballStyle22.replace("46", String(46 + step_value * 5));
    mybutton = func_button_1(ballStyle, "放大°");
    mybutton.onclick = function () {
        zoomIn();
    };
    //------------------------------------------
    ballStyle = ballStyle22.replace("46", String(46 + step_value * 6));
    mybutton = func_button_1(ballStyle, "缩小°");
    mybutton.onclick = function () {
        zoomOut();
    };
    //------------------------------------------
    ballStyle = ballStyle22.replace("46", String(46 + step_value * 7));
    mybutton = func_button_1(ballStyle, "清除旋转°");
    mybutton.onclick = function () {
        cR();
    };
    //------------------------------------------
    ballStyle = ballStyle22.replace("46", String(46 + step_value * 8));
    mybutton = func_button_1(ballStyle, "清除缩放°");
    mybutton.onclick = function () {
        cZ();
    };
    //------------------------------------------
    ballStyle = ballStyle22.replace("46", String(46 + step_value * 9));
    mybutton = func_button_1(ballStyle, "重置°");
    mybutton.onclick = function () {
        cleanEffects();
    };
    //------------------------------------------

    addStyle(".bilibili-player-video video{transition: transform cubic-bezier(0.61, 0.01, 0.44, 0.93) .5s;}", "CKANIMATION");
    bindKeys();
    videoDetect();
})();