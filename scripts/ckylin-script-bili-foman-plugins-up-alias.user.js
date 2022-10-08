// ==UserScript==
// @name         [Bilibili] UP主备注别名
// @namespace    ckylin-script-bili-foman-plugins-up-alias
// @version      0.2
// @description  为UP主进行别名备注！
// @author       CKylinMC
// @match        https://www.bilibili.com/video/*
// @match        https://space.bilibili.com/*
// @require      https://greasyfork.org/scripts/441653-ckuitoolkit/code/CKUIToolkit.js?version=1034229
// @grant        GM_deleteValue
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @license      GPLv3
// ==/UserScript==

(function () {

    class UpAlias{
		static _k(uid){
			return "U_"+uid;
		}
		static hasAlias(uid){
			return GM_listValues().includes(this._k(uid));
		}
		static getAlias(uid, fallback=null){
			if(this.hasAlias(uid)) return GM_getValue(this._k(uid));
			return fallback;
		}
		static setAlias(uid,alias){
			GM_setValue(this._k(uid),alias);
		}
		static removeAlias(uid){
			GM_deleteValue(this._k(uid));
		}
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

    class UI{
		static async prompt(title="Input",content="",placeholder="...",okbtn="OK"){
			if(typeof(FloatWindow)=='function'){
				return FloatWindow.prompt(title,content,placeholder,okbtn);
			}else{
				return new Promise(r=>{
					r(prompt(`${title}${content.length?`\n\n${content}`:''}`,placeholder));
				})
			}
		}
		static async alert(title="Alert",content="",okbtn="OK"){
			if(typeof(FloatWindow)=='function'){
				return FloatWindow.alert(title,content,okbtn);
			}else{
				return new Promise(()=>{
					alert(`${title}${content.length?`\n\n${content}`:''}`)
				})
			}
		}
		static async confirm(title="Confirm",content="",btnoktxt='yes',btnnotxt='no'){
			if(typeof(FloatWindow)=='function'){
				return FloatWindow.confirm(title,content,btnoktxt,btnnotxt);
			}else{
				return new Promise(r=>{
					r(confirm(`${title}${content.length?`\n\n${content}`:''}`));
				})
			}
		}
    }

    class Actions{
		static getInfo(){
			if(location.host=='space.bilibili.com'){
				const uid = +/\d+/.exec(location.pathname.split('/')[1])[0];
				if(uid&&!isNaN(uid)){
					const name = document.querySelector("#h-name")?.trim()??uid+"";
					return {uid,name};
				}else return null;
			}
			if(location.host=='www.bilibili.com'){
				if(location.pathname.startsWith('/video/')){
					const uid = +/space\.bilibili\.com\/(?<id>\d+)(\/)*/.exec(document.querySelector("#v_upinfo .name a")?.href)?.groups?.id;
					if(uid&&!isNaN(uid)) {
						const name = document.querySelector("#v_upinfo .name a.username")?.innerText?.trim()??uid+"";
					return {uid,name};
					}else return null;
				}
			}
		}
		static setCurrent(){
			const info = this.getInfo();
			if(info)
				return this.setFor(info.uid,info.name);
			else return Promise.reject();
		}
		static removeCurrent(){
			const info = this.getInfo();
			if(info)
				return this.removeFor(info.uid,info.name);
			else return Promise.reject();
		}
		static async setFor(uid,displayName=null){
			uid = +uid;
			let alreadyTxt = "为其创建别名";
			if(UpAlias.hasAlias(uid)) alreadyTxt = `为其修改别名；原别名：${UpAlias.getAlias(uid,'不存在')}`;
			let alias = await UI.prompt(`为 ${displayName?displayName:uid} 设置别名`,alreadyTxt,"确定");
			if(alias&&alias.trim().length){
				UpAlias.setAlias(uid,alias.trim());
				UI.alert("设置成功！");
			}
		}
		static async removeFor(uid,displayName=null){
			uid = +uid;
			let alreadyTxt = "清空此用户的别名";
			if(UpAlias.hasAlias(uid)) alreadyTxt = `清空此用户的别名：${UpAlias.getAlias(uid,'不存在')}`;
			let result = await UI.confirm(`为 ${displayName?displayName:uid} 清空别名`,alreadyTxt,"确定清空","取消");
			if(result){
				UpAlias.removeAlias(uid);
				UI.alert("清空成功！");
			}
		}
    }

    function addMenus(){
		const info = Actions.getInfo();
		if(!info) return;
		if(location.host=='space.bilibili.com'){
			MenuManager.registerMenu(`为${info.name}设置别名`,()=>{
				Actions.setCurrent();
			})
			MenuManager.registerMenu(`为${info.name}删除别名`,()=>{
				Actions.removeCurrent();
			})
		}
		if(location.host=='www.bilibili.com'){
			if(location.pathname.startsWith('/video/')){
				MenuManager.registerMenu(`为当前UP主设置别名`,()=>{
					Actions.setCurrent();
				})
				MenuManager.registerMenu(`为当前UP主删除别名`,()=>{
					Actions.removeCurrent();
				})
			}
		}
    }
    if(!unsafeWindow.FoManPlugins){
        unsafeWindow.FoManPlugins = {}
    }
    unsafeWindow.FoManPlugins.UpAlias = {provider:UpAlias,actions:Actions};
    addMenus();
})();
