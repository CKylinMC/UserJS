// ==UserScript==
// @name         哔哩哔哩-评论过滤
// @namespace    ckylin-bilibili-comments-filter
// @version      1.0
// @description  过滤指定用户或关键词
// @author       CKylinMC
// @include      *.bilibili.com/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.info
// @grant        GM.registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/jquery@3.4.0/dist/jquery.min.js
// @license      GPLv3 License
// ==/UserScript==
GM_registerMenuCommand("添加屏蔽的用户ID", () => {
    CK_askForNewBlockedUID();
});
GM_registerMenuCommand("移除屏蔽的用户ID", () => {
    CK_askForDelBlockedUID();
    alert("刷新生效");
});
GM_registerMenuCommand("添加屏蔽的关键词", () => {
    CK_askForNewBlockedWord();
});
GM_registerMenuCommand("移除屏蔽的关键词", () => {
    CK_askForDelBlockedWord();
    alert("刷新生效");
});
GM_registerMenuCommand("显示所有屏蔽", () => {
    CK_showAllBlocked();
});
GM_registerMenuCommand("重置", () => {
    CK_initBlockedValues(true);
    alert("刷新生效");
});
window.ck_block_comments_data = {
    uselocal: true,
    uids: [],
    words: []
};
async function CK_initBlockedValues(forcereset = false) {
    if (window.ck_block_comments_data.uselocal) return;
    var UIDS = await GM.getValue("ck_blocked_uids");
    if (UIDS == undefined || forcereset) UIDS = [];
    window.ck_block_comments_data.uids = UIDS;
    var WORDS = await GM.getValue("ck_blocked_words");
    if (WORDS == undefined || forcereset) WORDS = [];
    window.ck_block_comments_data.words = WORDS;
    CK_saveBlockedData();
}
async function CK_saveBlockedData() {
    GM.setValue("ck_blocked_uids", window.ck_block_comments_data.uids);
    GM.setValue("ck_blocked_words", window.ck_block_comments_data.words);
}

function CK_isEmpty(val) {
    if (val == undefined) return true;
    if (val == null) return true;
    if (val.length == 0) return true;
    return false;
}

function CK_askForNewBlockedUID() {
    var blocked = prompt("添加要屏蔽的用户ID");
    if (!CK_isEmpty(blocked)) {
        CK_addNewBlockedUID(blocked);
    }
}

function CK_askForDelBlockedUID() {
    var blocked = prompt("输入要取消屏蔽的用户ID");
    if (!CK_isEmpty(blocked)) {
        CK_delBlockedUID(blocked);
    }
}

function CK_askForNewBlockedWord() {
    var blocked = prompt("添加要屏蔽的关键词");
    if (!CK_isEmpty(blocked)) {
        CK_addNewBlockedWord(blocked);
    }
}

function CK_askForDelBlockedWord() {
    var blocked = prompt("输入要取消屏蔽的关键词");
    if (!CK_isEmpty(blocked)) {
        CK_delBlockedWord(blocked);
    }
}

function CK_showAllBlocked() {
    var uids = CK_getAllBlockedUID();
    var words = CK_getAllBlockedWord();
    var content = "被屏蔽的UID:\n";
    content += uids.join("\n")
    content += "\n被屏蔽的关键字:\n";
    content += words.join("\n");
    alert(content);
}

function CK_addNewBlockedUID(UID) {
    window.ck_block_comments_data.uids.push(UID);
    CK_saveBlockedData();
}

function CK_delBlockedUID(UID) {
    if (window.ck_block_comments_data.uids.contains(UID)) {
        window.ck_block_comments_data.uids.remove(UID);
        CK_saveBlockedData();
    }
}

function CK_getAllBlockedUID() {
    return window.ck_block_comments_data.uids;
}

function CK_addNewBlockedWord(word) {
    window.ck_block_comments_data.words.push(word);
    CK_saveBlockedData();
}

function CK_delBlockedWord(word) {
    if (window.ck_block_comments_data.words.contains(word)) {
        window.ck_block_comments_data.words.remove(word);
        CK_saveBlockedData();
    }
}

function CK_getAllBlockedWord() {
    return window.ck_block_comments_data.words;
}

function CK_removeAllBlockedComments() {
    if (jQuery) {
        var UIDs = CK_getAllBlockedUID();
        UIDs.forEach(e => {
            jQuery("[data-usercard-mid='" + e + "']").parents(".reply-wrap").remove();
        });
        var words = CK_getAllBlockedWord();
        words.forEach(e => {
            jQuery(".reply-wrap p:contains('" + e + "')").parents(".reply-wrap").remove()
            jQuery(".reply-wrap span:contains('" + e + "')").parents(".reply-wrap").remove()
        });
    }
}

function CK_startLookingForBlockedComments() {
    CK_initBlockedValues();
    if ('blockedcommentaddon' in window) {
        return;
    }
    window.blockedcommentaddon = true;
    setInterval(() => {
        CK_removeAllBlockedComments();
    }, 2000);
}
jQuery(() => {
    CK_startLookingForBlockedComments()
});