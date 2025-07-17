// ==UserScript==
// @name         CKUIToolkit
// @namespace    ckylin-script-lib-combined-ui-components
// @version      1.2.4
// @match        http://*
// @match        https://*
// // @require      https://greasyfork.org/scripts/429720-cktools/code/CKTools.js?version=1029952
// @resource     popjs https://fastly.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.js
// @resource     popcss https://fastly.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.css
// @resource     fpjs https://fastly.jsdelivr.net/gh/CKylinMC/FloatWindow.js@main/floatwin.js
// @resource     fpcss https://fastly.jsdelivr.net/gh/CKylinMC/FloatWindow.js@main/floatwin.modal.css
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
        { name: 'popjs', type: 'js', source: 'https://fastly.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.js'},
        { name: 'popcss', type: 'css', source:'https://fastly.jsdelivr.net/gh/CKylinMC/PopNotify.js@master/PopNotify.css' },
        { name: 'fpjs', type: 'js', source: 'https://fastly.jsdelivr.net/gh/CKylinMC/FloatWindow.js@main/floatwin.js' },
        { name: 'fpcss', type: 'css', source: 'https://fastly.jsdelivr.net/gh/CKylinMC/FloatWindow.js@main/floatwin.modal.css' },
        { name: 'cktools', type: 'js', source: 'https://greasyfork.org/scripts/429720-cktools/code/CKTools.js?version=1029952' },
        { name: 'popcsspatch', type: 'rawcss', content: "div.popNotifyUnitFrame{z-index:110000!important;}.CKTOOLS-modal-content{color: #616161!important;max-height: 80vh;overflow: auto;}" },
        { name: 'settingscss', type: 'rawcss', content: `
body .ckfp-container{
    /* FloatPanel colors override */
    --page-background: white;
    --page-frontcolor: black;
    --highlight-background: white;
    --highlight-frontcolor: rgb(16, 140, 255);
    --btn-border: #74baff;
    --btn-hover-border: #03a9f4;
    --btn-bg: dodgerblue;
    --btn-hover-bg: #1976d2;
    --btn-fg: white;
}
.ckui-base{
    /* color-schema */
    --ckui-text-color: black;
    --ckui-label-color: rgb(16, 140, 255);
    --ckui-description-color: rgb(92, 92, 92);
    --ckui-input-text-color: rgb(51, 51, 51);
    --ckui-input-bg-color: rgb(255, 255, 255);
    --ckui-input-border-color: rgb(204, 204, 204);
    --ckui-btn-bg-color: rgb(16, 140, 255);
    --ckui-btn-border-color: rgb(16, 140, 255);
    --ckui-btn-text-color: rgb(255, 255, 255);
    --ckui-btn-hover-bg-color: rgb(0, 122, 255);
    --ckui-header-color: rgb(16, 140, 255);
    --ckui-header-border-color: rgb(16, 140, 255);
    --ckui-toggle-hint-color: gray;
    --ckui-input-shadow: rgba(0, 0, 0, 0.075);
    
    /* PopNotify colors override */
    --popnotify-success-bg: rgb(172, 255, 223);
    --popnotify-success-text: rgb(0, 114, 70);
    --popnotify-info-bg: rgb(195, 226, 255);
    --popnotify-info-text: rgb(0, 80, 155);
    --popnotify-error-bg: rgb(255, 196, 196);
    --popnotify-error-text: rgb(255, 66, 66);
    --popnotify-warn-bg: rgb(255, 218, 139);
    --popnotify-warn-text: rgb(177, 94, 0);
    --popnotify-default-bg: white;
    --popnotify-default-text: black;
}
body.ckui-dark .ckfp-container{
    /* FloatPanel colors override */
    --page-background: rgb(40, 40, 40) !important;
    --page-frontcolor: white !important;
    --highlight-background: rgb(89, 89, 89) !important;
    --highlight-frontcolor: rgb(16, 140, 255) !important;
    --btn-border: #74baff !important;
    --btn-hover-border: #03a9f4 !important;
    --btn-bg: dodgerblue !important;
    --btn-hover-bg: #1976d2 !important;
    --btn-fg: rgb(255, 255, 255) !important;
}
.ckui-base.ckui-dark{
    /* color-schema */
    --ckui-text-color: rgb(230, 230, 230);
    --ckui-label-color: rgb(100, 180, 255);
    --ckui-description-color: rgb(160, 160, 160);
    --ckui-input-text-color: rgb(220, 220, 220);
    --ckui-input-bg-color: rgb(45, 45, 45);
    --ckui-input-border-color: rgb(80, 80, 80);
    --ckui-btn-bg-color: rgb(50, 120, 200);
    --ckui-btn-border-color: rgb(50, 120, 200);
    --ckui-btn-text-color: rgb(255, 255, 255);
    --ckui-btn-hover-bg-color: rgb(30, 100, 180);
    --ckui-header-color: rgb(100, 180, 255);
    --ckui-header-border-color: rgb(100, 180, 255);
    --ckui-toggle-hint-color: rgb(140, 140, 140);
    --ckui-input-shadow: rgba(255, 255, 255, 0.1);
    
    /* PopNotify colors override for dark theme */
    --popnotify-success-bg: rgb(30, 80, 50);
    --popnotify-success-text: rgb(150, 255, 200);
    --popnotify-info-bg: rgb(30, 50, 80);
    --popnotify-info-text: rgb(150, 200, 255);
    --popnotify-error-bg: rgb(80, 30, 30);
    --popnotify-error-text: rgb(255, 150, 150);
    --popnotify-warn-bg: rgb(80, 60, 20);
    --popnotify-warn-text: rgb(255, 200, 100);
    --popnotify-default-bg: rgb(50, 50, 50);
    --popnotify-default-text: rgb(230, 230, 230);
}
.ckui-base .ckui-text{
    font-size: 14px;
    line-height: 1.428571429;
    color: var(--ckui-text-color);
}
.ckui-base label{
    display: block;
    color: var(--ckui-label-color);
    padding-top: 12px;
}
.ckui-base .ckui-texttoggle{
    display: block;
    color: var(--ckui-label-color);
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
    color: var(--ckui-toggle-hint-color);
    font-size: 12px;
    font-style: italic;
    padding-left: 12px;
}
.ckui-base .ckui-description{
    display: block;
    color: var(--ckui-description-color);
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
    color: var(--ckui-input-text-color);
    background-color: var(--ckui-input-bg-color);
    border: 1px solid var(--ckui-input-border-color);
    border-radius: 4px;
    box-shadow: inset 0 1px 1px var(--ckui-input-shadow);
}
.ckui-base .ckui-inputnumber input{
    display: block;
    width: calc(100% - 36px);
    height: 34px;
    padding: 1px 12px;
    margin: 3px 6px;
    font-size: 14px;
    line-height: 1.428571429;
    color: var(--ckui-input-text-color);
    background-color: var(--ckui-input-bg-color);
    border: 1px solid var(--ckui-input-border-color);
    border-radius: 4px;
    box-shadow: inset 0 1px 1px var(--ckui-input-shadow);
}
.ckui-base .ckui-inputarea textarea{
    display: block;
    width: calc(100% - 28px);
    height: 100px;
    padding: 6px 6px;
    margin: 3px 6px;
    font-size: 14px;
    line-height: 1.428571429;
    color: var(--ckui-input-text-color);
    background-color: var(--ckui-input-bg-color);
    border: 1px solid var(--ckui-input-border-color);
    border-radius: 4px;
    box-shadow: inset 0 1px 1px var(--ckui-input-shadow);
}
.ckui-base .ckui-select select{
    display: block;
    width: calc(100% - 28px);
    height: 34px;
    padding: 6px 6px;
    margin: 3px 6px;
    font-size: 14px;
    line-height: 1.428571429;
    color: var(--ckui-input-text-color);
    background-color: var(--ckui-input-bg-color);
    border: 1px solid var(--ckui-input-border-color);
    border-radius: 4px;
    box-shadow: inset 0 1px 1px var(--ckui-input-shadow);
}
.ckui-base .ckui-select select option{
    font-size: 16px;
    line-height: 1.428571429;
    color: var(--ckui-input-text-color);
}
.ckui-base .ckui-header::before{
    content: "💠";
}
.ckui-base .ckui-header{
    width: calc(100% - 8px);
    display: block;
    color: var(--ckui-header-color);
    padding: 12px 3px;
    border-bottom: 2px solid var(--ckui-header-border-color);
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
    color: var(--ckui-btn-text-color);
    background-color: var(--ckui-btn-bg-color);
    border: 1px solid var(--ckui-btn-border-color);
    border-radius: 4px;
    box-shadow: inset 0 1px 1px var(--ckui-input-shadow);
}
.ckui-base .ckui-btn:hover{
    background-color: var(--ckui-btn-hover-bg-color);
}
.ckui-base .ckui-btns .ckui-btn{
    flex: 1;
}

/* PopNotify theme override */
.ckui-base div.popNotifyUnitFrame {
    background: var(--popnotify-default-bg) !important;
}
.ckui-base div.popNotifyUnitFrame .popNotifyUnitTitle,
.ckui-base div.popNotifyUnitFrame .popNotifyUnitContent {
    color: var(--popnotify-default-text) !important;
}
.ckui-base div.popNotifyUnitFrame .popNotifyUnitBar {
    background: var(--popnotify-default-text) !important;
}

.ckui-base .popStyle-success {
    background: var(--popnotify-success-bg) !important;
}
.ckui-base .popStyle-success .popNotifyUnitTitle,
.ckui-base .popStyle-success .popNotifyUnitContent {
    color: var(--popnotify-success-text) !important;
}
.ckui-base .popStyle-success .popNotifyUnitBar{
    background: var(--popnotify-success-text) !important;
}

.ckui-base .popStyle-info {
    background: var(--popnotify-info-bg) !important;
}
.ckui-base .popStyle-info .popNotifyUnitTitle,
.ckui-base .popStyle-info .popNotifyUnitContent {
    color: var(--popnotify-info-text) !important;
}
.ckui-base .popStyle-info .popNotifyUnitBar{
    background: var(--popnotify-info-text) !important;
}

.ckui-base .popStyle-error {
    background: var(--popnotify-error-bg) !important;
}
.ckui-base .popStyle-error .popNotifyUnitTitle,
.ckui-base .popStyle-error .popNotifyUnitContent {
    color: var(--popnotify-error-text) !important;
}
.ckui-base .popStyle-error .popNotifyUnitBar{
    background: var(--popnotify-error-text) !important;
}

.ckui-base .popStyle-warn {
    background: var(--popnotify-warn-bg) !important;
}
.ckui-base .popStyle-warn .popNotifyUnitTitle,
.ckui-base .popStyle-warn .popNotifyUnitContent {
    color: var(--popnotify-warn-text) !important;
}
.ckui-base .popStyle-warn .popNotifyUnitBar{
    background: var(--popnotify-warn-text) !important;
}
` }
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
    
    let deepClone = (obj)=>{
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

    let domHelper = (...args) => {
        return CKTools.domHelper(...args);
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
                    console.log('checker errored', e);
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
                            checked: cfg.value??false
                        },
                        on: {
                            change: (e) => {
                                const value = !!(e.target?.checked);
                                if (CompUtils.runChecker(cfg.checker,value)) cfg.value = value;
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
                        attr: {
                            value: cfg.value??''
                        },
                        on: {
                            keyup: CKTools.debounce((e) => {
                                const value = e.target?.value;
                                if (CompUtils.runChecker(cfg.checker,value)) cfg.value = value;
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
                            value: cfg.value??''//not work until it put into dom
                        },
                        html:cfg.value??'',
                        on: {
                            keyup: CKTools.debounce((e) => {
                                const value = e.target?.value ?? e.target.innerHTMl;
                                console.log('inputarea', value,e.target?.value,e.target.innerHTMl);
                                if (CompUtils.runChecker(cfg.checker, value)) cfg.value = value;
                                else console.warn('checker refused');
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
                            value: isNaN(cfg.value)?undefined:+cfg.value,
                            min: cfg.min,
                            max: cfg.max,
                            step: cfg.step
                        },
                        on: {
                            change: (e) => {
                                let value = e.target?.value;
                                if (!isNaN(value)) {
                                    value = +value;
                                }
                                if (CompUtils.runChecker(cfg.checker, value)) {
                                    console.log('updated:', value);
                                    cfg.value = value;
                                } else {
                                    console.log('refused to update value', value);
                                }
                                // else  TODO: error tip
                            }
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
                        init: select => {
                            for (let option of cfg.options) {
                                console.log('select option', option.opt,option.value,cfg.value == option.value);
                                select.appendChild(domHelper('option', {
                                    attr: {
                                        value: option.value,
                                    },
                                    html: option.opt,
                                    init: optionel => {
                                        if (cfg.value == option.value) optionel.setAttribute('selected', true);
                                    }
                                }));
                            }
                        },
                        on: {
                            change: (e) => {
                                const value = e.target?.value??'';
                                if (CompUtils.runChecker(cfg.checker,value)) cfg.value = value;
                                // else  TODO: error tip
                            }
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
                            setTimeout(()=>setValue(cfg.value),50);
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
        static window(cfg,type) {
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
                                let subres = {};
                                if (type == 'confirm') subres = await SettingsBuilder.open(cfg.config);
                                else if (type == 'modal') subres = await SettingsBuilder.modal(cfg.config);
                                else return;
                                console.log('subres:', subres)
                                Object.assign(cfg.config, subres);
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
                                    await btn.onclick?.();
                                }
                            }
                        }));
                    }
                }
            })
        }
    }
    class SettingsBuilder{
        static builder(cfg) {
            return new SettingsBuilder(cfg);
        }
        static async open(cfg, values = null) {
            const s = new SettingsBuilder(cfg);
            if(values) s.setValues(values);
            const result = await s.showWindow();
            return result;
        }
        static async modal(cfg, values = null) {
            const s = new SettingsBuilder(cfg);
            if(values) s.setValues(values);
            const result = await s.showAlertWindow();
            return result;
        }
        constructor(config) {
            this.config = Object.assign({
                title: '设置',
                theme: undefined,
                settings:[]
            },config);
        }
        static getThemeVariable(){
           const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return prefersDark ? 'dark' : 'light';
        }
        findSettingObjectByName(key = '',cfg = this.config) {
            const settings = cfg.settings;
            for (const setting of settings) {
                if(setting.name == key) return setting;
            }
            const subSettings = settings.filter(el => el.type == 'window');
            if (!subSettings.length) return null;
            for (const setting of subSettings) {
                const subresult = this.findSettingObjectByName(key, setting);
                if(subresult) return subresult;
            }
            return null;
        }
        setValues(settingsValues = {}) {
            for (let vk of Object.keys(settingsValues)) {
                const setting = this.findSettingObjectByName(vk);
                if (setting) setting.value = settingsValues[vk];
                else console.warn('[CKUI]', `${vk} not found in scheme`);
            }
        }
        flatValues(cfg) {
            const cfgs = {};
            if(cfg.settings){
                cfg = cfg.settings;
            }
            if(!Array.isArray(cfg)){
                return cfgs;
            }
            for(const s of cfg){
                if(!s.name || !s.type) {
                    console.warn('[CKUI]', 'missing name or type',s);
                    continue;
                }
                switch(s.type){
                    case "toggle":
                    case "texttoggle":
                        cfgs[s.name] = !!s.value;
                        break;
                    case "select":
                    case "input":
                    case "inputarea":
                        cfgs[s.name] = s.value?s.value+"":"";
                        break;
                    case "inputnumber":
                        if(!isNaN(s.value)) cfgs[s.name] = +s.value;
                        break;
                    case "window":
                        {
                            const sub = this.flatValues(s.config);
                            Object.assign(cfgs,sub);
                        }
                        break;
                    default:
                        console.log('[CKUI]','unrecognized type',s.type);
                }
            }
            return cfgs;
        }
        async showAlertWindow(config = this.config) {
            const copiedConfig = deepClone(config);
            return new Promise(r => {
                const theme = (copiedConfig.theme??SettingsBuilder.getThemeVariable());
                document.body.classList.toggle('ckui-dark', theme == 'dark');
                FloatWindow.alert(copiedConfig.title, domHelper('div', {
                    classlist:'ckui-base ckui-'+theme,
                    init: el => {
                        for (const comp of copiedConfig.settings) {
                            const r = this.makeComponent(comp,'alert');
                            r&&el.appendChild(r);
                        }
                    }
                }), copiedConfig.btnName ?? "确定").then(() => {
                    r(this.flatValues(copiedConfig));
                });
            })
        }
        async showWindow(config = this.config) {
            const copiedConfig = deepClone(config);
            return new Promise(r => {
                const theme = (copiedConfig.theme??SettingsBuilder.getThemeVariable());
                document.body.classList.toggle('ckui-dark', theme == 'dark');
                FloatWindow.confirm(copiedConfig.title, domHelper('div', {
                    classlist:'ckui-base ckui-'+theme,
                    init: el => {
                        for (const comp of copiedConfig.settings) {
                            const r = this.makeComponent(comp);
                            r&&el.appendChild(r);
                        }
                    }
                }), copiedConfig.saveBtn??"保存", copiedConfig.cancelBtn??"取消").then(result => {
                    console.log('[CKUI]', 'Save?', result);
                    result ? r(this.flatValues(copiedConfig)) : r({});
                });
            })
        }
        makeComponent(cfg, type='confirm') {
            if (Components.hasOwnProperty(cfg.type)) {
                return Components[cfg.type](cfg,type);
            }
        }
    }
    CKUIToolkit.showSettings = SettingsBuilder.open;
    CKUIToolkit.showModal = SettingsBuilder.modal;
    CKUIToolkit.builder = SettingsBuilder.builder;

    unsafeWindow.CKUIToolkit = CKUIToolkit;
    
    applyResource().then(() => {unsafeWindow.CKUIToolkit_loaded = true; unsafeWindow.CKUIToolkit_onload?.();});
})();
