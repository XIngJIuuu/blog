---
title: Python 学习笔记 Day 7：浅拷贝与深拷贝
published: 2026-09-15
description: Python 第七天笔记：先划清"浅拷贝 vs 深拷贝"这个区分只对复合对象成立（没有内层可变结构时两者返回同一个对象），再讲浅拷贝只造新的外层壳、壳里仍是原对象的引用，用 id()/is 逐个探针证明 copy()/[:] / list() 三种写法等价、嵌套 dict 改内层会连带改到原表、deepcopy 靠 memo 保留共享结构且对不可变对象直接复用；配 LC1480 三版对照谁改了原对象，以及 sorted(key=) 与 .sort() 的区别，关键步骤附 pythontutor 箭头图。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day7
draft: false
pinned: false
---

> [!NOTE]
> 这是第七天 Python 学习笔记。Day 6 的结论是"变量是贴在对象上的名字贴纸，赋值不复制数据"，那么自然要问下一句：**想真的要一份独立的，该怎么办？** 今天就是把这件事用 7 个探针跑穿。
>
> 两条要背下来的规则，我先不看笔记默写在练习文件的最顶上：
>
> ```python
> # 浅拷贝只造一个新的外层壳，壳里装的还是原来那些对象的引用。
> # 只有一层的列表/字典浅拷贝就够；嵌套容器必须 deepcopy。
> ```
>
> 每个例子都是"先写注释猜输出 → 再运行验证"，对不上就直接把注释（有时是代码本身）改对，错误的结论不留在练习文件里。今天 6 张箭头图是 `d2_pythontutor.py` 贴进 pythontutor 截的，看之前记着把语言选成 **Python 3.8+ (CPython)**——默认的 Skulpt 是 JS 重写的解释器，`deepcopy` 那几张会画错。另外今天还把「返回函数与闭包」「装饰器」两块一起整理了，内容自成一条线，另开一篇写。

## 一、先给结论：浅拷贝复制了什么

`copy` 模块提供两个函数，官方定义的区别就一句话：

- **浅层复制（`copy.copy()`）**：构造一个新的复合对象，然后**在尽可能的范围内**把原对象里那些对象的**引用**插进去。
- **深层复制（`copy.deepcopy()`）**：构造一个新的复合对象，然后**递归地**把原对象里各对象的**副本**插进去。

"新外壳 + 旧内层"，这就是"浅"这个字的全部含义。

### 1. 先划清范围：深浅拷贝这个区分，只对「复合对象」成立

官方那两句定义里有个很容易被跳过去的词——**复合对象**。它指的是"**里面还装着别的对象的对象**"：列表、字典、集合、类的实例都算；而 `5`、`'ab'`、`None` 这类标量不算，它们内部没有指向其他对象的槽位。

浅拷贝和深拷贝的全部区别，都来自"里面那些对象"：浅拷贝往里插**引用**，深拷贝往里插**副本**。那么一个对象如果**根本没有"里面"**，这两句话就退化成同一句话——没东西可插。

```python
n = 5
print(copy.copy(n) is n, copy.deepcopy(n) is n)   # True True ← 两个"拷贝"都是原对象本身
```

**对不可变标量来说，"用浅的还是深的"这个问题本身不成立。** 官方文档那句限定才是理解全篇的钥匙：**区别仅与复合对象有关**。按"有没有内层、内层可不可变"把对象分档，差别在哪一档才显现就一目了然：

| 对象 | 有内层吗 | 内层可变吗 | 浅 vs 深有区别吗 | 实测 |
|---|---|---|---|---|
| `5` / `'ab'` / `None` | 无 | — | **没有**，两者都原样返回 | `copy.copy(n) is n` → `True` |
| `(1, 2)` 纯不可变元组 | 有 | 不可变 | **没有**，两者都原样返回 | `copy.deepcopy(ti) is ti` → `True` |
| `[1, 2, 3]` 一层列表 | 有 | 不可变 | 有区别，但**浅拷贝就够** | 浅/深都造新外壳，内层没得共享 |
| `[[1, 2], [3, 4]]` | 有 | **可变** | **区别正是在这一档显现** | 浅拷贝内层共享，深拷贝内层重建 |
| `{"users": [{...}]}` | 有 | **可变** | 同上，也就是咬人的地方 | 见第四节 |

