---
title: Python 学习笔记 Day 4：切片、迭代、列表生成式与生成器
published: 2026-09-12
description: Python 第四天笔记：用切片取 list/tuple/字符串的子集，for 迭代 dict 与 enumerate，列表生成式的条件过滤与两层循环，生成器的两种创建方式（() 与 yield）与执行流程，Iterable 与 Iterator 的区别，以及 trim、杨辉三角等练习。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day4
draft: false
pinned: false
---

> [!NOTE]
> 这是第四天 Python 学习笔记，由入门阶段的练习代码整理而成。Day 2 解决的是"数据怎么存"，Day 3 解决的是"逻辑怎么复用"，今天进入 Python 的**高级特性**：用一行代码完成切片、迭代与推导式，以及"用到才算"的生成器和迭代器。

## 一、切片：取出一个子集

对 list 来说，取前 3 个元素不必写循环，用切片操作符 `:` 就能完成：

```python
L = ['Michael', 'Sarah', 'Tracy', 'Bob', 'Jack']

print(L[0:3])   # ['Michael', 'Sarah', 'Tracy']，取索引 0、1、2
print(L[:3])    # 同上，从头开始时 0 可以省略
print(L[2:5])   # ['Tracy', 'Bob', 'Jack']
print(L[-3:])   # ['Tracy', 'Bob', 'Jack']，倒数第 3 个到最后一个
print(L[-2:-1]) # ['Bob']
```

记住两点：**区间左闭右开**（`L[0:3]` 包含 0、不包含 3），**索引可以是负数**（`-1` 表示最后一个元素）。

如果是从头开始或者一直取到末尾，冒号一侧就可以留空：

```python
L = list(range(100))   # [0, 1, 2, ..., 99]

print(L[:10])    # [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]，前 10 个数
print(L[-10:])   # [90, 91, ..., 99]，后 10 个数
print(L[10:20])  # [10, 11, ..., 19]
```

切片还能带第三个参数——**步长**：

```python
print(L[:10:2])  # [0, 2, 4, 6, 8]，前 10 个数里每 2 个取 1 个
print(L[::5])    # [0, 5, 10, ..., 95]，所有数里每 5 个取 1 个
print(L[:])      # 原样复制一份，快速复制 list 的常用写法
```

### 1. tuple 和字符串也能切片

只要是有序序列就行，而且**结果类型和原对象保持一致**：

```python
T = ('Michael', 'Sarah', 'Tracy', 'Bob', 'Jack')
print(T[0:3])   # ('Michael', 'Sarah', 'Tracy') —— 结果仍是 tuple
print(T[-3:])   # ('Tracy', 'Bob', 'Jack')

S = 'Hello, world!'
print(S[0:5])     # 'Hello'
print(S[-6:-1])   # 'world'，注意取不到最后一个字符 '!'
print(S[::2])     # 'Hlowrd'，字符串每 2 个字符取 1 个
```

### 2. 两个容易忽略的细节

- **切片不修改原对象**，而是返回一个新的 list / tuple / 字符串，所以可以放心用来"读取一部分"。
- **切片索引越界不会报错**，只会自动截断到边界，这是它和 `L[100]` 这种下标访问最大的区别：

```python
L = [1, 2, 3]
print(L[1:100])  # [2, 3]，不报错
print(L[100:])   # []
```

## 二、迭代

给定一个 list 或 tuple，用 for 循环把它里面的元素一个个取出来，这个过程就叫迭代（Iteration）。Python 的 for 循环比 C 的 `for (i = 0; i < n; i++)` 更抽象——**它不关心下标，只关心"能不能被遍历"**。

### 1. 迭代 dict

```python
d = {'a': 1, 'b': 2, 'c': 3}

for key in d:              # 默认迭代 key
    print(key)             # a b c

for value in d.values():   # 迭代 value
    print(value)           # 1 2 3

for key, value in d.items():   # 同时迭代 key 和 value
    print(key, value)      # a 1 / b 2 / c 3
```

> dict 的迭代顺序就是插入顺序（Python 3.7 起这是语言保证的行为）。

