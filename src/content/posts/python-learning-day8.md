---
title: Python 学习笔记 Day 8：默认参数、闭包与装饰器
published: 2026-09-16
description: Python 第八天笔记，上下两半场把"名字绑定"这条线走完。上半场：默认值只在函数定义时求值一次（用 __defaults__ 和它的 id 直接打印证据）、None 哨兵为什么必须是 None、元组默认值"安全但没法用"、函数传参两条规则、`+=` 在 list 与 tuple 上行为相反的完整原因、`a[0] += [3]` 这个先改完再抛异常的坑，外加浮点数与 Decimal。下半场：函数作为返回值与闭包、循环里建函数的晚绑定坑及三种修法、nonlocal、装饰器与三层嵌套、functools.wraps 到底补回了什么、偏函数 partial。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day8
draft: false
pinned: false
---

> [!NOTE]
> 这是第八天 Python 学习笔记。Day 6 说"变量是贴在对象上的名字贴纸，赋值不复制数据"，Day 7 说"要独立副本必须显式拷贝"。今天把这条线走完，而且一次走完两段：
>
> **上半场**把它用在**函数**上——默认参数、传参、`+=`，三个问题共用同一把钥匙；**下半场**把它用在**函数对象**上——返回函数、闭包、装饰器，也就是"函数也是对象"这句话真正开始产生红利的地方。
>
> 一条主线贯穿全天：**默认值、闭包里的自由变量、装饰器返回的 wrapper，全都是"某个名字一直绑着某个对象"这一件事的不同形态。** 每个例子都跑过，注释里的输出是实测值。

## 一、默认值在**定义时**求值一次

```python
def bad(item, lst=[]):
    lst.append(item)
    return lst

print(bad(1), bad(2))     # [1, 2] [1, 2]
```

第二次调用不是 `[2]`，也不是"重新从 `[]` 开始"，而是接着第一次的结果往下 append。

`print` 两格都显示 `[1, 2]` 还有一层原因：两次调用返回的是**同一个对象**，而 `print` 要等所有实参都求值完才开始格式化——那时候那个列表已经是最终形态了。

### 1. 用 `__defaults__` 把口诀变成看得见的东西

"默认值在定义时求值一次"如果只是一句口诀，明天就会忘。但它有个能直接打印出来的窗口：

```python
def f(item, lst=[]):
    lst.append(item)
    return lst

print(f.__defaults__)                # ([],)
print(id(f.__defaults__[0]))         # 2823348808832
f(1)
print(f.__defaults__)                # ([1],)          ← 内容变了
print(id(f.__defaults__[0]))         # 2823348808832   ← 地址没变
f(2)
print(f.__defaults__)                # ([1, 2],)
print(id(f.__defaults__[0]))         # 2823348808832   ← 还是同一个对象
```

`__defaults__` 是**函数对象身上的一个元组属性**，存着所有默认值对象。三次 `id()` 完全相同（具体数字每次运行都不一样，重点是三次必须一样）：那个列表从 `def` 执行那一刻起就没换过，只是内容一直在长。

画出来更直接：

```text
f (函数对象) ──► __defaults__ 元组 ──► 列表#1   ← 全进程只有这一个
                                          ↑
每次调用不传 lst 时，形参 lst 就绑到它 ────
```

**默认值不是"调用时给的一个初值"，它是函数对象的一个属性的值**，跟着函数活一辈子。模块级函数活得和进程一样久，所以这个列表也就一样久。

### 2. 正确写法：`None` 哨兵

```python
def good(item, lst=None):
    lst = [] if lst is None else lst
    lst.append(item)
    return lst

print(good(1), good(2))     # [1] [2]   ← 每次都是新列表
```

为什么哨兵**必须是 `None`**，不能是别的假值？因为要区分的是这两种调用：

```python
caller = []
good(1, caller)     # 调用者显式传了一个空列表，希望结果累积进 caller
good(2)             # 调用者什么都没传，希望函数自己新建一个
```

