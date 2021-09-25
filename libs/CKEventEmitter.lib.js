// ==UserScript==
// @name         CKEventEmitter
// @namespace    eventemitter.ckylin.site
// @version      0.2
// @author       CKylinMC
// @grant        unsafeWindow
// @license      GPLv3 License
// ==/UserScript==
class EventEmitter {
    handlers = {};

    on(name, func) {
        if (!(func instanceof Function)) throw "Param must be func!";
        if (!(name in this.handlers)) {
            this.handlers[name] = [];
        }
        this.handlers[name].push(func);
    }

    off(name, func) {
        if (!(func instanceof Function)) throw "Param must be func!";
        if (name in this.handlers) {
            for (let i = 0; i < this.handlers[name].length; i++) {
                if (this.handlers[name][i] === func) {
                    this.handlers[name].splice(i, 1);
                    i--;
                }
            }
        }
    }

    clean(name=null){
        if(name===null) {
            this.handlers = {};
        }else if (name in this.handlers) {
            this.handlers[name] = [];
        }
    }

    emit(name, ...args) {
        if (name in this.handlers) {
            for (let func of this.handlers[name]) {
                try {
                    func(...args);
                } catch (e) {
                    console.error('ERROR:', e);
                }
            }
        }
    }
}