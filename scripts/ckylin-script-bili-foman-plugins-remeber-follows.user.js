// ==UserScript==
// @name         [Bilibili] 记住关注视频(FoMan插件)
// @namespace    ckylin-script-bili-foman-plugins-remeber-follows
// @version      0.1
// @description  记住你是因为哪个视频点的关注(FoMan的插件)
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @match        https://space.bilibili.com/*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @license      GPLv3
// ==/UserScript==

(function() {
    'use strict';
    const wait = ms=>new Promise(r=>setTimeout(r,ms));
    const get = (q,p=document)=>p.querySelector(q);
    // const getAll = (q,p=document)=>[...p.querySelectorAll(q)];
    const getAPI = (bvid) => fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid).then(raw => raw.json());
    // const getAidAPI = (aid) => fetch('https://api.bilibili.com/x/web-interface/view?aid=' + aid).then(raw => raw.json());
    const waitForDom = async (query,domparent=document,maxRetries=20,gagms=200)=>{
        let i = maxRetries;
        while(--i>0){
            if(get(query,domparent)) return true;
            await wait(gagms);
        }
        return false;
    };
    // const waitForAttribute = async (q, attr)=>{
    //     let i = 50;
    //     let value;
    //     while (--i >= 0) {
    //         if ((attr in q) &&
    //             q[attr] != null) {
    //             value = q[attr];
    //             break;
    //         }
    //         await wait(100);
    //     }
    //     return value;
    // }
    const cfg={
        followbtn:"#v_upinfo .follow-btn.b-gz",
        unfollowbtn: "ul.follow_dropdown"
    };
    /*
    persist
    "mid":[
        [0]: timestamp,
        [1]: string videoName (at that time),
        [2]: string videoID,
        [3]: string upName (at that time)
    ]
    */
    class FollowTrackManager{
        async followed(){
            const res = await getAPI(unsafeWindow.bvid);
            if(!res.code===0)return false;
            if(!res.data) return false;
            const timestamp = new Date().getTime();
            const videoId = unsafeWindow.bvid||res.data.bvid;
            const videoName = res.data.title||"";
            const upName = res.data.owner.name||"";
            const mid = res.data.owner.mid||0;
            GM_setValue(mid,[timestamp,videoName,videoId,upName]);
            console.log('FoMan: Remembered for this UP.');
        }

        async unfollowed(){
            const res = await getAPI(unsafeWindow.bvid);
            if(!res.code===0)return false;
            if(!res.data) return false;
            const mid = res.data.owner.mid||0;
            this.unfollow(mid);
        }

        async unfollow(mid){
            GM_setValue(mid,null);
            console.log('FoMan: Removed record for this UP.');
        }

        get(mid){
            const info = GM_getValue(mid);
            if(!info) return null;
            let [timestamp,videoName,videoId,upName] = info;
            return {timestamp,videoName,videoId,upName,mid};
        }
    }
    const man = new FollowTrackManager;

    async function onFollow(){
        console.debug("FoMan: triggered new following callback");
        man.followed();
        addUnfoListener();
    }

    async function onUnfollow(){
        console.debug("FoMan: triggered unfollowing callback");
        man.unfollowed();
    }

    async function clickHandler(e){
        const btn = get(cfg.followbtn);
        if(!btn) return;
        if(btn.classList.contains("not-follow")) return onFollow();
        else if(e.target.innerText.indexOf("取消关注")>-1) return onUnfollow();
        else console.warning("FoMan: 这啥？",e);
    }

    async function addUnfoListener(add=true){
        await waitForDom(cfg.unfollowbtn);
        const btn = get(cfg.unfollowbtn);
        if(!btn) return;
        btn.removeEventListener("mouseup",clickHandler);
        add&&btn.addEventListener("mouseup",clickHandler);
    }

    async function decideAddUnfoListener(){
        const btn = get(cfg.followbtn);
        if(!btn) return;
        if(btn.classList.contains("following")) {
            return addUnfoListener();
        }
    }

    async function registerEventsListener(){
        await waitForDom(cfg.followbtn);
        const btn = get(cfg.followbtn);
        btn.removeEventListener("mouseup",clickHandler);
        btn.addEventListener("mouseup",clickHandler);
        btn.removeEventListener("mouseenter",decideAddUnfoListener);
        btn.addEventListener("mouseenter",decideAddUnfoListener);
    }
    if(location.pathname.startsWith("/video/")){
        registerEventsListener();
    }
    if(!unsafeWindow.FoManPlugins){
        unsafeWindow.FoManPlugins = {}
    }
    unsafeWindow.FoManPlugins.RememberFollows = man
})();