这两种情况传进来时都"看起来像空"。只有 `None` 能一刀切开——**它是单例**，`lst is None` 一次身份比较就能精确判定"到底有没有传"，而且 `None` 永远不可能被误当成一个真列表。这正是 Day 6 那条"判断 None 永远用 `is`"在真实设计里的用法。

> [!TIP]
> 反过来看：如果哨兵写成 `lst=[]`，它和"默认值"就是同一个东西了，函数一打开就掉回第一节的坑。**哨兵的价值恰恰在于它一定不是一个可用的容器。**

### 3. 元组默认值：安全，但没法用

```python
def f_tuple(item, lst=()):
    lst.append(item)

f_tuple(1)
# AttributeError: 'tuple' object has no attribute 'append'
```

**"安全"和"能跑"是两件事。** 元组不可变，所以它绝不会像 `[]` 那样跨调用偷偷攒数据——从"不污染调用者"这个角度看它确实安全；但函数体里的 `append` 当场 `AttributeError`，函数根本没法用。

真要拿不可变值当默认参数，写法得连函数体一起换：

```python
def f_ok(item, lst=()):
    return lst + (item,)        # 造一个新元组返回，不动原来的

print(f_ok(1), f_ok(2))         # (1,) (2,)   ← 每次独立
print(f_ok(1, (9,)))            # (9, 1)
```

代价是每次 `lst + (item,)` 都要整个复制一遍，O(n)；而且**调用者不接返回值就什么都看不见**（第二节）。

## 二、函数传参的两条规则

传参时 Python 只做一件事：**把对象绑到形参这个名字上**。于是函数体里的操作分成两类，对外界的影响完全相反：

```python
def f1(nums):
    nums.append(9)          # 改对象

def f2(nums):
    nums = nums + [1]       # 换绑定

p1 = [1, 2]; f1(p1); print(p1)    # [1, 2, 9]  ← 改到外面了
p2 = [1, 2]; f2(p2); print(p2)    # [1, 2]     ← 没改到
```

| 函数体里的写法 | 动的是 | 调用者看得见吗 |
|---|---|---|
| `nums.append(x)` / `nums[0] = x` / `nums.clear()` | **对象内容** | ✅ 看得见（`nums` 和外面那个名字是同一个对象） |
| `nums = ...` / `nums = nums + [x]` | **局部名字的绑定** | ❌ 看不见（栈帧一销毁，这个局部名字就没了） |

判断只问一句：**这次操作换的是"名字→对象"的绑定，还是对象自己的内容？**

## 三、`+=` 到底算哪一类

`+=` 是**运算符**，不是赋值语句，它会先尝试调用对象的 `__iadd__`。这就导致同一个写法在两种类型上行为相反：

```python
def f3(nums):
    nums += [1]             # list 有 __iadd__ → 原地 extend

p3 = [1, 2]; f3(p3); print(p3)     # [1, 2, 1]  ← 改到外面了！

def t3(nums):
    nums += (1,)            # tuple 没有 __iadd__ → 退化成 nums = nums + (1,)

q3 = (1, 2); t3(q3); print(q3)     # (1, 2)     ← 改不到外面
```

于是那道经典题的完整答案是：

```python
p = [1, 2, 3]

q = p + [4]     # 造一个新列表绑给 q，p 不动                      → p 仍是 [1,2,3]
r = p
r += [4]        # list.__iadd__ 原地 extend，r 和 p 还是同一个对象  → p 变成 [1,2,3,4]
```

**`r += [4]` 会改掉原来的 `p`，`q = q + [4]` 不会。** 钥匙是：`+=` 作用在可变对象上时是"改内容"，作用在不可变对象上时因为找不到 `__iadd__` 才退化成"造新的 + 换绑定"。**同一个写法，行为取决于左边那个类型有没有 `__iadd__`**——这类题记不住口诀，只能回去看 Day 6 那张"名字和箭头"的图。

### 1. 最阴的一题：先改完，再抛异常

