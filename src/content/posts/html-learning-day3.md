---
title: HTML 学习笔记 Day 3：列表、表格、表单与多媒体
published: 2026-01-26
description: 第三天笔记：列表、表格、iframe、表单控件、多媒体标签与滚动字幕。
tags: [HTML, 前端, 学习笔记]
category: 前端学习
slug: html-learning-day3
draft: false
pinned: false
---

> [!NOTE]
> 这是第三天 HTML 学习笔记，内容覆盖列表、表格、框架、表单、多媒体等。
> 原始练习文件在 `E:\project\html\day3`。
> 其中有部分标签（如 `frameset`、`marquee`、`embed` 等）已经是历史遗留写法，了解即可，实际开发建议使用现代 HTML 标签和 CSS。

## 一、列表标签

### 1. 无序列表 ul

```html
<ul>
  <li>默认1</li>
  <li>默认2</li>
  <li>默认3</li>
</ul>

<ul type="circle">
  <li>圆形</li>
  <li>圆形</li>
  <li>方形</li>
</ul>
```

`type` 属性可设置列表样式：

- `disc`：实心圆（默认）
- `circle`：空心圆
- `square`：方形

`li` 不能单独存在，必须包裹在 `ul` / `ol` 中。

### 2. 有序列表 ol

```html
<ol>
  <li>有序列表1</li>
  <li>有序列表2</li>
  <li>有序列表3</li>
</ol>
```

`ol` 的 `type` 可以是 `1`、`a`、`i` 等，`start` 可以指定起始值。

### 3. 自定义列表 dl

```html
<dl>
  <dt>第一条</dt>
  <dd>第一条第一行描述</dd>
  <dd>第一条第二行描述</dd>
  <dt>第二条</dt>
  <dd>第二条第一行描述</dd>
</dl>
```

- `dl`：自定义列表容器
- `dt`：列表项标题
- `dd`：列表项描述

## 二、表格标签

### 1. 基础表格

```html
<table>
  <tr>
    <td>第一行第一列</td>
    <td>第一行第二列</td>
    <td>第一行第三列</td>
  </tr>
  <tr>
    <td>第二行第一列</td>
    <td>第二行第二列</td>
    <td>第二行第三列</td>
  </tr>
</table>
```

- `table`：表格
- `tr`：行
- `td`：单元格

### 2. 表格属性

```html
<table bordercolorlight="red" bordercolordark="blue" border="1" style="border-collapse: collapse;">
  <caption>表格标题</caption>
  <tr>
    <td>第一行第一列</td>
    <td>第一行第二列</td>
    <td>第一行第三列</td>
  </tr>
</table>
```

常用属性：

- `border`：边框宽度
- `width` / `height`：表格尺寸
- `bordercolor`：边框颜色
- `align`：表格水平对齐
- `cellpadding`：单元格内容与边框的距离
- `cellspacing`：单元格之间的距离
- `bgcolor` / `background`：背景色 / 背景图

### 3. th、caption、thead/tbody/tfoot

```html
<table>
  <caption>表格标题</caption>
  <thead>
    <tr>
      <th>表头1</th>
      <th>表头2</th>
      <th>表头3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>内容1</td>
      <td>内容2</td>
      <td>内容3</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td>表尾1</td>
      <td>表尾2</td>
      <td>表尾3</td>
    </tr>
  </tfoot>
</table>
```

- `th`：表头单元格，默认加粗
- `caption`：表格标题
- `thead` / `tbody` / `tfoot`：表头 / 主体 / 表尾

### 4. 单元格合并

- `colspan`：横向合并单元格
- `rowspan`：纵向合并单元格

## 三、框架与内嵌框架

### 1. frameset / frame（已废弃）

```html
<frameset rows="20%,*" bordercolor="#00FF00" frameborder="1">
  <frame src="top.html" name="top" scrolling="no" noresize>
  <frameset cols="40%,*" bordercolor="#00FF00" frameborder="1">
    <frame src="left.html" name="left" scrolling="no" noresize>
    <frame src="right.html" name="right">
  </frameset>
</frameset>
```