于是"该用哪种拷贝"变成一个**先看结构、再看函数**的动作，三步就能定：

1. 数据里**全是不可变对象** → 根本不用拷（Day 6 那条"不可变所以安全"）。
2. **只有一层可变容器**（列表里全是数字/字符串，字典的值全是标量）→ 浅拷贝足够。
3. **有第二层可变容器**（列表套列表、字典套列表/字典、对象身上挂着 list 属性）→ 必须 `deepcopy`，或者手动重建那一层。

所以"**浅拷贝不安全**"这个说法本身是错的：不安全的从来不是"浅"这个策略，而是"**对象有内层可变结构，而你只换了外壳**"。同一个 `copy.copy()`，拷 `[1, 2, 3]` 完全安全，拷 `[[1, 2], [3]]` 就是事故——**函数没变，变的是数据的形状**。

### 2. 三种浅拷贝写法有区别吗

```python
data = [[1, 2], [3, 4]]

s1 = data.copy()     # 列表自带的方法
s2 = data[:]         # 切片
s3 = list(data)      # 构造函数

print(s1 is data)            # False，外壳是新的
print(s1 is s2)              # False，三个互不相同的新列表
print(s1[0] is data[0])      # True ← 内层还是原来那个子列表！
print(s2[0] is data[0])      # True
print(s3[0] is data[0])      # True
```

**结果：三者行为完全一致**，都是浅拷贝。区别只在实现路径（方法 / 切片协议 / 构造函数）和适用范围——`list(data)` 会把任意可迭代对象转成列表（元组、生成器都行），`data.copy()` 和 `data[:]` 要求 `data` 本身是列表。日常写 `data.copy()` 最直白。

画成箭头图：

```text
data ──► 列表#1 ─┬─► 子列表A [1, 2]
                 └─► 子列表B [3, 4]

s1   ──► 列表#2 ─┬─► 子列表A      ← 同一个对象，谁改它两边都看得见
                 └─► 子列表B
```

于是这一句就顺理成章地"翻车"：

```python
s1[0].append(99)
print(data)   # [[1, 2, 99], [3, 4]] ← 我明明拷了一份啊？
```

`s1[0].append(99)` 动的不是 `s1` 那个外壳，而是外壳里第一格**指向的那个子列表**——而那个子列表和 `data[0]` 是同一个对象。

pythontutor 停在 `s1[0].append(99)` 这一帧最清楚：`data` / `s1` / `s2` / `s3` 四根外层箭头各自指着四个不同的 list，而它们的内层箭头全挤在同一个 `[1, 2, 99]` 上——那个 99 四边都看得见：

[![浅拷贝之后：四个外壳各自独立，内层箭头仍指向同一个 list](/posts/python-learning-day7/shallow-shared-inner.png)](/posts/python-learning-day7/shallow-shared-inner.png)

## 二、用 `id()` 把"浅"这个字钉死

Day 6 学过 `is` 等价于比 `id()`。这里正好用它当探针：

```python
data = [[1, 2], [3, 4]]
shallow = data.copy()

print(id(shallow) == id(data))         # False —— 外壳是新的
print(id(shallow[0]) == id(data[0]))   # True  —— 内层是旧的
```

**"浅"不是一句感觉，它是一个可以打印出来看的 `id()` 关系**：外层两个不同的地址，内层同一个地址。以后判断"这两份数据到底共不共享"，别猜，打一行 `id()`。

## 三、为什么只有一层的列表，浅拷贝就够了

