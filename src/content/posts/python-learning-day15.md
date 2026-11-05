---
title: Python 学习笔记 Day 15：定义时绑上什么，调用时就读到什么——闭包、nonlocal 与装饰器的三层时机
published: 2026-11-05
description: "第十五天笔记，按条目排的作用域与执行时机清单，全部结论来自同一份程序在 CPython 3.11.9 / Windows 上的完整输出。循环里建的三个 lambda 调用结果是 [2, 2, 2]，换成 partial 冻住变成 [0, 1, 4]，改成默认参数或工厂函数得到 [0, 1, 2]；两个计数器交叉调用输出 1 2 1 3，状态各自挂在 `__closure__` 的 cell 上；内层函数只要出现一次赋值，名字就被判成局部变量，少写 `nonlocal` 得到 `UnboundLocalError`，而只读不写时 `print(n)` 正常打出 0；不带参数的装饰器在定义阶段就把装饰器本体跑完，输出顺序是 3 1 4 2 5 2 6；`@mk`、`@mk()`、`@mk(3)` 三种写法实测最外层执行 3 次、中间层 2 次、内层 2 次，裸 `@mk` 让名字绑上中间层、调用时才抛 `TypeError`；叠加顺序是 `base = outer_a(outer_b(base))`，包装从下往上、执行从外往里；不加 `functools.wraps` 时 `__name__` 变成 `wrapper`、`__doc__` 变成 `None`，`WRAPPER_ASSIGNMENTS` 实测 5 个名字；`wrapper` 少写一句 `return` 会把 42 吞成 `None`。"
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day15
draft: false
pinned: false
---

> [!NOTE]
> 这是第十五天 Python 学习笔记，形式延续前几篇：**按条目排的可查清单**，每条结论下面跟着这台机器上跑出来的实测输出（CPython 3.11.9 / Windows）。
>
> 主线只有一句：**函数体和内层函数都是在「被调用」那一刻才执行的；名字在什么时候绑上什么对象，决定了你能看见什么值。** 前面所有坑——晚绑定、`UnboundLocalError`、`@mk` 少一对括号、`__name__` 变成 `wrapper`、返回值莫名消失——都是这一句话的不同画法。
>
> 有一条阅读规则：**输出的顺序本身就是结论的一部分**。这份程序里有几行在 `def` 那一刻就打印了，不是你手滑多跑了什么。

## 一、先看完整输出，一行都不删

下面这段是同一份程序一次跑完的全部输出。本文每一节都在解释其中某几行为什么长这样。

```text
① 三个调用结果： [2, 2, 2]
② 三个调用结果： [0, 1, 4]
③ 依次调用 c1() c1() c2() c1()： 1 2 1 3
④ 抛了： UnboundLocalError
⑤ show() 返回： 7
⑥ ———— 下面开始定义
⑥ 装饰器本体执行，包的是 add
⑥ ———— 定义完了
⑥ wrapper 执行
⑥ 第一次 add(1,2) → 3
⑥ wrapper 执行
⑥ 第二次 add(3,4) → 7
⑦ ———— 下面定义三个
⑦ 最外层 mk 执行，times 的类型 = function
⑦ 最外层 mk 执行，times 的类型 = int
⑦ 中间层 deco 执行
⑦ 最外层 mk 执行，times 的类型 = int
⑦ 中间层 deco 执行
⑦ ———— 三个定义跑完了
⑦ bare() 抛了： TypeError
⑦ 内层执行
⑦ empty_parens() → empty
⑦ 内层执行
⑦ three() → three
⑧ ———— 下面定义
⑧ a 这层先说话
⑧ b 这层先说话？
⑧ base 本体
⑧ 调用结果 → X
⑨ add.__name__ = wrapper
⑨ add.__doc__ = None
⑩ val() → None
```

## 二、循环里建的三个 lambda，三个都返回最后一个值

```python
fns = [lambda: i for i in range(3)]
print([f() for f in fns])
```

```text
[2, 2, 2]
```

`lambda: i` 里的 `i` 是**自由变量**，不是参数。定义 lambda 的那一刻，Python 只把「将来要去外层作用域读 `i`」这件事记下来，**没有把 `i` 当时的值抄进去**。列表推导跑完时 `i` 停在 `2`，三个 lambda 事后去读，读到的自然都是 `2`。

所以关键问题是「`i` 在哪一刻被读」：**在 `f()` 被调用的时候**，不是在外层循环还在跑的时候。

