---
title: Python 学习笔记 Day 6：引用语义、别名与高阶函数
published: 2026-09-14
description: Python 第六天笔记：从官方教程 9.1「名称和对象」理解引用语义——变量是名字不是盒子、别名、== 与 is 的区别、小整数缓存、函数参数传的是对象引用、元组的不可变只锁槽位；下半场进入函数式编程，函数作为对象与参数、map / reduce / filter 与 lambda，配 pythontutor 箭头图。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day6
draft: false
pinned: false
---

> [!NOTE]
> 这是第六天 Python 学习笔记。Day 5 偏"查表"，今天回到两件更底层的事：**上半场补引用语义这笔债**——`b = a` 到底发生了什么，为什么函数能悄悄改掉你传进去的列表；**下半场开一个新口子**——函数式编程（函数是对象、`map` / `reduce` / `filter`）。
>
> 上半场的例子我逐个贴进了 [Python Tutor](https://pythontutor.com/) 看箭头怎么指，配图就是那些内存模型截图。**"Python 变量是名字，不是盒子"**这一句是整篇的主线，看懂它，六个小问题基本是一句话推出来的。

## 一、变量是名字，不是盒子

官方教程第 9.1 节「名称和对象」讲的就是这件事（URL 里带 `classes` 别被吓到，9.1 排在任何类知识之前）。核心一句话：

> **Python 的赋值不复制数据，只是把一个名字绑定到对象上。**

多个名字（甚至来自多个作用域的名字）可以绑到同一个对象上，这就叫**别名（aliasing）**。

### 1. `b = a` 之后有两个名字、一个对象

```python
a = [1, 2, 3]
b = a          # a 和 b 是同一个列表的两个名称，互为别名
b.append(4)
print(a)       # [1, 2, 3, 4] —— a 也变了
```

`b = a` 这一步没有产生第二个列表。画出来更直观——右边 Frames 里 `a`、`b` 两个名字各伸出一根箭头，**指向 Objects 里同一个 list**：

[![b = a 之后 a、b 两根箭头指向同一个列表](/posts/python-learning-day6/alias-append.png)](/posts/python-learning-day6/alias-append.png)

这个机制在 C++ 里有个精确的对应物：**引用传递**。

```cpp
void function(int &a) { ... }   // 定义：a 是引用
function(b);                    // 调用：函数里的 a 就是 b 的别名
```

Python 传参不需要 `&`，因为**它传的一直都是对象本身的名字绑定**，不存在"值拷贝"这条默认路径。

### 2. 不同作用域的名字也能绑同一个对象

```python
data = []

def f():
    data.append(1)     # 这里的 data 不是新变量，就是外面那个 data

f()
print(data)   # [1]
```

函数体里没写 `global data` 却没有报错，因为 `data.append(1)` 是**通过名字找到对象、再改对象**，不是给 `data` 重新赋值。真要 `data = [...]` 就得先声明 `global`（或者用 `nonlocal`）——这是 Day 3 参数体系之外的另一条作用域规则。

### 3. 不可变对象"看起来像修改"，其实是换了绑定

| 写法 | 看起来 | 实际发生 |
|---|---|---|
| `a = 1; a = a + 1` | 改了 a | 算出一个新对象 `2`，把名字 `a` 挪过去绑它 |
| `a = [1, 2]; a.append(3)` | 改了 a | 在**原来那个**列表对象上加了一个元素 |

第一行了结了 C 转过来最大的一个误会：Python 里没有"往一块内存里重新写个数"，只有"把名字贴纸撕下来贴到别的对象上"。所以：

- **不可变对象（int / str / tuple）通过别名共享通常是安全的**——想"改"它只能造新对象，动不到别人头上；
- **可变对象（list / dict / set）通过别名一改就全都变**——意外也来自这里。

## 二、`==` 与 `is`：比值还是比对象

```python
a = [1, 2, 3]
b = a

print(a == b)    # True，值相等
print(a is b)    # True，指向同一个对象
print(id(a))     # 一个内存地址，每次运行都不同
print(id(b))     # 与 id(a) 相同 —— is 为 True 的本质
print(id(a) == id(b))   # True，is 判断的就是这个
```

- `==` 比较**两个对象的值**（背后是 `__eq__`）；
- `is` 比较**是不是同一个对象**（等价于 `id(a) == id(b)`）。

内存模型里就是"两根箭头指向同一个格子"：

[![a 和 b 两根箭头指向同一个 list，所以 == 与 is 同时为 True](/posts/python-learning-day6/is-vs-eq.png)](/posts/python-learning-day6/is-vs-eq.png)

反过来，值相等但对象不同：

```python
print([1, 2] == [1, 2])   # True
print([1, 2] is [1, 2])   # False —— 两个不同的列表对象
```

### 1. 判断 None 为什么一律用 `is`

```python
if x is None:      # ✅ 唯一推荐写法
    ...
```

`None` 是**单例**对象：整个进程里只有它一个实例，所有"空"都指向它。所以判断"是不是 None"本质就是判断"是不是绑到了那个唯一对象"，用 `is` 语义最准，也最快（不做任何 `__eq__` 调用）。

用 `==` 会踩两个坑：自定义类可以重写 `__eq__`，`x == None` 未必是 False；而 `0 == False == ''` 都为 True，`if x == None` 这类写法一旦写顺手，很容易把"值为假"和"值为 None"混成一谈。

### 2. `x, y = 10, 10` 为什么 `x is y` 是 True

```python
x, y = 10, 10
print(x is y)   # True
```

**这是 CPython 的小整数缓存造成的巧合，不能依赖。** CPython 预先建好 `-5 ~ 256` 这一批整数对象反复复用（小整数用得太频繁，每次都新建太浪费），所以这两个 `10` 绑的是同一个对象。

超出缓存区间就不一定了：同一段代码里写两个 `1000`，编译器会把它们合并成同一个常量对象，`is` 又是 True；而分处两个独立代码对象（比如交互式环境里一行一行敲）的两个 `1000`，`is` 就是 False：

```python
# 两个独立的代码对象里各自创建 1000
g1, g2 = {}, {}
exec("a = 1000", g1)
exec("b = 1000", g2)
print(g1['a'] is g2['b'])   # False —— 两个不同的 int 对象

# 换成 256：在缓存区间内，两次拿到的是同一个对象
g3, g4 = {}, {}
exec("a = 256", g3)
exec("b = 256", g4)
print(g3['a'] is g4['b'])   # True
```

结论很干脆：**`is` 只用来比 `None`、`True/False`、`Ellipsis` 这类单例，比值一律用 `==`。** 反过来也别用 `is` 去比字符串图省事，能不能命中取决于有没有被 intern，属于"今天对明天错"的那类代码。

## 三、函数参数传的是什么

```python
def f(nums):
    nums.append(9)

a = [1, 2, 3]
f(a)
print(a)   # [1, 2, 3, 9] —— 外面跟着变了
```

调用前，全局帧里只有 `f`（指向函数对象）和 `a`（指向那个列表）：

[![调用前：Global frame 里 f 指向函数、a 指向列表](/posts/python-learning-day6/func-arg-call.png)](/posts/python-learning-day6/func-arg-call.png)

进入函数后，多了一个名为 `f` 的局部帧，里面的形参 `nums` 伸出的箭头**和 `a` 指向同一个列表**：

[![函数体内：局部帧的 nums 与全局的 a 指向同一个 list](/posts/python-learning-day6/func-arg-frame.png)](/posts/python-learning-day6/func-arg-frame.png)

所以规则是这两句，背下来不如理解：

> **函数修改可变参数，调用者可见；函数重新绑定形参，调用者不可见。**

第二句实测一下：

```python
def g(nums):
    nums = [9, 9]      # 只是把局部名字 nums 挪去绑一个新列表

b = [1, 2, 3]
g(b)
print(b)   # [1, 2, 3] —— 原列表毫发无损
```

`g` 里那行赋值改的是"名字贴纸贴在哪"，出了函数这个局部名字就销毁了，跟外面的 `b` 毫无关系。想让函数换掉调用者的列表，得写 `b[:] = [9, 9]`（切片赋值，真的原地改内容）或者干脆 `return` 新列表让调用者自己接。

顺带解释了为什么 Python 传大对象不心疼：**传参只传一个引用**，实现层面就是一个指针的代价，跟列表里是一百万元素还是十个元素无关。C 里要避免大结构体值拷贝得手动改成传指针，Python 反过来——想省内存不需要做任何事，想**隔离**才需要（显式拷贝）。

## 四、元组的"不可变"不可变的是什么

```python
t = ([1, 2],)
t[0].append(3)
print(t)   # ([1, 2, 3],) —— 居然成功了
```

"不可变"的元组被改了？没有。元组不可变指的是**它那一排引用槽不能换**：

```python
t[0] = [9, 9]
# TypeError: 'tuple' object does not support item assignment
```

`append` 没有动槽，它动的是**槽里那个列表自己**——槽仍然指向同一个列表对象，只是那个对象的内容长了。所以"元组不可变"保护的是"哪些对象在元组里"，不保护"那些对象自己变成什么样"。

这条正好和 Day 5 的浅拷贝是同一层意思：`nested = [[1,2],[3]]` 浅拷贝出来的外层是新的，内层还是共享的引用。判断"会不会互相影响"，永远问一句：**这次操作换的是名字绑定，还是对象内容？**

## 五、别名带来的收益与风险

收益前面都见过了：传参便宜、多个名字共享同一份数据、`a[:]` 之类的操作不用先复制。风险只有一条——**你以为改的是副本，其实改的是原件**。

典型场景（也是今晚的口头验收题）：把检索出来的一批结果 `list` 存进缓存，又把它交给下游函数处理，下游写了 `results.append(...)` 或 `results.sort()`，缓存里那份跟着变，而且没有任何报错提示你。规矩是：

- 数据交给别人（函数 / 别的模块）之前，如果它可能被改，就传**显式副本**：`data.copy()`（浅）或 `copy.deepcopy(data)`（嵌套结构）；
- 函数文档里写清楚"原地修改"还是"返回新对象"——`list.sort()` 和 `sorted()` 就是这两种风格的标准例子。

---

> 下半场开始。上面讲的是"名字和对象"，接下来是"**函数也是对象**"——一旦函数能像列表那样被赋值、被传参，就进入了函数式编程的地盘（廖雪峰第 8 章 8.1 / 8.2）。

## 六、函数本身也是对象

```python
f = abs            # 变量可以指向函数
print(f(-10))      # 10
```

在 Python 里**函数名就是一个普通变量**，指向一个函数对象。这意味着它可以被赋值、被塞进列表、当参数传——也意味着它可以被覆盖：

```python
abs = 10
abs(-10)
# TypeError: 'int' object is not callable
```

> [!WARNING]
> 这个坑我在自己的练习代码里真踩了一次：把变量起名成 `list`，后面想用 `list(...)` 转换时就炸了。
>
> ```python
> list = [1, 2, 3, 4, 5]      # 覆盖了内置的 list
> list2 = map(str, list)
> print(list(list2))
> # TypeError: 'list' object is not callable
> ```
>
> 内置名（`list` / `dict` / `sum` / `max` / `id` …）一律不要拿来当变量名。覆盖之后连"把它改回来"都做不到——`list` 这个名字已经指向你的列表了，只能重启解释环境。

### 把函数当参数传

```python
def add(x, y, f):
    return f(x) + f(y)

print(add(-5, 6, abs))   # 11，abs(-5) + abs(6) = 5 + 6
```

这就是"高阶函数"的定义：**能接收函数作为参数，或者能返回函数的函数**。C 里要靠函数指针，Java 里要靠接口或 lambda，Python 里就是普通传参——因为函数本来就是对象。

## 七、map：把函数依次作用于每个元素

```python
def square(x):
    return x * x

m = map(square, [1, 2, 3, 4, 5])
print(type(m).__name__)   # map
print(list(m))            # [1, 4, 9, 16, 25]
```

签名是 `map(函数, 可迭代对象)`，把函数作用到每个元素上，**返回一个新的迭代器**。两个要点：

1. **它是惰性的**——`map(...)` 那一步一个元素都还没算，`list()` 才驱动计算；
2. **迭代器只能消费一次**（Day 4 的结论在这里落地了）：

```python
m = map(square, [1, 2, 3, 4, 5])
print(list(m))   # [1, 4, 9, 16, 25]
print(list(m))   # [] —— 已经取完了
```

类型转换是最常用的一类：`map(str, [1, 2, 3])` → 逐个变成 `'1' '2' '3'`，配合 `join` 就能拼字符串。

**练习**：把不规范的名字统一成"首字母大写、其余小写"。

```python
def normalize(name):
    return name[0].upper() + name[1:].lower()

print(list(map(normalize, ['adam', 'LISA', 'barT'])))
# ['Adam', 'Lisa', 'Bart']
```

`name[1:]` 用的是 Day 4 的切片。这里有个边界情况：`normalize('')` 会抛 `IndexError: string index out of range`，因为 `name[0]` 取空串的第一个字符。用内置的 `capitalize()` 更稳（它对空串返回空串）：`name.capitalize()`，或者切片写法 `name[:1].upper() + name[1:].lower()`——`name[:1]` 在空串时返回 `''` 而不是报错，正是 Day 4 说的"切片越界自动截断"。

## 八、reduce：把序列累积成一个值

`map` 是"一对一"，`reduce` 是"多合一"：把函数作用在头两个元素上，结果再和下一个元素继续作用，最后收成**一个值**。它不在内置名里，要从 `functools` 导入。

```python
from functools import reduce

def add(x, y):
    return x + y

print(reduce(add, [1, 2, 3, 4, 5]))   # 15
```

签名 `reduce(函数, 序列)`，那个函数**固定收两个参数**：累计结果和当前元素。

**把数字序列拼成整数**，能看清 reduce 的递推结构：

```python
def fn(x, y):
    return x * 10 + y

print(reduce(fn, [1, 3, 5, 7, 9]))   # 13579
# ((((1*10+3)*10+5)*10+7)*10+9)
```

**`map` + `reduce` 组合：自己实现 `int()`**

```python
def str2int(s):
    digits = {'0': 0, '1': 1, '2': 2, '3': 3,
              '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9}

    def char2num(c):                       # 字符 -> 数字
        return digits[c]

    def fn(x, y):                          # 累计值 * 10 + 当前数字
        return x * 10 + y

    return reduce(fn, map(char2num, s))    # 先映射成 [1,3,5,7,9]，再拼成 13579

print(str2int('13579'))   # 13579
```

分工很清楚：`map` 负责"每个字符各自变成一个数字"（形状不变），`reduce` 负责"把一串数字压成一个整数"（多合一）。

### `lambda`：没有名字的函数

`char2num` 和 `fn` 都只有一行、只用一次，为它们各起一个名字有点浪费。`lambda` 就是就地写出来的匿名函数：

```python
lambda x: x * x          # 等价于 def f(x): return x * x
```

只能是一个表达式，自动返回它的值，没有 `return`、没有多行。整个 `str2int` 可以压成一行：

```python
DIGITS = {'0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9}

def str2int(s):
    return reduce(lambda x, y: x * 10 + y, map(lambda c: DIGITS[c], s))
```

> [!TIP]
> `lambda` 的代价是可读性。逻辑超过"一眼能看完"就老老实实写 `def` 并起个说人话的名字——调试时 traceback 里 `<lambda>` 这种栈帧名也没什么帮助。

**练习**：用 `reduce` 写一个求积的 `prod()`。

```python
def prod(L):
    return reduce(lambda x, y: x * y, L)

print('3 * 5 * 7 * 9 =', prod([3, 5, 7, 9]))   # 945
```

## 九、filter：按真假保留元素

`filter(函数, 序列)`：把函数依次作用于每个元素，返回值为 `True` 的保留、`False` 的丢掉。**它返回的同样是迭代器**，和 `map` 一样要 `list()` 才看到结果。

```python
def is_odd(n):
    return n % 2 == 1

print(list(filter(is_odd, [1, 2, 4, 5, 6, 9, 10, 15])))
# [1, 5, 9, 15]
```

**过滤空字符串**这个例子值得多看一眼：

```python
def not_empty(s):
    return s and s.strip()

print(list(filter(not_empty, ['A', '', 'B', None, 'C', '  '])))
# ['A', 'B', 'C']
```

`s and s.strip()` 用的是 `and` 的短路特性（Day 1 布尔运算那一节）：`s` 为空串或 `None` 时整个表达式直接是假值，压根不会去调用 `.strip()`（否则 `None.strip()` 就炸了）；`s` 非空时返回 `s.strip()` 的结果，全空格串 `strip()` 后变成 `''`，仍然是假值，于是 `'  '` 也被滤掉。**用一个表达式同时完成"判空 + 判纯空格"**，比写两个 `if` 干净。

**练习：用 filter 筛回数**（从左读和从右读一样，如 12321、909）：

```python
def is_palindrome(n):
    s = str(n)
    return s == s[::-1]      # Day 4 的切片反转

output = filter(is_palindrome, range(1, 1000))
print('1~1000:', list(output))
# [1, 2, ..., 9, 11, 22, ..., 99, 101, 111, 121, ..., 999]
```

和 Day 5 那个字符串回文判断是同一个思路，只是这里 `filter` 把"判断函数"直接当筛选器用，不用自己写 `for` + `append`。

### 压轴：用 filter 筛素数

这段是今天看到的最漂亮的一段代码，它把**生成器 + 高阶函数 + 闭包**三样东西叠在一起（筛选法求素数）：

```python
def _odd_iter():
    n = 1
    while True:
        n = n + 2
        yield n                      # 3, 5, 7, 9, 11, ... 无限奇数流

def _not_divisible(n):
    return lambda x: x % n > 0       # 返回一个函数！它"记得"外面的 n

def primes():
    yield 2
    it = _odd_iter()                 # 初始序列：无限奇数
    while True:
        n = next(it)                 # 拿到当前最小的候选数
        yield n                      # 它是素数，交出去
        it = filter(_not_divisible(n), it)   # 用"不能被 n 整除"过滤剩下的流

for n in primes():
    if n < 100:
        print(n)
    else:
        break
# 2 3 5 7 11 13 17 19 23 29 31 ... 89 97（100 以内共 25 个）
```

跑起来的过程是这样：

1. 先 `yield 2`；
2. 从奇数流取 `3` → 产出 `3` → 把流换成"过滤掉 3 的倍数"的新流；
3. 从新流取 `5` → 产出 `5` → 再套一层"过滤掉 5 的倍数"；
4. 每找到一个素数，就往管道上**再叠一层 filter**，后面的数要闯过所有已知的关卡才算素数。

妙处在两点。其一是 `_not_divisible(n)` **返回函数**——`lambda x: x % n > 0` 里的 `n` 是外层函数的参数，这个 lambda 把 `n` 带走了（闭包）。每循环一次就生成一个"绑定了不同 n 的"新过滤函数，互不干扰。其二是**整条链是惰性的**：`_odd_iter()` 里 `while True` 的无限奇数流从来没有真的被生成过，`filter` 也只是迭代器，谁 `next()` 谁才算一步——所以"无限多个素数"这件事在内存里完全不占地方，`for` 里 `break` 就停。

这正好接上 Day 4 的生成器：**惰性求值 + 函数组合 = 能描述无限序列的管道**。闭包和它那个著名的坑（循环里建函数、`n` 被共享）留到后面几天专门整理。

## 十、小结

**上半场：引用语义**

- **赋值即绑定**：Python 的变量是贴在对象上的名字贴纸，`b = a` 不复制数据，只多一个名字；`a`、`b` 是同一个对象的别名。
- **可变 vs 不可变**：不可变对象的"修改"其实是换绑定（`a = a + 1` 造了新对象），所以别名共享通常安全；可变对象（list / dict / set）一改全改，需要独立副本时必须显式 `copy()` / `deepcopy()`。
- **`==` 比值，`is` 比对象**（等价于比 `id()`）；`None` 是单例所以永远用 `is`；`x, y = 10, 10` 的 `x is y` 为 True 只是 CPython `-5~256` 小整数缓存的巧合，不能依赖。
- **传参传的是对象引用**：函数改可变参数调用者看得见，重新绑定形参调用者看不见；代价只是一个指针，所以大对象传参天然便宜。
- **元组的不可变只锁"槽"**：`t[0].append(3)` 改的是槽里那个列表自己，`t[0] = [9, 9]` 才是动槽，会 `TypeError`。

**下半场：函数式编程**

- **函数是对象**：能被赋值、能进列表、能当参数传，因此函数名也就是普通变量——别用内置名（`list`、`dict`、`sum`…）当变量名，覆盖了就换不回来。
- **`map(f, it)`** 一对一、**`filter(pred, it)`** 按真假保留，两者都返回**惰性且只能消费一次**的迭代器；**`reduce(f, it)`**（在 `functools`）多合一，`f` 固定收"累计值 + 当前元素"两个参数。
- **`lambda`** 是只能有一个表达式、自动返回的匿名函数，适合"用一次的一行逻辑"，长了就换 `def`。
- **高阶函数 + 生成器 = 惰性管道**：筛素数那段 `filter(_not_divisible(n), it)` 每层过滤函数各自闭包了自己的 `n`，整条链按需计算，能描述无限序列。

今天两张 pythontutor 截图解决的是"脑子里要有图"这件事：以后碰到 `is` / 别名 / 函数改不改原对象的问题，先在纸上画名字和箭头，再猜输出，最后跑一遍验证——猜错的那几个才是真正学到的。
