---
title: Python 学习笔记 Day 9：生成器的代价与迭代器协议
published: 2026-09-17
description: Python 第九天笔记：函数体里出现 yield 就变成生成器函数，调用它只造对象、一行都不执行，用 next() 手动驱动并在 pythontutor 里看到帧什么时候出现；三条硬代价——只能消费一次、错误被推到第一次 next、没有 len 和下标，配 getsizeof 实测 208 字节对 8856/800984/8448728、三层生成器链三跑对比 105/105/0、迭代器协议 __iter__/__next__/StopIteration 与 for 的等价写法；附廖雪峰第 9 章模块预读（hello.py 四种跑法）和 sys.py / copy.py 命名冲突的实测对照。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day9
draft: false
pinned: false
---

> [!NOTE]
> 这是第九天 Python 学习笔记。Day 8 把"名字绑定"这条线走完了（默认参数、闭包、装饰器），今天换一个方向：**数据什么时候被算出来，以及一个对象能被取几次。**
>
> 每个例子都是"先写注释猜输出 → 再运行验证"，对不上就直接把注释（有时是代码本身）改对，错误的结论不留在练习文件里。三张箭头图是把探针 ①② 贴进 pythontutor 截的，语言选 **Python 3.11 (CPython)**。
>
> 练习文件是 `python/day9/d4_generator.py`（九个探针）和 `python/day9/hello.py`（模块预读）。原计划把 D5「切片」并进这一篇一起发，但那组探针今天没跑完，**切片留到下一篇**——不写没跑过的东西。

## 一、先给结论：`yield` 把"什么时候算"交给了调用方

一个函数只要**函数体里出现 `yield`**，它就不再是普通函数，而是**生成器函数**；调用它的返回值也不是计算结果，而是一个**生成器对象**：

```python
def gen():
    print('A')
    yield 1
    print('B')
    yield 2

g = gen()          # ← 这一行什么都没打印！
print(type(g))     # <class 'generator'>
```

普通函数和生成器函数的区别全在"调用那一刻发生了什么"：

| | 普通函数 `def f(): return ...` | 生成器函数 `def g(): yield ...` |
|---|---|---|
| 调用 `f()` 时 | 函数体**立刻从头执行到尾** | 函数体**一行都不执行**，只造一个生成器对象 |
| 返回值 | `return` 后面那个值 | 一个可迭代的生成器对象 |
| 数据在哪 | 全部算完，躺在返回值里 | 每次 `next()` 才算下一段 |
| 能用几次 | 返回值想用几次用几次 | **只能消耗一次** |

"惰性求值"这四个字落到实处就是这一句：**表达式没有消失，只是被推迟到有人来要的时候才算。** 而"有人来要"这个动作，就是 `next()`。

## 二、用 `next()` 手动驱动，看函数体到底什么时候开始跑

把上面那个 `gen()` 手动驱动到底，实测输出长这样（`python d4_generator.py` 的真实输出，一个字没改）：

```python
g = gen()          # 什么都不打印
print(next(g))     # A ← 先打印函数体里的 A，再打印 next 的返回值 1
                   # 1
print(next(g))     # B
                   # 2
try:
    next(g)
except StopIteration as e:
    print('StopIteration:', repr(e.value))
                   # StopIteration: None
```

同一个探针在 pythontutor 里停三个时刻，箭头是这么长的。第一张停在 `g = gen()` 执行完之后（底部写着 `Done running (2 steps)`）：右边 `Global frame` 里 `gen` 指向函数对象、`g` 指向一个 **generator instance**，而**整个画面里没有任何函数栈帧**——`print('A')` 那一步根本没发生过：

[![g = gen() 之后：只有 generator instance，没有函数帧，函数体一行都没执行](/posts/python-learning-day9/generator-call-no-frame.png)](/posts/python-learning-day9/generator-call-no-frame.png)

第二张是 `print(next(g))` 刚执行完 `yield 1`（Step 7 of 12）：右下角多出了一个 **`gen` 帧**，里面写着 `Return value 1`，右上角 Print output 只有 `A`——**外层那句 `print` 还没执行**，它正等着这个值。这个"停在 `yield` 上、帧不销毁"的状态，就是惰性最直观的一张图：

