// ==UserScript==
// @name         [Bilibili] 视频内显工具
// @namespace    ckylin-script-bilibili-shownameinside
// @version      1.2
// @description  视频内显示分P信息(方便全屏时查看)
// @author       CKylinMC
// @match        https://*.bilibili.com/*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-body
// @require      https://greasyfork.org/scripts/429720-cktools/code/CKTools.js?version=1023553
// @license      GPLv3
// ==/UserScript==

(async function(){
	'use strict';
	const instance = Math.floor(Math.random()*100000);
	class Logger{
		constructor(prefix='[logUtil]'){
			this.prefix = prefix;
		}
		log(...args){
			console.log(this.prefix,...args);
		}
		info(...args){
			console.info(this.prefix,...args);
		}
		warn(...args){
			console.warn(this.prefix,...args);
		}
		error(...args){
			console.error(this.prefix,...args);
		}
	}
	const defaultList = ["设置按钮","分P编号","斜杠","分P数量","间隔符","分P标题"];
	const logger = new Logger("[SNI "+instance+"]");
	if(CKTools.ver<1.2){
		logger.warn("Library script 'CKTools' was loaded incompatible version "+CKTools.ver+", so that SNI may couldn't work correctly. Please consider update your scripts.");
	}
	const {get,getAll,domHelper,wait,waitForDom,waitForPageVisible,addStyle,modal,bili} = CKTools;
	function getContainer(clear=false){
		let dom = get("#ck-sni-container");
		if(!dom) dom = domHelper("div",{
			id: "ck-sni-container",
			append: get("div.bilibili-player-video-wrap")
		});
		else if(dom.getAttribute("data-sni-instance")!=instance+"") {
			logger.error("Multi instance running! An error throwed by this.");
			throw new Error("Multi instance running!");
		}
		dom.setAttribute("data-sni-instance",instance+"");
		if(clear) dom.innerHTML = "";
		return dom;
	}
	const Modules = {
		"设置按钮": d=>domHelper('span',{
			classnames:['ck-sni-clickable'],
			text: "🛠️",
			listeners:{
				click: openSettingsModal
			}
		}),
		"间隔符": d=>" | ",
		"空白": d=>"   ",
		"斜杠": d=>" / ",
		"分P标题": d=>{
			const parts = d.info.vid.pages;
			const findpart = parts.filter(page=>page.cid==+d.info.cid);
			if(findpart.length){
				const part = findpart[0];
				return part.part;
			}else return null;
		},
		"分P编号": d=>{
			const parts = d.info.vid.pages;
			const total = parts.length;
			const findpart = parts.filter(page=>page.cid==+d.info.cid);
			if(findpart.length){
				const part = findpart[0];
				return part.page;
			}else return null;
		},
		"分P数量": d=>d.info.vid.videos,
		"BV号": d=>d.info.bvid,
		"AV号": d=>d.info.aid,
		"标题": d=>d.info.vid.title,
		"分区": d=>d.info.vid.tname,
		"UP主": d=>d.info.vid.owner.name,
		"简介": d=>d.info.vid.desc,
		"弹性空白": d=>domHelper('span',{
			css:{
				flex: 2,
			},
		}),
	};
	const running = {};
	function debounce(func, timeout = 300) {
		  let timer;
		  return (...args) => {
			      clearTimeout(timer);
			      timer = setTimeout(() => { func.apply(this, args); }, timeout);
		  };
	}
	const MenuManager = {
		ids:[],
		menus:{},
		registerMenu: (text, callback) => MenuManager.ids.push(GM_registerMenuCommand(text, callback)),
		clearMenu: () => {MenuManager.ids.forEach(id => GM_unregisterMenuCommand(id)); MenuManager.ids = [];},
		setMenu:(id,text,callback,noapply = false)=>{
	        MenuManager.menus[id] = { text, callback };
	        if (!noapply) MenuManager.applyMenus();
    	},
    	applyMenus:()=>{
        	MenuManager.clearMenu();
	        for (let item in MenuManager.menus) {
	            if(!MenuManager.menus.hasOwnProperty(item)) continue;
	            let menu = MenuManager.menus[item];
	            MenuManager.registerMenu(menu.text, menu.callback);
	        }
	    }
	};
	function getValueOrDefault(key,fallback=null){
		const val = GM_getValue(key);
		return typeof val === 'undefined' ? fallback : val;
	}
	function saveValue(k,v){
		return GM_setValue(k,v);
	}
	function getModule(name){
		if(Modules.hasOwnProperty(name)){
			return Modules[name];
		}else{
			return undefined;
		}
	}
	async function runModulesFromList(wrapper,list,...args){
		for(const name of list){
			logger.info("Executing module",name);
			try{
				const mod = getModule(name);
				//logger.info("Got module",mod);
				if(mod){
					let result;
					if(mod.constructor.name=='AsyncFunction'){
						result = await mod(...args);
					}else {
						result = mod(...args);
					}
					if(result){
						if(result instanceof HTMLElement||result instanceof Node){
							wrapper.appendChild(result);
							logger.log(name,"dom",result);
						}else if(result instanceof String || typeof result=='string' || typeof result=='number'){
							wrapper.appendChild(document.createTextNode(result));
							logger.log(name,"text",result);
						}else{
							logger.log(name,"unknownresult","skipped",result);
						}
					}else{
						logger.log(name,"noresult","skipped");
					}
				}else{
					//logger.log(name,"nomod","skipped");
					wrapper.appendChild(document.createTextNode(name));
					logger.log(name,"nameonly",name);
				}
			}catch(e){ logger.error(e) };
		}
	}
	function combineExternalModules(){
		if(unsafeWindow.SNIMODULES){
			for(const name of Object.keys(unsafeWindow.SNIMODULES)){
				const mod = unsafeWindow.SNIMODULES[name];
				if(typeof mod ==='function'){
					Modules[name] = mod;
				}
			}
		}
	}
	function getRunning(k){
		return running[k];
	}
	function getCid(){
		return unsafeWindow.cid;
	}
	async function inject(){
		logger.log("injecting - fetching");
		saveState();
		combineExternalModules();
		let info = await bili.getInfoByBvid(unsafeWindow.bvid);
		if(info&&info.code===0) running.info = info.data;
		else return logger.error("injecting - info fetch errored");
		logger.log("injecting - fetch info ok",info);
		const container = getContainer(true);
		const list = getValueOrDefault("moduleseq",defaultList);
		if(list.length === 0) return logger.warn("injecting - exited due to no active module.");;
		logger.log("injecting - mod list ok",list);
		const wrapper = domHelper('span',{
			id: "ck-sni-wrapper",
			append: container,
			init: wrapper=>{
				if(getValueOrDefault('enableFlex',false)){
					wrapper.style.display = "flex";
					domHelper('style',{
						append: wrapper,
						init:style=>{
							style.setAttribute("scoped",true);
							style.appendChild(document.createTextNode(`span{float:none!important;transform:none!important;}`))
						}
					})
				}
			}
		});
		const currentInfo = {
			info:{
				bvid: unsafeWindow.bvid,
				cid: unsafeWindow.cid,
				aid: unsafeWindow.aid,
				vid: running.info
			},
			tools:CKTools,// pass tools into modules for extend use.
			logger: new Logger("[SNI "+instance+"/module]")
		};
		logger.log("injecting - executing");
		getContainer();// call for instance check
		await runModulesFromList(wrapper, list, currentInfo);
		logger.log("injecting - done");
	}
	function setLoading(){
		const container = getContainer(true);
		container.innerText = "正在加载...";
	}
	async function regChangeHandler(){
		if(running.observer) running.observer.disconnect();
		running.observer = new MutationObserver(debounce(e=>{
			if(getRunning('cid')!=getCid()){
				setLoading();
				saveState();
				logger.log("Video changes detected");
				inject();
			}
		}));
		let retries = 5;
		while(retries--){
			if(await waitForDom("#bilibili-player")){
				running.observer.observe(get("#bilibili-player"),{attributes: true, childList: true, subtree: true});
				logger.log("Observer started");
				return;
			}else{
				logger.warn("Observer waiting for dom...");
				await wait(100);
			}
		}
		logger.warn("Observer not registered correctly.");
		
	}
	function regIntervalStateChangeListener(){
		if(running.hrefinterval) clearInterval(running.hrefinterval);
		running.hrefinterval = setInterval(()=>{
			if(isStateChanged()){
				setLoading();
				saveState();
				logger.log("Video changes detected");
				inject();
			}
		},1000);
	}
	function saveState(){
		running.cid = unsafeWindow.cid;
		running.href = location.href;
		let p = get("video,bwp-video");
		running.blob = p?p.src:null;
	}
	function isStateChanged(){
		let p = get("video,bwp-video");
		let blob = p?p.src:null;
		return running.cid!=unsafeWindow.cid||running.href!=location.href||running.blob!=blob;
	}
	async function openSettingsModal(){
		combineExternalModules();
		const makeBadge = (name,title="点击移除",click=()=>{})=>domHelper('div',{
			classnames: ['ck-sni-mod','ck-sni-grid-item'],
			css:{
				display: "inline-block",
				margin: "2px",
				padding: "2px",
				background: "white",
				color: "black",
				borderRadius: "5px",
				border: "2px solid gray",
				cursor: "pointer"
			},
			text: name,
			listeners:{
				click:click
			},
			init:el=>{
				el.setAttribute("data-sni-mod",name);
				el.title = title;
			}
		})
		return new Promise(r=>modal.openModal('视频内显设置',domHelper('div',{
			id: 'ck-sni-settings',
			css:{
				display: "block"
			},
			childs: [
				domHelper('h3',{
					css:{
						fontWeight: "bold"
					},
					text: '选项'
				}),
				domHelper('div',{
					id: 'ck-sni-enable-flex',
					css:{
						fontWeight: "bold"
					},
					text: '是否启用弹性布局',
					init: optdiv=>{
						let getState = ()=>optdiv.getAttribute('enabled')=='yes';
						const applyState = state=>{
							optdiv.setAttribute('enabled',state?'yes':'no');
							optdiv.innerText = (state?'🟢已启用':'🔴已禁用')+"弹性布局";
						};
						optdiv.onclick = e=>applyState(!getState());
						applyState(getValueOrDefault('enableFlex',false));
					}
				}),
				domHelper('div',{
					css:{
						paddingLeft: "15px"
					},
					text: '开启后允许使用弹性空白，并自动禁用所有浮动和偏移。请注意关闭后弹性空白自动失效。'
				}),
				domHelper('h3',{
					css:{
						fontWeight: "bold"
					},
					text: '组件'
				}),
				domHelper('div',{
					css:{
						fontWeight: "bold"
					},
					text: '已启用:'
				}),
				domHelper('div',{
					id: "ck-sni-enabled-mods",
					css:{
						margin: "12px",
						background: "#00ffe740",
						borderRadius: "5px",
						padding: "6px"
					},
					init: div=>{
						div.classList.add('ck-sni-draggables');
						const list = getValueOrDefault("moduleseq",defaultList);
						for(const name of list){
							div.appendChild(makeBadge(name,"点击移除",e=>e.target.remove()));
						}
						setTimeout(()=>{
							const draggable = new Draggable({
								element: document.querySelector('.ck-sni-draggables'),
								cloneElementClassName: 'ck-sni-clone-grid-item'
							});
						},1000);
					}
				}),
				domHelper('div',{
					css:{
						fontWeight: "bold"
					},
					text: '可添加:'
				}),
				domHelper('div',{
					id: "ck-sni-available-mods",
					css:{
						margin: "12px",
						background: "#3e70ff75",
						borderRadius: "5px",
						padding: "6px",
						flexWrap: 'wrap',
						display: 'flex',
						maxWidth: '80vw'
					},
					init: div=>{
						const list = Object.keys(Modules);
						for(const name of list){
							div.appendChild(makeBadge(name,"点击添加",e=>{
								const enabledList = get("#ck-sni-enabled-mods");
								if(!enabledList) return;
								enabledList.appendChild(makeBadge(name,"点击移除",e=>e.target.remove()))
							}));
						}
					}
				}),
				domHelper('div',{
					css:{
						fontWeight: "bold"
					},
					text: '自定义文本:'
				}),
				domHelper('div',{
					text: '添加自定义纯文本到显示行。请注意，不要与现有模块重名。'
				}),
				domHelper('input',{
					id: "ck-sni-custom-mods-input",
					css:{
						margin: "12px",
						background: "#3e70ff75",
						borderRadius: "5px",
						padding: "6px",
						border: "2px solid gray"
					},
					init: input=>{
						input.setAttribute('placeholder',"输入自定义纯文本，回车添加");
						input.onkeyup = e=>{
							if(e.key=="Enter"||e.code=="Enter"||e.keyCode===13){
								let val = e.target.value;
								if(val&&val.trim().length>0){
									const enabledList = get("#ck-sni-enabled-mods");
									if(!enabledList) return;
									enabledList.appendChild(makeBadge(val.trim(),"点击移除",e=>e.target.remove()));
									e.target.value = '';
								}
							}
						}
					}
				}),
				domHelper('br'),
				domHelper('button',{
					classnames: 'CKTOOLS-toolbar-btns',
					text: "保存",
					listeners:{
						click: e=>{
							const enabledList = [...getAll("#ck-sni-enabled-mods .ck-sni-mod")];
							if(!enabledList) return alert("保存失败,列表失效");
							const mods = enabledList.map(el=>el.getAttribute("data-sni-mod"));
							logger.log(enabledList,mods);
							saveValue("moduleseq",mods);
							const flexopt = get("#ck-sni-enable-flex");
							if(flexopt){
								let opt = flexopt.getAttribute("enabled")=='yes';
								saveValue("enableFlex",opt);
							}
							modal.closeModal();
							inject();
						}
					}
				}),
				domHelper('button',{
					classnames: 'CKTOOLS-toolbar-btns',
					text: "取消",
					listeners:{
						click: e=>{
							modal.closeModal();
						}
					}
				})
			]
		})));
	}
	async function startInject(){
		//logger.info("Start Trace:", (new Error).stack);
		if(unsafeWindow.SNI_started){
			logger.warn("Someone called start twice. Aborting...");
			logger.warn("Trace:", (new Error).stack);
			return;
		}
		unsafeWindow.SNI_started = true;
		logger.info("waiting for player to be ready");
		await waitForPageVisible();
		await bili.playerReady();
		addStyle(`
			#ck-sni-container {
				pointer-events: none;
				position: absolute;
				top: 0;
				left: 0;
				background: -moz-linear-gradient(bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%);
				background: -webkit-linear-gradient(bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%);
				background: linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%);
				width: 100%;
				display: block;
				height: 60px;
				padding: 8px 0;
				transition: opacity .3s;
				opacity: 0;
				z-index: 9999;
			}
			#ck-sni-container>#ck-sni-wrapper{
				padding: 0 15px;
			}
			.video-control-show #ck-sni-container .ck-sni-clickable{
				pointer-events: auto !important;
			}
			.video-control-show #ck-sni-container{
				transition: opacity .3s;
				opacity: 1;
			}
			#ck-sni-container:empty{
				display: none;
			}
			#ck-sni-container #ck-sni-wrapper{
				color: white;
				background: transparent;
			}

			/* Copied from https://juejin.cn/post/7022824391163510821 */
			.ck-sni-draggables * {
				margin: 0;
				padding: 0;
				box-sizing: border-box;
			}
			
			.ck-sni-draggables .ck-sni-grid {
				display: flex;
				flex-wrap: wrap;
				margin: 0 -15px -15px 0;
				touch-action: none;
				user-select: none;
			}
			
			.ck-sni-draggables .ck-sni-grid-item, .ck-sni-draggables .ck-sni-grid-item * {
				-moz-user-select:none;
				-webkit-user-select:none;
				-ms-user-select:none;
				user-select:none;
			}
			
			.ck-sni-draggables .active {
				background: #c8ebfb;
			}
			
			.ck-sni-draggables .ck-sni-clone-grid-item {
				display: flex;
				flex-wrap: wrap;
				margin: 0 -15px -15px 0;
				touch-action: none;
				user-select: none;
				border: 1px solid #d6d6d6;
				opacity: 0.8;
				list-style: none;
				-moz-user-select:none;
				-webkit-user-select:none;
				-ms-user-select:none;
				user-select:none;
			}
			`,"ck-sni-styles","unique");
		if(get("#ck-sni-identifier")){
			logger.warn(instance,"Someone called start twice. Aborting...");
			logger.warn(instance,"Trace:", (new Error).stack);
			return;
		}
		domHelper('span',{id:'ck-sni-identifier',append:document.body});
		logger.info("start inject");
		setLoading();
		await inject();
		await regChangeHandler();
		regIntervalStateChangeListener();
		logger.info("loaded");
	}

	/* Copied from https://juejin.cn/post/7022824391163510821 */
	class Draggable {
		constructor(options) {
			this.parent = options.element;
			this.cloneElementClassName = options.cloneElementClassName;
			this.isPointerdown = false;
			this.diff = { x: 0, y: 0 };
			this.drag = { element: null, index: 0, lastIndex: 0 };
			this.drop = { element: null, index: 0, lastIndex: 0 };
			this.clone = { element: null, x: 0, y: 0 };
			this.lastPointermove = { x: 0, y: 0 };
			this.rectList = [];
			this.startPos = [0,0];
			this.startTime = 0;
			this.init();
		}
		init() {
			this.getRect();
			this.bindEventListener();
		}
		getRect() {
			this.rectList.length = 0;
			for (const item of this.parent.children) {
				this.rectList.push(item.getBoundingClientRect());
			}
		}
		getDelta (pos1,pos2){
			const [x1,y1]=pos1;
			const [x2,y2]=pos2;
			return Math.sqrt(Math.pow(x1-x2,2)+Math.pow(y1-y2,2))
		}
		handlePointerdown(e) {
			if (e.pointerType === 'mouse' && e.button !== 0) {
				return;
			}
			if (e.target === this.parent) {
				return;
			}
			this.isPointerdown = true;
			this.parent.setPointerCapture(e.pointerId);
			this.lastPointermove.x = e.clientX;
			this.lastPointermove.y = e.clientY;
			this.startPos = [e.clientX, e.clientY];
			this.startTime = (new Date).getTime();
			this.drag.element = e.target;
			this.drag.element.classList.add('active');
			this.clone.element = this.drag.element.cloneNode(true);
			this.clone.element.className = this.cloneElementClassName;
			this.clone.element.style.transition = 'none';
			const i = [].indexOf.call(this.parent.children, this.drag.element);
			this.clone.x = this.rectList[i].left;
			this.clone.y = this.rectList[i].top;
			this.drag.index = i;
			this.drag.lastIndex = i;
			this.clone.element.style.transform = 'translate3d(' + this.clone.x + 'px, ' + this.clone.y + 'px, 0)';
			document.body.appendChild(this.clone.element);
		}
		handlePointermove(e) {
			if (this.isPointerdown) {
				this.diff.x = e.clientX - this.lastPointermove.x;
				this.diff.y = e.clientY - this.lastPointermove.y;
				this.lastPointermove.x = e.clientX;
				this.lastPointermove.y = e.clientY;
				this.clone.x += this.diff.x;
				this.clone.y += this.diff.y;
				this.clone.element.style.transform = 'translate3d(' + this.clone.x + 'px, ' + this.clone.y + 'px, 0)';
				for (let i = 0; i < this.rectList.length; i++) {
					if (e.clientX > this.rectList[i].left && e.clientX < this.rectList[i].right &&
						e.clientY > this.rectList[i].top && e.clientY < this.rectList[i].bottom) {
						this.drop.element = this.parent.children[i];
						this.drop.lastIndex = i;
						if (this.drag.element !== this.drop.element) {
							if (this.drag.index < i) {
								this.parent.insertBefore(this.drag.element, this.drop.element.nextElementSibling);
								this.drop.index = i - 1;
							} else {
								this.parent.insertBefore(this.drag.element, this.drop.element);
								this.drop.index = i + 1;
							}
							this.drag.index = i;
							const dragRect = this.rectList[this.drag.index];
							const lastDragRect = this.rectList[this.drag.lastIndex];
							const dropRect = this.rectList[this.drop.index];
							const lastDropRect = this.rectList[this.drop.lastIndex];
							this.drag.lastIndex = i;
							this.drag.element.style.transition = 'none';
							this.drop.element.style.transition = 'none';
							this.drag.element.style.transform = 'translate3d(' + (lastDragRect.left - dragRect.left) + 'px, ' + (lastDragRect.top - dragRect.top) + 'px, 0)';
							this.drop.element.style.transform = 'translate3d(' + (lastDropRect.left - dropRect.left) + 'px, ' + (lastDropRect.top - dropRect.top) + 'px, 0)';
							this.drag.element.offsetLeft;
							this.drag.element.style.transition = 'transform 150ms';
							this.drop.element.style.transition = 'transform 150ms';
							this.drag.element.style.transform = 'translate3d(0px, 0px, 0px)';
							this.drop.element.style.transform = 'translate3d(0px, 0px, 0px)';
						}
						break;
					}
				}
			}
		}
		handlePointerup(e) {
			if (this.isPointerdown) {
				this.isPointerdown = false;
				this.drag.element.classList.remove('active');
				this.clone.element.remove();
				let endPos = [e.clientX, e.clientY];
				let endTime = (new Date).getTime();
				logger.log('up',{
					start:this.startPos,
					end:endPos,
					delta:this.getDelta(this.startPos,endPos),
					timediff:endTime - this.startTime,
					isclick: this.getDelta(this.startPos,endPos) < 10
					&& endTime - this.startTime < 800
				})
				if(this.getDelta(this.startPos,endPos) < 10
				&& endTime - this.startTime < 800){
					this.drag.element.click();
				}
			}
		}
		handlePointercancel(e) {
			if (this.isPointerdown) {
				this.isPointerdown = false;
				this.drag.element.classList.remove('active');
				this.clone.element.remove();
			}
		}
		bindEventListener() {
			this.handlePointerdown = this.handlePointerdown.bind(this);
			this.handlePointermove = this.handlePointermove.bind(this);
			this.handlePointerup = this.handlePointerup.bind(this);
			this.handlePointercancel = this.handlePointercancel.bind(this);
			this.getRect = this.getRect.bind(this);
			this.parent.addEventListener('pointerdown', this.handlePointerdown);
			this.parent.addEventListener('pointermove', this.handlePointermove);
			this.parent.addEventListener('pointerup', this.handlePointerup);
			this.parent.addEventListener('pointercancel', this.handlePointercancel);
			window.addEventListener('scroll', this.getRect);
			window.addEventListener('resize', this.getRect);
			window.addEventListener('orientationchange', this.getRect);
		}
		unbindEventListener() {
			this.parent.removeEventListener('pointerdown', this.handlePointerdown);
			this.parent.removeEventListener('pointermove', this.handlePointermove);
			this.parent.removeEventListener('pointerup', this.handlePointerup);
			this.parent.removeEventListener('pointercancel', this.handlePointercancel);
			window.removeEventListener('scroll', this.getRect);
			window.removeEventListener('resize', this.getRect);
			window.removeEventListener('orientationchange', this.getRect);
		}
	}

	MenuManager.setMenu("opensettings","打开设置",openSettingsModal);
	unsafeWindow.SNI_REFRESH = ()=>inject();
	unsafeWindow.SNI_SETTINGS = openSettingsModal;
	startInject();
})().catch(e=>console.error("[SNI/ERR]",instance,e))