```python
a = ([1, 2],)
try:
    a[0] += [3]
except TypeError as e:
    print('TypeError:', e)     # 'tuple' object does not support item assignment

print(a)                       # ([1, 2, 3],)  ← 报错了，但元素真的被改了！
```

`a[0] += [3]` 其实是两步：

1. `a[0].__iadd__([3])` → **原地把内层列表改成长了的样子**（这一步成功，副作用已经发生）；
2. 把结果写回槽位 `a[0] = ...` → 元组不可变，**这一步才抛 `TypeError`**。

异常是在副作用**之后**抛的。所以"报错了应该什么都没变吧"这个直觉在这里是错的——数据已经改完了，只是你没接到返回值。这一题把 Day 7 的"元组的不可变只锁槽位，不锁槽里那个对象"和今天的"`+=` 走 `__iadd__"`叠在了一起。

## 四、真实后果：把可变默认参数当缓存

这个坑在生产里长这样：

```python
def add_result(doc, cache=[]):        # ❌ 看着人畜无害
    cache.append(doc)
    return cache

print(add_result({'id': 1}))          # [{'id': 1}]
print(add_result({'id': 2}))          # [{'id': 1}, {'id': 2}]  ← 第二次带着第一次的结果
```

三条后果，一条比一条难查：

1. **跨调用累积**。模块级函数只在导入时定义一次，这个列表的生命周期等于进程。Web 服务里"每个请求的检索结果"会变成"全进程所有历史请求的结果"——第 1000 个请求拿到前 999 个的文档。
2. **内存只涨不降**。默认值被函数对象引用着，永远不是垃圾，回收不掉，是慢性泄漏。
3. **串数据**。A 用户能看到 B 用户的检索结果，这是正确性和安全问题，不只是性能问题。

而且它**一行报错都没有**，单跑一次测试永远是绿的。

> [!TIP]
> 判断标准可以背下来：**默认值只放不可变对象（`None` / 数字 / 字符串 / 元组 / `frozenset`）。** 需要"每次调用一份新容器"就用 `None` 哨兵在函数体里建；需要跨调用共享的缓存，就做成显式的对象、带明确的生命周期（`dict` + TTL、`functools.lru_cache`），而不是偷偷藏在函数默认值里。

## 五、函数能看见哪些作用域

第一~四节都在讲"名字绑到哪个对象"，那自然要问：**一个名字在哪些地方能被找到？**

```python
data = []

def f():
    data.append(1)      # ✅ 能读到外面的 data，改的就是那个对象

f()
print(data)             # [1]
```

函数体里没写 `global` 也不报错，因为 `data.append` 是**通过名字找到对象、再改对象**。但要**改写绑定**就得显式声明：

```python
def outer():
    x = 0
    def fn():
        nonlocal x      # 没有这一行，x = x + 1 会先抛 UnboundLocalError
        x = x + 1
        return x
    return fn

inc = outer()
print(inc(), inc(), inc())    # 1 2 3
```

而**类作用域是个例外**——方法看不见自己所在类里绑定的名字：

```python
class Solution:
    from itertools import accumulate        # 绑在类命名空间里 = Solution.accumulate

    def runningSum(self, nums):
        return list(accumulate(nums))       # ❌ NameError: name 'accumulate' is not defined
```

方法体的名字查找链是 **局部 → 外层函数 → 全局 → 内置**，**类那一层不在这条链上**。`accumulate` 确实被导入了，但它躺在 `Solution.accumulate`，方法够不着。修法是放到文件最顶上，或者放进函数体里（函数局部作用域，自己看得见）：

```python
from itertools import accumulate            # ✅ 全局，方法能看见

def running_sum(nums):
    from itertools import accumulate        # ✅ 局部，自己看得见
    return list(accumulate(nums))
