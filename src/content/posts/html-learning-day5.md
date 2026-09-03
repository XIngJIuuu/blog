---
title: HTML 学习笔记 Day 5：自定义 HTML5 视频播放器
published: 2026-01-28
description: 第五天笔记：用 HTML5 video 标签与原生 JavaScript 实现一个自定义视频播放器，包含完整代码、分段代码块与逐段讲解。
tags: [HTML, HTML5, JavaScript, 前端, 学习笔记]
category: 前端学习
slug: html-learning-day5
draft: false
pinned: false
---

> [!NOTE]
> 这是第五天 HTML 学习笔记，做一个 **HTML5 自定义视频播放器**：
> 用 `<video>` + 原生 JavaScript 控制播放/暂停、显示总时长、同步进度条、全屏。
> 实际运行还需要 Font Awesome 图标库、`css/font-awesome.min.css`、`images/loading.gif`、`video/fun.mp4` 等素材，这里重点学习 HTML/CSS/JS 的完整思路。

## 完整代码

```html
<!DOCTYPE html>
<html>
<head lang="en">
    <meta charset="UTF-8">
    <title></title>
    <!-- 引入字体图标的文件-->
    <link rel="stylesheet" href="css/font-awesome.min.css"/>
    <style>
        *{
            margin: 0;
            padding: 0;
        }
        /*多媒体标题*/
        figcaption{
            text-align: center;
            line-height: 150px;
            font-family: "Microsoft Yahei";
            font-size:24px;
        }

        /* 播放器*/
        .palyer{
            width: 720px;
            height: 360px;
            margin:10px auto;
            border: 1px solid #000;
            background: url(images/loading.gif) center no-repeat #000;
            background-size:auto 100%;
            position: relative;
            border-radius: 20px;

        }

        .palyer video{
            height:100%;
            display: block;
            margin:0 auto;
        }

        /* 控制条*/

        .controls{
            width: 700px;
            height:40px;
            background-color: rgba(255, 255, 0, 0.3);
            position: absolute;
            bottom:10px;
            left:10px;
            border-radius: 10px;
        }
        /*开关*/
        .switch{
            position: absolute;
            width: 20px;
            height: 20px;
            left:10px;
            top:10px;

            text-align: center;
            line-height: 20px;
            color:yellow;

        }
        /*进度条*/
        .progress{
            width: 432px;
            height: 10px;
            position: absolute;
            background-color: rgba(255,255,255,0.4);
            left:40px;
            top:15px;
            border-radius: 4px;
            overflow: hidden;
        }
        /* 当前进度*/
        .curr-progress{
            width: 50%;
            height: 10px;
            background-color: #fff;
        }
        /* 时间模块*/
        .time{
            width: 120px;
            height: 20px;
            text-align: center;
            line-height: 20px;
            color:#fff;
            position: absolute;
            left:510px;
            top:10px;
            font-size:12px;

        }
        /*全屏*/
        .extend{
            position: absolute;
            width: 20px;
            height: 20px;

            right:20px;
            top:10px;

            text-align: center;
            line-height: 20px;
            color:yellow;
        }

    </style>
</head>
<body>
    <!-- 多媒体-->
    <figure>
        <!--  多媒体标题-->
        <figcaption>视频案例</figcaption>
        <div class="palyer">
            <video src="video/fun.mp4"></video>
            <!-- 控制条-->
            <div class="controls">
                <!-- 播放暂停-->
                <a href="#" class="switch  icon-play"></a>
                <div class="progress">
                    <!-- 当前进度-->
                    <div class="curr-progress"></div>
                </div>
                <!-- 时间-->
                <div class="time">
                    <span class="curr-time">00:00:00</span>/<span class="total-time">00:00:00</span>
                </div>
                <!-- 全屏-->
                <a href="#" class="extend  icon-resize-full"></a>
            </div>

        </div>
    </figure>

    <script>
        // 思路：
        /*
        * 1、点击按钮 实现播放暂停并且切换图标
        * 2、算出视频的总时显示出出来
        * 3、当视频播放的时候，进度条同步，当前时间同步
        * 4、点击实现全屏
        */

//        获取需要的标签
            var  video=document.querySelector('video');
//          播放按钮
            var  playBtn=document.querySelector('.switch');
//          当前进度条
            var  currProgress=document.querySelector('.curr-progress');
//          当前时间
            var  currTime=document.querySelector('.curr-time');
//          总时间
            var  totalTime=document.querySelector('.total-time');
//          全屏
            var extend=document.querySelector('.extend');

            var tTime=0;

//         1、点击按钮 实现播放暂停并且切换图标

            playBtn.onclick=function(){
//               如果视频播放 就暂停，如果暂停 就播放
                if(video.paused){
//                   播放
                    video.play();
                    //切换图标
                    this.classList.remove('icon-play');
                    this.classList.add('icon-pause');
                }else{
//                   暂停
                     video.pause();
//                   切换图标
                    this.classList.remove('icon-pause');
                    this.classList.add('icon-play');}
            }

//        2、算出视频的总时显示出出来
//        当时加载完成后的事件，视频能播放的时候
        video.oncanplay=function(){
//             获取视频总时长
            tTime=video.duration;
            console.log(tTime);

//          将总秒数 转换成 时分秒的格式：00：00:00
//            小时
            var h=Math.floor(tTime/3600);
//            分钟
            var m=Math.floor(tTime%3600/60);
//            秒
            var s=Math.floor(tTime%60);

//            把数据格式转成 00:00：00
            h=h>=10?h:"0"+h;
            m=m>=10?m:"0"+m;
            s=s>=10?s:"0"+s;

//            显示出来
            totalTime.innerHTML=h+":"+m+":"+s;
        }
//   * 3、当视频播放的时候，进度条同步，当前时间同步
//         当时当前时间更新的时候触发
        video.ontimeupdate=function(){
//            获取视频当前播放的时间
//           console.log(video.currentTime);
//            当前播放时间
            var cTime=video.currentTime;
//           把格式转成00:00:00

            var h=Math.floor(cTime/3600);
//            分钟
            var m=Math.floor(cTime%3600/60);
//            秒
            var s=Math.floor(cTime%60);

//            把数据格式转成 00:00：00
            h=h>=10?h:"0"+h;
            m=m>=10?m:"0"+m;
            s=s>=10?s:"0"+s;

//            显示出当前时间
            currTime.innerHTML=h+":"+m+":"+s;

//            改变进度条的宽度： 当前时间/总时间
            var value=cTime/tTime;

            currProgress.style.width=value*100+"%";

        }

//        全屏
        extend.onclick=function(){
//            全屏的h5代码
            video.webkitRequestFullScreen();
        }

    </script>
</body>
</html>
```

