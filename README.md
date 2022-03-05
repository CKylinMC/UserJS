# CKylinMC 脚本仓库

这是我的用户脚本和用户样式仓库，所有脚本和样式可以在Greasyfork中找到。

由于这些脚本暂时没有成完整项目一样的编写，所以可能会有很多问题，部分脚本会在日后开独立的repo并加入框架/打包工具等进行更新，这里只更新这些纯手敲的脚本。

[![查看我的脚本](https://shields.io/badge/%E7%82%B9%E5%87%BB%E6%9F%A5%E7%9C%8B-%E6%88%91%E7%9A%84Bilibili%E8%84%9A%E6%9C%AC%E5%90%88%E9%9B%86-%23670000?logo=tampermonkey&style=for-the-badge)](https://greasyfork.org/zh-CN/scripts?language=all&set=403506)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [内容列表](#%E5%86%85%E5%AE%B9%E5%88%97%E8%A1%A8)
  - [用户脚本](#%E7%94%A8%E6%88%B7%E8%84%9A%E6%9C%AC)
    - [* 视频页面常驻显示AV/BV号 *](#-%E8%A7%86%E9%A2%91%E9%A1%B5%E9%9D%A2%E5%B8%B8%E9%A9%BB%E6%98%BE%E7%A4%BAavbv%E5%8F%B7-)
    - [* 关注管理器 *](#-%E5%85%B3%E6%B3%A8%E7%AE%A1%E7%90%86%E5%99%A8-)
    - [* 视频内显工具 *](#-%E8%A7%86%E9%A2%91%E5%86%85%E6%98%BE%E5%B7%A5%E5%85%B7-)
    - [* AB循环 *](#-ab%E5%BE%AA%E7%8E%AF-)
    - [* 视频旋转和缩放 *](#-%E8%A7%86%E9%A2%91%E6%97%8B%E8%BD%AC%E5%92%8C%E7%BC%A9%E6%94%BE-)
    - [* 不要Sentry服务](#-%E4%B8%8D%E8%A6%81sentry%E6%9C%8D%E5%8A%A1)
    - [* 站内私信一键已读](#-%E7%AB%99%E5%86%85%E7%A7%81%E4%BF%A1%E4%B8%80%E9%94%AE%E5%B7%B2%E8%AF%BB)
    - [* 站内链接信息显示 BilibiliLinksInfos *](#-%E7%AB%99%E5%86%85%E9%93%BE%E6%8E%A5%E4%BF%A1%E6%81%AF%E6%98%BE%E7%A4%BA-bilibililinksinfos-)
    - [* 修改迷你播放器大小位置 *](#-%E4%BF%AE%E6%94%B9%E8%BF%B7%E4%BD%A0%E6%92%AD%E6%94%BE%E5%99%A8%E5%A4%A7%E5%B0%8F%E4%BD%8D%E7%BD%AE-)
    - [* 动态页面默认选择投稿视频 *](#-%E5%8A%A8%E6%80%81%E9%A1%B5%E9%9D%A2%E9%BB%98%E8%AE%A4%E9%80%89%E6%8B%A9%E6%8A%95%E7%A8%BF%E8%A7%86%E9%A2%91-)
    - [* 创作中心顺滑回顶 *](#-%E5%88%9B%E4%BD%9C%E4%B8%AD%E5%BF%83%E9%A1%BA%E6%BB%91%E5%9B%9E%E9%A1%B6-)
    - [* 评论过滤 *](#-%E8%AF%84%E8%AE%BA%E8%BF%87%E6%BB%A4-)
    - [* 平滑展开视频信息](#-%E5%B9%B3%E6%BB%91%E5%B1%95%E5%BC%80%E8%A7%86%E9%A2%91%E4%BF%A1%E6%81%AF)
    - [* 宽屏模式不重定位](#-%E5%AE%BD%E5%B1%8F%E6%A8%A1%E5%BC%8F%E4%B8%8D%E9%87%8D%E5%AE%9A%E4%BD%8D)
    - [* 评论区屏蔽工具](#-%E8%AF%84%E8%AE%BA%E5%8C%BA%E5%B1%8F%E8%94%BD%E5%B7%A5%E5%85%B7)
  - [用户样式](#%E7%94%A8%E6%88%B7%E6%A0%B7%E5%BC%8F)
    - [* 移除评论区](#-%E7%A7%BB%E9%99%A4%E8%AF%84%E8%AE%BA%E5%8C%BA)
    - [* 播放器特效](#-%E6%92%AD%E6%94%BE%E5%99%A8%E7%89%B9%E6%95%88)
    - [* 移除评论区](#-%E7%A7%BB%E9%99%A4%E8%AF%84%E8%AE%BA%E5%8C%BA-1)
    - [* 移除评分](#-%E7%A7%BB%E9%99%A4%E8%AF%84%E5%88%86)
    - [* 移除高能弹幕图标 *](#-%E7%A7%BB%E9%99%A4%E9%AB%98%E8%83%BD%E5%BC%B9%E5%B9%95%E5%9B%BE%E6%A0%87-)
    - [* 高亮视频分区标签](#-%E9%AB%98%E4%BA%AE%E8%A7%86%E9%A2%91%E5%88%86%E5%8C%BA%E6%A0%87%E7%AD%BE)
- [开源协议](#%E5%BC%80%E6%BA%90%E5%8D%8F%E8%AE%AE)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## 内容列表

### 用户脚本


#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 视频页面常驻显示AV/BV号 ![Recommended](https://shields.io/badge/👍-Recommended-purple?labelColor=red&style=flat)
**简单介绍**:
始终在哔哩哔哩视频页面标题下方显示当前视频号，默认显示AV号，右键切换为BV号，单击弹窗可复制链接

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/398655)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/398655-%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E8%A7%86%E9%A2%91%E9%A1%B5%E9%9D%A2%E5%B8%B8%E9%A9%BB%E6%98%BE%E7%A4%BAav-bv%E5%8F%B7-%E5%B7%B2%E5%AE%8C%E5%85%A8%E9%87%8D%E6%9E%84-%E6%94%AF%E6%8C%81%E6%98%BE%E7%A4%BA%E5%88%86p%E6%A0%87%E9%A2%98/code/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E8%A7%86%E9%A2%91%E9%A1%B5%E9%9D%A2%E5%B8%B8%E9%A9%BB%E6%98%BE%E7%A4%BAAVBV%E5%8F%B7%5B%E5%B7%B2%E5%AE%8C%E5%85%A8%E9%87%8D%E6%9E%84%EF%BC%8C%E6%94%AF%E6%8C%81%E6%98%BE%E7%A4%BA%E5%88%86P%E6%A0%87%E9%A2%98%5D.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-bilibili-display-video-id.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-bilibili-display-video-id.user.js)

**仓库文件:**

[ckylin-bilibili-display-video-id.user.js](scripts/ckylin-bilibili-display-video-id.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 关注管理器 ![Recommended](https://shields.io/badge/👍-Recommended-purple?labelColor=red&style=flat)
**简单介绍**:
快速整理你的关注列表，一键取关。

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/428895)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/428895-bilibili-%E5%85%B3%E6%B3%A8%E6%B8%85%E7%90%86%E5%99%A8/code/%5BBilibili%5D%20%E5%85%B3%E6%B3%A8%E6%B8%85%E7%90%86%E5%99%A8.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-bilibili-unfollow.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-bilibili-unfollow.user.js)

**仓库文件:**

[ckylin-bilibili-unfollow.user.js](scripts/ckylin-bilibili-unfollow.user.js)

------


#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 视频内显工具 ![Recommended](https://shields.io/badge/👍-Recommended-purple?labelColor=red&style=flat)
**简单介绍**:
在视频窗口内顶部区域展示数据，默认展示当前分P信息，可添加额外信息，用于在全屏连播时查看。

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/440820)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/440820-bilibili-%E8%A7%86%E9%A2%91%E5%86%85%E6%98%BE%E5%B7%A5%E5%85%B7/code/%5BBilibili%5D%20%E8%A7%86%E9%A2%91%E5%86%85%E6%98%BE%E5%B7%A5%E5%85%B7.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-script-bilibili-shownameinside.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-script-bilibili-shownameinside.user.js)

**仓库文件:**

[ckylin-script-bilibili-shownameinside.user.js](scripts/ckylin-script-bilibili-shownameinside.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) AB循环 ![Recommended](https://shields.io/badge/👍-Recommended-purple?labelColor=red&style=flat)
**简单介绍**:
AB循环，在某两个进度之间循环！进阶版洗脑循环！

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/422365)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/422365-%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9ab%E5%BE%AA%E7%8E%AF/code/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9AB%E5%BE%AA%E7%8E%AF.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-script-bilibili-abloop.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-script-bilibili-abloop.user.js)

**仓库文件:**

[ckylin-script-bilibili-abloop.user.js](scripts/ckylin-script-bilibili-abloop.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 视频旋转和缩放 ![Recommended](https://shields.io/badge/👍-Recommended-purple?labelColor=red&style=flat)
**简单介绍**:
旋转和缩放视频，防止某些视频伤害到你的脖子或眼睛！

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/422056)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/422056-bilibili-%E8%A7%86%E9%A2%91%E6%97%8B%E8%BD%AC/code/%5BBilibili%5D%20%E8%A7%86%E9%A2%91%E6%97%8B%E8%BD%AC.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-script-bilibili-rotate.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-script-bilibili-rotate.user.js)

**仓库文件:**

[ckylin-script-bilibili-rotate.user.js](scripts/ckylin-script-bilibili-rotate.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 不要Sentry服务
**简单介绍**:
禁止Bilibili视频播放页面自动加载Sentry脚本。Sentry是一个问题跟踪反馈服务，但是会替换页面所有的事件和钩子并监听所有操作，可能造成页面卡顿以及部分脚本异常。

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/436744)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/436744-bilibili-%E4%B8%8D%E8%A6%81sentry/code/%5BBilibili%5D%20%E4%B8%8D%E8%A6%81Sentry!.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-bilibili-no-sentry.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-bilibili-no-sentry.user.js)

**仓库文件:**

[ckylin-bilibili-no-sentry.user.js](scripts/ckylin-bilibili-no-sentry.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 站内私信一键已读
**简单介绍**:
快速设置站内私信为已读状态

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/429152)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/429152-bilibili-markasread/code/%5BBilibili%5D%20MarkAsRead.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-script-bilibili-mark-as-read.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-script-bilibili-mark-as-read.user.js)

**仓库文件:**

[ckylin-script-bilibili-mark-as-read.user.js](scripts/ckylin-script-bilibili-mark-as-read.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 站内链接信息显示 BilibiliLinksInfos ![Abandoned](https://img.shields.io/badge/-Abandoned-inactive)
**简单介绍**:
替换bilibili页面的视频链接为视频名，专栏链接为专栏文章名,音频链接为音频名

【再也不怕被别人一个BV号骗进奇怪的视频啦~~~】

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/398500)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/398500-%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E7%AB%99%E5%86%85%E9%93%BE%E6%8E%A5%E4%BF%A1%E6%81%AF%E6%98%BE%E7%A4%BA-bilibililinksinfos/code/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E7%AB%99%E5%86%85%E9%93%BE%E6%8E%A5%E4%BF%A1%E6%81%AF%E6%98%BE%E7%A4%BA%20BilibiliLinksInfos.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-bilibili-show-links-target.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-bilibili-show-links-target.user.js)

**仓库文件:**

[ckylin-bilibili-show-links-target.user.js](scripts/ckylin-bilibili-show-links-target.user.js)


------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 修改迷你播放器大小位置 ![Abandoned](https://img.shields.io/badge/-Abandoned-inactive)
**简单介绍**:
快速修改bilibili网页版迷你播放器窗口大小。

在播放页面中点击油猴脚本管理图标，然后可以看到多项预设。修改后自动记忆，下次打开页面自动设置。

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/404623)

**安装链接**:

* [Greasyfork](https://greasyfork.org/zh-CN/scripts/404623)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-bilibili-resize-miniplayer.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-bilibili-resize-miniplayer.user.js)

**仓库文件:**

[ckylin-bilibili-resize-miniplayer.user.js](scripts/ckylin-bilibili-resize-miniplayer.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 动态页面默认选择投稿视频 ![Inactive](https://img.shields.io/badge/-Inactive-inactive)
**简单介绍**:
让哔哩哔哩动态页面默认显示投稿视频.

支持两种方式：自动点击投稿视频按钮，或自动跳转到投稿视频页面。

注意此脚本仅在直接进入动态页面时有效，如果已经点击过任意按钮(地址栏包含参数tab)则不会生效。

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/433045)

**安装链接**:

* [Greasyfork](https://greasyfork.org/zh-CN/scripts/433045)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-script-bilibili-dynamix-default-tab.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-script-bilibili-dynamix-default-tab.user.js)

**仓库文件:**

[ckylin-script-bilibili-dynamix-default-tab.user.js](scripts/ckylin-script-bilibili-dynamix-default-tab.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 创作中心顺滑回顶 ![Inactive](https://img.shields.io/badge/-Inactive-inactive)
**简单介绍**:
让哔哩哔哩的创作中心翻页回顶部时更顺滑一些。

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/430337)

**安装链接**:

* [Greasyfork](https://greasyfork.org/zh-CN/scripts/430337)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-script-bilibili-upload-smooth-totop.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-script-bilibili-upload-smooth-totop.user.js)

**仓库文件:**

[ckylin-script-bilibili-upload-smooth-totop.user.js](scripts/ckylin-script-bilibili-upload-smooth-totop.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 评论过滤 ![Abandoned](https://img.shields.io/badge/-Abandoned-inactive)
**简单介绍**:
在哔哩哔哩全站范围内屏蔽指定的用户（UID）或包含指定关键字的评论。

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/408186)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/408186-%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9-%E8%AF%84%E8%AE%BA%E8%BF%87%E6%BB%A4/code/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9-%E8%AF%84%E8%AE%BA%E8%BF%87%E6%BB%A4.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-bilibili-comments-filter.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-bilibili-comments-filter.user.js)

**仓库文件:**

[
ckylin-bilibili-comments-filter.user.js](scripts/ckylin-bilibili-comments-filter.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 平滑展开视频信息   
**简单介绍**:
网页版哔哩哔哩视频下方的视频信息默认折叠，并有个“展开更多”按钮

此脚本可以让“展开更多”按钮展开时平滑展开，仅此而已。

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/408550)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/408550-%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9-%E5%B9%B3%E6%BB%91%E5%B1%95%E5%BC%80%E8%A7%86%E9%A2%91%E4%BF%A1%E6%81%AF/code/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9-%E5%B9%B3%E6%BB%91%E5%B1%95%E5%BC%80%E8%A7%86%E9%A2%91%E4%BF%A1%E6%81%AF.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-bilibili-animated-showfullinfo.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-bilibili-animated-showfullinfo.user.js)

**仓库文件:**

[ckylin-bilibili-animated-showfullinfo.user.js](scripts/ckylin-bilibili-animated-showfullinfo.user.js)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 宽屏模式不重定位
**简单介绍**:


**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/421421)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/421421-%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E5%AE%BD%E5%B1%8F%E6%A8%A1%E5%BC%8F%E4%B8%8D%E9%87%8D%E5%AE%9A%E4%BD%8D/code/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E5%AE%BD%E5%B1%8F%E6%A8%A1%E5%BC%8F%E4%B8%8D%E9%87%8D%E5%AE%9A%E4%BD%8D.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-script-bilibili-wide-screen-no-scroll.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-script-bilibili-wide-screen-no-scroll.user.js)

**仓库文件:**

[ckylin-script-bilibili-wide-screen-no-scroll.user.js](scripts/ckylin-script-bilibili-wide-screen-no-scroll.user.js)

------

#### ![Youtube](https://shields.io/badge/Youtube-red?logo=youtube&style=flat) 评论区屏蔽工具
**简单介绍**:
屏蔽指定Uploader视频下的评论区。

**脚本主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/422099)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/422099-youtube-%E8%AF%84%E8%AE%BA%E5%8C%BA%E5%B1%8F%E8%94%BD%E5%B7%A5%E5%85%B7/code/Youtube%20%E8%AF%84%E8%AE%BA%E5%8C%BA%E5%B1%8F%E8%94%BD%E5%B7%A5%E5%85%B7.user.js)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/scripts/ckylin-script-ytb-comments-blocker.user.js)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/scripts/ckylin-script-ytb-comments-blocker.user.js)

**仓库文件:**

[ckylin-script-ytb-comments-blocker.user.js](scripts/ckylin-script-ytb-comments-blocker.user.js)

### 用户样式


------

#### ![Youtube](https://shields.io/badge/Youtube-red?logo=youtube&style=flat) 移除评论区
**简单介绍**:
屏蔽油管的评论区。

**样式主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/413694)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/413694-youtube-%E5%8E%BB%E4%BB%96%E5%A6%88%E7%9A%84%E8%AF%84%E8%AE%BA%E5%8C%BA/code/%5BYoutube%5D%20%E5%8E%BB%E4%BB%96%E5%A6%88%E7%9A%84%E8%AF%84%E8%AE%BA%E5%8C%BA.user.css)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/styles/ckylin-style-deletefuckingcomments-ytb.user.css)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/styles/ckylin-style-deletefuckingcomments-ytb.user.css)

**仓库文件:**

[ckylin-style-deletefuckingcomments-ytb.user.css](styles/ckylin-style-deletefuckingcomments-ytb.user.css)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 播放器特效
**简单介绍**:
一个简单的视觉增强样式，为网页版哔哩哔哩播放器的控制条、菜单等添加模糊效果。

**样式主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/408044)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/408044-%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E6%92%AD%E6%94%BE%E5%99%A8%E6%A8%A1%E7%B3%8A%E6%95%88%E6%9E%9C/code/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E6%92%AD%E6%94%BE%E5%99%A8%E6%A8%A1%E7%B3%8A%E6%95%88%E6%9E%9C.user.css)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/styles/ckylin-style-bilibiliplayerblur.user.css)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/styles/ckylin-style-bilibiliplayerblur.user.css)

**仓库文件:**

[ckylin-style-bilibiliplayerblur.user.css](styles/ckylin-style-bilibiliplayerblur.user.css)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 移除评论区
**简单介绍**:
移除网页版哔哩哔哩的评论区

**样式主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/412467)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/412467-bilibili-%E5%8E%BB%E4%BB%96%E5%A6%88%E7%9A%84%E8%AF%84%E8%AE%BA%E5%8C%BA/code/%5BBilibili%5D%20%E5%8E%BB%E4%BB%96%E5%A6%88%E7%9A%84%E8%AF%84%E8%AE%BA%E5%8C%BA.user.css)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/styles/ckylin-style-deletefuckingcomments.user.css)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/styles/ckylin-style-deletefuckingcomments.user.css)

**仓库文件:**

[ckylin-style-deletefuckingcomments.user.css](styles/ckylin-style-deletefuckingcomments.user.css)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 移除评分
**简单介绍**:
移除网页版哔哩哔哩的番剧点评和评分

**样式主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/420673)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/420673-bilibili-%E5%8E%BB%E4%BB%96%E5%A6%88%E7%9A%84%E8%AF%84%E5%88%86/code/%5BBilibili%5D%20%E5%8E%BB%E4%BB%96%E5%A6%88%E7%9A%84%E8%AF%84%E5%88%86.user.css)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/styles/ckylin-style-deletefuckingscores.user.css)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/styles/ckylin-style-deletefuckingscores.user.css)

**仓库文件:**

[ckylin-style-deletefuckingscores.user.css](styles/ckylin-style-deletefuckingscores.user.css)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 移除高能弹幕图标 ![Abandoned](https://img.shields.io/badge/-Abandoned-inactive)
**简单介绍**:
删除高能弹幕前的小图标

**样式主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/422100)

**安装链接**:

* [Greasyfork](https://greasyfork.org/scripts/422100-%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9-%E9%9A%90%E8%97%8F%E9%AB%98%E8%83%BD%E5%BC%B9%E5%B9%95%E7%9A%84%E5%89%8D%E7%BC%80%E5%9B%BE%E6%A0%87/code/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9-%E9%9A%90%E8%97%8F%E9%AB%98%E8%83%BD%E5%BC%B9%E5%B9%95%E7%9A%84%E5%89%8D%E7%BC%80%E5%9B%BE%E6%A0%87.user.css)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/styles/ckylin-style-hidehighiconfromdanmaku.user.css)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/styles/ckylin-style-hidehighiconfromdanmaku.user.css)

**仓库文件:**

[ckylin-style-hidehighiconfromdanmaku.user.css](styles/ckylin-style-hidehighiconfromdanmaku.user.css)

------

#### ![bilibili](https://shields.io/badge/Bilibili-blue?logo=bilibili&style=flat) 高亮视频分区标签
**简单介绍**:
高亮视频页面下方标签中的分区标签

**样式主页**: [Greasyfork](https://greasyfork.org/zh-CN/scripts/431798)

**安装链接**:

* [Greasyfork](https://greasyfork.org/zh-CN/scripts/431798)
* [Github](https://github.com/CKylinMC/UserJS/raw/main/styles/ckylin-style-bilibili-highlight-cate-tags.user.css)
* [jsDelivr](https://cdn.jsdelivr.net/gh/CKylinMC/UserJS/styles/ckylin-style-bilibili-highlight-cate-tags.user.css)

**仓库文件:**

[ckylin-style-bilibili-highlight-cate-tags.user.css](styles/ckylin-style-bilibili-highlight-cate-tags.user.css)


## 开源协议

由于不同脚本创建的时间和使用的环境不同，所以可能不是所有脚本都使用相同的开源协议(部分脚本也使用WTFPL等协议)。

如果脚本包含`@license`行，则认为对应脚本使用其指定的开源协议。

否则，默认使用GPLv3协议。

