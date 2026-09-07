---
title: Python 学习笔记 Day 1：数据类型、变量与字符串编码
published: 2026-09-07
description: Python 第一天笔记：整数与浮点数、字符串与转义、布尔值与空值、变量与常量、两种除法，以及字符编码、bytes 与三种字符串格式化方式。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day1
draft: false
pinned: false
---

> [!NOTE]
> 这是第一天 Python 学习笔记，由入门阶段的练习代码整理而成，内容比较基础，适合零基础阅读。

## 一、整数与浮点数

Python 的整数包含正负数，写大数字时可以用下划线 `_` 分隔（纯美观，不影响值）；浮点数是带小数点的数，`3.14` 和 `3.140` 是同一个数。

```python
1000000 == 1_000_000   # True，下划线只为易读
3.14 == 3.140          # True
```

Python 有两种除法：

| 运算符 | 结果 |
|---|---|
| `/` | 普通除法，结果永远是**浮点数** |
| `//` | 地板除，结果是**整数**（直接去掉小数部分） |

```python
print(7 / 3)   # 2.3333333333333335
print(7 // 3)  # 2
```

与 Java 等语言不同，Python 的整数**没有大小限制**，不会出现 32 位整数 `-2147483648 ~ 2147483647` 那样的范围问题；浮点数也没有大小限制，但超出一定范围后会直接表示为 `inf`（无限大）。

## 二、字符串：引号、转义与原始字符串

字符串用单引号或双引号括起来，两者等价。当字符串内容本身包含引号时，需要用转义字符 `\`：

```python
print("I'm a \"Python\" programmer.")
# I'm a "Python" programmer.
```

如果字符串里有多个需要转义的字符，可以在引号前加 `r`，表示**原始字符串**，引号内的内容都不需要转义：

```python
print(r"I'm a 'Python' programmer.")
# I'm a 'Python' programmer.
```

多行字符串用三引号 `'''...'''` 或 `"""..."""`，换行可以直接写进字符串里：

```python
print('''I'm
a "Python"
programmer.
''')
```

## 三、布尔值与空值

布尔值只有 `True` 和 `False` 两种（注意首字母大写），可以用 `and`、`or`、`not` 做布尔运算：

```python
print(True and True)   # True
print(True or False)   # True
print(not True)        # False
print(1 > 2)           # False，比较运算直接产生布尔值
```

- `and`：两边都为 `True` 才返回 `True`
- `or`：有一边为 `True` 就返回 `True`
- `not`：取反

空值是 `None`，表示"什么都没有"，它不是 `0`，也不是空字符串。

## 四、变量与常量

变量名由大小写英文、数字和下划线组成，**不能用数字开头**。Python 的变量不需要声明类型，直接赋值即可：

```python
a = 7
```

常量是一种约定：通常用**全部大写字母**表示（本质上仍是变量，Python 并不会阻止你修改它）：

```python
PI = 3.14159
```

## 五、字符编码：从 ASCII 到 UTF-8

| 编码 | 特点 |
|---|---|
| ASCII | 1 个字节，只能表示英文 |
| Unicode | 通常 2 个字节，收录所有语言。统一编码后乱码问题消失，但纯英文文本的存储/传输体积要翻倍 |
| UTF-8 | Unicode 的**可变长编码**，用 1~4 个字节表示一个字符：英文 1 字节，汉字 3 字节 |

UTF-8 的一个额外好处：ASCII 可以看成 UTF-8 的一部分，所以大量只支持 ASCII 编码的历史遗留软件可以在 UTF-8 编码下继续工作。

工作方式可以概括为一句话：**内存中统一使用 Unicode，保存到硬盘或网络传输时转换为 UTF-8**。用记事本编辑文件时，读取的 UTF-8 字符先被转成 Unicode 放进内存，编辑完成后保存时再把 Unicode 转回 UTF-8 写入文件。

## 六、ord()、chr() 与 bytes

`ord()` 把单个字符转成整数编码，`chr()` 把整数编码转回字符：

```python
print(ord('A'))     # 65
print(ord('中'))    # 20013
print(chr(65))      # A
print(chr(20013))   # 中
```

`bytes` 类型的数据用带 `b` 前缀的字符串表示。`str` 通过 `encode()` 编码为 `bytes`，`bytes` 通过 `decode()` 解码回 `str`：

```python
x = b'ABC'