---

## 分段详解

### 1. HTML 文档结构

```html
<!DOCTYPE html>
<html>
<head lang="en">
    <meta charset="UTF-8">
    <title></title>
    <!-- 引入字体图标的文件-->
    <link rel="stylesheet" href="css/font-awesome.min.css"/>
</head>
```

**说明：**

| 标签/属性 | 含义 |
|---|---|
| `<!DOCTYPE html>` | 文档类型声明，告诉浏览器这是 HTML5 文档 |
| `<html>` | 整个页面的根元素 |
| `lang="en"` | 声明页面主要语言，建议改为 `zh-CN` |
| `<head>` | 文档头部，包含元数据和资源引用 |
| `<meta charset="UTF-8">` | 设置字符编码为 UTF-8，支持中文 |
| `<link rel="stylesheet" href="...">` | 引入外部 CSS 样式表 |

这里引入 Font Awesome 图标库，后面用到的 `icon-play`、`icon-pause`、`icon-resize-full` 都来自该库。

---

### 2. CSS 全局样式与标题

```css
*{
    margin: 0;
    padding: 0;
}
/*多媒体标题*/
figcaption{
    text-align: center;
    line-height: 150px;
    font-family: "Microsoft Yahei";
    font-size:24px;
}
```

**说明：**

| 代码 | 含义 |
|---|---|
| `*` | 通配符选择器，选中页面所有元素 |
| `margin: 0` | 清除默认外边距 |
| `padding: 0` | 清除默认内边距 |
| `figcaption` | `<figure>` 的标题标签 |
| `text-align: center` | 文字水平居中 |
| `line-height: 150px` | 行高 150px，让标题区域有足够空间 |
| `font-family` / `font-size` | 设置字体和字号 |