[![第一次 next：gen 帧出现并停在 yield 1，Return value 1 挂在帧上，Print 面板只有 A](/posts/python-learning-day9/generator-first-next-paused.png)](/posts/python-learning-day9/generator-first-next-paused.png)

第三张是第二次 `next(g)` 之后（Step 12 of 12）：Print output 变成 `A / 1 / B`，`gen` 帧还在，`Return value` 换成了 `2`——函数体的执行位置**从上一次停下的地方继续往前**，而不是从头再来。这就是"生成器会记住自己走到哪"的字面意思：

[![第二次 next：函数从 yield 1 之后继续，打印 B，Return value 变成 2](/posts/python-learning-day9/generator-second-next-return2.png)](/posts/python-learning-day9/generator-second-next-return2.png)

普通函数的栈帧是"进去、出来、销毁"，生成器的栈帧是**造出来之后一直挂在那里，`next()` 推一把它走一段**。协程（`await`、事件循环那套东西）就是把这个"挂起—被推一把"的机制放大成调度单位，所以这三张图也是后面要用的地基。

## 三、`StopIteration` 与 `for` 循环：一个从来不抛，一个天天在抛

取完最后一个值再取，抛 `StopIteration`：

```python
except StopIteration as e:
    print('StopIteration:', repr(e.value))   # StopIteration: None
```

**`for` 循环从来不见到这个异常，是因为它自己把它吞了。** `for x in it:` 完全等价于这段手写循环：

```python
it3 = iter([1, 2])
while True:
    try:
        x = next(it3)
    except StopIteration:      # ← 异常在这里被吃掉，循环体一次都不进
        break
    print('手写版拿到', x)      # 手写版拿到 1 / 手写版拿到 2
```

跑出来和 `for` 一模一样。所以 `for` 不是"支持 list 也支持生成器"，而是**它只支持一样东西：迭代器**。它干的第一件事就是偷偷调 `iter()`，把你要遍历的东西变成一个一次性游标，然后不断 `next()`，直到吃到 `StopIteration` 为止。

于是"迭代器协议"就两条，一句话能说清：

```python
class Counter:
    def __init__(self, n):
        self.i, self.n = 0, n
    def __iter__(self):          # 返回迭代器本身
        return self
    def __next__(self):          # 逐个给，没了抛 StopIteration
        if self.i >= self.n:
            raise StopIteration
        self.i += 1
        return self.i

print(list(Counter(3)))   # [1, 2, 3]  —— 自己写的类也能直接进 for
```

跑出来是 `[1, 2, 3]`，和内置对象没有任何区别：`for` 只认这两条协议，不认对象出身。

这两条在内置对象上能直接打印出来验证：

```python
lst = [1, 2, 3]
it = iter(lst)

print(iter(it) is it)            # True  ← 迭代器的 __iter__ 返回自己
print(iter(lst) is iter(lst))    # False ← list 每次 iter() 都造一个新游标
```

**这两行是整个协议最本质的差别**：list 是"可以被变成游标的东西"，游标本身才是迭代器。同一份数据，`iter()` 两次得到两个互不相干的游标；而对一个迭代器调 `iter()`，它原地返回自己——所以它的"走到哪了"这个状态是**共享**的，这就埋下了第五节那个坑。

## 四、可迭代对象 ≠ 迭代器

`list` 和生成器都能进 `for`，看起来是一回事，但 `next()` 一按就分家了：

```python
print(next([1, 2]))
# TypeError: 'list' object is not an iterator

print(next(iter([1, 2])))   # 1
```

报错信息说得很直白：**list 不是迭代器**。用 `collections.abc` 把身份查清楚：

```python
import collections.abc as abc

isinstance([1, 2], abc.Iterable)          # True  —— 能被 iter()
isinstance([1, 2], abc.Iterator)          # False —— 不能直接 next()
isinstance(iter([1, 2]), abc.Iterator)    # True  —— iter() 之后才是
```

