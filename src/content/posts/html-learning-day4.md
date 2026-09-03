---
title: HTML 学习笔记 Day 4：HTML5 语义化、新表单与多媒体
published: 2026-01-27
description: 第四天笔记：HTML5 语义化标签、新型表单控件与属性、表单事件、audio/video 多媒体以及轻量 DOM 操作。
tags: [HTML, HTML5, 前端, 学习笔记]
category: 前端学习
slug: html-learning-day4
draft: false
pinned: false
---

> [!NOTE]
> 这是第四天 HTML 学习笔记，重点进入 **HTML5** 阶段：语义化标签、新表单控件、音频视频，以及最常用的 DOM 操作。
> 原始练习文件在 `E:\project\html\day4`。
> 其中 `keygen` 等标签已经废弃，了解即可；`data-*` 自定义属性和 `querySelector` / `classList` / `dataset` 现在依然非常常用。

## 一、传统网页 vs HTML5 网页

早期网页常用 `div` 配合 class 来划分页面区域，结构全靠 class 名表达语义：

```html
<!-- 传统部分 -->
<div class="header">
  <ul class="nav"></ul>
</div>

<div class="main">
  <div class="article"></div>
  <div class="aside"></div>
</div>

<div class="footer"></div>
```

HTML5 提供了更语义化的标签，代码一眼就能看懂区域含义：

```html
<!-- H5 部分 -->
<header>
  <ul class="nav"></ul>
</header>

<div class="main">
  <article></article>
  <aside></aside>
</div>

<footer></footer>
```

## 二、HTML5 新增语义标签

| 标签 | 含义 |
|---|---|
| `<section>` | 表示一个区块 |
| `<article>` | 表示独立文章：文章、评论、帖子、博客等 |
| `<header>` | 表示页眉 |
| `<footer>` | 表示页脚 |
| `<nav>` | 表示导航 |
| `<aside>` | 表示侧边栏 |
| `<figure>` | 媒介内容分组 |
| `<mark>` | 表示标记 / 高亮 |
| `<progress>` | 表示进度 |
| `<time>` | 表示时间 |

## 三、HTML5 新增表单类型

HTML5 为 `input` 增加了大量语义化 `type`，浏览器会自带格式校验和对应控件。

| 类型 | 说明 |
|---|---|
| `type="email"` | 只能输入 email 格式，自动验证 |
| `type="tel"` | 电话号码 |
| `type="url"` | 只能输入 URL 格式 |
| `type="number"` | 只能输入数字 |
| `type="search"` | 搜索框 |
| `type="range"` | 滑动条 |
| `type="color"` | 拾色器 |
| `type="time"` | 时间 |
| `type="date"` | 日期 |
| `type="datetime"` | 日期时间 |
| `type="month"` | 月份 |
| `type="week"` | 星期 |

示例：

```html
<form action="">
  <fieldset>
    <legend>表单类型</legend>

    email: <input type="email" name="email" required>
    color: <input type="color" name="color">
    url: <input type="url" name="url">
    number: <input type="number" step="3" name="number">
    range: <input type="range" name="range" value="100">
    search: <input type="search" name="search">
    tel: <input type="tel" name="tel">
    time: <input type="time" name="time">
    date: <input type="date" name="date">
    week: <input type="week" name="week">
    month: <input type="month" name="month">

    <input type="submit">
  </fieldset>
</form>
```

> `datetime` 类型在实际浏览器中支持度一般，现在更常用 `datetime-local`。

## 四、datalist 和 keygen

### 1. datalist

`datalist` 为输入框提供一个下拉列表，同时用户也可以自己输入其他值：

```html
<input type="text" list="myData">
<datalist id="myData">
  <option>本科</option>
  <option>研究生</option>
  <option>不明</option>
</datalist>
```

通过 `input` 的 `list` 属性与 `datalist` 的 `id` 绑定。

### 2. keygen（已废弃）

`keygen` 是密钥对生成器，提交表单时生成公钥和私钥：

- 私钥存储在客户端
- 公钥发送到服务器，用于验证客户端证书

> 该元素已从 Web 标准中移除，现在不要在新项目中使用。