作用：重置浏览器默认样式并美化“视频案例”标题。

---

### 3. CSS 播放器容器与视频

```css
/* 播放器*/
.palyer{
    width: 720px;
    height: 360px;
    margin:10px auto;
    border: 1px solid #000;
    background: url(images/loading.gif) center no-repeat #000;
    background-size:auto 100%;
    position: relative;
    border-radius: 20px;
}
.palyer video{
    height:100%;
    display: block;
    margin:0 auto;
}
```

**说明：**

| 代码 | 含义 |
|---|---|
| `.palyer` | 播放器容器类（原代码拼写为 palyer，应为 player） |
| `width: 720px; height: 360px` | 16:9 播放器尺寸 |
| `margin: 10px auto` | 上下 10px，左右自动实现水平居中 |
| `background: url(...) center no-repeat #000` | 黑色背景 + 居中加载图 |
| `position: relative` | **相对定位**，给内部绝对定位元素做参照 |
| `.palyer video` | 视频元素样式 |
| `height: 100%` | 高度撑满父容器，宽度自适应 |
| `margin: 0 auto` | 视频水平居中 |

关键点：`.palyer` 使用 `position: relative`，这样控制条里的 `position: absolute` 才会以播放器为参照定位。

---

### 4. CSS 控制条样式

```css
/* 控制条*/
.controls{
    width: 700px;
    height:40px;
    background-color: rgba(255, 255, 0, 0.3);
    position: absolute;
    bottom:10px;
    left:10px;
    border-radius: 10px;
}
/*开关*/
.switch{
    position: absolute;
    width: 20px;
    height: 20px;
    left:10px;
    top:10px;
    text-align: center;
    line-height: 20px;
    color:yellow;
}
/*进度条*/
.progress{
    width: 432px;
    height: 10px;
    position: absolute;
    background-color: rgba(255,255,255,0.4);
    left:40px;
    top:15px;
    border-radius: 4px;
    overflow: hidden;
}
/* 当前进度*/
.curr-progress{
    width: 50%;
    height: 10px;
    background-color: #fff;
}
/* 时间模块*/
.time{
    width: 120px;
    height: 20px;
    text-align: center;
    line-height: 20px;
    color:#fff;
    position: absolute;
    left:510px;
    top:10px;
    font-size:12px;
}
/*全屏*/
.extend{
    position: absolute;
    width: 20px;
    height: 20px;
    right:20px;
    top:10px;
    text-align: center;
    line-height: 20px;
    color:yellow;
}
```

**说明：**

| 代码 | 含义 |
|---|---|
| `.controls` | 控制条容器，绝对定位在播放器底部 |
| `rgba(255, 255, 0, 0.3)` | 黄色半透明背景 |
| `.switch` | 播放/暂停按钮，20×20 图标 |
| `text-align: center; line-height: 20px` | 让图标在按钮中水平/垂直居中 |
| `.progress` | 进度条轨道 |
| `overflow: hidden` | 裁剪超出部分，保证圆角效果 |
| `.curr-progress` | 当前进度填充条，宽度由 JS 动态修改 |
| `.time` | 时间显示区域 |
| `.extend` | 全屏按钮，定位在控制条右侧 |

这样控制条内部各控件就排好了位置，后续 JS 只需要改 `.curr-progress` 的 `style.width`。

---

### 5. HTML 主体结构