```

> [!WARNING]
> 同一段代码换个解释器还有另一种死法：力扣提交时语言下拉框要选 **Python3**。选成 `Python`（2.7）的话，`def runningSum(self, nums: List[int]) -> List[int]:` 这一行的 `->` 会直接 `SyntaxError`——Python 2 没有返回值注解语法，而报错信息只会指到第 3 行，看不出真正原因。

## 六、浮点数：三行实测

```python
print(0.1 + 0.2)          # 0.30000000000000004
print(round(2.675, 2))    # 2.67   ← 不是 2.68
print(0.1 + 0.2 == 0.3)   # False
```

这不是 Python 的 bug，是 IEEE 754 二进制浮点的固有结果：`0.1` 换成二进制是无限循环小数（就像 `1/3` 在十进制里写不尽），存下来只能是最接近它的近似值，两个近似值一加就露出尾巴。

`round(2.675, 2)` 也一样，因为 `2.675` 真实存的是：

```text
2.67499999999999982236431605997495353221893310546875
```

它本来就小于 2.675，"四舍五入"当然往下。

钱、分数、百分比一律用 `Decimal`：

```python
from decimal import Decimal
print(Decimal('0.1') + Decimal('0.2') == Decimal('0.3'))    # True
```

> [!WARNING]
> **`Decimal` 必须传字符串。** `Decimal(0.1)` 会把 float 的误差原样带进来：
>
> ```python
> Decimal(0.1)   # Decimal('0.1000000000000000055511151231257827021181583404541015625')
> ```
>
> 误差一点没消，只是变长了。更省事的老办法是干脆别用小数：**金额先乘成"分"存成 `int`**。判断浮点相等一律用 `math.isclose(a, b)` 或 `abs(a - b) < 1e-9`，永远不要 `==`。

---

> 上半场结束。上面全是"名字绑着对象、对象活得比想象中久"；下半场从一件更轻的事开始——**函数本身也就是个对象**，于是它能被返回、被包住、被替换。

## 七、把函数当返回值：闭包

普通求和函数算完就走：

```python
def calc_sum(*args):
    ax = 0
    for n in args:
        ax = ax + n
    return ax
```

但"现在就算出来"不一定是想要的。可以**不返回结果，返回一个"以后随时能算"的函数**：

```python
def lazy_sum(*args):
    def sum_func():
        ax = 0
        for n in args:            # args 是外层函数的参数
            ax = ax + n
        return ax
    return sum_func

f = lazy_sum(1, 3, 5, 7, 9)
print(f)        # <function lazy_sum.<locals>.sum_func at 0x...>  ← 这是函数，不是结果
print(f())      # 25                                              ← 调用它才算
```

两个点：

1. **`args` 本该随 `lazy_sum` 返回而销毁，却因为被内层函数引用着而活了下来。** 这就是闭包：函数 + 它带走的那套自由变量。和第一节"默认值跟着函数对象活一辈子"是同一件事的两种形态——都是"有个名字一直绑着某个对象"。
2. **每次调用 `lazy_sum` 都返回一个全新的函数对象**，哪怕参数一样：

```python
f1, f2 = lazy_sum(1, 3, 5), lazy_sum(1, 3, 5)
print(f1 == f2, f1 is f2)   # False False
print(f1())                 # 9
print(f1.__name__)          # sum_func  ← 函数对象的 __name__ 属性，下一节要用
```

## 八、闭包的第一坑：循环里建的函数共享同一个变量

```python
def count():
    fs = []
    for i in range(1, 4):
        def f():
            return i * i
        fs.append(f)
    return fs

f1, f2, f3 = count()
print(f1(), f2(), f3())     # 9 9 9  ← 不是 1 4 9
```

三个函数返回的都是 `3 * 3`。原因不是"它们都拿到了最后一个值"这种模糊说法，而是很具体的：**闭包记住的是变量 `i` 这个名字，不是当时 `i` 的值。** 函数体里的 `i` 要到**调用那一刻**才去查——而 `count()` 早就跑完了，`i` 停在 3。三个函数共享同一个 `i`，所以三个都是 9。

（顺带一提：这里连"最后一次的值"都算不上巧合，`for` 结束后 `i` 就是 3，Python 的作用域里没有块级作用域。）

### 1. 三种修法，实测都是 `[1, 4, 9]`

```python
# ① 把当前值固化成默认参数（默认参数在定义时求值一次 ← 正是第一节那条规则反过来救人）
print([f() for f in [(lambda i=i: i * i) for i in range(1, 4)]])

