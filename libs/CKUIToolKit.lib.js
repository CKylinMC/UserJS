// ==UserScript==
// @name         CKUIToolkit
// @namespace    ckylin-script-lib-combined-ui-components
// @version      1.0
// @match        http://*
// @match        https://*
// // @require      https://greasyfork.org/scripts/429720-cktools/code/CKTools.js?version=1029952
// @resource     popjs https://cdn.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.js
// @resource     popcss https://cdn.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.css
// @resource     fpjs https://cdn.jsdelivr.net/gh/CKylinMC/FloatPopup.js@main/floatpopup.js
// @resource     fpcss https://cdn.jsdelivr.net/gh/CKylinMC/FloatPopup.js@main/floatpopup.modal.css
// @resource     cktools https://greasyfork.org/scripts/429720-cktools/code/CKTools.js?version=1029952
// @author       CKylinMC
// @license      GPL-3.0-only
// @grant        GM_getResourceText
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    if (typeof (unsafeWindow) == 'undefined') {
        unsafeWindow = window;
    }
    if (typeof (GM_getResourceText) != 'function') {
        GM_getResourceText = () => null;
    }
    unsafeWindow.CKUIToolkit_loaded = false;
    //======[Apply all resources]
    const resourceList = [
        { name: 'popjs', type: 'js', source: 'https://cdn.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.js'},
        { name: 'popcss', type: 'css', source:'https://cdn.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.css' },
        { name: 'fpjs', type: 'js', source: 'https://cdn.jsdelivr.net/gh/CKylinMC/FloatPopup.js@main/floatpopup.js' },
        { name: 'fpcss', type: 'css', source: 'https://cdn.jsdelivr.net/gh/CKylinMC/FloatPopup.js@main/floatpopup.modal.css' },
        { name: 'cktools', type: 'js', source: 'https://greasyfork.org/scripts/429720-cktools/code/CKTools.js?version=1029952' },
        { name: 'popcsspatch', type: 'rawcss', content: "div.popNotifyUnitFrame{z-index:110000!important;}.CKTOOLS-modal-content{color: #616161!important;max-height: 80vh;overflow: auto;}" },
        { name: 'settingscss', type: 'rawcss', content: `
            .ckui-base .ckui-text{
                font-size: 14px;
                line-height: 1.428571429;
            }
            .ckui-base label{
                display: block;
                color: rgb(16, 140, 255);
                padding-top: 12px;
            }
            .ckui-base .ckui-texttoggle{
                display: block;
                color: rgb(16, 140, 255);
                padding-top: 12px;
            }
            .ckui-base .ckui-texttoggle-container::before{
                display: inline;
                content: "🔹";
            }
            .ckui-base .ckui-texttoggle-container .ckui-texttoggle-value{
                padding: 0px 6px;
                font-weight: bold;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                cursor: pointer;
            }
            .ckui-base .ckui-texttoggle-container .ckui-texttoggle-value::before{
                content: "["
            }
            .ckui-base .ckui-texttoggle-container .ckui-texttoggle-value::after{
                content: "]"
            }
            .ckui-base .ckui-texttoggle-container::after{
                display: inline;
                content: "(点击切换)";
                color: gray;
                font-size: 12px;
                font-style: italic;
                padding-left: 12px;
            }
            .ckui-base .ckui-description{
                display: block;
                color: rgb(92, 92, 92);
                font-size: small;
                font-style: italic;
            }
            .ckui-base .ckui-toggle{
                padding-top: 12px;
            }
            .ckui-base label.ckui-inline-label{
                display: inline;
                line-height: 18px;
            }
            .ckui-base .ckui-input input{
                display: block;
                width: calc(100% - 28px);
                height: 34px;
                padding: 1px 3px;
                margin: 3px 6px;
                font-size: 14px;
                line-height: 1.428571429;
                color: rgb(51, 51, 51);
                background-color: rgb(255, 255, 255);
                border: 1px solid rgb(204, 204, 204);
                border-radius: 4px;
                box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);
            }
            .ckui-base .ckui-inputnumber input{
                display: block;
                width: calc(100% - 36px);
                height: 34px;
                padding: 1px 12px;
                margin: 3px 6px;
                font-size: 14px;
                line-height: 1.428571429;
                color: rgb(51, 51, 51);
                background-color: rgb(255, 255, 255);
                border: 1px solid rgb(204, 204, 204);
                border-radius: 4px;
                box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);
            }
            .ckui-base .ckui-inputarea textarea{
                display: block;
                width: calc(100% - 28px);
                height: 100px;
                padding: 6px 6px;
                margin: 3px 6px;
                font-size: 14px;
                line-height: 1.428571429;
                color: rgb(51, 51, 51);
                background-color: rgb(255, 255, 255);
                border: 1px solid rgb(204, 204, 204);
                border-radius: 4px;
                box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);
            }
            .ckui-base .ckui-select select{
                display: block;
                width: calc(100% - 28px);
                height: 34px;
                padding: 6px 6px;
                margin: 3px 6px;
                font-size: 14px;
                line-height: 1.428571429;
                color: rgb(51, 51, 51);
                background-color: rgb(255, 255, 255);
                border: 1px solid rgb(204, 204, 204);
                border-radius: 4px;
                box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);
            }
            .ckui-base .ckui-select select option{
                font-size: 16px;
                line-height: 1.428571429;
                color: rgb(51, 51, 51);
            }
            .ckui-base .ckui-header::before{
                content: "💠";
            }
            .ckui-base .ckui-header{
                width: calc(100% - 8px);
                display: block;
                color: rgb(16, 140, 255);
                padding: 12px 3px;
                border-bottom: 2px solid rgb(16, 140, 255);
                margin: 12px 0px 12px 0px;
            }
            .ckui-base .ckui-btns{
                display: flex;
                flex-wrap: wrap;
                flex-direction: row;
            }
            .ckui-base .ckui-btn{
                display: block;
                width: calc(50% - 8px);
                height: 40px;
                padding: 6px 12px;
                margin: 6px;
                font-size: 14px;
                line-height: 1.428571429;
                color: rgb(255, 255, 255);
                background-color: rgb(16, 140, 255);
                border: 1px solid rgb(16, 140, 255);
                border-radius: 4px;
                box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);
            }
            .ckui-base .ckui-btn:hover{
                background-color: rgb(0, 122, 255);
            }
            .ckui-base .ckui-btns .ckui-btn{
                flex: 1;
            }` }
    ]
    async function applyResource() {
        resloop: for (let res of resourceList) {
            if (true||!document.querySelector("#" + res.name)) {
                let el;
                switch (res.type) {
                    case 'js':
                    case 'rawjs':
                        el = document.createElement("script");
                        break;
                    case 'css':
                    case 'rawcss':
                        el = document.createElement("style");
                        break;
                    default:
                        console.error('[CKUI]','Err:unknown type', res);
                        continue resloop;
                }
                el.id = res.name;
                let result = res.type.startsWith('raw') ? res.content : GM_getResourceText(res.name);
                if (result == null || result == 'null' || typeof result === 'undefined') {
                    console.info('[CKUI]', 'Alternative method is using:',res.type,res.name);
                    if (!res.source) {
                        console.info('[CKUI]', 'Failed to apply:',res.type,res.name);
                        continue resloop;
                    }
                    try {
                        let response = await fetch(res.source);
                        if (!response.ok) {
                            console.info('[CKUI]', 'Failed to apply:',res.type,res.name,response.statusText);
                            continue resloop;
                        }
                        result = await response.text();
                    } catch (e) {
                        console.info('[CKUI]', 'Failed to apply:',res.type,res.name,e);
                        continue resloop;
                    }
                }
                el.appendChild(document.createTextNode(result));
                document.head.appendChild(el);
                console.info('[CKUI]', 'Applied:',res.type,res.name);
            }
        }
        console.info('[CKUI]', 'Resources all applied');
    }
    applyResource().then(() => unsafeWindow.CKUIToolkit_loaded = true);
    
    let { domHelper, deepClone } = CKTools;
    if (!deepClone) {
        deepClone = (obj)=>{
            let newObject = {};
            if (Array.isArray(obj)) {
                newObject = [];
                for (let i = 0; i < obj.length; i++) {
                    newObject.push(deepClone(obj[i]));
                }
                return newObject;
            }
            Object.keys(obj).map(key => {
                if (typeof obj[key] === 'object') {
                    newObject[key] = deepClone(obj[key]);
                } else {
                    newObject[key] = obj[key];
                }
            });
            return newObject;
        };
    }
    const CKUIToolkit = {};
    class CompUtils{
        static getId(name) {
            return 'ckui-settings-' + name;
        }
        static getClass(type) {
            return 'ckui-' + type;
        }
        static runChecker(checker = null,...args) {
            if (checker && typeof (checker) == 'function') {
                try {
                    const result = checker(...args);
                    return !!result;
                } catch (e) {
                    return false;
                }
            } else return true;
        }
        static cfgValidator(cfg, keystr='') {
            let keys = keystr.split(',').map(el => el.trim()).filter(el => el.length > 0);
            keys.concat(['name', 'type']);
            if (!cfg) return false;
            for (let key of keys) {
                if (cfg[key]===undefined) return false;
            }
            return true;
        }
    }
    class Components{
        static text(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'label')) return;
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                html: cfg.label
            });
        }
        static header(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'label')) return;
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                html: cfg.label
            });
        }
        static toggle(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'label')) return;
            const customId = 'toggle'+CKTools.GUID.getShort();
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                childs: [
                    domHelper('input', {
                        id: customId,
                        attr: {
                            type: 'checkbox',
                            value: cfg.value??false
                        },
                        on: {
                            change: (e) => {
                                const value = !!(e.target?.value);
                                if (CompUtils.runChecker(cfg.checker)) cfg.value = value;
                                // else  TODO: error tip
                            }
                        }
                    }),
                    domHelper('label', {
                        attr: {
                            for: customId
                        },
                        classlist:'ckui-inline-label',
                        html: cfg.label
                    }),
                    domHelper('span', {
                        classList: 'ckui-description',
                        html: cfg.description??''
                    }),
                ]
            });
        }
        static input(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'label')) return;
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                childs: [
                    domHelper('label', {
                        html: cfg.label
                    }),
                    domHelper('input', {
                        attr:cfg.value,
                        on: {
                            keyup: CKTools.debounce((e) => {
                                const value = e.target?.value;
                                if (CompUtils.runChecker(cfg.checker)) cfg.value = value;
                                // else  TODO: error tip
                            })
                        }
                    }),
                    domHelper('span', {
                        classList: 'ckui-description',
                        html: cfg.description??''
                    }),
                ]
            });
        }
        static inputarea(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'label')) return;
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                childs: [
                    domHelper('label', {
                        html: cfg.label
                    }),
                    domHelper('textarea', {
                        attr: {
                            value: cfg.value
                        },
                        on: {
                            keyup: CKTools.debounce((e) => {
                                const value = e.target?.value ?? e.target.innerHTMl;
                                if (CompUtils.runChecker(cfg.checker)) cfg.value = value;
                                // else  TODO: error tip
                            })
                        }
                    }),
                    domHelper('span', {
                        classList: 'ckui-description',
                        html: cfg.description??''
                    }),
                ]
            });
        }
        static inputnumber(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'label,min,max,step')) return;
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                childs: [
                    domHelper('label', {
                        html: cfg.label
                    }),
                    domHelper('input', {
                        attr: {
                            type: 'number',
                            value: cfg.value,
                            min: cfg.min,
                            max: cfg.max,
                            step: cfg.step
                        },
                        on: {
                            keyup: CKTools.debounce((e) => {
                                const value = e.target?.value;
                                if (CompUtils.runChecker(cfg.checker)) cfg.value = value;
                                // else  TODO: error tip
                            })
                        }
                    }),
                    domHelper('span', {
                        classList: 'ckui-description',
                        html: cfg.description??''
                    }),
                ]
            });
        }
        static select(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'label,options')) return;
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                childs: [
                    domHelper('label', {
                        html: cfg.label
                    }),
                    domHelper('select', {
                        attr: {
                            value: cfg.value??'',
                        },
                        init: select => {
                            for (let option of cfg.options) {
                                select.appendChild(domHelper('option', {
                                    attr: {
                                        value: option.value,
                                        selected: cfg.value == option.value
                                    },
                                    html: option.opt
                                }));
                            }
                        },
                        on: {
                            change: CKTools.debounce((e) => {
                                const value = !!(e.target?.value);
                                if (CompUtils.runChecker(cfg.checker)) cfg.value = value;
                                // else  TODO: error tip
                            })
                        }
                    }),
                    domHelper('span', {
                        classList: 'ckui-description',
                        html: cfg.description??''
                    }),
                ]
            });
        }
        static texttoggle(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'before,on,off,after')) return;
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                childs: [
                    domHelper('div', {
                        classList:'ckui-texttoggle-container',
                        childs: [
                            domHelper('span', { text: cfg.before }),
                            domHelper('span', {classList:'ckui-texttoggle-value',text:'...'}),
                            domHelper('span', {text:cfg.after}),
                        ],
                        init: div => {
                            const getText = () => cfg.value ? cfg.on : cfg.off;
                            const setValue = (value) => {
                                cfg.value = !!value;
                                div.querySelector('.ckui-texttoggle-value').innerText = getText();
                            }
                            const toggleValue = () => setValue(!cfg.value);
                            div.addEventListener('click', toggleValue);
                            setValue(cfg.value);
                        }
                    }),
                    domHelper('span', {
                        classList: 'ckui-description',
                        html: cfg.description??''
                    }),
                ]
            });
        }
        static raw(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'contents')) return;
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                childs:domHelper(cfg.contents)
            })
        }
        static window(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'label,config')) return;
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                childs: [
                    domHelper('button', {
                        classList: 'ckui-btn',
                        html: cfg.label,
                        on: {
                            click: async (e) => {
                                cfg.config = await SettingsBuilder.open(cfg.config);
                            }
                        }
                    })
                ]
            })
        }
        static btns(cfg) {
            if (!CompUtils.cfgValidator(cfg, 'btns')) return;
            return domHelper('div', {
                id: CompUtils.getId(cfg.name),
                classlist: CompUtils.getClass(cfg.type),
                init: el => {
                    for(let btn of cfg.btns) {
                        el.appendChild(domHelper('button', {
                            classList: 'ckui-btn',
                            html: btn.label,
                            on: {
                                click: async (e) => {
                                    await btn.onclick();
                                }
                            }
                        }));
                    }
                }
            })
        }
    }
    class SettingsBuilder{
        static async open(cfg) {
            const s = new SettingsBuilder(cfg);
            const result = await s.showWindow();
            return result;
        }
        constructor(config) {
            this.config = Object.assign({
                title: '设置',
                settings:[]
            },config);
        }
        async showWindow(config = this.config) {
            const copiedConfig = deepClone(config);
            console.log('Cloned:',config,copiedConfig)
            return new Promise(r => {
                FloatPopup.confirm(copiedConfig.title, domHelper('div', {
                    classlist:'ckui-base',
                    init: el => {
                        for (const comp of copiedConfig.settings) {
                            const r = this.makeComponent(comp);
                            r&&el.appendChild(r);
                        }
                    }
                }), "保存", "取消").then(result => result?r(copiedConfig):r(config));
            })
        }
        makeComponent(cfg) {
            if (Components.hasOwnProperty(cfg.type)) {
                return Components[cfg.type](cfg);
            }
        }
    }
    CKUIToolkit.showSettings = SettingsBuilder.open;

    unsafeWindow.CKUIToolkit = CKUIToolkit;
})();