### 三种修法，实测结果分两类

```python
def sq(i):
    return i * i

def mkv(v):
    return lambda: v

print([f() for f in [lambda i=i: i for i in range(3)]])          # A 默认参数
print([f() for f in [functools.partial(sq, i) for i in range(3)]])  # B partial
print([f() for f in [mkv(i) for i in range(3)]])                  # C 工厂函数
print([f() for f in [lambda: i for i in range(3)]])               # 原始晚绑定
```

```text
A 默认参数版 : [0, 1, 2]
B partial 版 : [0, 1, 4]
C 工厂版     : [0, 1, 2]
原始晚绑定   : [2, 2, 2]
```

A 和 C 都是 `[0, 1, 2]`：它们做的事一样——**给每一轮造一个新的作用域**。A 靠默认参数（默认值只在定义时求值一次，于是当前那个 `i` 被冻进了函数对象的 `__defaults__`），C 靠多一次函数调用（每次 `mkv(i)` 都开一个新的 `v`）。B 是 `[0, 1, 4]`，因为它冻住的是**传给 `sq` 的实参**，`sq` 里 `i` 是形参、是局部变量，跟外层那个循环变量不是同一个名字。

一句话对照：**晚绑定读的是「名字」，早绑定读的是「值」。** 差别只在什么时候把值抄下来。

## 三、两个计数器互不干扰，状态挂在闭包上

```python
def make_counter(start=0):
    n = start

    def inc(step=1):
        nonlocal n
        n += step
        return n

    return inc

c1 = make_counter()
c2 = make_counter()
print(c1(), c1(), c2(), c1())
```

```text
1 2 1 3
```

`c1()` 第一次拿到 `1`、第二次 `2`，`c2()` 却从 `1` 重新开始——**每次调用 `make_counter()` 都开一份全新的局部作用域**，`n = start` 这一行每次都会重新走一遍，所以两份 `n` 是两样东西，互不影响。

「它各自挂在什么东西上」这个问题有确切答案，可以直接打印出来：

```python
print([c.cell_contents for c in c1.__closure__])   # 初始 [0]
c1(); c1(); c2(); c1()
print(c1.__closure__[0].cell_contents)             # 3
print(c2.__closure__[0].cell_contents)             # 1
print(c1 is c2)                                    # False
print(c1.__closure__ == c2.__closure__)            # False
```

```text
c1 cell 初始 : [0] | c2: [0]
调用后 cell  : 3 1
c1 is c2     : False | 两份 inc 的 __closure__ 相同吗: False
```

`c1` 和 `c2` 是两个不同的函数对象，各带一组自己的 cell，`__closure__` 里装的就是那些「外层作用域还没死、被内层抓住了」的变量盒子。**不写「内存里」这种含糊话，就说挂在函数对象的 `__closure__` 上**——它可打印、可比对、可验证。

顺带一条：`nonlocal n` 只在**要写**的时候才需要。如果 `inc` 改成 `return n + step` 这种只读不写的写法，`nonlocal` 整行删掉照样工作。

## 四、少写 `nonlocal`：炸在哪一行，为什么只读就不炸

```python
def make_bad():
    n = 0

    def inc():
        n = n + 1          # 少了 nonlocal n
        return n

    return inc

make_bad()()
```

```text
UnboundLocalError
```

两条实测结论：

1. **炸在「执行到 `n = n + 1` 时」，不是 `def inc` 定义时。** 定义只是把一个函数对象绑到名字上，函数体一行都没跑。这一条和第二节是同一件事。
2. **同一个函数体里如果只写 `print(n)`、不写赋值，正常打印 `0`。** 实测：

```python
def make_bad():
    n = 0

    def inc():
        print(n)          # 没有任何赋值

    return inc

make_bad()()
```

```text
只读不写时 print(n) → 0
```

差别只有一条规则：**Python 在编译函数体时扫一遍，只要这个名字在这个函数体里出现过被赋值，就把它判成本地变量**（`n = n + 1` 里有赋值 → 本地）。判成本地之后，`n = n + 1` 右边的 `n` 要去读一个还没绑值的本地名字，于是 `UnboundLocalError`。而只读不写时，这个名字**没被赋值过 → 判成自由变量 → 顺着外层作用域往上找**，找到 `make_bad` 的那个 `n`，值为 `0`，正常打印。

所以「外层那个 `n` 怎么找不到了」的答案不是外层没了，是**它被本地的同名变量挡住了**，而挡住它的唯一动作就是赋值。

