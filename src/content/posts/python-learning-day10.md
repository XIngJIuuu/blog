---
title: Python 学习笔记 Day 10：改对象还是换绑定——从切片到 functools.wraps
published: 2026-09-19
description: Python 第十天笔记，按语法条目排的可查清单。前半篇把「切片」一个语法拆成两半：切片取值（`a[:]`）只是浅拷贝、内层仍与原表共享，切片赋值（`a[1:2] = [...]`）根本不造新对象、在原对象上改内容还能改长度，并用实测 id 分清 `x[:] = []` 与 `x = []`；配反转三写法、切片与索引的边界规则、字典版浅拷贝、力扣 344 那句 `-> None` 到底强制了什么。后半篇是同一件事在函数上重演：装饰器用 wrapper 顶替原函数，`@functools.wraps` 搬回 `WRAPPER_ASSIGNMENTS` 五个属性、合并 `__dict__`、白送 `__wrapped__`，外加装饰器四个高频错、叠加顺序、`time.time` 与 `perf_counter` 的分工，以及 `reduce` / `partial` / `cache` 的实测清单——包括 `cache` 把 `fib(30)` 从两百多万次降到三十一次、却仍然防不住 `RecursionError` 的实测对照。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day10
draft: false
pinned: false
---

> [!NOTE]
> 这是第十天 Python 学习笔记，形式和前几天不一样：**按语法条目排的可查清单**，每条结论下面都跟着本地实测输出。
>
> 今天三组实验表面上分属两个话题——切片、装饰器、`functools` 的三件套——其实问的是同一个问题：**这次改动落在原来那个对象上，还是只把名字挪到了别的对象上？** 所以放在一篇里。
>
> Day 7 第七节末尾埋过一句话「`data[:]` 复制的也只是外壳」，当时只给结论没展开；Day 8 写过装饰器是什么（`@log` 就是 `now = log(now)`）和 `functools.wraps`。这篇不重复那两套概念，只做它们各自欠的那一件：把切片按语法条目拆干净，把 wraps 问到**属性级**。

## 一、先给主线：两句话

```python
x = []          # 换绑定：x 指向一个新对象，原来那个一个字节没少
x[:] = []       # 改对象：不造新东西，把原列表掏空，所有指着它的名字一起看到"空了"
```

列表如此，函数也如此：

```python
query = deco_bare(query)    # 换绑定：query 从此贴着 wrapper，原函数还在，只是没人指着它的名字
```

判断只要看一件事：**`[` ] 里有没有冒号，以及它在等号的哪一边。** 有冒号且在左边，就是在动原对象；没有冒号的赋值，一律是换绑定。

## 二、切片取值：浅拷贝的完整证据

```python
a = [[1], [2], [3]]
b = a[:]
print(b[0] is a[0])   # True   ← 外壳是新的，槽里装的还是同一批对象

b[0].append(99)
print(a)              # [[1, 99], [2], [3]]   ← 改内层，原表跟着变
```

同样一动，换种写法结果就反过来：

```python
a2 = [[1], [2], [3]]
b2 = a2[:]
b2[0] = [99]          # 不是 append，是赋值
print(a2)             # [[1], [2], [3]]   ← 原表一点事没有
```

> [!TIP]
> 区别就在「动的是槽里那个对象」还是「动的是外壳的槽位」。
> `b[0].append(99)` 拿着槽里那个列表**就地改**，而所有浅拷贝的槽都还指着它，于是原表跟着变；`b2[0] = [99]` 只是把**新外壳的第 0 格**换指向另一个对象，原表那一格从头到尾没被碰过。
>
> 这条「容器可变、槽位可换」的区分在 Day 6 讲元组时出现过一次（元组的"不可变"只锁槽位，不锁槽里对象能不能改），今天是同一道理的第二次落地。

## 三、切片赋值：原地改，还能动长度

```python
c = [1, 2, 3]
print(c, len(c), id(c))     # [1, 2, 3] 3 1747841838528

c[1:2] = [8, 9]
print(c, len(c), id(c))     # [1, 8, 9, 3] 4 1747841838528   ← id 一模一样
```