| | 有 `__iter__` | 有 `__next__` | 能 `next()` | 能进 `for` | 能用几次 |
|---|---|---|---|---|---|
| `list` / `dict` / `str` | ✅ | ❌ | ❌ | ✅ | **无限次**（每次 `for` 自己造新游标） |
| `iter(lst)` 得到的游标 | ✅（返回自己） | ✅ | ✅ | ✅ | **一次** |
| 生成器 | ✅ | ✅ | ✅ | ✅ | **一次** |

**工程后果**（这是今天最该记住的一条，因为它会变成真实的 bug）：

```python
it = iter([1, 2, 3])
print('第一轮:', [x for x in it])   # 第一轮: [1, 2, 3]
print('第二轮:', [x for x in it])   # 第二轮: []      ← 同一个游标已经被抽干

lst = [1, 2, 3]
print('lst 第一轮:', [x for x in lst])   # [1, 2, 3]
print('lst 第二轮:', [x for x in lst])   # [1, 2, 3]  ← 每次都新造游标，安然无恙
```

于是函数签名上就有了一道必须做的选择题：

```python
def summarize(rows):        # rows 是 list 还是 iterator？行为完全不同
    total = sum(r['score'] for r in rows)
    return total, len(list(rows))     # ← 第二行拿到的是空表，因为上一行已经把它抽干了

summarize(iter([{'score': 1}, {'score': 2}, {'score': 3}]))   # (6, 0)  ← 条数没了
summarize([{'score': 1}, {'score': 2}, {'score': 3}])         # (6, 3)  ← 传 list 才对
```

同一个函数、同样的数据，**只是外面套了个 `iter()`，第二个返回值就从 3 变成 0**，而且全程不报任何错。

> [!WARNING]
> **参数收 `Iterable` 是安全的，收 `Iterator` 就是"我只吃一遍"的契约。** 拿到一个 iterator 参数又想遍历两遍，唯一正确的做法是先 `rows = list(rows)` 落地一次。写数据处理函数时，如果不确定调用方会传什么，开头一句 `if not isinstance(x, list): x = list(x)` 比 debug 一小时便宜。

这条正是阶段三的地基：批量文档做 embedding 时用生成器一条一条喂（省内存），但**同一条链不能既拿来统计条数、又指望它后面还有数据**——第一条链已经被你自己抽干了。

## 五、只能消耗一次，以及"空掉的到底是什么"

```python
g4 = (x * x for x in range(3))     # 生成器表达式，圆括号版
print(list(g4))                    # [0, 1, 4]
print(list(g4))                    # []  ← 第二次是空的，而且不报错
```

Day 6 在 `map` 上已经撞过一次同样的现象（`map` 返回的也是迭代器），今天正式收口。收口的证据是这道三层生成器链——读文件的每一行 → 跳过空行 → 统计行数：

```python
def read_lines(path):
    """一次只读一行。"""
    with open(path, encoding='utf-8') as f:
        for line in f:
            yield line

def non_empty(lines):
    """跳过空行。"""
    for ln in lines:
        if ln.strip():
            yield ln

chain = non_empty(read_lines(HERE))     # HERE 就是这份练习文件自己

first     = sum(1 for _ in chain)                          # 第一次跑完这条链: 105
again_new = sum(1 for _ in non_empty(read_lines(HERE)))    # 重新造一条新链:   105
again_same = sum(1 for _ in chain)                         # 同一个 chain 再跑: 0
```

三跑对比 **105 / 105 / 0**（那个数就是这份文件当时的非空行数，你改一个字它就跟着变，重要的是三者的**关系**）。为什么第二个和第三个结果不一样？

> **空掉的是"那个生成器对象"，不是"那个函数"。**
>
> `chain` 是一个已经走到尽头的对象——它的内部游标停在函数体的末尾，再 `next()` 只能立刻抛 `StopIteration`，`sum` 收到 0 个元素。而 `non_empty(read_lines(HERE))` 是**重新调用函数**，当场造出一个全新的、从头开始的生成器对象，文件被重新打开，所以还是 105。