```python
a = [1, 2, 3]
b = a.copy()
b[0] = 99
print(a)   # [1, 2, 3] ← 原表毫发无损
```

对比第一节的 `s1[0].append(99)`，差别在于这两类操作根本不在同一层：

| 操作 | 动的是 | 影响原表吗 |
|---|---|---|
| `b[0] = 99` | **外壳的槽位**（换一根箭头） | 不影响（外壳已经是新的） |
| `b[0].append(99)` | **槽里那个对象自己** | 影响（内层箭头还共享着） |

一层列表里装的全是 int / str 这类不可变对象，"改元素"只能是 `b[0] = ...` 这种换槽操作，所以浅拷贝必然够用。**一旦容器嵌套了可变对象（列表套列表、字典套列表），第二层就开始共享**，这才是浅拷贝咬人的地方。

> 这正是 Day 6 第四节"元组的不可变只锁槽位"的同一套语言：**先问这次动的是绑定还是对象内容**，再判断谁会受影响。

## 四、嵌套字典：同一份数据，两种拷贝，结果相反

这是今天最该记住的一个例子（也是 pythontutor 上最值得画一遍的一张图）：

```python
import copy

info = {"users": [{"name": "张三"}], "count": 1}

sh = copy.copy(info)          # 浅：新外壳，users 那个列表仍是共享的
dp = copy.deepcopy(info)      # 深：每一层都重建

sh["users"][0]["name"] = "被浅拷贝连带改掉了"
dp["users"][0]["name"] = "深拷贝改的是自己"
sh["count"] = 99

print(info)   # {'users': [{'name': '被浅拷贝连带改掉了'}], 'count': 1}
print(sh)     # {'users': [{'name': '被浅拷贝连带改掉了'}], 'count': 99}
print(dp)     # {'users': [{'name': '深拷贝改的是自己'}], 'count': 1}
```

三行操作，三种结果：

- `sh["users"][0]["name"] = ...` → **改到了原表**。因为 `sh["users"] is info["users"]` 为 True，浅拷贝只换了最外层那个 dict 的壳。
- `dp["users"][0]["name"] = ...` → **没改到原表**。`dp["users"] is info["users"]` 是 False，内层是全新对象。
- `sh["count"] = 99` → **没改到原表**。这一句和第一句形式像、性质完全不同：它是**给外层新壳的一个键重新绑定值**，动的是外壳，而外壳确实是新的。

```text
info ──► dict#1 ─┬─ "users" ──► 列表#A ──► dict#X {name:...}
                 └─ "count" ──► 1

sh   ──► dict#2 ─┬─ "users" ──► 列表#A   ← 共享！改 sh["users"][0] 就是改 info
                 └─ "count" ──► 1        ← 换绑定，改 sh["count"] 与 info 无关

dp   ──► dict#3 ─┬─ "users" ──► 列表#B ──► dict#Y   ← 全新
                 └─ "count" ──► 1        ← 不可变，直接复用同一个对象
```

同一时刻 pythontutor 里真实长这样（三行赋值都执行完了）：`info` 和 `sh` 的 `"users"` 两根箭头指同一个 list，那个 list 里的 dict 已经是"被浅拷贝连带改掉了"；`sh` 的 `"count"` 那格单独换绑成 99，`info` 的仍是 1；`dp` 则连着一个全新的 list → dict：

[![嵌套字典：info 与 sh 共享 users 列表，sh 的 count 已换绑，dp 内层全新](/posts/python-learning-day7/nested-dict-shallow-deep.png)](/posts/python-learning-day7/nested-dict-shallow-deep.png)

**这就是 RAG / 数据处理里最常见的隐性 bug**：从缓存里取出检索结果 `list`，`copy.copy()` 一份出来加打分字段，结果缓存里那份也被改了——因为嵌套的那层 score 字典是共享的。规矩很简单：**结构里只要还有一层可变容器，就 `deepcopy`**。

