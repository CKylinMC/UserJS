// ==UserScript==
// @name         Bilibili UP Notes
// @name:zh-CN   哔哩哔哩UP主备注
// @namespace    ckylin-script-bilibili-up-notes
// @version      0.7.0
// @description  A simple script to add notes to Bilibili UPs.
// @description:zh-CN 一个可以给哔哩哔哩UP主添加备注的脚本。
// @author       CKylinMC
// @match        https://*.bilibili.com/*
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @license      Apache-2.0
// @run-at       document-end
// @icon         https://www.bilibili.com/favicon.ico
// @require https://update.greasyfork.org/scripts/564901/1749919/CKUI.js
// ==/UserScript==


(function (unsafeWindow, document) {
    
    // #region helpers
    if (typeof (GM_addStyle) === 'undefined') {
        unsafeWindow.GM_addStyle = function (css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }
    }
    const logger = {
        log(...args) {
            console.log('[BiliUPNotes]', ...args);
        },
        error(...args) {
            console.error('[BiliUPNotes]', ...args);
        },
        warn(...args) {
            console.warn('[BiliUPNotes]', ...args);
        },
    }
    const pages = {
        isPlayPage() {
            return unsafeWindow.location.pathname.startsWith('/video/')
                || unsafeWindow.location.pathname.startsWith('/list/');
        },
        isProfilePage() {
            return unsafeWindow.location.hostname.startsWith('space.bilibili.com');
        }
    }
    const runtime = {
        cardtaskId: null,
        uptaskId: null
    };
    const selectors = {
        markup: {
            symbolclass: '.ckupnotes-symbol',
            idclass: '.ckupnotes-identifier'
        },
        card: {
            root: 'div.bili-user-profile',
            avatar: 'picture.b-img__inner>img',
            avatarLink: 'a.bili-user-profile-view__avatar',
            infoRoot: 'div.bili-user-profile-view__info',
            userName: 'a.bili-user-profile-view__info__uname',
            bodyRoot: 'div.bili-user-profil1e__info__body',
            signBox: 'div.bili-user-profile-view__info__signature',
            footerRoot: 'div.bili-user-profile-view__info__footer',
            button: 'div.bili-user-profile-view__info__button'
        },
        cardModern: {
            shadowRoot: 'bili-user-profile',
            readyDom: 'div#view',
            avatarLink: 'a#avatar',
            avatar: 'img#face',
            bodyBox: 'div#body',
            userNameBox: 'div#title',
            userName: 'a#name',
            bodyRoot: 'div#content',
            signBox: 'div#sign',
            footerRoot: 'div#action',
        },
        userCard: {
            root: 'div.usercard-wrap',
            avatarLink: 'a.face',
            avatar: 'img.bili-avatar-img',
            bodyRoot: 'div.info',
            nameBox: 'div.user',
            userName: 'a.name',
            signBox: 'div.sign',
            footerRoot: 'div.btn-box'
        },
        play: {
            upInfoBox: 'div.up-info-container',
            upAvatar: 'img.bili-avatar-img',
            upAvatarLink: 'a.up-avatar',
            upDetailBox: 'div.up-detail',
            upName: 'a.up-name',
            upDesc: 'div.up-description',
            upBtnBox: 'div.upinfo-btn-panel',
            upDetailTopBox: 'div.up-detail-top',
            subBtn: 'div.follow-btn',
            videoTitle: '.video-title'
        },
        profile: {
            sidebarBox: 'div.aside',
            dynamicSidebarBox: 'div.space-dynamic__right',
            avatarImg: 'div.avatar div.b-avatar__layer__res>picture>img'
        }
    };
    class Utils{
        static _c(name) {
            return "ckupnotes-" + name;
        }
        static wait(ms = 0) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        static $(selector, root = document) {
            return root.querySelector(selector);
        }
        static $all(selector, root = document) {
            return Array.from(root.querySelectorAll(selector));
        }
        static $child(parent, selector) {
            if (typeof parent === 'string') {
                return document.querySelector(parent+' '+selector);
            }
            return parent.querySelector(selector);
        }
        static $childAll(parent, selector) {
            if (typeof parent === 'string') {
                return Array.from(document.querySelectorAll(parent+' '+selector));
            }
            return Array.from(parent.querySelectorAll(selector));
        }
        static removeTailingSlash(str) {
            return str.replace(/\/+$/, '');
        }
        static fixUrlProtocol(url) {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            } else if (url.startsWith('//')) {
                return unsafeWindow.location.protocol + url;
            } else if (url.startsWith('data:')) {
                return url;
            } else if (url.startsWith('/')) {
                return unsafeWindow.location.origin + url;
            } else {
                return unsafeWindow.location.origin + Utils.removeTailingSlash(unsafeWindow.location.pathname) + '/' + url;
            }
        }
        static waitForElementFirstAppearForever(selector, root = document) {
            return new Promise(resolve => {
                const element = root.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }
                const observer = new MutationObserver(mutations => {
                    for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                            if (!(node instanceof HTMLElement)) continue;
                            const el = node.matches(selector)
                                ? node
                                : node.querySelector(selector);
                            if (el) {
                                resolve(el);
                                observer.disconnect();
                                return;
                            }
                        }
                    }
                });
                observer.observe(root, {
                    childList: true,
                    subtree: true
                });
            });
        }
        static waitForElementFirstAppearForeverWithTimeout(selector, root = document, timeout = 5000) {
            return new Promise(resolve => {
                const element = root.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }
                let done = false;
                const observer = new MutationObserver(mutations => {
                    if (done) return;
                    for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                            if (!(node instanceof HTMLElement)) continue;
                            const el = node.matches(selector)
                                ? node
                                : node.querySelector(selector);
                            if (el) {
                                done = true;
                                resolve(el);
                                observer.disconnect();
                                return;
                            }
                        }
                    }
                });
                observer.observe(root, {
                    childList: true,
                    subtree: true
                });
                if (timeout > 0) {
                    setTimeout(() => {
                        if (done) return;
                        done = true;
                        observer.disconnect();
                        resolve(null);
                    }, timeout);
                }
            });
        }
        static registerOnElementAttrChange(element, attr, callback) {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && mutation.attributeName === attr) {
                        callback(mutation);
                    }
                });
            });
            observer.observe(element, { attributes: true });
            return observer;
        }
        static registerOnElementContentChange(element, callback) {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'characterData') {
                        callback(mutation);
                    }
                });
            });
            observer.observe(element, { characterData: true, subtree: true });
            return observer;
        }
        static registerOnceElementRemoved(element, callback, root = null) {
            if (!element) return null;
            if (!element.isConnected) {
                callback?.(element);
                return null;
            }
            const parent = root || element.parentNode || element.getRootNode?.();
            if (!parent) {
                callback?.(element);
                return null;
            }
            let done = false;
            const observer = new MutationObserver(mutations => {
                if (done) return;
                
                if (!element.isConnected) {
                    done = true;
                    observer.disconnect();
                    callback?.(element);
                    return;
                }
            });
            observer.observe(parent, { childList: true });
            return observer;
        }
        static formatDate(timestamp) {
            return (Intl.DateTimeFormat('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }).format(new Date(+timestamp))).replace(/\//g, '-').replace(',', '');
        }
        static daysBefore(timestamp) {
            const target = new Date(+timestamp);
            const now = Date.now();
            const diff = now - target.getTime();
            return Math.floor(diff / (1000 * 60 * 60 * 24));
        }
        static download(filename, text) {
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
        static get ui() {
            return unsafeWindow.ckui;
        }
        static get currentUid() {
            if (pages.isProfilePage()) {
                const match = unsafeWindow.location.pathname.match(/\/space\.bilibili\.com\/(\d+)/);
                if (match) {
                    return match[1];
                } else {
                    const uid = document.querySelector('.vui_icon.sic-fsp-uid_line.icon')?.nextSibling?.textContent || null;
                    return uid;
                }
            }
            // on play page
            if(pages.isPlayPage()) {
                const upAvatarLink = Utils.$(selectors.play.upAvatarLink);
                if (upAvatarLink) {
                    const link = upAvatarLink.getAttribute('href') || '';
                    const match2 = link.match(/\/space\.bilibili\.com\/(\d+)/);
                    if (match2) {
                        return match2[1];
                    }
                }
            }
            return null;
        }
        static get currentVID() {
            if (!pages.isPlayPage()) return null;
            // method referenced Bilibili Evolved
            if (unsafeWindow.aid || unsafeWindow.bvid) {
                return 'av'+unsafeWindow.aid || unsafeWindow.bvid;
            }
            const selector = '.av-link,.bv-link,.bvid-link';
            const avEl = document.querySelector(selector);
            if (avEl) {
                const vid = avEl.innerText?.trim?.() || '';
                if (vid.toLowerCase().startsWith('av') || vid.toLowerCase().startsWith('bv')) {
                    return vid;
                }
                if (vid.match(/^\d+/)) {
                    return 'av' + vid;
                }
            }
            return null;
        }
    }
    // #endregion helpers

    // #region store-v2
    class GMStore {
        static _serialize(value) {
            return JSON.stringify({ v: value });
        }
        static _deserialize(value) {
            if (value === null || typeof value === 'undefined') return null;
            if (typeof value !== 'string') return value;
            try {
                const parsed = JSON.parse(value);
                if (parsed && Object.prototype.hasOwnProperty.call(parsed, 'v')) {
                    return parsed.v;
                }
                return parsed;
            } catch {
                return value;
            }
        }
        static get(key, fallback = null) {
            const raw = GM_getValue(key, null);
            if (raw === null || typeof raw === 'undefined') return fallback;
            const val = this._deserialize(raw);
            return (val === null || typeof val === 'undefined') ? fallback : val;
        }
        static set(key, value) {
            GM_setValue(key, this._serialize(value));
        }
        static delete(key) {
            GM_deleteValue(key);
        }
        static has(key) {
            return GM_listValues().includes(key);
        }
        static list() {
            return GM_listValues();
        }
    }
    class Store{
        static datastore = GMStore;
        static settingsstore = GMStore;
        static setDataStore(storeName) {
            switch (storeName) {
                case 'GMStore':
                    this.datastore = GMStore;
                    break;
                default:
                    throw new Error(`Unknown store: ${storeName}`);
            }
        }

        static set(key, value) {
            return this.datastore.set(key, value);
        }
        static get(key, fallback = null) {
            return this.datastore.get(key, fallback);
        }
        static delete(key) {
            return this.datastore.delete(key);
        }
        static has(key) {
            return this.datastore.has(key);
        }
        static list() {
            return this.datastore.list();
        }

        static readSettings() {
            const settings = this.get('settings', {});
            return settings;
        }
        static readSetting(key, fallback = null) {
            const settings = this.readSettings();
            return (settings && Object.prototype.hasOwnProperty.call(settings, key)) ? settings[key] : fallback;
        }
        static setSettings(settings) {
            return this.set('settings', settings);
        }
        static setSetting(key, value) {
            const settings = this.readSettings() || {};
            settings[key] = value;
            return this.setSettings(settings);
        }
        static deleteSetting(key) {
            const settings = this.readSettings();
            if (settings && Object.prototype.hasOwnProperty.call(settings, key)) {
                delete settings[key];
                return this.setSettings(settings);
            }
        }

        static _u(uid) {
            return (uid ? ((''+uid).trim?.() || uid) : null)
        }

        static hasUser(_uid) {
            const uid = this._u(_uid);
            if (!uid) return false;
            return this.has(`u:${uid}`);
        }
        static getUser(_uid, fallback = null) {
            const uid = this._u(_uid);
            if (!uid) return fallback;
            return this.get(`u:${uid}`, fallback);
        }
        static setUser(_uid, user) {
            const uid = this._u(_uid);
            if (!uid) return;
            return this.set(`u:${uid}`, user);
        }
        static delUser(_uid) {
            const uid = this._u(_uid);
            if (!uid) return;
            return this.delete(`u:${uid}`);
        }
        static listUsers() {
            return this.list().filter(key => key.startsWith('u:')).map(key => key.substring(2));
        }
    }

    class User {
        uid = "";
        uname = "";
        uavatar = "";
        alias = "";
        notes = "";
        tags = [];
        followInfo = null;
        externalInfo = null;
        extras = null;

        static LoadOrCreate(uid) {
            let user = Store.getUser(uid, null);
            if (user) {
                return User.fromJson(user);
            } else {
                user = new User();
                user.uid = uid;
                user.save();
                return user;
            }
        }

        static fromUID(uid) {
            const result = Store.getUser(uid, null);
            if (result) {
                return User.fromJson(result);
            } else {
                return null;
            }
        }
        
        static fromJson(jsonStr) {
            try {
                const obj = JSON.parse(jsonStr);
                const user = new User();
                user.uid = obj.uid || "";
                user.uname = obj.uname || "";
                user.uavatar = obj.uavatar || "";
                user.alias = obj.a || "";
                user.notes = (obj.n !== null && obj.n !== undefined) ? String(obj.n) : "";
                user.tags = obj.t || [];
                user.followInfo = obj.f || null;
                user.externalInfo = obj.s || null;
                user.extras = obj.e || null;
                return user;
            } catch {
                return null;
            }
        }

        toObj() {
            return {
                uid: this.uid,
                uname: this.uname,
                uavatar: this.uavatar,
                a: this.alias,
                n: this.notes,
                t: this.tags,
                f: this.followInfo,
                s: this.externalInfo,
                e: this.extras
            }
        }
        toJSON() {
            return JSON.stringify(this.toObj());
        }
        toString() {
            return `[UP ${this.uid} - ${this.uname}${this.alias ? ` (${this.alias})` : ''}]`;
        }

        save() {
            return Store.setUser(this.uid, this.toJSON());
        }
        remove() {
            return Store.delUser(this.uid);
        }
        getTags() {
            return this.tags || [];
        }
        setTags(tags) {
            this.tags = tags || [];
        }
        addTag(tag) {
            if (!this.tags) this.tags = [];
            if (!this.tags.includes(tag)) {
                this.tags.push(tag);
            }
        }
        removeTag(tag) {
            if (!this.tags) return;
            this.tags = this.tags.filter(t => t !== tag);
        }

        setFollowInfo({ timestamp, videoId, videoName, upName }) {
            this.followInfo = {
                t: timestamp,
                vi: videoId,
                vn: videoName,
                un: upName
            }
        }
        getFollowInfo() {
            if (!this.followInfo) return null;
            return {
                timestamp: this.followInfo.t,
                videoId: this.followInfo.vi,
                videoName: this.followInfo.vn,
                upName: this.followInfo.un
            }
        }
        removeFollowInfo() {
            this.followInfo = null;
        }
        setExternalInfo({ sourceName, sourceUrl, timestamp }) {
            this.externalInfo = {
                s: sourceName,
                u: sourceUrl,
                t: timestamp
            }
        }
        getExternalInfo() {
            if (!this.externalInfo) return null;
            return {
                sourceName: this.externalInfo.s,
                sourceUrl: this.externalInfo.u,
                timestamp: this.externalInfo.t
            }
        }
        setExtra(key, value) {
            if (!this.extras) this.extras = {};
            this.extras[key] = value;
        }
        getExtra(key, fallback = null) {
            if (!this.extras) return fallback;
            return (Object.prototype.hasOwnProperty.call(this.extras, key)) ? this.extras[key] : fallback;
        }

        refresh() {

            return User.fromUID(this.uid).then(user => {
                if (user) {
                    this.uname = user.uname;
                    this.uavatar = user.uavatar;
                    this.alias = user.alias;
                    this.notes = user.notes;
                    this.tags = user.tags;
                    this.followInfo = user.followInfo;
                    this.externalInfo = user.externalInfo;
                    this.extras = user.extras;
                }
                return this;
            });
        }
    }
    function migrationCheckV2() {

        const keys = Store.list();
        let need = false;
        for (const key of keys) {
            if (key.startsWith('upalias_') || key.startsWith('upnotes_')) {
                need = true;
                break;
            }
        }
        return need;
    }
    function doMigrationV2() {
        const keys = Store.list();
        for (const key of keys) {
            if (key.startsWith('upalias_')) {
                const uid = key.substring('upalias_'.length);
                const user = User.LoadOrCreate(uid);
                user.alias = Store.get(key, '');
                user.save();
                Store.delete(key);
                logger.log(`Migrated alias for UID ${uid}`);
            } else if (key.startsWith('upnotes_')) {
                const uid = key.substring('upnotes_'.length);
                const user = User.LoadOrCreate(uid);
                user.notes = Store.get(key, '');
                user.save();
                Store.delete(key);
                logger.log(`Migrated notes for UID ${uid}`);
            }
        }
    }
    // #endregion store-v2
    
    // #region cores
    class UPNotesManager {
        static _u(uid) {
            return (uid ? ((''+uid).trim?.() || uid) : "not-a-uid")
        }

        static getAliasForUID(_uid, fallback = null) {
            const uid = UPNotesManager._u(_uid);
            const user = User.fromUID(uid);
            if (user) {
                return user.alias || fallback;
            } else return fallback;
        }

        static setAliasForUID(_uid, alias) {
            const uid = UPNotesManager._u(_uid);
            const user = User.LoadOrCreate(uid);
            user.alias = alias;
            user.save();
        }
        
        static deleteAliasForUID(_uid) {
            const uid = UPNotesManager._u(_uid);
            const user = User.fromUID(uid);
            if (user) {
                user.alias = "";
                user.save();
            }
        }

        static getNotesForUID(_uid, fallback = null) {
            const uid = UPNotesManager._u(_uid);
            const user = User.fromUID(uid);
            if (user) {
                return user.notes || fallback;
            } else return fallback;
        }

        static setNotesForUID(_uid, notes) {
            const uid = UPNotesManager._u(_uid);
            const user = User.LoadOrCreate(uid);
            user.notes = notes;
            user.save();
        }
        
        static deleteNotesForUID(_uid) {
            const uid = UPNotesManager._u(_uid);
            const user = User.fromUID(uid);
            if (user) {
                user.notes = "";
                user.save();
            }
        }

        static callUIForEditing(_uid, _displayName = "?", _avatarUrl = null, closeCallback = null) {
            const uid = UPNotesManager._u(_uid);
            const displayName = _displayName?.trim?.() || _displayName;
            const avatarUrl = _avatarUrl?.trim?.() || _avatarUrl;
            
            const user = User.LoadOrCreate(uid);
            user.uname = displayName || user.uname;
            user.uavatar = avatarUrl || user.uavatar;
            
            const form = Utils.ui.form()
                .input({ 
                    label: 'UP 别名', 
                    name: 'alias', 
                    placeholder: '请输入 UP 别名', 
                    value: user.alias
                })
                .textarea({ 
                    label: 'UP 备注', 
                    name: 'notes', 
                    placeholder: '请输入 UP 备注', 
                    value: user.notes
                })
                .tags({
                    label: '分类标签',
                    name: 'tags',
                    placeholder: '对 UP 进行标签归类',
                    value: user.tags || [],
                    maxTags: 10,
                    validator(tag, tags) {
                        if (tag.length < 1 || tag.length > 20) {
                            return '标签长度应在 1-20 字符之间';
                        }
                        return true;
                    }
                })
                .checkbox({
                    label: '勾选并保存以删除关注记录',
                    name: 'deleteFollowInfo',
                    value: false,
                })
                .button({ 
                    label: '保存', 
                    primary: true,
                    onClick: (values) => {
                        const newAlias = values.alias.trim();
                        const newNotes = values.notes.trim();
                        const tags = values.tags || [];
                        const deleteFollowInfo = values.deleteFollowInfo || false;

                        if (deleteFollowInfo) {
                            user.removeFollowInfo();
                        }

                        user.alias = newAlias;
                        user.notes = newNotes;
                        user.setTags(tags);
                        user.save();
                        
                        Utils.ui.success('保存成功');
                        floatWindow.close();
                        if (closeCallback) {
                            closeCallback();
                        }
                    }
                })
                .button({ 
                    label: '取消',
                    onClick: () => {
                        floatWindow.close();
                    }
                });
            
            const floatWindow = Utils.ui.floatWindow({
                title: `编辑备注 ${displayName} (UID: ${uid})`,
                content: form.render(),
                width: '450px',
                shadow: true,
                ...(avatarUrl ? {
                    icon: Utils.fixUrlProtocol(avatarUrl),
                    iconShape: 'circle',
                    iconWidth: '24px',
                } : {})
            });
            
            floatWindow.show();
            floatWindow.moveToMouse?.();
        }

        static callUIForRemoving(_uid, _displayName = "", _avatarUrl = null) {
            const uid = UPNotesManager._u(_uid);
            const displayName = _displayName?.trim?.() || _displayName;
            const avatarUrl = _avatarUrl?.trim?.() || _avatarUrl;
            const user = User.fromUID(uid);
            if(!user) return Utils.ui.error('未找到该 UP 主的备注信息，无需删除。');
            Utils.ui.confirm(
                `确定要删除 ${displayName} (UID: ${uid}) 的 UP 备注吗？`, '确认删除 UP 备注',
                null,
                avatarUrl ? {
                    icon: Utils.fixUrlProtocol(avatarUrl),
                    iconShape: 'circle',
                    iconWidth: '24px',
                } : {}
            ).then(res => {
                if (res) {
                    user.remove();
                    Utils.ui.success('删除成功');
                }
            });
        }
    }

    // #endregion cores

    // #region integrations

    class FoManPlugin_Provider{
        static hasAlias(uid) {
            return UPNotesManager.getAliasForUID(uid, null) !== null;
		}
        static getAlias(uid, fallback = null) {
            return UPNotesManager.getAliasForUID(uid, fallback);
		}
        static setAlias(uid, alias) {
            UPNotesManager.setAliasForUID(uid, alias);
		}
        static removeAlias(uid) {
            UPNotesManager.deleteAliasForUID(uid);
		}
    }

    class FoManPlugin_Actions{
        static async setFor(uid, displayName = null) {
            UPNotesManager.callUIForEditing(uid, displayName);
		}
        static async removeFor(uid, displayName = null) {
            UPNotesManager.callUIForRemoving(uid, displayName);
		}
    }

    // #endregion integrations

    // #region import-export

    class ImportValidator {
        static validate(data) {
            try {
                if (!data?.meta || data.meta.fmt !== 'v2') throw new Error('不支持的数据格式');
                if (!data.content || typeof data.content !== 'object') throw new Error('缺少内容数据');
                return { valid: true, data };
            } catch (e) {
                return { valid: false, error: `验证失败: ${e.message}` };
            }
        }

        static validateBackup(data) {
            try {
                if (data?.type !== 'backup' || !data.data) throw new Error('不是有效的备份格式');
                return { valid: true, data };
            } catch (e) {
                return { valid: false, error: `备份验证失败: ${e.message}` };
            }
        }
    }

    class ImportMerger {
        static prepareMerge(importData, options = {}) {
            const { mergeMode = 'smart', externalInfo = null } = options;
            const content = importData.data.content;
            
            return Object.entries(content).map(([uid, importUserData]) => {
                const existingUser = User.fromUID(uid);
                const hasData = importUserData.alias || importUserData.notes || importUserData.tags?.length > 0;
                let action = 'skip';
                
                if (!existingUser) action = 'create';
                else if (mergeMode === 'overwrite') action = 'overwrite';
                else if (mergeMode === 'smart' && hasData) action = 'merge';
                
                return { uid, importData: importUserData, existingUser, action, externalInfo };
            });
        }
        
        static executeTask(task) {
            try {
                if (task.action === 'skip') return { success: true, action: 'skip', uid: task.uid };
                
                const user = task.action === 'create' ? User.LoadOrCreate(task.uid) : task.existingUser;
                const data = task.importData;
                
                if (task.action === 'overwrite') {
                    user.alias = data.alias || '';
                    user.notes = data.notes != null ? String(data.notes) : '';
                    user.tags = Array.isArray(data.tags) ? data.tags : [];
                } else if (task.action === 'merge') {
                    if (data.alias) user.alias = data.alias;
                    if (data.notes != null && data.notes !== '') user.notes = String(data.notes);
                    if (Array.isArray(data.tags) && data.tags.length) {
                        user.tags = [...new Set([...(user.tags || []), ...data.tags])];
                    }
                }
                
                if (task.externalInfo) user.setExternalInfo(task.externalInfo);
                user.save();
                
                return { success: true, action: task.action, uid: task.uid };
            } catch (e) {
                return { success: false, action: task.action, uid: task.uid, error: e.message };
            }
        }
    }

    class ImportProgressUI {
        constructor() {
            this.data = { current: 0, total: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
            this.elements = {};
        }
        
        create() {
            if (this.window) return this.window.show(), this;
            
            const h = Utils.ui.h;
            const stat = (label, key, color) => h('div', {
                style: `background: var(--ckui-bg-secondary); padding: 12px; border-radius: 6px; border-left: 3px solid ${color};`
            }, [
                h('div', { style: 'font-size: 12px; color: var(--ckui-text-secondary);' }, [label]),
                h('div', { 'data-stat': key, style: 'font-size: 20px; font-weight: 600;' }, ['0'])
            ]);
            
            this.window = Utils.ui.floatWindow({
                id: 'ckupnotes-import-progress',
                title: '数据导入',
                content: h('div', {}, [
                    h('div', { style: 'background: var(--ckui-bg-secondary); border-radius: 8px; height: 24px; margin-bottom: 8px;' }, [
                        h('div', { 'data-bind': 'bar', style: 'height: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb); transition: width 0.3s; width: 0%;' })
                    ]),
                    h('div', { 'data-bind': 'text', style: 'text-align: center; font-size: 18px; font-weight: 600; margin-bottom: 16px;' }, ['0%']),
                    h('div', { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' }, [
                        stat('新建', 'created', '#10b981'), stat('更新', 'updated', '#3b82f6'),
                        stat('跳过', 'skipped', '#f59e0b'), stat('失败', 'failed', '#ef4444')
                    ])
                ]),
                width: '450px',
                closable: false,
                shadow: true
            });
            
            return this;
        }
        
        show() {
            this.window?.show();

            if (this.window && this.window.container && !this.elements.bar) {
                const c = this.window.container;
                this.elements = {
                    bar: c.querySelector('[data-bind="bar"]'),
                    text: c.querySelector('[data-bind="text"]'),
                    stats: {
                        created: c.querySelector('[data-stat="created"]'),
                        updated: c.querySelector('[data-stat="updated"]'),
                        skipped: c.querySelector('[data-stat="skipped"]'),
                        failed: c.querySelector('[data-stat="failed"]')
                    }
                };
            }
            return this;
        }
        
        update(data) {
            Object.assign(this.data, data);
            const pct = this.data.total > 0 ? Math.round(this.data.current / this.data.total * 100) : 0;
            if (this.elements.bar) this.elements.bar.style.width = pct + '%';
            if (this.elements.text) this.elements.text.textContent = pct + '%';
            ['created', 'updated', 'skipped', 'failed'].forEach(k => {
                if (this.elements.stats && this.elements.stats[k]) {
                    this.elements.stats[k].textContent = this.data[k] || 0;
                }
            });
        }
        
        close() { this.window?.close(); this.window = null; this.elements = {}; }
    }

    class DataImporter {
        static async importWithProgress(jsonString, options = {}) {
            const { mergeMode = 'smart', batchSize = 50, batchDelay = 10, sourceUrl = null } = options;
            let progressUI = null;
            
            try {
                const jsonData = JSON.parse(jsonString);
                const validation = ImportValidator.validate(jsonData);
                if (!validation.valid) {
                    Utils.ui.notification.error('格式验证失败', validation.error);
                    return { success: false, error: validation.error };
                }
                
                const meta = jsonData.meta || {};
                const infoLines = [
                    meta.author && `作者：${meta.author}`,
                    meta.version && `版本：${meta.version}`,
                    meta.exportTime && `导出时间：${Utils.formatDate(meta.exportTime)}`,
                    meta.count && `数据条数：${meta.count}`
                ].filter(Boolean);
                
                const confirmContent = Utils.ui.h('div', {}, [
                    Utils.ui.h('div', { style: 'line-height: 1.8;' }, 
                        infoLines.map(line => Utils.ui.h('div', {}, [line]))
                    ),
                    Utils.ui.h('div', { style: 'margin-top: 12px; padding: 12px; background: var(--ckui-bg-secondary); border-radius: 4px; font-size: 13px;' }, 
                        ['导入后将记录数据来源信息到每个UP主。']
                    )
                ]);
                
                const confirmed = await Utils.ui.confirm({ title: '确认导入分享数据', content: confirmContent });
                if (!confirmed) return { success: false, error: '用户取消导入' };
                
                const externalInfo = { 
                    sourceName: meta.author || '未知来源', 
                    sourceUrl: meta.website || sourceUrl || '本地文件', 
                    timestamp: Date.now() 
                };
                const tasks = ImportMerger.prepareMerge(validation, { mergeMode, externalInfo });
                
                if (!tasks.length) {
                    Utils.ui.notification.info('无数据', '没有需要导入的数据');
                    return { success: true, stats: { total: 0 } };
                }
                
                progressUI = new ImportProgressUI().create().show();
                await this._executeTasks(tasks, progressUI, batchSize, batchDelay);
                
                progressUI.close();
                Utils.ui.notification.success('导入完成', 
                    `成功: ${progressUI.data.created} 新建, ${progressUI.data.updated} 更新, ${progressUI.data.skipped} 跳过`
                );
                return { success: true, stats: progressUI.data };
            } catch (e) {
                progressUI?.close();
                Utils.ui.notification.error('导入失败', e.message);
                logger.error('导入失败:', e);
                return { success: false, error: e.message };
            }
        }
        
        static async importBackupWithProgress(jsonString, options = {}) {
            const { batchSize = 50, batchDelay = 10 } = options;
            let progressUI = null;
            
            try {
                const jsonData = JSON.parse(jsonString);
                const validation = ImportValidator.validateBackup(jsonData);
                if (!validation.valid) {
                    Utils.ui.notification.error('格式验证失败', validation.error);
                    return { success: false, error: validation.error };
                }
                
                const userData = jsonData.data;
                const uids = Object.keys(userData);
                
                if (!uids.length) {
                    Utils.ui.notification.info('无数据', '没有需要导入的数据');
                    return { success: true, stats: { total: 0 } };
                }
                
                progressUI = new ImportProgressUI().create().show();
                const stats = { total: uids.length, created: 0, updated: 0, skipped: 0, failed: 0 };
                progressUI.update({ total: uids.length, current: 0 });
                
                for (let i = 0; i < uids.length; i += batchSize) {
                    const batch = uids.slice(i, i + batchSize);
                    batch.forEach(uid => {
                        try {
                            const existingUser = User.fromUID(uid);
                            Store.setUser(uid, userData[uid]);
                            stats[existingUser ? 'updated' : 'created']++;
                        } catch (e) {
                            stats.failed++;
                        }
                    });
                    progressUI.update({ current: Math.min(i + batchSize, uids.length), ...stats });
                    if (i + batchSize < uids.length) await Utils.wait(batchDelay);
                }
                
                progressUI.close();
                Utils.ui.notification.success('备份导入完成', 
                    `成功: ${stats.created} 新建, ${stats.updated} 更新${stats.failed ? `, ${stats.failed} 失败` : ''}`
                );
                return { success: true, stats };
            } catch (e) {
                progressUI?.close();
                Utils.ui.notification.error('导入失败', e.message);
                logger.error('备份导入失败:', e);
                return { success: false, error: e.message };
            }
        }
        
        static async _executeTasks(tasks, progressUI, batchSize, batchDelay) {
            const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
            progressUI.update({ total: tasks.length, current: 0, ...stats });
            
            for (let i = 0; i < tasks.length; i += batchSize) {
                const batch = tasks.slice(i, i + batchSize);
                batch.forEach(task => {
                    const result = ImportMerger.executeTask(task);
                    stats[result.success ? result.action : 'failed']++;
                });
                progressUI.update({ current: Math.min(i + batchSize, tasks.length), ...stats });
                if (i + batchSize < tasks.length) await Utils.wait(batchDelay);
            }
        }
    }

    // #endregion import-export

    // #region settingspage

    function openSettings() {
        if (!Utils.ui) return;
        const settings = Object.assign({
            enableIntegrationOnUnfollow: true,
            enableRecordFollowInfo: true,
        }, Store.readSettings() || {});
        const form = Utils.ui.form()
            .checkbox({
                label: '启用 与关注管理器的集成',
                name: 'enableIntegrationOnUnfollow',
                value: !!settings.enableIntegrationOnUnfollow,
                onChange: (value, allValues) => {
                    Store.setSetting('enableIntegrationOnUnfollow', !!value);
                }
            })
            .html(`<span>能够在关注管理器中显示 UP 主别名，允许快速修改。</span>`)
            .checkbox({
                label: '启用 记录关注信息',
                name: 'enableRecordFollowInfo',
                value: !!settings.enableRecordFollowInfo,
                onChange: (value, allValues) => {
                    Store.setSetting('enableRecordFollowInfo', !!value);
                }
            })
            .html(`<span>当在播放页右上角点击关注时，记录 UP 主的关注时间、关联视频等信息，并显示在 UP 卡片中。</span>`)
            .button({
                label: '备份',
                onClick() {
                    const users = Store.listUsers();
                    const backup = {
                        type: 'backup',
                        version: '2.0',
                        exportTime: Date.now(),
                        data: Object.fromEntries(users.map(uid => [uid, Store.getUser(uid)]).filter(([, v]) => v))
                    };
                    Utils.download(`bilibili_upnotes_backup_${Date.now()}.json`, JSON.stringify(backup, null, 2));
                    Utils.ui.notification.success('备份成功', `已备份 ${users.length} 条完整数据`);
                }
            })
            .button({
                label: '分享',
                onClick() {
                    const users = Store.listUsers().map(uid => User.fromUID(uid)).filter(Boolean);
                    const share = {
                        meta: { fmt: 'v2', author: 'BiliUPNotes User', version: '1.0', exportTime: Date.now(), count: users.length },
                        content: Object.fromEntries(users.map(u => [u.uid, { alias: u.alias || '', notes: u.notes || '', tags: u.tags || [] }]))
                    };
                    Utils.download(`bilibili_upnotes_share_${Date.now()}.json`, JSON.stringify(share, null, 2));
                    Utils.ui.notification.success('分享数据已导出', `已导出 ${users.length} 条简化数据`);
                }
            })
            .space()
            .button({
                label: '从 URL 导入',
                onClick: async () => {
                    const url = await Utils.ui.prompt('请输入包含 UP 备注数据的 URL（需返回 JSON 格式数据）', '', 'https://example.com/path/to.json');
                    if (!url) return;
                    try {
                        Utils.ui.notification.info('正在获取数据', '请稍候...');
                        const resp = await fetch(url);
                        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
                        await DataImporter.importWithProgress(await resp.text(), { mergeMode: 'smart', sourceUrl: url });
                    } catch (e) {
                        Utils.ui.notification.error('导入失败', e.message);
                    }
                }
            })
            .button({
                label: '从文件导入',
                onClick: () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                            Utils.ui.notification.info('正在读取文件', '请稍候...');
                            const text = await file.text();
                            const data = JSON.parse(text);
                            if (data.type === 'backup') {
                                await DataImporter.importBackupWithProgress(text);
                            } else {
                                await DataImporter.importWithProgress(text, { sourceUrl: '本地文件: ' + file.name });
                            }
                        } catch (e) {
                            Utils.ui.notification.error('导入失败', e.message);
                        }
                    };
                    input.click();
                }
            })
            .space()
            .html(`Tips: 可以将分享内容发布到 JSONBin.io 这样的网站，并给他人提供访问链接来分享 UP 备注数据。`);
        const win = Utils.ui.floatWindow({
            id: 'ckupnotes-settings',
            title: 'UP 备注 - 功能设置',
            content: form.render(),
            width: '400px',
            shadow: true,
        });

        win.show();
    }

    // #endregion

    // #region onAnyPage

    function injectCssOnAnyPage() {
        GM_addStyle(`
            .ckupnotes-usercard-btn{
                border: 1px solid var(--text3);
                color: var(--text2);
                background-color: transparent;
            }
            .ckupnotes-usercard-btn:hover{
                color: var(--brand_blue);
                border-color: var(--brand_blue);
            }
            .ckupnotes-tagrow{
                margin-top: 4px;
            }
            .ckupnotes-tag{
                display: inline-block;
                padding: 2px 6px;
                margin-right: 4px;
                background-color: var(--bg2);
                color: var(--text2);
                border-radius: 4px;
                font-size: 12px;
            }
            `);
    }

    function tagRowMaker(tags) {
        const row = document.createElement('div');
        row.classList.add('ckupnotes-tagrow', selectors.markup.idclass.replace(".", ""));
        tags.forEach(tag => {
            const tagEl = document.createElement('div');
            tagEl.classList.add('ckupnotes-tag');
            tagEl.textContent = tag;
            row.appendChild(tagEl);
        });
        return row;
    }

    function followInfoBlockMaker(user) {
        const followInfo = user.getFollowInfo();
        if (!followInfo) return null;
        const block = document.createElement('div');
        block.classList.add('ckupnotes-followinfo', selectors.markup.idclass.replace(".", ""));
        block.textContent = `关注于 `;
        const dateSpan = document.createElement('span');
        dateSpan.innerText = Utils.formatDate(followInfo.timestamp);
        dateSpan.title = Utils.daysBefore(followInfo.timestamp) + '天前';
        block.appendChild(dateSpan);
        const vidLink = document.createElement('a');
        vidLink.href=`https://www.bilibili.com/video/${followInfo.videoId}`;
        vidLink.target = '_blank';
        vidLink.textContent = `《${followInfo.videoName ||'未知'}》`;
        block.appendChild(vidLink);
        if(user.uname && followInfo.upName && user.uname !== followInfo.upName) {
            block.textContent += `（UP：${followInfo.upName}）`;
        }
        return block;
    }

    function externalInfoBlockMaker(user) {
        const externalInfo = user.getExternalInfo();
        if (!externalInfo) return null;
        const block = document.createElement('div');
        block.classList.add('ckupnotes-externalinfo', selectors.markup.idclass.replace(".", ""));
        block.textContent = `信息来自 ${externalInfo.sourceName} 于 ${Utils.formatDate(externalInfo.timestamp)}`;
        if (externalInfo.sourceUrl) {
            const link = document.createElement('a');
            link.href = Utils.fixUrlProtocol(externalInfo.sourceUrl);
            link.target = '_blank';
            link.style.marginLeft = '8px';
            link.textContent = '[查看来源]';
            block.appendChild(link);
        }
        return block;
    }

    function registerOnAnyPage() {
        logger.log('Registering UP Card observer on any page...');
        injectCssOnAnyPage();
        Utils.waitForElementFirstAppearForever(selectors.card.root).then(onFirstCardShown);
        Utils.waitForElementFirstAppearForever(selectors.cardModern.shadowRoot).then(onFirstModernCardShown);
        Utils.waitForElementFirstAppearForever(selectors.userCard.root).then(onFirstUserCardShown);
    }

    function onFirstCardShown(cardElement) {
        logger.log('First UP Card note appeared.');
        onCardShown(cardElement);
        Utils.registerOnElementAttrChange(
            cardElement,
            'style',
            () => {
                if (!cardElement.style.display || cardElement.style.display !== 'none') {
                    onCardShown(cardElement);
                }
            }
        );
    }

    function onFirstModernCardShown(cardElement) {
        logger.log('First Modern UP Card note appeared.');
        Utils.registerOnElementAttrChange(cardElement, 'style', () => {
            if (!cardElement.style.display || cardElement.style.display !== 'none') {
                onModernCardShown();
            }
        });
    }

    function onFirstUserCardShown(cardElement) {
        logger.log('First User Card note appeared.');
        Utils.registerOnElementAttrChange(cardElement, 'style', () => {
            if (!cardElement.style.display || cardElement.style.display !== 'none') {
                onUserCardShown();
            }
        });
    }

    async function onCardShown() {
        const thisCardTaskId = (''+Date.now()) + Math.random();
        try {
            runtime.cardtaskId = thisCardTaskId;
            const cardElement = Utils.$(selectors.card.root);

            const cardBody = Utils.$child(cardElement, selectors.card.bodyRoot);
            if (!cardBody) {
                return;
            }

            await Utils.wait(150); // 等待内容加载

            const els = Utils.$childAll(cardElement, selectors.markup.idclass);
            els.forEach(element => {
                element.remove();
            });

            if(runtime.cardtaskId !== thisCardTaskId) {
                logger.log('A newer card task has started, aborting this one.(note)');
                return;
            }
            const avatarLinkEl = Utils.$child(cardElement, selectors.card.avatarLink);
            const link = avatarLinkEl?.getAttribute('href') || '';
            // value = `//space.bilibili.com/652239032/dynamic`
            // extract UID
            const match = link.match(/\/space\.bilibili\.com\/(\d+)/);
            if (!match) return logger.log('UID not found in avatar link, aborting.(note)');
            const uid = match[1];
            logger.log(`Extracted UID: ${uid} (note)`);
            const user = User.fromUID(uid) || {};
            let alias = user.alias || '';
            let notes = user.notes || '';

            logger.log(`UP Card Shown - UID: ${uid}, Alias: ${alias}, Notes: ${notes}`);

            const userNameEl = Utils.$child(cardElement, selectors.card.userName);
            const username = userNameEl.textContent || '';
            if (alias) {
                const span = document.createElement('span');
                span.classList.add(selectors.markup.symbolclass.replace(".", ""), selectors.markup.idclass.replace(".", ""));
                span.textContent = ` (${alias})`;
                userNameEl.appendChild(span);
            } else {
                logger.log('No alias found.(note)');
            }

            const bodyRootEl = Utils.$child(cardElement, selectors.card.bodyRoot);
            if (notes) {
                const notesEl = document.createElement('div');
                notesEl.classList.add(selectors.card.signBox.replace("div.", ""), selectors.markup.idclass.replace(".", ""));
                notesEl.style.marginTop = '4px';
                notesEl.style.fontStyle = 'italic';
                notesEl.textContent = notes;
                bodyRootEl.appendChild(notesEl);
                logger.log('Notes added to UP Card.(note)');
            } else {
                logger.log('No notes found.(note)');
            }
            if (user.tags && user.tags.length > 0) {
                const tagRow = tagRowMaker(user.tags);
                bodyRootEl.appendChild(tagRow);
                logger.log('Tags added to UP Card.(note)');
            }
            if (user.followInfo) {
                const followInfoBlock = followInfoBlockMaker(user);
                if (followInfoBlock) {
                    bodyRootEl.appendChild(followInfoBlock);
                    logger.log('Follow info added to UP Card.(note)');
                }
            }
            if (user.externalInfo) {
                const externalInfoBlock = externalInfoBlockMaker(user);
                if (externalInfoBlock) {
                    bodyRootEl.appendChild(externalInfoBlock);
                    logger.log('External info added to UP Card.(note)');
                }
            }

            const footerRootEl = Utils.$child(cardElement, selectors.card.footerRoot);
            if (footerRootEl) {
                const btn = document.createElement('div');
                btn.classList.add(selectors.card.button.replace("div.", ""), selectors.markup.idclass.replace(".", ""), 'ckupnotes-usercard-btn');
                btn.textContent = '编辑备注';
                btn.style.cursor = 'pointer';
                btn.style.marginLeft = '8px';
                footerRootEl.appendChild(btn);
                btn.addEventListener('click', () => {
                    const avatarEl = Utils.$child(cardElement, selectors.card.avatar);
                    const avatarImgSrc = avatarEl?.getAttribute('src') || null;
                    UPNotesManager.callUIForEditing(uid, username, avatarImgSrc);
                });
            }
        } finally { 
            if(runtime.cardtaskId === thisCardTaskId) runtime.cardtaskId = null;
        }
    }

    async function onModernCardShown() {
        const cardElement = Utils.$(selectors.cardModern.shadowRoot);
        if (!cardElement) return;
        const shadowroot = cardElement.shadowRoot;
        if (!shadowroot) return;
        const thisCardTaskId = ('' + Date.now()) + Math.random();
        try {
            runtime.cardtaskId = thisCardTaskId;
            await Utils.waitForElementFirstAppearForever(selectors.cardModern.readyDom, shadowroot, 2000);

            if (runtime.cardtaskId !== thisCardTaskId) {
                logger.log('A newer card task has started, aborting this one.(modern)');
                return;
            }

            const els = Utils.$childAll(shadowroot, selectors.markup.idclass);
            els.forEach(element => {
                element.remove();
            });

            const avatarLinkEl = Utils.$child(shadowroot, selectors.cardModern.avatarLink);
            const link = avatarLinkEl?.getAttribute('href') || '';
            const match = link.match(/\/space\.bilibili\.com\/(\d+)/);
            if (!match) return logger.log('UID not found in avatar link, aborting.(modern)');
            const uid = match[1];
            logger.log(`Extracted UID: ${uid} (modern)`);
            const user = User.fromUID(uid) || {};
            let alias = user.alias || '';
            let notes = user.notes || '';
            let followInfo = user.followInfo || null;
            let externalInfo = user.externalInfo || null;

            logger.log(`Modern UP Card Shown - UID: ${uid}, Alias: ${alias}, Notes: ${notes}`);

            const userNameEl = Utils.$child(shadowroot, selectors.cardModern.userName);
            const username = userNameEl?.textContent || '';
            if (alias) {
                const span = document.createElement('span');
                span.classList.add(selectors.markup.symbolclass.replace(".", ""), selectors.markup.idclass.replace(".", ""));
                span.textContent = ` (${alias})`;
                userNameEl.appendChild(span);
            } else {
                logger.log('No alias found.(modern)');
            }

            const bodyRootEl = Utils.$child(shadowroot, selectors.cardModern.bodyRoot);
            if (notes) {
                const notesEl = document.createElement('div');
                notesEl.classList.add(selectors.cardModern.signBox.replace("div.", ""), selectors.markup.idclass.replace(".", ""));
                notesEl.style.marginTop = '4px';
                notesEl.style.fontStyle = 'italic';
                notesEl.textContent = notes;
                bodyRootEl.appendChild(notesEl);
                logger.log('Notes added to Modern UP Card.(modern)');
            } else {
                logger.log('No notes found.(modern)');
            }
            if(user.tags && user.tags.length > 0) {
                const tagRow = tagRowMaker(user.tags);
                bodyRootEl.appendChild(tagRow);
                logger.log('Tags added to Modern UP Card.(modern)');
            }
            if (followInfo) {
                const followInfoBlock = followInfoBlockMaker(user);
                if (followInfoBlock) {
                    bodyRootEl.appendChild(followInfoBlock);
                    logger.log('Follow info added to Modern UP Card.(modern)');
                }
            }

            if (externalInfo) {
                const externalInfoBlock = externalInfoBlockMaker(user);
                if (externalInfoBlock) {
                    bodyRootEl.appendChild(externalInfoBlock);
                    logger.log('External info added to Modern UP Card.(modern)');
                }
            }

            const footerRootEl = Utils.$child(shadowroot, selectors.cardModern.footerRoot);
            if (footerRootEl) {
                const btn = document.createElement('button');
                btn.classList.add(selectors.markup.idclass.replace(".", ""), 'ckupnotes-usercard-btn');
                btn.textContent = '编辑备注';
                btn.style.cursor = 'pointer';
                btn.style.marginLeft = '8px';
                footerRootEl.appendChild(btn);
                btn.addEventListener('click', () => {
                const avatarEl = Utils.$child(shadowroot, selectors.cardModern.avatar);
                const avatarImgSrc = avatarEl?.getAttribute('src') || null;
                    UPNotesManager.callUIForEditing(uid, username, avatarImgSrc);
                });
            }

            // inject custom styles into shadowdom
            const styleEl = document.createElement('style');
            styleEl.textContent = `
                .ckupnotes-usercard-btn{
                    border: 1px solid var(--text3);
                    color: var(--text2);
                    background-color: transparent;
                }
                .ckupnotes-usercard-btn:hover{
                    color: var(--brand_blue);
                    border-color: var(--brand_blue);
                }
                .ckupnotes-tagrow{
                    margin-top: 4px;
                }
                .ckupnotes-tag{
                    display: inline-block;
                    padding: 2px 6px;
                    margin-right: 4px;
                    background-color: var(--bg2);
                    color: var(--text2);
                    border-radius: 4px;
                    font-size: 12px;
                }
            `;
            styleEl.classList.add(selectors.markup.idclass.replace(".", ""));
            shadowroot.appendChild(styleEl);
        } finally {
            if (runtime.cardtaskId === thisCardTaskId) runtime.cardtaskId = null;
        }
    }

    async function onUserCardShown() {
        const cardElement = Utils.$(selectors.userCard.root);
        if (!cardElement) return;
        const thisCardTaskId = ('' + Date.now()) + Math.random();
        try {
            runtime.cardtaskId = thisCardTaskId;
            await Utils.wait(300); // wait for content load

            if (runtime.cardtaskId !== thisCardTaskId) {
                logger.log('A newer card task has started, aborting this one.(usercard)');
                return;
            }
            const els = Utils.$childAll(cardElement, selectors.markup.idclass);
            els.forEach(element => {
                element.remove();
            });

            logger.log('Processing User Card...(usercard)');
            const userNameLink = Utils.$child(cardElement, selectors.userCard.userName);
            const link = userNameLink?.getAttribute('href') || '';
            const match = link.match(/\/space\.bilibili\.com\/(\d+)/);
            if (!match) return logger.log('UID not found in avatar link, aborting.(usercard)');
            const uid = match[1];
            logger.log(`Extracted UID: ${uid} (usercard)`);
            const user = User.fromUID(uid) || {};
            let alias = user.alias || '';
            let notes = user.notes || '';
            let followInfo = user.followInfo || null;
            let externalInfo = user.externalInfo || null;
            
            logger.log(`User Card Shown - UID: ${uid}, Alias: ${alias}, Notes: ${notes}`);

            const userNameEl = Utils.$child(cardElement, selectors.userCard.userName);
            const displayName = userNameEl?.textContent || '';
            if (alias) {
                const span = document.createElement('span');
                span.classList.add(selectors.markup.symbolclass.replace(".", ""), selectors.markup.idclass.replace(".", ""));
                span.textContent = ` (${alias})`;
                userNameEl.appendChild(span);
            } else {
                logger.log('No alias found.(usercard)');
            }
            
            const bodyRootEl = Utils.$child(cardElement, selectors.userCard.bodyRoot);
            if (notes) {
                const notesEl = document.createElement('div');
                notesEl.classList.add(selectors.userCard.signBox.replace("div.", ""), selectors.markup.idclass.replace(".", ""));
                notesEl.style.marginTop = '4px';
                notesEl.style.fontStyle = 'italic';
                notesEl.textContent = notes;
                bodyRootEl.appendChild(notesEl);
                logger.log('Notes added to User Card.(usercard)');
            }
            else {
                logger.log('No notes found.(usercard)');
            }
            if(user.tags && user.tags.length > 0) {
                const tagRow = tagRowMaker(user.tags);
                bodyRootEl.appendChild(tagRow);
                logger.log('Tags added to User Card.(usercard)');
            }
            if (followInfo) {
                const followInfoBlock = followInfoBlockMaker(user);
                if (followInfoBlock) {
                    bodyRootEl.appendChild(followInfoBlock);
                    logger.log('Follow info added to User Card.(usercard)');
                }
            }
            if (externalInfo) {
                const externalInfoBlock = externalInfoBlockMaker(user);
                if (externalInfoBlock) {
                    bodyRootEl.appendChild(externalInfoBlock);
                    logger.log('External info added to User Card.(usercard)');
                }
            }

            const footerRootEl = Utils.$child(cardElement, selectors.userCard.footerRoot);
            if (footerRootEl) {
                const btn = document.createElement('div');
                btn.classList.add('ckupnotes-usercard-btn', selectors.markup.idclass.replace(".", ""));
                btn.textContent = '备注';
                btn.style.cursor = 'pointer';
                btn.style.padding = '5px 6px';
                btn.style.borderRadius = '4px';
                btn.style.flex = '1';
                btn.style.textAlign = 'center';
                footerRootEl.appendChild(btn);
                btn.addEventListener('click', () => {
                    const avatarEl = Utils.$child(cardElement, selectors.userCard.avatar);
                    const avatarImgSrc = avatarEl?.getAttribute('src') || null;
                    UPNotesManager.callUIForEditing(uid, displayName, avatarImgSrc);
                });
            }
        } finally {
            if (runtime.cardtaskId === thisCardTaskId) runtime.cardtaskId = null;
        }
    }

    // #endregion onAnyPage

    // #region playpage
    function injectCssOnPlayPage() {
        GM_addStyle(`
            .ckupnotes-play-up-btn {
                margin-left: 2px;
                color: var(--text2);
                font-size: 13px;
                transition: color .3s;
                flex-shrink: 0;
            }
            .ckupnotes-play-up-btn:hover {
                color: var(--brand_blue);
            }
        `);
    }

    function registerOnPlayPage() {
        logger.log('Registering UP Info Box observer on play page...');
        injectCssOnPlayPage();
        Utils.waitForElementFirstAppearForever(selectors.play.upInfoBox).then(onFirstTimeUpInfoBoxShown);
    }

    function onFirstTimeUpInfoBoxShown() {
        logger.log('First UP Info Box appeared on play page.');
        onUpInfoBoxShown();
        Utils.registerOnElementContentChange(
            Utils.$(selectors.play.upInfoBox),
            () => {
                onUpInfoBoxShown();
            }
        );
    }

    async function onUpInfoBoxShown() {
        logger.log('UP Info Box shown on play page.');
        const thisUpTaskId = ('' + Date.now()) + Math.random();
        try {
            runtime.uptaskId = thisUpTaskId;
            await Utils.wait(500); // wait for content load

            if (runtime.uptaskId !== thisUpTaskId) {
                logger.log('A newer UP task has started, aborting this one.(play)');
                return;
            }

            const upInfoBox = Utils.$(selectors.play.upInfoBox);
            const els = Utils.$all(selectors.markup.idclass, upInfoBox);
            els.forEach(element => {
                element.remove();
            });

            const upAvatarLinkEl = Utils.$(selectors.play.upAvatarLink, upInfoBox);
            const link = upAvatarLinkEl?.getAttribute('href') || '';
            const match = link.match(/\/space\.bilibili\.com\/(\d+)/);
            if (!match) return logger.log('UID not found in avatar link, aborting.(play)');
            const uid = match[1];
            logger.log(`Extracted UID: ${uid} (play)`);
            const user = User.fromUID(uid) || {};
            let alias = user.alias || '';
            let notes = user.notes || '';

            logger.log(`UP Info Box Shown - UID: ${uid}, Alias: ${alias}, Notes: ${notes}`);
            
            const upNameEl = Utils.$(selectors.play.upName, upInfoBox);
            const username = upNameEl.textContent || '';
            if (alias) {
                const span = document.createElement('span');
                span.classList.add(selectors.markup.symbolclass.replace(".", ""), selectors.markup.idclass.replace(".", ""));
                span.textContent = ` (${alias})`;
                upNameEl.appendChild(span);
            } else {
                logger.log('No alias found.(play)');
            }

            const upDescEl = Utils.$(selectors.play.upDesc, upInfoBox);
            if (notes) {
                const notesEl = document.createElement('div');
                notesEl.classList.add(selectors.markup.symbolclass.replace(".", ""), selectors.markup.idclass.replace(".", ""));
                notesEl.style.marginTop = '4px';
                notesEl.style.fontStyle = 'italic';
                notesEl.textContent = notes;
                upDescEl.appendChild(notesEl);
                logger.log('Notes added to UP Info Box.(play)');
            } else {
                logger.log('No notes found.(play)');
            }

            const upDetailTopBoxEl = Utils.$(selectors.play.upDetailTopBox, upInfoBox);
            if (upDetailTopBoxEl) {
                const btn = document.createElement('div');
                btn.classList.add('ckupnotes-play-up-btn', selectors.markup.idclass.replace(".", ""));
                btn.textContent = '编辑备注';
                btn.style.cursor = 'pointer';
                btn.style.marginLeft = '8px';
                upDetailTopBoxEl.appendChild(btn);
                btn.addEventListener('click', () => {
                    const upAvatarImgEl = Utils.$(selectors.play.upAvatarImg, upInfoBox);
                    const avatarImgSrc = upAvatarImgEl?.getAttribute('src') || null;
                    UPNotesManager.callUIForEditing(uid, username, avatarImgSrc, ()=>onUpInfoBoxShown());
                });
            }

            const subButton = Utils.$(selectors.play.subBtn, upInfoBox);
            if (subButton) {
                logger.log('Registering follow/unfollow button listener on play page.');
                subButton.removeEventListener('click', onSubBtn);
                subButton.addEventListener('click', onSubBtn);
            } else {
                logger.log('Follow/unfollow button not found, cannot register listener.(play)');
            }

            if (!Utils.$(".ckupnote-upinfo-probe", upInfoBox)) {
                logger.log('Creating probe element for UP Info Box reset detection.(play)');
                const probe = document.createElement('span');
                probe.style.display = 'none';
                probe.classList.add("ckupnote-upinfo-probe");
                upInfoBox.appendChild(probe);
                if(!Utils.registerOnceElementRemoved(probe, () => {
                    logger.log('Element reset, re-triggering up info box processing.(play)');
                    Utils.wait(500).then(() => onUpInfoBoxShown());
                }, document.body)) {
                    logger.log('Probe create failed: element already been removed.(play)');
                } else logger.log('Probe created', probe);
            } else {
                logger.log('Probe element already exists, no need to create.(play)');
            }
        } catch (e) {
            logger.error('Error occurred while processing UP Info Box on play page:', e);
        } finally {
            if (runtime.uptaskId === thisUpTaskId) runtime.uptaskId = null;
        }
    }

    async function onSubBtn(event) {
        logger.log('Follow/Unfollow button clicked on play page.');
        await Utils.wait(500);
        try {
            const upInfoBox = Utils.$(selectors.play.upInfoBox);
            const upAvatarLinkEl = Utils.$(selectors.play.upAvatarLink, upInfoBox);
            const link = upAvatarLinkEl?.getAttribute('href') || '';
            const match = link.match(/\/space\.bilibili\.com\/(\d+)/);
            if (!match) return logger.log('UID not found in avatar link, aborting.(play)');
            const uid = match[1];
            logger.log(`Extracted UID: ${uid} (play)`);
            const user = User.fromUID(uid) || {};
            let notes = user.notes || '';
            const upNameEl = Utils.$(selectors.play.upName, upInfoBox);
            let username = upNameEl.textContent || '?';
            username = username?.trim?.() || username;
            user.uname = username;
            const vidNameEl = Utils.$(selectors.play.videoTitle);
            let vidName = vidNameEl?.textContent || '?';
            vidName = vidName?.trim?.() || vidName;
            // const formatedDate = (Intl.DateTimeFormat('zh-CN', {
            //     year: 'numeric',
            //     month: '2-digit',
            //     day: '2-digit',
            //     hour: '2-digit',
            //     minute: '2-digit',
            //     hour12: false,
            // }).format(new Date())).replace(/\//g, '-').replace(',', '');
            const subBtn = Utils.$(selectors.play.subBtn, upInfoBox);
            if (subBtn) {
                logger.log('Processing follow/unfollow action on play page.');
                if (subBtn.classList.contains('following')) {
                    // just followed
                    // UPNotesManager.setNotesForUID(uid,
                    //     (notes ? notes + '\n' : '') + `[${formatedDate}] 在《${vidName}》关注了 "${username}"`
                    // );

                    user.setFollowInfo({
                        timestamp: "" + (+new Date()),
                        videoName: vidName,
                        videoId: Utils.currentVID || '',
                        upName: username,
                        
                    });
                    user.save();
                    Utils.ui?.success(`关注操作已记录到 ${username} 的备注`);
                } else if (subBtn.classList.contains('not-follow')) {
                    // just unfollowed
                    // not supported
                } else {
                    logger.log('Follow button state unrecognized, no action taken.(play)');
                }
            }
        } finally { }
    }

    // #endregion playpage

    // #region userprofilepage

    function injectCssOnUserProfilePage() {
        GM_addStyle(`
            .ckupnotes-profile-aside-card {
                background-color: var(--bg2);
                border-radius: 6px;
                width: 100%;
                padding: 20px 16px 24px;
            }
            .ckupnotes-profile-aside-card-line{
                margin: 4px 0;
            }
            .ckupnotes-profile-aside-card-button{
                width: 100%;
                margin-top: 12px;
                padding: 4px 0;
                border: 1px solid var(--text3);
                color: var(--text2);
                background-color: transparent;
                cursor: pointer;
                border-radius: 4px;
            }
            .ckupnotes-profile-aside-card-button:hover{
                color: var(--brand_blue);
                border-color: var(--brand_blue);
            }
        `);
    }

    function registerOnUserProfilePage() {
        logger.log('Registering User Profile Page observer...');
        injectCssOnUserProfilePage();
        Utils.waitForElementFirstAppearForever(selectors.profile.sidebarBox).then(injectOnSidebarBox);
        Utils.waitForElementFirstAppearForever(selectors.profile.dynamicSidebarBox).then(injectOnDynamicSidebarBox);
    }

    async function injectOnSidebarBox(sidebarBox) {
        logger.log('User Profile Page sidebar box appeared.');
        await Utils.wait(200); // wait for content load
        const uid = Utils.currentUid;
        if (!uid) {
            logger.warn('Cannot extract UID on profile page, aborting.');
            return;
        }
        const user = User.fromUID(uid) || {};
        const alias = user.alias || '';
        const notes = user.notes || '';
        const followInfo = user.followInfo || null;
        const externalInfo = user.externalInfo || null;
        const username = Utils.$('div.nickname')?.textContent || '';

        const existingCard = Utils.$('.ckupnotes-profile-aside-card', sidebarBox);
        if (existingCard) {
            existingCard.remove();
        }

        const card = document.createElement('div');
        card.classList.add('ckupnotes-profile-aside-card');

        const title = document.createElement('div');
        title.textContent = 'UP 备注信息';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'bold';
        card.appendChild(title);

        const aliasLine = document.createElement('div');
        aliasLine.classList.add('ckupnotes-profile-aside-card-line');
        aliasLine.textContent = `别名: ${alias || '无'}`;
        card.appendChild(aliasLine);

        const notesLine = document.createElement('div');
        notesLine.classList.add('ckupnotes-profile-aside-card-line');
        notesLine.textContent = `备注: ${notes || '无'}`;
        card.appendChild(notesLine);

        if (user.tags && user.tags.length > 0) {
            const tagRow = tagRowMaker(user.tags);
            card.appendChild(tagRow);
        }

        if (followInfo) {
            const followInfoBlock = followInfoBlockMaker(user);
            if (followInfoBlock) {
                card.appendChild(followInfoBlock);
            }
        }

        if (externalInfo) {
            const externalInfoBlock = externalInfoBlockMaker(user);
            if (externalInfoBlock) {
                card.appendChild(externalInfoBlock);
            }
        }

        const editButton = document.createElement('button');
        editButton.classList.add('ckupnotes-profile-aside-card-button');
        editButton.textContent = '编辑备注';
        editButton.addEventListener('click', () => {
            const avatarImgSrc = Utils.$(selectors.profile.avatarImg, sidebarBox)?.getAttribute('src') || '';
            UPNotesManager.callUIForEditing(uid, username, avatarImgSrc, ()=>injectOnSidebarBox(sidebarBox));
        });
        card.appendChild(editButton);

        const wrap = document.createElement('div');
        wrap.classList.add('home-aside-section');
        wrap.appendChild(card);
        sidebarBox.prepend(wrap);
    }

    async function injectOnDynamicSidebarBox(sidebarBox) {
        logger.log('User Profile Page sidebar box appeared.');
        await Utils.wait(200); // wait for content load
        const uid = Utils.currentUid;
        if (!uid) {
            logger.warn('Cannot extract UID on profile page, aborting.');
            return;
        }
        const user = User.fromUID(uid) || {};
        const alias = user.alias || '';
        const notes = user.notes || '';
        const followInfo = user.followInfo || null;
        const externalInfo = user.externalInfo || null;
        const username = Utils.$('div.nickname')?.textContent || '';

        const existingCard = Utils.$('.ckupnotes-profile-aside-card', sidebarBox);
        if (existingCard) {
            existingCard.remove();
        }

        const card = document.createElement('div');
        card.classList.add('ckupnotes-profile-aside-card');

        const title = document.createElement('div');
        title.textContent = 'UP 备注信息';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'bold';
        card.appendChild(title);

        const aliasLine = document.createElement('div');
        aliasLine.classList.add('ckupnotes-profile-aside-card-line');
        aliasLine.textContent = `别名: ${alias || '无'}`;
        card.appendChild(aliasLine);

        const notesLine = document.createElement('div');
        notesLine.classList.add('ckupnotes-profile-aside-card-line');
        notesLine.textContent = `备注: ${notes || '无'}`;
        card.appendChild(notesLine);
        
        if (user.tags && user.tags.length > 0) {
            const tagRow = tagRowMaker(user.tags);
            card.appendChild(tagRow);
        }

        if (followInfo) {
            const followInfoBlock = followInfoBlockMaker(user);
            if (followInfoBlock) {
                card.appendChild(followInfoBlock);
            }
        }

        if (externalInfo) {
            const externalInfoBlock = externalInfoBlockMaker(user);
            if (externalInfoBlock) {
                card.appendChild(externalInfoBlock);
            }
        }

        const editButton = document.createElement('button');
        editButton.classList.add('ckupnotes-profile-aside-card-button');
        editButton.textContent = '编辑备注';
        editButton.addEventListener('click', () => {
            const avatarImgSrc = Utils.$(selectors.profile.avatarImg, sidebarBox)?.getAttribute('src') || '';
            UPNotesManager.callUIForEditing(uid, username, avatarImgSrc, ()=>injectOnDynamicSidebarBox(sidebarBox));
        });
        card.appendChild(editButton);

        const wrap = document.createElement('div');
        wrap.classList.add('dynamic-aside-section');
        wrap.appendChild(card);
        sidebarBox.prepend(wrap);
    }

    // #endregion userprofilepage

    // #region init
    function migrationCheckAndMigrate() {
        logger.log('Checking for old data to migrate...');
        if (migrationCheckV2()) {
            logger.log('Old data detected, starting migration to new format (v2)...');
            Utils.ui?.info('检测到旧版数据，正在进行数据迁移，请稍候...');
            doMigrationV2();
            Utils.ui?.success('迁移成功！');
        }
    }

    function createMenu() {
        GM_registerMenuCommand('UP备注设置', () => {
            openSettings();
        });
    }

    function init() {
        logger.log('Initializing Bilibili UP Notes script...');
        createMenu();
        migrationCheckAndMigrate();

        // 注册任意页面事件
        registerOnAnyPage();

        // 注册播放页面事件
        if (pages.isPlayPage()) {
            registerOnPlayPage();
        }

        // 注册个人主页事件
        if (pages.isProfilePage()) {
            registerOnUserProfilePage();
        }

        try {
            if(typeof(unsafeWindow.FoManPlugins) === 'undefined') {
                unsafeWindow.FoManPlugins = {};
            }
            unsafeWindow.FoManPlugins.UpAlias = {
                provider: FoManPlugin_Provider,
                actions: FoManPlugin_Actions
            }
        }catch(e) {
            logger.error('Failed to register as FoMan plugin:', e);
        }

        Utils.ui?.trackMouseEvent?.();

        unsafeWindow.ckupnotes = {
            settingsWindow: ()=>openSettings(),
        }

        logger.log('Bilibili UP Notes script initialized.');
    }

    init();

    // #endregion init
}) (unsafeWindow,document);
