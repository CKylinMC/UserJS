// ==UserScript==
// @name         ExtMan
// @namespace    ckylin-script-lib-extension-manager
// @version      1.0
// @match        http://*
// @match        https://*
// @author       CKylinMC
// @license      GPLv3 License
// @grant        unsafeWindow
// ==/UserScript==
(function(){
	if(typeof(this.unsafeWindow)==='undefined'){
		unsafeWindow = window;
	}
	const thisInfo = {
		version: 1.0
	}
	class Logger{
		static getStack(){
			return new Error().stack.substr(7);
		}
		constructor(loggerName='LOG', parent=null){
			this.name = loggerName;
			this.parent = parent;
			this.visible = this.parent?null:true;
			this.serviceProvider = console;
		}
		isVisible(){
			if(this.visible===null){
				if(this.parent&&this.parent.isVisible){
					return this.parent.isVisible();
				} else return true;
			}
			return this.visible;
		}
		setVisible(yes=true){
			this.visible = yes;
		}
		getSubLogger(subName=null){
			return new Logger(subName, this);
		}
		getName(){
			return `${this.parent?this.parent.getName()+'/':''}${this.name}`;
		}
		getFormattedName(){
			return `[${this.getName()}]`
		}
		sendLogs(subMethod,...contents){
			if(this.isVisible()){
				if(this.serviceProvider.hasOwnProperty(subMethod)){
					this.serviceProvider[subMethod](...contents);
					return true;
				}
			}
			return false;
		}
		log(...args){
			return this.sendLogs('log',this.getFormattedName(),...args);
		}
		info(...args){
			return this.sendLogs('info',this.getFormattedName(),...args);
		}
		warn(...args){
			const stacks = '\nTrace:\n'+Logger.getStack().split('\n').splice(2).join('\n');
			return this.sendLogs('warn',this.getFormattedName(),...args,stacks);
		}
		error(...args){
			const stacks = '\nTrace:\n'+Logger.getStack().split('\n').splice(2).join('\n');
			return this.sendLogs('error',this.getFormattedName(),...args,stacks);
		}
		debug(...args){
			const stacks = '\nTrace:\n'+Logger.getStack().split('\n').splice(2).join('\n');
			return this.sendLogs('debug',this.getFormattedName(),...args,stacks);
		}
		send(methodName,...args){
			return this.sendLogs(methodName,this.getFormattedName(),...args);
		}
	}
	class ExtensionManager{
		static getLoggerClass(){
			return Logger;
		}
		static initExtObj(){
			if(!unsafeWindow.hasOwnProperty('ExtMan') || unsafeWindow.ExtMan.info.version<thisInfo.version){
				Object.assign(unsafeWindow,{
					ExtMan:{
						$ExtMan: ExtensionManager,
						info:thisInfo,
					}
				});
			}else if(unsafeWindow.ExtMan.info.version>thisInfo.version){
				new Logger('ExtMan').warn('A newer version of ExtMan is already loaded into this page. Skipping current initalization...');
			}
			if(!unsafeWindow.ExtMan.exts) unsafeWindow.ExtMan.exts = {};
		}
		static getExtObj(){
			ExtensionManager.initExtObj();
			return unsafeWindow.ExtMan.exts;
		}
		getInfo(){
			return thisInfo;
		}
		constructor(options){
			const opt = Object.assign({
				name:null,
				logger:null,
				requiredProperties:{
					name:"string",
					version:"string",
					//hook: ()=>true,
				},
			},options);
			if(!opt.name) throw new Error("Need name in options.");
			if(!opt.logger){
				opt.logger = new Logger('ExtMan').getSubLogger(opt.name);
			}
			this.opt = opt;
			this.init();
		}
		init(){
			const exts = ExtensionManager.getExtObj();
			if(!exts.hasOwnProperty(this.opt.name)) {
				exts[this.opt.name] = [];
			}
			this.modules = exts[this.opt.name];
		}
		registerModule(module){
			this.modules.push(module);
		}
		validModule(module){
			const requiredProperties = this.opt.requiredProperties;
			if(!requiredProperties) return true;
			const properties = Object.keys(requiredProperties);
			for(const property of properties){
				if(!module.hasOwnProperty(property)) return false;
				try{
					const type = requiredProperties[property];
					const prop = module[property];
					if(typeof type ==='function'){
						if(!type(prop,module,property)) return (this.opt.logger.warn('Module dropped due to validation failed.',module),false);
					}else if(typeof(prop)!=type) return (this.opt.logger.warn('Module dropped due to property validation failed.',module),false);
				}catch(e){
					this.opt.logger.error('Validation failed',e);
					return (this.opt.logger.warn('Module dropped due to validation errored.',module),false);
				}
			}
			this.opt.logger.info('Module loaded.',module);
			return true;
		}
		getAllModulesWhatever(){
			return this.modules;
		}
		getAllModules(){
			const mods = this.getAllModulesWhatever();
			if(!Array.isArray(mods)) return (this.opt.logger.warn('Empty modules list.'),[]);
			const validModules = [];
			for(const mod of mods){
				if(this.validModule(mod)) validModules.push(mod);
				else this.opt.logger.warn('Dropped one module');
			}
			return validModules;
		}
	}
	ExtensionManager.initExtObj();
	unsafeWindow.getExtMan = ()=>{return unsafeWindow.ExtMan.$ExtMan};
})()