## 五、`copy.copy()`、`.copy()`、`[:]` 是什么关系

```python
d = {"a": [1]}
print(copy.copy(d) is d)          # False
print(d.copy() is d)              # False
print(copy.copy(d)["a"] is d["a"])  # True  ← 两种写法一样浅
```

`copy.copy(x)` 是**通用入口**：它先看对象自己有没有 `__copy__()`，再退回 `reduction` 机制，最后才用通用策略；对 list / dict 这些内置类型，效果就等于它们自己的 `.copy()`。区别在于 `copy.copy()` **什么都能接**，而 `.copy()` 只有部分类型有（`set`、`dict`、`list` 有，元组和字符串压根没有 `.copy()` 方法）。

### 1. `dict.copy()` / `set.copy()` 也浅吗

字典：浅，和上面一样（`d.copy()["a"] is d["a"]` 为 True）。

集合要单独说一句，因为它的"浅"几乎表现不出来：

```python
set_data = {1, 2, 3}
set_shallow = set_data.copy()
set_shallow.add(4)

print(set_data)       # {1, 2, 3}      ← 原集合根本没变！
print(set_shallow)    # {1, 2, 3, 4}
```

`add()` 是**往新外壳里塞一个元素**，动的是外壳，不是元素对象，所以原集合不受影响。而且 `set` 的元素必须**可哈希**，能放进去的基本都是不可变类型（int / str / tuple / frozenset），压根没有"内层可变对象"可以共享。**结论：`set.copy()` 名义上也是浅拷贝，但实践中感觉不到差别**——想验证浅拷贝连带修改的坑，得拿 list / dict 来试，用 set 是验不出来的。

### 2. 元组是个特例：浅拷贝连对象都不换

```python
t = ([1, 2],)

print(copy.copy(t) is t)   # True  ← 浅拷贝直接把原对象还给你
```

元组不可变，复制它没有任何意义，所以 `copy.copy()` 对它的策略就是"原样返回"。**但 `deepcopy` 反而会重建**：

```python
print(copy.deepcopy(t) is t)            # False —— 新建了一个元组
print(copy.deepcopy(t)[0] is t[0])      # False —— 里面那个列表也另造了一个
```

截图里 `t` 和 `t2` 两根箭头落在同一个 tuple 上，`t3` 指向另一个 tuple，而且它俩的第 0 格连着两个**不同**的 `[1, 2]`：

[![元组特例：copy.copy 原样返回，deepcopy 连元组带内层列表一起重建](/posts/python-learning-day7/tuple-copy-vs-deepcopy.png)](/posts/python-learning-day7/tuple-copy-vs-deepcopy.png)

因为 `deepcopy` 的职责是"递归复制所有内容"，遇到装着可变对象的元组，它必须把内层列表复制掉才能保证独立，于是外壳（元组）只能顺手重建。如果元组里全是不可变对象，那它也没得复制，照样原样返回：

```python
ti = (1, 2)
print(copy.copy(ti) is ti, copy.deepcopy(ti) is ti)   # True True
```

## 六、`deepcopy` 到底"深"到哪一层

`deepcopy` 不是无脑递归，官方文档里那三句限定条件才是重点：

1. **循环引用**：对象直接或间接引用自己，无脑递归会死循环。
2. **memo 备忘录**：`deepcopy` 维护一个"已经复制过哪些对象"的字典，同一个对象在一次复制里只复制一次。
3. **不可变对象照旧复用**：int / str / bytes / float / bool / None、函数、类等，直接返回原对象。

把它的骨架写出来大概是这样（`test1.py` 里我自己推的那份伪代码，去掉了自定义类的分支）：

