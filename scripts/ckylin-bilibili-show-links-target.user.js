// ==UserScript==
// @name         哔哩哔哩站内链接信息显示 BilibiliLinksInfos
// @namespace    ckylin-bilibili-show-links-target
// @version      1.3
// @description  替换bilibili页面的视频链接为视频名，专栏链接为专栏文章名,音频链接为音频名
// @author       CKylinMC
// @include      *.bilibili.com/*
// @grant        none
// @license      GPLv3 License
// ==/UserScript==

(function () {
    let opts = {
        debug: false
    };
    function CKBilibiliLinksUtil(dom) {
        const that = this;
        this.dom = dom;
        this.desIndex = 0;
        this.des = [];
        this.link = "";
        this.dataInfo = {};
        this.textprefix = "";
        this.ensureHTTPSAddr = function (url) {
            if (url.indexOf("//:") == 0) return url.replace("//:", "https://");
            return url.replace("http://", "https://");
        };
        this.regMenuEvent = function () {
            that.dom.oncontextmenu = function (e) {
                that.desIndex++;
                if (that.desIndex >= that.des.length) that.desIndex = 0;
                //that.dom.innerHTML = that.des[that.desIndex];
                that.setText(that.des[that.desIndex]);
                return false;
            }
        }
        this.generateDes = function () {
            if ("type" in this.dataInfo) {
                switch (this.dataInfo.type) {
                    case "video":
                        that.des.push(this.dataInfo.aid);
                        that.des.push(this.dataInfo.bvid);
                        that.des.push(that.link);
                        break;
                    case "article":
                        that.des.push(that.link);
                        break;
                    case "audio":
                        that.des.push(that.link);
                        break;
                }
            }
        };
        this.addText = function (txt) {
            that.setText(that.getText() + txt);
        }
        this.setText = function (txt) {
            that.dom.innerHTML = that.textprefix + txt;
        }
        this.getText = function () {
            return that.dom.innerHTML.replace(that.textprefix,"");
        }
        this.doGetInfos = function () {
            if (this.dom instanceof HTMLElement) {
                if (!('href' in this.dom)) return;
                if (this.dom.className != "dynamic-link-hover-bg" && this.dom.className != "") return;
                if (this.dom.className == "dynamic-link-hover-bg") {
                    this.textprefix = '<i class="bp-svg-icon link" style="position:relative;top:-1px;margin-left:2px;"></i>';
                }
                if ((this.dom.href.indexOf("https://www.bilibili.com/video/") == 0 || this.dom.href.indexOf("http://www.bilibili.com/video/") == 0 || this.dom.href.indexOf("//www.bilibili.com/video/") == 0) && !this.dom.hasAttribute("data-blblinfo")) {
                    this.dom.setAttribute("data-blblinfo", true);
                    this.addText(" (正在获取信息...)");
                    setTimeout(() => {
                        this.link = this.ensureHTTPSAddr(this.dom.href);
                        fetch("https://api.bilibili.com/x/web-interface/view" + this.getAPIParam())
                            .then(res => res.json())
                            .then(json => {
                                if (json.code == 0) {
                                    that.dataInfo = json.data;
                                    that.dataInfo.isOk = true;
                                    that.dataInfo.aid = "av" + that.dataInfo.aid;
                                    that.dataInfo.type = "video";
                                } else {
                                    that.dataInfo.isOk = false;
                                    that.dataInfo.fetchError = false;
                                    that.dataInfo.message = json.message;
                                }
                            }, failReason => {
                                that.dataInfo.isOk = false;
                                that.dataInfo.fetchError = true;
                                that.dataInfo.message = failReason;
                                that.setText(that.getText().replace(" (正在获取信息...)", " (信息获取失败)"));
                                that.des = [that.dom.innerHTML];
                            })
                            .then(() => {
                                if (that.dataInfo.isOk) {
                                    that.setText("[视频] " + that.dataInfo.title);
                                    that.des = [that.dom.innerHTML];
                                    that.generateDes();
                                    that.regMenuEvent();
                                } else if (!that.dataInfo.fetchError) {
                                    that.setText(that.getText().replace(" (正在获取信息...)", " (视频不存在或已删除)"));
                                    that.des = [that.dom.innerHTML];
                                    //that.dom.style.color = "rgb(86, 86, 86)";
                                    //that.generateDesFromUrl();
                                    that.dom.style.textDecoration = "line-through";
                                }
                            })
                    }, 100);
                } else if ((this.dom.href.indexOf("https://www.bilibili.com/read/cv") == 0 || this.dom.href.indexOf("http://www.bilibili.com/read/cv") == 0 || this.dom.href.indexOf("//www.bilibili.com/read/cv") == 0) && !this.dom.hasAttribute("data-blblinfo")) {
                    this.dom.setAttribute("data-blblinfo", true);
                    this.addText(" (正在获取信息...)");
                    setTimeout(() => {
                        this.link = this.ensureHTTPSAddr(this.dom.href);
                        fetch("https://api.bilibili.com/x/article/viewinfo" + this.getAPIParam())
                            .then(res => res.json())
                            .then(json => {
                                if (json.code == 0) {
                                    that.dataInfo = json.data;
                                    that.dataInfo.isOk = true;
                                    that.dataInfo.type = "article";
                                    that.dataInfo.cid = this.getCidFromLink();
                                } else {
                                    that.dataInfo.isOk = false;
                                    that.dataInfo.fetchError = false;
                                    that.dataInfo.message = json.message;
                                }
                            }, failReason => {
                                that.dataInfo.isOk = false;
                                that.dataInfo.fetchError = true;
                                that.dataInfo.message = failReason;
                                that.setText(that.getText().replace(" (正在获取信息...)", " (信息获取失败)"));
                                that.des = [that.dom.innerHTML];
                            })
                            .then(() => {
                                if (that.dataInfo.isOk) {
                                    that.setText("[专栏] " + that.dataInfo.title);
                                    that.des = [that.dom.innerHTML];
                                    that.generateDes();
                                    that.regMenuEvent();
                                } else if (!that.dataInfo.fetchError) {
                                    that.setText(that.getText().replace(" (正在获取信息...)", " (专栏不存在或已删除)"));
                                    that.des = [that.dom.innerHTML];
                                    //that.dom.style.color = "rgb(86, 86, 86)";
                                    //that.generateDesFromUrl();
                                    that.dom.style.textDecoration = "line-through";
                                }
                            })
                    }, 100);
                } else if ((this.dom.href.indexOf("https://www.bilibili.com/audio/au") == 0 || this.dom.href.indexOf("http://www.bilibili.com/audio/au") == 0 || this.dom.href.indexOf("//www.bilibili.com/audio/au") == 0) && !this.dom.hasAttribute("data-blblinfo")) {
                    this.dom.setAttribute("data-blblinfo", true);
                    this.addText(" (正在获取信息...)");
                    setTimeout(() => {
                        this.link = this.ensureHTTPSAddr(this.dom.href);
                        fetch("https://www.bilibili.com/audio/music-service-c/web/song/info" + this.getAPIParam())
                            .then(res => res.json())
                            .then(json => {
                                if (json.code == 0) {
                                    that.dataInfo = json.data;
                                    that.dataInfo.isOk = true;
                                    that.dataInfo.type = "audio";
                                    that.dataInfo.cid = this.getSidFromLink();
                                } else {
                                    that.dataInfo.isOk = false;
                                    that.dataInfo.fetchError = false;
                                    that.dataInfo.message = json.message;
                                }
                            }, failReason => {
                                that.dataInfo.isOk = false;
                                that.dataInfo.fetchError = true;
                                that.dataInfo.message = failReason;
                                that.setText(that.getText().replace(" (正在获取信息...)", " (信息获取失败)"));
                                that.des = [that.dom.innerHTML];
                            })
                            .then(() => {
                                if (that.dataInfo.isOk) {
                                    that.setText("[音频] " + that.dataInfo.title + "(" + that.dataInfo.author + ")");
                                    that.des = [that.dom.innerHTML];
                                    that.generateDes();
                                    that.regMenuEvent();
                                } else if (!that.dataInfo.fetchError) {
                                    that.setText(that.getText().replace(" (正在获取信息...)", " (音频不存在或已删除)"));
                                    that.des = [that.dom.innerHTML];
                                    //that.dom.style.color = "rgb(86, 86, 86)";
                                    //that.generateDesFromUrl();
                                    that.dom.style.textDecoration = "line-through";
                                }
                            })
                    }, 100);
                }
            }
        };
        this.getCidFromLink = function () {
            var id;
            var tmpindex = that.link.indexOf("/cv");
            id = that.link.substr(tmpindex + 1);
            if (id.indexOf("/")) {
                id = id.split("/")[0];
            }
            if (id.indexOf("?")) {
                id = id.split("?")[0];
            }
            if (id.indexOf("#")) {
                id = id.split("#")[0];
            }
            return id;
        }
        this.getSidFromLink = function () {
            var id;
            var tmpindex = that.link.indexOf("/audio/au");
            id = that.link.substr(tmpindex + 7);
            if (id.indexOf("/")) {
                id = id.split("/")[0];
            }
            if (id.indexOf("?")) {
                id = id.split("?")[0];
            }
            if (id.indexOf("#")) {
                id = id.split("#")[0];
            }
            return id;
        }
        this.getAPIParam = function () {
            var tmpindex, id, key = "aid";
            if ((tmpindex = that.link.indexOf("/av")) != -1) {
                id = that.link.substr(tmpindex + 1);
                if (id.indexOf("/") != -1) {
                    id = id.split("/")[0];
                }
                if (id.indexOf("?") != -1) {
                    id = id.split("?")[0];
                }
                if (id.indexOf("#") != -1) {
                    id = id.split("#")[0];
                }
                id = id.substr(2);
            } else if ((tmpindex = that.link.indexOf("/BV1")) != -1 || (tmpindex = that.link.indexOf("/bv1")) != -1) {
                key = "bvid";
                id = that.link.substr(tmpindex + 1);
                if (id.indexOf("/") != -1) {
                    id = id.split("/")[0];
                }
                if (id.indexOf("?") != -1) {
                    id = id.split("?")[0];
                }
                if (id.indexOf("#") != -1) {
                    id = id.split("#")[0];
                }
            } else if ((tmpindex = that.link.indexOf("/cv")) != -1) {
                key = "id";
                id = this.getCidFromLink();
                id = id.substr(2);
            } else if ((tmpindex = that.link.indexOf("/au")) != -1) {
                key = "sid";
                id = this.getSidFromLink();
                id = id.substr(2);
            }
            return "?" + key + "=" + id;
        };
    }
    function CK_getParentElements(el){
        if(!(el instanceof HTMLElement)) return [];
        let els = [];
        while(el.parentElement){
            el = el.parentElement;
            els.push(el);
        }
        return els;
    }
    function CK_parentsHasClass(el,className){
        let hasclass = false;
        CK_getParentElements(el).forEach(e=>{
            if(e.classList.contains(className)) hasclass = true;
        });
        return hasclass;
    }
    function CK_parentsHasClassSeries(el,className){
        let hasclass = false;
        CK_getParentElements(el).forEach(e=>{
            e.classList.forEach(i=>{
                if(i.startsWith(className)) hasclass = true;
            })
        });
        return hasclass;
    }
    function CK_parentsHasId(el,id){
        let hasid = false;
        CK_getParentElements(el).forEach(e=>{
            if(e.id===id) hasid = true;
        });
        return hasid;
    }
    function CK_verifyElements(el){
        if(!(el instanceof HTMLElement)) {
            CK_debug("it's not a element\n",el);
            return false;
        }
        if(el.tagName!="A") {
            CK_debug("it's not a link\n",el);
            return false;
        }
        if(el.hasAttribute("title")) {
            CK_debug("it contained a title\n",el);
            return false;
        }
        if(CK_parentsHasClassSeries(el,"video-card")) {
            CK_debug("it has a banned parent with class 'card'\n",el);
            return false;
        }
        /*if(CK_parentsHasId(el,"series")) {
            //CK_debug("it has a banned parent with ID 'series'\n",el);
            return false;
        }*/
        return true;
    }
    function CK_debug(){
        if(opts.debug) console.info("[CKBLI] ",...arguments);
    }
    function doUpdateAllLinksHook() {
        document.querySelectorAll("a").forEach((e, i) => {
            e.onmouseover = e => {
                if (CK_verifyElements(e.target)) {
                    (new CKBilibiliLinksUtil(e.target)).doGetInfos();
                }
            }
        });
    }
    document.addEventListener("DOMSubtreeModified", function (e) {
        doUpdateAllLinksHook();
    });

    /*window.blblinfo_globalSelect = false;
    document.addEventListener("mousemove", function (e) {
        if (!window.blblinfo_globalSelect) return;
        e.path.forEach(el => {
            if (el.tagName == "a") {
                (new CKBilibiliLinksUtil(el)).doGetInfos();
            }
        })
    })
    document.addEventListener("keydown", function (e) {
        if (e.key != "Control") return;
        if (window.blblinfo_globalSelect) return;
        console.log("window.blblinfo_globalSelect = true;");
        window.blblinfo_globalSelect = true;
    });
    document.addEventListener("keyup", function (e) {
        if (e.key != "Control") return;
        if (!window.blblinfo_globalSelect) return;
        console.log("window.blblinfo_globalSelect = false;");
        window.blblinfo_globalSelect = false;
    });*/
    doUpdateAllLinksHook();
})();