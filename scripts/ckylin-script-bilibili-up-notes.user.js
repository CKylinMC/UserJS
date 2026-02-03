// ==UserScript==
// @name         Bilibili UP Notes
// @name:zh-CN   哔哩哔哩UP主备注
// @namespace    ckylin-script-bilibili-up-notes
// @version      v0.3
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
// @license      Apache-2.0
// @run-at       document-end
// @icon         https://www.bilibili.com/favicon.ico
// @require https://update.greasyfork.org/scripts/564901/1747744/CKUI.js
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
            upDetailTopBox: 'div.up-detail-top'
        },
        profile: {
            sidebarBox: 'div.aside',
            dynamicSidebarBox: 'div.space-dynamic__right'
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
    }

    // #endregion helpers
    
    // #region cores
    class UPNotesManager {
        static getAliasForUID(uid, fallback = null) {
            return GM_getValue(`upalias_${uid}`, fallback);
        }

        static setAliasForUID(uid, alias) {
            GM_setValue(`upalias_${uid}`, alias);
        }
        
        static deleteAliasForUID(uid) {
            GM_deleteValue(`upalias_${uid}`);
        }

        static getNotesForUID(uid, fallback = null) {
            return GM_getValue(`upnotes_${uid}`, fallback);
        }

        static setNotesForUID(uid, notes) {
            GM_setValue(`upnotes_${uid}`, notes);
        }
        
        static deleteNotesForUID(uid) {
            GM_deleteValue(`upnotes_${uid}`);
        }

        static callUIForEditing(uid, closeCallback = null) {
            const currentAlias = this.getAliasForUID(uid) || '';
            const currentNotes = this.getNotesForUID(uid) || '';
            
            const form = Utils.ui.form()
                .input({ 
                    label: 'UP 别名', 
                    name: 'alias', 
                    placeholder: '请输入 UP 别名', 
                    value: currentAlias 
                })
                .textarea({ 
                    label: 'UP 备注', 
                    name: 'notes', 
                    placeholder: '请输入 UP 备注', 
                    value: currentNotes 
                })
                .button({ 
                    label: '保存', 
                    primary: true,
                    onClick: (values) => {
                        const newAlias = values.alias.trim();
                        const newNotes = values.notes.trim();
                        if (newAlias) {
                            this.setAliasForUID(uid, newAlias);
                        } else {
                            this.deleteAliasForUID(uid);
                        }
                        if (newNotes) {
                            this.setNotesForUID(uid, newNotes);
                        } else {
                            this.deleteNotesForUID(uid);
                        }
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
                title: `编辑 UP 备注 (UID: ${uid})`,
                content: form.render(),
                width: '450px',
                shadow: true
            });
            
            floatWindow.show();
            floatWindow.moveToMouse?.();
        }

        static callUIForRemoving(uid) {
            Utils.ui.confirm(
                `确定要删除 UID 为 ${uid} 的 UP 备注吗？`,'确认删除 UP 备注'
            ).then(res => {
                if (res) {
                    this.deleteAliasForUID(uid);
                    this.deleteNotesForUID(uid);
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
            UPNotesManager.callUIForEditing(uid);
		}
        static async removeFor(uid, displayName = null) {
            UPNotesManager.callUIForRemoving(uid);
		}
    }

    // #endregion integrations

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
            `);
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
            let alias = UPNotesManager.getAliasForUID(uid) || '';
            let notes = UPNotesManager.getNotesForUID(uid) || '';

            logger.log(`UP Card Shown - UID: ${uid}, Alias: ${alias}, Notes: ${notes}`);

            const userNameEl = Utils.$child(cardElement, selectors.card.userName);
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

            const footerRootEl = Utils.$child(cardElement, selectors.card.footerRoot);
            if (footerRootEl) {
                const btn = document.createElement('div');
                btn.classList.add(selectors.card.button.replace("div.", ""), selectors.markup.idclass.replace(".", ""));
                btn.textContent = '编辑备注';
                btn.style.cursor = 'pointer';
                btn.style.marginLeft = '8px';
                footerRootEl.appendChild(btn);
                btn.addEventListener('click', () => {
                    UPNotesManager.callUIForEditing(uid);
                });
            }
        } finally { 
            if(runtime.cardtaskId === thisCardTaskId) runtime.cardtaskId = null;
        }
    }

    async function onModernCardShown() {
        const cardElement = Utils.$(selectors.cardModern.shadowRoot);
        if (!cardElement) return;
        const shadowroot = cardElement.shadowRoot;;
        if (!shadowroot) return;
        const thisCardTaskId = ('' + Date.now()) + Math.random();
        try {
            runtime.cardtaskId = thisCardTaskId;
            await Utils.wait(150); // wait for content load

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

            let alias = UPNotesManager.getAliasForUID(uid) || '';
            let notes = UPNotesManager.getNotesForUID(uid) || '';

            logger.log(`Modern UP Card Shown - UID: ${uid}, Alias: ${alias}, Notes: ${notes}`);

            const userNameEl = Utils.$child(shadowroot, selectors.cardModern.userName);
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

            const footerRootEl = Utils.$child(shadowroot, selectors.cardModern.footerRoot);
            if (footerRootEl) {
                const btn = document.createElement('button');
                btn.classList.add(selectors.markup.idclass.replace(".", ""));
                btn.textContent = '编辑备注';
                btn.style.cursor = 'pointer';
                btn.style.marginLeft = '8px';
                footerRootEl.appendChild(btn);
                btn.addEventListener('click', () => {
                    UPNotesManager.callUIForEditing(uid);
                });
            }
            
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

            logger.log('Processing User Card...(usercard)\n', cardElement.innerHTML);
            
            const userNameLink = Utils.$child(cardElement, selectors.userCard.userName);
            const link = userNameLink?.getAttribute('href') || '';
            const match = link.match(/\/space\.bilibili\.com\/(\d+)/);
            if (!match) return logger.log('UID not found in avatar link, aborting.(usercard)');
            const uid = match[1];
            logger.log(`Extracted UID: ${uid} (usercard)`);
            let alias = UPNotesManager.getAliasForUID(uid) || '';
            let notes = UPNotesManager.getNotesForUID(uid) || '';
            
            logger.log(`User Card Shown - UID: ${uid}, Alias: ${alias}, Notes: ${notes}`);

            const userNameEl = Utils.$child(cardElement, selectors.userCard.userName);
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

            const footerRootEl = Utils.$child(cardElement, selectors.userCard.footerRoot);
            if (footerRootEl) {
                const btn = document.createElement('div');
                btn.classList.add('ckupnotes-usercard-btn', selectors.markup.idclass.replace(".", ""));
                btn.textContent = '编辑备注';
                btn.style.cursor = 'pointer';
                btn.style.padding = '2px 6px';
                footerRootEl.appendChild(btn);
                btn.addEventListener('click', () => {
                    UPNotesManager.callUIForEditing(uid);
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
            await Utils.wait(1000); // wait for content load

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
            let alias = UPNotesManager.getAliasForUID(uid) || '';
            let notes = UPNotesManager.getNotesForUID(uid) || '';

            logger.log(`UP Info Box Shown - UID: ${uid}, Alias: ${alias}, Notes: ${notes}`);
            
            const upNameEl = Utils.$(selectors.play.upName, upInfoBox);
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
                upDetailTopBoxEl.appendChild(btn);
                btn.addEventListener('click', () => {
                    UPNotesManager.callUIForEditing(uid, ()=>onUpInfoBoxShown());
                });
            }
            
        } finally {
            if (runtime.uptaskId === thisUpTaskId) runtime.uptaskId = null;
        }
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
        const alias = UPNotesManager.getAliasForUID(uid) || '';
        const notes = UPNotesManager.getNotesForUID(uid) || '';

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

        const editButton = document.createElement('button');
        editButton.classList.add('ckupnotes-profile-aside-card-button');
        editButton.textContent = '编辑备注';
        editButton.addEventListener('click', () => {
            UPNotesManager.callUIForEditing(uid, ()=>injectOnSidebarBox(sidebarBox));
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
        const alias = UPNotesManager.getAliasForUID(uid) || '';
        const notes = UPNotesManager.getNotesForUID(uid) || '';

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

        const editButton = document.createElement('button');
        editButton.classList.add('ckupnotes-profile-aside-card-button');
        editButton.textContent = '编辑备注';
        editButton.addEventListener('click', () => {
            UPNotesManager.callUIForEditing(uid, ()=>injectOnDynamicSidebarBox(sidebarBox));
        });
        card.appendChild(editButton);

        const wrap = document.createElement('div');
        wrap.classList.add('dynamic-aside-section');
        wrap.appendChild(card);
        sidebarBox.prepend(wrap);
    }

    // #endregion userprofilepage

    // #region init
    function init() {
        logger.log('Initializing Bilibili UP Notes script...');
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

        logger.log('Bilibili UP Notes script initialized.');
    }

    init();

    // #endregion init
}) (unsafeWindow,document);
