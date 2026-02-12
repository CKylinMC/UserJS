// ==UserScript==
// @name         Video Barpic Maker
// @name:zh-CN   视频字幕截图制作工具
// @namespace    ckylin-script-video-barpic-maker
// @version      0.1.0
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
// @require https://update.greasyfork.org/scripts/564901/1753405/CKUI.js
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
        video: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polygon points="10 9 10 15 15 12 10 9"/></svg>',
        capture: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19 19H5V5h14v14z"/><path d="M3 3h18v18H3z" opacity="0.3"/></svg>',
        captureDown: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18" opacity="0.3"/><circle cx="12" cy="16" r="2"/></svg>',
        captureUp: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18" opacity="0.3"/><circle cx="12" cy="8" r="2"/></svg>',
        settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>',
        copy: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
        save: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
        trash: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        undo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-9 9"/></svg>',
        redo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 9 9"/></svg>',
    };
    class SettingsManager {
        constructor() {
            this.defaults = {
                captureMode: 'first', // 'first' or 'fixed'
                fixedWidth: 1280,
                topRange: 50,
                topRangeUnit: 'percent', // 'percent' or 'pixel'
                bottomRange: 50,
                bottomRangeUnit: 'percent',
                previewImageWidth: 260, // Preview image width in pixels
                useLayerCapture: false, // Whether to capture video with overlays using DisplayMedia API
                manualOffsetLeft: 0, // Manual offset for DisplayMedia capture
                manualOffsetTop: 0, // Manual offset for DisplayMedia capture
                enableFloatButton: true // Enable floating button on page
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

        toBlob() {
            return new Promise(resolve => {
                this.canvas.toBlob(resolve, 'image/png');
            });
        }

        toDataURL() {
            return this.canvas.toDataURL('image/png');
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
            this.displayMediaStream = null; // Store the current capture stream
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
                width: 800,
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
            settingsPanel.innerHTML = this.createSettingsPanel();
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
            setTimeout(() => this.bindToolbarEvents(container), 0);

            return container;
        }

        createSettingsPanel() {
            const settings = this.settings;
            return `
                <div style="padding: 12px; background: var(--ckui-bg-secondary); border-radius: var(--ckui-radius); margin-top: 8px;">
                    <div style="margin-bottom: 12px;">
                        <label class="ckui-label">画布宽度模式</label>
                        <select class="ckui-select" id="vbm-capture-mode">
                            <option value="first" ${settings.get('captureMode') === 'first' ? 'selected' : ''}>首次截图宽度</option>
                            <option value="fixed" ${settings.get('captureMode') === 'fixed' ? 'selected' : ''}>固定宽度</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 12px;" id="vbm-fixed-width-container" ${settings.get('captureMode') === 'first' ? 'style="display:none;"' : ''}>
                        <label class="ckui-label">固定宽度(px)</label>
                        <input type="number" class="ckui-input" id="vbm-fixed-width" value="${settings.get('fixedWidth')}" min="100" max="3840">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label class="ckui-label">预览图片宽度(px)</label>
                        <input type="number" class="ckui-input" id="vbm-preview-width" value="${settings.get('previewImageWidth')}" min="100" max="800">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label class="ckui-label">上部分范围</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="number" class="ckui-input" id="vbm-top-range" value="${settings.get('topRange')}" min="1" style="flex: 1;">
                            <select class="ckui-select" id="vbm-top-range-unit" style="width: 100px;">
                                <option value="percent" ${settings.get('topRangeUnit') === 'percent' ? 'selected' : ''}>百分比%</option>
                                <option value="pixel" ${settings.get('topRangeUnit') === 'pixel' ? 'selected' : ''}>像素px</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label class="ckui-label">下部分范围</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="number" class="ckui-input" id="vbm-bottom-range" value="${settings.get('bottomRange')}" min="1" style="flex: 1;">
                            <select class="ckui-select" id="vbm-bottom-range-unit" style="width: 100px;">
                                <option value="percent" ${settings.get('bottomRangeUnit') === 'percent' ? 'selected' : ''}>百分比%</option>
                                <option value="pixel" ${settings.get('bottomRangeUnit') === 'pixel' ? 'selected' : ''}>像素px</option>
                            </select>
                        </div>
                    </div>
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
                    <div style="margin-bottom: 12px;" id="vbm-manual-offset-container" ${!settings.get('useLayerCapture') ? 'style="display:none;"' : ''}>
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
                    <div style="margin-bottom: 0;">
                        <label class="ckui-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="vbm-enable-float-button" ${settings.get('enableFloatButton') ? 'checked' : ''} style="cursor: pointer;">
                            <span>启用页面浮动按钮</span>
                        </label>
                        <div style="font-size: 11px; color: var(--ckui-text-muted); margin-top: 4px; padding-left: 24px;">
                            在页面上显示一个浮动按钮，方便快速打开工具
                        </div>
                    </div>
                </div>
            `;
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
            const fixedWidthInput = container.querySelector('#vbm-fixed-width');
            const topRangeInput = container.querySelector('#vbm-top-range');
            const topRangeUnit = container.querySelector('#vbm-top-range-unit');
            const bottomRangeInput = container.querySelector('#vbm-bottom-range');
            const bottomRangeUnit = container.querySelector('#vbm-bottom-range-unit');

            captureModeSelect?.addEventListener('change', (e) => {
                this.settings.set('captureMode', e.target.value);
                fixedWidthContainer.style.display = e.target.value === 'fixed' ? 'block' : 'none';
            });

            fixedWidthInput?.addEventListener('change', (e) => {
                this.settings.set('fixedWidth', parseInt(e.target.value) || 1280);
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
                if (this.settings.get('captureMode') === 'fixed') {
                    targetWidth = this.settings.get('fixedWidth');
                } else {
                    targetWidth = this.canvas.firstWidth || imageData.width;
                }

                this.canvas.appendImage(imageData, targetWidth);
                if (this.toolbarContainer) {
                    const actionsSection = this.toolbarContainer.querySelector('#vbm-actions-section');
                    if (actionsSection) {
                        actionsSection.style.display = 'block';
                    }
                }

                this.updatePreview();
                this.updateActionButtons();

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
                if (this.settings.get('captureMode') === 'fixed') {
                    targetWidth = this.settings.get('fixedWidth');
                } else {
                    targetWidth = this.canvas.firstWidth || imageData.width;
                }
                
                this.canvas.appendImage(imageData, targetWidth);
                if (this.toolbarContainer) {
                    const actionsSection = this.toolbarContainer.querySelector('#vbm-actions-section');
                    if (actionsSection) {
                        actionsSection.style.display = 'block';
                    }
                }
                
                this.updatePreview();
                this.updateActionButtons();
                
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
            }
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
            }
        }

        redo() {
            if (this.canvas.redo()) {
                this.updatePreview();
                this.updateActionButtons();
            }
        }

        async copyToClipboard() {
            try {
                const blob = await this.canvas.toBlob();
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                
                Utils.ui.notify({
                    type: 'success',
                    title: '复制成功',
                    message: '图片已复制到剪贴板',
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
                const blob = await this.canvas.toBlob();
                const filename = `video-barpic-${Date.now()}.png`;
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
            }
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