# ② 用 partial 把值冻进一个新函数（第十节）
import functools
def square(i):
    return i * i
print([f() for f in [functools.partial(square, i) for i in range(1, 4)]])

# ③ 造一个立即执行的外层，让每一轮拿到自己的副本
print([f() for f in [(lambda k: (lambda: k * k))(i) for i in range(1, 4)]])
```

三种写法本质相同：**让每一轮循环产生一个属于本轮的绑定**，而不是三个函数共用外层那一个。第一种最省事，而且它的原理恰好就是第一节那个坑——同一个机制，在这儿是解药。

> [!TIP]
> 一句话规则：**返回的函数不要引用任何会变化的循环变量。** 需要它记住"当时的值"，就在定义那一刻把值固化下来。

### 2. `nonlocal`：闭包要改写外层变量时

只读没问题（第七节的 `args`），要**改写绑定**就必须声明，否则 Python 会认为你在函数里新建一个局部变量，于是读的时候先炸：

```python
def create_counter():
    count = 0
    def counter():
        nonlocal count      # 没有这一行 → UnboundLocalError: cannot access local variable 'count' where it is not associated with a value
        count += 1
        return count
    return counter

c1 = create_counter()
print(c1(), c1(), c1())     # 1 2 3
c2 = create_counter()
print(c2())                 # 1  ← 每个 counter 有自己的 count，互不干扰
```

`c1` 和 `c2` 是两个独立闭包，各自带着一份 `count`。**这就是"用闭包代替一个只有两个方法的类"**——状态藏在函数环境里，不用写 `class`。

## 九、装饰器：`@log` 就是 `now = log(now)`

铺垫只有一句：**函数是对象**（第七节已经拿它当返回值了），所以它能被赋值、能当参数、能被**替换**。

```python
def now():
    print('2015-3-25')

f = now
f()                    # 2015-3-25  ← 通过变量调用，和 now() 完全等价
print(now.__name__)    # now        ← 函数对象有 __name__
```

想在 `now()` 前自动打日志、又不改它的函数体，就写一个"接收函数、返回增强版函数"的函数：

```python
def log(func):
    def wrapper(*args, **kw):           # *args/**kw 让它能接住任意签名
        print('call %s():' % func.__name__)
        return func(*args, **kw)
    return wrapper

@log
def now():
    print('2015-3-25')

now()
# call now():
# 2015-3-25
```

`@log` 不是新机制，它就是 `now = log(now)` 的语法糖。理解装饰器只需要两句话：**闭包**（`wrapper` 记住了外面的 `func`）+ **名字替换**（`now` 这个名字被撕下来贴到了 `wrapper` 上）。

### 1. 装饰器自己带参数：三层

`@log('execute')` 得再包一层，因为 `@` 后面必须是一个"接收函数返回函数"的东西，而 `log('execute')` 的返回值才是它：

```python
def log(text):                       # 第 1 层：收装饰器的参数
    def decorator(func):             # 第 2 层：收被装饰的函数
        def wrapper(*args, **kw):    # 第 3 层：收调用时的参数
            print('%s %s():' % (text, func.__name__))
            return func(*args, **kw)
        return wrapper
    return decorator

@log('execute')
def now():
    print('2015-3-25')
```

定义阶段依次发生：`log('execute')` → 得到 `decorator`；`decorator(now)` → 得到 `wrapper`；`now = wrapper`。**装饰发生在函数定义时，附加逻辑在调用时才执行**——这个区分和第一节的"定义时求值一次"是同一个时间轴上的事。

### 2. `functools.wraps` 补回了什么

装饰完，原函数就被换掉了：

```python
@log
def now():
    """原函数的文档"""