分清这一点，"复用"的两条路就很自然：

```python
data = list(chain)        # 路线一：落地成 list，之后随便用几次（代价：占内存）
rows = read_lines(HERE)   # 路线二：不存对象，每次用之前重新调用函数造一条新链（代价：文件重开一遍）
```

## 六、`yield` 函数里的 `return`：值拿不到，只能提前结束

```python
def gen_ret():
    yield 1
    return 'done'

g7 = gen_ret()
print('第一个值:', next(g7))     # 第一个值: 1
try:
    next(g7)
except StopIteration as e:
    print('StopIteration.value =', repr(e.value))   # StopIteration.value = 'done'
```

`return 'done'` 里的 `'done'` **不会**出现在遍历结果里，`for` 循环永远拿不到它——它被塞进了 `StopIteration` 异常对象的 `value` 属性，只有手写 `try/except` 才捞得出来。对照第三节那个 `StopIteration: None`：同一位置，`gen()` 是自然走到函数末尾结束的，所以 `e.value` 是 `None`；`gen_ret()` 是被 `return` 提前结束的，所以 `e.value` 是 `'done'`。

结论一句话：**在生成器里，`return` 不是"返回值"，是"结束 + 捎带一个只有异常能看到的附属品"。** 真要把结果交出去，要么 `yield` 出来，要么塞进一个可变对象（列表、字典）里带出来。

## 七、惰性到底省多少：三档实测

`sys.getsizeof` 直接量对象本身：

```python
for n in (1000, 100000, 1000000):
    g = sys.getsizeof(x * x for x in range(n))
    l = sys.getsizeof([x * x for x in range(n)])
    print(n, g, l, l // g)
```

| n | 生成器 | 列表 | 倍数 |
|---|---|---|---|
| 1 000 | **208 字节** | 8 856 字节 | 42 倍 |
| 100 000 | **208 字节** | 800 984 字节 | 3 850 倍 |
| 1 000 000 | **208 字节** | 8 448 728 字节 | 40 618 倍 |

**生成器那一列是常数。** 它只装"代码走到哪了"这一点点状态（一个栈帧 + 几个指针），数据一个都没存；列表那一列随 n 线性涨，因为它真的存了 100 万个整数对象的指针数组。所以"省内存"不是修辞——**数据量越大，差距不是百分比，是量级。**

> [!TIP]
> 但 `getsizeof` 量的只是**容器本身**，不含列表里那些 int 对象占的内存（CPython 的 list 存的是指针）。想精确算"这批数据总共多大"得递归累加。它在这里的用途是**对比趋势**：一个恒定、一个线性，够用了。

代价的另一面，是惰性会把错误推后。这个例子跑出来的**打印顺序**就是证据：

```python
def read_big(path):
    print('[函数体开始执行]')
    with open(path, encoding='utf-8') as f:
        for line in f:
            yield line

g2 = read_big('不存在的文件.txt')
print('调用完成，没有报错')
next(g2)
```

实测输出：

```text
调用完成，没有报错            ← 文件不存在这件事，此刻还没被发现
[函数体开始执行]              ← 直到这里才真的执行
FileNotFoundError: [Errno 2] No such file or directory: '不存在的文件.txt'
```

**报错的位置 ≠ 出事的位置。** 传错路径是在 `read_big(...)` 那一行，炸是在几十行之后第一次 `next()` 的地方，栈看起来"不在案发现场"。数据流水线里这类调试成本很常见，实践做法是：**在函数入口处主动做一次校验**（`if not os.path.exists(path): raise ...`），别指望惰性帮你延后错误。

## 八、把代价摊平：什么时候用生成器，什么时候老老实实建表