### 2. 判断一个对象是否可迭代

list、tuple、dict、set、str 都可以迭代，整数不行。用 `collections.abc` 里的 `Iterable` 来判断：

```python
from collections.abc import Iterable

isinstance('abc', Iterable)       # True，str 可迭代
isinstance([1, 2, 3], Iterable)   # True，list 可迭代
isinstance((1, 2), Iterable)      # True，tuple 可迭代
isinstance(123, Iterable)         # False，整数不可迭代
```

### 3. enumerate：拿到"下标 + 元素"

C 里习惯用 `for (i = 0; i < n; i++)` 同时访问下标和元素，Python 用 `enumerate()` 把 list 变成"索引-元素"对：

```python
for i, value in enumerate(['A', 'B', 'C']):
    print(i, value)
# 0 A
# 1 B
# 2 C
```

### 4. 一次引用多个变量

for 循环里可以直接把每个元素解包到多个变量上：

```python
for x, y in [(1, 1), (2, 4), (3, 9)]:
    print(x, y)
# 1 1
# 2 4
# 3 9
```

这也是后面列表生成式能同时使用两个变量的基础。

## 三、列表生成式

列表生成式（List Comprehension）用来**用一行代码生成 list**。最基本的写法是把要生成的元素放在前面，后面跟 for 循环：

```python
print(list(range(1, 11)))              # [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
print([x * x for x in range(1, 11)])   # [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
```

它等价于下面这段循环 + `append`，但代码更短、逻辑更清晰：

```python
L = []
for x in range(1, 11):
    L.append(x * x)
```

### 1. 加条件过滤

在 for 后面加 `if`，只保留满足条件的元素：

```python
# 只要偶数的平方
print([x * x for x in range(1, 11) if x % 2 == 0])   # [4, 16, 36, 64, 100]
```

### 2. 两层循环

列表生成式里可以写多个 for，类似嵌套循环，比如生成全排列：

```python
print([(x, y) for x in range(1, 4) for y in range(1, 4)])
# [(1, 1), (1, 2), (1, 3), (2, 1), ..., (3, 3)]，共 9 组

print([m + n for m in 'ABC' for n in 'XYZ'])
# ['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ']
```

也可以生成二维列表（比如 10×10 的方阵，每行是 1~10）：

```python
L = []
for x in range(1, 11):
    L.append([y for y in range(1, 11)])

# 等价写法：外层列表生成式里再套一层
L = [[y for y in range(1, 11)] for x in range(1, 11)]
```

### 3. 几个实用例子

**列出当前目录下的所有文件和目录名**，一行就够：

```python
import os   # 导入 os 模块

print([d for d in os.listdir('.')])   # os.listdir 可以列出文件和目录
```

**同时使用两个变量**，把 dict 拼成 `key=value` 的形式：

```python
d = {'a': 1, 'b': 2, 'c': 3}
print([k + '=' + str(v) for k, v in d.items()])   # ['a=1', 'b=2', 'c=3']
```

> 注意 `v` 是整数，字符串拼接前要先用 `str(v)` 转一下，否则 `k + '=' + v` 会报 `TypeError`。

**把一个 list 里所有字符串变成小写**：

```python
L1 = ['Hello', 'World', 'IBM', 'Apple']
L2 = [s.lower() for s in L1]
print(L2)   # ['hello', 'world', 'ibm', 'apple']
```

### 4. for 前面和 for 后面的 if 不是一回事

这是最容易写错的地方：

```python
# for 后面的 if：过滤条件，决定"要不要这个元素"
print([x for x in range(5) if x % 2 == 0])          # [0, 2, 4]

# for 前面的 if：三元表达式的一部分，决定"这个元素长什么样"，必须写完整的 if...else
print([x if x % 2 == 0 else -x for x in range(5)])  # [0, -1, 2, -3, 4]
```

- `for` **前**的 `if...else` 是**表达式**，参与计算最终结果，`else` 不能省略（否则语法错误）。
- `for` **后**的 `if` 是**条件判断**，只负责筛选，不能带 `else`。

## 四、生成器

