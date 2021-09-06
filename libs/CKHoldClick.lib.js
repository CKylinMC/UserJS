// ==UserScript==
// @name         CKHoldClick
// @namespace    holdclick.ckylin.site
// @version      0.2
// @author       CKylinMC
// @grant        unsafeWindow
// @license      GPLv3 License
// ==/UserScript==
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
        if(e.button!==0&&e.button!==1) return;
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
        if(e.button!==0&&e.button!==1) return;
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
