// ==UserScript==
// @name         Video Barpic Maker
// @name:zh-CN   视频字幕截图制作工具
// @namespace    ckylin-script-video-barpic-maker
// @version      0.4.2
// @description  A simple script to create video barpics.
// @description:zh-CN 一个可以制作视频字幕截图的工具。
// @author       CKylinMC
// @match        https://*/*
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @license      Apache-2.0
// @run-at       document-end
// @require https://update.greasyfork.org/scripts/564901/1754426/CKUI.js
// ==/UserScript==

if (typeof unsafeWindow === 'undefined' || !unsafeWindow) {
    window.unsafeWindow = window;
}

(function (unsafeWindow, document) {
    if (typeof (GM_addStyle) === 'undefined') {
        unsafeWindow.GM_addStyle = function (css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }
    }
    const logger = {
        log(...args) {
            console.log('[VideoBarpicMaker]', ...args);
        },
        error(...args) {
            console.error('[VideoBarpicMaker]', ...args);
        },
        warn(...args) {
            console.warn('[VideoBarpicMaker]', ...args);
        },
    }

    class Utils{
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
        static downloadBlob(filename, blob) {
            const url = URL.createObjectURL(blob);
            const element = document.createElement('a');
            element.setAttribute('href', url);
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            URL.revokeObjectURL(url);
        }
        static get ui() {
            return unsafeWindow.ckui;
        }
    }
    const Icons = {
        video: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z"/></g></svg>',
        capture: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19 19H5V5h14v14z"/><path d="M3 3h18v18H3z" opacity="0.3"/></svg>',
        captureDown: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18" opacity="0.3"/><circle cx="12" cy="16" r="2"/></svg>',
        captureUp: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18" opacity="0.3"/><circle cx="12" cy="8" r="2"/></svg>',
        settings: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M11 10.27L7 3.34m4 10.39l-4 6.93M12 22v-2m0-18v2m2 8h8m-5 8.66l-1-1.73m1-15.59l-1 1.73M2 12h2m16.66 5l-1.73-1m1.73-9l-1.73 1M3.34 17l1.73-1M3.34 7l1.73 1"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8"/></g></svg>',
        copy: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M16 4h2a2 2 0 0 1 2 2v4m1 4H11"/><path d="m15 10l-4 4l4 4"/></g></svg>',
        save: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7"/></g></svg>',
        trash: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11v6m4-6v6m5-11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        undo: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></g></svg>',
        redo: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m15 14l5-5l-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/></g></svg>',
        image: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></g></svg>',
    };
    class SettingsManager {
        constructor() {
            this.defaults = {
                captureMode: 'adaptive', // 'fixed' or 'adaptive'
                fixedWidth: 1280,
                minWidth: 640,
                maxWidth: 1920,
                topRange: 50,
                topRangeUnit: 'percent', // 'percent' or 'pixel'
                bottomRange: 50,
                bottomRangeUnit: 'percent',
                previewImageWidth: 260, 
                useLayerCapture: false, 
                manualOffsetLeft: 0, 
                manualOffsetTop: 0, 
                enableFloatButton: true, 
                showImageInfo: false,
                saveFormat: 'jpeg', // 'png', 'jpeg', 'webp'
                saveQuality: 0.75, // 0.0 - 1.0
                enabled: true,
                content: '使用 Barpic Maker 制作',
                fontSize: 16,
                textColor: '#333333',
                textAlign: 'right',
                backgroundColor: '#f5f5f5',
                padding: 20,
                containerHeight: 0,
                containerWidth: 0,
                watermarkApplyMode: 'always' // 'copy', 'save', 'always'
            };
            this.settings = this.load();
        }

        load() {
            try {
                const saved = GM_getValue('vbm_settings', null);
                return saved ? { ...this.defaults, ...JSON.parse(saved) } : { ...this.defaults };
            } catch (e) {
                logger.error('Failed to load settings:', e);
                return { ...this.defaults };
            }
        }

        save() {
            try {
                GM_setValue('vbm_settings', JSON.stringify(this.settings));
            } catch (e) {
                logger.error('Failed to save settings:', e);
            }
        }

        get(key) {
            return this.settings[key];
        }

        set(key, value) {
            this.settings[key] = value;
            this.save();
        }
    }
    class CanvasManager {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.history = [];
            this.historyIndex = -1;
            this.firstWidth = null;
        }

        init(width, height) {
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.ctx = this.canvas.getContext('2d');
            }
            this.canvas.width = width;
            this.canvas.height = height;
            this.firstWidth = width;
        }

        appendImage(imageData, targetWidth) {
            if (!this.canvas) {
                this.init(targetWidth, imageData.height);
                this.ctx.putImageData(imageData, 0, 0);
            } else {
                const oldHeight = this.canvas.height;
                const newHeight = oldHeight + imageData.height;
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = imageData.width;
                tempCanvas.height = imageData.height;
                tempCtx.putImageData(imageData, 0, 0);
                const oldImageData = this.ctx.getImageData(0, 0, this.canvas.width, oldHeight);
                this.canvas.height = newHeight;
                this.ctx.putImageData(oldImageData, 0, 0);
                this.ctx.drawImage(tempCanvas, 0, oldHeight, this.canvas.width, imageData.height);
            }
            this.saveState();
        }

        saveState() {
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.history.push({
                width: this.canvas.width,
                height: this.canvas.height,
                data: imageData
            });
            this.historyIndex++;
            if (this.history.length > 20) {
                this.history.shift();
                this.historyIndex--;
            }
        }

        undo() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                const state = this.history[this.historyIndex];
                this.canvas.width = state.width;
                this.canvas.height = state.height;
                this.ctx.putImageData(state.data, 0, 0);
                return true;
            }
            return false;
        }

        redo() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                const state = this.history[this.historyIndex];
                this.canvas.width = state.width;
                this.canvas.height = state.height;
                this.ctx.putImageData(state.data, 0, 0);
                return true;
            }
            return false;
        }

        canUndo() {
            return this.historyIndex > 0;
        }

        canRedo() {
            return this.historyIndex < this.history.length - 1;
        }

        clear() {
            this.canvas = null;
            this.ctx = null;
            this.history = [];
            this.historyIndex = -1;
            this.firstWidth = null;
        }

        toBlob(format = 'png', quality = 0.95) {
            return new Promise(resolve => {
                const mimeType = `image/${format}`;
                this.canvas.toBlob(resolve, mimeType, quality);
            });
        }

        toDataURL(format = 'png', quality = 0.95) {
            const mimeType = `image/${format}`;
            return this.canvas.toDataURL(mimeType, quality);
        }

        async calculateSize(format = 'png', quality = 0.95) {
            if (!this.canvas) return 0;
            const blob = await this.toBlob(format, quality);
            return blob ? blob.size : 0;
        }

        getImageInfo() {
            if (!this.canvas) return null;
            return {
                width: this.canvas.width,
                height: this.canvas.height
            };
        }
    }
    class VideoBarpicMaker {
        constructor() {
            this.settings = new SettingsManager();
            this.canvas = new CanvasManager();
            this.toolbarWindow = null;
            this.toolbarContainer = null;
            this.previewWindow = null;
            this.previewContainer = null;
            this.selectedVideo = null;
            this.isSelectingVideo = false;
            this.highlightOverlay = null;
            this.rangeOverlay = null;
            this.settingsExpanded = false;
            this.displayMediaStream = null; 
            this.infoExpanded = false;
            this.imageInfo = { memorySize: 0, copySize: 0, saveSize: 0, width: 0, height: 0 };
            this.previewDebounceTimer = null;
        }

        init() {
            logger.log('Initializing Video Barpic Maker...');
            GM_registerMenuCommand('📷 打开视频截图工具', () => this.showToolbar());
            if (this.settings.get('enableFloatButton')) {
                this.initFloatButton();
            }
        }
        
        async initFloatButton() {
            if(document.getElementById('CKVIDBARPIC-floatbtn')) return;
            const videoElement = await Utils.waitForElementFirstAppearForeverWithTimeout('video', document, 10000);
            if (!videoElement) {
                logger.log('No video element found within 10 seconds, float button will not be shown');
                return;
            }
            
            logger.log('Video element detected, showing float button');
            
            GM_addStyle(`
            #CKVIDBARPIC-floatbtn{
                display: flex;
                justify-content: center;
                align-items: center;
                box-sizing: border-box;
                z-index: 9999;
                position: fixed;
                left: -15px;
                width: 30px;
                height: 30px;
                background: black;
                opacity: 0.8;
                color: white;
                cursor: pointer;
                border-radius: 50%;
                text-align: right;
                line-height: 24px;
                border: solid 3px #00000000;
                transition: opacity .3s 1s, background .3s, color .3s, left .3s, border .3s;
                top: 120px;
                top: 30vh;
            }
            #CKVIDBARPIC-floatbtn::after,#CKVIDBARPIC-floatbtn::before{
                z-index: 9990;
                content: "视频截图工具";
                pointer-events: none;
                position: fixed;
                left: -20px;
                height: 30px;
                background: black;
                opacity: 0;
                color: white;
                cursor: pointer;
                border-radius: 8px;
                padding: 0 12px;
                text-align: right;
                line-height: 30px;
                transition: all .3s;
                top: 123px;
                top: 30vh;
            }
                
            #CKVIDBARPIC-floatbtn::after{
                content: "← 视频截图工具";
                /*animation: CKVIDBARPIC-tipsOut forwards 5s 3.5s;*/
            }
                
            #CKVIDBARPIC-floatbtn:hover::before{
                left: 30px;
                opacity: 1;
            }
            #CKVIDBARPIC-floatbtn:hover{
                border: solid 3px black;
                transition: opacity .3s 0s, background .3s, color .3s, left .3s, border .3s;
                background: white;
                color: black;
                opacity: 1;
                left: -5px;
            }
            #CKVIDBARPIC-floatbtn.hide{
                left: -40px;
            }
            @keyframes CKVIDBARPIC-tipsOut{
                5%,95%{
                    opacity: 1;
                    left: 20px;
                }
                0%,100%{
                    left: -20px;
                    opacity: 0;
                }
            }
            `,);

            const toggle = document.createElement("div");
            toggle.id = "CKVIDBARPIC-floatbtn";
            toggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block;"><circle cx="12" cy="12" r="3"/><path d="M19 19H5V5h14v14z"/><path d="M3 3h18v18H3z" opacity="0.3"/></svg>`;
            toggle.onclick = () => this.showToolbar();
            document.body.appendChild(toggle);
        }
        checkLayerCaptureSupport() {
            return !!(navigator.mediaDevices && 
                     navigator.mediaDevices.getDisplayMedia && 
                     window.ImageCapture);
        }
        detectBrowserUIOffset() {
            const dpr = window.devicePixelRatio || 1;
            const manualLeft = this.settings.get('manualOffsetLeft') || 0;
            const manualTop = this.settings.get('manualOffsetTop') || 0;
            
            if (manualLeft !== 0 || manualTop !== 0) {
                logger.log('Using manual offset:', { left: manualLeft, top: manualTop });
                return {
                    left: manualLeft,
                    top: manualTop,
                    hasSignificantOffset: true,
                    isManual: true
                };
            }
            const widthDiff = window.outerWidth - window.innerWidth;
            const heightDiff = window.outerHeight - window.innerHeight;
            const leftOffset = Math.max(0, widthDiff);
            const topOffset = Math.max(0, heightDiff - 100); // Subtract typical title bar
            
            const hasSignificantOffset = leftOffset > 10 || topOffset > 50;
            
            logger.log('Browser UI offset detected:', {
                widthDiff,
                heightDiff,
                leftOffset,
                topOffset,
                hasSignificantOffset,
                dpr
            });
            
            return {
                left: leftOffset,
                top: topOffset,
                hasSignificantOffset,
                isManual: false
            };
        }

        showToolbar() {
            if (this.toolbarWindow) {
                return;
            }

            this.toolbarContainer = this.createToolbar();
            this.toolbarWindow = Utils.ui.floatWindow({
                title: '视频截图工具',
                content: this.toolbarContainer,
                width: "500px",
                position: { x: 100, y: 100 },
                shadow: true,
                onClose: () => {
                    this.cleanup();
                    this.toolbarWindow = null;
                    this.toolbarContainer = null;
                }
            });
            this.toolbarWindow.show();
            logger.log('Toolbar shown');
        }

        createToolbar() {
            const container = document.createElement('div');
            container.style.cssText = 'display: flex; flex-direction: column; gap: 12px; min-width: 400px';
            const videoSection = document.createElement('div');
            videoSection.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <button class="ckui-btn ckui-btn-primary" id="vbm-select-video" style="flex: 1;">
                        ${Icons.video}
                        <span style="margin-left: 6px;">选择视频</span>
                    </button>
                    <div id="vbm-video-status" style="flex: 1; font-size: 12px; color: var(--ckui-text-secondary);">
                        未选择视频
                    </div>
                </div>
            `;
            container.appendChild(videoSection);
            const captureSection = document.createElement('div');
            captureSection.id = 'vbm-capture-section';
            captureSection.style.display = 'none';
            captureSection.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <button class="ckui-btn" id="vbm-capture-full" style="display: flex; flex-direction: column; align-items: center; height: auto; padding: 10px;">
                        ${Icons.capture}
                        <span style="font-size: 11px; margin-top: 4px;">全图</span>
                    </button>
                    <button class="ckui-btn" id="vbm-capture-bottom" style="display: flex; flex-direction: column; align-items: center; height: auto; padding: 10px;">
                        ${Icons.captureDown}
                        <span style="font-size: 11px; margin-top: 4px;">下部分</span>
                    </button>
                    <button class="ckui-btn" id="vbm-capture-top" style="display: flex; flex-direction: column; align-items: center; height: auto; padding: 10px;">
                        ${Icons.captureUp}
                        <span style="font-size: 11px; margin-top: 4px;">上部分</span>
                    </button>
                </div>
            `;
            container.appendChild(captureSection);
            const settingsBtn = document.createElement('button');
            settingsBtn.className = 'ckui-btn';
            settingsBtn.id = 'vbm-settings-toggle';
            settingsBtn.innerHTML = `${Icons.settings} <span style="margin-left: 6px;">设置</span>`;
            settingsBtn.style.width = '100%';
            container.appendChild(settingsBtn);
            const settingsPanel = document.createElement('div');
            settingsPanel.id = 'vbm-settings-panel';
            settingsPanel.style.display = 'none';
            settingsPanel.appendChild(this.createSettingsPanel());
            container.appendChild(settingsPanel);
            const divider = document.createElement('div');
            divider.className = 'ckui-divider';
            container.appendChild(divider);
            const actionsSection = document.createElement('div');
            actionsSection.id = 'vbm-actions-section';
            actionsSection.style.display = 'none';
            actionsSection.innerHTML = `
                <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                    <button class="ckui-btn" id="vbm-undo" disabled title="撤销">
                        ${Icons.undo}
                    </button>
                    <span id="vbm-undo-count" style="font-size: 11px; color: var(--ckui-text-muted); min-width: 20px;">0</span>
                    <button class="ckui-btn" id="vbm-redo" disabled title="重做">
                        ${Icons.redo}
                    </button>
                    <span id="vbm-redo-count" style="font-size: 11px; color: var(--ckui-text-muted); min-width: 20px;">0</span>
                    <div style="flex: 1;"></div>
                    <button class="ckui-btn ckui-btn-success" id="vbm-copy" disabled title="复制到剪贴板">
                        ${Icons.copy}
                    </button>
                    <button class="ckui-btn ckui-btn-primary" id="vbm-save" disabled title="保存文件">
                        ${Icons.save}
                    </button>
                    <button class="ckui-btn ckui-btn-danger" id="vbm-clear" disabled title="清空重来">
                        ${Icons.trash}
                    </button>
                </div>
            `;
            container.appendChild(actionsSection);
            if (this.settings.get('showImageInfo')) {
                const infoBtn = document.createElement('button');
                infoBtn.className = 'ckui-btn';
                infoBtn.id = 'vbm-info-toggle';
                infoBtn.innerHTML = `${Icons.image} <span style="margin-left: 6px;vertical-align: super;">图片信息</span>`;
                infoBtn.style.width = '100%';
                infoBtn.style.display = 'none';
                container.appendChild(infoBtn);

                const infoPanel = document.createElement('div');
                infoPanel.id = 'vbm-info-panel';
                infoPanel.style.display = 'none';
                infoPanel.innerHTML = `
                    <div style="padding: 12px; background: var(--ckui-bg-secondary); border-radius: var(--ckui-radius); margin-top: 8px; font-size: 12px;">
                        <div style="margin-bottom: 8px;">
                            <strong>尺寸：</strong><span id="vbm-info-dimensions">-</span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>内存格式：</strong>PNG | <strong>大小：</strong><span id="vbm-info-memory">-</span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>复制：</strong>PNG | <strong>大小：</strong><span id="vbm-info-copy">-</span>
                        </div>
                        <div>
                            <strong>保存格式：</strong><span id="vbm-info-save-format">-</span> | <strong>大小：</strong><span id="vbm-info-save">-</span>
                        </div>
                    </div>
                `;
                container.appendChild(infoPanel);
            }
            setTimeout(() => this.bindToolbarEvents(container), 0);

            return container;
        }

        createCaptureSettings() {
            const settings = this.settings;
            const div = document.createElement('div');
            div.style.cssText = 'padding: 12px;';
            div.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <label class="ckui-label">画布宽度模式</label>
                    <select class="ckui-select" id="vbm-capture-mode">
                        <option value="fixed" ${settings.get('captureMode') === 'fixed' ? 'selected' : ''}>固定宽度</option>
                        <option value="adaptive" ${settings.get('captureMode') === 'adaptive' ? 'selected' : ''}>自适应宽度</option>
                    </select>
                </div>
                <div id="vbm-fixed-width-container" style="margin-bottom: 12px;${settings.get('captureMode') !== 'fixed' ? ' display:none;' : ''}">
                    <label class="ckui-label">固定宽度(px)</label>
                    <input type="number" class="ckui-input" id="vbm-fixed-width" value="${settings.get('fixedWidth')}" min="100" max="3840">
                </div>
                <div id="vbm-adaptive-width-container" style="margin-bottom: 12px;${settings.get('captureMode') !== 'adaptive' ? ' display:none;' : ''}">
                    <label class="ckui-label">自适应宽度范围(px)</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 12px; color: var(--ckui-text-secondary); display: block; margin-bottom: 4px;">最小宽度</label>
                            <input type="number" class="ckui-input" id="vbm-min-width" value="${settings.get('minWidth')}" min="100" max="3840">
                        </div>
                        <div>
                            <label style="font-size: 12px; color: var(--ckui-text-secondary); display: block; margin-bottom: 4px;">最大宽度</label>
                            <input type="number" class="ckui-input" id="vbm-max-width" value="${settings.get('maxWidth')}" min="100" max="3840">
                        </div>
                    </div>
                    <div style="font-size: 11px; color: var(--ckui-text-muted); margin-top: 4px;">
                        第一张截图宽度在此范围内时使用原宽度，否则限制到边界
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <label class="ckui-label">预览图片宽度(px)</label>
                    <input type="number" class="ckui-input" id="vbm-preview-width" value="${settings.get('previewImageWidth')}" min="100" max="800">
                </div>
                <div style="margin-bottom: 12px;">
                    <label class="ckui-label">上部分截图范围</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="number" class="ckui-input" id="vbm-top-range" value="${settings.get('topRange')}" min="1" style="flex: 1;">
                        <select class="ckui-select" id="vbm-top-range-unit" style="width: 100px;">
                            <option value="percent" ${settings.get('topRangeUnit') === 'percent' ? 'selected' : ''}>百分比%</option>
                            <option value="pixel" ${settings.get('topRangeUnit') === 'pixel' ? 'selected' : ''}>像素px</option>
                        </select>
                    </div>
                </div>
                <div style="margin-bottom: 0;">
                    <label class="ckui-label">下部分截图范围</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="number" class="ckui-input" id="vbm-bottom-range" value="${settings.get('bottomRange')}" min="1" style="flex: 1;">
                        <select class="ckui-select" id="vbm-bottom-range-unit" style="width: 100px;">
                            <option value="percent" ${settings.get('bottomRangeUnit') === 'percent' ? 'selected' : ''}>百分比%</option>
                            <option value="pixel" ${settings.get('bottomRangeUnit') === 'pixel' ? 'selected' : ''}>像素px</option>
                        </select>
                    </div>
                </div>
            `;
            return div;
        }

        createSaveSettings() {
            const settings = this.settings;
            const div = document.createElement('div');
            div.style.cssText = 'padding: 12px;';
            div.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <label class="ckui-label">图片格式</label>
                    <select class="ckui-select" id="vbm-save-format">
                        <option value="png" ${settings.get('saveFormat') === 'png' ? 'selected' : ''}>PNG</option>
                        <option value="jpeg" ${settings.get('saveFormat') === 'jpeg' ? 'selected' : ''}>JPEG</option>
                        <option value="webp" ${settings.get('saveFormat') === 'webp' ? 'selected' : ''}>WebP</option>
                    </select>
                </div>
                <div style="margin-bottom: 0;">
                    <label class="ckui-label">图片质量 (%)</label>
                    <input type="number" class="ckui-input" id="vbm-save-quality" value="${Math.round(settings.get('saveQuality') * 100)}" min="1" max="100" step="1">
                    <div style="font-size: 11px; color: var(--ckui-text-muted); margin-top: 4px;">
                        PNG 格式质量参数无效，JPEG 和 WebP 格式范围为 1-100
                    </div>
                </div>
            `;
            return div;
        }

        createExperimentalSettings() {
            const settings = this.settings;
            const div = document.createElement('div');
            div.style.cssText = 'padding: 12px;';
            div.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <label class="ckui-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="vbm-use-layer-capture" ${settings.get('useLayerCapture') ? 'checked' : ''} style="cursor: pointer;">
                        <span>叠层截图模式（捕获浮层）</span>
                        <span style="font-size: 10px; padding: 2px 6px; background: var(--ckui-warning); color: white; border-radius: 3px; margin-left: 4px;">实验性</span>
                    </label>
                    <div style="font-size: 11px; color: var(--ckui-text-muted); margin-top: 4px; padding-left: 24px;">
                        启用后将使用屏幕捕获API，可以截取视频上的弹幕、控制栏等浮层内容。首次使用时需要授权。
                    </div>
                </div>
                <div id="vbm-manual-offset-container" style="margin-bottom: 0;${!settings.get('useLayerCapture') ? ' display:none;' : ''}">
                    <label class="ckui-label">DisplayMedia 手动偏移补偿</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 12px; color: var(--ckui-text-secondary); display: block; margin-bottom: 4px;">左偏移(px)</label>
                            <input type="number" class="ckui-input" id="vbm-offset-left" value="${settings.get('manualOffsetLeft')}" ${!settings.get('useLayerCapture') ? 'disabled' : ''}>
                        </div>
                        <div>
                            <label style="font-size: 12px; color: var(--ckui-text-secondary); display: block; margin-bottom: 4px;">上偏移(px)</label>
                            <input type="number" class="ckui-input" id="vbm-offset-top" value="${settings.get('manualOffsetTop')}" ${!settings.get('useLayerCapture') ? 'disabled' : ''}>
                        </div>
                    </div>
                    <div style="font-size: 11px; color: var(--ckui-text-muted); margin-top: 4px;">
                        手动设置偏移值以修正 DisplayMedia 截图位置偏差
                    </div>
                </div>
            `;
            return div;
        }

        createOtherSettings() {
            const settings = this.settings;
            const div = document.createElement('div');
            div.style.cssText = 'padding: 12px;';
            div.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <label class="ckui-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="vbm-enable-float-button" ${settings.get('enableFloatButton') ? 'checked' : ''} style="cursor: pointer;">
                        <span>启用页面浮动按钮</span>
                    </label>
                    <div style="font-size: 11px; color: var(--ckui-text-muted); margin-top: 4px; padding-left: 24px;">
                        在页面上显示一个浮动按钮，方便快速打开工具
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <label class="ckui-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="vbm-show-image-info" ${settings.get('showImageInfo') ? 'checked' : ''} style="cursor: pointer;">
                        <span>显示截图信息</span>
                    </label>
                    <div style="font-size: 11px; color: var(--ckui-text-muted); margin-top: 4px; padding-left: 24px;">
                        显示图片信息按钮并计算截图大小和分辨率（关闭可提升截图速度）
                    </div>
                </div>
                <div style="margin-bottom: 0;">
                    <label class="ckui-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="vbm-enable-watermark" ${settings.get('enabled') ? 'checked' : ''} style="cursor: pointer;">
                        <span>启用文字水印</span>
                    </label>
                    <div style="font-size: 11px; color: var(--ckui-text-muted); margin-top: 4px; padding-left: 24px;">
                        在图片末尾添加自定义文字内容
                    </div>
                </div>
                <div id="vbm-watermark-settings" style="margin-top: 12px; padding: 12px; background: var(--ckui-bg-tertiary); border-radius: var(--ckui-radius); display: ${settings.get('enabled') ? 'block' : 'none'};">
                    <div style="margin-bottom: 12px;">
                        <label class="ckui-label">文本内容</label>
                        <textarea class="ckui-input" id="vbm-watermark-content" rows="3" style="resize: vertical; font-family: monospace;">${this.escapeHtml(settings.get('content'))}</textarea>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label class="ckui-label">何时附加水印</label>
                        <select class="ckui-select" id="vbm-watermark-apply-mode">
                            <option value="always" ${settings.get('watermarkApplyMode') === 'always' ? 'selected' : ''}>总是添加</option>
                            <option value="copy" ${settings.get('watermarkApplyMode') === 'copy' ? 'selected' : ''}>仅复制时</option>
                            <option value="save" ${settings.get('watermarkApplyMode') === 'save' ? 'selected' : ''}>仅保存时</option>
                        </select>
                        <div style="font-size: 11px; color: var(--ckui-text-muted); margin-top: 4px;">
                            选择在何种操作时添加水印到图片中
                        </div>
                    </div>
                    <div id="vbm-watermark-text-settings">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                            <div>
                                <label class="ckui-label" style="font-size: 12px;">字体大小(px)</label>
                                <input type="number" class="ckui-input" id="vbm-watermark-fontsize" value="${settings.get('fontSize')}" min="8" max="100">
                            </div>
                            <div>
                                <label class="ckui-label" style="font-size: 12px;">文字颜色</label>
                                <input type="color" class="ckui-input" id="vbm-watermark-color" value="${settings.get('textColor')}" style="height: 36px;">
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                            <div>
                                <label class="ckui-label" style="font-size: 12px;">文字对齐</label>
                                <select class="ckui-select" id="vbm-watermark-align">
                                    <option value="left" ${settings.get('textAlign') === 'left' ? 'selected' : ''}>左对齐</option>
                                    <option value="center" ${settings.get('textAlign') === 'center' ? 'selected' : ''}>居中</option>
                                    <option value="right" ${settings.get('textAlign') === 'right' ? 'selected' : ''}>右对齐</option>
                                </select>
                            </div>
                            <div>
                                <label class="ckui-label" style="font-size: 12px;">背景颜色</label>
                                <input type="color" class="ckui-input" id="vbm-watermark-bgcolor" value="${settings.get('backgroundColor')}" style="height: 36px;">
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                            <div>
                                <label class="ckui-label" style="font-size: 12px;">内边距(px)</label>
                                <input type="number" class="ckui-input" id="vbm-watermark-padding" value="${settings.get('padding')}" min="0" max="200">
                            </div>
                            <div>
                                <label class="ckui-label" style="font-size: 12px;">高度(px, 0=自动)</label>
                                <input type="number" class="ckui-input" id="vbm-watermark-height" value="${settings.get('containerHeight')}" min="0" max="1000">
                            </div>
                            <div>
                                <label class="ckui-label" style="font-size: 12px;">宽度(px, 0=100%)</label>
                                <input type="number" class="ckui-input" id="vbm-watermark-width" value="${settings.get('containerWidth')}" min="0" max="5000">
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 12px;">
                        <label class="ckui-label">预览效果</label>
                        <div id="vbm-watermark-preview-container" style="border: 1px solid var(--ckui-border-color); border-radius: var(--ckui-radius); padding: 8px; background: white; max-height: 300px; overflow: auto; min-height: 60px; display: flex; align-items: center; justify-content: center; color: var(--ckui-text-muted);">
                            水印预览区域
                        </div>
                    </div>
                </div>
            `;
            return div;
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        createSettingsPanel() {
            const tabs = Utils.ui.tabs({
                tabs: [
                    { label: '📷 截图', content: this.createCaptureSettings() },
                    { label: ' 保存', content: this.createSaveSettings() },
                    { label: '🧪 实验', content: this.createExperimentalSettings() },
                    { label: '⚙️ 其他', content: this.createOtherSettings() }
                ],
                style: 'pills'
            });
            
            const container = document.createElement('div');
            container.style.cssText = 'background: var(--ckui-bg-secondary); border-radius: var(--ckui-radius); margin-top: 8px;';
            container.appendChild(tabs.render());
            return container;
        }

        bindToolbarEvents(container) {
            const selectBtn = container.querySelector('#vbm-select-video');
            selectBtn?.addEventListener('click', () => this.startVideoSelection());
            const captureFull = container.querySelector('#vbm-capture-full');
            const captureBottom = container.querySelector('#vbm-capture-bottom');
            const captureTop = container.querySelector('#vbm-capture-top');

            captureFull?.addEventListener('click', () => this.captureVideo('full'));
            captureBottom?.addEventListener('click', () => this.captureVideo('bottom'));
            captureTop?.addEventListener('click', () => this.captureVideo('top'));
            const settingsToggle = container.querySelector('#vbm-settings-toggle');
            const settingsPanel = container.querySelector('#vbm-settings-panel');
            settingsToggle?.addEventListener('click', () => {
                this.settingsExpanded = !this.settingsExpanded;
                settingsPanel.style.display = this.settingsExpanded ? 'block' : 'none';
            });
            const captureModeSelect = container.querySelector('#vbm-capture-mode');
            const fixedWidthContainer = container.querySelector('#vbm-fixed-width-container');
            const adaptiveWidthContainer = container.querySelector('#vbm-adaptive-width-container');
            const fixedWidthInput = container.querySelector('#vbm-fixed-width');
            const minWidthInput = container.querySelector('#vbm-min-width');
            const maxWidthInput = container.querySelector('#vbm-max-width');
            const topRangeInput = container.querySelector('#vbm-top-range');
            const topRangeUnit = container.querySelector('#vbm-top-range-unit');
            const bottomRangeInput = container.querySelector('#vbm-bottom-range');
            const bottomRangeUnit = container.querySelector('#vbm-bottom-range-unit');

            captureModeSelect?.addEventListener('change', (e) => {
                this.settings.set('captureMode', e.target.value);
                fixedWidthContainer.style.display = e.target.value === 'fixed' ? 'block' : 'none';
                adaptiveWidthContainer.style.display = e.target.value === 'adaptive' ? 'block' : 'none';
            });

            fixedWidthInput?.addEventListener('change', (e) => {
                this.settings.set('fixedWidth', parseInt(e.target.value) || 1280);
            });

            minWidthInput?.addEventListener('change', (e) => {
                this.settings.set('minWidth', parseInt(e.target.value) || 640);
            });

            maxWidthInput?.addEventListener('change', (e) => {
                this.settings.set('maxWidth', parseInt(e.target.value) || 1920);
            });

            const previewWidthInput = container.querySelector('#vbm-preview-width');
            previewWidthInput?.addEventListener('change', (e) => {
                this.settings.set('previewImageWidth', parseInt(e.target.value) || 260);
                this.updatePreview(); // Update preview with new width
            });

            topRangeInput?.addEventListener('input', (e) => {
                this.settings.set('topRange', parseInt(e.target.value) || 50);
                this.showRangePreview('top');
            });

            topRangeUnit?.addEventListener('change', (e) => {
                this.settings.set('topRangeUnit', e.target.value);
                this.showRangePreview('top');
            });

            bottomRangeInput?.addEventListener('input', (e) => {
                this.settings.set('bottomRange', parseInt(e.target.value) || 50);
                this.showRangePreview('bottom');
            });

            bottomRangeUnit?.addEventListener('change', (e) => {
                this.settings.set('bottomRangeUnit', e.target.value);
                this.showRangePreview('bottom');
            });
            const layerCaptureCheckbox = container.querySelector('#vbm-use-layer-capture');
            const manualOffsetContainer = container.querySelector('#vbm-manual-offset-container');
            const offsetLeftInput = container.querySelector('#vbm-offset-left');
            const offsetTopInput = container.querySelector('#vbm-offset-top');
            
            layerCaptureCheckbox?.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                if (enabled && !this.checkLayerCaptureSupport()) {
                    e.target.checked = false;
                    Utils.ui.notify({
                        type: 'error',
                        title: '不支持',
                        message: '您的浏览器不支持叠层截图功能，需要 Chrome/Edge 90+ 或 Firefox 90+',
                        shadow: true,
                        duration: 5000
                    });
                    return;
                }
                
                this.settings.set('useLayerCapture', enabled);
                if (manualOffsetContainer) {
                    manualOffsetContainer.style.display = enabled ? 'block' : 'none';
                }
                if (offsetLeftInput) {
                    offsetLeftInput.disabled = !enabled;
                }
                if (offsetTopInput) {
                    offsetTopInput.disabled = !enabled;
                }
                
                if (enabled) {
                    Utils.ui.notify({
                        type: 'info',
                        title: '叠层截图已启用',
                        message: '下次截图时会弹出授权窗口，请选择当前标签页',
                        shadow: true,
                        duration: 4000
                    });
                }
            });
            offsetLeftInput?.addEventListener('change', (e) => {
                this.settings.set('manualOffsetLeft', parseInt(e.target.value) || 0);
            });
            
            offsetTopInput?.addEventListener('change', (e) => {
                this.settings.set('manualOffsetTop', parseInt(e.target.value) || 0);
            });
            const floatButtonCheckbox = container.querySelector('#vbm-enable-float-button');
            floatButtonCheckbox?.addEventListener('change', (e) => {
                this.settings.set('enableFloatButton', e.target.checked);
                
                if (e.target.checked) {
                    Utils.ui.notify({
                        type: 'info',
                        title: '浮动按钮已启用',
                        message: '刷新页面后生效',
                        shadow: true,
                        duration: 3000
                    });
                } else {
                    Utils.ui.notify({
                        type: 'info',
                        title: '浮动按钮已禁用',
                        message: '刷新页面后生效',
                        shadow: true,
                        duration: 3000
                    });
                }
            });

            const showImageInfoCheckbox = container.querySelector('#vbm-show-image-info');
            showImageInfoCheckbox?.addEventListener('change', (e) => {
                this.settings.set('showImageInfo', e.target.checked);
                
                if (e.target.checked) {
                    Utils.ui.notify({
                        type: 'info',
                        title: '截图信息已启用',
                        message: '重新打开工具窗口后生效',
                        shadow: true,
                        duration: 3000
                    });
                } else {
                    Utils.ui.notify({
                        type: 'info',
                        title: '截图信息已禁用',
                        message: '重新打开工具窗口后生效',
                        shadow: true,
                        duration: 3000
                    });
                }
            });
            const watermarkCheckbox = container.querySelector('#vbm-enable-watermark');
            const watermarkSettings = container.querySelector('#vbm-watermark-settings');
            watermarkCheckbox?.addEventListener('change', (e) => {
                this.settings.set('enabled', e.target.checked);
                watermarkSettings.style.display = e.target.checked ? 'block' : 'none';
                if (e.target.checked) {
                    this.debouncedPreviewWatermark();
                }
            });

            const watermarkContent = container.querySelector('#vbm-watermark-content');
            watermarkContent?.addEventListener('input', (e) => {
                this.settings.set('content', e.target.value);
                this.debouncedPreviewWatermark();
            });

            const watermarkApplyMode = container.querySelector('#vbm-watermark-apply-mode');
            watermarkApplyMode?.addEventListener('change', (e) => {
                this.settings.set('watermarkApplyMode', e.target.value);
            });

            const fontSize = container.querySelector('#vbm-watermark-fontsize');
            fontSize?.addEventListener('input', (e) => {
                this.settings.set('fontSize', parseInt(e.target.value) || 16);
                this.debouncedPreviewWatermark();
            });

            const textColor = container.querySelector('#vbm-watermark-color');
            textColor?.addEventListener('input', (e) => {
                this.settings.set('textColor', e.target.value);
                this.debouncedPreviewWatermark();
            });

            const textAlign = container.querySelector('#vbm-watermark-align');
            textAlign?.addEventListener('change', (e) => {
                this.settings.set('textAlign', e.target.value);
                this.debouncedPreviewWatermark();
            });

            const bgColor = container.querySelector('#vbm-watermark-bgcolor');
            bgColor?.addEventListener('input', (e) => {
                this.settings.set('backgroundColor', e.target.value);
                this.debouncedPreviewWatermark();
            });

            const padding = container.querySelector('#vbm-watermark-padding');
            padding?.addEventListener('input', (e) => {
                this.settings.set('padding', parseInt(e.target.value) || 20);
                this.debouncedPreviewWatermark();
            });

            const height = container.querySelector('#vbm-watermark-height');
            height?.addEventListener('input', (e) => {
                this.settings.set('containerHeight', parseInt(e.target.value) || 0);
                this.debouncedPreviewWatermark();
            });

            const width = container.querySelector('#vbm-watermark-width');
            width?.addEventListener('input', (e) => {
                this.settings.set('containerWidth', parseInt(e.target.value) || 0);
                this.debouncedPreviewWatermark();
            });
            if (this.settings.get('enabled')) {
                setTimeout(() => this.previewWatermark(), 100);
            }

            const saveFormatSelect = container.querySelector('#vbm-save-format');
            saveFormatSelect?.addEventListener('change', (e) => {
                this.settings.set('saveFormat', e.target.value);
                if (this.settings.get('showImageInfo')) {
                    this.updateImageInfo();
                }
            });

            const saveQualityInput = container.querySelector('#vbm-save-quality');
            saveQualityInput?.addEventListener('change', (e) => {
                const quality = Math.max(1, Math.min(100, parseInt(e.target.value) || 95));
                e.target.value = quality;
                this.settings.set('saveQuality', quality / 100);
                if (this.settings.get('showImageInfo')) {
                    this.updateImageInfo();
                }
            });

            const undoBtn = container.querySelector('#vbm-undo');
            const redoBtn = container.querySelector('#vbm-redo');
            const copyBtn = container.querySelector('#vbm-copy');
            const saveBtn = container.querySelector('#vbm-save');
            const clearBtn = container.querySelector('#vbm-clear');

            undoBtn?.addEventListener('click', () => this.undo());
            redoBtn?.addEventListener('click', () => this.redo());
            copyBtn?.addEventListener('click', () => this.copyToClipboard());
            saveBtn?.addEventListener('click', () => this.saveToFile());
            clearBtn?.addEventListener('click', () => this.clearCanvas());

            const infoToggleBtn = container.querySelector('#vbm-info-toggle');
            infoToggleBtn?.addEventListener('click', () => {
                this.infoExpanded = !this.infoExpanded;
                const infoPanel = container.querySelector('#vbm-info-panel');
                if (infoPanel) {
                    infoPanel.style.display = this.infoExpanded ? 'block' : 'none';
                }
                if (this.infoExpanded && this.settings.get('showImageInfo')) {
                    this.updateImageInfo();
                }
            });
        }

        startVideoSelection() {
            if (this.isSelectingVideo) return;

            this.isSelectingVideo = true;
            Utils.ui.notify({
                type: 'info',
                title: '选择视频',
                message: '请将鼠标悬停在视频上，然后点击选择',
                shadow: true
            });

            this.createHighlightOverlay();
            
            document.addEventListener('mouseover', this.handleMouseOver);
            document.addEventListener('click', this.handleVideoClick, true);
        }

        handleMouseOver = (e) => {
            if (!this.isSelectingVideo) return;
            
            const target = e.target;
            if (target.tagName === 'VIDEO') {
                const rect = target.getBoundingClientRect();
                this.highlightOverlay.style.cssText = `
                    position: fixed;
                    left: ${rect.left}px;
                    top: ${rect.top}px;
                    width: ${rect.width}px;
                    height: ${rect.height}px;
                    border: 3px solid #3b82f6;
                    background: rgba(59, 130, 246, 0.1);
                    pointer-events: none;
                    z-index: 999999;
                    box-sizing: border-box;
                `;
            } else {
                this.highlightOverlay.style.display = 'none';
            }
        };

        handleVideoClick = (e) => {
            if (!this.isSelectingVideo) return;
            
            const target = e.target;
            if (target.tagName === 'VIDEO') {
                e.preventDefault();
                e.stopPropagation();
                
                this.selectedVideo = target;
                this.isSelectingVideo = false;
                
                document.removeEventListener('mouseover', this.handleMouseOver);
                document.removeEventListener('click', this.handleVideoClick, true);
                
                this.removeHighlightOverlay();
                if (this.toolbarContainer) {
                    const statusEl = this.toolbarContainer.querySelector('#vbm-video-status');
                    if (statusEl) {
                        statusEl.textContent = '✓ 已选择视频';
                        statusEl.style.color = 'var(--ckui-success)';
                    }
                    const captureSection = this.toolbarContainer.querySelector('#vbm-capture-section');
                    if (captureSection) {
                        captureSection.style.display = 'block';
                    }
                }

                Utils.ui.notify({
                    type: 'success',
                    title: '视频已选择',
                    message: '现在可以开始截图了',
                    shadow: true
                });
            }
        };

        createHighlightOverlay() {
            if (this.highlightOverlay) return;
            this.highlightOverlay = document.createElement('div');
            document.body.appendChild(this.highlightOverlay);
        }

        removeHighlightOverlay() {
            if (this.highlightOverlay) {
                this.highlightOverlay.remove();
                this.highlightOverlay = null;
            }
        }

        showRangePreview(type) {
            if (!this.selectedVideo) return;

            this.removeRangeOverlay();
            
            const video = this.selectedVideo;
            const rect = video.getBoundingClientRect();
            
            let rangeValue = this.settings.get(`${type}Range`);
            let rangeUnit = this.settings.get(`${type}RangeUnit`);
            
            let height;
            if (rangeUnit === 'percent') {
                height = rect.height * (rangeValue / 100);
            } else {
                height = rangeValue;
            }
            
            height = Math.min(height, rect.height);
            
            this.rangeOverlay = document.createElement('div');
            this.rangeOverlay.style.cssText = `
                position: fixed;
                left: ${rect.left}px;
                top: ${type === 'top' ? rect.top : rect.bottom - height}px;
                width: ${rect.width}px;
                height: ${height}px;
                background: rgba(59, 130, 246, 0.3);
                border: 2px solid #3b82f6;
                pointer-events: none;
                z-index: 999999;
                box-sizing: border-box;
            `;
            document.body.appendChild(this.rangeOverlay);
            
            setTimeout(() => this.removeRangeOverlay(), 1000);
        }

        removeRangeOverlay() {
            if (this.rangeOverlay) {
                this.rangeOverlay.remove();
                this.rangeOverlay = null;
            }
        }
        debouncedPreviewWatermark() {
            if (this.previewDebounceTimer) {
                clearTimeout(this.previewDebounceTimer);
            }
            this.previewDebounceTimer = setTimeout(() => {
                this.previewWatermark();
            }, 300);
        }
        async previewWatermark() {
            try {
                const previewContainer = this.toolbarContainer?.querySelector('#vbm-watermark-preview-container');
                
                if (!previewContainer) return;
                
                previewContainer.innerHTML = '';
                previewContainer.style.display = 'flex';
                previewContainer.style.alignItems = 'center';
                previewContainer.style.justifyContent = 'center';
                const canvasWidth = this.canvas.canvas?.width || this.canvas.firstWidth || 1280;
                const watermarkCanvas = this.drawTextWatermarkToCanvas(canvasWidth);
                const img = document.createElement('img');
                img.src = watermarkCanvas.toDataURL();
                img.style.cssText = 'width: 100%; height: auto; display: block;';
                previewContainer.appendChild(img);
            } catch (error) {
                logger.error('Preview watermark failed:', error);
                const previewContainer = this.toolbarContainer?.querySelector('#vbm-watermark-preview-container');
                if (previewContainer) {
                    previewContainer.innerHTML = '<span style="color: var(--ckui-error);">预览失败</span>';
                }
            }
        }
        async generateFinalCanvas(action = 'always') {
            if (!this.canvas.canvas) {
                throw new Error('No canvas available');
            }

            const enabled = this.settings.get('enabled');
            const watermarkApplyMode = this.settings.get('watermarkApplyMode');
            
            // Determine if watermark should be applied
            const shouldApplyWatermark = enabled && (
                watermarkApplyMode === 'always' || 
                (watermarkApplyMode === 'copy' && action === 'copy') ||
                (watermarkApplyMode === 'save' && action === 'save')
            );
            
            if (!shouldApplyWatermark) {
                return this.canvas.canvas;
            }

            try {
                const originalCanvas = this.canvas.canvas;
                const watermarkCanvas = this.drawTextWatermarkToCanvas(originalCanvas.width);
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = originalCanvas.width;
                finalCanvas.height = originalCanvas.height + watermarkCanvas.height;
                
                const ctx = finalCanvas.getContext('2d');
                ctx.drawImage(originalCanvas, 0, 0);
                ctx.drawImage(watermarkCanvas, 0, originalCanvas.height);
                
                return finalCanvas;
            } catch (error) {
                logger.error('Generate final canvas with watermark failed:', error);
                Utils.ui.notify({
                    type: 'warning',
                    title: '水印添加失败',
                    message: '将使用原图进行操作',
                    shadow: true
                });
                return this.canvas.canvas;
            }
        }
        drawTextWatermarkToCanvas(width) {
            const settings = this.settings;
            const content = settings.get('content');
            const fontSize = settings.get('fontSize');
            const textColor = settings.get('textColor');
            const textAlign = settings.get('textAlign');
            const backgroundColor = settings.get('backgroundColor');
            const padding = settings.get('padding');
            const containerWidth = settings.get('containerWidth') || width;
            const containerHeight = settings.get('containerHeight');
            const lines = content.split('\n');
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
            const lineHeight = fontSize * 1.5; // 行高为字体大小的 1.5 倍
            let maxLineWidth = 0;
            const measuredLines = lines.map(line => {
                const metrics = tempCtx.measureText(line);
                maxLineWidth = Math.max(maxLineWidth, metrics.width);
                return { text: line, width: metrics.width };
            });
            const contentHeight = lines.length * lineHeight;
            const actualHeight = containerHeight || (contentHeight + padding * 2);
            const canvas = document.createElement('canvas');
            canvas.width = containerWidth;
            canvas.height = actualHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.textBaseline = 'top';
            let x;
            if (textAlign === 'left') {
                ctx.textAlign = 'left';
                x = padding;
            } else if (textAlign === 'center') {
                ctx.textAlign = 'center';
                x = canvas.width / 2;
            } else if (textAlign === 'right') {
                ctx.textAlign = 'right';
                x = canvas.width - padding;
            }
            const startY = padding;
            measuredLines.forEach((line, index) => {
                const y = startY + index * lineHeight;
                ctx.fillText(line.text, x, y);
            });
            
            return canvas;
        }

        async captureVideoWithLayers(mode) {
            const video = this.selectedVideo;
            const rect = video.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const uiOffset = this.detectBrowserUIOffset();

            try {
                const toolbarShowing = !!this.toolbarWindow;
                const previewShowing = !!this.previewWindow;
                
                if (this.toolbarWindow && this.toolbarWindow.hide) {
                    this.toolbarWindow.hide();
                }
                if (this.previewWindow && this.previewWindow.hide) {
                    this.previewWindow.hide();
                }
                await Utils.wait(500);
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        displaySurface: "browser",
                        width: { ideal: 3840 },
                        height: { ideal: 2160 }
                    },
                    audio: false,
                    preferCurrentTab: true
                });

                const videoTrack = stream.getVideoTracks()[0];
                const imageCapture = new ImageCapture(videoTrack);
                const bitmap = await imageCapture.grabFrame();
                videoTrack.stop();
                stream.getTracks().forEach(track => track.stop());
                if (toolbarShowing && this.toolbarWindow && this.toolbarWindow.show) {
                    this.toolbarWindow.show();
                }
                if (previewShowing && this.previewWindow && this.previewWindow.show) {
                    this.previewWindow.show();
                }
                const fullCanvas = document.createElement('canvas');
                const fullCtx = fullCanvas.getContext('2d');
                fullCanvas.width = bitmap.width;
                fullCanvas.height = bitmap.height;
                fullCtx.drawImage(bitmap, 0, 0);
                let cropX = rect.left * dpr;
                let cropY = rect.top * dpr;
                const cropWidth = rect.width * dpr;
                const cropHeight = rect.height * dpr;
                if (uiOffset.hasSignificantOffset) {
                    logger.log('Applying UI offset compensation:', uiOffset);
                    cropX += uiOffset.left * dpr;
                    cropY += uiOffset.top * dpr;
                }
                if (cropX < 0 || cropY < 0 || 
                    cropX + cropWidth > fullCanvas.width || 
                    cropY + cropHeight > fullCanvas.height) {
                    logger.warn('Crop area out of bounds', {
                        cropX, cropY, cropWidth, cropHeight,
                        canvasWidth: fullCanvas.width,
                        canvasHeight: fullCanvas.height
                    });
                    if (toolbarShowing && this.toolbarWindow && this.toolbarWindow.show) {
                        this.toolbarWindow.show();
                    }
                    if (previewShowing && this.previewWindow && this.previewWindow.show) {
                        this.previewWindow.show();
                    }
                    
                    Utils.ui.notify({
                        type: 'error',
                        title: '截图失败',
                        message: '裁剪区域超出边界，请尝试调整偏移设置',
                        shadow: true,
                        duration: 5000
                    });
                    return;
                }
                let finalCropY = cropY;
                let finalCropHeight = cropHeight;

                if (mode === 'top') {
                    const rangeValue = this.settings.get('topRange');
                    const rangeUnit = this.settings.get('topRangeUnit');
                    
                    if (rangeUnit === 'percent') {
                        finalCropHeight = cropHeight * (rangeValue / 100);
                    } else {
                        finalCropHeight = Math.min(rangeValue * dpr, cropHeight);
                    }
                } else if (mode === 'bottom') {
                    const rangeValue = this.settings.get('bottomRange');
                    const rangeUnit = this.settings.get('bottomRangeUnit');
                    
                    let height;
                    if (rangeUnit === 'percent') {
                        height = cropHeight * (rangeValue / 100);
                    } else {
                        height = Math.min(rangeValue * dpr, cropHeight);
                    }
                    
                    finalCropY = cropY + cropHeight - height;
                    finalCropHeight = height;
                }
                const croppedCanvas = document.createElement('canvas');
                const croppedCtx = croppedCanvas.getContext('2d');
                croppedCanvas.width = cropWidth;
                croppedCanvas.height = finalCropHeight;
                croppedCtx.drawImage(
                    fullCanvas,
                    cropX, finalCropY, cropWidth, finalCropHeight,
                    0, 0, cropWidth, finalCropHeight
                );
                const imageData = croppedCtx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height);
                let targetWidth;
                const captureMode = this.settings.get('captureMode');
                if (captureMode === 'fixed') {
                    targetWidth = this.settings.get('fixedWidth');
                } else if (captureMode === 'adaptive') {
                    const firstWidth = this.canvas.firstWidth || imageData.width;
                    const minWidth = this.settings.get('minWidth');
                    const maxWidth = this.settings.get('maxWidth');
                    
                    if (firstWidth < minWidth) {
                        targetWidth = minWidth;
                    } else if (firstWidth > maxWidth) {
                        targetWidth = maxWidth;
                    } else {
                        targetWidth = firstWidth;
                    }
                } else {
                    targetWidth = this.canvas.firstWidth || imageData.width;
                }

                this.canvas.appendImage(imageData, targetWidth);
                if (this.toolbarContainer) {
                    const actionsSection = this.toolbarContainer.querySelector('#vbm-actions-section');
                    if (actionsSection) {
                        actionsSection.style.display = 'block';
                    }
                    if (this.settings.get('showImageInfo')) {
                        const infoBtn = this.toolbarContainer.querySelector('#vbm-info-toggle');
                        if (infoBtn) {
                            infoBtn.style.display = 'block';
                        }
                    }
                }

                this.updatePreview();
                this.updateActionButtons();
                this.scrollPreviewToBottom();

            } catch (error) {
                if (this.toolbarWindow && this.toolbarWindow.show) {
                    this.toolbarWindow.show();
                }
                if (this.previewWindow && this.previewWindow.show) {
                    this.previewWindow.show();
                }

                logger.error('Layer capture failed:', error);
                
                if (error.name === 'NotAllowedError') {
                    Utils.ui.notify({
                        type: 'warning',
                        title: '未授权',
                        message: '您拒绝了屏幕捕获授权，已切换回普通截图模式',
                        shadow: true,
                        duration: 4000
                    });
                    this.settings.set('useLayerCapture', false);
                    if (this.toolbarContainer) {
                        const checkbox = this.toolbarContainer.querySelector('#vbm-use-layer-capture');
                        if (checkbox) checkbox.checked = false;
                    }
                } else if (error.name === 'NotSupportedError') {
                    Utils.ui.notify({
                        type: 'error',
                        title: '不支持',
                        message: '您的浏览器不支持此功能',
                        shadow: true
                    });
                } else {
                    Utils.ui.notify({
                        type: 'error',
                        title: '截图失败',
                        message: `发生错误: ${error.message}`,
                        shadow: true,
                        duration: 5000
                    });
                }
            }
        }

        async captureVideo(mode) {
            if (!this.selectedVideo) {
                Utils.ui.notify({
                    type: 'error',
                    title: '错误',
                    message: '请先选择视频',
                    shadow: true
                });
                return;
            }

            try {
                if (this.settings.get('useLayerCapture')) {
                    await this.captureVideoWithLayers(mode);
                    return;
                }
                const video = this.selectedVideo;
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                
                tempCanvas.width = video.videoWidth || video.clientWidth;
                tempCanvas.height = video.videoHeight || video.clientHeight;
                
                tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
                
                let imageData;
                
                if (mode === 'full') {
                    imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                } else if (mode === 'top') {
                    let height;
                    const rangeValue = this.settings.get('topRange');
                    const rangeUnit = this.settings.get('topRangeUnit');
                    
                    if (rangeUnit === 'percent') {
                        height = Math.floor(tempCanvas.height * (rangeValue / 100));
                    } else {
                        height = Math.min(rangeValue, tempCanvas.height);
                    }
                    
                    imageData = tempCtx.getImageData(0, 0, tempCanvas.width, height);
                } else if (mode === 'bottom') {
                    let height;
                    const rangeValue = this.settings.get('bottomRange');
                    const rangeUnit = this.settings.get('bottomRangeUnit');
                    
                    if (rangeUnit === 'percent') {
                        height = Math.floor(tempCanvas.height * (rangeValue / 100));
                    } else {
                        height = Math.min(rangeValue, tempCanvas.height);
                    }
                    
                    const startY = tempCanvas.height - height;
                    imageData = tempCtx.getImageData(0, startY, tempCanvas.width, height);
                }
                let targetWidth;
                const captureMode = this.settings.get('captureMode');
                if (captureMode === 'fixed') {
                    targetWidth = this.settings.get('fixedWidth');
                } else if (captureMode === 'adaptive') {
                    const firstWidth = this.canvas.firstWidth || imageData.width;
                    const minWidth = this.settings.get('minWidth');
                    const maxWidth = this.settings.get('maxWidth');
                    
                    if (firstWidth < minWidth) {
                        targetWidth = minWidth;
                    } else if (firstWidth > maxWidth) {
                        targetWidth = maxWidth;
                    } else {
                        targetWidth = firstWidth;
                    }
                } else {
                    targetWidth = this.canvas.firstWidth || imageData.width;
                }
                
                this.canvas.appendImage(imageData, targetWidth);
                if (this.toolbarContainer) {
                    const actionsSection = this.toolbarContainer.querySelector('#vbm-actions-section');
                    if (actionsSection) {
                        actionsSection.style.display = 'block';
                    }
                    if (this.settings.get('showImageInfo')) {
                        const infoBtn = this.toolbarContainer.querySelector('#vbm-info-toggle');
                        if (infoBtn) {
                            infoBtn.style.display = 'block';
                        }
                    }
                }
                
                this.updatePreview();
                this.updateActionButtons();
                this.scrollPreviewToBottom();
                
            } catch (error) {
                logger.error('Capture failed:', error);
                Utils.ui.notify({
                    type: 'error',
                    title: '截图失败',
                    message: error.message,
                    shadow: true
                });
            }
        }

        updatePreview() {
            if (!this.previewWindow && this.canvas.canvas) {
                this.createPreviewWindow();
            }
            
            if (this.previewContainer && this.canvas.canvas) {
                this.previewContainer.innerHTML = '';
                const img = document.createElement('img');
                img.src = this.canvas.toDataURL();
                const previewWidth = this.settings.get('previewImageWidth');
                img.style.cssText = `width: ${previewWidth}px; height: auto; display: block;`;
                this.previewContainer.appendChild(img);
                
                this.scrollPreviewToBottom();
                if (this.settings.get('showImageInfo')) {
                    this.updateImageInfo();
                }
            }
        }

        scrollPreviewToBottom() {
            if (this.previewContainer) {
                setTimeout(() => {
                    this.previewContainer.scrollTop = this.previewContainer.scrollHeight;
                }, 50);
            }
        }

        async updateImageInfo() {
            if (!this.canvas.canvas || !this.infoExpanded) return;
            
            const info = this.canvas.getImageInfo();
            if (!info) return;
            
            const saveFormat = this.settings.get('saveFormat');
            const saveQuality = this.settings.get('saveQuality');
            
            const memorySize = await this.canvas.calculateSize('png', 1.0);
            const copySize = await this.canvas.calculateSize('png', 1.0);
            const saveSize = await this.canvas.calculateSize(saveFormat, saveQuality);
            
            this.imageInfo = {
                width: info.width,
                height: info.height,
                memorySize,
                copySize,
                saveSize
            };
            
            if (this.toolbarContainer) {
                const dimensionsEl = this.toolbarContainer.querySelector('#vbm-info-dimensions');
                const memoryEl = this.toolbarContainer.querySelector('#vbm-info-memory');
                const copyEl = this.toolbarContainer.querySelector('#vbm-info-copy');
                const saveEl = this.toolbarContainer.querySelector('#vbm-info-save');
                const saveFormatEl = this.toolbarContainer.querySelector('#vbm-info-save-format');
                
                if (dimensionsEl) dimensionsEl.textContent = `${info.width} × ${info.height}`;
                if (memoryEl) memoryEl.textContent = this.formatFileSize(memorySize);
                if (copyEl) copyEl.textContent = this.formatFileSize(copySize);
                if (saveEl) saveEl.textContent = this.formatFileSize(saveSize);
                if (saveFormatEl) saveFormatEl.textContent = `${saveFormat.toUpperCase()}${saveFormat !== 'png' ? ` (${Math.round(saveQuality * 100)}%)` : ''}`;
            }
        }

        formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }

        createPreviewWindow() {
            this.previewContainer = document.createElement('div');
            this.previewContainer.id = 'vbm-preview-container';
            this.previewContainer.style.cssText = 'max-height: 80vh; overflow-y: auto; display: flex; flex-direction: column; align-items: center;';
            
            this.previewWindow = Utils.ui.floatWindow({
                title: '预览',
                content: this.previewContainer,
                width: 280,
                position: { x: 520, y: 100 },
                shadow: true,
                onClose: () => {
                    this.previewWindow = null;
                    this.previewContainer = null;
                }
            });
            this.previewWindow.show();
        }

        updateActionButtons() {
            if (!this.toolbarContainer) return;
            
            const undoBtn = this.toolbarContainer.querySelector('#vbm-undo');
            const redoBtn = this.toolbarContainer.querySelector('#vbm-redo');
            const undoCount = this.toolbarContainer.querySelector('#vbm-undo-count');
            const redoCount = this.toolbarContainer.querySelector('#vbm-redo-count');
            const copyBtn = this.toolbarContainer.querySelector('#vbm-copy');
            const saveBtn = this.toolbarContainer.querySelector('#vbm-save');
            const clearBtn = this.toolbarContainer.querySelector('#vbm-clear');
            
            const hasCanvas = !!this.canvas.canvas;
            const canUndoSteps = this.canvas.historyIndex;
            const canRedoSteps = this.canvas.history.length - 1 - this.canvas.historyIndex;
            
            if (undoBtn) {
                undoBtn.disabled = !this.canvas.canUndo();
            }
            if (redoBtn) {
                redoBtn.disabled = !this.canvas.canRedo();
            }
            if (undoCount) {
                undoCount.textContent = canUndoSteps > 0 ? canUndoSteps : '';
                undoCount.style.color = canUndoSteps > 0 ? 'var(--ckui-text-secondary)' : 'var(--ckui-text-muted)';
            }
            if (redoCount) {
                redoCount.textContent = canRedoSteps > 0 ? canRedoSteps : '';
                redoCount.style.color = canRedoSteps > 0 ? 'var(--ckui-text-secondary)' : 'var(--ckui-text-muted)';
            }
            if (copyBtn) copyBtn.disabled = !hasCanvas;
            if (saveBtn) saveBtn.disabled = !hasCanvas;
            if (clearBtn) clearBtn.disabled = !hasCanvas;
        }

        undo() {
            if (this.canvas.undo()) {
                this.updatePreview();
                this.updateActionButtons();
                this.scrollPreviewToBottom();
            }
        }

        redo() {
            if (this.canvas.redo()) {
                this.updatePreview();
                this.updateActionButtons();
                this.scrollPreviewToBottom();
            }
        }

        async copyToClipboard() {
            try {
                const finalCanvas = await this.generateFinalCanvas('copy');
                const blob = await new Promise((resolve) => {
                    finalCanvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/png', 1.0);
                });
                
                const mimeType = 'image/png';
                
                await navigator.clipboard.write([
                    new ClipboardItem({ [mimeType]: blob })
                ]);
                
                Utils.ui.notify({
                    type: 'success',
                    title: '复制成功',
                    message: '图片已复制到剪贴板 (PNG)',
                    shadow: true
                });
            } catch (error) {
                logger.error('Copy failed:', error);
                Utils.ui.notify({
                    type: 'error',
                    title: '复制失败',
                    message: error.message,
                    shadow: true
                });
            }
        }

        async saveToFile() {
            try {
                const format = this.settings.get('saveFormat');
                const quality = this.settings.get('saveQuality');
                const finalCanvas = await this.generateFinalCanvas('save');
                const blob = await new Promise((resolve) => {
                    finalCanvas.toBlob((blob) => {
                        resolve(blob);
                    }, `image/${format}`, quality);
                });
                
                const filename = `video-barpic-${Date.now()}.${format}`;
                Utils.downloadBlob(filename, blob);
                
                Utils.ui.notify({
                    type: 'success',
                    title: '保存成功',
                    message: `文件已保存: ${filename}`,
                    shadow: true
                });
            } catch (error) {
                logger.error('Save failed:', error);
                Utils.ui.notify({
                    type: 'error',
                    title: '保存失败',
                    message: error.message,
                    shadow: true
                });
            }
        }

        async clearCanvas() {
            const confirmed = await Utils.ui.confirm({
                title: '确认清空',
                content: '确定要清空当前的所有截图吗？此操作不可恢复。',
                shadow: true
            });
            
            if (!confirmed) {
                return;
            }
            this.canvas.clear();
            if (this.previewWindow) {
                this.previewWindow.close();
                this.previewWindow = null;
                this.previewContainer = null;
            }
            if (this.toolbarContainer) {
                const actionsSection = this.toolbarContainer.querySelector('#vbm-actions-section');
                if (actionsSection) {
                    actionsSection.style.display = 'none';
                }
                const infoBtn = this.toolbarContainer.querySelector('#vbm-info-toggle');
                if (infoBtn) {
                    infoBtn.style.display = 'none';
                }
                const infoPanel = this.toolbarContainer.querySelector('#vbm-info-panel');
                if (infoPanel) {
                    infoPanel.style.display = 'none';
                }
            }
            this.infoExpanded = false;
            this.imageInfo = { memorySize: 0, copySize: 0, saveSize: 0, width: 0, height: 0 };
            this.updateActionButtons();
            logger.log('Canvas cleared successfully', {
                canvasExists: !!this.canvas.canvas,
                historyLength: this.canvas.history.length,
                historyIndex: this.canvas.historyIndex
            });
            
            Utils.ui.notify({
                type: 'success',
                title: '已清空',
                message: '画布已清空，可以重新开始截图',
                shadow: true
            });
        }

        cleanup() {
            this.removeHighlightOverlay();
            this.removeRangeOverlay();
            this.isSelectingVideo = false;
            document.removeEventListener('mouseover', this.handleMouseOver);
            document.removeEventListener('click', this.handleVideoClick, true);
            if (this.displayMediaStream) {
                this.displayMediaStream.getTracks().forEach(track => track.stop());
                this.displayMediaStream = null;
            }
        }
    }
    const app = new VideoBarpicMaker();
    app.init();

})(unsafeWindow, document);