**长度从 3 变成 4，`id` 却没变**——这不是"造一个新表再贴回去"，是列表对象自己被掏空又填满。切片赋值的语义是：**把等号左边那一整段删掉，把右边那个可迭代对象里的东西逐个塞进原位。** 右边塞几个，长度就变几个：

```python
c2 = [1, 2, 3]
c2[1:2] = []          # 右边是空的 → 那一格被删掉
print(c2)             # [1, 3]

c3 = [1, 2, 3]
c3[1:2] = [8, 9, 7, 5]
print(c3, len(c3))    # [1, 8, 9, 7, 5, 3] 6
```

和单格赋值对照着看，这是最容易记混的一对：

```python
c4 = [1, 2, 3]
c4[1] = [8, 9]        # 没有冒号 → 只换一格，塞进去的是「一个 list 元素」
print(c4, len(c4))    # [1, [8, 9], 3] 3   ← 长度不变，多了一层嵌套
```

| 写的是 | 语义 | 结果 | 长度 |
| :--- | :--- | :--- | :--- |
| `c[1:2] = [8, 9]` | 把区间 `[1:2]` 换成两个元素 | `[1, 8, 9, 3]` | 4 |
| `c[1:2] = []` | 把区间删空 | `[1, 3]` | 2 |
| `c[1] = [8, 9]` | 把第 1 格换成一个列表对象 | `[1, [8, 9], 3]` | 3 |

## 四、`x[:] = []` 和 `x = []`：差三个字符，一个清空、一个换绑定

同一个列表，先给它贴一张别名贴纸，再分别清空：

```python
x = [1, 2, 3]
alias_x = x
x[:] = []             # 切片赋值：原地清空
print(x, alias_x)     # [] []      ← 两个都空了
print(id(x) == id(alias_x))   # True   ← 从头到尾是同一个对象
```

```python
y = [1, 2, 3]
alias_y = y
y = []                # 重新绑定：y 指向一个新对象
print(y, alias_y)     # [] [1, 2, 3]   ← 原来那个列表还满着
print(id(y) == id(alias_y))            # False
```

这一条就是 Day 6 那句「变量是贴在对象上的名字贴纸，赋值不复制数据」的反向用法：**赋值从来不改对象，赋值只改贴纸贴谁。** 想让**所有持有同一个引用的人**都看到"清空"，只有 `x[:] = []` 做得到；`y = []` 只是把自己脚下这根线挪开，别人手里那根还攥着老列表。

工程后果很直接：从缓存字典里 `lst = cache[key]` 拿到一个列表，想清空它就必须写 `lst[:] = []`。写 `lst = []` 的话，缓存里那个列表一个元素都没少，而 `lst` 已经是另一个对象——这类 bug 单看函数内部完全正常。

## 五、反转的三种写法：一个返回新表、一个返回迭代器、一个原地改

```python
r = [1, 2, 3]
print(r[::-1])              # [3, 2, 1]   type = list                 ← 新列表
print(reversed(r))          # <list_reverseiterator object ...>       ← 迭代器对象
rv = reversed(r)
print(list(rv), list(rv))   # [3, 2, 1] []   ← 第二次是空的，而且不报错
print(r.reverse())          # None
print(r)                    # [3, 2, 1]   ← 原表被就地翻了
```

| 写法 | 返回 | 类型 | 改原表吗 | 能用几次 |
| :--- | :--- | :--- | :--- | :--- |
| `r[::-1]` | 新列表 | `list` | 不改 | 随便用 |
| `reversed(r)` | 反向迭代器 | `list_reverseiterator` | 不改 | **一次** |
| `r.reverse()` | `None` | `NoneType` | **原地改** | — |

那个"第二次拿到空列表"是 Day 9 整篇主线的直接落地：`reversed()` 造的是迭代器，它不存数据、只存一个游标，游标走到头就回不来。要两份结果就当场 `list()` 转出来存着。

## 六、越界：切片不检查，索引检查

```python
e = [1, 2, 3]
print(e[1:10])      # [2, 3]            ← 右边超出去，自动截断
print(e[-100:2])    # [1, 2]            ← 左边超出去，自动贴到 0
print(e[10])        # IndexError: list index out of range
```

