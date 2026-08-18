---
title: HTML 学习笔记 Day 2：排版、文本样式、图片与超链接
published: 2026-01-25
description: 第二天笔记：排版标签、div/span 布局、文本格式化、特殊字符、图片路径与超链接属性。
tags: [HTML, 前端, 学习笔记]
category: 前端学习
slug: html-learning-day2
draft: false
pinned: false
---

> [!NOTE]
> 这是第二天 HTML 学习笔记，重点补充排版标签、文本样式、图片路径和超链接的常用属性。
> 原始练习文件在 `E:\project\html\day2`。

## 一、排版标签

### 1. 标题标签

```html
<h1>我是一级标题</h1>
<h2>我是二级标题</h2>
<h3>我是三级标题</h3>
<h4>我是四级标题</h4>
<h5>我是五级标题</h5>
<h6>我是六级标题</h6>
```

### 2. 段落标签

```html
<p>我是段落标签1</p>
<p>我是段落标签2</p>
<p align="center">我是段落标签3</p>
```

`align` 属性表示对齐方式：`left` / `center` / `right`。现代开发更推荐用 CSS 控制对齐。

### 3. 文本级标签 vs 容器级标签

- **文本级标签**：`p`、`span`、`a`、`b`、`i`、`u`、`em` 等，里面一般只放文字、图片、表单元素
- **容器级标签**：`div`、`h1` ~ `h6`、`li`、`dt`、`dd` 等，里面可以放任何内容

注意：`p` 标签里不要放 `h1` 等块级标题。

### 4. 水平分割线 hr 和换行 br

```html
<hr size="5" width="500" color="#FF0000" align="center"></hr>
This is<br>
a<br>
test<br>
```

- `<hr>`：水平分割线，有 `size`、`width`、`color`、`align` 等属性
- `<br>`：换行

### 5. div + span 布局

```html
<p>
  简介简介简介
  <span>
    <a href="">详细信息</a>
    <a href="">购买</a>
  </span>
</p>

<div class="header">
  <div class="logo"></div>
  <div class="nav"></div>
</div>
<div class="content">
  <div class="guanggao"></div>
  <div class="dongxi"></div>
</div>
<div class="footer"></div>
```

`div` 是容器级标签，`span` 是文本级标签。`div + CSS` 是传统页面布局的经典方式。

### 6. center 和 pre

```html
<center>
  <p>原神牛逼</p>
  <p>鸣潮牛逼</p>
</center>

<pre>
  1111


  2222
</pre>
```

- `<center>`：内容居中，不推荐使用，建议用 CSS
- `<pre>`：预格式化文本，原封不动保留换行和空格

## 二、文本样式与特殊字符

### 1. 锚点

```html
<a name="name1"></a>
```

锚点用于页面内跳转，后面超链接部分会用到。

### 2. 特殊字符

| 字符 | HTML 实体 | 说明 |
|---|---|---|
| 空格 | `&nbsp;` | 不换行空格 |
| < | `&lt;` | less than |
| > | `&gt;` | greater than |
| & | `&amp;` | and |
| " | `&quot;` | 双引号 |
| © | `&copy;` | 版权 |
| ® | `&reg;` | 注册商标 |
| ™ | `&trade;` | 商标 |
| × | `&times;` | 乘号 |
| ÷ | `&divide;` | 除号 |
| ¥ | `&yen;` | 人民币 |
| £ | `&pound;` | 英镑 |
| € | `&euro;` | 欧元 |
| ♥ | `&hearts;` | 心形 |
| ♦ | `&diams;` | 方块 |
| ² | `&sup2;` | 上标 2 |
| ³ | `&sup3;` | 上标 3 |
| ° | `&deg;` | 度数 |
| ± | `&plusmn;` | 正负号 |

### 3. 文本格式化标签

```html
<u>这是下划线文本</u>
<s>这是删除线文本 s</s>
<del>这是删除线文本 del</del>
<i>这是斜体文本 i</i>
<em>这是斜体文本 em</em>
<b>这是加粗文本 b</b>
<strong>这是加粗文本 strong</strong>
```

### 4. font 标签（已废弃）

```html
<font face="微软雅黑" color="red" size="5">vae</font>
```

`font` 标签已经废弃，现在应该使用 CSS 设置字体、颜色和大小。

### 5. 上标与下标

```html
0<sup>2</sup> + 1<sub>2</sub> = 1<sup>2</sup>
```

## 三、超链接进阶

### 1. 外部链接

```html
<a href="https://www.baidu.com" target="_blank">点我点我</a>
```

`target="_blank"` 表示在新窗口打开。

### 2. 锚链接

```html
<a href="#name1">回到顶部</a>
<a href="test2.html#name1">回到顶部</a>
```

`#name1` 跳转到当前页面的 `name1` 锚点，也可以指定其他文件里的锚点。

### 3. 邮箱链接

```html
<a href="mailto: xxx@163.com">点击进入我的邮箱</a>
```

### 4. 超链接常用属性

| 属性 | 说明 |
|---|---|
| `href` | 目标 URL |
| `title` | 鼠标悬停时显示的文本 |
| `name` | 设置锚点名称 |
| `target` | 打开方式：`_self` / `_blank` / `_parent` / `_top` |

## 四、图片标签进阶

### 1. 相对路径

```html
<img src="../9b6063ca5d92ae3584e9fcdbee6f0c17279406515.png@1052w_!web-dynamic.jpg" alt="橙色千咲">
<img src="./278711955d912d52a0797d602b6629d7448738328.jpg">
```

### 2. 绝对路径

```html
<img src="E:\project\html\9b6063ca5d92ae3584e9fcdbee6f0c17279406515.png@1052w_!web-dynamic.jpg" alt="橙色千咲">
```

> 实际项目中图片一般放在网站目录内，使用相对路径或 URL 路径，不建议使用本地绝对路径。

### 3. img 常用属性

| 属性 | 说明 |
|---|---|
| `width` / `height` | 设置宽高，二者选一时会等比例缩放 |
| `alt` | 图片无法显示时的替代文本 |
| `title` | 鼠标悬停显示的内容 |
| `align` | 图片与周围文字的相对位置：`left` / `right` / `top` / `bottom` / `middle` |
| `border` | 边框宽度，主要用 CSS 调整 |
| `hspace` / `vspace` | 水平 / 垂直间距，主要用 CSS 调整 |

---

> 小结：Day 2 重点掌握了排版标签、文本样式、特殊字符、超链接和图片。这些都是搭建页面结构时非常常用的基础能力。