```python
def deepcopy(x, memo=None):
    if memo is None:
        memo = {}

    if id(x) in memo:                    # 复制过了 → 直接给之前的副本
        return memo[id(x)]               # 这一句同时解决了循环引用

    if isinstance(x, (int, str, bytes, float, bool, type(None))):
        return x                         # 不可变原子对象：原样返回

    if isinstance(x, list):              # 容器：先建空壳登记进 memo……
        y = []
        memo[id(x)] = y
        for item in x:                   # ……再递归填每个元素
            y.append(deepcopy(item, memo))
        return y
    # 元组/字典/集合/自定义对象同理（自定义可走 __deepcopy__ 或 __reduce_ex__）
```

先确认它把深拷贝画成什么样：`deep = copy.deepcopy(data)` 之后 `deep` 的两根内层箭头指向的是**新建的两个子列表**，`deep[1].append(77)` 那个 77 只出现在 `deep` 那份里，`data` 完全看不到：

[![深拷贝：deep 的外壳和内层全是新对象，77 只进了 deep](/posts/python-learning-day7/deepcopy-new-all.png)](/posts/python-learning-day7/deepcopy-new-all.png)

### 1. memo 的副作用：深拷贝复制的是"结构"，包括共享关系

```python
shared = [0]
pair = [shared, shared]        # 两个槽指向同一个列表

pc = copy.deepcopy(pair)
pc[0].append(1)

print(pc)                      # [[0, 1], [0, 1]] ← 两个都变了
print(pc[0] is pc[1])          # True ← 副本内部仍然共享！
print(shared)                  # [0]  ← 原对象一点没动
```

箭头图上，`shared` 和 `pair` 那两根仍然挤在原来的 `[0]` 上（左边没被碰过），而 `pc` 的两个槽指向**同一个**新列表 `[0, 1]`：

[![memo：pair 的两个槽共享同一个列表，deepcopy 之后 pc 的两个槽也共享同一个新列表](/posts/python-learning-day7/memo-shared-structure.png)](/posts/python-learning-day7/memo-shared-structure.png)

原对象里"两处共用一个列表"这个**结构关系**，`deepcopy` 会原样搬到副本里：第一次复制 `shared` 时把它记进 memo，第二个槽再遇到同一个对象，直接取现成的副本。所以深拷贝保证的是"**副本内部**的共享关系与原对象一致"，而不是"把所有东西都造两遍"。少了 memo，遇到 `a.append(a)` 这种自引用结构就直接递归爆栈了。

### 2. 不可变对象不复制：`deepcopy` 对它们"不深"

```python
n = 10 ** 18                 # 故意用一个大整数，绕开小整数缓存
print(copy.deepcopy(n) is n)         # True
print(copy.deepcopy("abc") == "abc") # True，且是同一个对象
```

截图里 Objects 那一侧压根没多出第二个 int：`n` 和 `nc` 只是 Global frame 里两行字面值相同的记录，连箭头都没有——没有新对象被造出来：

[![不可变对象：deepcopy 之后 nc 与 n 共用同一个 int，Objects 面板没有新对象](/posts/python-learning-day7/immutable-deepcopy-reuse.png)](/posts/python-learning-day7/immutable-deepcopy-reuse.png)

`10 ** 18` 早就出了 `-5 ~ 256` 的缓存区间，`is` 仍然是 True——这就证明它不是 Day 6 那个缓存巧合，而是 `deepcopy` 的**原子对象快速路径**：不可变对象复制了也没人能用出差别，那就别复制。

回到第四节那个字典，选做题的答案也就明确了：

```python
info = {"users": [{"name": "张三"}], "count": 1}
dp = copy.deepcopy(info)

print(dp["count"] is info["count"])   # True  ← 不可变，复用同一个 int 对象
print(dp["users"] is info["users"])   # False ← 可变，必须另造
```

**"深拷贝"这个名字容易让人以为什么都复制了一遍，其实它只复制可变对象。** 这正是 Day 6 那条"不可变所以安全"的延伸应用。

### 3. 那文档里"可能会过多复制"指什么