## 五、form 表单的新属性

```html
<form action="">
  <fieldset>
    <legend>表单属性</legend>

    用户名：<input type="text" placeholder="例如：smyhvae" autofocus
                  name="userName" autocomplete="on" required />

    电话：<input type="tel" pattern="1\d{10}" />

    <input type="file" multiple />

    <input type="submit" />
  </fieldset>
</form>
```

常用 HTML5 表单属性：

| 属性 | 说明 |
|---|---|
| `placeholder` | 占位符 |
| `autofocus` | 自动获取焦点 |
| `multiple` | 文件上传多选，或输入多个邮箱地址 |
| `autocomplete` | 自动完成：`on` 开启（默认）/ `off` 关闭 |
| `required` | 必填 |
| `pattern` | 自定义正则校验 |
| `novalidate` | 关闭表单默认验证 |

## 六、表单事件

```html
<form action="">
  <fieldset>
    <legend>表单事件</legend>
    邮箱：<input type="email" id="txt1" />
    输入次数统计：<input type="text" id="txt2" />
    <input type="submit" />
  </fieldset>
</form>

<script>
  var txt1 = document.getElementById('txt1');
  var txt2 = document.getElementById('txt2');
  var num = 0;

  txt1.oninput = function () {
    num++;
    txt2.value = num;
  };

  txt1.oninvalid = function () {
    this.setCustomValidity('亲，请输入正确哦');
  };
</script>
```

- `oninput`：用户输入时触发
- `oninvalid`：验证不通过时触发
- `setCustomValidity()`：自定义验证不通过的提示文字

## 七、音频与视频

### 1. audio 音频

```html
<audio src="audio/1.mp3" controls autoplay loop></audio>
```

常用属性：

- `autoplay`：自动播放
- `loop`：循环播放
- `controls`：显示控制条
- `preload`：预加载（设置 `autoplay` 时该属性失效）

兼容写法：

```html
<audio controls loop>
  <source src="music/yinyue.mp3" />
  <source src="music/yinyue.ogg" />
  <source src="music/yinyue.wav" />
  抱歉，你的浏览器暂不支持此音频格式
</audio>
```

### 2. video 视频

```html
<video src="video/1.mp4" controls autoplay loop></video>
```

```html
<video controls loop>
  <source src="video/1.mp4" />
  <source src="video/1.webm" />
  抱歉，你的浏览器暂不支持此视频格式
</video>
```

`video` 同样支持 `autoplay`、`loop`、`controls`、`preload`，还可以设置 `width` / `height`。

## 八、DOM 操作入门

### 1. 获取元素

```js
// 通过 CSS 选择器获取第一个符合条件的元素
document.querySelector("selector");

// 获取符合条件的所有元素，返回类数组
document.querySelectorAll("selector");
```

### 2. classList 类名操作

```js
node.classList.add("class");      // 添加 class
node.classList.remove("class");   // 移除 class
node.classList.toggle("class");   // 切换 class
node.classList.contains("class"); // 检测是否存在 class
```

### 3. HTML5 自定义属性 data-*

早期在 JS 里给元素挂自定义属性：

```js
box1.index = 100;
box1.title = "盒子";
```

HTML5 推荐直接在标签里写 `data-*` 自定义属性：

```html
<div class="box" title="盒子" data-my-name="smyhvae" data-content="我是一个div">div</div>
```

JS 通过 `dataset` 读取或设置：

```js
var box = document.querySelector('.box');

// 读取自定义属性
console.log(box.dataset["content"]);  // 我是一个div
console.log(box.dataset["myName"]);   // smyhvae

// 设置自定义属性的值
box.dataset["content"] = "aaaa";
```

> 注意：HTML5 自定义属性**必须以 `data-` 开头**，读取时用 `dataset`，属性名中的 `-` 会转换为驼峰写法，例如 `data-my-name` → `dataset["myName"]`。

---

> 小结：Day 4 从 HTML5 语义化标签、新表单控件，到 audio/video 和基础 DOM 操作，把之前“只会写结构”拉进“能交互、能操作页面”的阶段。