列表生成式有个问题：它会**一次性把所有元素算出来放进内存**。如果列表有一百万个元素（甚至是无限的），内存就撑不住了。

生成器（generator）保存的不是结果，而是**算法**：在循环过程中不断推算后续元素，用到才算（惰性求值），因此非常省内存。

### 1. 创建方式一：把 `[]` 改成 `()`

```python
g = (x * x for x in range(10))
print(g)   # <generator object <genexpr> at 0x...>

print(next(g))   # 0
print(next(g))   # 1
print(next(g))   # 4
print(next(g))   # 9
# ... 一直取到最后一个元素，再 next(g) 就抛 StopIteration
```

`next()` 一次取一个；取完之后再调用会抛出 `StopIteration` 错误，表示没有更多元素了。

更常见的用法是直接用 for 循环遍历——因为 **generator 也是可迭代对象**，而且 for 会自己处理 `StopIteration`：

```python
g = (x * x for x in range(10))
for n in g:
    print(n)   # 0 1 4 9 16 25 36 49 64 81
```

### 2. 创建方式二：函数里用 `yield`

推算规则比较复杂时，用列表生成式就写不下了，这时改成函数。以斐波那契数列为例：

```python
def fib(max):
    n, a, b = 0, 0, 1
    while n < max:
        yield b          # 原来是 print(b)，改成 yield 就成了 generator
        a, b = b, a + b
        n = n + 1
    return 'done'
```

**只要函数里出现了 `yield`，它就不再是普通函数，而是"生成器函数"**：调用它不会执行函数体，而是直接返回一个生成器对象。

```python
f = fib(6)
for n in f:
    print(n)   # 1 1 2 3 5 8
```

`yield` 的语义是"**产生一个值并暂停执行**"：

- `return b`：返回这个数，函数**结束**；
- `yield b`：返回这个数，函数**暂停在这里**，下次被 next() 唤醒时从下一行继续执行。

普通函数是"顺序执行、遇 return 返回、下次从头再来"，生成器函数则是"执行到 yield 返回并挂起，下次从暂停处接着跑"。

> `return 'done'` 的值不会通过 for 或 `next()` 返回，而是保存在 `StopIteration` 异常的 `value` 里。想拿到它需要手动捕获：
>
> ```python
> f = fib(6)
> while True:
>     try:
>         print('g:', next(f))
>     except StopIteration as e:
>         print('Generator return value:', e.value)   # done
>         break
> ```
>
> for 循环会自动吞掉这个异常，所以用 for 遍历时看不到 `return` 的值。

### 3. 一个关键细节：`o = odd()` 和 `next(odd())`

```python
def odd():
    print('step 1')
    yield 1
    print('step 2')
    yield 3
    print('step 3')
    yield 5
```

**正确用法**：先把生成器对象存到变量里，反复 next 同一个对象。

```python
o = odd()        # 创建 generator 对象，函数体此时并不执行
print(next(o))   # step 1 → 1
print(next(o))   # step 2 → 3
print(next(o))   # step 3 → 5
```

**看起来像、结果完全不同**的用法：

```python
print(next(odd()))   # step 1 → 1
print(next(odd()))   # step 1 → 1
print(next(odd()))   # step 1 → 1
```

为什么永远停在第一次？因为 `odd()` 每次都会**创建一个全新的生成器对象**：

1. 调用 `odd()`：函数体不执行，直接返回一个全新的生成器对象；
2. 调用 `next()`：在这个全新对象上从头开始跑，打印 `step 1`，遇到 `yield 1` 暂停并返回 1；
3. 销毁：这个生成器对象没有被任何变量引用，`next()` 一结束就失去引用，被垃圾回收，连同它的栈帧一起销毁；
4. 下一次 `next(odd())`：又是一个全新的对象，栈帧从头开始，所以永远只走到第一个 `yield`。

换成 `o = odd()` 时，生成器对象被变量 `o` **强引用**，栈帧就被保留在内存里：