`nonlocal` 的作用就是把这条判定改回来：明确告诉编译器，这个 `n` 不是本地的，去外层那份作用域拿。

## 五、不带参数的装饰器：哪几行在「定义完了」之前打印

```python
def tag(fn):
    print('⑥ 装饰器本体执行，包的是', fn.__name__)

    def wrapper(*a, **kw):
        print('⑥ wrapper 执行')
        return fn(*a, **kw)

    return wrapper

print('⑥ ———— 下面开始定义')      # 3

@tag
def add(a, b):
    return a + b

print('⑥ ———— 定义完了')          # 4
print('⑥ 第一次 add(1,2) →', add(1, 2))   # 5
print('⑥ 第二次 add(3,4) →', add(3, 4))   # 6
```

```text
⑥ ———— 下面开始定义
⑥ 装饰器本体执行，包的是 add
⑥ ———— 定义完了
⑥ wrapper 执行
⑥ 第一次 add(1,2) → 3
⑥ wrapper 执行
⑥ 第二次 add(3,4) → 7
```

按上面注释里的编号写出来，顺序是 **`3 1 4 2 5 2 6`**。

三个要点：

- **装饰器本体只执行一次**，就在 `@tag` 那一行，也就是「定义阶段」。所以「装饰器本体执行」这行出现在「定义完了」之前，而不是每次调用之前。
- `wrapper` 那行出现 **2 次**，因为调用了几次 `add` 就执行几次。
- `@tag` 这一行，编译器替你做的赋值就一句话：**`add = tag(add)`**。

最后这条是理解全部装饰器问题的钥匙：**装饰器不「包装」什么魔法，它是一次赋值**，把原来那个函数对象换成 `tag()` 返回的东西。换完之后，名字 `add` 指向的是 `wrapper`，原函数只以闭包变量 `fn` 的形式活着。

## 六、装饰器自己要参数：三种写法，三种执行次数

```python
def mk(times=1):
    print('⑦ 最外层 mk 执行，times 的类型 =', type(times).__name__)

    def deco(fn):
        print('⑦ 中间层 deco 执行')
        return lambda *a, **kw: (print('⑦ 内层执行') or fn(*a, **kw))

    return deco

@mk          # 没有括号
def bare():
    return 'bare'

@mk()
def empty_parens():
    return 'empty'

@mk(3)
def three():
    return 'three'
```

```text
⑦ ———— 下面定义三个
⑦ 最外层 mk 执行，times 的类型 = function
⑦ 最外层 mk 执行，times 的类型 = int
⑦ 中间层 deco 执行
⑦ 最外层 mk 执行，times 的类型 = int
⑦ 中间层 deco 执行
⑦ ———— 三个定义跑完了
⑦ bare() 抛了： TypeError
⑦ 内层执行
⑦ empty_parens() → empty
⑦ 内层执行
⑦ three() → three
```

统计一下：**最外层 3 次、中间层 2 次、内层 2 次**。三个定义都跑了最外层，但只有两个跑到中间层——少的那个正是裸 `@mk`。

为什么？还是那句话，`@X` 就是 `名字 = X(名字)`，区别只在 `X` 是什么：

| 写法 | 编译器实际执行 | `times` 收到什么 | 名字最后绑的是 |
|---|---|---|---|
| `@mk` | `bare = mk(bare)` | **函数对象本身**（实测类型 `function`） | `deco` |
| `@mk()` | `empty_parens = mk()(empty_parens)` | 默认值 `1`（`int`） | `lambda` |
| `@mk(3)` | `three = mk(3)(three)` | `3`（`int`） | `lambda` |

第一行那个 `type(times).__name__ = function` 就是全部证据：**`@mk` 把被装饰的函数当成了 `times` 参数塞进去**，`mk` 照常返回 `deco`，于是 `bare` 这个名字绑的是**中间层 `deco`**（实测 `bare.__name__` 就是 `deco`）。

所以 `bare()` 抛 `TypeError` 不是「装饰器坏了」，是你在**用零个参数调用一个需要一个参数的函数**——`deco(fn)` 在等那个 `fn`。补上的东西应该是一个**函数**：实测 `bare(lambda: 1)` 能正常返回一个函数对象。