原因是两者的语义不同：**索引在承诺"给我那一格的东西"，格子上没有就必须报错；切片在承诺"给我一个由落在区间内的元素组成的新列表"，一个都没有就是空列表**——空列表是完全合法的答案，没有理由抛异常。

这条规则让几类写法特别好使：

```python
e[2:]        # [3]     不知道长度也能安全取尾巴
e[10:]       # []      下标超出去也只是空，不炸
e[-100:2]    # 负下标越界自动夹到合法范围
```

代价是另一面：**越界的切片会静默给你空值，不报错。** `data[10:12]` 返回 `[]` 时，"确实没数据"和"下标算错了"两种情况长得一模一样。要区分就得自己写判断（`if i < len(data)`），别指望切片提示你。

## 七、字典版浅拷贝，以及"哪些写法是浅的"总表

```python
d = {'k': [1, 2]}
e2 = d.copy()
print(e2 is d)            # False   ← 外层字典是新的
print(e2['k'] is d['k'])  # True    ← 值里那个列表还是同一个

e2['k'].append(3)
print(d)                  # {'k': [1, 2, 3]}   ← 改内层，原字典跟着变

e2['new'] = 0
print(d)                  # {'k': [1, 2, 3]}   ← 加新键就改不到了
```

一内一外正好对照：动**内层列表**双方都看得见，动**外层字典的键**只有 `e2` 自己看得见。

把"哪些写法造新外壳、哪些动原对象"列全（对嵌套列表 `a = [[1], [2]]` 实测）：

| 写法 | 造新外壳 | 内层共享 | 是深拷贝吗 |
| :--- | :--- | :--- | :--- |
| `b = a` | 不造 | 全共享 | 否，压根没拷 |
| `b = a[:]` | 造 | 共享 | 否 |
| `b = a.copy()` | 造 | 共享 | 否 |
| `b = list(a)` | 造 | 共享 | 否 |
| `b = copy.copy(a)` | 造 | 共享 | 否 |
| `b = copy.deepcopy(a)` | 造 | **不共享** | **是** |
| `a += [x]` | **不造**（原地 `extend`） | 共享 | 否 |
| `a + [x]` | 造 | 共享 | 否，且不影响 `a` |

前四种浅拷贝写法实测行为完全一致（`b is a` 都是 `False`，`b[0] is a[0]` 都是 `True`），没有哪一种是"更安全的那个"。`deepcopy` 是唯一让 `b[0] is a[0]` 也变成 `False` 的。

倒数两行单独说：`a += [x]` **不造新对象**，别名能看见（实测 `alias is x` 仍是 `True`，且 `alias` 也多了那个元素）；`a + [x]` 造新表、原表不动。这和 Day 8 讲的「`+=` 在列表和元组上行为相反」是同一条规则——`+=` 走的是原地那条路，只是元组没有原地可走，才退化成重新绑定。

## 八、力扣 344：`-> None` 是题目在明说"给我原地改"

题目要求把字符数组原地反转，签名写死了：

```python
def reverseString(self, s: List[str]) -> None: ...
```

`-> None` 不是客气话，是**判题依据**：判题系统不会看你返回什么（返回了也拿不到），它只看你传进来的那个列表对象被改了没有。于是两种"看起来对"的写法各有问题：

```python
s = s[::-1]      # 造了新列表，把局部名字 s 改贴到新对象上
                 # 传进来的那个列表纹丝不动 —— 正是第四节 y = [] 那个坑
s[:] = s[::-1]   # 外层对象是同一个（实测 id 不变），确实原地了
                 # 但等号右边先新建了一份完整副本，额外空间 O(n)，不满足题目的 O(1)
```

实测两种写法的差别：

```python
s1 = ['a', 'b', 'c']
s1[:] = s1[::-1]
print(s1, id(s1))     # ['c', 'b', 'a'] 1747841843072   ← 和反转前同一个 id

s2 = ['a', 'b', 'c']
t = s2[::-1]
print(s2, t, s2 is t) # ['a', 'b', 'c'] ['c', 'b', 'a'] False   ← 原表没动
```

正解是双指针，一次只交换两个已有格子的指向，不新建任何列表：

