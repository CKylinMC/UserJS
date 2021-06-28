// ==UserScript==
// @name         CKAutoLoader
// @namespace    blbljsloader.ckylin.site
// @version      0.2
// @author       CKylinMC
// @grant        unsafeWindow
// @license      GPLv3 License
// ==/UserScript==
if (!window.CKAutoLoader) {
    window.CKAutoLoader = {
        loaded: false,
        inited: false,
        loader_Started: false,
        commentDetecterTriggered: false,
        cblist: {},
        retry_count: 50,
        playerLoadedEvent: null,
        commentLoadedEvent: null,
        start: function () {
            if (!window.CKAutoLoader.loader_Started) {
                window.CKAutoLoader.loader();
            }
        },
        initEvent: function () {
            if (window.CKAutoLoader.inited) return;
            if (window.CKAutoLoader.playerLoadedEvent != null) return;
            window.CKAutoLoader.playerLoadedEvent = new Event("ckBilibiliPlayerLoaded");
            window.CKAutoLoader.commentLoadedEvent = new Event("ckBilibiliCommentLoaded");
        },
        reg: function (name, callback) {
            if (window.CKAutoLoader.loaded) {
                if (callback instanceof Function) {
                    callback();
                }
                return;
            }
            window.CKAutoLoader.cblist[name] = callback;
            window.CKAutoLoader.start();
        },
        canInject: function () {
            //参考pakku的检测加载机制
            let blplayer = document.querySelector("div.bilibili-player");
            if (blplayer && !blplayer.querySelector(".bilibili-player-auxiliary-area")) {
                blplayer = blplayer.closest("body");
            }
            if (blplayer) {
                var list_elem = blplayer.querySelector(".bilibili-player-danmaku, .player-auxiliary-danmaku-wrap")
            }
            if (!blplayer || !list_elem) {
                return false;
            }
            return true;
        },
        startCommentDetecter: function () {
            if (window.CKAutoLoader.commentDetecterTriggered) return;
            window.CKAutoLoader.commentDetecterTriggered = true;
            window.CKAutoLoader.commentDetecter();
        },
        commentDetecter: function () {
            let commentElement = document.querySelector("#comment");
            if (!commentElement) return;
            if (commentElement.hasAttribute("scrollshow") &&
                commentElement.getAttribute("scrollshow") == "true") {
                window.dispatchEvent(window.CKAutoLoader.commentLoadedEvent);
            } else {
                setTimeout(() => {
                    window.CKAutoLoader.commentDetecter()
                }, 1000);
            }
        },
        loader: function () {
            window.CKAutoLoader.initEvent();
            window.CKAutoLoader.loader_Started = true;
            window.CKAutoLoader.startCommentDetecter();
            console.log("CKAutoLoader: try inject...");
            if (!window.CKAutoLoader.canInject()) {
                if (window.CKAutoLoader.retry_count == undefined || --window.CKAutoLoader.retry_count <= 0) {
                    console.error("CKAutoLoader: Can NOT inject scripts.");
                    return;
                }
                setTimeout(function () {
                    window.CKAutoLoader.loader()
                }, 200);
                return;
            }
            window.dispatchEvent(window.CKAutoLoaderplayerLoadedEvent);
            window.CKAutoLoader.loaded = true;
            for (func in window.CKAutoLoader.cblist) {
                if (window.CKAutoLoader.cblist[func] instanceof Function) {
                    try {
                        window.CKAutoLoader.cblist[func]();
                    } catch (e) {
                        console.error("CKAutoLoader: Errored while call: " + func + e);
                    }
                } else {
                    console.error("CKAutoLoader: Can NOT call: " + func);
                }
            }
        },
    };
    window.CKAutoLoader.start();
}