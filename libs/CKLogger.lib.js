// ==UserScript==
// @name         CKLogger
// @namespace    ckylin-script-lib-logger
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
  unsafeWindow.Logger=Logger;
  unsafeWindow.logger=new Logger;
})();