```html
<body>
    <!-- 多媒体-->
    <figure>
        <!--  多媒体标题-->
        <figcaption>视频案例</figcaption>
        <div class="palyer">
            <video src="video/fun.mp4"></video>
            <!-- 控制条-->
            <div class="controls">
                <!-- 播放暂停-->
                <a href="#" class="switch  icon-play"></a>
                <div class="progress">
                    <!-- 当前进度-->
                    <div class="curr-progress"></div>
                </div>
                <!-- 时间-->
                <div class="time">
                    <span class="curr-time">00:00:00</span>/<span class="total-time">00:00:00</span>
                </div>
                <!-- 全屏-->
                <a href="#" class="extend  icon-resize-full"></a>
            </div>
        </div>
    </figure>
</body>
```

**说明：**

| 标签/属性 | 含义 |
|---|---|
| `<figure>` | HTML5 语义化标签，包裹独立内容 |
| `<figcaption>` | figure 的标题，显示“视频案例” |
| `<video src="video/fun.mp4">` | HTML5 视频标签 |
| `<div class="controls">` | 自定义控制条 |
| `<a href="#" class="switch icon-play">` | 播放按钮，`href="#"` 防止点击后跳转 |
| `<div class="curr-progress">` | 当前进度条填充 |
| `<span class="curr-time">` / `<span class="total-time">` | 当前时间 / 总时长 |

注意：`<video>` 没有写 `controls` 属性，所以浏览器不显示默认控制条，改用我们自己写的控制条。

---

### 6. JavaScript 获取元素

```javascript
// 思路：
/*
* 1、点击按钮 实现播放暂停并且切换图标
* 2、算出视频的总时显示出出来
* 3、当视频播放的时候，进度条同步，当前时间同步
* 4、点击实现全屏
*/

//        获取需要的标签
var  video=document.querySelector('video');
//          播放按钮
var  playBtn=document.querySelector('.switch');
//          当前进度条
var  currProgress=document.querySelector('.curr-progress');
//          当前时间
var  currTime=document.querySelector('.curr-time');
//          总时间
var  totalTime=document.querySelector('.total-time');
//          全屏
var extend=document.querySelector('.extend');

var tTime=0;
```

**说明：**

| 代码 | 含义 |
|---|---|
| `document.querySelector('video')` | 获取页面中第一个 `<video>` 元素 |
| `document.querySelector('.switch')` | 获取播放/暂停按钮 |
| `document.querySelector('.curr-progress')` | 获取当前进度条 |
| `document.querySelector('.curr-time')` | 获取当前时间显示 |
| `document.querySelector('.total-time')` | 获取总时长显示 |
| `document.querySelector('.extend')` | 获取全屏按钮 |
| `var tTime = 0` | 保存视频总时长（秒） |

---

### 7. JavaScript 播放与暂停

```javascript
//         1、点击按钮 实现播放暂停并且切换图标
playBtn.onclick=function(){
    // 如果视频播放 就暂停，如果暂停 就播放
    if(video.paused){
        // 播放
        video.play();
        // 切换图标
        this.classList.remove('icon-play');
        this.classList.add('icon-pause');
    }else{
        // 暂停
        video.pause();
        // 切换图标
        this.classList.remove('icon-pause');
        this.classList.add('icon-play');
    }
}
```

**说明：**

| 代码 | 含义 |
|---|---|
| `playBtn.onclick = function(){}` | 为播放按钮绑定点击事件 |
| `video.paused` | `true` 表示暂停，`false` 表示播放中 |
| `video.play()` | 播放视频 |
| `video.pause()` | 暂停视频 |
| `this.classList.remove / add` | 切换播放/暂停图标 |

逻辑：视频暂停时 → 播放 + 显示暂停图标；视频播放中 → 暂停 + 显示播放图标。

---

### 8. JavaScript 计算并显示总时长

