// ==UserScript==
// @name         CKUI
// @namespace    ckylin-script-lib-ckui
// @version      2.5.1
// @description  A modern, dependency-free UI library for Tampermonkey scripts
// @match        http://*
// @match        https://*
// @grant        unsafeWindow
// @author       CKylinMC
// @license      GPL-3.0-only
// ==/UserScript==

// 调试用
if (typeof unsafeWindow === 'undefined' || !unsafeWindow) {
    window.unsafeWindow = window;
}

(function(unsafeWindow, document) {
    'use strict';
    
    // 版本比较函数
    const compareVersion = (v1, v2) => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    };
    
    const currentVersion = '2.5.0';
    
    if (unsafeWindow.ckui && unsafeWindow.ckui.__initialized) {
        const existingVersion = unsafeWindow.ckui.version || '0.0.0';
        const comparison = compareVersion(currentVersion, existingVersion);
        
        if (comparison <= 0) {
            console.log(`[CKUI] Version ${existingVersion} already loaded, current version ${currentVersion} is not newer, skipping...`);
            return;
        } else {
            console.log(`[CKUI] Upgrading from version ${existingVersion} to ${currentVersion}...`);
        }
    }

    const globalConfig = {
        zIndexBase: 999990,
        currentTheme: 'light'
    };

    if (!unsafeWindow.__ckui_mouseTrackingEnabled) {
        unsafeWindow.__ckui_mouseTrackingEnabled = false;
        unsafeWindow.__ckui_lastMouseX = null;
        unsafeWindow.__ckui_lastMouseY = null;
    }

    class InstanceManager {
        constructor() {
            this.modals = new Map();
            this.floatWindows = new Map();
            this.forms = new Map();
        }

        register(type, id, instance) {
            const map = this[type];
            if (map) {
                map.set(id, instance);
            }
        }

        unregister(type, id) {
            const map = this[type];
            if (map) {
                map.delete(id);
            }
        }

        get(type, id) {
            const map = this[type];
            return map ? map.get(id) : null;
        }

        has(type, id) {
            const map = this[type];
            return map ? map.has(id) : false;
        }
    }

    const instanceManager = new InstanceManager();

    class Reactive {
        constructor(value) {
            this._value = value;
            this._subscribers = [];
        }

        get value() {
            return this._value;
        }

        set value(newValue) {
            if (this._value !== newValue) {
                this._value = newValue;
                this._notify();
            }
        }

        subscribe(callback, immediate = true) {
            this._subscribers.push(callback);
            
            // 立即执行一次回调以同步初始值
            if (immediate) {
                try {
                    callback(this._value);
                } catch (e) {
                    console.error('[CKUI] Reactive callback error:', e);
                }
            }
            
            return () => {
                this._subscribers = this._subscribers.filter(cb => cb !== callback);
            };
        }

        _notify() {
            this._subscribers.forEach(callback => {
                try {
                    callback(this._value);
                } catch (e) {
                    console.error('[CKUI] Reactive callback error:', e);
                }
            });
        }
    }

    const utils = {
        uuid() {
            return 'ckui-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
        },

        createElement(tag, props = {}, children = []) {
            const el = document.createElement(tag);
            
            Object.entries(props).forEach(([key, value]) => {

                if (value === undefined || value === null) {
                    return;
                }
                
                if (key === 'style' && typeof value === 'object') {
                    Object.assign(el.style, value);
                } else if (key === 'class' || key === 'className') {
                    el.className = value;
                } else if (key.startsWith('on') && typeof value === 'function') {
                    el.addEventListener(key.substring(2).toLowerCase(), value);
                } else if (key === 'dataset' && typeof value === 'object') {
                    Object.assign(el.dataset, value);
                } else if (key === 'disabled' && value === false) {

                    return;
                } else {
                    el.setAttribute(key, value);
                }
            });

            children.forEach(child => {
                if (typeof child === 'string') {
                    el.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    el.appendChild(child);
                }
            });

            return el;
        },

        injectStyles(css, id = null) {
            const styleId = id || `ckui-style-${Date.now()}`;
            let style = document.getElementById(styleId);
            
            if (!style) {
                style = document.createElement('style');
                style.id = styleId;
                document.head.appendChild(style);
            }
            
            style.textContent = css;
            return style;
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        createShadowHost(options = {}) {
            const host = document.createElement('div');
            host.className = 'ckui-shadow-host';
            const zIndex = globalConfig.zIndexBase + 20;
            host.style.cssText = `all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0;`;
            host.style.zIndex = zIndex; 
            
            const shadowRoot = host.attachShadow({ mode: 'open' });
            
            const style = document.createElement('style');
            style.textContent = coreStyles;
            shadowRoot.appendChild(style);
            
            const container = document.createElement('div');
            // container.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1;`;
            container.style.cssText = `z-index: 1;`;
            shadowRoot.appendChild(container);
            
            document.body.appendChild(host);
            
            return {
                host,
                shadowRoot,
                container
            };
        }
    };

    const coreStyles = `
        /* CKUI Core Styles - Isolated with high specificity */
        .ckui-root {
            /* all: initial; */ 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            box-sizing: border-box;
            
            /* CSS Variables for customization */
            --ckui-primary: #0f172a;
            --ckui-primary-hover: #1e293b;
            --ckui-secondary: #f8fafc;
            --ckui-secondary-hover: #f1f5f9;
            --ckui-border: #e5e7eb;
            --ckui-border-dark: #cbd5e1;
            --ckui-text: #0f172a;
            --ckui-text-secondary: #64748b;
            --ckui-text-muted: #94a3b8;
            --ckui-bg: white;
            --ckui-bg-secondary: #f8fafc;
            --ckui-success: #10b981;
            --ckui-success-hover: #059669;
            --ckui-danger: #ef4444;
            --ckui-danger-hover: #dc2626;
            --ckui-warning: #f59e0b;
            --ckui-info: #3b82f6;
            --ckui-btn-primary-text: white;
            --ckui-btn-danger-text: white;
            --ckui-btn-success-text: white;
            --ckui-radius: 6px;
            --ckui-radius-sm: 4px;
            --ckui-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
            --ckui-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            --ckui-shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.1);
            --ckui-spacing-xs: 4px;
            --ckui-spacing-sm: 8px;
            --ckui-spacing: 12px;
            --ckui-spacing-md: 16px;
            --ckui-spacing-lg: 20px;
            --ckui-spacing-xl: 24px;
            --ckui-animation-duration: 0.2s;
            --ckui-animation-easing: ease-out;
        }

        .ckui-root *, .ckui-root *::before, .ckui-root *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        /* Overlay */
        .ckui-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: ckui-fade-in var(--ckui-animation-duration) var(--ckui-animation-easing);
        }

        /* Modal */
        .ckui-modal {
            position: relative;
            background: var(--ckui-bg);
            border-radius: var(--ckui-radius);
            box-shadow: var(--ckui-shadow-lg);
            border: 1px solid var(--ckui-border);
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            animation: ckui-modal-in var(--ckui-animation-duration) var(--ckui-animation-easing);
        }

        .ckui-modal-header {
            padding: var(--ckui-spacing-lg) var(--ckui-spacing-xl);
            border-bottom: 1px solid var(--ckui-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .ckui-modal-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--ckui-text);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0;
        }

        .ckui-modal-title.has-icon {
            gap: 12px;
        }

        .ckui-modal-icon {
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .ckui-modal-icon.circle {
            border-radius: 50%;
        }

        .ckui-modal-icon.square {
            border-radius: 4px;
        }

        .ckui-modal-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .ckui-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            color: var(--ckui-text-secondary);
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--ckui-radius);
            transition: all var(--ckui-animation-duration);
        }

        .ckui-modal-close:hover {
            background: var(--ckui-secondary-hover);
            color: var(--ckui-text);
        }

        .ckui-modal-body {
            padding: var(--ckui-spacing-xl);
            overflow-y: auto;
            flex: 1;
        }

        .ckui-modal-footer {
            padding: var(--ckui-spacing-md) var(--ckui-spacing-xl);
            border-top: 1px solid var(--ckui-border);
            display: flex;
            justify-content: flex-end;
            gap: var(--ckui-spacing);
        }

        /* Float Window */
        .ckui-float-window {
            position: fixed;
            background: var(--ckui-bg);
            border-radius: var(--ckui-radius);
            box-shadow: var(--ckui-shadow-lg);
            border: 1px solid var(--ckui-border);
            display: flex;
            flex-direction: column;
            min-width: 200px;
            max-width: 90vw;
            max-height: 90vh;
        }

        .ckui-float-header {
            padding: var(--ckui-spacing) var(--ckui-spacing-md);
            background: var(--ckui-bg);
            border-bottom: 1px solid var(--ckui-border);
            color: var(--ckui-text);
            cursor: move;
            user-select: none;
            border-radius: var(--ckui-radius) var(--ckui-radius) 0 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .ckui-float-title {
            font-size: 14px;
            font-weight: 600;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0;
        }

        .ckui-float-title.has-icon {
            gap: 8px;
        }

        .ckui-float-icon {
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .ckui-float-icon.circle {
            border-radius: 50%;
        }

        .ckui-float-icon.square {
            border-radius: 4px;
        }

        .ckui-float-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .ckui-float-controls {
            display: flex;
            gap: 4px;
        }

        .ckui-float-btn {
            background: transparent;
            border: none;
            color: var(--ckui-text-secondary);
            width: 24px;
            height: 24px;
            border-radius: var(--ckui-radius-sm);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all var(--ckui-animation-duration);
        }

        .ckui-float-btn:hover {
            background: var(--ckui-secondary-hover);
            color: var(--ckui-text);
        }

        .ckui-float-body {
            padding: var(--ckui-spacing-md);
            overflow-y: auto;
            flex: 1;
        }

        /* Notification */
        .ckui-notification-container {
            position: fixed;
            top: var(--ckui-spacing-lg);
            right: var(--ckui-spacing-lg);
            display: flex;
            flex-direction: column;
            gap: var(--ckui-spacing);
            pointer-events: none;
        }

        .ckui-notification {
            background: var(--ckui-bg);
            border-radius: var(--ckui-radius);
            box-shadow: var(--ckui-shadow);
            border: 1px solid var(--ckui-border);
            padding: var(--ckui-spacing-md) var(--ckui-spacing-lg);
            min-width: 300px;
            max-width: 400px;
            display: flex;
            align-items: flex-start;
            gap: var(--ckui-spacing);
            pointer-events: auto;
            animation: ckui-slide-in-right var(--ckui-animation-duration) var(--ckui-animation-easing);
        }

        .ckui-notification.success { border-left: 3px solid var(--ckui-success); }
        .ckui-notification.error { border-left: 3px solid var(--ckui-danger); }
        .ckui-notification.warning { border-left: 3px solid var(--ckui-warning); }
        .ckui-notification.info { border-left: 3px solid var(--ckui-info); }

        .ckui-notification-icon {
            font-size: 20px;
            flex-shrink: 0;
        }

        .ckui-notification-content {
            flex: 1;
        }

        .ckui-notification-title {
            font-weight: 600;
            color: var(--ckui-text);
            margin-bottom: var(--ckui-spacing-xs);
        }

        .ckui-notification-message {
            color: var(--ckui-text-secondary);
            font-size: 13px;
        }

        .ckui-notification-close {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 16px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        /* Button */
        .ckui-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: var(--ckui-spacing-sm) var(--ckui-spacing-md);
            height: 36px;
            border: 1px solid var(--ckui-border);
            border-radius: var(--ckui-radius);
            background: var(--ckui-bg);
            color: var(--ckui-text);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all var(--ckui-animation-duration);
            outline: none;
            user-select: none;
            margin-right: 5px;
        }

        .ckui-btn:hover {
            background: var(--ckui-secondary);
            border-color: var(--ckui-border-dark);
        }

        .ckui-btn:active {
            transform: scale(0.98);
        }

        .ckui-btn-primary {
            background: var(--ckui-primary);
            color: var(--ckui-btn-primary-text);
            border-color: var(--ckui-primary);
        }

        .ckui-btn-primary:hover {
            background: var(--ckui-primary-hover);
            border-color: var(--ckui-primary-hover);
        }

        .ckui-btn-danger {
            background: var(--ckui-danger);
            color: var(--ckui-btn-danger-text);
            border-color: var(--ckui-danger);
        }

        .ckui-btn-danger:hover {
            background: var(--ckui-danger-hover);
            border-color: var(--ckui-danger-hover);
        }

        .ckui-btn-success {
            background: var(--ckui-success);
            color: var(--ckui-btn-success-text);
            border-color: var(--ckui-success);
        }

        .ckui-btn-success:hover {
            background: var(--ckui-success-hover);
            border-color: var(--ckui-success-hover);
        }

        /* Input */
        .ckui-input {
            display: inline-block;
            width: 100%;
            height: 36px;
            padding: var(--ckui-spacing-sm) var(--ckui-spacing);
            border: 1px solid var(--ckui-border);
            border-radius: var(--ckui-radius);
            font-size: 14px;
            color: var(--ckui-text);
            background: var(--ckui-bg);
            transition: all var(--ckui-animation-duration);
            outline: none;
        }

        .ckui-input:focus {
            border-color: var(--ckui-info);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .ckui-input:disabled {
            background: var(--ckui-secondary);
            color: var(--ckui-text-muted);
            cursor: not-allowed;
        }

        /* Textarea */
        .ckui-textarea {
            display: block;
            width: 100%;
            padding: var(--ckui-spacing-sm) var(--ckui-spacing);
            border: 1px solid var(--ckui-border);
            border-radius: var(--ckui-radius);
            font-size: 14px;
            color: var(--ckui-text);
            background: var(--ckui-bg);
            transition: all var(--ckui-animation-duration);
            outline: none;
            resize: vertical;
            min-height: 80px;
            font-family: inherit;
        }

        .ckui-textarea:focus {
            border-color: var(--ckui-info);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Select */
        .ckui-select {
            display: inline-block;
            width: 100%;
            height: 36px;
            padding: var(--ckui-spacing-sm) var(--ckui-spacing);
            border: 1px solid var(--ckui-border);
            border-radius: var(--ckui-radius);
            font-size: 14px;
            color: var(--ckui-text);
            background: var(--ckui-bg);
            transition: all var(--ckui-animation-duration);
            outline: none;
            cursor: pointer;
        }

        .ckui-select:focus {
            border-color: var(--ckui-info);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Checkbox & Radio */
        .ckui-checkbox, .ckui-radio {
            display: inline-flex;
            align-items: center;
            cursor: pointer;
            user-select: none;
        }

        .ckui-checkbox input, .ckui-radio input {
            margin-right: 8px;
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        /* Label */
        .ckui-label {
            display: block;
            margin-bottom: var(--ckui-spacing-sm);
            color: var(--ckui-text);
            font-weight: 500;
            font-size: 14px;
        }

        /* Form Group */
        .ckui-form-group {
            margin-bottom: var(--ckui-spacing);
        }

        .ckui-form-group.has-error .ckui-input,
        .ckui-form-group.has-error .ckui-textarea,
        .ckui-form-group.has-error .ckui-select {
            border-color: var(--ckui-danger);
        }

        .ckui-form-error {
            color: var(--ckui-danger);
            font-size: 12px;
            margin-top: 4px;
            line-height: 1.4;
            display: block;
        }

        /* Layout */
        .ckui-row {
            display: flex;
            flex-wrap: wrap;
            margin: 0 calc(-1 * var(--ckui-spacing-sm));
        }

        .ckui-col {
            flex: 1;
            padding: 0 var(--ckui-spacing-sm);
        }

        .ckui-space {
            display: flex;
            gap: var(--ckui-spacing);
            align-items: center;
        }

        .ckui-divider {
            height: 1px;
            background: var(--ckui-border);
            margin: var(--ckui-spacing-md) 0;
        }

        /* Card */
        .ckui-card {
            background: var(--ckui-bg);
            border-radius: var(--ckui-radius);
            border: 1px solid var(--ckui-border);
            box-shadow: var(--ckui-shadow-sm);
            padding: var(--ckui-spacing-md);
            display: flex;
            flex-direction: column;
        }

        .ckui-card-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--ckui-text);
            margin-bottom: var(--ckui-spacing-sm);
            line-height: 1.5;
        }

        .ckui-card > *:last-child {
            margin-bottom: 0;
        }

        /* Loading */
        .ckui-loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid var(--ckui-border);
            border-top: 2px solid var(--ckui-primary);
            border-radius: 50%;
            animation: ckui-spin 0.8s linear infinite;
        }

        /* Animations */
        @keyframes ckui-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes ckui-fade-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        @keyframes ckui-modal-in {
            from {
                opacity: 0;
                transform: scale(0.95);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        @keyframes ckui-modal-out {
            from {
                opacity: 1;
                transform: scale(1);
            }
            to {
                opacity: 0;
                transform: scale(0.95);
            }
        }

        @keyframes ckui-slide-in-right {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes ckui-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Theme - Dark Mode */
        .ckui-root.ckui-dark {
            --ckui-primary: #3b82f6;
            --ckui-primary-hover: #2563eb;
            --ckui-secondary: #1e293b;
            --ckui-secondary-hover: #334155;
            --ckui-border: #1e293b;
            --ckui-border-dark: #334155;
            --ckui-text: #f1f5f9;
            --ckui-text-secondary: #94a3b8;
            --ckui-text-muted: #64748b;
            --ckui-bg: #0f172a;
            --ckui-bg-secondary: #1e293b;
            --ckui-btn-primary-text: white;
            --ckui-btn-danger-text: white;
            --ckui-btn-success-text: white;
        }

        .ckui-root.ckui-dark .ckui-modal,
        .ckui-root.ckui-dark .ckui-float-window,
        .ckui-root.ckui-dark .ckui-notification,
        .ckui-root.ckui-dark .ckui-card {
            background: var(--ckui-bg);
            border-color: var(--ckui-border);
            color: var(--ckui-text);
        }

        .ckui-root.ckui-dark .ckui-modal-header,
        .ckui-root.ckui-dark .ckui-modal-footer,
        .ckui-root.ckui-dark .ckui-float-header {
            background: var(--ckui-bg);
            border-color: var(--ckui-border);
        }

        .ckui-root.ckui-dark .ckui-modal-body,
        .ckui-root.ckui-dark .ckui-float-body {
            background: var(--ckui-bg);
            color: var(--ckui-text) !important;
        }

        .ckui-root.ckui-dark .ckui-modal-body *,
        .ckui-root.ckui-dark .ckui-float-body * {
            color: inherit;
        }

        .ckui-root.ckui-dark .ckui-modal-title,
        .ckui-root.ckui-dark .ckui-float-title,
        .ckui-root.ckui-dark .ckui-card-title,
        .ckui-root.ckui-dark .ckui-label {
            color: var(--ckui-text);
        }

        .ckui-root.ckui-dark .ckui-modal-close,
        .ckui-root.ckui-dark .ckui-float-btn,
        .ckui-root.ckui-dark .ckui-notification-close {
            color: var(--ckui-text-secondary);
        }

        .ckui-root.ckui-dark .ckui-modal-close:hover,
        .ckui-root.ckui-dark .ckui-float-btn:hover {
            background: var(--ckui-secondary-hover);
            color: var(--ckui-text);
        }

        .ckui-root.ckui-dark .ckui-input,
        .ckui-root.ckui-dark .ckui-textarea,
        .ckui-root.ckui-dark .ckui-select {
            background: var(--ckui-bg-secondary);
            border-color: var(--ckui-border-dark);
            color: var(--ckui-text);
        }

        .ckui-root.ckui-dark .ckui-btn {
            background: var(--ckui-secondary) !important;
            border-color: var(--ckui-border-dark) !important;
            color: var(--ckui-text) !important;
        }

        .ckui-root.ckui-dark .ckui-btn:hover {
            background: var(--ckui-secondary-hover) !important;
            border-color: var(--ckui-border-dark) !important;
        }

        .ckui-root.ckui-dark .ckui-divider {
            background: var(--ckui-border);
        }

        .ckui-root.ckui-dark .ckui-notification-title {
            color: var(--ckui-text);
        }

        .ckui-root.ckui-dark .ckui-notification-message {
            color: var(--ckui-text-secondary);
        }

        /* Dark mode notification color enhancements */
        .ckui-root.ckui-dark .ckui-notification.success {
            border-left-color: #22c55e;
            background-color: var(--ckui-bg);
            background-image: linear-gradient(to right, rgba(34, 197, 94, 0.2) 0%, transparent 30%);
        }

        .ckui-root.ckui-dark .ckui-notification.error {
            border-left-color: #f87171;
            background-color: var(--ckui-bg);
            background-image: linear-gradient(to right, rgba(248, 113, 113, 0.2) 0%, transparent 30%);
        }

        .ckui-root.ckui-dark .ckui-notification.warning {
            border-left-color: #fbbf24;
            background-color: var(--ckui-bg);
            background-image: linear-gradient(to right, rgba(251, 191, 36, 0.2) 0%, transparent 30%);
        }

        .ckui-root.ckui-dark .ckui-notification.info {
            border-left-color: #60a5fa;
            background-color: var(--ckui-bg);
            background-image: linear-gradient(to right, rgba(96, 165, 250, 0.2) 0%, transparent 30%);
        }

        /* 深色模式下primary按钮直接使用变量，无需重定义 */
        .ckui-root.ckui-dark .ckui-btn-primary {
            background: var(--ckui-primary) !important;
            color: var(--ckui-btn-primary-text) !important;
            border-color: var(--ckui-primary) !important;
        }

        .ckui-root.ckui-dark .ckui-btn-primary:hover {
            background: var(--ckui-primary-hover) !important;
            border-color: var(--ckui-primary-hover) !important;
        }

        .ckui-root.ckui-dark .ckui-btn-danger {
            --ckui-danger: #dc2626;
            --ckui-danger-hover: #b91c1c;
            background: var(--ckui-danger);
            color: var(--ckui-btn-danger-text);
            border-color: var(--ckui-danger);
        }

        .ckui-root.ckui-dark .ckui-btn-danger:hover {
            background: var(--ckui-danger-hover);
            border-color: var(--ckui-danger-hover);
        }

        .ckui-root.ckui-dark .ckui-btn-success {
            --ckui-success: #059669;
            --ckui-success-hover: #047857;
            background: var(--ckui-success);
            color: var(--ckui-btn-success-text);
            border-color: var(--ckui-success);
        }

        .ckui-root.ckui-dark .ckui-btn-success:hover {
            background: var(--ckui-success-hover);
            border-color: var(--ckui-success-hover);
        }

        .ckui-root.ckui-dark .ckui-overlay {
            background: rgba(0, 0, 0, 0.8);
        }

        .ckui-root.ckui-dark .ckui-input:focus,
        .ckui-root.ckui-dark .ckui-textarea:focus,
        .ckui-root.ckui-dark .ckui-select:focus {
            border-color: #60a5fa;
            box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
        }

        /* Tags Input */
        .ckui-tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: var(--ckui-spacing-sm);
            padding: var(--ckui-spacing-sm);
            border: 1px solid var(--ckui-border);
            border-radius: var(--ckui-radius);
            background: var(--ckui-bg);
            min-height: 40px;
            align-items: center;
            transition: all var(--ckui-animation-duration);
        }

        .ckui-tags-container:focus-within {
            border-color: var(--ckui-info);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .ckui-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            background: var(--ckui-secondary);
            border: 1px solid var(--ckui-border);
            border-radius: var(--ckui-radius-sm);
            font-size: 13px;
            color: var(--ckui-text);
            max-width: 200px;
        }

        .ckui-tag-text {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .ckui-tag-remove {
            background: none;
            border: none;
            color: var(--ckui-text-secondary);
            cursor: pointer;
            padding: 0;
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            line-height: 1;
            border-radius: 50%;
            transition: all var(--ckui-animation-duration);
        }

        .ckui-tag-remove:hover {
            background: var(--ckui-border);
            color: var(--ckui-text);
        }

        .ckui-tags-input {
            border: none;
            outline: none;
            background: transparent;
            flex: 1;
            min-width: 100px;
            font-size: 14px;
            color: var(--ckui-text);
            padding: 4px;
        }

        .ckui-tags-input::placeholder {
            color: var(--ckui-text-muted);
        }

        /* Tags Error */
        .ckui-tags-container.error {
            border-color: var(--ckui-danger);
            animation: ckui-shake 0.4s ease-in-out;
        }

        .ckui-tags-error {
            color: var(--ckui-danger);
            font-size: 12px;
            margin-top: 4px;
            line-height: 1.4;
        }

        .ckui-tags-error.warning {
            color: var(--ckui-warning);
        }

        @keyframes ckui-shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
        }

        /* Select Tags Dropdown */
        .ckui-select-tags-wrapper {
            position: relative;
        }

        .ckui-select-tags-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 4px;
            background: var(--ckui-bg);
            border: 1px solid var(--ckui-border);
            border-radius: var(--ckui-radius);
            box-shadow: var(--ckui-shadow);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        }

        .ckui-select-tags-dropdown.active {
            display: block;
        }

        .ckui-select-tags-option {
            padding: var(--ckui-spacing-sm) var(--ckui-spacing);
            cursor: pointer;
            transition: all var(--ckui-animation-duration);
            font-size: 14px;
            color: var(--ckui-text);
        }

        .ckui-select-tags-option:hover,
        .ckui-select-tags-option.selected {
            background: var(--ckui-secondary);
        }

        .ckui-select-tags-option.highlighted {
            background: var(--ckui-secondary-hover);
        }

        .ckui-select-tags-option.disabled {
            color: var(--ckui-text-muted);
            cursor: not-allowed;
            opacity: 0.5;
        }

        /* Dark mode for tags */
        .ckui-root.ckui-dark .ckui-tags-container {
            background: var(--ckui-bg-secondary);
            border-color: var(--ckui-border-dark);
        }

        .ckui-root.ckui-dark .ckui-tags-container:focus-within {
            border-color: #60a5fa;
            box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
        }

        .ckui-root.ckui-dark .ckui-tag {
            background: var(--ckui-secondary);
            border-color: var(--ckui-border-dark);
        }

        .ckui-root.ckui-dark .ckui-tags-input {
            color: var(--ckui-text);
        }

        .ckui-root.ckui-dark .ckui-select-tags-dropdown {
            background: var(--ckui-bg);
            border-color: var(--ckui-border-dark);
        }

        .ckui-root.ckui-dark .ckui-select-tags-option:hover,
        .ckui-root.ckui-dark .ckui-select-tags-option.selected {
            background: var(--ckui-secondary);
        }

        .ckui-root.ckui-dark .ckui-select-tags-option.highlighted {
            background: var(--ckui-secondary-hover);
        }

        /* Hidden Area */
        .ckui-hidden-area {
            display: none;
        }

        .ckui-hidden-area.visible {
            display: block;
        }

        /* Detail Component */
        .ckui-detail {
            border: 1px solid var(--ckui-border);
            border-radius: var(--ckui-radius);
            background: var(--ckui-bg);
            overflow: hidden;
            margin-bottom: var(--ckui-spacing);
        }

        .ckui-detail-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--ckui-spacing) var(--ckui-spacing-md);
            cursor: pointer;
            user-select: none;
            transition: background var(--ckui-animation-duration);
            background: var(--ckui-bg);
        }

        .ckui-detail-header:hover {
            background: var(--ckui-secondary);
        }

        .ckui-detail-title {
            font-weight: 600;
            color: var(--ckui-text);
            font-size: 14px;
            margin: 0;
        }

        .ckui-detail-icon {
            transition: transform var(--ckui-animation-duration);
            color: var(--ckui-text-secondary);
            font-size: 16px;
            line-height: 1;
        }

        .ckui-detail.open .ckui-detail-icon {
            transform: rotate(180deg);
        }

        .ckui-detail-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }

        .ckui-detail.open .ckui-detail-content {
            max-height: 2000px;
            transition: max-height 0.5s ease-in;
        }

        .ckui-detail-body {
            padding: var(--ckui-spacing-md);
            border-top: 1px solid var(--ckui-border);
        }

        /* Dark mode for detail */
        .ckui-root.ckui-dark .ckui-detail {
            background: var(--ckui-bg);
            border-color: var(--ckui-border-dark);
        }

        .ckui-root.ckui-dark .ckui-detail-header {
            background: var(--ckui-bg);
        }

        .ckui-root.ckui-dark .ckui-detail-header:hover {
            background: var(--ckui-secondary);
        }

        .ckui-root.ckui-dark .ckui-detail-body {
            border-top-color: var(--ckui-border-dark);
        }

        /* Tabs Component */
        .ckui-tabs {
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .ckui-tabs-header-wrapper {
            position: relative;
            overflow: hidden;
        }

        .ckui-tabs-header {
            display: flex;
            border-bottom: 1px solid var(--ckui-border);
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: thin;
            scrollbar-color: var(--ckui-border) transparent;
            scroll-behavior: smooth;
        }

        .ckui-tabs-header::-webkit-scrollbar {
            height: 4px;
        }

        .ckui-tabs-header::-webkit-scrollbar-track {
            background: transparent;
        }

        .ckui-tabs-header::-webkit-scrollbar-thumb {
            background: var(--ckui-border);
            border-radius: 2px;
        }

        .ckui-tabs-header::-webkit-scrollbar-thumb:hover {
            background: var(--ckui-border-dark);
        }

        /* Tab styles - shadcn inspired */
        .ckui-tab {
            position: relative;
            flex-shrink: 0;
            padding: var(--ckui-spacing) var(--ckui-spacing-md);
            border: none;
            background: transparent;
            color: var(--ckui-text-secondary);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all var(--ckui-animation-duration);
            outline: none;
            white-space: nowrap;
            border-bottom: 2px solid transparent;
        }

        .ckui-tab:hover {
            color: var(--ckui-text);
            background: var(--ckui-secondary);
        }

        .ckui-tab.active {
            color: var(--ckui-primary);
            border-bottom-color: var(--ckui-primary);
        }

        /* Tab style variants */
        .ckui-tabs.style-pills .ckui-tabs-header {
            border-bottom: none;
            gap: var(--ckui-spacing-sm);
            padding: var(--ckui-spacing-sm);
            background: var(--ckui-bg-secondary);
            border-radius: var(--ckui-radius);
        }

        .ckui-tabs.style-pills .ckui-tab {
            border-radius: var(--ckui-radius);
            border-bottom: none;
        }

        .ckui-tabs.style-pills .ckui-tab.active {
            background: var(--ckui-bg);
            color: var(--ckui-primary);
            box-shadow: var(--ckui-shadow-sm);
        }

        .ckui-tabs.style-bordered .ckui-tabs-header {
            border: 1px solid var(--ckui-border);
            border-radius: var(--ckui-radius) var(--ckui-radius) 0 0;
            background: var(--ckui-bg-secondary);
        }

        .ckui-tabs.style-bordered .ckui-tab {
            border-right: 1px solid var(--ckui-border);
            border-bottom: none;
        }

        .ckui-tabs.style-bordered .ckui-tab:last-child {
            border-right: none;
        }

        .ckui-tabs.style-bordered .ckui-tab.active {
            background: var(--ckui-bg);
            color: var(--ckui-primary);
        }

        .ckui-tabs.style-minimal .ckui-tabs-header {
            border-bottom: 1px solid transparent;
            gap: var(--ckui-spacing-lg);
        }

        .ckui-tabs.style-minimal .ckui-tab {
            padding: var(--ckui-spacing-sm) 0;
            border-bottom: 2px solid transparent;
        }

        .ckui-tabs.style-minimal .ckui-tab:hover {
            background: transparent;
        }

        .ckui-tabs.style-minimal .ckui-tab.active {
            border-bottom-color: var(--ckui-primary);
        }

        /* Tabs content */
        .ckui-tabs-content {
            padding: var(--ckui-spacing-md);
            background: var(--ckui-bg);
        }

        .ckui-tabs.style-bordered .ckui-tabs-content {
            border: 1px solid var(--ckui-border);
            border-top: none;
            border-radius: 0 0 var(--ckui-radius) var(--ckui-radius);
        }

        .ckui-tabs.no-padding .ckui-tabs-content {
            padding: 0;
        }

        .ckui-tab-panel {
            display: none;
        }

        .ckui-tab-panel.active {
            display: block;
            animation: ckui-fade-in 0.2s ease-out;
        }

        /* Dark mode for tabs */
        .ckui-root.ckui-dark .ckui-tabs-header {
            border-bottom-color: var(--ckui-border-dark);
        }

        .ckui-root.ckui-dark .ckui-tab:hover {
            background: var(--ckui-secondary);
        }

        .ckui-root.ckui-dark .ckui-tabs.style-pills .ckui-tabs-header {
            background: var(--ckui-bg-secondary);
        }

        .ckui-root.ckui-dark .ckui-tabs.style-pills .ckui-tab.active {
            background: var(--ckui-bg);
        }

        .ckui-root.ckui-dark .ckui-tabs.style-bordered .ckui-tabs-header {
            border-color: var(--ckui-border-dark);
            background: var(--ckui-bg-secondary);
        }

        .ckui-root.ckui-dark .ckui-tabs.style-bordered .ckui-tab {
            border-right-color: var(--ckui-border-dark);
        }

        .ckui-root.ckui-dark .ckui-tabs.style-bordered .ckui-tab.active {
            background: var(--ckui-bg);
        }

        .ckui-root.ckui-dark .ckui-tabs-content {
            background: var(--ckui-bg);
        }

        .ckui-root.ckui-dark .ckui-tabs.style-bordered .ckui-tabs-content {
            border-color: var(--ckui-border-dark);
        }
    `;

    class NotificationManager {
        constructor() {
            this.container = null;
            this.shadowHost = null;
            this.useShadow = false;
            this.init();
        }

        init(useShadow = false) {
            if (!this.container) {
                this.useShadow = useShadow;
                const className = globalConfig.currentTheme === 'dark' 
                    ? 'ckui-root ckui-dark ckui-notification-container'
                    : 'ckui-root ckui-notification-container';
                
                if (useShadow) {
                    const shadow = utils.createShadowHost();
                    this.shadowHost = shadow.host;
                    shadow.container.style.pointerEvents = 'none';
                    this.container = utils.createElement('div', {
                        class: className,
                        style: { zIndex: globalConfig.zIndexBase + 10 }
                    });
                    shadow.container.appendChild(this.container);
                } else {
                    this.container = utils.createElement('div', {
                        class: className,
                        style: { zIndex: globalConfig.zIndexBase + 10 }
                    });
                    document.body.appendChild(this.container);
                }
            }
        }

        show(options = {}) {
            const {
                title = '',
                message = '',
                type = 'info',
                duration = 3000,
                closable = true,
                shadow = false
            } = options;
            
            if (shadow && !this.useShadow) {
                this.destroy();
                this.init(true);
            } else if (!shadow && this.useShadow) {
                this.destroy();
                this.init(false);
            } else if (!this.container) {
                this.init(shadow);
            }

            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };

            const notification = utils.createElement('div', {
                class: `ckui-notification ${type}`
            }, [
                utils.createElement('div', {
                    class: 'ckui-notification-icon'
                }, [icons[type] || icons.info]),
                utils.createElement('div', {
                    class: 'ckui-notification-content'
                }, [
                    title ? utils.createElement('div', {
                        class: 'ckui-notification-title'
                    }, [title]) : null,
                    message ? utils.createElement('div', {
                        class: 'ckui-notification-message'
                    }, [message]) : null
                ].filter(Boolean)),
                closable ? utils.createElement('button', {
                    class: 'ckui-notification-close',
                    type: 'button',
                    onclick: () => this.close(notification)
                }, ['×']) : null
            ].filter(Boolean));

            this.container.appendChild(notification);

            if (duration > 0) {
                setTimeout(() => this.close(notification), duration);
            }

            return notification;
        }

        close(notification) {
            if (notification && notification.parentNode) {
                notification.style.animation = 'ckui-fade-out 0.2s ease-out forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 200);
            }
        }

        success(message, title = '成功') {
            return this.show({ type: 'success', title, message });
        }

        error(message, title = '错误') {
            return this.show({ type: 'error', title, message });
        }

        warning(message, title = '警告') {
            return this.show({ type: 'warning', title, message });
        }

        info(message, title = '提示') {
            return this.show({ type: 'info', title, message });
        }

        destroy() {
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            if (this.shadowHost && this.shadowHost.parentNode) {
                this.shadowHost.parentNode.removeChild(this.shadowHost);
            }
            this.container = null;
            this.shadowHost = null;
            this.useShadow = false;
        }
    }

    class Modal {
        constructor(options = {}) {
            this.id = options.id || null;
            this.options = {
                title: options.title || '提示',
                content: options.content || '',
                width: options.width || '500px',
                showClose: options.showClose !== false,
                footer: options.footer,
                onOk: options.onOk,
                onCancel: options.onCancel,
                maskClosable: options.maskClosable !== false,
                shadow: options.shadow || false,
                allowHtml: options.allowHtml || false,
                icon: options.icon || null,
                iconShape: options.iconShape || 'square',
                iconWidth: options.iconWidth || '24px',
                ...options
            };

            this.overlay = null;
            this.modal = null;
            this.resolvePromise = null;
            this.rejectPromise = null;
            this.isShowing = false;
            this.shadowHost = null;
            this.handleEscape = null;

            if (this.id) {
                instanceManager.register('modals', this.id, this);
            }
        }

        show() {

            if (this.isShowing) {
                this.close(false);
            }
            
            this.isShowing = true;
            return new Promise((resolve, reject) => {
                this.resolvePromise = resolve;
                this.rejectPromise = reject;
                this.render();
            });
        }

        refresh(options = {}) {

            this.options = { ...this.options, ...options };

            if (this.isShowing) {
                this.close(false);
                this.show();
            }
            
            return this;
        }

        render() {
            if (this.options.shadow) {
                const shadow = utils.createShadowHost();
                this.shadowHost = shadow.host;
            }

            const className = globalConfig.currentTheme === 'dark'
                ? 'ckui-root ckui-dark ckui-overlay'
                : 'ckui-root ckui-overlay';
            this.overlay = utils.createElement('div', {
                class: className,
                style: { zIndex: globalConfig.zIndexBase + 8 },
                onclick: (e) => {
                    if (this.options.maskClosable && e.target === this.overlay) {
                        this.cancel();
                    }
                }
            });

            if (!this.options.shadow) {
                const existingOverlays = document.querySelectorAll('.ckui-overlay');
                if (existingOverlays.length > 0) {
                    const maxZ = Math.max(...Array.from(existingOverlays).map(el => parseInt(el.style.zIndex) || 0));
                    this.overlay.style.zIndex = maxZ + 1;
                }
            }

            this.modal = utils.createElement('div', {
                class: 'ckui-modal',
                style: { width: this.options.width }
            });

            const titleChildren = [];
            
            if (this.options.icon) {
                const iconEl = utils.createElement('span', {
                    class: `ckui-modal-icon ${this.options.iconShape}`,
                    style: {
                        width: this.options.iconWidth,
                        height: this.options.iconWidth,
                        fontSize: this.options.iconWidth
                    }
                });
                
                if (this.options.icon.startsWith('http://') || this.options.icon.startsWith('https://') || this.options.icon.startsWith('//') || this.options.icon.startsWith('data:')) {
                    const img = utils.createElement('img', {
                        src: this.options.icon,
                        alt: 'icon'
                    });
                    iconEl.appendChild(img);
                } else {
                    iconEl.textContent = this.options.icon;
                }
                
                titleChildren.push(iconEl);
            }
            
            const titleTextEl = utils.createElement('span');
            if (this.options.allowHtml && typeof this.options.title === 'string') {
                titleTextEl.innerHTML = this.options.title;
            } else {
                titleTextEl.textContent = this.options.title;
            }
            titleChildren.push(titleTextEl);
            
            const titleEl = utils.createElement('h3', {
                class: this.options.icon ? 'ckui-modal-title has-icon' : 'ckui-modal-title'
            }, titleChildren);

            const header = utils.createElement('div', {
                class: 'ckui-modal-header'
            }, [
                titleEl,
                this.options.showClose ? utils.createElement('button', {
                    class: 'ckui-modal-close',
                    type: 'button',
                    onclick: () => this.cancel()
                }, ['×']) : null
            ].filter(Boolean));

            const body = utils.createElement('div', {
                class: 'ckui-modal-body'
            });

            if (typeof this.options.content === 'string') {
                if (this.options.allowHtml) {
                    body.innerHTML = this.options.content;
                } else {
                    body.textContent = this.options.content;
                }
            } else if (this.options.content instanceof Node) {
                body.appendChild(this.options.content);
            }

            let footer;
            if (this.options.footer === null) {
                footer = null;
            } else if (this.options.footer === 'alert') {

                footer = utils.createElement('div', {
                    class: 'ckui-modal-footer'
                }, [
                    utils.createElement('button', {
                        class: 'ckui-btn ckui-btn-primary',
                        type: 'button',
                        onclick: () => this.ok()
                    }, ['确定'])
                ]);
            } else if (this.options.footer) {
                footer = utils.createElement('div', {
                    class: 'ckui-modal-footer'
                });
                if (this.options.footer instanceof Node) {
                    footer.appendChild(this.options.footer);
                } else {
                    footer.innerHTML = this.options.footer;
                }
            } else {
                footer = utils.createElement('div', {
                    class: 'ckui-modal-footer'
                }, [
                    utils.createElement('button', {
                        class: 'ckui-btn',
                        type: 'button',
                        onclick: () => this.cancel()
                    }, ['取消']),
                    utils.createElement('button', {
                        class: 'ckui-btn ckui-btn-primary',
                        type: 'button',
                        onclick: () => this.ok()
                    }, ['确定'])
                ]);
            }

            [header, body, footer].filter(Boolean).forEach(el => {
                this.modal.appendChild(el);
            });

            this.overlay.appendChild(this.modal);
            
            if (this.options.shadow && this.shadowHost) {
                this.shadowHost.shadowRoot.querySelector('div').appendChild(this.overlay);
            } else {
                document.body.appendChild(this.overlay);
            }

            this.handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.cancel();
                }
            };
            document.addEventListener('keydown', this.handleEscape);
        }

        async ok() {
            let shouldClose = true;
            let returnValue = true;
            
            if (this.options.onOk) {
                const result = await this.options.onOk();
                if (result === false) {
                    shouldClose = false;
                } else {
                    returnValue = result;
                }
            }

            if (shouldClose) {
                this.close(returnValue);
            }
        }

        cancel() {
            if (this.options.onCancel) {
                this.options.onCancel();
            }
            this.close(false);
        }

        close(result) {
            if (this.overlay && this.overlay.parentNode) {
                this.isShowing = false;
                if (this.handleEscape) {
                    document.removeEventListener('keydown', this.handleEscape);
                    this.handleEscape = null;
                }
                this.overlay.style.animation = 'ckui-fade-out 0.2s ease-out forwards';
                this.modal.style.animation = 'ckui-modal-out 0.2s ease-out forwards';
                setTimeout(() => {
                    if (this.overlay && this.overlay.parentNode) {
                        this.overlay.parentNode.removeChild(this.overlay);
                    }
                    if (this.shadowHost && this.shadowHost.parentNode) {
                        this.shadowHost.parentNode.removeChild(this.shadowHost);
                        this.shadowHost = null;
                    }
                    if (result) {
                        this.resolvePromise && this.resolvePromise(result);
                    } else {
                        this.rejectPromise && this.rejectPromise();
                    }
                }, 200);
            }
        }

        destroy() {
            this.close(false);
            if (this.id) {
                instanceManager.unregister('modals', this.id);
            }
        }

        static confirm(options) {
            const modal = new Modal(options);
            return modal.show();
        }

        static alert(options) {
            if (typeof options === 'string') {
                options = { content: options };
            }
            const modal = new Modal({
                maskClosable: false,
                showClose: false,
                ...options,
                footer: 'alert'
            });
            return modal.show().then(() => undefined).catch(() => undefined);
        }

        static prompt(options) {
            if (typeof options === 'string') {
                options = { title: options };
            }
            
            const inputValue = options.defaultValue || '';
            const input = utils.createElement('input', {
                class: 'ckui-root ckui-input',
                type: 'text',
                placeholder: options.placeholder || '',
                value: inputValue
            });
            
            const modal = new Modal({
                title: options.title || '请输入',
                content: input,
                width: options.width || '400px',
                maskClosable: false,
                ...options,
                onOk: () => {
                    return true;
                }
            });
            
            return modal.show()
                .then(() => input.value)
                .catch(() => null);
        }

        static select(options) {
            if (!options.options || !Array.isArray(options.options)) {
                throw new Error('select() requires options array');
            }
            
            let selectedValue = options.defaultValue || null;
            
            const container = utils.createElement('div', {
                class: 'ckui-root',
                style: { padding: '8px 0' }
            });
            
            const select = utils.createElement('select', {
                class: 'ckui-select',
                style: { 
                    width: '100%', 
                    fontSize: '15px',
                    height: '40px',
                    lineHeight: '1.5',
                    padding: '8px 12px'
                }
            });
            
            options.options.forEach(opt => {
                const option = utils.createElement('option', {
                    value: opt.value !== undefined ? opt.value : opt
                });
                option.textContent = opt.label || opt.toString();
                option.style.padding = '8px 12px';
                option.style.lineHeight = '1.8';
                
                if (opt.value === options.defaultValue || opt === options.defaultValue) {
                    option.selected = true;
                    selectedValue = opt.value !== undefined ? opt.value : opt;
                }
                
                select.appendChild(option);
            });

            select.onchange = () => {
                selectedValue = select.value;
            };
            
            container.appendChild(select);
            
            const modal = new Modal({
                title: options.title || '请选择',
                content: container,
                width: options.width || '400px',
                maskClosable: false,
                onOk: () => {
                    return selectedValue;
                }
            });
            
            return modal.show();
        }

        static sortableList(options) {
            if (!options.items || !Array.isArray(options.items)) {
                throw new Error('sortableList() requires items array');
            }
            
            let items = [...options.items];
            let draggedIndex = null;
            let dragOverIndex = null;
            let highlightIndices = new Set();
            
            const container = utils.createElement('div', {
                class: 'ckui-root',
                style: { minHeight: '200px', maxHeight: '400px', overflowY: 'auto', padding: '8px' }
            });

            const updateHighlights = () => {
                const itemElements = container.querySelectorAll('.ckui-item');
                itemElements.forEach((el, index) => {
                    const isHighlighted = highlightIndices.has(index);
                    if (isHighlighted) {
                        el.style.borderColor = '#10b981';
                        el.style.background = 'rgba(16, 185, 129, 0.25)';
                        el.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3)';
                    } else {
                        el.style.borderColor = 'var(--ckui-border, #ccc)';
                        el.style.background = 'var(--ckui-bg, #fff)';
                        el.style.boxShadow = '';
                    }
                });
            };

            const blinkHighlight = (...indices) => {

                highlightIndices.clear();
                indices.forEach(i => highlightIndices.add(i));
                requestAnimationFrame(() => {
                    updateHighlights();

                    setTimeout(() => {
                        highlightIndices.clear();
                        requestAnimationFrame(() => {
                            updateHighlights();

                            setTimeout(() => {
                                indices.forEach(i => highlightIndices.add(i));
                                requestAnimationFrame(() => {
                                    updateHighlights();

                                    setTimeout(() => {
                                        highlightIndices.clear();
                                        requestAnimationFrame(() => {
                                            updateHighlights();
                                        });
                                    }, 400);
                                });
                            }, 400);
                        });
                    }, 400);
                });
            };

            const renderList = () => {
                container.innerHTML = '';

                items.forEach((item, index) => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'ckui-item';
                    itemEl.draggable = true;
                    itemEl.dataset.index = index;

                    const isHighlighted = highlightIndices.has(index);
                    const isDragging = draggedIndex === index;
                    itemEl.className = isHighlighted ? 'ckui-item ckui-item-highlight' : 'ckui-item';
                    itemEl.style.cssText = `
                        padding: 12px 16px;
                        margin-bottom: 8px;
                        border: 2px ${isDragging ? 'dashed' : 'solid'} var(--ckui-border, #ccc);
                        border-radius: var(--ckui-radius, 4px);
                        background: var(--ckui-bg, #fff);
                        cursor: grab;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        user-select: none;
                        transition: all 0.3s ease-in-out;
                        opacity: ${isDragging ? '0.6' : '1'};
                    `;

                    if (isDragging) {
                        itemEl.style.borderColor = '#3b82f6';
                        itemEl.style.background = 'rgba(59, 130, 246, 0.1)';
                        itemEl.style.cursor = 'grabbing';
                    }

                    if (isHighlighted) {
                        itemEl.style.borderColor = '#10b981';
                        itemEl.style.borderStyle = 'solid';
                        itemEl.style.background = 'rgba(16, 185, 129, 0.25)';
                        itemEl.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3)';
                        itemEl.style.opacity = '1';
                    }

                    const leftContent = document.createElement('div');
                    leftContent.style.cssText = 'display: flex; align-items: center; gap: 12px; pointer-events: none;';
                    leftContent.innerHTML = `
                        <span style="color: #999; font-size: 18px;">☰</span>
                        <span style="color: #333;">${item.label || item}</span>
                    `;

                    const controls = document.createElement('div');
                    controls.style.cssText = 'display: flex; gap: 4px; pointer-events: auto;';

                    const createBtn = (text, onClick) => {
                        const btn = document.createElement('button');
                        btn.textContent = text;
                        btn.style.cssText = `
                            padding: 4px 10px;
                            cursor: pointer;
                            background: var(--ckui-secondary, #f8fafc);
                            border: 1px solid var(--ckui-border, #e5e7eb);
                            border-radius: var(--ckui-radius-sm, 4px);
                            color: var(--ckui-text-secondary, #64748b);
                            font-size: 16px;
                            line-height: 1;
                            transition: all 0.2s ease;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            min-width: 28px;
                            height: 28px;
                        `;
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            onClick();
                        };

                        btn.onmouseenter = () => {
                            btn.style.background = 'var(--ckui-primary, #0f172a)';
                            btn.style.color = 'white';
                            btn.style.borderColor = 'var(--ckui-primary, #0f172a)';
                            btn.style.transform = 'scale(1.1)';
                        };
                        btn.onmouseleave = () => {
                            btn.style.background = 'var(--ckui-secondary, #f8fafc)';
                            btn.style.color = 'var(--ckui-text-secondary, #64748b)';
                            btn.style.borderColor = 'var(--ckui-border, #e5e7eb)';
                            btn.style.transform = 'scale(1)';
                        };

                        btn.onmousedown = (e) => e.stopPropagation();
                        return btn;
                    };

                    if (index > 0) {
                        controls.appendChild(createBtn('↑', () => {
                            [items[index], items[index - 1]] = [items[index - 1], items[index]];

                            blinkHighlight(index - 1, index);
                        }));
                    }
                    if (index < items.length - 1) {
                        controls.appendChild(createBtn('↓', () => {
                            [items[index], items[index + 1]] = [items[index + 1], items[index]];

                            blinkHighlight(index, index + 1);
                        }));
                    }

                    itemEl.appendChild(leftContent);
                    itemEl.appendChild(controls);

                    itemEl.addEventListener('dragstart', (e) => {
                        draggedIndex = index;
                        e.dataTransfer.effectAllowed = 'move';

                        e.dataTransfer.setData('text/plain', index);
                    });

                    itemEl.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        
                        if (draggedIndex !== null && index !== draggedIndex) {

                            const movedItem = items[draggedIndex];
                            items.splice(draggedIndex, 1);
                            items.splice(index, 0, movedItem);

                            draggedIndex = index;

                            renderList();
                        }
                    });

                    itemEl.addEventListener('drop', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (draggedIndex !== null) {

                            blinkHighlight(index);
                        }
                    });

                    itemEl.addEventListener('dragend', () => {
                        draggedIndex = null;
                        renderList();
                    });

                    container.appendChild(itemEl);
                });
            };

            renderList();
            
            const modal = new Modal({
                title: options.title || '排序列表',
                content: container,
                width: options.width || '500px',
                maskClosable: false,
                onOk: () => {
                    return items;
                }
            });
            
            return modal.show();
        }
    }

    class FloatWindow {
        constructor(options = {}) {
            this.id = options.id || null;
            this.options = {
                title: options.title || '浮动窗口',
                content: options.content || '',
                width: options.width || '400px',
                height: options.height || 'auto',
                x: options.x || 100,
                y: options.y || 100,
                padding: options.padding || '16px',
                draggable: options.draggable !== false,
                minimizable: options.minimizable !== false,
                closable: options.closable !== false,
                onClose: options.onClose || null,
                shadow: options.shadow || false,
                allowHtml: options.allowHtml || false,
                icon: options.icon || null,
                iconShape: options.iconShape || 'square',
                iconWidth: options.iconWidth || '20px',
                ...options
            };

            this.window = null;
            this.isDragging = false;
            this.isMinimized = false;
            this.isShowing = false;
            this.dragStartX = 0;
            this.dragStartY = 0;
            this.windowStartX = 0;
            this.windowStartY = 0;
            this.onCloseCallbacks = [];
            this.onCloseOnceCallbacks = [];
            this.shadowHost = null;
            this.dragHandlers = null;

            if (this.id) {
                instanceManager.register('floatWindows', this.id, this);
            }
        }

        show() {
            if (this.isShowing && this.window && this.window.parentNode) {

                this.window.style.display = '';
                this.window.style.transition = 'opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                this.window.style.opacity = '1';
                this.window.style.transform = 'scale(1)';
                
                setTimeout(() => {
                    if (this.window) {
                        this.window.style.transition = '';
                    }
                }, 200);
                return this;
            }
            
            this.isShowing = true;
            this.render();
            return this;
        }

        refresh(options = {}) {

            this.options = { ...this.options, ...options };

            if (this.isShowing) {
                const wasMinimized = this.isMinimized;
                this.close();
                this.show();
                if (wasMinimized) {
                    this.toggleMinimize();
                }
            }
            
            return this;
        }

        moveToMouse(offsetX = 0, offsetY = 0) {
            return new Promise((resolve) => {
                let mouseX, mouseY;

                if (unsafeWindow.__ckui_mouseTrackingEnabled && unsafeWindow.__ckui_lastMouseX !== null) {
                    mouseX = unsafeWindow.__ckui_lastMouseX;
                    mouseY = unsafeWindow.__ckui_lastMouseY;
                } else if (!unsafeWindow.__ckui_mouseTrackingEnabled) {

                    if (unsafeWindow.__ckui_lastMouseX === null) {
                        unsafeWindow.__ckui_lastMouseX = unsafeWindow.innerWidth / 2;
                        unsafeWindow.__ckui_lastMouseY = unsafeWindow.innerHeight / 2;

                        document.addEventListener('mousemove', (e) => {
                            unsafeWindow.__ckui_lastMouseX = e.clientX;
                            unsafeWindow.__ckui_lastMouseY = e.clientY;
                        }, { passive: true });
                    }
                    mouseX = unsafeWindow.__ckui_lastMouseX;
                    mouseY = unsafeWindow.__ckui_lastMouseY;
                } else {

                    mouseX = unsafeWindow.innerWidth / 2;
                    mouseY = unsafeWindow.innerHeight / 2;
                }

                if (!this.window) {
                    this.render();
                }

                const rect = this.window.getBoundingClientRect();

                const centerX = mouseX - (rect.width / 2) + offsetX;
                const centerY = mouseY - (rect.height / 2) + offsetY;

                const viewportWidth = unsafeWindow.innerWidth;
                const viewportHeight = unsafeWindow.innerHeight;
                
                let finalX = centerX;
                let finalY = centerY;

                if (finalX < 20) finalX = 20;
                if (finalY < 20) finalY = 20;
                if (finalX + rect.width > viewportWidth - 20) {
                    finalX = viewportWidth - rect.width - 20;
                }
                if (finalY + rect.height > viewportHeight - 20) {
                    finalY = viewportHeight - rect.height - 20;
                }
                
                this.window.style.left = finalX + 'px';
                this.window.style.top = finalY + 'px';

                requestAnimationFrame(() => {
                    this.window.style.transition = 'opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    this.window.style.opacity = '1';
                    this.window.style.transform = 'scale(1)';
                    
                    setTimeout(() => {
                        if (this.window) {
                            this.window.style.transition = '';
                        }
                        resolve(this);
                    }, 200);
                });
            });
        }

        onClose(callback, once = false) {
            if (once) {
                this.onCloseOnceCallbacks.push(callback);
            } else {
                this.onCloseCallbacks.push(callback);
            }
            return this;
        }

        offClose(callback) {
            this.onCloseCallbacks = this.onCloseCallbacks.filter(cb => cb !== callback);
            this.onCloseOnceCallbacks = this.onCloseOnceCallbacks.filter(cb => cb !== callback);
            return this;
        }

        render() {
            const className = globalConfig.currentTheme === 'dark'
                ? 'ckui-root ckui-dark ckui-float-window'
                : 'ckui-root ckui-float-window';
            this.window = utils.createElement('div', {
                class: className,
                style: {
                    left: this.options.x + 'px',
                    top: this.options.y + 'px',
                    width: this.options.width,
                    height: this.options.height,
                    zIndex: globalConfig.zIndexBase + 7,
                    opacity: '0',
                    transform: 'scale(0.95)'
                }
            });

            let parent = document.body;
            if (this.options.shadow) {
                const shadow = utils.createShadowHost();
                this.shadowHost = shadow.host;
                parent = shadow.container;
            }

            const titleChildren = [];
            
            if (this.options.icon) {
                const iconEl = utils.createElement('span', {
                    class: `ckui-float-icon ${this.options.iconShape}`,
                    style: {
                        width: this.options.iconWidth,
                        height: this.options.iconWidth,
                        fontSize: this.options.iconWidth
                    }
                });
                
                if (this.options.icon.startsWith('http://') || this.options.icon.startsWith('https://') || this.options.icon.startsWith('data:')) {
                    const img = utils.createElement('img', {
                        src: this.options.icon,
                        alt: 'icon'
                    });
                    iconEl.appendChild(img);
                } else {
                    iconEl.textContent = this.options.icon;
                }
                
                titleChildren.push(iconEl);
            }
            
            const titleTextEl = utils.createElement('span');
            if (this.options.allowHtml && typeof this.options.title === 'string') {
                titleTextEl.innerHTML = this.options.title;
            } else {
                titleTextEl.textContent = this.options.title;
            }
            titleChildren.push(titleTextEl);
            
            const titleEl = utils.createElement('h3', {
                class: this.options.icon ? 'ckui-float-title has-icon' : 'ckui-float-title'
            }, titleChildren);

            const header = utils.createElement('div', {
                class: 'ckui-float-header'
            }, [
                titleEl,
                utils.createElement('div', {
                    class: 'ckui-float-controls'
                }, [
                    this.options.minimizable ? utils.createElement('button', {
                        class: 'ckui-float-btn',
                        type: 'button',
                        onclick: () => this.toggleMinimize()
                    }, ['−']) : null,
                    this.options.closable ? utils.createElement('button', {
                        class: 'ckui-float-btn',
                        type: 'button',
                        onclick: () => this.close()
                    }, ['×']) : null
                ].filter(Boolean))
            ]);

            this.body = utils.createElement('div', {
                class: 'ckui-float-body',
                style: { padding: this.options.padding }
            });

            if (typeof this.options.content === 'string') {
                if (this.options.allowHtml) {
                    this.body.innerHTML = this.options.content;
                } else {
                    this.body.textContent = this.options.content;
                }
            } else if (this.options.content instanceof Node) {
                this.body.appendChild(this.options.content);
            }

            this.window.appendChild(header);
            this.window.appendChild(this.body);

            if (this.options.draggable) {
                this.setupDragging(header);
            }

            parent.appendChild(this.window);

            this.adjustPosition();

            requestAnimationFrame(() => {
                this.window.style.transition = 'opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                this.window.style.opacity = '1';
                this.window.style.transform = 'scale(1)';

                setTimeout(() => {
                    if (this.window) {
                        this.window.style.transition = '';
                    }
                }, 200);
            });
        }

        adjustPosition() {
            if (!this.window) return;
            
            const rect = this.window.getBoundingClientRect();
            const viewportWidth = unsafeWindow.innerWidth;
            const viewportHeight = unsafeWindow.innerHeight;
            
            let x = parseInt(this.window.style.left);
            let y = parseInt(this.window.style.top);

            if (rect.right > viewportWidth) {
                x = viewportWidth - rect.width - 20;
            }

            if (rect.bottom > viewportHeight) {
                y = viewportHeight - rect.height - 20;
            }

            if (x < 20) {
                x = 20;
            }

            if (y < 20) {
                y = 20;
            }
            
            this.window.style.left = x + 'px';
            this.window.style.top = y + 'px';
        }

        setupDragging(header) {
            header.style.cursor = 'move';

            const onMouseDown = (e) => {

                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                
                const rect = this.window.getBoundingClientRect();
                this.windowStartX = rect.left;
                this.windowStartY = rect.top;

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                
                e.preventDefault();
            };

            const onMouseMove = (e) => {
                if (!this.isDragging) return;

                const deltaX = e.clientX - this.dragStartX;
                const deltaY = e.clientY - this.dragStartY;

                this.window.style.left = (this.windowStartX + deltaX) + 'px';
                this.window.style.top = (this.windowStartY + deltaY) + 'px';
            };

            const onMouseUp = () => {
                this.isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            header.addEventListener('mousedown', onMouseDown);

            this.dragHandlers = {
                header,
                onMouseDown,
                onMouseMove,
                onMouseUp
            };
        }

        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            this.body.style.display = this.isMinimized ? 'none' : 'block';

        }

        setContent(content) {
            if (typeof content === 'string') {
                if (this.options.allowHtml) {
                    this.body.innerHTML = content;
                } else {
                    this.body.textContent = content;
                }
            } else if (content instanceof Node) {
                this.body.innerHTML = '';
                this.body.appendChild(content);
            }
            return this;
        }

        close() {
            if (this.window && this.window.parentNode) {
                this.isShowing = false;

                if (this.dragHandlers) {
                    const { header, onMouseDown, onMouseMove, onMouseUp } = this.dragHandlers;
                    if (header) {
                        header.removeEventListener('mousedown', onMouseDown);
                    }

                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    this.dragHandlers = null;
                }
                
                this.window.style.transition = 'opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.6, -0.28, 0.74, 0.05)';
                this.window.style.opacity = '0';
                this.window.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    if (this.window && this.window.parentNode) {
                        this.window.parentNode.removeChild(this.window);
                    }
                    if (this.shadowHost && this.shadowHost.parentNode) {
                        this.shadowHost.parentNode.removeChild(this.shadowHost);
                        this.shadowHost = null;
                    }
                    if (this.options.onClose) {
                        try {
                            this.options.onClose();
                        } catch (e) {
                            console.error('[CKUI] onClose callback error:', e);
                        }
                    }
                    
                    this.onCloseCallbacks.forEach(callback => {
                        try {
                            callback();
                        } catch (e) {
                            console.error('[CKUI] onClose callback error:', e);
                        }
                    });
                    
                    this.onCloseOnceCallbacks.forEach(callback => {
                        try {
                            callback();
                        } catch (e) {
                            console.error('[CKUI] onClose callback error:', e);
                        }
                    });
                    this.onCloseOnceCallbacks = [];
                }, 200);
            }
            return this;
        }

        destroy() {
            this.close();
            if (this.id) {
                instanceManager.unregister('floatWindows', this.id);
            }
            this.onCloseCallbacks = [];
            this.onCloseOnceCallbacks = [];
        }
    }

    class Tabs {
        constructor(options = {}) {
            this.options = {
                tabs: options.tabs || [],
                activeIndex: options.activeIndex || 0,
                style: options.style || 'default', // 'default' | 'pills' | 'bordered' | 'minimal'
                width: options.width || '100%',
                height: options.height || 'auto',
                noPadding: options.noPadding || false,
                onChange: options.onChange || null,
                ...options
            };

            this.container = null;
            this.tabButtons = [];
            this.tabPanels = [];
            this.activeIndex = new Reactive(this.options.activeIndex);

            // 如果提供了响应式变量，使用它
            if (options.reactive) {
                this.activeIndex = options.reactive;
            }

            // 订阅activeIndex变化（不立即执行，等待render后）
            this.activeIndex.subscribe((index) => {
                this._switchTab(index, false);
            }, false);
        }

        render() {
            const className = ['ckui-root', 'ckui-tabs'];
            if (this.options.style !== 'default') {
                className.push(`style-${this.options.style}`);
            }
            if (this.options.noPadding) {
                className.push('no-padding');
            }

            this.container = utils.createElement('div', {
                class: className.join(' '),
                style: {
                    width: this.options.width,
                    height: this.options.height
                }
            });

            // 创建Tab头部
            const headerWrapper = utils.createElement('div', {
                class: 'ckui-tabs-header-wrapper'
            });

            const header = utils.createElement('div', {
                class: 'ckui-tabs-header'
            });

            // 创建Tab按钮
            this.tabButtons = [];
            this.options.tabs.forEach((tab, index) => {
                const button = utils.createElement('button', {
                    type: 'button',
                    class: index === this.activeIndex.value ? 'ckui-tab active' : 'ckui-tab',
                    onclick: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.switchTab(index);
                    }
                }, [tab.label || `Tab ${index + 1}`]);

                this.tabButtons.push(button);
                header.appendChild(button);
            });

            headerWrapper.appendChild(header);
            this.container.appendChild(headerWrapper);

            // 创建Tab内容区域
            const content = utils.createElement('div', {
                class: 'ckui-tabs-content'
            });

            // 创建Tab面板
            this.tabPanels = [];
            this.options.tabs.forEach((tab, index) => {
                const panel = utils.createElement('div', {
                    class: index === this.activeIndex.value ? 'ckui-tab-panel active' : 'ckui-tab-panel'
                });

                // 支持多种内容类型
                if (tab.content instanceof Node) {
                    panel.appendChild(tab.content);
                } else if (typeof tab.content === 'function') {
                    const result = tab.content();
                    if (result instanceof Node) {
                        panel.appendChild(result);
                    } else if (typeof result === 'string') {
                        panel.innerHTML = result;
                    }
                } else if (typeof tab.content === 'string') {
                    if (tab.allowHtml) {
                        panel.innerHTML = tab.content;
                    } else {
                        panel.textContent = tab.content;
                    }
                }

                this.tabPanels.push(panel);
                content.appendChild(panel);
            });

            this.container.appendChild(content);

            return this.container;
        }

        switchTab(index) {
            if (index < 0 || index >= this.options.tabs.length) {
                return;
            }

            // 更新响应式变量，这会触发_switchTab
            this.activeIndex.value = index;
        }

        _switchTab(index, triggerCallback = true) {
            if (!this.container || index < 0 || index >= this.options.tabs.length) {
                return;
            }

            // 更新按钮状态
            this.tabButtons.forEach((button, i) => {
                if (i === index) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });

            // 更新面板状态
            this.tabPanels.forEach((panel, i) => {
                if (i === index) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // 滚动到可见区域
            if (this.tabButtons[index]) {
                this.tabButtons[index].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }

            // 触发onChange回调
            if (triggerCallback && this.options.onChange) {
                this.options.onChange(index, this.options.tabs[index]);
            }
        }

        getActiveIndex() {
            return this.activeIndex.value;
        }

        getActiveTab() {
            return this.options.tabs[this.activeIndex.value];
        }

        addTab(tab) {
            this.options.tabs.push(tab);
            
            if (!this.container) {
                return;
            }

            // 添加按钮
            const header = this.container.querySelector('.ckui-tabs-header');
            const button = utils.createElement('button', {
                type: 'button',
                class: 'ckui-tab',
                onclick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.switchTab(this.options.tabs.length - 1);
                }
            }, [tab.label || `Tab ${this.options.tabs.length}`]);
            this.tabButtons.push(button);
            header.appendChild(button);

            // 添加面板
            const content = this.container.querySelector('.ckui-tabs-content');
            const panel = utils.createElement('div', {
                class: 'ckui-tab-panel'
            });

            if (tab.content instanceof Node) {
                panel.appendChild(tab.content);
            } else if (typeof tab.content === 'function') {
                const result = tab.content();
                if (result instanceof Node) {
                    panel.appendChild(result);
                } else if (typeof result === 'string') {
                    panel.innerHTML = result;
                }
            } else if (typeof tab.content === 'string') {
                if (tab.allowHtml) {
                    panel.innerHTML = tab.content;
                } else {
                    panel.textContent = tab.content;
                }
            }

            this.tabPanels.push(panel);
            content.appendChild(panel);

            return this;
        }

        removeTab(index) {
            if (index < 0 || index >= this.options.tabs.length) {
                return;
            }

            this.options.tabs.splice(index, 1);

            if (this.container) {
                // 移除按钮
                if (this.tabButtons[index]) {
                    this.tabButtons[index].remove();
                    this.tabButtons.splice(index, 1);
                }

                // 移除面板
                if (this.tabPanels[index]) {
                    this.tabPanels[index].remove();
                    this.tabPanels.splice(index, 1);
                }

                // 如果删除的是当前激活的tab，切换到前一个或第一个
                if (this.activeIndex.value === index) {
                    const newIndex = Math.max(0, Math.min(index - 1, this.options.tabs.length - 1));
                    this.switchTab(newIndex);
                } else if (this.activeIndex.value > index) {
                    // 如果当前激活的tab在删除的后面，需要调整索引
                    this.activeIndex.value = this.activeIndex.value - 1;
                }
            }

            return this;
        }

        updateTab(index, tab) {
            if (index < 0 || index >= this.options.tabs.length) {
                return;
            }

            this.options.tabs[index] = { ...this.options.tabs[index], ...tab };

            if (this.container) {
                // 更新按钮文本
                if (tab.label && this.tabButtons[index]) {
                    this.tabButtons[index].textContent = tab.label;
                }

                // 更新面板内容
                if (tab.content && this.tabPanels[index]) {
                    const panel = this.tabPanels[index];
                    panel.innerHTML = '';
                    
                    if (tab.content instanceof Node) {
                        panel.appendChild(tab.content);
                    } else if (typeof tab.content === 'function') {
                        const result = tab.content();
                        if (result instanceof Node) {
                            panel.appendChild(result);
                        } else if (typeof result === 'string') {
                            panel.innerHTML = result;
                        }
                    } else if (typeof tab.content === 'string') {
                        if (tab.allowHtml) {
                            panel.innerHTML = tab.content;
                        } else {
                            panel.textContent = tab.content;
                        }
                    }
                }
            }

            return this;
        }

        destroy() {
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.tabButtons = [];
            this.tabPanels = [];
            this.container = null;
        }
    }

    class FormBuilder {
        constructor(config = {}) {
            this.id = config.id || null;
            this.config = config;
            this.fields = [];
            this.values = new Reactive({});

            if (this.id) {
                instanceManager.register('forms', this.id, this);
            }
        }

        destroy() {
            if (this.id) {
                instanceManager.unregister('forms', this.id);
            }

            if (this.values && this.values._subscribers) {
                this.values._subscribers = [];
            }

            this.fields = [];
        }

        addField(field) {
            this.fields.push(field);
            if (field.name && field.value !== undefined) {
                this.values.value[field.name] = field.value;
            }
            return this;
        }

        input(options) {
            return this.addField({
                type: 'input',
                inputType: 'text',
                ...options
            });
        }

        textarea(options) {
            return this.addField({
                type: 'textarea',
                ...options
            });
        }

        select(options) {
            return this.addField({
                type: 'select',
                ...options
            });
        }

        checkbox(options) {
            return this.addField({
                type: 'checkbox',
                ...options
            });
        }

        radio(options) {
            return this.addField({
                type: 'radio',
                ...options
            });
        }

        tags(options) {
            return this.addField({
                type: 'tags',
                value: options.value || [],
                maxTags: options.maxTags || Infinity,
                ...options
            });
        }

        selectTags(options) {
            return this.addField({
                type: 'selectTags',
                value: options.value || [],
                options: options.options || [],
                allowCustom: options.allowCustom !== false,
                maxTags: options.maxTags || Infinity,
                ...options
            });
        }

        button(options) {
            return this.addField({
                type: 'button',
                ...options
            });
        }

        hiddenarea(options) {
            return this.addField({
                type: 'hiddenarea',
                ...options
            });
        }

        detail(options) {
            return this.addField({
                type: 'detail',
                ...options
            });
        }

        tabs(options) {
            return this.addField({
                type: 'tabs',
                ...options
            });
        }

        space(options) {
            if (typeof options === 'number') {
                options = { size: options };
            }
            return this.addField({
                type: 'space',
                size: 16,
                direction: 'vertical',
                ...options
            });
        }

        html(options) {

            if (typeof options === 'string') {
                return this.addField({
                    type: 'html',
                    content: options
                });
            }
            return this.addField({
                type: 'html',
                ...options
            });
        }

        element(options) {

            if (options instanceof Node || typeof options === 'function') {
                return this.addField({
                    type: 'element',
                    element: options
                });
            }
            return this.addField({
                type: 'element',
                ...options
            });
        }

        elements(options) {

            if (Array.isArray(options) || options instanceof NodeList) {
                return this.addField({
                    type: 'elements',
                    elements: Array.from(options)
                });
            }
            return this.addField({
                type: 'elements',
                ...options
            });
        }

        render() {
            const form = utils.createElement('form', {
                class: 'ckui-form'
            });

            this.fields.forEach(field => {
                const group = this.renderField(field);
                if (group) {
                    form.appendChild(group);
                }
            });

            return form;
        }

        renderField(field) {
            switch (field.type) {
                case 'input':
                    return this.renderInput(field);
                case 'textarea':
                    return this.renderTextarea(field);
                case 'select':
                    return this.renderSelect(field);
                case 'checkbox':
                    return this.renderCheckbox(field);
                case 'radio':
                    return this.renderRadio(field);
                case 'tags':
                    return this.renderTags(field);
                case 'selectTags':
                    return this.renderSelectTags(field);
                case 'button':
                    return this.renderButton(field);
                case 'hiddenarea':
                    return this.renderHiddenArea(field);
                case 'detail':
                    return this.renderDetail(field);
                case 'tabs':
                    return this.renderTabs(field);
                case 'html':
                    return this.renderHtml(field);
                case 'element':
                    return this.renderElement(field);
                case 'elements':
                    return this.renderElements(field);
                case 'space':
                    return this.renderSpace(field);
                default:
                    return null;
            }
        }

        renderInput(field) {
            const group = utils.createElement('div', { class: 'ckui-root ckui-form-group' });
            
            if (field.label) {
                group.appendChild(utils.createElement('label', {
                    class: 'ckui-root ckui-label'
                }, [field.label]));
            }

            const input = utils.createElement('input', {
                class: 'ckui-root ckui-input',
                type: field.inputType || 'text',
                placeholder: field.placeholder || '',
                value: field.value || '',
                name: field.name || ''
            });

            const errorEl = utils.createElement('span', {
                class: 'ckui-form-error',
                style: { display: 'none' }
            });

            const validate = () => {
                if (field.validator) {
                    const result = field.validator(input.value, this.values.value);
                    if (result === true) {
                        group.classList.remove('has-error');
                        errorEl.style.display = 'none';
                        return true;
                    } else {
                        group.classList.add('has-error');
                        errorEl.textContent = result || field.errorMessage || '输入格式不正确';
                        errorEl.style.display = 'block';
                        return false;
                    }
                }
                return true;
            };

            input.addEventListener('input', (e) => {
                const currentValues = { ...this.values.value };
                currentValues[field.name] = e.target.value;
                this.values.value = currentValues;
                
                validate();
                
                if (field.onChange) {
                    field.onChange(e.target.value, this.values.value);
                }
            });

            input.addEventListener('blur', () => {
                validate();
            });

            group.appendChild(input);
            group.appendChild(errorEl);
            return group;
        }

        renderTextarea(field) {
            const group = utils.createElement('div', { class: 'ckui-root ckui-form-group' });
            
            if (field.label) {
                group.appendChild(utils.createElement('label', {
                    class: 'ckui-root ckui-label'
                }, [field.label]));
            }

            const textarea = utils.createElement('textarea', {
                class: 'ckui-root ckui-textarea',
                placeholder: field.placeholder || '',
                name: field.name || ''
            });
            textarea.value = field.value || '';

            const errorEl = utils.createElement('span', {
                class: 'ckui-form-error',
                style: { display: 'none' }
            });

            const validate = () => {
                if (field.validator) {
                    const result = field.validator(textarea.value, this.values.value);
                    if (result === true) {
                        group.classList.remove('has-error');
                        errorEl.style.display = 'none';
                        return true;
                    } else {
                        group.classList.add('has-error');
                        errorEl.textContent = result || field.errorMessage || '输入格式不正确';
                        errorEl.style.display = 'block';
                        return false;
                    }
                }
                return true;
            };

            textarea.addEventListener('input', (e) => {
                const currentValues = { ...this.values.value };
                currentValues[field.name] = e.target.value;
                this.values.value = currentValues;
                
                validate();
                
                if (field.onChange) {
                    field.onChange(e.target.value, this.values.value);
                }
            });

            textarea.addEventListener('blur', () => {
                validate();
            });

            group.appendChild(textarea);
            group.appendChild(errorEl);
            return group;
        }

        renderSelect(field) {
            const group = utils.createElement('div', { class: 'ckui-root ckui-form-group' });
            
            if (field.label) {
                group.appendChild(utils.createElement('label', {
                    class: 'ckui-root ckui-label'
                }, [field.label]));
            }

            const select = utils.createElement('select', {
                class: 'ckui-root ckui-select',
                name: field.name || ''
            });

            (field.options || []).forEach(opt => {
                const option = utils.createElement('option', {
                    value: opt.value
                }, [opt.label || opt.value]);
                
                if (opt.value === field.value) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
                const currentValues = { ...this.values.value };
                currentValues[field.name] = e.target.value;
                this.values.value = currentValues;
                
                if (field.onChange) {
                    field.onChange(e.target.value);
                }
            });

            group.appendChild(select);
            return group;
        }

        renderCheckbox(field) {
            const group = utils.createElement('div', { class: 'ckui-root ckui-form-group' });
            
            const label = utils.createElement('label', {
                class: 'ckui-root ckui-checkbox'
            });

            const input = utils.createElement('input', {
                type: 'checkbox',
                name: field.name || ''
            });

            if (field.value) {
                input.checked = true;
            }

            const errorEl = utils.createElement('span', {
                class: 'ckui-form-error',
                style: { display: 'none' }
            });

            const validate = () => {
                if (field.validator) {
                    const result = field.validator(input.checked, this.values.value);
                    if (result === true) {
                        group.classList.remove('has-error');
                        errorEl.style.display = 'none';
                        return true;
                    } else {
                        group.classList.add('has-error');
                        errorEl.textContent = result || field.errorMessage || '请选择该选项';
                        errorEl.style.display = 'block';
                        return false;
                    }
                }
                return true;
            };

            input.addEventListener('change', (e) => {
                const currentValues = { ...this.values.value };
                currentValues[field.name] = e.target.checked;
                this.values.value = currentValues;
                
                validate();
                
                if (field.onChange) {
                    field.onChange(e.target.checked, this.values.value);
                }
            });

            label.appendChild(input);
            if (field.label) {
                label.appendChild(document.createTextNode(field.label));
            }

            group.appendChild(label);
            group.appendChild(errorEl);
            return group;
        }

        renderRadio(field) {
            const group = utils.createElement('div', { class: 'ckui-root ckui-form-group' });
            
            if (field.label) {
                group.appendChild(utils.createElement('div', {
                    class: 'ckui-root ckui-label'
                }, [field.label]));
            }

            const errorEl = utils.createElement('span', {
                class: 'ckui-form-error',
                style: { display: 'none' }
            });

            const validate = (selectedValue) => {
                if (field.validator) {
                    const result = field.validator(selectedValue, this.values.value);
                    if (result === true) {
                        group.classList.remove('has-error');
                        errorEl.style.display = 'none';
                        return true;
                    } else {
                        group.classList.add('has-error');
                        errorEl.textContent = result || field.errorMessage || '请选择一项';
                        errorEl.style.display = 'block';
                        return false;
                    }
                }
                return true;
            };

            (field.options || []).forEach(opt => {
                const label = utils.createElement('label', {
                    class: 'ckui-root ckui-radio',
                    style: { display: 'block', marginBottom: '8px' }
                });

                const input = utils.createElement('input', {
                    type: 'radio',
                    name: field.name || '',
                    value: opt.value
                });

                if (opt.value === field.value) {
                    input.checked = true;
                }

                input.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        const currentValues = { ...this.values.value };
                        currentValues[field.name] = opt.value;
                        this.values.value = currentValues;
                        
                        validate(opt.value);
                        
                        if (field.onChange) {
                            field.onChange(opt.value, this.values.value);
                        }
                    }
                });

                label.appendChild(input);
                label.appendChild(document.createTextNode(opt.label || opt.value));
                group.appendChild(label);
            });

            group.appendChild(errorEl);
            return group;
        }

        renderButton(field) {
            const button = utils.createElement('button', {
                class: `ckui-root ckui-btn ${field.primary ? 'ckui-btn-primary' : ''}`,
                type: 'button',
                onclick: () => {
                    if (field.onClick) {
                        field.onClick(this.getValues());
                    }
                }
            }, [field.label || 'Button']);

            return button;
        }

        renderTags(field) {
            const group = utils.createElement('div', { class: 'ckui-root ckui-form-group' });
            
            if (field.label) {
                const label = utils.createElement('label', { class: 'ckui-label' }, [field.label]);
                group.appendChild(label);
            }

            const container = utils.createElement('div', {
                class: 'ckui-tags-container'
            });

            const errorEl = utils.createElement('div', {
                class: 'ckui-tags-error',
                style: { display: 'none' }
            });

            const tags = field.value || [];
            const maxTags = field.maxTags || Infinity;
            const validator = field.validator || null;

            const updateTags = () => {
                const currentTags = this.values.value[field.name] || [];
                container.innerHTML = '';
                
                currentTags.forEach(tag => {
                    const tagEl = utils.createElement('div', { class: 'ckui-tag' });
                    const tagText = utils.createElement('span', { class: 'ckui-tag-text' }, [tag]);
                    const removeBtn = utils.createElement('button', {
                        class: 'ckui-tag-remove',
                        type: 'button',
                        onclick: () => {
                            const newTags = currentTags.filter(t => t !== tag);
                            this.values.value = { ...this.values.value, [field.name]: newTags };
                            updateTags();
                            if (field.onChange) field.onChange(newTags);

                            setTimeout(() => input.focus(), 0);
                        }
                    }, ['×']);
                    tagEl.appendChild(tagText);
                    tagEl.appendChild(removeBtn);
                    container.appendChild(tagEl);
                });

                if (currentTags.length < maxTags) {
                    container.appendChild(input);
                    input.disabled = false;
                    input.placeholder = field.placeholder || '输入后按空格添加标签';
                } else {
                    input.disabled = true;
                    input.placeholder = '已达到最大标签数';
                }
            };

            const showError = (message) => {
                errorEl.textContent = message;
                errorEl.style.display = 'block';
                errorEl.classList.remove('warning');
                errorEl.classList.add('error');
                container.classList.add('error');
                setTimeout(() => container.classList.remove('error'), 400);
            };

            const showWarning = (message) => {
                errorEl.textContent = message;
                errorEl.style.display = 'block';
                errorEl.classList.remove('error');
                errorEl.classList.add('warning');
            };

            const clearError = () => {
                errorEl.style.display = 'none';
                errorEl.classList.remove('error', 'warning');
            };

            const input = utils.createElement('input', {
                class: 'ckui-tags-input',
                type: 'text',
                placeholder: field.placeholder || '输入后按空格或回车添加标签'
            });

            let isComposing = false;

            input.addEventListener('compositionstart', () => {
                isComposing = true;
            });

            input.addEventListener('compositionend', () => {
                isComposing = false;
            });

            input.addEventListener('input', () => {
                const value = input.value.trim();
                if (value) {
                    showWarning('按空格或回车添加标签');
                } else {
                    clearError();
                }
            });

            const addTag = () => {
                const value = input.value.trim();
                if (value) {
                    const currentTags = this.values.value[field.name] || [];

                    if (currentTags.includes(value)) {
                        showError('标签已存在，不允许重复');
                        return;
                    }

                    if (currentTags.length >= maxTags) {
                        showError(`最多只能添加 ${maxTags} 个标签`);
                        return;
                    }

                    if (validator) {
                        const result = validator(value, currentTags);
                        if (result !== true) {
                            showError(typeof result === 'string' ? result : '标签校验失败');
                            return;
                        }
                    }

                    const newTags = [...currentTags, value];
                    this.values.value = { ...this.values.value, [field.name]: newTags };
                    input.value = '';
                    clearError();
                    updateTags();
                    if (field.onChange) field.onChange(newTags);

                    setTimeout(() => input.focus(), 0);
                }
            };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (isComposing) {
                        setTimeout(() => addTag(), 50);
                    } else {
                        addTag();
                    }
                }
                else if (e.key === ' ' && !isComposing) {
                    e.preventDefault();
                    addTag();
                }
                else if (e.key === 'Backspace' && input.value === '') {
                    const currentTags = this.values.value[field.name] || [];
                    if (currentTags.length > 0) {
                        const newTags = currentTags.slice(0, -1);
                        this.values.value = { ...this.values.value, [field.name]: newTags };
                        updateTags();
                        if (field.onChange) field.onChange(newTags);

                        setTimeout(() => input.focus(), 0);
                    }
                }
            });

            this.values.value = { ...this.values.value, [field.name]: tags };
            updateTags();

            group.appendChild(container);
            group.appendChild(errorEl);
            return group;
        }

        renderSelectTags(field) {
            const group = utils.createElement('div', { class: 'ckui-root ckui-form-group' });
            
            if (field.label) {
                const label = utils.createElement('label', { class: 'ckui-label' }, [field.label]);
                group.appendChild(label);
            }

            const wrapper = utils.createElement('div', {
                class: 'ckui-select-tags-wrapper'
            });

            const container = utils.createElement('div', {
                class: 'ckui-tags-container'
            });

            const dropdown = utils.createElement('div', {
                class: 'ckui-select-tags-dropdown'
            });

            const errorEl = utils.createElement('div', {
                class: 'ckui-tags-error',
                style: { display: 'none' }
            });

            const tags = field.value || [];
            const options = field.options || [];
            const allowCustom = field.allowCustom !== false;
            const maxTags = field.maxTags || Infinity;
            const validator = field.validator || null;
            let highlightedIndex = -1;
            let filteredOptions = [];

            const updateTags = () => {
                const currentTags = this.values.value[field.name] || [];
                container.innerHTML = '';
                
                currentTags.forEach(tag => {
                    const tagEl = utils.createElement('div', { class: 'ckui-tag' });
                    const tagText = utils.createElement('span', { class: 'ckui-tag-text' }, [tag]);
                    const removeBtn = utils.createElement('button', {
                        class: 'ckui-tag-remove',
                        type: 'button',
                        onclick: () => {
                            const newTags = currentTags.filter(t => t !== tag);
                            this.values.value = { ...this.values.value, [field.name]: newTags };
                            updateTags();
                            if (field.onChange) field.onChange(newTags);
                        }
                    }, ['×']);
                    tagEl.appendChild(tagText);
                    tagEl.appendChild(removeBtn);
                    container.appendChild(tagEl);
                });

                if (currentTags.length < maxTags) {
                    container.appendChild(input);
                    input.disabled = false;
                    input.placeholder = field.placeholder || '输入搜索或选择';
                } else {
                    input.disabled = true;
                    input.placeholder = '已达到最大标签数';
                }
            };

            const showError = (message) => {
                errorEl.textContent = message;
                errorEl.style.display = 'block';
                container.classList.add('error');
                setTimeout(() => container.classList.remove('error'), 400);
            };

            const clearError = () => {
                errorEl.style.display = 'none';
            };

            const updateDropdown = (filterText = '') => {
                const currentTags = this.values.value[field.name] || [];

                filteredOptions = options.filter(opt => 
                    opt.toLowerCase().includes(filterText.toLowerCase()) && 
                    !currentTags.includes(opt)
                );
                
                dropdown.innerHTML = '';
                highlightedIndex = -1;

                if (filteredOptions.length === 0 && filterText && allowCustom) {
                    const isDuplicate = currentTags.includes(filterText);
                    const createOption = utils.createElement('div', {
                        class: isDuplicate ? 'ckui-select-tags-option disabled' : 'ckui-select-tags-option',
                        onclick: () => {
                            if (!isDuplicate) {
                                addTag(filterText);
                            }
                        }
                    }, [isDuplicate ? `⚠️ 已存在: "${filterText}"` : `创建: "${filterText}"`]);
                    dropdown.appendChild(createOption);
                } else {
                    filteredOptions.forEach((opt, idx) => {
                        const optEl = utils.createElement('div', {
                            class: 'ckui-select-tags-option',
                            onclick: () => addTag(opt)
                        }, [opt]);
                        optEl.dataset.index = idx;
                        dropdown.appendChild(optEl);
                    });
                }

                if (dropdown.children.length > 0) {
                    dropdown.classList.add('active');
                } else {
                    dropdown.classList.remove('active');
                }
            };

            const addTag = (tag) => {
                const currentTags = this.values.value[field.name] || [];

                if (currentTags.includes(tag)) {
                    showError('标签已存在，不允许重复');
                    return;
                }

                if (currentTags.length >= maxTags) {
                    showError(`最多只能添加 ${maxTags} 个标签`);
                    return;
                }

                if (validator) {
                    const result = validator(tag, currentTags);
                    if (result !== true) {
                        showError(typeof result === 'string' ? result : '标签校验失败');
                        return;
                    }
                }

                const newTags = [...currentTags, tag];
                this.values.value = { ...this.values.value, [field.name]: newTags };
                input.value = '';
                clearError();
                updateTags();
                updateDropdown('');
                if (field.onChange) field.onChange(newTags);
                input.focus();
            };

            const highlightOption = (index) => {
                const optionEls = dropdown.querySelectorAll('.ckui-select-tags-option');
                optionEls.forEach(el => el.classList.remove('highlighted'));
                
                if (index >= 0 && index < optionEls.length) {
                    highlightedIndex = index;
                    optionEls[index].classList.add('highlighted');
                    optionEls[index].scrollIntoView({ block: 'nearest' });
                }
            };

            const input = utils.createElement('input', {
                class: 'ckui-tags-input',
                type: 'text',
                placeholder: field.placeholder || '输入搜索或选择'
            });

            let isComposing = false;

            input.addEventListener('compositionstart', () => {
                isComposing = true;
            });

            input.addEventListener('compositionend', () => {
                isComposing = false;
            });

            input.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                if (value) {
                    showWarning('按回车选择或添加标签');
                } else {
                    clearError();
                }
                updateDropdown(e.target.value);
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const maxIndex = dropdown.children.length - 1;
                    highlightOption(Math.min(highlightedIndex + 1, maxIndex));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    highlightOption(Math.max(highlightedIndex - 1, 0));
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (isComposing) {
                        setTimeout(() => {
                            if (highlightedIndex >= 0) {
                                const highlighted = dropdown.children[highlightedIndex];
                                if (highlighted) highlighted.click();
                            } else if (input.value.trim()) {
                                if (allowCustom) {
                                    addTag(input.value.trim());
                                } else if (filteredOptions.length > 0) {
                                    addTag(filteredOptions[0]);
                                }
                            }
                        }, 50);
                    } else {
                        if (highlightedIndex >= 0) {
                            const highlighted = dropdown.children[highlightedIndex];
                            if (highlighted) highlighted.click();
                        } else if (input.value.trim()) {
                            if (allowCustom) {
                                addTag(input.value.trim());
                            } else if (filteredOptions.length > 0) {
                                addTag(filteredOptions[0]);
                            }
                        }
                    }
                } else if (e.key === 'Escape') {
                    dropdown.classList.remove('active');
                    input.blur();
                } else if (e.key === 'Backspace' && input.value === '') {
                    const currentTags = this.values.value[field.name] || [];
                    if (currentTags.length > 0) {
                        const newTags = currentTags.slice(0, -1);
                        this.values.value = { ...this.values.value, [field.name]: newTags };
                        updateTags();
                        if (field.onChange) field.onChange(newTags);

                        setTimeout(() => input.focus(), 0);
                    }
                }
            });

            input.addEventListener('focus', () => {
                updateDropdown(input.value);
            });

            input.addEventListener('blur', () => {
                setTimeout(() => dropdown.classList.remove('active'), 200);
            });

            this.values.value = { ...this.values.value, [field.name]: tags };
            updateTags();

            wrapper.appendChild(container);
            wrapper.appendChild(dropdown);
            group.appendChild(wrapper);
            group.appendChild(errorEl);
            return group;
        }

        renderHiddenArea(field) {
            const container = utils.createElement('div', {
                class: 'ckui-root ckui-hidden-area'
            });

            const contentWrapper = utils.createElement('div');

            if (field.fields && Array.isArray(field.fields)) {
                field.fields.forEach(innerField => {
                    const innerGroup = this.renderField(innerField);
                    if (innerGroup) {
                        contentWrapper.appendChild(innerGroup);
                    }
                });
            } else if (field.content) {

                if (typeof field.content === 'string') {
                    contentWrapper.innerHTML = field.content;
                } else if (field.content instanceof Node) {
                    contentWrapper.appendChild(field.content);
                }
            }

            container.appendChild(contentWrapper);

            if (field.visible) {

                if (field.visible.value) {
                    container.classList.add('visible');
                }

                field.visible.subscribe((value) => {
                    if (value) {
                        container.classList.add('visible');
                    } else {
                        container.classList.remove('visible');
                    }
                });
            }

            return container;
        }

        renderDetail(field) {
            const isOpen = field.open !== false;
            const container = utils.createElement('div', {
                class: isOpen ? 'ckui-root ckui-detail open' : 'ckui-root ckui-detail'
            });

            const header = utils.createElement('div', {
                class: 'ckui-detail-header'
            });

            const title = utils.createElement('h4', {
                class: 'ckui-detail-title'
            }, [field.title || '详情']);

            const icon = utils.createElement('span', {
                class: 'ckui-detail-icon'
            }, ['▼']);

            header.appendChild(title);
            header.appendChild(icon);

            const contentWrapper = utils.createElement('div', {
                class: 'ckui-detail-content'
            });

            const body = utils.createElement('div', {
                class: 'ckui-detail-body'
            });

            if (field.fields && Array.isArray(field.fields)) {
                field.fields.forEach(innerField => {
                    const innerGroup = this.renderField(innerField);
                    if (innerGroup) {
                        body.appendChild(innerGroup);
                    }
                });
            } else if (field.content) {

                if (typeof field.content === 'string') {
                    body.innerHTML = field.content;
                } else if (field.content instanceof Node) {
                    body.appendChild(field.content);
                }
            }

            contentWrapper.appendChild(body);
            container.appendChild(header);
            container.appendChild(contentWrapper);

            let isUpdating = false;
            const toggleOpen = (open) => {
                if (isUpdating) return;
                isUpdating = true;

                if (open) {
                    container.classList.add('open');
                } else {
                    container.classList.remove('open');
                }

                if (field.openState && field.openState.value !== open) {
                    field.openState.value = open;
                }

                isUpdating = false;
            };

            header.addEventListener('click', () => {
                toggleOpen(!container.classList.contains('open'));
            });

            if (field.openState) {

                toggleOpen(field.openState.value);

                field.openState.subscribe((value) => {
                    if (!isUpdating) {
                        toggleOpen(value);
                    }
                });
            }

            return container;
        }

        renderTabs(field) {
            const group = utils.createElement('div', { class: 'ckui-root ckui-form-group' });
            
            if (field.label) {
                group.appendChild(utils.createElement('label', {
                    class: 'ckui-root ckui-label'
                }, [field.label]));
            }

            const tabOptions = {
                tabs: field.tabs || [],
                activeIndex: field.activeIndex || 0,
                style: field.style || 'default',
                width: field.width || '100%',
                height: field.height || 'auto',
                noPadding: field.noPadding || false,
                onChange: (index, tab) => {
                    // 更新表单值
                    if (field.name) {
                        const currentValues = { ...this.values.value };
                        currentValues[field.name] = index;
                        this.values.value = currentValues;
                    }

                    // 调用用户的onChange回调
                    if (field.onChange) {
                        field.onChange(index, tab, this.values.value);
                    }
                }
            };

            // 如果提供了响应式变量，使用它
            if (field.reactive) {
                tabOptions.reactive = field.reactive;
            }

            const tabs = new Tabs(tabOptions);
            const tabsElement = tabs.render();

            // 如果有name字段，初始化表单值
            if (field.name) {
                const currentValues = { ...this.values.value };
                currentValues[field.name] = field.activeIndex || 0;
                this.values.value = currentValues;
            }

            group.appendChild(tabsElement);
            return group;
        }

        renderHtml(field) {
            const container = utils.createElement('div', {
                class: 'ckui-root ckui-form-group'
            });
            
            if (field.label) {
                const label = utils.createElement('label', {
                    class: 'ckui-label'
                }, [field.label]);
                container.appendChild(label);
            }
            
            const htmlContainer = utils.createElement('div');
            if (typeof field.content === 'string') {
                htmlContainer.innerHTML = field.content;
            } else if (field.html) {
                htmlContainer.innerHTML = field.html;
            }
            
            if (field.style) {
                Object.entries(field.style).forEach(([key, value]) => {
                    htmlContainer.style[key] = value;
                });
            }
            
            if (field.class) {
                htmlContainer.className = field.class;
            }
            
            container.appendChild(htmlContainer);
            return container;
        }

        renderElement(field) {
            const container = utils.createElement('div', {
                class: 'ckui-root ckui-form-group'
            });
            
            if (field.label) {
                const label = utils.createElement('label', {
                    class: 'ckui-label'
                }, [field.label]);
                container.appendChild(label);
            }
            
            if (field.element) {
                if (typeof field.element === 'function') {
                    const el = field.element();
                    if (el) {
                        container.appendChild(el);
                    }
                } else {
                    container.appendChild(field.element);
                }
            }
            
            return container;
        }

        renderElements(field) {
            const container = utils.createElement('div', {
                class: 'ckui-root ckui-form-group'
            });
            
            if (field.label) {
                const label = utils.createElement('label', {
                    class: 'ckui-label'
                }, [field.label]);
                container.appendChild(label);
            }
            
            const elementsContainer = utils.createElement('div');
            
            if (field.style) {
                Object.entries(field.style).forEach(([key, value]) => {
                    elementsContainer.style[key] = value;
                });
            }
            
            if (field.class) {
                elementsContainer.className = field.class;
            }
            
            if (field.elements && Array.isArray(field.elements)) {
                field.elements.forEach(el => {
                    if (typeof el === 'function') {
                        const element = el();
                        if (element) {
                            elementsContainer.appendChild(element);
                        }
                    } else if (el) {
                        elementsContainer.appendChild(el);
                    }
                });
            }
            
            container.appendChild(elementsContainer);
            return container;
        }

        renderSpace(field) {
            const size = field.size || 16;
            const direction = field.direction || 'vertical';
            const style = direction === 'horizontal'
                ? `display: inline-block; width: ${typeof size === 'number' ? size + 'px' : size};`
                : `display: block; height: ${typeof size === 'number' ? size + 'px' : size};`;
            
            return utils.createElement('div', {
                class: 'ckui-root',
                style
            });
        }

        getValues() {
            return { ...this.values.value };
        }

        setValues(values) {
            this.values.value = { ...this.values.value, ...values };
        }

        bindValue(name, reactive) {
            const unsubscribe = this.values.subscribe((newValues) => {
                if (newValues[name] !== undefined) {
                    reactive.value = newValues[name];
                }
            });

            const reverseUnsubscribe = reactive.subscribe((newValue) => {
                const currentValues = { ...this.values.value };
                if (currentValues[name] !== newValue) {
                    currentValues[name] = newValue;
                    this.values.value = currentValues;
                }
            });

            return () => {
                unsubscribe();
                reverseUnsubscribe();
            };
        }
    }

    const ckui = {
        __initialized: true,
        version: currentVersion,

        getInstance(type, id) {
            return instanceManager.get(type, id);
        },

        getModal(id) {
            return instanceManager.get('modals', id);
        },

        getFloatWindow(id) {
            return instanceManager.get('floatWindows', id);
        },

        getForm(id) {
            return instanceManager.get('forms', id);
        },

        reactive(value) {
            return new Reactive(value);
        },

        utils,

        notification: new NotificationManager(),
        notify(options) {
            return this.notification.show(options);
        },
        success(message, title, options = {}) {
            if (typeof title === 'object') {
                options = title;
                title = options.title || '成功';
            }
            return this.notification.show({ type: 'success', title: title || '成功', message, ...options });
        },
        error(message, title, options = {}) {
            if (typeof title === 'object') {
                options = title;
                title = options.title || '错误';
            }
            return this.notification.show({ type: 'error', title: title || '错误', message, ...options });
        },
        warning(message, title, options = {}) {
            if (typeof title === 'object') {
                options = title;
                title = options.title || '警告';
            }
            return this.notification.show({ type: 'warning', title: title || '警告', message, ...options });
        },
        info(message, title, options = {}) {
            if (typeof title === 'object') {
                options = title;
                title = options.title || '提示';
            }
            return this.notification.show({ type: 'info', title: title || '提示', message, ...options });
        },

        Modal,
        modal(options) {

            if (options.id) {
                const existing = instanceManager.get('modals', options.id);
                if (existing) {
                    return existing.refresh(options);
                }
            }
            return new Modal(options);
        },
        async alert(message, title, id, customOptions = {}) {
            let options = {};
            if (typeof message === 'object') {
                options = message;
            } else if (typeof title === 'object') {

                options = { content: message, title: '提示', ...title };
            } else if (id !== null && id !== undefined && typeof id === 'object') {

                options = { content: message, title: title || '提示', ...id };
            } else {

                options = { content: message, title: title || '提示', id, ...customOptions };
            }

            if (options.id) {
                const existing = instanceManager.get('modals', options.id);
                if (existing) {
                    existing.refresh(options);
                    return existing.show().then(() => undefined).catch(() => undefined);
                }
            }
            return Modal.alert(options);
        },
        async confirm(message, title, id, customOptions = {}) {
            let options = {};
            if (typeof message === 'object') {
                options = message;
            } else if (typeof title === 'object') {

                options = { content: message, title: '确认', ...title };
            } else if (id !== null && id !== undefined && typeof id === 'object') {

                options = { content: message, title: title || '确认', ...id };
            } else {

                options = { content: message, title: title || '确认', id, ...customOptions };
            }

            if (options.id) {
                const existing = instanceManager.get('modals', options.id);
                if (existing) {
                    existing.refresh(options);
                    return existing.show().then(() => true).catch(() => false);
                }
            }
            return Modal.confirm(options).then(() => true).catch(() => false);
        },
        async prompt(message, defaultValue, title, id, customOptions = {}) {
            let options = {};
            if (typeof message === 'object') {
                options = message;
            } else if (typeof defaultValue === 'object') {
                options = { title: message, ...defaultValue };
            } else if (typeof title === 'object') {
                options = { title: message, defaultValue: defaultValue, ...title };
            } else if (id !== null && id !== undefined && typeof id === 'object') {
                options = { title: message, defaultValue: defaultValue, placeholder: title || '', ...id };
            } else {
                options = {
                    title: message,
                    defaultValue: defaultValue,
                    placeholder: title || '',
                    id,
                    ...customOptions
                };
            }

            if (options.id) {
                const existing = instanceManager.get('modals', options.id);
                if (existing) {

                    options.defaultValue = options.defaultValue || '';
                    const input = utils.createElement('input', {
                        class: 'ckui-root ckui-input',
                        type: 'text',
                        placeholder: options.placeholder || '',
                        value: options.defaultValue
                    });
                    options.content = input;
                    existing.refresh(options);
                    return existing.show().then(() => input.value).catch(() => null);
                }
            }
            return Modal.prompt(options);
        },
        async select(options, customOptions = {}) {
            options = { ...options, ...customOptions };
            
            if (options.id) {
                const existing = instanceManager.get('modals', options.id);
                if (existing) {
                    return existing.refresh(options).show();
                }
            }
            return Modal.select(options);
        },
        async sortableList(options, customOptions = {}) {
            options = { ...options, ...customOptions };
            
            if (options.id) {
                const existing = instanceManager.get('modals', options.id);
                if (existing) {
                    return existing.refresh(options).show();
                }
            }
            return Modal.sortableList(options);
        },

        FloatWindow,
        floatWindow(options) {

            if (options.id) {
                const existing = instanceManager.get('floatWindows', options.id);
                if (existing) {
                    return existing.refresh(options);
                }
            }
            return new FloatWindow(options);
        },

        Tabs,
        tabs(options) {
            return new Tabs(options);
        },

        FormBuilder,
        form(options) {

            if (options && options.fields) {
                const builderId = options.formId || null;

                let builder = builderId ? instanceManager.get('forms', builderId) : null;
                if (!builder) {
                    builder = new FormBuilder({ id: builderId });
                }

                builder.fields = [];
                options.fields.forEach(field => {
                    switch (field.type) {
                        case 'input':
                            builder.input(field);
                            break;
                        case 'textarea':
                            builder.textarea(field);
                            break;
                        case 'select':
                            builder.select(field);
                            break;
                        case 'checkbox':
                            builder.checkbox(field);
                            break;
                        case 'radio':
                            builder.radio(field);
                            break;
                        case 'tags':
                            builder.tags(field);
                            break;
                        case 'selectTags':
                            builder.selectTags(field);
                            break;
                        case 'button':
                            builder.button(field);
                            break;
                        case 'hiddenarea':
                            builder.hiddenarea(field);
                            break;
                        case 'detail':
                            builder.detail(field);
                            break;
                        case 'tabs':
                            builder.tabs(field);
                            break;
                        case 'html':
                            builder.html(field);
                            break;
                        case 'element':
                            builder.element(field);
                            break;
                        case 'elements':
                            builder.elements(field);
                            break;
                        case 'space':
                            builder.space(field);
                            break;
                    }
                });
                
                const modalId = options.id || null;
                const modal = modalId ? instanceManager.get('modals', modalId) : null;
                
                if (modal) {
                    modal.refresh({
                        title: options.title || '表单',
                        content: builder.render(),
                        width: options.width || '500px',
                        onOk: () => true
                    });
                    return modal.show()
                        .then(() => builder.getValues())
                        .catch(() => null);
                } else {
                    const newModal = new Modal({
                        id: modalId,
                        title: options.title || '表单',
                        content: builder.render(),
                        width: options.width || '500px',
                        onOk: () => true
                    });
                    
                    return newModal.show()
                        .then(() => builder.getValues())
                        .catch(() => null);
                }
            }

            const builderId = options?.id || null;
            if (builderId) {
                const existing = instanceManager.get('forms', builderId);
                if (existing) {
                    return existing;
                }
            }
            return new FormBuilder(options || {});
        },

        createElement: utils.createElement,
        h: utils.createElement,

        row(options, ...children) {

            if (!options || options instanceof Node || typeof options === 'string') {
                children = [options, ...children].filter(Boolean);
                options = {};
            }
            const props = {
                class: 'ckui-root ckui-row',
                style: options.style || {}
            };
            return utils.createElement('div', props, children);
        },

        col(options, ...children) {
            if (!options || options instanceof Node || typeof options === 'string') {
                children = [options, ...children].filter(Boolean);
                options = {};
            }
            const props = {
                class: 'ckui-root ckui-col',
                style: options.style || {}
            };
            return utils.createElement('div', props, children);
        },

        space(options, ...children) {
            if (!options || options instanceof Node || typeof options === 'string') {
                children = [options, ...children].filter(Boolean);
                options = {};
            }
            const props = {
                class: 'ckui-root ckui-space',
                style: options.style || {}
            };
            return utils.createElement('div', props, children);
        },

        card(options = {}) {
            const props = {
                class: 'ckui-root ckui-card',
                style: options.style || {}
            };
            const card = utils.createElement('div', props);
            
            if (options.title) {
                card.appendChild(utils.createElement('div', {
                    class: 'ckui-card-title'
                }, [options.title]));
            }

            if (options.content) {
                if (typeof options.content === 'string') {
                    const content = document.createElement('div');
                    content.innerHTML = options.content;
                    card.appendChild(content);
                } else if (options.content instanceof Node) {
                    card.appendChild(options.content);
                }
            }

            return card;
        },

        divider() {
            return utils.createElement('div', { class: 'ckui-root ckui-divider' });
        },

        space(size = 16, direction = 'vertical') {
            const styles = {
                display: 'block',
                flexShrink: '0'
            };
            
            if (direction === 'vertical') {
                styles.height = typeof size === 'number' ? size + 'px' : size;
                styles.width = '100%';
            } else if (direction === 'horizontal') {
                styles.width = typeof size === 'number' ? size + 'px' : size;
                styles.height = '100%';
                styles.display = 'inline-block';
            }
            
            return utils.createElement('div', { 
                class: 'ckui-root',
                style: Object.entries(styles).map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`).join('; ')
            });
        },

        button(options = {}) {
            const className = ['ckui-root', 'ckui-btn'];
            if (options.primary) className.push('ckui-btn-primary');
            if (options.danger) className.push('ckui-btn-danger');
            if (options.success) className.push('ckui-btn-success');

            return utils.createElement('button', {
                class: className.join(' '),
                type: 'button',
                onclick: options.onClick,
                disabled: options.disabled
            }, [options.label || 'Button']);
        },

        input(options = {}) {
            const input = utils.createElement('input', {
                class: 'ckui-root ckui-input',
                type: options.type || 'text',
                placeholder: options.placeholder || '',
                value: options.value || '',
                disabled: options.disabled
            });

            if (options.onChange) {
                input.addEventListener('input', (e) => options.onChange(e.target.value));
            }

            if (options.reactive) {
                input.value = options.reactive.value;
                input.addEventListener('input', (e) => {
                    options.reactive.value = e.target.value;
                });
                options.reactive.subscribe((value) => {
                    if (input.value !== value) {
                        input.value = value;
                    }
                });

                setTimeout(() => {
                    if (options.reactive.value !== input.value) {
                        input.value = options.reactive.value;
                    }
                }, 0);
            }

            return input;
        },

        textarea(options = {}) {
            const textarea = utils.createElement('textarea', {
                class: 'ckui-root ckui-textarea',
                placeholder: options.placeholder || '',
                disabled: options.disabled
            });
            textarea.value = options.value || '';

            if (options.onChange) {
                textarea.addEventListener('input', (e) => options.onChange(e.target.value));
            }

            if (options.reactive) {
                textarea.value = options.reactive.value;
                textarea.addEventListener('input', (e) => {
                    options.reactive.value = e.target.value;
                });
                options.reactive.subscribe((value) => {
                    if (textarea.value !== value) {
                        textarea.value = value;
                    }
                });

                setTimeout(() => {
                    if (options.reactive.value !== textarea.value) {
                        textarea.value = options.reactive.value;
                    }
                }, 0);
            }

            return textarea;
        },

        label(text, options = {}) {
            return utils.createElement('label', {
                class: 'ckui-root ckui-label',
                ...options
            }, [text]);
        },

        loading() {
            return utils.createElement('div', { class: 'ckui-root ckui-loading' });
        },

        hiddenarea(options = {}) {
            const container = utils.createElement('div', {
                class: 'ckui-root ckui-hidden-area'
            });

            if (options.content) {
                if (typeof options.content === 'string') {
                    container.innerHTML = options.content;
                } else if (options.content instanceof Node) {
                    container.appendChild(options.content);
                }
            }

            if (options.visible) {

                if (options.visible.value) {
                    container.classList.add('visible');
                }

                options.visible.subscribe((value) => {
                    if (value) {
                        container.classList.add('visible');
                    } else {
                        container.classList.remove('visible');
                    }
                });
            }

            return container;
        },

        detail(options = {}) {
            const isOpen = options.open !== false;
            const container = utils.createElement('div', {
                class: isOpen ? 'ckui-root ckui-detail open' : 'ckui-root ckui-detail'
            });

            const header = utils.createElement('div', {
                class: 'ckui-detail-header'
            });

            const title = utils.createElement('h4', {
                class: 'ckui-detail-title'
            }, [options.title || '详情']);

            const icon = utils.createElement('span', {
                class: 'ckui-detail-icon'
            }, ['▼']);

            header.appendChild(title);
            header.appendChild(icon);

            const contentWrapper = utils.createElement('div', {
                class: 'ckui-detail-content'
            });

            const body = utils.createElement('div', {
                class: 'ckui-detail-body'
            });

            if (options.content) {
                if (typeof options.content === 'string') {
                    body.innerHTML = options.content;
                } else if (options.content instanceof Node) {
                    body.appendChild(options.content);
                }
            }

            contentWrapper.appendChild(body);
            container.appendChild(header);
            container.appendChild(contentWrapper);

            let isUpdating = false;
            const toggleOpen = (open) => {
                if (isUpdating) return;
                isUpdating = true;

                if (open) {
                    container.classList.add('open');
                } else {
                    container.classList.remove('open');
                }

                if (options.openState && options.openState.value !== open) {
                    options.openState.value = open;
                }

                isUpdating = false;
            };

            header.addEventListener('click', () => {
                toggleOpen(!container.classList.contains('open'));
            });

            if (options.openState) {

                toggleOpen(options.openState.value);

                options.openState.subscribe((value) => {
                    if (!isUpdating) {
                        toggleOpen(value);
                    }
                });
            }

            return container;
        },

        setTheme(theme) {
            globalConfig.currentTheme = theme;
            const containers = document.querySelectorAll('.ckui-root');
            containers.forEach(container => {
                if (theme === 'dark') {
                    container.classList.add('ckui-dark');
                } else {
                    container.classList.remove('ckui-dark');
                }
            });
        },

        html(htmlString) {
            const container = document.createElement('div');
            container.className = 'ckui-root';
            container.innerHTML = htmlString;
            return container;
        },

        setZIndexBase(base) {
            globalConfig.zIndexBase = base;
        },

        getZIndexBase() {
            return globalConfig.zIndexBase;
        },

        setCSSVars(vars, target = null) {
            const root = target || document.querySelector('.ckui-root') || document.documentElement;
            Object.entries(vars).forEach(([key, value]) => {
                const varName = key.startsWith('--') ? key : `--ckui-${key}`;
                root.style.setProperty(varName, value);
            });
        },

        trackMouseEvent() {
            if (!unsafeWindow.__ckui_mouseTrackingEnabled) {
                unsafeWindow.__ckui_mouseTrackingEnabled = true;
                unsafeWindow.__ckui_lastMouseX = null;
                unsafeWindow.__ckui_lastMouseY = null;
                
                document.addEventListener('mousemove', (e) => {
                    unsafeWindow.__ckui_lastMouseX = e.clientX;
                    unsafeWindow.__ckui_lastMouseY = e.clientY;
                }, { passive: true });
                
                console.log('[CKUI] 全局鼠标追踪已启用');
            }
            return ckui;
        }
    };

    utils.injectStyles(coreStyles, 'ckui-core-styles');

    unsafeWindow.ckui = ckui;
    
    console.log(`[CKUI] Initialized successfully! Version: ${ckui.version}`);
})(unsafeWindow, document);