- 第一次 `next(o)`：执行到 `yield 1` 暂停，函数的局部变量、执行进度（指令指针）全都被冻结保存；
- 后续 `next(o)`：唤醒这个栈帧，从上次暂停的 yield 下一行继续（打印 `step 2`，遇到 `yield 3` 再暂停），直到函数结束抛出 `StopIteration`，栈帧才真正销毁。

一句话理解：**生成器对象本质上就是一个带着"暂停键"的特殊栈帧**。`odd()` 是工厂，每次调用造一辆新车；`o = odd()` 是造一辆车留着反复开，`next(odd())` 是造一辆车开一米就扔进废品站。

> 还要区分**生成器函数**和**生成器对象**：`odd` / `fib` 是函数，`odd()` / `fib(6)` 才是生成器对象。多次调用生成器函数会得到多个相互独立的生成器，各自维护自己的执行状态。

## 五、迭代器

到这里把三个概念串起来：

| 概念 | 判断标准 |
|---|---|
| 可迭代对象 Iterable | 可以直接用于 for 循环的对象 |
| 迭代器 Iterator | 可以被 `next()` 不断取出下一个值的对象 |
| 生成器 generator | 一种特殊的迭代器，用 `()` 或 `yield` 创建 |

- list、tuple、dict、set、str 都是**可迭代对象**，但它们**不是迭代器**；
- 生成器既是可迭代对象，又是迭代器；
- 迭代器取完元素后，再 `next()` 会抛 `StopIteration`。

用 `isinstance()` 判断，注意 `Iterable` 和 `Iterator` 都从 `collections.abc` 导入：

```python
from collections.abc import Iterable, Iterator

isinstance([1, 2, 3], Iterable)                  # True
isinstance([1, 2, 3], Iterator)                  # False —— list 不是迭代器
isinstance('abc', Iterator)                      # False —— str 也不是
isinstance((x for x in range(3)), Iterator)      # True  —— 生成器是迭代器
```

可迭代对象可以用 `iter()` 转成迭代器，再用 `next()` 逐个取值：

```python
it = iter([1, 2, 3])
print(next(it))   # 1
print(next(it))   # 2
print(next(it))   # 3
print(next(it))   # StopIteration
```

这也解释了 **for 循环的本质**：先对可迭代对象调用 `iter()` 拿到迭代器，然后不断 `next()`，直到捕获 `StopIteration` 就自动结束循环。

迭代器的意义在于它**表示一个数据流**：一个不能提前知道长度的有序序列，只能通过 `next()` 不断取出下一个元素。因为计算是惰性的（只在需要返回下一个元素时才计算），迭代器甚至可以表示**无限大的数据流**，比如全体自然数、全体质数——这是 list 做不到的。

## 六、练习记录

### 1. 用切片实现 trim()

要求：去除字符串首尾的空格，**不能调用 `str.strip()`**。

思路是用两个指针分别从两端向中间找第一个非空格字符，最后用切片截取中间部分：

```python
def trim(s):
    start = 0
    end = len(s) - 1

    # 从左往右找到第一个非空格字符
    while start <= end and s[start] == ' ':
        start += 1

    # 从右往左找到最后一个非空格字符
    while end >= start and s[end] == ' ':
        end -= 1

    # 用切片返回中间部分
    return s[start:end + 1]
```

测试用例覆盖了首尾空格、纯空格和空字符串：

```python
if trim('hello  ') != 'hello':
    print('测试失败!')
elif trim('  hello') != 'hello':
    print('测试失败!')
elif trim('  hello  ') != 'hello':
    print('测试失败!')
elif trim('  hello  world  ') != 'hello  world':
    print('测试失败!')
elif trim('') != '':
    print('测试失败!')
elif trim('    ') != '':
    print('测试失败!')
else:
    print('测试成功!')
```

纯空格时 `start` 会跑到 `end` 右边，`s[start:end + 1]` 正好是空串——切片"越界自动截断"的特性在这里派上了用场。

**换个思路**：既然切片本身支持 `s[1:]` / `s[:-1]`，也可以一边削一边判断，代码更短：