```python
from typing import List


class Solution:
    def reverseString(self, s: List[str]) -> None:
        """Do not return anything, modify s in-place instead."""
        l, r = 0, len(s) - 1
        while l < r:
            s[l], s[r] = s[r], s[l]
            l += 1
            r -= 1


if __name__ == "__main__":
    a = ["h", "e", "l", "l", "o"]
    print(Solution().reverseString(a), a)
    # None ['o', 'l', 'l', 'e', 'h']   ← 返回 None，原数组被改对了
```

时间 O(n)，空间 O(1)（只多了 `l`、`r` 两个下标）。同一件事在 Day 7 那道「一维数组的动态和」上撞过：三个版本能不能过，差别全在"有没有动传进来那个对象"。

顺带把姐妹题也收了——力扣 217「存在重复元素」用集合一遍扫，O(n) 时间 / O(n) 空间，比双重循环少一层：

```python
class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        seen = set()
        for x in nums:
            if x in seen:
                return True
            seen.add(x)
        return False
```

`set` 能去重靠的是哈希，而哈希的前提是元素**可哈希**：`set([[1], [2]])` 直接抛 `TypeError: unhashable type: 'list'`。列表不可哈希，正因为可变元素进了表还能改，改完哈希值就变了、整张表作废——这就是 Day 6 说"只有不可变类型能当 key"时给的那条理由。

## 九、换绑定在函数上重演：装饰器把"身份证"也一起换掉了

`@deco_bare` 这一行的效果就是 `query = deco_bare(query)`，等号右边返回的是 **`wrapper`**，所以 `query` 这个名字从此贴的是 `wrapper` 那个对象——和第四节 `y = []` 同一种动作。代价是函数的元信息全丢：

```python
def deco_bare(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@deco_bare
def query():
    """查询数据库"""
    return 'result'

print(query.__name__)      # wrapper                       ← 不是 query
print(query.__qualname__)  # deco_bare.<locals>.wrapper
print(query.__doc__)       # None                          ← docstring 没了
print(query.__module__)    # __main__                      ← 这条看不出差别
```

第四条要单独说：`__module__` 也是下面要讲的 `WRAPPER_ASSIGNMENTS` 的一员，但这里加不加 `wraps` 都是 `__main__`——因为 `wrapper` 和 `query` 定义在同一个文件里，两边这个属性本来就相同。**它的值被搬过来了，只是从输出上看不出来被搬过。**

加一行 `@functools.wraps(func)`，同样四个再看一遍：

```python
def deco_wraps(func):
    @functools.wraps(func)          # ← 只有这一行不同
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@deco_wraps
def query2():
    """查询数据库"""
    return 'result'

print(query2.__name__)      # query2
print(query2.__qualname__)  # query2
print(query2.__doc__)       # '查询数据库'
print(query2())             # result   ← 功能本来就没坏，坏的只是元信息
```

连 `repr()` 都能看出来：

```python
repr(deco_bare(f))   # <function deco_bare.<locals>.wrapper at 0x…>
repr(deco_wraps(f))  # <function f at 0x…>
```

**装饰器从没弄坏过函数的功能，它弄坏的只是"关于这个函数的信息"。** 而信息这东西，`help()`、日志、调试器、文档生成器、框架的参数 introspection 全靠它。

`@functools.wraps(func)` 写在 `def wrapper` 上面，**它装饰的对象是 `wrapper` 自己**——作用是"把 `func` 的属性复制到 `wrapper` 身上"，然后 `deco_wraps` 返回的这个 `wrapper` 再去顶替 `query2`。

## 十、`wraps` 实际搬了哪几个：5 + 1 + 1

直接把它搬的东西打印出来，答案就在常量里：

```python
import functools
print(functools.WRAPPER_ASSIGNMENTS)
# ('__module__', '__name__', '__qualname__', '__doc__', '__annotations__')   ← 5 个
print(functools.WRAPPER_UPDATES)
# ('__dict__',)
print(query2.__wrapped__)
# <function query2 at 0x…>
```

| 常量 | 内容 | 动作 |
| :--- | :--- | :--- |
| `WRAPPER_ASSIGNMENTS` | `__module__`、`__name__`、`__qualname__`、`__doc__`、`__annotations__` | **赋值**：从原函数一个个拷给 wrapper |
| `WRAPPER_UPDATES` | `__dict__` | **更新**：把原函数的 `__dict__` 合并进 wrapper 的 `__dict__` |
| 额外 | `__wrapped__` | 指回原函数的这个属性是 `wraps` 另外送的，不在上面两个常量里 |