关于 `times` 什么时候定死：**`@mk(3)` 这种带实参的写法，在定义阶段就把 `times` 绑成 `3` 了**，因为 `mk(3)` 在定义那一行就跑完了，返回的 lambda 抓住的是那个已经定下来的 cell，后面没有入口再改它。`@mk()` 同理冻在默认值 `1`。

## 七、叠加顺序：包装从下往上，执行从外往里

```python
def outer_a(fn):
    def w():
        print('⑧ a 这层先说话')
        return fn()

    return w


def outer_b(fn):
    def w():
        print('⑧ b 这层先说话？')
        return fn()

    return w

print('⑧ ———— 下面定义')      # 3

@outer_a
@outer_b
def base():
    print('⑧ base 本体')      # 4
    return 'X'

print('⑧ 调用结果 →', base())   # 5
```

```text
⑧ ———— 下面定义
⑧ a 这层先说话
⑧ b 这层先说话？
⑧ base 本体
⑧ 调用结果 → X
```

顺序是 **`3 1 2 4 5`**，赋值展开只有一种写法成立：

```python
base = outer_a(outer_b(base))
```

于是那句常被背错的口诀要改精确：**「离 `def` 近的先进」说的是包装（谁先收到函数对象、谁先被调用），不是执行。** `outer_b` 先执行、先拿到原函数；`outer_a` 后执行、拿到的是 `outer_b` 造出来的那层 `w`。

而**调用时反过来了**：最外面那层先说话。实测第一行是「a 这层先说话」，因为 `base` 这个名字现在绑的是 `outer_a` 返回的 `w`。

一个好用的心智模型：**从下往上套圈**。套完之后形成一个新函数，调用时从最外圈往里走，走到最里面才是本体。所以「谁先打印」这个问题要拆成两问——定义阶段问「谁先被调用包装」，执行阶段问「谁在最外圈」。

## 八、不加 `functools.wraps`，元信息变成什么

```python
print('⑨ add.__name__ =', add.__name__)
print('⑨ add.__doc__ =', repr(add.__doc__))
```

```text
⑨ add.__name__ = wrapper
⑨ add.__doc__ = None
```

`add.__name__` 是 `wrapper`，`add.__doc__` 是 `None`——**原函数的名字和文档串全丢了**。这不是洁癖问题：日志、`help()`、序列化框架、任何按 `__name__` 找函数的代码都会拿到错的那个名字。

`functools.wraps` 具体搬回什么，可以直接打印：

```python
import functools
print(functools.WRAPPER_ASSIGNMENTS, len(functools.WRAPPER_ASSIGNMENTS))
```

```text
('__module__', '__name__', '__qualname__', '__doc__', '__annotations__') 5
```

**5 个名字**，本机实测顺序就是上面这个（注意 `__doc__` 在 `__annotations__` 前面，别按印象背）。

除了这 5 个赋值，`wraps` 还额外做两件事：

1. **合并 `__dict__`**：把原函数的 `__dict__` 更新进 wrapper（是合并，不是覆盖）。
2. **白送 `__wrapped__`**：wrapper 上多一个属性，指回原函数对象。

实测对照：

```python
def tag(fn):
    return lambda *a, **k: fn(*a, **k)

@tag
def add(a, b):
    return a + b

def tag2(fn):
    @functools.wraps(fn)
    def w(*a, **k):
        return fn(*a, **k)

    return w

@tag2
def add2(a, b):
    '加和'
    return a + b
```

```text
不加 wraps   : '<lambda>' None False
加了 wraps   : 'add2' '加和' 有 __wrapped__: <function add2 at 0x...A700> | 原函数: <function add2 at 0x...A7A0>
```

最后一行值得停一下：`add2.__wrapped__` 和 `add2` 是**两个不同的对象**（地址不同）。`__wrapped__` 是唯一那条能走回原函数的路——需要拿原函数本体时靠它，不用去猜。

## 九、`wrapper` 少写一句 `return`：调用不报错，值却没了

```python
def swallow(fn):
    def w(*a, **kw):
        fn(*a, **kw)      # 故意没有 return

    return w


@swallow
def val():
    return 42

print('⑩ val() →', val())
```

```text
⑩ val() → None
```

`fn(*a, **kw)` 确实执行了，返回值也确实产生了——只是 `w` 没把它往外递，`w` 自己走到函数末尾，于是返回 `None`。**一点不报错，值静悄悄消失**，这是装饰器最难查的一类 bug，因为它不影响「有没有效果」，只影响「有没有返回值」。

这条和函数签名里的 `-> None` 长得像，但不是一件事：