官方文档提醒：深拷贝会复制所有内容，**包括本应该在副本之间共享的数据**。这里的"共享"指的是**跨出这次复制范围**的共享——单例、全局缓存、数据库连接、打开的文件句柄。这些对象被 `deepcopy` 拖进副本后就变成私有的一份，连接可能被重复建立、缓存可能失效。所以实践里 `deepcopy` 只用来拷**纯数据**（列表、字典、嵌套配置），带资源的东西不要拷，要么传引用，要么自己实现 `__deepcopy__`。

## 七、切片也是浅拷贝（先埋一颗雷）

```python
list_data = [[1, 2], [3, 4]]
b = list_data[:]          # 切片
b[0].append(99)

print(list_data)   # [[1, 2, 99], [3, 4]]
```

Day 4 学切片时说过"`L[:]` 是快速复制 list 的常用写法"——今天补上后半句：**它复制的也只是外壳**。`data[:]`、`data.copy()`、`list(data)`、`copy.copy(data)` 四种写法在"浅"这一点上完全等价，没有哪一种是安全的深拷贝。

## 八、回到实战：同一道题的三版，谁改了原对象

力扣 1480「一维数组的动态和」（昨天欠的那道），`runningSum([1,2,3,4]) → [1,3,6,10]`。三个版本正好用来验证今天的全部概念：

```python
def running_sum_new(nums):
    """版本一：新建列表。只读 nums，从不写它。O(n) 时间 / O(n) 额外空间"""
    res, total = [], 0
    for x in nums:
        total += x
        res.append(total)
    return res

def running_sum_inplace(nums):
    """版本二：原地改。改的就是传进来那个对象本身。O(n) 时间 / O(1) 额外空间"""
    for i in range(1, len(nums)):
        nums[i] += nums[i - 1]
    return nums

def running_sum_accumulate(nums):
    """版本三：itertools.accumulate 一行。它是惰性迭代器，必须 list() 才落地"""
    from itertools import accumulate
    return list(accumulate(nums))
```

```python
a = [1, 2, 3, 4]
r1 = running_sum_new(a)
print(r1)       # [1, 3, 6, 10]
print(a)        # [1, 2, 3, 4]  ← 原表没动：res.append 写的是新对象

b = [1, 2, 3, 4]
r2 = running_sum_inplace(b)
print(r2)       # [1, 3, 6, 10]
print(b)        # [1, 3, 6, 10] ← 原表被改了
print(r2 is b)  # True ← 返回值和入参是同一个对象，互为别名

c = [1, 2, 3, 4]
r3 = running_sum_accumulate(c)
print(r3)       # [1, 3, 6, 10]
print(c)        # [1, 2, 3, 4]  ← accumulate 只读入参，等价于版本一
```

`r2 is b` 为 True 是全篇最直观的一个证据：**原地版没有产生第二个列表**，它改完就把同一个对象顺手返回了。所以调用方拿到 `r2` 又去 `print(b)`，看到的已经是前缀和——如果 `b` 还是别的模块缓存着的数据，事故就发生了。

写函数时把"原地改"还是"返回新对象"标进文档字符串，就是在替调用方省掉一次 `deepcopy` 或者一次猜谜。

## 九、`sorted()` 的 `key`：比较的是 key，返回的是原元素

`sorted(iterable, key=..., reverse=...)` **返回新的已排序列表**；`.sort()` 原地排、返回 `None`——所以这又是"到底改没改原对象"那一题：

```python
scores = [88, 72, 95]
print(scores.sort())          # None
print(sorted(scores))         # [72, 88, 95]，原列表没动
```

`key` 传一个函数，排序比较的是**这个函数返回的值**，而不是元素本身：

```python
print(sorted([-3, -1, 2], key=abs))   # [-1, 2, -3]
```

> [!WARNING]
> `key=abs` 之后比较的是 `1, 2, 3`（对应 `-1, 2, -3`），但**排完返回的还是原元素，不是 key 的值**。`[-1, 2, -3]` 才是结果，写成绝对值序列 `[1, 2, 3]` 就把"排序依据"当成"输出"了。