`__dict__` 这一条有实际后果：**挂在函数对象上的自定义属性会跟着一起走。** 用 `@` 语法糖看不出这件事（装饰发生在定义完的那一刻，来不及在中间塞属性），得手动装饰：

```python
def raw_func():
    """原始函数"""
    return 1

raw_func.tag = 'db'                       # 装饰【之前】挂一个自定义属性
print('tag' in raw_func.__dict__)         # True

bare = deco_bare(raw_func)
print('tag' in bare.__dict__)             # False   ← 换了个对象，tag 留在原来那个函数身上

raw_with.tag = 'db'
wrapped = deco_wraps(raw_with)
print('tag' in wrapped.__dict__)          # True    ← wraps 把整个 __dict__ 合并过来了
```

> [!TIP]
> `__wrapped__` 不只是给调试看的。它留了一条**绕过装饰器直接调用原函数**的路：`query2.__wrapped__()` 走的是没被包过的那份代码。
> 这就是本篇主线的第三种表现：`wrapper` 顶替了 `query2`（换绑定），而 `__wrapped__` 还指着原对象——像 `y = []` 换的是箭头，`x[:] = []` 动的才是原物。

## 十一、装饰器的四个高频错，各自的表现

前两个"直接炸"，后两个"不炸但错"——**不炸的那两个更难查。**

| # | 错法 | 实测表现 |
| :--- | :--- | :--- |
| ① | `wrapper` 不写 `(*args, **kwargs)` | `TypeError: add() takes 0 positional arguments but 2 were given` |
| ② | `wrapper` 里调了 `func` 但没 `return` | `mul(3, 4)` 得到 `None`，一声不响 |
| ③ | 计时语句写在调用之后，没进 `finally` | 被装饰函数一抛异常，计时那行根本不执行 |
| ④ | 忘了 `@wraps` | 元信息全丢（第九、十节） |

**① `*args, **kwargs` 不是代码风格，是必需的**：

```python
def deco_noargs(func):
    @functools.wraps(func)
    def wrapper():                 # ← 故意不接参数
        return func()
    return wrapper

@deco_noargs
def add(a, b):
    return a + b

add(1, 2)      # TypeError: add() takes 0 positional arguments but 2 were given
```

这里有个容易看漏的点：报错信息里写的是 **`add`**，不是 `wrapper`——因为 `wraps` 把 `__name__` 改成了 `add`。**名字报对了，问题却出在 wrapper 的签名上。** 看到"函数明明有两个参数，却说我给 0 个可接"，先怀疑装饰器里的 `wrapper`。

**② 忘 `return` 是静默失败**：

```python
def deco_lost(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        func(*args, **kwargs)      # ← 调了，但没 return
    return wrapper

@deco_lost
def mul(a, b):
    return a * b

print(mul(3, 4))    # None
```

它比抛异常难查，因为**函数确实被调用了**，副作用照常发生，只有返回值悄悄变成 `None`；错误要等到下游拿这个 `None` 去运算才暴露，而那时栈顶已经不是这个装饰器了。

**③ 计时必须走 `finally`**。同一句"抛异常"，两种写法的实测差别：

```python
def deco_print_after(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        r = func(*args, **kwargs)
        print('   [print-after] 耗时', ...)   # ← 上一行抛异常，这行永远到不了
        return r
    return wrapper

def deco_finally(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            print('   [finally] 耗时', ...)   # ← 无论正常返回还是抛异常，都要执行
    return wrapper
```

```
⑦ boom 捕获到异常: 数据库炸了            ← 用了 print-after 的那个，耗时那行完全没出现
⑦ boom2 捕获到异常: 数据库炸了
   [finally] 耗时 0.0                    ← 用了 finally 的那个，照样打印
```

`finally` 在"正常返回"和"抛异常"两条路上各执行**一次**，正好覆盖计时想要的语义：只要进去了就必须出来。一个只在成功时才记录的计时器，报出来的平均值天然偏乐观。

