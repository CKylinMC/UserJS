// ==UserScript==
// @name         CKLogger
// @namespace    ckylin-script-lib-logger
// @version      1.0
// @match        http://*
// @match        https://*
// @author       CKylinMC
// @license      GPLv3 License
// @grant        none
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
            this.subscribers = [];
		}
        trigger(opt){
            this.subscribers.filter(subscriber=>{
                if(!this.isVisible() || !opt.visible){
                    if(subscriber.onlyVisible)return false;
                }
                if(opt.fromSub){
                    if(!subscriber.includeSubLoggers)return false;
                }
                return subscriber.levels.includes(opt.level);
            }).forEach(subscriber=>{
                try{
                    subscriber.onlog(opt.level,opt.name,...opt.args);
                }catch(e){}
            });
            if(this.parent){
                opt.fromSub = true;
                this.parent.trigger(opt);
            }
        }
        subscribe(options){
            const opt = Object.assign({
                onlyVisible: false,
                includeSubLoggers: true,
                levels: ['log','info','error','warn','debug'],
                onlog: (level,namespace,...args)=>{}
            },options);
            this.subscribers.push(opt);
            return opt;
        }
        unsubscribe(obj){
            if(this.subscribers.includes(obj)){
                return this.subscribers.splice(this.subscribers.indexOf(obj),1);
            } return null;
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
            this.trigger({
                level: 'raw',
                fromSub: false,
                visible: this.isVisible(),
                name: this.getName(),
                args: contents
            });
			if(this.isVisible()){
				if(this.serviceProvider.hasOwnProperty(subMethod)){
					this.serviceProvider[subMethod](...contents);
					return true;
				}
			}
			return false;
		}
		log(...args){
            this.trigger({
                level: 'log',
                fromSub: false,
                visible: this.isVisible(),
                name: this.getName(),
                args: args
            });
			return this.sendLogs('log',this.getFormattedName(),...args);
		}
		info(...args){
            this.trigger({
                level: 'info',
                fromSub: false,
                visible: this.isVisible(),
                name: this.getName(),
                args: args
            });
			return this.sendLogs('info',this.getFormattedName(),...args);
		}
		warn(...args){
            this.trigger({
                level: 'warn',
                fromSub: false,
                visible: this.isVisible(),
                name: this.getName(),
                args: args
            });
			const stacks = '\nTrace:\n'+Logger.getStack().split('\n').splice(2).join('\n');
			return this.sendLogs('warn',this.getFormattedName(),...args,stacks);
		}
		error(...args){
            this.trigger({
                level: 'error',
                fromSub: false,
                visible: this.isVisible(),
                name: this.getName(),
                args: args
            });
			const stacks = '\nTrace:\n'+Logger.getStack().split('\n').splice(2).join('\n');
			return this.sendLogs('error',this.getFormattedName(),...args,stacks);
		}
		debug(...args){
            this.trigger({
                level: 'debug',
                fromSub: false,
                visible: this.isVisible(),
                name: this.getName(),
                args: args
            });
			const stacks = '\nTrace:\n'+Logger.getStack().split('\n').splice(2).join('\n');
			return this.sendLogs('debug',this.getFormattedName(),...args,stacks);
		}
		send(methodName,...args){
            this.trigger({
                level: methodName,
                fromSub: false,
                visible: this.isVisible(),
                name: this.getName(),
                args: args
            });
			return this.sendLogs(methodName,this.getFormattedName(),...args);
		}
	}
  unsafeWindow.Logger=Logger;
  unsafeWindow.logger=new Logger;
})();