| 代价 | 具体表现 | 应对 |
|---|---|---|
| 只能消费一次 | 第二次遍历静默得到空，不报错 | 要复用就 `list()` 落地，或每次重新调用函数 |
| 错误被推后 | 参数错误要等第一次 `next()` 才抛 | 入口处做显式校验 |
| 没有长度、不能索引、不能回退 | `len(g)`、`g[0]` 都 `TypeError` | 需要 `len`/切片就先物化 |
| `return` 被吞 | 值只藏在 `StopIteration.value` | 结果用 `yield` 或可变对象带出来 |
| 每次 `next()` 有帧切换开销 | 比 list 的 C 层遍历慢一个常数倍 | 常数级，除非热点否则不用管 |

换来的是：**内存里只放一行数据，就能处理比内存更大的输入。**

判据我压成一句：**只用一次 / 数据很大 / 流水线一段一段处理 → 生成器；要用多次 / 要 `len` / 要下标 / 要好调试 → 先 `list()` 落地。** 阶段三处理大批文档时按前者写，但"统计条数"和"喂给模型"必须是两条链，不是同一条跑两遍。

## 九、今天的预读：模块就是一个 `.py` 文件

顺手把廖雪峰第 9 章「模块」预读了一遍（原本是 W3 的内容）。核心只有一句：**一个 `.py` 文件就是一个模块，模块名就是文件名去掉 `.py`。**

他的示例文件我照抄跑通了，`python/day9/hello.py`：

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

' a test module '        # 这一行的字符串是模块的文档字符串（hello.__doc__）

__author__ = 'Michael Liao'   # 作者信息，普通模块级变量，没有魔法

import sys

def test():
    args = sys.argv
    if len(args) == 1:
        print('Hello, world!')
    elif len(args) == 2:
        print('Hello, %s!' % args[1])
    else:
        print('Too many arguments!')

if __name__ == '__main__':
    test()
