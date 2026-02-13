---
name: userscript
description: 编写User.JS用户脚本的技能
---

# 用户脚本（UserScript）开发技能

本技能文档基于作者的实际脚本编写经验，包含Tampermonkey脚本开发的核心知识、编码规范和最佳实践。

## 目录

1. [脚本结构规范](#脚本结构规范)
2. [元数据配置](#元数据配置)
3. [编码风格指南](#编码风格指南)
4. [常用工具函数](#常用工具函数)
5. [GM_* API 使用](#gm-api-使用)
6. [DOM 操作技巧](#dom-操作技巧)
7. [库文件使用](#库文件使用)
8. [调试技巧](#调试技巧)
9. [最佳实践](#最佳实践)

---

## 脚本结构规范

### 基本结构模板

```javascript
// ==UserScript==
// @name         脚本名称
// @name:zh-CN   脚本中文名称
// @namespace    ckylin-script-命名空间
// @version      0.1.0
// @description  脚本描述
// @description:zh-CN 中文描述
// @author       CKylinMC
// @match        https://example.com/*
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @license      GPL-3.0-only
// @icon         https://example.com/favicon.ico
// @run-at       document-end
// ==/UserScript==

(function(unsafeWindow, document) {
    'use strict';
    
    // #region 工具函数
    const wait = t => new Promise(r => setTimeout(r, t));
    const get = q => document.querySelector(q);
    const getAll = q => [...document.querySelectorAll(q)];
    const log = (...args) => console.log('[脚本名]', ...args);
    // #endregion
    
    // #region 主要功能
    async function init() {
        // 初始化代码
    }
    // #endregion
    
    // 启动脚本
    init();
    
})(unsafeWindow, document);
```

### 结构说明

1. **IIFE 包装**：使用立即执行函数表达式，接收 `unsafeWindow` 和 `document` 作为参数
2. **严格模式**：始终使用 `'use strict';` 启用严格模式
3. **代码分区**：使用 `#region` 和 `#endregion` 注释组织代码块
4. **工具函数优先**：在文件顶部定义常用工具函数
5. **异步处理**：优先使用 async/await 而非回调

---

## 元数据配置

### 必需的元数据标签

```javascript
// @name         脚本名称（必需）
// @namespace    唯一命名空间（必需）
// @version      版本号（必需，格式: 主.次.修订）
// @match        匹配的URL（必需，推荐使用@match而非@include）
// @grant        需要的权限（必需，至少指定unsafeWindow或none）
```

### 推荐的可选标签

```javascript
// @name:zh-CN   中文名称（国际化）
// @description  英文描述
// @description:zh-CN 中文描述
// @author       作者名
// @license      授权协议（推荐：GPL-3.0-only 或 Apache-2.0）
// @icon         脚本图标URL
// @supportURL   支持页面URL（GitHub仓库）
// @updateURL    更新检测URL
// @downloadURL  下载URL
// @run-at       运行时机（document-start/body/end/idle）
```

### 依赖和资源

```javascript
// 引用外部库
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://update.greasyfork.org/scripts/脚本ID/库名.js

// 引用本地库（推荐方式）
// @require      https://update.greasyfork.org/scripts/564901/1749919/CKUI.js
// @require      https://greasyfork.org/scripts/429720-cktools/code/CKTools.js

// 预加载资源
// @resource     iconURL https://example.com/icon.png
// @resource     cssFile https://example.com/style.css

// 跨域请求白名单
// @connect      api.example.com
// @connect      self
// @connect      *
```

### @match 和 @include 的使用

```javascript
// 推荐：使用 @match（更安全，语法严格）
// @match        https://www.bilibili.com/*
// @match        https://*.bilibili.com/*
// @match        https://www.bilibili.com/video/*

// 备选：使用 @include（支持正则）
// @include      /^https:\/\/www\.bilibili\.com\/.*$/
// @include      https://www.bilibili.com/*

// 排除特定页面
// @exclude      https://www.bilibili.com/blacklist/*
```

### @run-at 运行时机

```javascript
// @run-at document-start  // 页面开始加载时（最早，DOM可能不完整）
// @run-at document-body   // body元素存在时
// @run-at document-end    // DOM加载完成时（推荐）
// @run-at document-idle   // 页面完全加载后（默认值）
// @run-at context-menu    // 右键菜单触发时
```

### @grant 权限声明

```javascript
// 常用权限
// @grant        unsafeWindow              // 访问页面window对象
// @grant        GM_getValue               // 读取存储
// @grant        GM_setValue               // 写入存储
// @grant        GM_deleteValue            // 删除存储
// @grant        GM_listValues             // 列出所有键
// @grant        GM_addStyle               // 添加CSS
// @grant        GM_registerMenuCommand    // 注册菜单命令
// @grant        GM_unregisterMenuCommand  // 注销菜单命令
// @grant        GM_xmlhttpRequest         // 跨域请求
// @grant        GM_notification           // 桌面通知
// @grant        GM_setClipboard           // 设置剪贴板
// @grant        GM_openInTab              // 打开新标签页
// @grant        GM_download               // 下载文件

// 无需权限（沙盒模式）
// @grant        none
```

---

## 编码风格指南

### 变量声明

```javascript
// ✅ 推荐：使用 const 和 let
const CONFIG = { retries: 3 };
let counter = 0;

// ❌ 避免：使用 var
var oldStyle = 'bad';

// 对象解构
const { name, version } = GM_info.script;

// 数组解构
const [first, ...rest] = array;
```

### 函数定义

```javascript
// ✅ 箭头函数（简洁语法）
const wait = t => new Promise(r => setTimeout(r, t));
const add = (a, b) => a + b;

// ✅ 异步箭头函数
const fetchData = async (url) => {
    const response = await fetch(url);
    return response.json();
};

// ✅ 普通函数（需要this绑定时）
function MyClass() {
    this.value = 1;
}

// ✅ 异步函数
async function loadPage() {
    await wait(1000);
    return 'loaded';
}
```

### 命名规范

```javascript
// 常量：全大写+下划线
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// 变量和函数：小驼峰
const userName = 'Alice';
const getUserInfo = () => {};

// 类和构造函数：大驼峰
class DataManager {}
const MyComponent = () => {};

// 私有变量：下划线前缀（约定）
const _privateVar = 'internal';

// DOM元素：加前缀
const btnSubmit = document.querySelector('#submit');
const divContainer = document.querySelector('.container');
```

### 字符串处理

```javascript
// ✅ 模板字符串
const message = `Hello, ${userName}!`;
const html = `
    <div class="item">
        <span>${title}</span>
    </div>
`;

// ✅ 多行字符串
const sql = `
    SELECT * FROM users
    WHERE active = 1
    ORDER BY created_at DESC
`;
```

### 对象和数组

```javascript
// ✅ 对象简写
const name = 'Alice';
const age = 25;
const user = { name, age }; // 等同于 { name: name, age: age }

// ✅ 扩展运算符
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5]; // [1,2,3,4,5]
const obj1 = { a: 1 };
const obj2 = { ...obj1, b: 2 }; // { a:1, b:2 }

// ✅ 数组方法链
const result = items
    .filter(item => item.active)
    .map(item => item.name)
    .sort();
```

### 条件判断

```javascript
// ✅ 简洁的条件语句
const isValid = value && value.length > 0;
const result = condition ? valueA : valueB;

// ✅ 可选链
const userName = user?.profile?.name;

// ✅ 空值合并
const displayName = userName ?? 'Anonymous';

// ✅ 卫语句（提前返回）
function process(data) {
    if (!data) return null;
    if (!data.isValid) return null;
    
    // 主要逻辑
    return processData(data);
}
```

### 错误处理

```javascript
// ✅ Try-catch 包装
async function safeFetch(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        log('Fetch error:', error);
        return null;
    }
}

// ✅ 可选的错误记录
try {
    riskyOperation();
} catch (e) {
    console.error('[ScriptName] Error:', e);
}

// ✅ 静默错误（音效播放等）
try {
    sound.play();
} catch (e) {
    // 忽略音频播放失败
}
```

---

## 常用工具函数

### 时间延迟

```javascript
// 基础延迟
const wait = t => new Promise(r => setTimeout(r, t));

// 使用示例
await wait(1000); // 等待1秒

// 带超时的等待
const waitWithTimeout = (ms, timeoutMs) => {
    return Promise.race([
        wait(ms),
        wait(timeoutMs).then(() => { throw new Error('Timeout'); })
    ]);
};
```

### DOM 查询

```javascript
// 单个元素
const get = q => document.querySelector(q);
const $ = get; // 别名

// 多个元素（返回数组）
const getAll = q => [...document.querySelectorAll(q)];
const $$ = getAll; // 别名

// 带上下文的查询
const $child = (parent, selector) => {
    if (typeof parent === 'string') {
        return document.querySelector(`${parent} ${selector}`);
    }
    return parent.querySelector(selector);
};

const $childAll = (parent, selector) => {
    if (typeof parent === 'string') {
        return [...document.querySelectorAll(`${parent} ${selector}`)];
    }
    return [...parent.querySelectorAll(selector)];
};

// 等待元素出现
const waitFor = async (selector, timeout = 10000, interval = 100) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const element = get(selector);
        if (element) return element;
        await wait(interval);
    }
    return null;
};

// 使用示例
const button = await waitFor('#submit-button');
if (button) {
    button.click();
}
```

### 日志输出

```javascript
// 带前缀的日志
const log = (...args) => console.log('[ScriptName]', ...args);
const error = (...args) => console.error('[ScriptName]', ...args);
const warn = (...args) => console.warn('[ScriptName]', ...args);

// 带颜色的日志
const logger = {
    log(...args) {
        console.log('%c[ScriptName]', 'color: #4CAF50', ...args);
    },
    error(...args) {
        console.error('%c[ScriptName]', 'color: #F44336', ...args);
    },
    warn(...args) {
        console.warn('%c[ScriptName]', 'color: #FF9800', ...args);
    },
    debug(...args) {
        if (DEBUG_MODE) {
            console.log('%c[ScriptName Debug]', 'color: #2196F3', ...args);
        }
    }
};
```

### URL 处理

```javascript
// 修复协议
const fixUrlProtocol = (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    } else if (url.startsWith('//')) {
        return window.location.protocol + url;
    } else if (url.startsWith('/')) {
        return window.location.origin + url;
    }
    return url;
};

// 移除尾部斜杠
const removeTailingSlash = (str) => {
    return str.replace(/\/+$/, '');
};

// 获取URL参数
const getUrlParam = (name) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
};

// 解析URL
const parseUrl = (url) => {
    const parser = document.createElement('a');
    parser.href = url;
    return {
        protocol: parser.protocol,
        hostname: parser.hostname,
        port: parser.port,
        pathname: parser.pathname,
        search: parser.search,
        hash: parser.hash
    };
};
```

### Cookie 操作

```javascript
// 获取Cookie
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
};

// B站CSRF Token
const getCSRFToken = () => getCookie('bili_jct');
```

### 页面判断

```javascript
const pages = {
    isVideoPage() {
        return /\/video\//.test(location.pathname);
    },
    isProfilePage() {
        return location.hostname.startsWith('space.bilibili.com');
    },
    isPlayPage() {
        return /\/(video|list)\//.test(location.pathname);
    }
};

// 使用示例
if (pages.isVideoPage()) {
    // 视频页逻辑
}
```

### 重试机制

```javascript
// 带重试的异步函数
const retry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await wait(delay);
            delay *= 2; // 指数退避
        }
    }
};

// 使用示例
const data = await retry(() => fetchData(url), 3, 500);
```

---

## GM_* API 使用

### 数据存储

```javascript
// 保存数据（支持任意类型）
GM_setValue('config', { theme: 'dark', fontSize: 14 });
GM_setValue('counter', 42);
GM_setValue('enabled', true);

// 读取数据（提供默认值）
const config = GM_getValue('config', { theme: 'light', fontSize: 12 });
const counter = GM_getValue('counter', 0);
const enabled = GM_getValue('enabled', false);

// 删除数据
GM_deleteValue('oldKey');

// 列出所有键
const keys = GM_listValues();
keys.forEach(key => {
    console.log(key, GM_getValue(key));
});

// Promise 版本
const config = await GM.getValue('config', {});
await GM.setValue('config', newConfig);
await GM.deleteValue('oldKey');
```

### 存储最佳实践

```javascript
// ✅ 封装存储访问
const storage = {
    get(key, defaultValue) {
        const val = GM_getValue(key);
        if (typeof val === 'undefined' || val === null) {
            return defaultValue;
        }
        return val;
    },
    set(key, val) {
        GM_setValue(key, val);
    },
    del(key) {
        if (typeof GM_removeValue === 'function') {
            GM_removeValue(key);
        } else {
            GM_setValue(key, undefined);
        }
    }
};

// 使用示例
const settings = {
    get autoExtendInfo() {
        return storage.get('autoExtendInfo', true);
    },
    set autoExtendInfo(val) {
        storage.set('autoExtendInfo', val);
    },
    get batchDelay() {
        return storage.get('batchDelay', 0.5);
    },
    set batchDelay(val) {
        storage.set('batchDelay', val);
    }
};
```

### 菜单命令

```javascript
// 注册菜单
const menuIds = [];

const registerMenu = (text, callback) => {
    const id = GM_registerMenuCommand(text, callback);
    menuIds.push(id);
    return id;
};

// 清除所有菜单
const clearMenus = () => {
    menuIds.forEach(id => GM_unregisterMenuCommand(id));
    menuIds.length = 0;
};

// 动态更新菜单
function updateMenu() {
    clearMenus();
    registerMenu(`✓ 功能${enabled ? '已启用' : '已禁用'}`, toggleFeature);
    registerMenu('⚙ 打开设置', openSettings);
}

// 使用示例
let enabled = GM_getValue('enabled', true);

function toggleFeature() {
    enabled = !enabled;
    GM_setValue('enabled', enabled);
    updateMenu();
}

// 初始化菜单
updateMenu();
```

### 跨域请求

```javascript
// GET 请求
GM_xmlhttpRequest({
    method: 'GET',
    url: 'https://api.example.com/data',
    onload: (response) => {
        if (response.status === 200) {
            const data = JSON.parse(response.responseText);
            console.log(data);
        }
    },
    onerror: (error) => {
        console.error('Request failed:', error);
    }
});

// POST 请求
GM_xmlhttpRequest({
    method: 'POST',
    url: 'https://api.example.com/submit',
    headers: {
        'Content-Type': 'application/json'
    },
    data: JSON.stringify({ key: 'value' }),
    onload: (response) => {
        console.log('Response:', response.responseText);
    }
});

// Promise 封装
const request = (options) => {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            ...options,
            onload: resolve,
            onerror: reject,
            ontimeout: reject
        });
    });
};

// 使用示例
try {
    const response = await request({
        method: 'GET',
        url: 'https://api.example.com/data'
    });
    const data = JSON.parse(response.responseText);
    console.log(data);
} catch (error) {
    console.error('Request failed:', error);
}
```

### 添加样式

```javascript
// 添加CSS
GM_addStyle(`
    .my-custom-class {
        color: red;
        font-size: 16px;
    }
    
    .my-button {
        background: #4CAF50;
        border: none;
        padding: 10px 20px;
        cursor: pointer;
    }
    
    .my-button:hover {
        background: #45a049;
    }
`);

// 动态样式
const addStyleDynamic = (selector, rules) => {
    GM_addStyle(`${selector} { ${rules} }`);
};

addStyleDynamic('.target', 'display: none !important;');
```

### 通知

```javascript
// 简单通知
GM_notification(
    '操作成功',
    '提示',
    'https://example.com/icon.png'
);

// 完整选项
GM_notification({
    text: '这是通知内容',
    title: '通知标题',
    image: 'https://example.com/icon.png',
    timeout: 5000,
    onclick: () => {
        console.log('通知被点击');
    },
    ondone: () => {
        console.log('通知已关闭');
    }
});
```

### 剪贴板

```javascript
// 复制到剪贴板
GM_setClipboard('要复制的文本');

// 现代 API（需要用户交互）
const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        // 降级到 GM API
        GM_setClipboard(text);
        return true;
    }
};
```

### 打开新标签页

```javascript
// 在后台打开
GM_openInTab('https://example.com', { active: false });

// 在前台打开（获取焦点）
GM_openInTab('https://example.com', { active: true });

// 在当前标签页打开
GM_openInTab('https://example.com', { insert: true });
```

---

## DOM 操作技巧

### 创建元素

```javascript
// 原生方法
const button = document.createElement('button');
button.textContent = '点击我';
button.className = 'my-button';
button.addEventListener('click', handleClick);
document.body.appendChild(button);

// 使用 CKTools.domHelper（推荐）
const button = CKTools.domHelper({
    tag: 'button',
    text: '点击我',
    classList: ['my-button', 'primary'],
    on: {
        click: handleClick
    },
    append: document.body
});

// HTML 字符串方式
const container = document.createElement('div');
container.innerHTML = `
    <div class="card">
        <h3 class="title">${title}</h3>
        <p class="content">${content}</p>
        <button class="btn">操作</button>
    </div>
`;
container.querySelector('.btn').addEventListener('click', handleClick);
document.body.appendChild(container);
```

### 样式操作

```javascript
const element = get('.target');

// 单个样式
element.style.color = 'red';
element.style.fontSize = '16px';

// CSS 文本
element.style.cssText = 'color: red; font-size: 16px; margin: 10px;';

// 批量设置
Object.assign(element.style, {
    color: 'red',
    fontSize: '16px',
    margin: '10px'
});

// CSS类操作
element.classList.add('active');
element.classList.remove('disabled');
element.classList.toggle('selected');
element.classList.contains('active'); // 检查

// 获取计算后的样式
const bgColor = getComputedStyle(element).backgroundColor;
```

### 事件监听

```javascript
// 添加事件
const button = get('#button');
button.addEventListener('click', (event) => {
    console.log('clicked', event.target);
});

// 移除事件（需要保存函数引用）
const handleClick = (event) => {
    console.log('clicked');
};
button.addEventListener('click', handleClick);
button.removeEventListener('click', handleClick);

// 一次性事件
button.addEventListener('click', handleClick, { once: true });

// 事件委托
document.body.addEventListener('click', (event) => {
    if (event.target.matches('.dynamic-button')) {
        console.log('动态按钮被点击');
    }
});

// 阻止默认行为
link.addEventListener('click', (event) => {
    event.preventDefault();
    // 自定义逻辑
});
```

### 元素操作

```javascript
// 插入元素
parent.appendChild(child); // 末尾插入
parent.insertBefore(child, referenceNode); // 指定位置插入
parent.prepend(child); // 开头插入
parent.append(child1, child2); // 末尾插入多个

// 替换元素
parent.replaceChild(newChild, oldChild);
oldElement.replaceWith(newElement);

// 删除元素
element.remove();
parent.removeChild(child);

// 克隆元素
const clone = element.cloneNode(true); // true: 深克隆（包含子元素）
```

### 属性操作

```javascript
// HTML 属性
element.setAttribute('data-id', '123');
const id = element.getAttribute('data-id');
element.removeAttribute('data-id');
element.hasAttribute('data-id');

// Data 属性
element.dataset.userId = '123'; // 对应 data-user-id
const userId = element.dataset.userId;

// 属性直接赋值
element.id = 'my-id';
element.className = 'my-class';
element.href = 'https://example.com';
```

### 页面滚动

```javascript
// 滚动到元素
element.scrollIntoView({ behavior: 'smooth', block: 'start' });

// 滚动到顶部
window.scrollTo({ top: 0, behavior: 'smooth' });

// 滚动到指定位置
window.scrollTo({ top: 500, left: 0, behavior: 'smooth' });

// 监听滚动
window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    console.log('当前滚动位置:', scrollTop);
});
```

### MutationObserver 监听DOM变化

```javascript
// 监听DOM变化
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // 元素节点
                    console.log('新增元素:', node);
                }
            });
        } else if (mutation.type === 'attributes') {
            console.log('属性变化:', mutation.attributeName);
        }
    });
});

// 开始监听
observer.observe(document.body, {
    childList: true,      // 监听子节点变化
    subtree: true,        // 监听所有后代节点  attributes: true,     // 监听属性变化
    attributeOldValue: true, // 记录旧属性值
    characterData: true   // 监听文本内容变化
});

// 停止监听
observer.disconnect();

// 使用示例：等待元素加载后处理
const waitForElement = (selector, callback) => {
    const element = get(selector);
    if (element) {
        callback(element);
        return;
    }
    
    const observer = new MutationObserver(() => {
        const element = get(selector);
        if (element) {
            callback(element);
            observer.disconnect();
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
};

// 使用
waitForElement('.dynamic-content', (element) => {
    console.log('元素加载完成:', element);
});
```

---

## 库文件使用

本项目提供了多个实用的库文件，位于 `libs/` 目录下。

### CKUI - UI 组件库

CKUI 是一个现代化、无依赖的 UI 组件库，适用于创建美观的用户界面。

```javascript
// 在脚本头部引入
// @require https://update.greasyfork.org/scripts/564901/1749919/CKUI.js

// 创建模态框
const modal = ckui.modal({
    title: '设置',
    content: '这里是模态框内容',
    buttons: [
        {
            text: '确定',
            primary: true,
            onClick: () => {
                console.log('确定被点击');
                modal.close();
            }
        },
        {
            text: '取消',
            onClick: () => modal.close()
        }
    ]
});

modal.show();

// 创建浮动窗口
const floatWindow = ckui.floatWindow({
    title: '工具面板',
    content: '<div>面板内容</div>',
    width: 400,
    height: 300,
    draggable: true
});

floatWindow.show();

// 创建表单
const form = ckui.form({
    fields: [
        {
            type: 'text',
            name: 'username',
            label: '用户名',
            placeholder: '请输入用户名'
        },
        {
            type: 'checkbox',
            name: 'remember',
            label: '记住我'
        }
    ],
    onSubmit: (data) => {
        console.log('表单数据:', data);
    }
});
```

### CKTools - 工具函数库

CKTools 提供了丰富的DOM操作和工具函数。

```javascript
// 在脚本头部引入
// @require https://greasyfork.org/scripts/429720-cktools/code/CKTools.js

// DOM 查询
const element = CKTools.get('#my-element');
const elements = CKTools.getAll('.my-class');

// 创建DOM元素
const button = CKTools.domHelper({
    tag: 'button',
    text: '点击我',
    classList: ['btn', 'btn-primary'],
    style: {
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '10px 20px'
    },
    on: {
        click: () => console.log('clicked')
    },
    append: document.body
});

// 从HTML字符串创建元素
const div = CKTools.domHelper({
    tag: 'div',
    from: '<span>Hello</span><span>World</span>'
});
```

### CKLogger - 日志系统

提供结构化的日志记录功能。

```javascript
// 创建日志记录器
const logger = new Logger('MyScript');

// 记录日志
logger.log('普通日志');
logger.info('信息日志');
logger.warn('警告日志');
logger.error('错误日志');
logger.debug('调试日志');

// 创建子日志记录器
const subLogger = logger.getSubLogger('API');
subLogger.log('API调用'); // 输出: [MyScript/API] API调用

// 控制可见性
logger.setVisible(false); // 隐藏所有日志
logger.setVisible(true);  // 显示日志

// 订阅日志事件
logger.subscribe({
    levels: ['error', 'warn'],
    onlog: (level, namespace, ...args) => {
        // 自定义处理，如发送到服务器
        sendToServer({ level, namespace, message: args });
    }
});
```

### CKEventEmitter - 事件发射器

实现发布-订阅模式。

```javascript
const emitter = new EventEmitter();

// 订阅事件
emitter.on('dataLoaded', (data) => {
    console.log('数据已加载:', data);
});

// 发射事件
emitter.emit('dataLoaded', { items: [] });

// 取消订阅
const handler = (data) => console.log(data);
emitter.on('event', handler);
emitter.off('event', handler);

// 清除所有事件
emitter.clean('event'); // 清除特定事件
emitter.clean();        // 清除所有事件
```

### CKSimpleFilter - 数据过滤器

提供复杂的数据过滤功能。

```javascript
// 创建过滤器
const filter = new SimpleFilter({
    $and: [
        (item) => item.age > 18,
        (item) => item.active === true,
        {
            $or: [
                (item) => item.role === 'admin',
                (item) => item.role === 'moderator'
            ]
        }
    ]
});

// 应用过滤器
const users = [
    { age: 20, active: true, role: 'admin' },
    { age: 17, active: true, role: 'user' },
    { age: 25, active: false, role: 'admin' }
];

const results = await filter.applyFilterToAll(users);
console.log(results); // [true, false, false]

// 过滤数组
const filtered = users.filter((user, i) => results[i]);
```

### CKAutoLoader - B站页面加载检测

专门用于检测 B站播放器加载完成。

```javascript
// 注册加载回调
CKAutoLoader.reg('myScript', () => {
    console.log('播放器加载完成');
    // 执行需要播放器的代码
});

// 监听评论区加载
window.addEventListener('ckBilibiliCommentLoaded', () => {
    console.log('评论区加载完成');
});

// 监听播放器加载
window.addEventListener('ckBilibiliPlayerLoaded', () => {
    console.log('播放器加载完成');
});
```

---

## 调试技巧

### 开启调试模式

```javascript
// 方式1：通过全局变量
unsafeWindow.DEBUG_MODE = true;

// 方式2：通过存储
const DEBUG = GM_getValue('debug', false);

// 方式3：通过URL参数
const DEBUG = new URLSearchParams(location.search).has('debug');

// 调试日志
const debug = (...args) => {
    if (DEBUG) console.log('[Debug]', ...args);
};
```

### 使用 debugger 语句

```javascript
// 在关键位置添加断点
function criticalFunction() {
    debugger; // 浏览器会在此处暂停
    // ... 代码逻辑
}

// 条件断点
if (someCondition) {
    debugger;
}
```

### 性能测试

```javascript
// 测量执行时间
console.time('操作名称');
// ... 执行代码
console.timeEnd('操作名称');

// 性能标记
performance.mark('start');
// ... 执行代码
performance.mark('end');
performance.measure('操作', 'start', 'end');
const measure = performance.getEntriesByName('操作')[0];
console.log(`耗时: ${measure.duration}ms`);
```

### 错误追踪

```javascript
// 全局错误处理
window.addEventListener('error', (event) => {
    log('全局错误:', event.error);
});

// Promise 错误处理
window.addEventListener('unhandledrejection', (event) => {
    log('未处理的Promise错误:', event.reason);
});

// 堆栈跟踪
function trackError() {
    const stack = new Error().stack;
    console.log('调用栈:', stack);
}
```

### 监控 GM 存储变化

```javascript
// 监听存储变化
const listenerId = GM_addValueChangeListener('config', (key, oldValue, newValue, remote) => {
    console.log('存储变化:', {
        key,
        oldValue,
        newValue,
        remote // 是否来自其他标签页
    });
});

// 移除监听
GM_removeValueChangeListener(listenerId);
```

---

## 最佳实践

### 1. 脚本初始化

```javascript
(async function() {
    'use strict';
    
    // 检查运行环境
    if (!unsafeWindow) {
        console.error('unsafeWindow 不可用');
        return;
    }
    
    // 等待必要的库加载
    if (typeof CKTools === 'undefined') {
        console.error('CKTools 未加载');
        return;
    }
    
    // 页面检查
    if (!location.pathname.includes('/video/')) {
        return; // 不在目标页面，直接退出
    }
    
    // 等待关键元素
    const player = await waitFor('.bilibili-player');
    if (!player) {
        console.error('播放器未找到');
        return;
    }
    
    // 初始化脚本
    await init();
    
})();
```

### 2. 配置管理

```javascript
// 集中管理配置
const CONFIG = {
    VERSION: '1.0.0',
    DEBUG: GM_getValue('debug', false),
    RETRY_COUNT: 3,
    TIMEOUT: 5000,
    
    // 选择器
    SELECTORS: {
        player: '.bilibili-player',
        video: 'video',
        danmaku: '.bilibili-player-danmaku'
    },
    
    // API 端点
    API: {
        base: 'https://api.bilibili.com',
        userInfo: '/x/space/acc/info',
        videoInfo: '/x/web-interface/view'
    }
};

// 使用配置
const player = await waitFor(CONFIG.SELECTORS.player, CONFIG.TIMEOUT);
```

### 3. 模块化组织

```javascript
// 按功能分模块
const modules = {
    // 存储模块
    storage: {
        get(key, defaultValue) {
            return GM_getValue(key, defaultValue);
        },
        set(key, value) {
            GM_setValue(key, value);
        }
    },
    
    // UI 模块
    ui: {
        showNotification(message) {
            GM_notification({
                text: message,
                timeout: 3000
            });
        },
        createButton(text, onClick) {
            return CKTools.domHelper({
                tag: 'button',
                text,
                on: { click: onClick }
            });
        }
    },
    
    // API 模块
    api: {
        async getUserInfo(uid) {
            const response = await request({
                method: 'GET',
                url: `${CONFIG.API.base}${CONFIG.API.userInfo}?mid=${uid}`
            });
            return JSON.parse(response.responseText);
        }
    }
};
```

### 4. 错误恢复

```javascript
// 优雅降级
async function initWithFallback() {
    try {
        // 尝试主要方法
        await primaryMethod();
    } catch (error) {
        log('主方法失败，尝试备用方案:', error);
        try {
            await fallbackMethod();
        } catch (fallbackError) {
            error('所有方法均失败:', fallbackError);
            // 显示用户友好的错误消息
            showErrorNotification('功能初始化失败，请刷新页面重试');
        }
    }
}

// 自动重试
async function autoRetry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await wait(1000 * Math.pow(2, i)); // 指数退避
        }
    }
}
```

### 5. 内存管理

```javascript
// 清理事件监听器
const cleanupFunctions = [];

function addCleanup(fn) {
    cleanupFunctions.push(fn);
}

function cleanup() {
    cleanupFunctions.forEach(fn => {
        try {
            fn();
        } catch (e) {
            console.error('清理失败:', e);
        }
    });
    cleanupFunctions.length = 0;
}

// 页面卸载时清理
window.addEventListener('beforeunload', cleanup);

// 使用示例
const button = get('#button');
const handler = () => console.log('clicked');
button.addEventListener('click', handler);
addCleanup(() => button.removeEventListener('click', handler));
```

### 6. 性能优化

```javascript
// 防抖
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 节流
function throttle(func, wait) {
    let lastTime = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastTime >= wait) {
            lastTime = now;
            func.apply(this, args);
        }
    };
}

// 使用示例
const handleScroll = throttle(() => {
    console.log('滚动事件');
}, 200);

window.addEventListener('scroll', handleScroll);

// 懒加载
const lazyLoad = (items, render) => {
    const batchSize = 20;
    let index = 0;
    
    function loadNext() {
        const batch = items.slice(index, index + batchSize);
        batch.forEach(render);
        index += batchSize;
        
        if (index < items.length) {
            requestAnimationFrame(loadNext);
        }
    }
    
    loadNext();
};
```

### 7. 兼容性处理

```javascript
// 检测 API 可用性
const isGM4 = typeof GM !== 'undefined' && typeof GM.getValue === 'function';

const getValue = isGM4 
    ? (key, defaultValue) => GM.getValue(key, defaultValue)
    : GM_getValue;

const setValue = isGM4
    ? (key, value) => GM.setValue(key, value)
    : GM_setValue;

// 浏览器特性检测
const features = {
    hasIntersectionObserver: 'IntersectionObserver' in window,
    hasResizeObserver: 'ResizeObserver' in window,
    hasFetch: 'fetch' in window
};

if (!features.hasFetch) {
    // 使用 GM_xmlhttpRequest 作为降级方案
}
```

### 8. 用户体验

```javascript
// 首次运行提示
const STORAGE_KEY_FIRST_RUN = 'firstRun';

if (GM_getValue(STORAGE_KEY_FIRST_RUN, true)) {
    GM_notification({
        title: '欢迎使用脚本',
        text: '首次运行，请在菜单中配置选项',
        timeout: 5000
    });
    GM_setValue(STORAGE_KEY_FIRST_RUN, false);
}

// 版本更新提示
const CURRENT_VERSION = '1.2.0';
const lastVersion = GM_getValue('version', '0.0.0');

if (lastVersion !== CURRENT_VERSION) {
    // 显示更新日志
    showUpdateLog(lastVersion, CURRENT_VERSION);
    GM_setValue('version', CURRENT_VERSION);
}

// 加载状态提示
function showLoading(message = '加载中...') {
    const loading = document.createElement('div');
    loading.id = 'script-loading';
    loading.textContent = message;
    loading.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 999999;
    `;
    document.body.appendChild(loading);
    
    return {
        update: (msg) => loading.textContent = msg,
        remove: () => loading.remove()
    };
}

// 使用
const loading = showLoading('正在初始化...');
await init();
loading.update('初始化完成');
setTimeout(() => loading.remove(), 2000);
```

### 9. 安全性考虑  

```javascript
// 输入验证
function sanitizeInput(input) {
    return String(input)
        .replace(/[<>"']/g, (char) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return entities[char];
        });
}

// 安全的 HTML 插入
function safeSetHTML(element, html) {
    element.textContent = ''; // 清空
    const temp = document.createElement('div');
    temp.innerHTML = html;
    while (temp.firstChild) {
        element.appendChild(temp.firstChild);
    }
}

// URL 验证
function isValidURL(url) {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

// 使用
const userInput = sanitizeInput(untrustedData);
const element = get('#output');
element.textContent = userInput; // 安全的文本插入
```

### 10. 文档和维护

```javascript
/**
 * 获取用户信息
 * @param {number} uid - 用户ID
 * @param {boolean} includeStats - 是否包含统计信息
 * @returns {Promise<Object>} 用户信息对象
 * @throws {Error} 当请求失败时抛出错误
 */
async function getUserInfo(uid, includeStats = false) {
    if (!uid || typeof uid !== 'number') {
        throw new Error('Invalid user ID');
    }
    
    const url = `${API_BASE}/user/${uid}${includeStats ? '?stats=true' : ''}`;
    
    try {
        const response = await request({ method: 'GET', url });
        return JSON.parse(response.responseText);
    } catch (error) {
        log('获取用户信息失败:', error);
        throw error;
    }
}

// 版本历史记录（放在文件头部）
/**
 * @version 1.2.0
 * @changelog
 * - 1.2.0: 新增批量操作功能
 * - 1.1.0: 优化UI交互
 * - 1.0.0: 首次发布
 */
```

---

## 完整示例脚本

以下是一个综合应用上述所有最佳实践的完整示例：

```javascript
// ==UserScript==
// @name         Bilibili 视频增强
// @name:zh-CN   哔哩哔哩视频增强
// @namespace    ckylin-script-bilibili-video-enhance
// @version      1.0.0
// @description  Enhance Bilibili video page with useful features
// @description:zh-CN 为B站视频页面添加实用功能
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_notification
// @require      https://greasyfork.org/scripts/429720-cktools/code/CKTools.js
// @license      GPL-3.0-only
// @icon         https://www.bilibili.com/favicon.ico
// @supportURL   https://github.com/CKylinMC/UserJS
// @run-at       document-end
// ==/UserScript==

(async function(unsafeWindow, document) {
    'use strict';
    
    // #region 配置
    const CONFIG = {
        VERSION: '1.0.0',
        DEBUG: false,
        STORAGE_PREFIX: 'bili_enhance_',
        
        SELECTORS: {
            player: '.bilibili-player',
            video: 'video',
            videoTitle: 'h1.video-title'
        }
    };
    // #endregion
    
    // #region 工具函数
    const wait = t => new Promise(r => setTimeout(r, t));
    const get = q => document.querySelector(q);
    const getAll = q => [...document.querySelectorAll(q)];
    const log = (...args) => console.log('[VideoEnhance]', ...args);
    const error = (...args) => console.error('[VideoEnhance]', ...args);
    
    const waitFor = async (selector, timeout = 10000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = get(selector);
            if (el) return el;
            await wait(100);
        }
        return null;
    };
    // #endregion
    
    // #region 存储管理
    const storage = {
        get(key, defaultValue) {
            return GM_getValue(CONFIG.STORAGE_PREFIX + key, defaultValue);
        },
        set(key, value) {
            GM_setValue(CONFIG.STORAGE_PREFIX + key, value);
        },
        del(key) {
            GM_deleteValue(CONFIG.STORAGE_PREFIX + key);
        }
    };
    
    const settings = {
        get autoPlay() {
            return storage.get('autoPlay', true);
        },
        set autoPlay(val) {
            storage.set('autoPlay', val);
        },
        
        get playerVolume() {
            return storage.get('playerVolume', 0.5);
        },
        set playerVolume(val) {
            storage.set('playerVolume', Math.max(0, Math.min(1, val)));
        }
    };
    // #endregion
    
    // #region UI组件
    GM_addStyle(`
        .video-enhance-btn {
            padding: 8px 16px;
            background: #00a1d6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .video-enhance-btn:hover {
            background: #0092c4;
        }
        
        .video-enhance-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
            padding: 20px;
            z-index: 9999;
            min-width: 300px;
        }
    `);
    
    function createButton(text, onClick) {
        return CKTools.domHelper({
            tag: 'button',
            text,
            classList: ['video-enhance-btn'],
            on: { click: onClick }
        });
    }
    // #endregion
    
    // #region 核心功能
    class VideoEnhancer {
        constructor() {
            this.player = null;
            this.video = null;
            this.initialized = false;
        }
        
        async init() {
            if (this.initialized) return;
            
            try {
                log('初始化中...');
                
                // 等待播放器加载
                this.player = await waitFor(CONFIG.SELECTORS.player);
                if (!this.player) {
                    throw new Error('播放器未找到');
                }
                
                this.video = await waitFor(CONFIG.SELECTORS.video);
                if (!this.video) {
                    throw new Error('视频元素未找到');
                }
                
                // 应用设置
                this.applySettings();
                
                // 添加UI
                this.setupUI();
                
                // 注册菜单
                this.setupMenu();
                
                this.initialized = true;
                log('初始化完成');
                
                GM_notification({
                    title: '视频增强',
                    text: '功能已启用',
                    timeout: 2000
                });
                
            } catch (err) {
                error('初始化失败:', err);
            }
        }
        
        applySettings() {
            // 应用自动播放设置
            if (!settings.autoPlay) {
                this.video.pause();
            }
            
            // 应用音量设置
            this.video.volume = settings.playerVolume;
            
            log('设置已应用');
        }
        
        setupUI() {
            const videoTitle = get(CONFIG.SELECTORS.videoTitle);
            if (!videoTitle) return;
            
            const buttonContainer = CKTools.domHelper({
                tag: 'div',
                style: { marginTop: '10px' }
            });
            
            const downloadBtn = createButton('下载视频', () => {
                this.downloadVideo();
            });
            
            const speedBtn = createButton('倍速播放', () => {
                this.changeSpeed();
            });
            
            buttonContainer.appendChild(downloadBtn);
            buttonContainer.appendChild(speedBtn);
            
            videoTitle.parentNode.insertBefore(
                buttonContainer,
                videoTitle.nextSibling
            );
        }
        
        setupMenu() {
            const menuIds = [];
            
            menuIds.push(GM_registerMenuCommand(
                `${settings.autoPlay ? '✓' : '✗'} 自动播放`,
                () => {
                    settings.autoPlay = !settings.autoPlay;
                    this.setupMenu(); // 刷新菜单
                    GM_notification({
                        text: `自动播放已${settings.autoPlay ? '启用' : '禁用'}`,
                        timeout: 2000
                    });
                }
            ));
            
            menuIds.push(GM_registerMenuCommand(
                '⚙ 重置设置',
                () => {
                    if (confirm('确定要重置所有设置吗？')) {
                        storage.del('autoPlay');
                        storage.del('playerVolume');
                        location.reload();
                    }
                }
            ));
            
            // 保存菜单ID用于后续清理
            this._menuIds = menuIds;
        }
        
        downloadVideo() {
            log('下载功能待实现');
            GM_notification({
                text: '下载功能开发中...',
                timeout: 2000
            });
        }
        
        changeSpeed() {
            const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
            const currentSpeed = this.video.playbackRate;
            const currentIndex = speeds.indexOf(currentSpeed);
            const nextIndex = (currentIndex + 1) % speeds.length;
            
            this.video.playbackRate = speeds[nextIndex];
            
            GM_notification({
                text: `播放速度: ${speeds[nextIndex]}x`,
                timeout: 1500
            });
        }
        
        destroy() {
            // 清理资源
            if (this._menuIds) {
                this._menuIds.forEach(id => {
                    GM_unregisterMenuCommand(id);
                });
            }
            log('资源已清理');
        }
    }
    // #endregion
    
    // #region 主程序
    // 页面检查
    if (!/\/video\//.test(location.pathname)) {
        return;
    }
    
    // 创建增强器实例
    const enhancer = new VideoEnhancer();
    
    // 初始化
    await enhancer.init();
    
    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
        enhancer.destroy();
    });
    
    log(`Version ${CONFIG.VERSION} loaded`);
    // #endregion
    
})(unsafeWindow, document);
```

---

## 总结

本技能文档覆盖了用户脚本开发的核心知识点：

1. **结构规范**：IIFE包装、严格模式、代码分区
2. **元数据配置**：完整的@标签说明和最佳实践
3. **编码风格**：现代JavaScript语法、命名规范
4. **工具函数**：常用的辅助函数封装
5. **GM API**：Tampermonkey提供的强大API
6. **DOM操作**：高效的DOM查询和操作技巧
7. **库文件**：项目自带库的使用说明
8. **调试技巧**：开发和调试方法
9. **最佳实践**：生产级代码的编写规范
10. **完整示例**：综合应用的实战案例

遵循这些指南可以编写出高质量、可维护的用户脚本。