| | 这里为什么是 `None` | `-> None` 注解 |
|---|---|---|
| 性质 | **运行时真的返回了** `None`（漏写 `return`） | 一个**声明**：调用方不该用这个返回值 |
| 谁管 | Python 解释器 | 类型检查器；运行时不强制 |
| 后果 | 上游拿到 `None`，可能 `AttributeError` | 忽略返回值不会报错，只是没意义 |

`-> None` 是「我不打算返回东西」，漏写 `return` 是「我本来要返回东西但忘了」。前者是设计，后者是 bug，别混。

## 十、十条收成一张表：什么时候执行，绑成什么

| 条目 | 关键动作发生在 | 实测结果 |
|---|---|---|
| 循环里的 `lambda: i` | **调用时**才读 `i` | `[2, 2, 2]` |
| `functools.partial(sq, i)` | **定义时**冻住实参 | `[0, 1, 4]` |
| `lambda i=i: i` / 工厂函数 | **定义时**各开一份新作用域 | `[0, 1, 2]` |
| 两个计数器 | 每次调用工厂函数开一份新 `n` | `1 2 1 3`，`__closure__` 不同 |
| 少写 `nonlocal` | **执行到赋值那行**才炸 | `UnboundLocalError` |
| 只读不写 | 名字判为自由变量，往上找 | `print(n)` → `0` |
| `@tag` | **定义阶段**跑一次装饰器本体 | 顺序 `3 1 4 2 5 2 6` |
| `@mk` / `@mk()` / `@mk(3)` | 最外层 3 次、中间层 2 次、内层 2 次 | `bare` 绑 `deco`，调用抛 `TypeError` |
| `@outer_a @outer_b` | 包装 `b` 先、执行 `a` 先 | 顺序 `3 1 2 4 5` |
| 不加 `wraps` | 名字被 `wrapper` 顶替 | `__name__` = `wrapper`，`__doc__` = `None` |
| 少写 `return` | 调用正常，返回值丢失 | `val()` → `None` |

## 十一、把规则背下来，比背输出有用

1. **函数体只在调用时执行。** 所以任何「定义时就炸了」的直觉都要先怀疑——多数时候是定义时什么都没发生。
2. **装饰器是一次赋值：`f = deco(f)`。** 名字换绑之后，你调用的是 `wrapper`，不是原函数。
3. **带参数的装饰器多一层，是因为需要有人先接住那些参数。** `mk(3)` 返回 `deco`，`deco` 才是真正接住函数的那个——少写一对括号，就是把函数错喂给了 `mk`。
4. **名字是本地还是自由，取决于函数体里有没有对它赋值**，编译器在函数创建时就判完了，不看运行时外层有没有同名变量。
5. **状态挂在函数对象的 `__closure__` 上**，每次调用工厂函数得到一份新的；说「存在内存里」等于没说。
6. **写装饰器时先写 `return fn(...)`，再写别的。** 加上 `@functools.wraps` 不是可选的礼貌，是为了让 `__name__` 和 `__doc__` 还属于原函数。

## 十二、和前面几篇的连接

这条「什么时候执行」的线在 [Day 9](/posts/python-learning-day9/) 已经出现过一次：`g = gen()` 之后只有生成器对象，函数体一行都没执行——那是生成器版本的「定义 ≠ 执行」。今天讲的是函数和闭包版本的同一件事。

「绑定还是修改」在 [Day 8](/posts/python-learning-day8/) 的下半场和 [Day 10](/posts/python-learning-day10/) 的后半篇各写过一遍：Day 8 从默认参数讲到闭包和 `functools.wraps`，Day 10 把 `WRAPPER_ASSIGNMENTS` 那五个属性和装饰器四个高频错列成清单。今天这十条是同一批规则的另一种证据形式——不背结论，直接看输出顺序。

三层装饰器（`retry(3)` 那种带参数、带计时、带计数器的完整形态）在 [Day 11](/posts/python-learning-day11/) 里有逐帧拆解，包括「少写一对括号为什么定义时不炸、调用才炸」和「`delay` 到底有没有生效」的实测。今天第六节是它的最小骨架版：先把三种写法的执行次数数清楚，再去看带真实业务的三层。

至于 `-> None` 那句注解，出处是 [Day 10](/posts/python-learning-day10/) 里力扣 344 那一节——今天第九节把它和「漏写 `return`」并排放，是因为这两个 `None` 长得太像，而一个是设计、一个是 bug。
