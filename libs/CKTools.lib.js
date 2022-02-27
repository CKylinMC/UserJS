// ==UserScript==
// @name         CKTools
// @namespace    ckylin-script-lib-combined-tools
// @version      1.1
// @match        http://*
// @match        https://*
// @author       CKylinMC
// @license      GPLv3 License
// ==/UserScript==
const CKTools = {
	ver: 1.1,
	get: (q,base=document) => base.querySelector(q),
	getAll: (q,base=document) => base.querySelectorAll(q),
	_: async (func = () => {}, ...args) => await func(...args),
	makeDom: async (domname, func = () => {}, ...args) => {
		const d = document.createElement(domname);
		await CKTools._(func, d, ...args);
		return d;
	},
	domHelper: (tagName = 'div', options = {}) => {
		let el;
		if(options.from){
			if(options.from instanceof HTMLElement){
				el = options.from;
			}else if(typeof(options.from)=="string"){
				els = CKTools.domHelper(tagName,{html:options.from});
				if(els.childElementCount===0){
					el = document.createElement(tagName);
				}else if(els.childElementCount===1){
					el = els.firstElementChild;
				}else{
					el = els;
				}
			}
		} else el = document.createElement(tagName);
		if (options.id) el.id = options.id;
		if (options.html) el.innerHTML = options.html;
		if (options.text) el.innerText = options.text;
		if (options.attr) Object.assign(el, options.attr);
		if (options.style) Object.assign(el.style, options.style);
		if (options.css) Object.assign(el.style, options.css);
		if (options.childs) {
			if(options.childs instanceof Array) options.childs.filter(el=>!!el).forEach(child => {
				if(child instanceof HTMLElement) el.appendChild(child);
				else el.appendChild(document.createTextNode(child));
			});
			else if(childs instanceof HTMLElement) el.appendChild(childs);
			else el.appendChild(document.createTextNode(childs));
		}
		if(options.classnames) {
			if(options.classnames instanceof Array) options.classnames.forEach(classname => {
				el.classList.add(classname);
			});
			else el.classList.add(...options.classnames.split(" "));
		}
		if(options.listeners) {
			for(let listenerName of Object.keys(options.listeners)) {
				el.addEventListener(listenerName, options.listeners[listenerName]);
			}
		}
		if (options.append && options.append instanceof HTMLElement) options.append.appendChild(el);
		if (options.init && options.init instanceof Function) options.init(el);
		if (options.initAsync && options.initAsync instanceof Function) {
			return options.initAsync(el).then(() => el);
		}
		return el;
	},
	getCookie: (name) => {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(';').shift();
	},
	getUrlParam: key=>(new URL(location.href)).searchParams.get(key),
	wait: ms=>new Promise(r=>setTimeout(r,ms)),
	waitForDom: async (query,domparent=document,maxRetries=20,gagms=200)=>{
		let i = maxRetries;
		while(--i>0){
			if(domparent.querySelector(query)) return true;
			await CKTools.wait(gagms);
		}
		return false;
	},
	waitForAttribute: async (q, attr)=>{
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
    },
	waitForPageVisible: async () => document.hidden && new Promise(r=>document.addEventListener("visibilitychange",r)),
	clearStyles: (className = "injectedStyle") => {
		let dom = document.querySelectorAll("style." + className);
		if (dom) [...dom].forEach(e => e.remove());
	},
	addStyle: (s, className = "injectedStyle", mode = "append",injectBase = document.body) => {
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
		document.head.appendChild(style);
	},
	modal: {
		openModal: (title = '', content) => {
			CKTools.modal.blockWindow();
			let modal = CKTools.get("#CKTOOLS-modal");
			if (!modal) modal = CKTools.modal.initModal();
			modal.setTitle(title);
			modal.setContent(content);
			modal.show();
		},
		isModalShowing: () => {
			let modal = CKTools.get("#CKTOOLS-modal");
			if (modal) return modal.classList.contains("show");
			else return false;
		},
		hideModal: () => {
			CKTools.modal.blockWindow(false);
			let modal = CKTools.get("#CKTOOLS-modal");
			if (modal) modal.hide();
		},
		initModal: () => {
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
				if (typeof(ct)==="string") {
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
		},
		closeModal: () => {
			CKTools.modal.blockWindow(false);
			let modal = CKTools.get("#CKTOOLS-modal");
			if (modal) modal.remove();
		},
		alertModal: async (title = "", content = "", okbtn = "hidden") => {
			if (CKTools.modal.isModalShowing()) {
				CKTools.modal.hideModal();
				await CKTools.wait(200);
			}
			CKTools.modal.openModal(title, await CKTools.makeDom("div", async container => {
				container.appendChild(await CKTools.makeDom("div", tip => {
					tip.innerHTML = content;
				}))
				if (okbtn !== "hidden")
					container.appendChild(await CKTools.makeDom("div", async btns => {
						btns.style.display = "flex";
						btns.appendChild(await CKTools.makeDom("button", btn => {
							btn.className = "CKTOOLS-toolbar-btns";
							btn.innerHTML = okbtn;
							btn.onclick = e => CKTools.modal.hideModal();
						}))
					}))
			}))
			await CKTools.wait(300);
		},
		blockWindow: (block = true) => {
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
	},
	bili:{
		getCSRFToken: () => CKTools.getCookie("bili_jct"),
		playerReady: async () => {
			let i = 50;
			while (--i >= 0) {
				await CKTools.wait(100);
				if (!('player' in window)) continue;
				if (!('isInitialized' in window.player)) continue;
				if (!window.player.isInitialized()) continue;
			}
			if(i<0)return false;
			await CKTools.waitForPageVisible();
			while(1){
				await CKTools.wait(200);
				if(document.querySelector(".bilibili-player-video-control-wrap")) return true;
			}
		},
		getTotalTime: async () => await waitForAttribute(cfg.video,'duration'),
		getCurrentTime: () => cfg.video.currentTime,
		setTime: t => window.player.seek(t),
		play: () => window.player.play(),
		pause: () => window.player.pause(),
		getInfoByBvid: (bvid)=>fetch('https://api.bilibili.com/x/web-interface/view?bvid='+bvid).then(raw=>raw.json()),
		getInfoByAid: (aid)=>fetch('https://api.bilibili.com/x/web-interface/view?aid='+aid).then(raw=>raw.json()),
	},
	EventEmitter: class {
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
		clean(name){
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
	},
	HoldClick: class {
        dom;
        emitter = new CKTools.EventEmitter;
        downTime = 0;
        holdingTime = 250;
        mouseDown = false;

        constructor(dom, holdingTime = 250) {
			this.bind(dom);
            this.holdingTime = holdingTime;
        }

		bind(dom){
			if(this.dom){
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

		resetCallback(name = "all"){
			const allEv = ["click","hold","up"];
			if(name==="all"){
				allEv.forEach(e=>this.emitter.clean(e));
			}else if(allEv.includes(name)){
				this.emitter.clean(name);
			}
		}

		unregListeners(){
            this.dom.removeEventListener("mouseup", this.handleMouseUp.bind(this));
            this.dom.removeEventListener("mousedown", this.handleMouseDown.bind(this));
            this.dom.removeEventListener("mouseout", this.handleMouseOut.bind(this));
		}

		uninstall(){
			this.resetCallback();
			this.unregListeners();
		}

        handleMouseDown(e) {
			if(e.button!==0&&e.button!==1) return;
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
			if(e.button!==0&&e.button!==1) return;
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
    },
	dragger: {
        defaultHandler: (val) => console.log("DRAG:", val),
        waitForDragger: async (waitStatus = true) => {
            while (CKTools.dragger.dragging !== waitStatus) await CKTools.wait(10);
            return CKTools.dragger;
        },
        regHandler: async (func) => {
            if (!(func instanceof Function)) throw "Param must be a func!";
            await CKTools.dragger.waitForDragger(false);
            CKTools.dragger.handler = func;
            return CKTools.dragger;
        },
        handler: () => {
        },
        dragging: false,
        initialDragData: {
            x: 0,
            y: 0
        },
        lastDragData: {
            x: 0,
            y: 0
        },
        startDrag: (e) => {
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
        },
        handleDrag: (e) => {
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
        },
        stopDrag: () => {
            document.body.removeEventListener("mouseup", CKTools.dragger.stopDrag);
            document.body.removeEventListener("mousemove", CKTools.dragger.handleDrag);
            CKTools.dragger.handler = CKTools.dragger.defaultHandler;
            console.info("DRAG:", "Stop Drag");
            CKTools.dragger.dragging = false;
            return CKTools.dragger;
        },
    }
}
