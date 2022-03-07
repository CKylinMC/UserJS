// ==UserScript==
// @name         SimpleFilter
// @namespace    ckylin-script-lib-filter-processor
// @version      1.0
// @match        http://*
// @match        https://*
// @author       CKylinMC
// @license      GPLv3 License
// ==/UserScript==

class SimpleFilter{
	static debug = true;
	static log = (...args)=>SimpleFilter.debug&&SimpleFilter.logger(...args);
	constructor(filterObj){
		if(!SimpleFilter.verify(filterObj)) {
			throw new Error("filter is invalid, turn on debug mode to see the details.");
		}
		this.filterObj = filterObj;
		this.datas = null;
	}
	static logger(...args){
		console.log("[Filter]",...args);
	}
	static async $and(...conditions){
		for(const condition of conditions){
			if(condition instanceof Promise){
				if(!(await condition)) return false;
			}
			if(!condition) return false;
		}
		return true;
	}
	static async $or(...conditions){
		for(const condition of conditions){
			if(condition instanceof Promise){
				if(await condition) return false;
			}
			if(condition) return true;
		}
		return false;
	}
	static verify(obj, depth=0, isroot=true){
		SimpleFilter.log('-'.repeat(depth+1)+'>','start validate',obj);
		if(Array.isArray(obj)){
			SimpleFilter.log('-'.repeat(depth+1)+'>','type: arr',obj);
			for(const item of obj){
				if(!SimpleFilter.verify(item, depth+1, false)) return (SimpleFilter.log('-'.repeat(depth+1)+'>','[ERR]','array validator not passed for',item),false);
			}
		}else if(typeof(obj)=='function') return (SimpleFilter.log('-'.repeat(depth+1)+'>','[OK]','passed due to function type',obj),true);
		else{
			SimpleFilter.log('-'.repeat(depth+1)+'>','type: logic selector',obj);
			const keys = Object.keys(obj);
			if(isroot&&keys.length!==1) return (SimpleFilter.log('-'.repeat(depth+1)+'>','[ERR]','subkey length validator not passed for', keys), false);
			for(const k of keys){
				if(["$and","$or"].includes(k.toLowerCase())){
					if(!SimpleFilter.verify(obj[k], depth+1, false)) return (SimpleFilter.log('-'.repeat(depth+1)+'>','[ERR]','value validator not passed for', k), false);
				}else return (SimpleFilter.log('-'.repeat(depth+1)+'>','[ERR]','key validator not passed for', k),false);
			}
		}
		SimpleFilter.log('-'.repeat(depth+1)+'>','[OK]','passed',obj);
		return true;
	}
	async applyFilterToAll(datas=[]){
		try{
			let pool = datas.map(data=>this.applyFilterTo(data));
			rerturn Promise.all(pool);
		}catch(e){
			return null;
		}
	}
	async applyFilterTo(data=null){
		if(!SimpleFilter.verify(this.filterObj)) return false;
		this.data = data;
		try{
			return await this.applyFilter(this.filterObj);
		}
		catch(e){
			SimpleFilter.log('[ERR]',e);
			return false;
		}
		finally{
			this.data = null;
		}
	}
	async applyFilter(obj, mode = '$and'){
		if(Array.isArray(obj)){
			for(const item of obj){
				return this.applyFilter(item);
			}
		}else if(typeof(obj)=='function'){
			if(obj.constructor.name=='AsyncFunction'){
				try{
					return !!(await obj(this.data));
				}catch(e){
					SimpleFilter.log('[ERR]',e);
					return false;
				}
			}else{
				try{
					return !!obj(this.data);
				}catch(e){
					SimpleFilter.log('[ERR]',e);
					return false;
				}
			}
		}else{
			const keys = Object.keys(obj);
			try{
				return await SimpleFilter[mode](...keys.map(async k=>{
					return await this.applyFilter(obj[k],k);
				}));
			}catch(e){
				SimpleFilter.log('[ERR]',e);
				return false;
			}
		}
	}
}