## 十二、叠加顺序：`@a @b def f()` 就是 `f = a(b(f))`

```python
@a
@b
def target():
    print('   → 函数体执行')
    return 'ok'
```

两个装饰器各自打印自己什么时候执行，实测顺序（中间那行是我插的定位锚）：

```
⑧ b() 在定义阶段执行了        ← 定义时：由下往上包，b 先
⑧ a() 在定义阶段执行了
⑧ 现在才调用 target()：
   → 先进入 a 的 wrapper       ← 调用时：由上往下穿，a 先
   → 先进入 b 的 wrapper
   → 函数体执行
```

**定义时由下往上，调用时由上往下**，两个顺序正好相反。原因是 `@a @b def target()` 展开成 `target = a(b(target))`：里层 `b(target)` 先算完，`a` 才有东西可包；而调用时最先被碰到的是最外层的 `a` 的 wrapper。

`target.__name__` 仍然是 `'target'`——因为两个装饰器都套了 `wraps`，属性被一层层原样传了出来。少任何一层 `wraps`，这个名字在最外层就变成 `wrapper`。

## 十三、计时该用哪个时钟

```python
start1 = time.time()
start2 = time.perf_counter()
time.sleep(0.05)
print(round(time.time() - start1, 5))           # 0.05134
print(round(time.perf_counter() - start2, 5))   # 0.05055
```

（这两个数每次跑都不同，看数量级就行。）区别不在精度，在**语义**：

| | `time.time()` | `time.perf_counter()` |
| :--- | :--- | :--- |
| 测的是什么 | 墙上时钟：现在的"绝对时刻" | 单调时钟：一段持续时间 |
| 会不会倒退 | **会**——手动改系统时间、NTP 校时、时钟回拨 | 不会 |
| 用途 | 取时间戳：日志时间、数据生成时刻 | 量耗时 |

`time.time()` 能算出**负数**的耗时：结束时刻取到的系统时间比开始时刻小（校时把时钟往回拨了），两个"绝对时刻"相减就是负的。计时场景永远用 `perf_counter`，`time.time()` 只用来表示"什么时候"。这一条正好补上 Day 8 那个计时装饰器缺的一环：那里的 `t0 = time.time()` 换成 `time.perf_counter()` 才算写完。

## 十四、`functools` 另外三件：`reduce` / `partial` / `cache`

**`reduce`：把序列一路折叠成一个值**

```python
from functools import reduce

nums = [1, 2, 3, 4]
print(reduce(lambda x, y: x + y, nums))       # 10
print(reduce(lambda x, y: x + y, nums, 100))  # 110   ← 第三个参数是起始值
```

签名两种：`reduce(function, iterable)` 和带 `initializer` 的版本。它拿上一步结果和下一个元素继续算，从左到右走完整个序列；给了初始值，算式是 `((((100+1)+2)+3)+4)`，所以比不带多 100。`initializer` 还**兜住了空序列**：`reduce(lambda x, y: x + y, [])` 抛 `TypeError`，给了初始值就正常返回初始值。它的兄弟是 Day 6 那篇里的 `map`（逐个映射）和 `filter`（按真假保留），三个都是"接收函数当参数"。实际项目里求和求积直接写 `for` 更清楚，`reduce` 的价值在于看懂别人的链式折叠写法。

**`partial`：冻住几个参数，造一个新函数**

```python
from functools import partial

def power(base, exp):
    return base ** exp

square = partial(power, exp=2)     # 把 exp 冻成 2
cube   = partial(power, exp=3)
print(square(5), cube(2))          # 25 8
```

调用 `square(5)` 等价于 `power(5, exp=2)`。它和装饰器的关系只有一句话：**`partial` 冻的是参数，装饰器换的是函数本身**——两者都"进来函数、出去新函数"，但 `partial` 不动函数体，装饰器动。Day 8 修闭包晚绑定的三种写法里，"把当前值冻进新函数"那一种就是它。

**`@cache`：省掉多少次数，以及它不解决什么**

```python
from functools import cache

@cache
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(50))     # 12586269025
```

省了多少，把函数体执行次数数出来：

