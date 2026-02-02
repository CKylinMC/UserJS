// ==UserScript==
// @name         CKUI
// @namespace    ckylin-script-lib-ckui
// @version      2.0.0
// @description  A modern, dependency-free UI library for Tampermonkey scripts
// @match        http://*
// @match        https://*
// @author       CKylinMC
// @license      Apache-2.0
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';
    
    // 防止重复加载
    if (typeof unsafeWindow === 'undefined') {
        window.unsafeWindow = window;
    }
    
    if (unsafeWindow.ckui && unsafeWindow.ckui.__initialized) {
        console.log('[CKUI] Already initialized, skipping...');
        return;
    }

    // ===========================================
    // 全局配置
    // ===========================================
    const globalConfig = {
        zIndexBase: 999990, // 可配置的基础 z-index
        currentTheme: 'light' // 当前主题
    };

    // ===========================================
    // 响应式系统
    // ===========================================
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

        subscribe(callback) {
            this._subscribers.push(callback);
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

    // ===========================================
    // 工具函数
    // ===========================================
    const utils = {
        uuid() {
            return 'ckui-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
        },

        createElement(tag, props = {}, children = []) {
            const el = document.createElement(tag);
            
            Object.entries(props).forEach(([key, value]) => {
                // 跳过 undefined 和 null 值
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
                    // disabled 为 false 时不设置属性
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
        }
    };

    // ===========================================
    // 核心样式
    // ===========================================
    const coreStyles = `
        /* CKUI Core Styles - Isolated with high specificity */
        .ckui-root {
            all: initial;
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
            margin-bottom: var(--ckui-spacing-xl);
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
    `;

    // ===========================================
    // 通知系统
    // ===========================================
    class NotificationManager {
        constructor() {
            this.container = null;
            this.init();
        }

        init() {
            if (!this.container) {
                const className = globalConfig.currentTheme === 'dark' 
                    ? 'ckui-root ckui-dark ckui-notification-container'
                    : 'ckui-root ckui-notification-container';
                this.container = utils.createElement('div', {
                    class: className,
                    style: { zIndex: globalConfig.zIndexBase + 10 }
                });
                document.body.appendChild(this.container);
            }
        }

        show(options = {}) {
            const {
                title = '',
                message = '',
                type = 'info',
                duration = 3000,
                closable = true
            } = options;

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
    }

    // ===========================================
    // 模态框
    // ===========================================
    class Modal {
        constructor(options = {}) {
            this.options = {
                title: options.title || '提示',
                content: options.content || '',
                width: options.width || '500px',
                showClose: options.showClose !== false,
                footer: options.footer,
                onOk: options.onOk,
                onCancel: options.onCancel,
                maskClosable: options.maskClosable !== false,
                ...options
            };

            this.overlay = null;
            this.modal = null;
            this.resolvePromise = null;
            this.rejectPromise = null;
        }

        show() {
            return new Promise((resolve, reject) => {
                this.resolvePromise = resolve;
                this.rejectPromise = reject;
                this.render();
            });
        }

        render() {
            // Create overlay
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

            // 弹窗堆叠处理
            const existingOverlays = document.querySelectorAll('.ckui-overlay');
            if (existingOverlays.length > 0) {
                const maxZ = Math.max(...Array.from(existingOverlays).map(el => parseInt(el.style.zIndex) || 0));
                this.overlay.style.zIndex = maxZ + 1;
            }

            this.modal = utils.createElement('div', {
                class: 'ckui-modal',
                style: { width: this.options.width }
            });

            // Header
            const header = utils.createElement('div', {
                class: 'ckui-modal-header'
            }, [
                utils.createElement('h3', {
                    class: 'ckui-modal-title'
                }, [this.options.title]),
                this.options.showClose ? utils.createElement('button', {
                    class: 'ckui-modal-close',
                    onclick: () => this.cancel()
                }, ['×']) : null
            ].filter(Boolean));

            // Body
            const body = utils.createElement('div', {
                class: 'ckui-modal-body'
            });

            if (typeof this.options.content === 'string') {
                body.innerHTML = this.options.content;
            } else if (this.options.content instanceof Node) {
                body.appendChild(this.options.content);
            }

            // Footer
            let footer;
            if (this.options.footer === null) {
                footer = null;
            } else if (this.options.footer === 'alert') {
                // Alert 特殊处理
                footer = utils.createElement('div', {
                    class: 'ckui-modal-footer'
                }, [
                    utils.createElement('button', {
                        class: 'ckui-btn ckui-btn-primary',
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
                        onclick: () => this.cancel()
                    }, ['取消']),
                    utils.createElement('button', {
                        class: 'ckui-btn ckui-btn-primary',
                        onclick: () => this.ok()
                    }, ['确定'])
                ]);
            }

            // Assemble
            [header, body, footer].filter(Boolean).forEach(el => {
                this.modal.appendChild(el);
            });

            this.overlay.appendChild(this.modal);
            document.body.appendChild(this.overlay);

            // Handle escape key
            this.handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.cancel();
                }
            };
            document.addEventListener('keydown', this.handleEscape);
        }

        async ok() {
            let shouldClose = true;
            
            if (this.options.onOk) {
                const result = await this.options.onOk();
                if (result === false) {
                    shouldClose = false;
                }
            }

            if (shouldClose) {
                this.close(true);
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
                document.removeEventListener('keydown', this.handleEscape);
                this.overlay.style.animation = 'ckui-fade-out 0.2s ease-out forwards';
                this.modal.style.animation = 'ckui-modal-out 0.2s ease-out forwards';
                setTimeout(() => {
                    if (this.overlay && this.overlay.parentNode) {
                        this.overlay.parentNode.removeChild(this.overlay);
                    }
                    if (result) {
                        this.resolvePromise && this.resolvePromise(result);
                    } else {
                        this.rejectPromise && this.rejectPromise();
                    }
                }, 200);
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
                ...options,
                footer: 'alert' // 特殊标记
            });
            return modal.show();
        }
    }

    // ===========================================
    // 浮动窗口
    // ===========================================
    class FloatWindow {
        constructor(options = {}) {
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
                ...options
            };

            this.window = null;
            this.isDragging = false;
            this.isMinimized = false;
            this.dragStartX = 0;
            this.dragStartY = 0;
            this.windowStartX = 0;
            this.windowStartY = 0;
        }

        show() {
            this.render();
            return this;
        }

        render() {
            // Create window
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
                    zIndex: globalConfig.zIndexBase + 7
                }
            });

            // Header
            const header = utils.createElement('div', {
                class: 'ckui-float-header'
            }, [
                utils.createElement('h3', {
                    class: 'ckui-float-title'
                }, [this.options.title]),
                utils.createElement('div', {
                    class: 'ckui-float-controls'
                }, [
                    this.options.minimizable ? utils.createElement('button', {
                        class: 'ckui-float-btn',
                        onclick: () => this.toggleMinimize()
                    }, ['−']) : null,
                    this.options.closable ? utils.createElement('button', {
                        class: 'ckui-float-btn',
                        onclick: () => this.close()
                    }, ['×']) : null
                ].filter(Boolean))
            ]);

            // Body
            this.body = utils.createElement('div', {
                class: 'ckui-float-body',
                style: { padding: this.options.padding }
            });

            if (typeof this.options.content === 'string') {
                this.body.innerHTML = this.options.content;
            } else if (this.options.content instanceof Node) {
                this.body.appendChild(this.options.content);
            }

            // Assemble
            this.window.appendChild(header);
            this.window.appendChild(this.body);

            // Setup dragging
            if (this.options.draggable) {
                this.setupDragging(header);
            }

            document.body.appendChild(this.window);
        }

        setupDragging(header) {
            header.style.cursor = 'move';

            const onMouseDown = (e) => {
                // 移除 isMinimized 判断，允许最小化状态下仍然可以拖动
                
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
        }

        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            this.body.style.display = this.isMinimized ? 'none' : 'block';
            // 最小化时仍然保持可拖动，不需要禁用拖动功能
        }

        setContent(content) {
            if (typeof content === 'string') {
                this.body.innerHTML = content;
            } else if (content instanceof Node) {
                this.body.innerHTML = '';
                this.body.appendChild(content);
            }
            return this;
        }

        close() {
            if (this.window && this.window.parentNode) {
                this.window.parentNode.removeChild(this.window);
            }
            return this;
        }
    }

    // ===========================================
    // 表单构建器
    // ===========================================
    class FormBuilder {
        constructor(config = {}) {
            this.config = config;
            this.fields = [];
            this.values = new Reactive({});
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

        button(options) {
            return this.addField({
                type: 'button',
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
                case 'button':
                    return this.renderButton(field);
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

            input.addEventListener('input', (e) => {
                const currentValues = { ...this.values.value };
                currentValues[field.name] = e.target.value;
                this.values.value = currentValues;
                
                if (field.onChange) {
                    field.onChange(e.target.value);
                }
            });

            group.appendChild(input);
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

            textarea.addEventListener('input', (e) => {
                const currentValues = { ...this.values.value };
                currentValues[field.name] = e.target.value;
                this.values.value = currentValues;
                
                if (field.onChange) {
                    field.onChange(e.target.value);
                }
            });

            group.appendChild(textarea);
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

            input.addEventListener('change', (e) => {
                const currentValues = { ...this.values.value };
                currentValues[field.name] = e.target.checked;
                this.values.value = currentValues;
                
                if (field.onChange) {
                    field.onChange(e.target.checked);
                }
            });

            label.appendChild(input);
            if (field.label) {
                label.appendChild(document.createTextNode(field.label));
            }

            group.appendChild(label);
            return group;
        }

        renderRadio(field) {
            const group = utils.createElement('div', { class: 'ckui-root ckui-form-group' });
            
            if (field.label) {
                group.appendChild(utils.createElement('div', {
                    class: 'ckui-root ckui-label'
                }, [field.label]));
            }

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
                        
                        if (field.onChange) {
                            field.onChange(opt.value);
                        }
                    }
                });

                label.appendChild(input);
                label.appendChild(document.createTextNode(opt.label || opt.value));
                group.appendChild(label);
            });

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

    // ===========================================
    // 主 API
    // ===========================================
    const ckui = {
        __initialized: true,
        version: '2.0.0',

        // 响应式
        reactive(value) {
            return new Reactive(value);
        },

        // 工具
        utils,

        // 通知
        notification: new NotificationManager(),
        notify(options) {
            return this.notification.show(options);
        },
        success(message, title) {
            return this.notification.success(message, title);
        },
        error(message, title) {
            return this.notification.error(message, title);
        },
        warning(message, title) {
            return this.notification.warning(message, title);
        },
        info(message, title) {
            return this.notification.info(message, title);
        },

        // 模态框
        Modal,
        modal(options) {
            return new Modal(options);
        },
        confirm(options) {
            return Modal.confirm(options);
        },
        alert(options) {
            return Modal.alert(options);
        },

        // 浮动窗口
        FloatWindow,
        floatWindow(options) {
            return new FloatWindow(options);
        },

        // 表单构建器
        FormBuilder,
        form() {
            return new FormBuilder();
        },

        // 创建元素
        createElement: utils.createElement,
        h: utils.createElement,

        // 布局组件
        row(options, ...children) {
            // 如果第一个参数不是配置对象，则视为子元素
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

        // 按钮
        button(options = {}) {
            const className = ['ckui-root', 'ckui-btn'];
            if (options.primary) className.push('ckui-btn-primary');
            if (options.danger) className.push('ckui-btn-danger');
            if (options.success) className.push('ckui-btn-success');

            return utils.createElement('button', {
                class: className.join(' '),
                onclick: options.onClick,
                disabled: options.disabled
            }, [options.label || 'Button']);
        },

        // 输入框
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
                // 触发初始订阅以确保同步
                setTimeout(() => {
                    if (options.reactive.value !== input.value) {
                        input.value = options.reactive.value;
                    }
                }, 0);
            }

            return input;
        },

        // 文本域
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
                // 触发初始订阅以确保同步
                setTimeout(() => {
                    if (options.reactive.value !== textarea.value) {
                        textarea.value = options.reactive.value;
                    }
                }, 0);
            }

            return textarea;
        },

        // 选择框
        select(options = {}) {
            const select = utils.createElement('select', {
                class: 'ckui-root ckui-select',
                disabled: options.disabled
            });

            (options.options || []).forEach(opt => {
                const option = utils.createElement('option', {
                    value: opt.value
                }, [opt.label || opt.value]);
                
                if (opt.value === options.value) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });

            if (options.onChange) {
                select.addEventListener('change', (e) => options.onChange(e.target.value));
            }

            if (options.reactive) {
                select.value = options.reactive.value;
                select.addEventListener('change', (e) => {
                    options.reactive.value = e.target.value;
                });
                options.reactive.subscribe((value) => {
                    select.value = value;
                });
            }

            return select;
        },

        // 标签
        label(text, options = {}) {
            return utils.createElement('label', {
                class: 'ckui-root ckui-label',
                ...options
            }, [text]);
        },

        // 加载动画
        loading() {
            return utils.createElement('div', { class: 'ckui-root ckui-loading' });
        },

        // 主题切换
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

        // HTML 渲染
        html(htmlString) {
            const container = document.createElement('div');
            container.className = 'ckui-root';
            container.innerHTML = htmlString;
            return container;
        },

        // 配置 z-index 基础值
        setZIndexBase(base) {
            globalConfig.zIndexBase = base;
        },

        getZIndexBase() {
            return globalConfig.zIndexBase;
        },

        // 设置CSS变量（自定义主题）
        setCSSVars(vars, target = null) {
            const root = target || document.querySelector('.ckui-root') || document.documentElement;
            Object.entries(vars).forEach(([key, value]) => {
                const varName = key.startsWith('--') ? key : `--ckui-${key}`;
                root.style.setProperty(varName, value);
            });
        }
    };

    // ===========================================
    // 初始化
    // ===========================================
    utils.injectStyles(coreStyles, 'ckui-core-styles');

    // 导出到全局
    unsafeWindow.ckui = ckui;
    
    console.log('[CKUI] Initialized successfully! Version:', ckui.version);
})();