`frameset` / `frame` 已从 Web 标准中移除，不要在新项目中使用。

### 2. iframe 内嵌框架

```html
<iframe src="new.html"></iframe>
```

`iframe` 是 `body` 的子标签，常用属性：

- `src`：嵌入页面地址
- `width` / `height`：宽高
- `scrolling`：是否需要滚动条
- `name`：框架名称，可配合超链接 `target` 使用

## 四、表单标签

### 1. form 基础属性

```html
<form name="myForm" action="login.php" method="post">
  ...
</form>
```

- `name` / `id`：表单名称
- `action`：表单提交地址
- `method`：提交方式，`get`（默认）或 `post`

### 2. input 常用类型

```html
<form>
  姓名：<input value="呵呵">逗比<br>
  昵称：<input value="哈哈" readonly><br>
  名字：<input type="text" value="name" disabled><br>
  密码：<input type="password" value="pwd" size="50"><br>
  性别：<input type="radio" name="gender" value="male" checked>男
        <input type="radio" name="gender" value="female">女<br>
  爱好：<input type="checkbox" name="love" value="eat">吃饭
        <input type="checkbox" name="love" value="sleep">睡觉
        <input type="checkbox" name="love" value="bat">打豆豆
</form>
```

`input` 常用 `type`：

| type | 说明 |
|---|---|
| `text` | 文本框（默认） |
| `password` | 密码框 |
| `radio` | 单选按钮（同 `name` 一组） |
| `checkbox` | 复选按钮 |
| `checked` | 默认选中 |
| `hidden` | 隐藏框 |
| `button` | 普通按钮 |
| `submit` | 提交按钮 |
| `reset` | 重置按钮 |
| `image` | 图片按钮 |
| `file` | 文件选择框 |

### 3. select 下拉列表

```html
<select>
  <option>小学</option>
  <option>初中</option>
  <option>高中</option>
  <option>大学</option>
  <option selected>研究生</option>
</select>
```

- `size`：大于 1 时显示为滚动列表，默认 1 为下拉列表
- `multiple`：允许多选
- `option selected`：默认选中项

### 4. textarea 多行文本

```html
<textarea name="txtInfo" rows="4" cols="20">
  1、不爱摄影不懂设计的程序猿不是一个好的产品经理。
</textarea>
```

`rows` / `cols` 分别控制行数和列数，`readonly` 可设为只读。

### 5. fieldset / legend / label

```html
<form>
  <fieldset>
    <legend>账号信息</legend>
    姓名：<input value="呵呵">逗比<br>
    密码：<input type="password" value="pwd" size="50"><br>
  </fieldset>

  <input type="radio" name="sex" id="nan"> <label for="nan">男</label>
  <input type="radio" name="sex" id="nv"> <label for="nv">女</label>
</form>
```

- `fieldset`：表单分组
- `legend`：分组标题
- `label for="id"`：点击文字即可选中对应控件

## 五、多媒体与滚动

### 1. embed / object（历史写法）

```html
<embed src="王菲 - 清风徐来.mp3"></embed>

<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="778" height="202">
  <param name="movie" value="images/banner.swf">
  <param name="quality" value="high">
  <param name="wmode" value="transparent">
  <embed src="images/banner.swf" width="778" height="202" quality="high"></embed>
</object>
```

现代网页建议使用 `<audio>` / `<video>` 标签。

### 2. marquee 滚动文字（已废弃）

```html
<marquee behavior="alternate" direction="down" width="300" height="200" bgcolor="#8c5dc1">
  我来了
</marquee>
```

常用属性：

- `direction`：`left` / `right` / `up` / `down`
- `behavior`：`slide`（一次） / `scroll`（循环） / `alternate`（来回）
- `scrollamount`：移动速度
- `loop`：循环次数
- `scrolldelay`：移动间隔时间

> `marquee` 已废弃，实际项目中请用 CSS 动画或 JS 实现滚动效果。

---

> 小结：Day 3 把列表、表格、表单、多媒体等常见标签都过了一遍。虽然部分标签已经过时，但理解它们能帮你更好地阅读老代码，也能更清楚现代 HTML/CSS 为什么要取代它们。