```javascript
//        2、算出视频的总时显示出出来
//        当时加载完成后的事件，视频能播放的时候
video.oncanplay=function(){
    // 获取视频总时长
    tTime=video.duration;
    console.log(tTime);

    // 将总秒数 转换成 时分秒的格式：00：00:00
    // 小时
    var h=Math.floor(tTime/3600);
    // 分钟
    var m=Math.floor(tTime%3600/60);
    // 秒
    var s=Math.floor(tTime%60);

    // 把数据格式转成 00:00：00
    h=h>=10?h:"0"+h;
    m=m>=10?m:"0"+m;
    s=s>=10?s:"0"+s;

    // 显示出来
    totalTime.innerHTML=h+":"+m+":"+s;
}
```

**说明：**

| 代码 | 含义 |
|---|---|
| `video.oncanplay = function(){}` | 绑定 `canplay` 事件，浏览器可以播放视频时触发 |
| `tTime = video.duration` | 获取视频总时长（秒） |
| `Math.floor(tTime / 3600)` | 计算小时 |
| `Math.floor(tTime % 3600 / 60)` | 计算分钟 |
| `Math.floor(tTime % 60)` | 计算剩余秒数 |
| 三元运算符补零 | `h >= 10 ? h : "0" + h`，保证两位显示 |
| `totalTime.innerHTML = ...` | 把格式化时间写入总时长元素 |

示例：视频长 3725 秒 → `01:02:05`。

---

### 9. JavaScript 同步进度条与当前时间

```javascript
//   * 3、当视频播放的时候，进度条同步，当前时间同步
//         当时当前时间更新的时候触发
video.ontimeupdate=function(){
    // 获取视频当前播放的时间
    var cTime=video.currentTime;

    // 把格式转成00:00:00
    var h=Math.floor(cTime/3600);
    var m=Math.floor(cTime%3600/60);
    var s=Math.floor(cTime%60);

    // 把数据格式转成 00:00：00
    h=h>=10?h:"0"+h;
    m=m>=10?m:"0"+m;
    s=s>=10?s:"0"+s;

    // 显示出当前时间
    currTime.innerHTML=h+":"+m+":"+s;

    // 改变进度条的宽度： 当前时间/总时间
    var value=cTime/tTime;
    currProgress.style.width=value*100+"%";
}
```

**说明：**

| 代码 | 含义 |
|---|---|
| `video.ontimeupdate = function(){}` | 绑定 `timeupdate` 事件，播放时时间变化会触发 |
| `video.currentTime` | 获取当前播放时间（秒） |
| 时间格式化 | 与总时长处理方式相同 |
| `currTime.innerHTML = ...` | 更新当前时间文字 |
| `var value = cTime / tTime` | 计算当前播放比例（0 ~ 1） |
| `currProgress.style.width = value * 100 + "%"` | 按比例设置进度条宽度 |

这样视频播放时，当前时间和进度条会同步变化。

---

### 10. JavaScript 全屏

```javascript
//        全屏
extend.onclick=function(){
    //            全屏的h5代码
    video.webkitRequestFullScreen();
}
```

**说明：**

`extend.onclick` 给全屏按钮绑定点击事件，调用浏览器的全屏 API 让视频全屏显示。

> `webkitRequestFullScreen` 是带浏览器前缀的旧写法，现代标准写法是 `requestFullscreen()`。如果要兼容更多浏览器，可以写成：

```javascript
if (video.requestFullscreen) {
    video.requestFullscreen();
} else if (video.webkitRequestFullScreen) {
    video.webkitRequestFullScreen();
} else if (video.mozRequestFullScreen) {
    video.mozRequestFullScreen();
}
```

---

## 小结

Day 5 完成了一个自定义 HTML5 视频播放器，核心流程是：

1. 用 `<video>` 隐藏默认控制条，自己写一套控制条 UI；
2. 点击播放按钮调用 `play()` / `pause()` 并切换图标；
3. `oncanplay` 事件里计算总时长；
4. `ontimeupdate` 事件里同步当前时间和进度条；
5. 点击全屏按钮调用全屏 API。

这个练习把 HTML 语义化、CSS 绝对定位布局、JavaScript 事件绑定和 DOM 操作完整串了起来。