按字母排序时 `key` 最常见的用法是忽略大小写：

```python
names = ['bob', 'about', 'Zoo', 'Credit']

print(sorted(names))                    # ['Credit', 'Zoo', 'about', 'bob']
print(sorted(names, key=str.lower))     # ['about', 'bob', 'Credit', 'Zoo']
```

默认按字符编码比，大写 `C`/`Z` 排在小写前面，看着很别扭；`key=str.lower` 让它比的是小写形式，结果才符合直觉。

对"名字 + 分数"这种元组列表，`key` 可以指定函数，也可以直接配 `lambda`：

```python
L = [('Bob', 75), ('Adam', 92), ('Bart', 66), ('Lisa', 88)]

def by_name(t):
    return t[0]

def by_score(t):
    return t[1]

print(sorted(L, key=by_name))                    # [('Adam',92),('Bart',66),('Bob',75),('Lisa',88)]
print(sorted(L, key=by_score))                   # [('Bart',66),('Bob',75),('Lisa',88),('Adam',92)]
print(sorted(L, key=by_score, reverse=True))     # [('Adam',92),('Lisa',88),('Bob',75),('Bart',66)]
```

`reverse=True` 是降序。`key=by_score` 和 `key=lambda t: t[1]` 等价，后者省掉一个只用一次的函数名（Day 6 的 `lambda`）。

## 十、小结

- **这个区分只对复合对象成立**：没有内层可变结构时，`copy.copy()` 和 `copy.deepcopy()` 给你的就是同一个东西。所以顺序是**先看数据的形状，再选函数**，不是反过来——"浅拷贝不安全"是误读，不安全的是"有内层可变结构却只换外壳"。
- **两条规则**：浅拷贝只造新的外层壳，壳里装的还是原来那些对象的引用；只有一层的列表/字典浅拷贝就够，嵌套容器必须 `deepcopy`。
- **四种浅拷贝写法等价**：`data.copy()` / `data[:]` / `list(data)` / `copy.copy(data)` 都是新外壳 + 共享内层，`s1[0] is data[0]` 打印出来就是 True。
- **换槽 vs 改对象**：`b[0] = 99` 动外壳的槽（安全），`b[0].append(99)` 动槽里那个共享对象（咬人）。判断永远从"这次动的是绑定还是内容"出发。
- **`copy.copy()` 是通用入口**，内置容器效果同 `.copy()`；元组是特例——浅拷贝直接原样返回（`copy.copy(t) is t` 为 True），`deepcopy` 反而因为要复制内层可变对象而重建元组。
- **`set` 的浅拷贝感觉不到**：元素必须可哈希（基本都是不可变类型），`add()` 又只动外壳，所以原集合不会变——想复现浅拷贝咬人的现象，得用 list / dict。
- **`deepcopy` 靠 memo**：解决循环引用，并让副本**保留原对象内部的共享结构**（`pc[0] is pc[1]` 仍为 True）；对不可变对象（int / str / 函数 / 纯不可变元组）直接复用，连 `10**18` 都是 `is` True。
- **`deepcopy` 的边界**：只拷纯数据。单例、连接、文件句柄这类"本该共享"的东西会被复制成私有副本，那是文档说的"过多复制"。
- **`sorted()` 返回新列表、`.sort()` 原地排返回 `None`**；`key` 传函数、比较的是 key 的返回值、但结果里装的是原元素。

今天最有价值的一刻是把 `sh["users"][0]["name"] = ...` 和 `sh["count"] = 99` 放在一起看：两句长得几乎一样，一句改到了原表、一句没有，差别全在"**等号左边有几层下标**"——穿透的层数越多，越可能撞到共享的那个内层对象。下一篇讲可变默认参数 `def bad(item, lst=[])`，那个坑正是"名字绑定 + 可变对象"这两样东西凑到一起的爆点。
