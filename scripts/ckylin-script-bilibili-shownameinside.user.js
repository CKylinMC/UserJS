// ==UserScript==
// @name         [Bilibili] 视频内显工具
// @namespace    ckylin-script-bilibili-shownameinside
// @version      1.0
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
	const defaultList = ["分P编号","斜杠","分P数量","间隔符","分P标题"];
	const logger = new Logger("[SNI "+instance+"]");
	if(CKTools.ver<1.2){
		logger.warn("Library script 'CKTools' was loaded incompatible version "+CKTools.ver+", so that SNI may couldn't work correctly. Please consider update your scripts.");
	}
	const {get,getAll,domHelper,wait,waitForDom,waitForPageVisible,addStyle,modal,bili} = CKTools;
	function getContainer(clear=false){
		let dom = get("#ck-sni-container");
		if(!dom) dom = domHelper("div",{
			id: "ck-sni-container",
			append: get("div.bilibili-player-area")
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
		"测试文字": (d)=>'TestSuccess',
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
			return ()=>null;
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
					logger.log(name,"nomod","skipped");
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
			append: container
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
			classnames: ['ck-sni-mod'],
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
						color:"#2196f3",
					},
					text: '显示内容设置'
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
						const list = getValueOrDefault("moduleseq",defaultList);
						for(const name of list){
							div.appendChild(makeBadge(name,"点击移除",e=>e.target.remove()));
						}
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
						padding: "6px"
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
		logger.info("Start Trace:", (new Error).stack);
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
				position: absolute;
				top: 0;
				left: 0;
				background: -moz-linear-gradient(bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%);
				background: -webkit-linear-gradient(bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%);
				background: linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%);
				width: 100%;
				display: block;
				height: 60px;
				padding: 8px 15px;
				transition: opacity .3s;
				opacity: 0;
				z-index: 9999999;
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
	MenuManager.setMenu("opensettings","打开设置",openSettingsModal);
	unsafeWindow.SNI_REFRESH = ()=>inject();
	unsafeWindow.SNI_SETTINGS = openSettingsModal;
	startInject();
})().catch(e=>console.error("[SNI/ERR]",instance,e))