| | `fib(30)` 的函数体执行次数 | 耗时 |
| :--- | :--- | :--- |
| 不加 `@cache` | **2 692 537** 次 | 0.14 s |
| 加 `@cache` | **31** 次 | 微秒级 |

两百多万次掉到三十一次，是因为每个 `fib(k)` 只算一次、结果留在字典里。

**但 `@cache` 不防止栈溢出**——这是最容易记反的一条。首次算 `fib(n)` 时 `fib(n-1)` 还没进缓存，递归照样一路向下到 `n` 以下，深度还是 `n`。实测（递归上限是默认的 1000）：

| 调用 | 结果 |
| :--- | :--- |
| `fib(30)` | 832040，函数体执行 31 次 |
| `fib(400)` | 正常返回，84 位数 |
| `fib(900)` | **`RecursionError`** |
| `fib(1500)` | **`RecursionError`** |

`@cache` 解决的是**重复计算**，`RecursionError` 来自**调用栈深度**，两件事。真要算很大的 `n`，改成自底向上的 `for` 循环建表，压根不递归。

两条使用边界：

1. **参数必须可哈希**——缓存的键就是那次调用的 `(args, kwargs)`，要进字典。传列表进去直接 `TypeError: unhashable type: 'list'`，和第八节那道集合题是同一条规则。
2. **缓存按参数值命中，不区分该不该记。** 参数是浮点数、或结果依赖外部状态（读文件、查数据库）时，命中判断会变得不可靠或返回过期值。这种场景用 `@lru_cache(maxsize=...)` 限制条数（它按"最久未使用"淘汰，还带 `cache_info()` 能看命中率）。

## 十五、可带走的问题清单

合上文件，这几条能秒答才算过：

1. `b = a[:]` 之后 `b[0].append(9)`，`a` 变不变？`b[0] = 9` 呢？为什么两个结果不一样？
2. `c[1:2] = [8, 9]` 和 `c[1] = [8, 9]`，哪个会变长度？各自结果是什么？
3. 想让所有别名都看到列表被清空，写什么？`x = []` 为什么不行？
4. `r[::-1]` / `reversed(r)` / `r.reverse()` 各自返回什么类型、谁改了原表？
5. `e[10]` 抛异常，`e[1:10]` 不抛——为什么？越界切片静默给空值有什么坏处？
6. `a += [x]` 和 `a + [x]`，哪个原地？
7. 签名 `-> None` 在力扣 344 里到底约束了什么？`s = s[::-1]` 为什么一定错？
8. 不加 `@wraps`，`__name__`、`__qualname__`、`__doc__` 分别变成什么？哪个属性看不出差别，为什么？
9. `WRAPPER_ASSIGNMENTS` 里有几个属性？`WRAPPER_UPDATES` 是哪一个？`__wrapped__` 是谁给的、有什么用？
10. 挂在函数上的自定义属性（`f.tag = 'db'`）裸装饰之后还在吗？加 `wraps` 呢？
11. `wrapper` 忘了 `return`，现象是什么？为什么它比抛异常更难定位？
12. 计时语句为什么不写在调用之后而放进 `finally`？`finally` 在两条路径上各执行几次？
13. `@a @b def f()` 展开成什么？定义时和调用时各是谁先执行？
14. `time.time()` 什么时候会给出负数耗时？那它该用来干什么？
15. `@cache` 让 `fib(30)` 的函数体从多少次降到多少次？它为什么不防 `RecursionError`？对参数有什么硬要求？

## 十六、小结

今天这十六节其实只有一条线：**名字和对象是两回事。**

- 一根箭头（一个名字），重新绑定只是把箭头挪到别的对象上，原来那个对象一个字节都没少——所以 `y = []` 动不到 `alias_y`，`s = s[::-1]` 过不了判题，装饰完的 `query` 变成了 `wrapper`。
- 一次原地修改（`[:] = `、`.append()`、`+=`）才是真的在改那个东西，所有指着它的名字一起受影响——所以 `x[:] = []` 能把缓存真的清空，`@wraps` 能把原函数的 `__dict__` 整个合并回来。

`x = []` 换的是箭头，`x[:] = []` 动的是箭头所指的东西。这句话能同时解释切片的九个例子、力扣 344 的判题结果，和 `functools.wraps` 那五个属性的来历。
