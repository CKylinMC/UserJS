// ==UserScript==
// @name         CKTools
// @namespace    ckylin-script-lib-combined-tools
// @version      1.6.1
// @match        http://*
// @match        https://*
// @author       CKylinMC
// @license      GPLv3 License
// ==/UserScript==
(function () {
	const VERSION = 1.6;
	if ('CKTools' in window) {
		if (!window.CKTools.ver) console.warn('Unrecognized version of CKTools is already loaded, overwriting...');
		else if (window.CKTools.ver > VERSION) throw new Error("You have newer version CKTools loaded. Aborting loading version " + VERSION);
		else console.warn(`You have older version of CKTools (${window.CKTools.ver}) was loaded, and now upgrading to newer version ${VERSION}.`);
	}
	class CKTools {
		static ver = VERSION
		static get(q, base = document) {
			return base.querySelector(q);
		}
		static getAll(q, base = document) {
			return [...base.querySelectorAll(q)];
		}
		static domHelper(options = {}, compatibleParm2 = {}) {
			let tagName = 'div';
			if (typeof (options) == 'string') {
				/* Migrate from version 1 */
				tagName = options;
				/* Migrate from makeDom */
				if (compatibleParm2.constructor.name == 'Object') options = compatibleParm2;
				else if (compatibleParm2.constructor.name == 'AsyncFunction') options = {
					initAsync: compatibleParm2
				};
				else if (compatibleParm2.constructor.name == 'Function') options = {
					init: compatibleParm2
				};
				else options = {};
			}
			if (options.listeners) {
				/* Migrate from version 1 */
				if (!options.on) options.on = {};
				Object.assign(options.on, options.listeners);
			}
			if (options.classnames) {
				/* Migrate from version 1 */
				if (!options.classList) options.classList = [];
				options.classList.concat(options.classnames);
			}
			if (options.tag) tagName = options.tag;
			let el;
			if (options.from) {
				if (options.from instanceof HTMLElement) {
					el = options.from;
				} else if (typeof (options.from) == "string") {
					els = domHelper(tagName, {
						html: options.from
					});
					if (els.childElementCount === 0) {
						el = document.createElement(tagName);
					} else if (els.childElementCount === 1) {
						el = els.firstElementChild;
					} else {
						el = els;
					}
				}
			} else if (options.query) {
				const query = document.querySelector(options.query);
				if (query) el = query;
				else return null;
			} else el = document.createElement(tagName);
			if (options.id) el.id = options.id;
			if (options.html) el.innerHTML = options.html;
			if (options.text) el.innerText = options.text;
			if (options.attr) {
				for (const ak of Object.keys(options.attr)) {
					el.setAttribute(ak, options.attr[ak]);
				}
			}
			if (options.cssText) el.style.cssText = options.cssText;
			if (options.style) Object.assign(el.style, options.style);
			if (options.css) Object.assign(el.style, options.css);
			if (options.childs) {
				if (options.childs instanceof Array) options.childs.filter(el => !!el).forEach(child => {
					if (child instanceof HTMLElement) el.appendChild(child);
					else if (child.hasOwnProperty('type') && child.hasOwnProperty('content')) {
						switch (child.type) {
							case 'html': {
								arguments.callee('span', {
									from: child.content,
									append: el
								});
							}
							break;
						case 'style': {
							const scoped = child.hasOwnProperty('scoped') && !!child.scoped;
							arguments.callee('style', {
								html: child.content,
								append: el,
								attr: {
									scoped
								}
							});
						}
						break;
						default:
							el.appendChild(arguments.callee(child.type, child.content));
						}
					} else el.appendChild(document.createTextNode(child));
				});
				else if (options.childs instanceof HTMLElement) el.appendChild(options.childs);
				else el.appendChild(document.createTextNode(options.childs));
			}
			if (options.classlist) {
				if (options.classlist instanceof Array) options.classlist.forEach(classname => {
					el.classList.add(classname);
				});
				else el.classList.add(...options.classlist.split(" "));
			}
			if (options.classList) {
				if (options.classList instanceof Array) options.classList.forEach(classname => {
					el.classList.add(classname);
				});
				else el.classList.add(...options.classList.split(" "));
			}
			if (options.on) {
				for (let listenerName of Object.keys(options.on)) {
					el.addEventListener(listenerName, options.on[listenerName]);
				}
			}
			if (options.off) {
				for (let listenerName of Object.keys(options.of)) {
					el.removeEventListener(listenerName, options.off[listenerName]);
				}
			}
			if (options.bind) {
				const serverName = "$bindingserver" + Math.floor(Math.random() * 100000);
				const bindings = CKTools.deepClone(options.bind);
				const unbindProperty = (prop) => bindings[prop] = undefined;
				const unbindAllProperties = () => el[serverName].disconnect();
				el[serverName] = new MutationObserver(mutations => {
					for (const mutation in mutations) {
						if (bindings.hasOwnProperty(mutation.attributeName)) {
							try {
								bindings[mutation.attributeName]({
									target: mutation.target,
									attributeName: mutation.attributeName,
									attributeNamespace: mutation.attributeNamespace,
									oldValue: mutation.oldValue,
									newValue: mutation.target.getAttribute(mutation.attributeName) || undefined,
									unbind: () => unbindProperty(mutation.attributeName),
									stopListen: () => (unbindAllProperties(), el[serverName] = undefined)
								});
							} catch (e) {}
						}
					}
				});
				el.addEventListener('DOMNodeRemoved', () => (unbindAllProperties(), el[serverName] = undefined));
				el[serverName].observe(el, {
					attributes: true,
					attributeOldValue: true
				});
			}
			if (options.append && options.append instanceof HTMLElement) options.append.appendChild(el);
			if (options.insertBefore && insertBefore instanceof HTMLElement) options.insertBefore.parentNode.insertBefore(el, options.insertBefore);
			if (options.insertAfter && insertAfter instanceof HTMLElement) options.insertAfter.parentNode.insertAfter(el, options.insertAfter);
			if (options.init && options.init instanceof Function) options.init(el);
			if (options.initAsync && options.initAsync instanceof Function) {
				return options.initAsync(el).then(() => el);
			}
			return el;
		}
		static makeDom() {
			console.warn('"makeDom" has been deprecated. Redirecting to "domHelper"...');
			return CKTools.domHelper(...arguments);
		}
		static addDom(item) {
			const make = (tag = 'div') => document.createElement(tag);
			const txt = (it = '') => document.createTextNode(it);
			class DOMItem {
				constructor(it = '') {
					this.setItem(it);
				}
				setItem(it = '') {
					if (typeof it === 'string' || it instanceof String) {
						this.el = txt(it);
					} else if (it instanceof HTMLElement) {
						this.el = it;
					} else this.el = txt(it.toString());
					if (!this.target) this.target = document.body;
					this.mode = 'child';
					return this;
				}
				inside(q = document.body) {
					this.mode = 'child';
					if (q instanceof HTMLElement) {
						this.target = q;
					} else if (typeof q === 'string' || q instanceof String) {
						const ql = this.target.querySelector(q);
						if (ql) this.target = ql;
					}
					return this;
				}
				after(a = null) {
					this.mode = 'child-after';
					if (a instanceof HTMLElement) {
						this.after = a;
					} else if (typeof a === 'string' || a instanceof String) {
						const al = this.target.querySelector(a);
						if (al) this.after = al;
					}
					return this;
				}
				before(a = null) {
					this.mode = 'child-before';
					if (a instanceof HTMLElement) {
						this.before = a;
					} else if (typeof a === 'string' || a instanceof String) {
						const al = this.target.querySelector(a);
						if (al) this.before = al;
					}
					return this;
				}
				done() {
					switch (this.mode) {
						case "child": {
							if (this.el && this.target)
								this.target.appendChild(this.el);
						}
						break;
					case "child-before": {
						if (this.el && this.target && this.before)
							this.target.insertBefore(this.el, this.before);
					}
					break;
					case "child-after": {
						if (this.el && this.target && this.after)
							this.target.insertBefore(this.el, this.after.nextSibling);
					}
					break;
					}
				}
			}
			return new DOMItem(item);
		}
		static deepClone(obj) {
			let newObject = {};
			if (Array.isArray(obj)) {
				newObject = [];
				for (let i = 0; i < obj.length; i++) {
					newObject.push(CKTools.deepClone(obj[i]));
				}
				return newObject;
			}
			Object.keys(obj).map(key => {
				if (typeof obj[key] === 'object') {
					newObject[key] = CKTools.deepClone(obj[key]);
				} else {
					newObject[key] = obj[key];
				}
			});
			return newObject;
		}
		static getCookie(name) {
			const value = `; ${document.cookie}`;
			const parts = value.split(`; ${name}=`);
			if (parts.length === 2) return parts.pop().split(';').shift();
		}
		static clearAllCookies() {
			return document.cookie.split(';').forEach(cookie => document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`));
		}
		static getUrlParam(key) {
			return (new URL(location.href)).searchParams.get(key);
		}
		static wait(ms) {
			return new Promise(r => setTimeout(r, ms));
		}
		static async waitForDom(query, domparent = document, maxRetries = 20, gagms = 200) {
			let i = maxRetries;
			while (--i > 0) {
				if (domparent.querySelector(query)) return true;
				await CKTools.wait(gagms);
			}
			return false;
		}
		static async waitForAttribute(q, attr) {
			let i = 50;
			let value;
			while (--i >= 0) {
				if ((attr in q) &&
					q[attr] != null) {
					value = q[attr];
					break;
				}
				await wait(100);
			}
			return value;
		}
		static async waitForPageVisible() {
			if (document.hidden) return true;
			return new Promise(r => {
				const handler = () => {
					r(true);
					document.removeEventListener('visibilitychange', handler);
				};
				document.addEventListener("visibilitychange", handler)
			});
		}
		static clearStyles(className = "injectedStyle") {
			let dom = document.querySelectorAll("style." + className);
			if (dom)[...dom].forEach(e => e.remove());
		}
		static addStyle(s, className = "injectedStyle", mode = "append", injectBase = document.head) {
			switch (mode) {
				default:
				case "append":
					break;
				case "unique":
					if (document.querySelector("style." + className)) return;
					break;
				case "update":
					CKTools.clearStyles(className);
					break;
			}
			let style = document.createElement("style");
			style.classList.add(className);
			style.innerHTML = s;
			injectBase.appendChild(style);
		}
		// stackoverflow
		static debounce(func, timeout = 300) {
			let timer;
			return (...args) => {
				clearTimeout(timer);
				timer = setTimeout(() => {
					func.apply(this, args);
				}, timeout);
			};
		}
		static throttle(callback, limit) {
			var waiting = false;
			return function () {
				if (!waiting) {
					callback.apply(this, arguments);
					waiting = true;
					setTimeout(function () {
						waiting = false;
					}, limit);
				}
			}
		}
		static domContains(selector, text) {
			var elements = document.querySelectorAll(selector);
			return [].filter.call(elements, function (element) {
				return RegExp(text).test(element.textContent);
			});
		}
		static mapReplace(str, map) {
			//reference: https://segmentfault.com/q/1010000023489916 answer-2
			const replace = ({
					str,
					reg,
					replacer
				}) =>
				str.replace(new RegExp(reg, 'g'), replacer);
			return Object.keys(map).reduce((str, reg) => replace({
				str,
				reg,
				replacer: map[reg]
			}), str);
		}
		static padStart(num, count = 2) {
			return (('' + Math.pow(10, count)).substr(1) + num).slice(-1 * Math.max(count, ('' + num).length));
		}
		static fixNum(num, fix = 0) {
			return Math.floor(num * (Math.pow(10, fix))) / (Math.pow(10, fix));
		}
		static random = class {
			static hex() {
				return `#${Math.floor(Math.random() * 0xffffff).toString(16).padEnd(6, "0")}`;
			}
			static shuffleArray(arr) {
				return arr.sort(() => 0.5 - Math.random());
			}
			static num(min, max) {
				return Math.random() * (max - min) + min;
			}
			static fromArray(arr = []) {
				return arr[Math.floor(CKTools.random.num(0, arr.length))];
			}
			static from(...args) {
				return CKTools.random.fromArray(args);
			}
		}
		static is = class {
			static str(s) {
				return (s != null && (typeof s === "string" || s instanceof String));
			}
			static elementInViewport(el) {
				var rect = el.getBoundingClientRect();
				return (
					rect.top >= 0 &&
					rect.left >= 0 &&
					rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
					rect.right <= (window.innerWidth || document.documentElement.clientWidth)
				);
			}
			static asyncFn(fn) {
				return fn.constructor.name === "AsyncFunction";
			}
			static darkMode() {
				return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
			}
		}
		static modal = class {
			static openModal(title = '', content) {
				CKTools.modal.blockWindow();
				let modal = CKTools.get("#CKTOOLS-modal");
				if (!modal) modal = CKTools.modal.initModal();
				modal.setTitle(title);
				modal.setContent(content);
				modal.show();
			}
			static isModalShowing() {
				let modal = CKTools.get("#CKTOOLS-modal");
				if (modal) return modal.classList.contains("show");
				else return false;
			}
			static hideModal() {
				CKTools.modal.blockWindow(false);
				let modal = CKTools.get("#CKTOOLS-modal");
				if (modal) modal.hide();
			}
			static initModal() {
				CKTools.addStyle(`
				#CKTOOLS-modal{
					position: fixed;
					z-index: 99010;
					top: 50%;
					left: 50%;
					width: 300px;
					width: 30vw;
					/*height: 300px;
					height: 50vh;*/
					background: white;
					border-radius: 8px;
					padding: 12px;
					transform: translate(-50%,-50%);
					transition: all .3s;
					box-shadow: 0 2px 8px grey;
				}
				#CKTOOLS-modal.show{
					opacity: 1;
					transform: translate(-50%,-50%) scale(1);
				}
				#CKTOOLS-modal.hide{
					opacity: 0;
					pointer-events: none;
					transform: translate(-50%,-50%) scale(0.9);
				}
				.CKTOOLS-modal-title{
					font-size: large;
				}
				.CKTOOLS-modal-content{
					font-size: medium;
				}
				.CKTOOLS-modal-content>div{
					display: flex;
					margin: 6px 10px;
					flex-wrap: wrap;
					flex-direction: column;
					align-content: space-around;
					justify-content: space-between;
					align-items: center;
				}
				.CKTOOLS-toolbar-btns{
					flex: 1;
					border: none;
					background: #2196f3;
					border-radius: 3px;
					margin: 0 6px;
					padding: 3px;
					color: white;
					box-shadow: 0 2px 3px grey;
					min-width: 60px;
				}
				.CKTOOLS-toolbar-btns:hover{
					filter: brightness(0.85);
				}
				`, "CKTOOLS-modal-css", "unique");
				const modal = document.createElement("div");
				modal.id = "CKTOOLS-modal";
				modal.className = "hide";

				const header = document.createElement("h2");
				header.className = "CKTOOLS-modal-title"
				modal.appendChild(header);

				modal.setTitle = (t = '') => {
					header.innerHTML = t;
				}

				const contents = document.createElement("div");
				contents.className = "CKTOOLS-modal-content";
				modal.appendChild(contents);

				modal.setContent = async (c) => {
					let ct = c;
					if (ct instanceof Function) {
						ct = await ct();
					}
					if (ct instanceof HTMLElement) {
						contents.innerHTML = '';
						contents.appendChild(ct);
						return;
					}
					if (typeof (ct) === "string") {
						contents.innerHTML = ct;
						return;
					}
					console.log("unknown: ", ct);
				}
				modal.addContent = async (c) => {
					let ct = c;
					if (ct instanceof Function) {
						ct = await ct();
					}
					if (ct instanceof HTMLElement) {
						contents.appendChild(ct);
						return;
					}
					if (ct instanceof String) {
						contents.innerHTML += ct;
						return;
					}
					console.log("unknown: ", ct);
				}

				modal.close = CKTools.modal.closeModal;
				modal.open = CKTools.modal.openModal;
				modal.show = () => {
					modal.className = "show";
				}
				modal.hide = () => {
					modal.className = "hide";
				}

				document.body.appendChild(modal);
				return modal;
			}
			static closeModal() {
				CKTools.modal.blockWindow(false);
				let modal = CKTools.get("#CKTOOLS-modal");
				if (modal) modal.remove();
			}
			static async alertModal(title = "", content = "", okbtn = null) {
				if (CKTools.modal.isModalShowing()) {
					CKTools.modal.hideModal();
					await CKTools.wait(200);
				}
				CKTools.modal.openModal(title, await CKTools.domHelper("div", async container => {
					container.appendChild(await CKTools.domHelper("div", tip => {
						tip.innerHTML = content;
					}))
					if (okbtn !== null)
						container.appendChild(await CKTools.domHelper("div", async btns => {
							btns.style.display = "flex";
							btns.appendChild(await CKTools.domHelper("button", btn => {
								btn.className = "CKTOOLS-toolbar-btns";
								btn.innerHTML = okbtn;
								btn.onclick = e => CKTools.modal.hideModal();
							}))
						}))
				}))
				await CKTools.wait(300);
			}
			static blockWindow(block = true) {
				CKTools.addStyle(`
				#CKTOOLS-blockWindow{
					z-index: 99005;
					display: block;
					background: #00000080;
					opacity: 0;
					transition: all .3s;
					position: fixed;
					left: 0;
					top: 0;
					width: 100vw;
					height: 100vh;
				}
				#CKTOOLS-blockWindow.hide{
					pointer-events: none;
					opacity: 0;
				}
				#CKTOOLS-blockWindow.show{
					opacity: 1;
				}
				`, "CKTOOLS-blockWindow-css", "unique");
				let dom = CKTools.get("#CKTOOLS-blockWindow");
				if (!dom) {
					dom = document.createElement("div");
					dom.id = "CKTOOLS-blockWindow";
					dom.className = "hide";
					document.body.appendChild(dom);
				}
				if (block) {
					dom.className = "show";
				} else {
					dom.className = "hide";
				}
			}
		}
		static bili = class {
			static getCSRFToken() {
				return CKTools.getCookie("bili_jct");
			}
			static async playerReady() {
				let i = 50;
				while (--i >= 0) {
					await CKTools.wait(100);
					if (!('player' in window)) continue;
					if (!('isInitialized' in window.player)) continue;
					if (!window.player.isInitialized()) continue;
				}
				if (i < 0) return false;
				await CKTools.waitForPageVisible();
				while (1) {
					await CKTools.wait(200);
					if (document.querySelector(".bilibili-player-video-control-wrap, .bpx-player-control-wrap")) return true;
				}
			}
			static getTotalTime() {
				return waitForAttribute(CKTools.get('video, bwp-video'), 'duration')||unsafeWindow.player?.getDuration();
			}
			static getCurrentTime() {
				return CKTools.get('video, bwp-video').currentTime||unsafeWindow.player?.getCurrentTime();
			}
			static setTime(t) {
				return window.player.seek(t);
			}
			static play() {
				return window.player.play();
			}
			static pause() {
				return window.player.pause();
			}
			static getInfoByBvid(bvid) {
				return fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid).then(raw => raw.json());
			}
			static getInfoByAid(aid) {
				return fetch('https://api.bilibili.com/x/web-interface/view?aid=' + aid).then(raw => raw.json());
			}
		}
		static EventEmitter = class {
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
			clean(name) {
				if (name in this.handlers) {
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
		static HoldClick = class {
			dom;
			emitter = new CKTools.EventEmitter;
			downTime = 0;
			holdingTime = 250;
			mouseDown = false;

			constructor(dom, holdingTime = 250) {
				this.bind(dom);
				this.holdingTime = holdingTime;
			}

			bind(dom) {
				if (this.dom) {
					this.unregListeners();
				}
				if (dom instanceof HTMLElement) {
					this.dom = dom;
					this.initListener();
				}
			}

			onclick(func) {
				this.emitter.on("click", func);
				return this;
			}

			onhold(func) {
				this.emitter.on("hold", func);
				return this;
			}

			onup(func) {
				this.emitter.on("up", func);
				return this;
			}

			offclick(func) {
				this.emitter.off("click", func);
				return this;
			}

			offhold(func) {
				this.emitter.off("hold", func);
				return this;
			}

			offup(func) {
				this.emitter.off("up", func);
				return this;
			}

			resetCallback(name = "all") {
				const allEv = ["click", "hold", "up"];
				if (name === "all") {
					allEv.forEach(e => this.emitter.clean(e));
				} else if (allEv.includes(name)) {
					this.emitter.clean(name);
				}
			}

			unregListeners() {
				this.dom.removeEventListener("mouseup", this.handleMouseUp.bind(this));
				this.dom.removeEventListener("mousedown", this.handleMouseDown.bind(this));
				this.dom.removeEventListener("mouseout", this.handleMouseOut.bind(this));
			}

			uninstall() {
				this.resetCallback();
				this.unregListeners();
			}

			handleMouseDown(e) {
				if (e.button !== 0 && e.button !== 1) return;
				e.preventDefault();
				this.mouseDown = true;
				this.downTime = (new Date()).getTime();
				setTimeout(() => {
					if (this.mouseDown) {
						console.log(this);
						this.mouseDown = false;
						this.downTime = 0;
						this.emitter.emit("hold", e);
					}
				}, this.holdingTime)
			}

			handleMouseUp(e) {
				if (e.button !== 0 && e.button !== 1) return;
				e.preventDefault();
				if (this.mouseDown) {
					this.mouseDown = false;
					const currTime = (new Date).getTime();
					if ((currTime - this.downTime) >= this.holdingTime) {
						this.emitter.emit("hold", e);
					} else {
						this.emitter.emit("click", e);
					}
					this.downTime = 0;
				}
				this.emitter.emit("up", e);
			}

			handleMouseOut(e) {
				e.preventDefault();
				if (this.mouseDown) {
					this.mouseDown = false;
					this.downTime = 0;
					this.emitter.emit("hold", e);
				}
			}

			initListener() {
				this.dom.addEventListener("mouseup", this.handleMouseUp.bind(this))
				this.dom.addEventListener("mousedown", this.handleMouseDown.bind(this))
				this.dom.addEventListener("mouseout", this.handleMouseOut.bind(this))
			}
		}
		static dragger = class {
			static defaultHandler(val) {
				return console.log("DRAG:", val);
			}
			static async waitForDragger(waitStatus = true) {
				while (CKTools.dragger.dragging !== waitStatus) await CKTools.wait(10);
				return CKTools.dragger;
			}
			static async regHandler(func) {
				if (!(func instanceof Function)) throw "Param must be a func!";
				await CKTools.dragger.waitForDragger(false);
				CKTools.dragger.handler = func;
				return CKTools.dragger;
			}
			static handler() {}
			static dragging = false;
			static initialDragData = {
				x: 0,
				y: 0
			}
			static lastDragData = {
				x: 0,
				y: 0
			}
			static startDrag(e) {
				if (CKTools.dragger.dragging) return;
				CKTools.dragger.dragging = true;
				console.log(CKTools.dragger.initialDragData);
				CKTools.dragger.initialDragData.x = e.screenX;
				CKTools.dragger.initialDragData.y = e.screenY;
				CKTools.dragger.lastDragData.x = e.screenX;
				CKTools.dragger.lastDragData.y = e.screenY;
				document.body.addEventListener("mouseup", CKTools.dragger.stopDrag);
				document.body.addEventListener("mousemove", CKTools.dragger.handleDrag);
				console.info("DRAG:", "Start Drag");
				return CKTools.dragger;
			}
			static handleDrag(e) {
				const currPos = {
					x: e.screenX,
					y: e.screenY
				};
				const initPos = CKTools.dragger.initialDragData;
				const delta = {
					x: initPos.x - currPos.x,
					y: initPos.y - currPos.y
				}
				const lastdelta = {
					x: CKTools.dragger.lastDragData.x - currPos.x,
					y: CKTools.dragger.lastDragData.y - currPos.y
				}
				CKTools.dragger.lastDragData = currPos;
				CKTools.dragger.handler(delta, lastdelta);
			}
			static stopDrag() {
				document.body.removeEventListener("mouseup", CKTools.dragger.stopDrag);
				document.body.removeEventListener("mousemove", CKTools.dragger.handleDrag);
				CKTools.dragger.handler = CKTools.dragger.defaultHandler;
				console.info("DRAG:", "Stop Drag");
				CKTools.dragger.dragging = false;
				return CKTools.dragger;
			}
		}
		static GUID = class {
			static S4() {
				return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
			}
			static get() {
				let S4 = CKTools.GUID.S4;
				return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
			}
			static getShort() {
				let S4 = CKTools.GUID.S4;
				return (S4() + S4() + S4() + S4());
			}
		}
	}
	window.CKTools = CKTools;
})();
