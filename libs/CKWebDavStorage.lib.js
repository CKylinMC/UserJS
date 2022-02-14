// ==UserScript==
// @name         CKWebDavStorage
// @namespace    ckylin-script-lib-webdav-storage
// @version      1.0
// @description  Simple WebDAV storage provider
// @match        http://*/*
// @match        https://*/*
// @require      https://cdn.jsdelivr.net/npm/webdav@4.8.0/dist/web/webdav.js
// @author       CKylinMC
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @license      GPLv3 License
// ==/UserScript==

(function () {
    class CKWebDAVStorage {
        static fromConfig(options = {}) {
            const option = Object.assign({
                url: null,
                username: null,
                password: null,
                namespace: null,
                syncOnChange: true,
                pathByDots: true
            }, options);
            if (Object.values(option).includes(null)) {
                return false;
            }
            return new CKWebDAVStorage(...Object.values(option));
        }
        constructor(url, username, password, namespace, syncOnChange = true, pathByDots = true) {
            this.client = new window.WebDAV.createClient(url, {
                username,
                password
            });
            this.namespace = namespace || 'customdata' + Math.random().toString(36).substring(2, 15);
            this.namespace = this.namespace.replace(/[^a-zA-Z0-9]/g, '');
            console.warn("WEBDAV", "This caller not give a namespace, so use random string as namespace:", this.namespace);
            this.doc = null;
            this.syncOnChange = syncOnChange;
            this.pathByDots = pathByDots;
        }
        setSyncOnChange(syncOnChange) {
            this.syncOnChange = !!syncOnChange;
        }
        getSyncOnChange() {
            return this.syncOnChange;
        }
        getNamespace() {
            return this.namespace;
        }
        getFileName() {
            return this.getNamespace() + '.json';
        }
        async exists() {
            return await this.client.exists(this.getFileName());
        }
        async markmodified() {
            this.doc.timestamp = (new Date()).getTime();
        }
        async download() {
            try {
                return JSON.parse(await this.client.getFileContents("/" + this.getFileName(), {
                    format: "text"
                }));
            } catch (e) {
                return {};
            }
        }
        async upload(doc) {
            await this.client.putFileContents("/" + this.getFileName(), JSON.stringify(doc), {
                overwrite: true
            });
        }
        async sync() {
            if (await this.exists()) {
                if (this.doc.timestamp) {
                    let clouddoc = await this.download();
                    if (clouddoc.timestamp && this.clouddoc.timestamp > this.doc.timestamp) {
                        this.doc = clouddoc;
                    } else {
                        await this.upload(this.doc);
                    }
                } else {
                    this.doc = await this.download();
                }
            } else {
                if (this.doc) {
                    this.markmodified();
                    await this.upload(this.doc);
                } else {
                    this.doc = {};
                    this.markmodified();
                    await this.upload(this.doc);
                }
            }
        }
        parseKey(key) {
            const keys = key.split(".").filter(it => it != null && (typeof it != "undefined") && it.length > 0);
            if (keys.length === 0) {
                throw new Error("Invalid key: " + key);
            }
            return keys;
        }
        set(key, value = null) {
            if (this.pathByDots && key.indexOf(".") > -1) {
                let keys = this.parseKey(key);
                let obj = this.doc;
                let length = keys.length;
                let i = 0;
                for (; i < length - 1; i++) {
                    let k = keys[i];
                    if (!obj.hasOwnProperty(k)) {
                        obj[k] = {};
                        obj = obj[k];
                    } else {
                        obj = obj[k];
                    }
                }
                obj[keys[length - 1]] = value;
            } else this.doc[key] = value;
            this.markmodified();
            this.autoSync();
        }
        get(key) {
            if (this.pathByDots && key.indexOf(".") > -1) {
                let keys = this.parseKey(key);
                let obj = this.doc;
                for (let key of keys) {
                    if (!obj.hasOwnProperty(key)) {
                        return false;
                    } else {
                        obj = obj[key];
                    }
                }
                return obj;
            }
            return this.doc[key];
        }
        remove(key) {
            if (this.pathByDots && key.indexOf(".") > -1) {
                let keys = this.parseKey(key);
                let obj = this.doc;
                let length = keys.length;
                let i = 0;
                for (; i < length - 1; i++) {
                    let k = keys[i];
                    if (!obj.hasOwnProperty(k)) {
                        obj[k] = {};
                        obj = obj[k];
                    } else {
                        obj = obj[k];
                    }
                }
                delete obj[keys[length - 1]];
            } else delete this.doc[key];
            this.markmodified();
            this.autoSync();
        }
        exists(key) {
            return typeof this.get(key) != "undefined";
        }
        clear() {
            this.doc = {};
            this.markmodified();
            this.autoSync();
        }
        getAll() {
            return this.doc();
        }
        setAll(obj) {
            this.doc = {};
            for (let keyname of Object.keys(obj)) {
                if (obj.hasOwnProperty(keyname)) {
                    this.doc[keyname] = obj[keyname];
                }
            }
            this.markmodified();
            this.autoSync();
        }
        async autoSync() {
            if (this.syncOnChange) {
                await this.sync();
            }
        }
    }
    window.CKWebDAVStorage = CKWebDAVStorage;
    if (typeof unsafeWindow != "undefined") unsafeWindow.CKWebDAVStorage = CKWebDAVStorage;
})();
