// ==UserScript==
// @name         CKDragHelper
// @namespace    dragger.ckylin.site
// @version      0.1
// @author       CKylinMC
// @grant        unsafeWindow
// @license      GPLv3 License
// ==/UserScript==
if(!("wait" in window)){
    window.wait = (t) => {
        return new Promise(r => setTimeout(r, t));
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