print(now.__name__)    # wrapper  ← 名字变了
print(now.__doc__)     # None     ← 文档也丢了
```

`__name__`、`__doc__` 这些元信息丢了，日志、调试栈、自动文档生成全都会指错。修法是把原函数的元信息复制到 wrapper 上：

```python
import functools

def log(func):
    @functools.wraps(func)
    def wrapper(*args, **kw):
        print('call %s():' % func.__name__)
        return func(*args, **kw)
    return wrapper
```

带参数的装饰器也一样，`@functools.wraps(func)` 加在**最内层 wrapper** 上——只有那一层能直接拿到 `func`。

### 3. 一个完整的计时装饰器

```python
import time
import functools

def metric(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kw):
        start = time.time()
        r = fn(*args, **kw)
        print('%s 执行了 %.2f ms' % (fn.__name__, 1000 * (time.time() - start)))
        return r                      # ← 这个 r 是最容易漏的一行
    return wrapper

@metric
def fast(x, y):
    time.sleep(0.0012)
    return x + y

print(fast(11, 22))    # fast 执行了 2.00 ms（毫秒数每次运行都不同）→ 33
print(fast.__name__)   # fast  ← wraps 生效了
```

两个高频错，都在这段里：

- **`return r` 写成光秃秃的 `return`** → 被装饰函数的返回值全被吞掉，`fast(11, 22)` 变成 `None`。而 `wrapper` 是"透明代理"这件事一旦破坏，症状出现在**调用方**，不在装饰器里，很难一眼归因。
- **忘了 `@functools.wraps(fn)`** → `fast.__name__` 变成 `'wrapper'`。

> [!TIP]
> 检验一个装饰器写得对不对，两行就够：`print(func.__name__)` 应该还是原名，`print(func(真实参数))` 应该和被装饰前返回一样的东西。这两行也是任何练习里都不该省的断言。

## 十、偏函数 `functools.partial`

`int()` 有第二个参数 `base`，每次都要写 `int('1000000', base=2)` 太啰嗦。`partial` 能把参数固定住，生成一个新函数：

```python
import functools

print(int('1000000', base=2))          # 64
int2 = functools.partial(int, base=2)
print(int2('1000000'))                 # 64
print(int2('1000000', base=10))        # 1000000  ← 调用时可以覆盖掉冻结的值
```

关键是那句"**返回一个新的函数对象**"——`int` 一点没被改，`partial` 造了个自带预设参数的壳。这和第八节的关系很直接：`partial` 正是绕开循环变量晚绑定的第二种修法。

位置参数也支持，但会**加在前面**，这一点最容易猜错：

```python
max2 = functools.partial(max, 10)
print(max2(5, 6, 7))                   # 10  ← 等价于 max(10, 5, 6, 7)，10 排在最前
```

## 十一、力扣两题：`[0] * n` 为什么安全

**1920 基于排列构建数组**——`ans[i] = nums[nums[i]]`，一次遍历：

```python
class Solution:
    def buildArray(self, nums: List[int]) -> List[int]:
        ans = [0] * len(nums)
        for i in range(len(nums)):
            ans[i] = nums[nums[i]]
        return ans
```

时间 O(n)，空间 O(n)。**这题没法原地做**：`nums[nums[i]]` 要读原始值，边写边读就会读到已被覆盖的值。

第一行那个 `[0] * len(nums)` 正好卡在今天全部几个知识点上：

```python
a = [0] * 3
a[0] += 1
print(a)              # [1, 0, 0]  ← 只有第一格变了，安全

b = [[]] * 3
b[0].append(1)
print(b)              # [[1], [1], [1]]  ← 三格全变了！