```

四种跑法的实测输出：

```text
$ python hello.py                → Hello, world!          argv = ['hello.py']          长度 1
$ python hello.py Bob            → Hello, Bob!            argv = ['hello.py', 'Bob']   长度 2
$ python hello.py Bob Alice      → Too many arguments!    argv 长度 4
$ python -c "import hello"       → （什么都不打印）        argv = ['-c']
```

`sys.argv` 就是命令行参数列表，**`argv[0]` 永远是你敲的那个脚本路径本身**，所以"没传参数"的判断是 `len(args) == 1`。顺带一个容易忽略的对照：同一个脚本从不同目录跑，`argv[0]` 会跟着变（`python day9/_p.py` 时它是 `'day9/_p.py'`），而 `sys.path[0]` 始终是那个文件**所在的目录**（`'E:\project\python\day9'`）。

最后一行 `if __name__ == '__main__':` 是这一节的重点，也是我在力扣文件里早就见过的写法：**同一个 `.py` 文件既要能被 `import` 当库用，又要能被直接运行当脚本用，靠的就是这个开关。** 被 `import` 时 `__name__` 是模块名 `'hello'`，那段不执行（上面第四条命令实测什么都没打印）；被直接运行时 `__name__` 是 `'__main__'`，才跑 `test()`。

### 1. 命名冲突：廖雪峰那句话的方向要掰正一下

他原文写的是"自己的模块不可命名为 `sys.py`，否则将无法导入系统自带的 `sys` 模块"。我把两种情况都实测了一遍（Python 3.11.9），**结论方向相反，但规矩照样成立**：

```python
# 情况一：本地放一个 sys.py，然后 import sys
import importlib.util
importlib.util.find_spec('sys').origin   # 'built-in'  ← 本地那份根本没被看到
hasattr(sys, '__file__')                 # False
```

`sys` 是**编译进解释器二进制里的内置模块**，而且解释器一启动就已经把它装进 `sys.modules` 缓存了。`import` 的第一步是查这个缓存，所以**内置模块抢不走**——被抢不走的是你自己那份：你写了 `sys.py`，结果 `import sys` 拿到的还是内置的那个，你的文件永远导不进来。

```python
# 情况二：本地放一个 copy.py，然后 import copy
import copy
copy.__file__                    # 'E:\\...\\copy.py'   ← 抢成功了
hasattr(copy, 'deepcopy')        # False                ← 标准库那份整个消失
copy.copy([1, 2])                # '这是我的本地 copy.py，不是标准库那个'
```

`copy`、`random`、`json`、`test` 这些**标准库 `.py` 模块**才是真会被本地同名文件顶掉的——因为脚本所在目录排在 `sys.path` 最前面。

所以正确的记法是这样：

> **别拿内置模块和标准库模块的名字给你的文件命名。** 内置的（`sys`）会让你自己的文件失效，标准库的（`copy` / `json` / `random`）会把库顶掉，两种都是"报错信息完全指不到真凶"的那种坑。
> 起好名字先试一下：`python -c "import 你想起的名"`，**能导入成功就说明这名字已经被占了**。
> 万一踩过一次，删掉文件还不够，要连 `__pycache__/copy.cpython-311.pyc` 一起删——缓存的字节码会让那个坑在你删了源文件之后继续存在。

模块搜索路径本身也就三句话：`sys.path` 是一个列表，**第一条是当前脚本所在目录**，然后是安装目录下的 `Lib\`（标准库，例如 `...\Python311\Lib\copy.py`），最后是 `site-packages`（`pip` 装的第三方）。要加自己的目录，临时用 `sys.path.append(...)`，长期用环境变量 `PYTHONPATH`。

## 十、小结

- **`yield` 改变函数语义**：函数体里出现 `yield`，调用它只造生成器对象、**函数体一行都不执行**；`type(g)` 是 `<class 'generator'>`。pythontutor 上那三张图的关键就是"帧什么时候出现"——第一次 `next()` 才有帧，之后帧挂在 `yield` 上不走。
- **`StopIteration` 是 `for` 的终止信号**：`for x in it` 等价于 `while True` + `next()` + `try/except StopIteration: break`，所以 `for` 从来不见这个异常。生成器自然结束时 `e.value` 是 `None`，被 `return` 提前结束时 `e.value` 是那个返回值。
- **迭代器协议两条**：`__iter__()` 返回自己、`__next__()` 逐个给且没了抛 `StopIteration`。实测 `iter(it) is it` 为 True，而 `iter(lst) is iter(lst)` 为 False——**list 不是迭代器，它只是"可以被变成游标"**，`next([1,2])` 直接 `TypeError`。
- **只能消耗一次**：同一个游标连跑两个 `for`，第二个是空的；`list` 则每次新造游标，能跑无限次。**空掉的是那个生成器对象，不是那个函数**——重新调用函数造新链就又是满的（三跑对比 105 / 105 / 0）。
- **惰性换来的是量级差**：生成器恒定 208 字节，列表 8 856 / 800 984 / 8 448 728（n = 1 千 / 10 万 / 100 万）。代价是四条：只能一次、错误推后（实测打印顺序证明）、没有 `len` 和下标、`return` 的值被吞。
- **函数签名上的推论**：收 `Iterable` 安全，收 `Iterator` 等于声明"我只吃一遍"；要遍历两遍先 `list()` 落地。
- **模块就是一个 `.py` 文件**，模块名 = 文件名去掉 `.py`；`sys.argv[0]` 是你敲的脚本路径，`if __name__ == '__main__'` 是"既能被 import 又能被运行"的开关。
- **命名冲突实测**：内置模块（`sys`）抢不走、只会让你的文件失效；标准库 `.py`（`copy` / `json` / `random`）会被本地同名文件整个顶掉。起名的规矩：先 `python -c "import 名字"` 试一次。

今天最有价值的一刻是把 `iter(it) is it`（True）和 `iter(lst) is iter(lst)`（False）这两行放在一起看：**同一个迭代器会被上一轮循环消耗掉，而 list 每次都发一个新游标**——第四节那个"第二轮是 `[]`"的现象，根因就在这两行的差别上，不在 `for` 上。明天（下一篇）补上 D5：切片是浅拷贝（Day 7 埋的那颗雷 `b = a[:]` 之后 `b[0].append(99)` 正式引爆），以及 `c[:] = []` 和 `c = []` 为什么一个改原对象、一个换绑定——那正好是今天"一个对象还能用几次"的镜像问题：**这次动的是箭头，还是箭头指着的那个东西。**