```python
def trim(s):
    while s[:1] == ' ':     # 首字符是空格就削掉
        s = s[1:]
    while s[-1:] == ' ':    # 尾字符是空格就削掉
        s = s[:-1]
    return s
```

### 2. 用列表生成式提取字符串

对一个既有字符串又有整数的 list，提取其中的字符串并统一转成小写：

```python
L1 = ['Hello', 'World', 18, 'Apple', None]
L2 = [s.lower() for s in L1 if isinstance(s, str)]

print(L2)   # ['hello', 'world', 'apple']

if L2 == ['hello', 'world', 'apple']:
    print('测试通过!')
else:
    print('测试失败!')
```

关键在于 `if isinstance(s, str)` 这一句过滤条件：把 `18` 和 `None` 挡在外面，否则对整数调用 `.lower()` 会直接报错。

### 3. 杨辉三角

要求打印前 10 行。规律是**每行首尾都是 1，中间第 j 个数等于上一行第 j-1 个数与第 j 个数之和**：

```python
def triangle(n):
    result = []
    for i in range(n):
        if i == 0:
            result.append([1])          # 第一行
        else:
            row = [1]                   # 每行第一个数总是 1
            for j in range(1, i):
                # 第 j 个数 = 上一行第 j-1 个 + 上一行第 j 个
                row.append(result[i - 1][j - 1] + result[i - 1][j])
            row.append(1)               # 每行最后一个数总是 1
            result.append(row)
    return result
```

返回的是一个**二维列表**：每个元素是一行，每行又是一个独立的 list，各占自己的内存空间、元素个数也各不相同——这点和 C 的二维数组（每行等长、连续内存）很不一样。

```python
n = 0
results = []
for t in triangle(10):
    results.append(t)
    n = n + 1
    if n == 10:
        break

for t in results:
    print(t)
# [1]
# [1, 1]
# [1, 2, 1]
# [1, 3, 3, 1]
# [1, 4, 6, 4, 1]
# ...
```

**拓展**：既然今天学了生成器，杨辉三角可以写成一个"无限产出每一行"的生成器，每一行用列表生成式算出来，正好把今天的内容都用上：

```python
def triangles():
    row = [1]
    while True:
        yield row                                      # 产出当前行
        row = [1] + [row[i] + row[i + 1] for i in range(len(row) - 1)] + [1]

n = 0
for t in triangles():
    print(t)
    n = n + 1
    if n == 10:
        break
```

这里 `while True` + `yield` 就是"无限数据流"的典型写法：函数永远不会结束，需要多少行就取多少行，取完就 `break`。

## 七、小结

Day 4 的主题是**让数据处理变得简洁、让数据按需流动**：

- **切片**：`L[起:止:步长]`，左闭右开、支持负索引，list / tuple / str 通用，结果类型与原来一致，越界自动截断，且不修改原对象。
- **迭代**：for 不关心下标，只要对象可迭代就能遍历；dict 默认迭代 key，`values()` / `items()` 取 value 和键值对；`enumerate()` 同时拿索引和元素；`isinstance(x, Iterable)` 判断可迭代性。
- **列表生成式**：`[表达式 for 变量 in 可迭代对象 if 条件]`，可以两层循环；`for` 前的 `if...else` 是三元表达式（必须写完整），`for` 后的 `if` 只做过滤（不能带 else）。
- **生成器**：`()` 或 `yield` 两种创建方式；惰性求值、节省内存；`yield` = 返回值 + 暂停；生成器对象要靠变量引用才能保存栈帧状态，`next(odd())` 每次都从零开始。
- **迭代器**：Iterable 是"能 for"，Iterator 是"能 next"；list 等是可迭代对象但不是迭代器，生成器两者都是；for 的本质就是 `iter()` + 反复 `next()` + 捕获 `StopIteration`。

从 C 转过来的话，今天最大的冲击大概是"**不用下标也能遍历**"以及"**函数可以中途暂停再继续**"。前者是迭代器和 for 的抽象，后者是生成器的栈帧——`o = odd()` 和 `next(odd())` 那个例子值得多写几遍，把执行流程在脑子里跑顺，生成器这一块基本就通了。