g = [[0] * 3] * 3
g[0][0] = 9
print(g)              # [[9, 0, 0], [9, 0, 0], [9, 0, 0]]  ← 三行是同一行
```

`[0] * 3` 是三个槽指向**同一个 int 0**，但 int 不可变，`a[0] += 1` 走的是"造新对象 + 换这一格的绑定"，动不到别人；`[[]] * 3` 是三个槽指向**同一个列表对象**，`append` 是原地改内容，所以一改全改。

**`*` 复制的是引用，不是对象。** 想每行独立，内层必须每次新建：`[[0] * 3 for _ in range(3)]`。

**1394 找出数组中的幸运数**（数值 == 出现次数，多个时返回**最大**的，没有返回 -1）——用字典计数：

```python
class Solution:
    def findLucky(self, arr: List[int]) -> int:
        counter = {}
        for num in arr:
            counter[num] = counter.get(num, 0) + 1     # dict.get 省掉一次 if
        flag = -1
        for key, value in counter.items():
            if key == value and value > flag:
                flag = value
        return flag
```

`counter.get(num, 0) + 1` 是哈希表计数的标准起手式。时间 O(n)、空间 O(n)。以后有更短的：`collections.Counter` 配 `max(...)` 加生成式。

## 十二、小结

**上半场：名字绑定用在函数上**

- **默认值在 `def` 执行时求值一次**，它是函数对象 `__defaults__` 里的一个对象，跟着函数活一辈子；`id(f.__defaults__[0])` 三次调用完全相同，这就是证据。
- **哨兵必须是 `None`**：单例、不可能被误当成真容器，`lst is None` 一次比较就能区分"没传"和"传了个空列表"。
- **元组默认值"安全但没法用"**：不攒数据，但 `append` 当场 `AttributeError`；要用不可变默认值就得整体改成 `return lst + (item,)`。
- **传参两条规则**：改对象内容 → 调用者看得见；给形参重新赋值 → 看不见。
- **`+=` 看类型**：list 有 `__iadd__` → 原地 extend，改得到外面；tuple 没有 → 退化成造新 + 换绑，改不到。所以 `r += [4]` 会改掉 `p`，`q = q + [4]` 不会。
- **`a[0] += [3]` 先改完再抛异常**：`__iadd__` 的副作用已经发生，写回槽位那一步才被元组拦下。
- **方法看不见类作用域里的名字**（查找链是 局部→外层函数→全局→内置）；import 放文件顶部或函数体内。
- **浮点不能 `==`**：`Decimal` 要传字符串，`Decimal(0.1)` 会把误差原样带进来。

**下半场：函数也是对象**

- **返回函数 = 闭包**：内层函数引用外层的自由变量，那些变量因此活得比正常情况久——和"默认值跟着函数活一辈子"是同一件事。
- **循环里建的函数共享同一个变量**：闭包记住的是名字不是值，调用时才查，于是 `count()` 返回的三个函数全是 9。三种修法（默认参数固化 / `partial` / 外层立即调用）本质都是"每轮造一个属于本轮的绑定"。
- **改写外层绑定要 `nonlocal`**（外层是全局则用 `global`）；闭包能当"只有两个方法的类"用。
- **装饰器 = 闭包 + 名字替换**：`@log` 就是 `now = log(now)`；带参数的装饰器要三层（装饰器参数 → 函数 → 调用参数）；装饰发生在定义时，附加逻辑在调用时执行。
- **`@functools.wraps(fn)` 加在最内层 wrapper 上**，否则 `__name__` / `__doc__` 全丢；`wrapper` 必须 `return r`，不然被装饰函数的返回值被吞。
- **`partial` 返回新函数**，冻结的参数在位置参数上会**加在前面**（`partial(max, 10)(5,6,7) == max(10,5,6,7)`）。

全天最值的一刻是把 `__defaults__` 的 `id()` 和闭包里"记住的是名字不是值"放在一起看：**它们讲的是同一件事——Python 里"什么时候求值"永远比"写了什么"更重要。** 定义时求值的有默认参数、装饰器本身、`partial` 冻住的参数；调用时才求值的有闭包里的自由变量、函数体里的每一行。把这条时间轴分清，这一天的坑基本就都能自己推出来。