'ABC'.encode('ascii')   # b'ABC'
'中文'.encode('utf-8')   # b'\xe4\xb8\xad\xe6\x96\x87'
```

- 纯英文的 str 可以用 ASCII 编码为 bytes，内容不变；含中文的 str 只能用 UTF-8 等编码（ASCII 的范围装不下中文，会报错）
- bytes 中无法显示为 ASCII 字符的字节，用 `\x##` 的形式显示
- 解码时如果存在无效字节，可以加 `errors='ignore'` 忽略错误：

```python
b'\xe4\xb8\xad\xff'.decode('utf-8', errors='ignore')  # '中'
```

## 七、len()：字符数还是字节数

`len()` 对 `str` 计算**字符数**，对 `bytes` 计算**字节数**：

```python
len('ABC')                   # 3
len('中文')                  # 2
len(b'ABC')                  # 3
len('中文'.encode('utf-8'))  # 6，每个汉字 3 字节
```

两条经验法则：

- 始终坚持使用 UTF-8 编码对 str 和 bytes 进行转换
- 源代码中包含中文时，保存源码务必使用 UTF-8 编码

## 八、源代码的编码声明

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
```

- 第一行告诉操作系统（Linux / Mac）这个文件是 Python 可执行程序，Windows 下不需要
- 第二行声明按 UTF-8 读取源码，Python 3 默认就是 UTF-8，写上更保险

## 九、格式化字符串的三种方式

**方式一：`%` 运算符（类 C 风格）**

常用占位符：

| 占位符 | 含义 |
|---|---|
| `%s` | 字符串 |
| `%d` | 整数 |
| `%f` | 浮点数 |
| `%.2f` | 浮点数，保留 2 位小数 |
| `%2d` / `%02d` | 整数宽度补空格 / 补 0 |
| `%%` | 输出 `%` 本身 |

```python
print("Hello, %s" % "world")
# Hello, world

print("Hi, %s, you have $%d." % ("Michael", 1000000))
# Hi, Michael, you have $1000000.

print('%2d-%02d' % (3, 1))
#  3-01，%2d 宽度为 2 右对齐，%02d 宽度为 2 补 0

print('%.2f' % 3.1415926)
# 3.14
```

**方式二：`format()` 方法（占位符风格）**

用 `{0}` `{1}` 按序号替换传入的参数，占位符里不带数字则按顺序替换：

```python
print('Hello, {0}, 成绩提升了 {1:.1f}%'.format('小明', 17.125))
# Hello, 小明, 成绩提升了 17.1%
```

**方式三：f-string（Python 3.6+，推荐）**

字符串前加 `f`，需要替换的变量直接用 `{}` 括起来写变量名：

```python
name = '小明'
score = 17.125
print(f'Hello, {name}, 成绩提升了 {score:.1f}%')
# Hello, 小明, 成绩提升了 17.1%
```

## 十、练习记录

原始的 `practice.py` 里有两道题。

**打印以下变量的值**，重点体会原始字符串与多行字符串的输出差别：

```python
n = 123
f = 456.789
s1 = 'Hello, world'
s2 = 'Hello, \'Adam\''
s3 = r'Hello, "Bart"'
s4 = r'''Hello,
Bob!'''

print(n)   # 123
print(f)   # 456.789
print(s1)  # Hello, world
print(s2)  # Hello, 'Adam'
print(s3)  # Hello, "Bart"
print(s4)  # 换行原样保留：Hello, 与 Bob! 各占一行
```

**计算成绩提升的百分点**：小明成绩从去年 72 分提升到今年 85 分，用字符串格式化显示出 `'xx.x%'`，只保留小数点后 1 位：

```python
g1 = 72
g2 = 85
increase = (g2 - g1) / g1 * 100   # 18.0555...
print('%.1f%%' % increase)        # 18.1%
```

注意两个细节：`%.1f` 保留一位小数，`%%` 用来输出百分号本身。

---

> 小结：Day 1 覆盖了 Python 的基本数据类型（整数、浮点数、字符串、布尔值、空值）、变量与常量、两种除法，以及字符编码（ASCII / Unicode / UTF-8）、bytes 与 str 的相互转换、三种字符串格式化方式。日常写代码记住两点：格式化优先用 f-string；编码处理坚持"内存用 Unicode、存储传输用 UTF-8"。
