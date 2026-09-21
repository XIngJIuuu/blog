---
title: Python 学习笔记 Day 11：带参数的装饰器——三层各自收什么
published: 2026-09-20
description: Python 第十一天笔记，按条目排的可查清单。主题是装饰器自己需要参数时的三层结构：`retry(3)` 单独执行返回的是中间层、`__name__` 是 `deco`、两次调用返回的不是同一个对象；三层各自在什么时候执行（实测前两层在定义阶段就跑完、内层每次调用一次）；少写一对括号为什么定义时不炸、调用才炸；`return` 写在 `try` 里为什么能让 `times=5` 只进一次；漏掉最后那句 `raise` 会把异常吞成 `None`；用 `perf_counter` 量出 `delay` 到底有没有生效（0.0 秒与 1.001 秒的对照）；计数器挂函数属性为什么不用写 `global`；`functools.partial` 冻住参数但换不到 `__name__`；外加力扣 242 三种写法与 `Counter` 减法那个会漏报的坑。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day11
draft: false
pinned: false
---

> [!NOTE]
> 这是第十一天 Python 学习笔记，延续上一篇的形式：**按条目排的可查清单**，每条结论下面都跟着实测输出。
>
> Day 10 的装饰器部分只处理了「装饰器不要参数」的情况——`@wraps(func)` 两层就够。今天补它没讲的那一件：**装饰器自己也要收参数**时，为什么必须三层，以及这三层各自在什么时候被调用。
>
> 主线只有一句话：**最外层收装饰器的参数、中间层收函数、内层收调用参数。少一层，就有一样东西没人接。**

## 一、三层各自收什么

先把要讨论的东西摆出来。这是一个能用的重试装饰器：

```python
import functools, time

def retry_full(times=3, delay=0):        # 最外层：收装饰器自己的参数
    def deco(func):                      # 中间层：收被装饰的函数
        @functools.wraps(func)
        def wrapper(*a, **kw):           # 内层：收调用参数
            for i in range(times):
                try:
                    return func(*a, **kw)
                except Exception as e:
                    if i == times - 1:
                        raise
                    print(f'   第{i+1}次失败：{e}，{delay} 后再试')
                    if delay:
                        time.sleep(delay)
        return wrapper
    return deco
```

| 层 | 签名 | 收到什么 | 什么时候被调用 |
|---|---|---|---|
| 最外层 `retry_full` | `(times=3, delay=0)` | 装饰器参数 | 写 `@retry_full(times=5)` 那一行，**定义阶段** |
| 中间层 `deco` | `(func)` | 被装饰的函数 | 同上，紧跟在上一层后面，**定义阶段** |
| 内层 `wrapper` | `(*a, **kw)` | 调用参数 | 每次调用被装饰函数时 |

对照 Day 10 里那种两层装饰器（`@log` 直接吃函数），区别就在多出来的最外层：它不吃函数，只把参数存进闭包，再返回一个真正干活的 `deco`。

> [!TIP]
> 「参数存在闭包里」是这篇后面所有现象的来源。`times` 和 `delay` 在定义阶段就被固定住了，`wrapper` 每次运行时去闭包里读它们——所以**同一个被装饰函数，重试次数是写死的**，想中途改就得换一套写法。

## 二、`retry(3)` 单独执行会怎样

这一节把最外层的返回值直接打印出来看。用最简版（只管转发、不重试）就够：

```python
def retry(times=3, delay=1):
    def deco(func):
        @functools.wraps(func)
        def wrapper(*a, **kw):
            return func(*a, **kw)
        return wrapper
    return deco
```

实测三行：

```
① retry(3) 返回的是: <function retry.<locals>.deco at 0x000002BEE2CA9300>
① retry(3).__name__ = deco
① retry(3) is retry(3) = False
```

三个结论：

1. **`retry(3)` 返回的是一个函数**，而且是那个中间层 `deco`——不是 `wrapper`。字符串里的 `retry.<locals>.deco` 读作「定义在 `retry` 局部作用域里的 `deco`」。
2. **它的 `__name__` 是 `deco`**。注意 Day 10 讲的 `@wraps` 在这里帮不上忙：`deco` 没有被任何 `wraps` 保护，它也不需要——`wraps` 要保的是**最终顶替业务函数名字的那个对象**的身份证，也就是 `wrapper`。`deco` 只是个中间工厂，用完就没人再提它。
3. **`retry(3) is retry(3)` 是 `False`**。两次调用最外层，就造出两个不同的 `deco` 对象，地址都不一样。这不是「相等但不同」的浮点那种坑，是真的每次新建。

## 三、三层各在什么时候执行

第二节的表已经写了结论，这里用一份会自报家门的装饰器把它打出来：

```python
def tracer(times=3):
    print('   ③ 最外层执行了（收到装饰器参数）')
    def deco(func):
        print('   ③ 中间层执行了（收到函数）')
        @functools.wraps(func)
        def wrapper(*a, **kw):
            print('   ③ 内层执行了（收到调用参数）')
            return func(*a, **kw)
        return wrapper
    return deco

@tracer(2)
def f3():
    return 'f3'

print('③ 现在才第一次调用 f3()：')
f3()
print('③ 第二次调用 f3()：')
f3()
```

实测输出（整份文件跑一遍，中间穿插的是别的例子的行）：

```
   ③ 最外层执行了（收到装饰器参数）
   ③ 中间层执行了（收到函数）
③ 现在才第一次调用 f3()：
   ③ 内层执行了（收到调用参数）
③ 第二次调用 f3()：
   ③ 内层执行了（收到调用参数）
```

数一下：**最外层 1 次、中间层 1 次、内层 2 次**。前两行出现在 `③ 现在才第一次调用` 这句锚点**之前**，说明它们在定义阶段就跑完了；内层跟着调用次数走。

这条最容易误会的地方是：`@tracer(2)` 底下那三行 `print` 看着像「写了就会打印」，其实**最外层和中间层整个程序生命周期里只各跑一次**，内层才是每次调用都跑。第一次见到会以为脚本坏了。

### 逐帧看这四步

上面那份 `tracer` 在 pythontutor 上走到的四个位置。左侧红色箭头是即将执行的一行，绿色是刚执行完的一行；右上 Print output 是已经打印出来的内容，右下 Frames 是当前存在的调用帧。

**Step 3：调用刚发生，函数体一行都还没跑。** 左侧绿箭头停在 `@tracer(2)`、红箭头停在第 1 行。右边已经多出一个 `tracer` 帧，里面 `times` 是 **2**；而 Objects 区那个函数对象下面写着 `default arguments: times 3`，3 被高亮出来。实参盖掉默认值，就发生在这一帧里——**默认值只是「没给实参时兜底的 3」，一旦给了 2，闭包里存的就是 2**。

[![Step 3：tracer 帧里 times 是 2，默认值 3 只是兜底](/posts/python-learning-day11/tracer-step3-outer-being-called.png)](/posts/python-learning-day11/tracer-step3-outer-being-called.png)

**Step 6：`deco` 这个函数对象刚被造出来。** Print output 已经有「最外层执行了」这一行；绿箭头停在 `def deco(func):`（说明这个 `def` 执行完了），红箭头停在 `return deco`。右侧 `f1: tracer` 帧里除了 `times 2`，多了 `deco` 指向 `function deco(func) [parent=f1]`——**那个 `[parent=f1]` 就是闭包**：这个 `deco` 自带一个指回 `f1` 的环境，将来它读 `times` 就从那儿读。

[![Step 6：deco 对象建好，标签带着 parent=f1 的闭包](/posts/python-learning-day11/tracer-step6-deco-object-built.png)](/posts/python-learning-day11/tracer-step6-deco-object-built.png)

**Step 9：最外层已经返回了，但它的帧没消失。** 绿箭头停在 `def f3():`，也就是被装饰的函数还在定义中；Print output 仍然只有「最外层执行了」一行。关键在右侧：`f1: tracer` 整帧**变灰了**（不再是当前帧），可它还在，`times 2` 和 `deco` 都还好端端待在里面。

这就是第一节那句「参数存在闭包里」的字面意思：**外层函数执行完了，只要还有内层对象指着它，这一帧就得一直活着**，一直活到每次调用 `wrapper` 去读 `times` 为止。

[![Step 9：f1 tracer 帧变灰但依然存在](/posts/python-learning-day11/tracer-step9-outer-frame-greyed-but-alive.png)](/posts/python-learning-day11/tracer-step9-outer-frame-greyed-but-alive.png)

**Step 11：中间层被调用的瞬间。** 新出现一个帧 `deco [parent=f1]`，里面的 `func` 指向 `function f3()`——**三层里第二层收的就是这个箭头**。红箭头停在第 5 行那句 `print`，所以 Print output 里「中间层执行了」还**没**打出来，下一行才打。

[![Step 11：deco 帧里的 func 指向 f3](/posts/python-learning-day11/tracer-step11-deco-receives-f3.png)](/posts/python-learning-day11/tracer-step11-deco-receives-f3.png)

> [!NOTE]
> 这四帧只覆盖到**定义阶段**，也就是「最外层跑完、中间层刚开始」。内层 `wrapper` 要等到第 21 行 `f3()` 才第一次执行，图里没截——那部分上面的实测输出已经给全了。

## 四、少写一对括号：定义时不炸，调用时才炸

`@retry(3)` 写成 `@retry`，是这类装饰器最典型的错。完整时间线：

```python
@retry                        # ← 少了一对括号
def f2():
    return 'f2 的结果'
```

实测：

```
A1 定义后 f2 是谁: deco | type = function
A2 定义阶段没炸
A3 调用时才炸: retry.<locals>.deco() missing 1 required positional argument: 'func'
```

拆开看这三步各是什么：

- **定义阶段为什么不炸**：`@retry` 展开成 `f2 = retry(f2)`。`retry` 的签名是 `(times=3, delay=1)`，于是**函数 `f2` 被塞进了 `times` 这个位置**，`delay` 用默认值。这个调用完全合法，所以不报错——它只是安静地返回了 `deco`。
- **`f2` 变成了谁**：`f2 = deco`，所以 A1 那行打印出 `f2.__name__` 是 `deco`。名字已经贴到中间层身上去了。
- **调用时才炸**：`f2()` 就是 `deco()`，而 `deco` 的签名是 `(func)`，一个必收参数没给 → `TypeError`。报错信息里点名的函数是 **`deco`**，不是 `f2` 也不是 `wrapper`。

> [!TIP]
> 这个报错的排查价值全在函数名上。看到 `retry.<locals>.deco() missing ... 'func'`，可以直接定位成「装饰器少写了括号」，而不是「我业务函数少传了参数」。`<locals>` 这个前缀就是「三层嵌套里的内层函数」的指纹。

## 五、三种写法对照

| 写法 | 展开成 | 结果 |
|---|---|---|
| `@retry(3)` | `f = retry(3); f = deco(f)` | ✅ 正常，`times` 收到 3 |
| `@retry()` | 同上，`times` 用默认值 3 | ✅ 正常，实测 `f8.__name__` 仍是 `f8` |
| `@retry` | `f = retry(f)` | ❌ 函数被当成 `times`，定义时不炸，调用时 `deco() missing func` |

空括号那一行的实测输出：

```
⑧ f8() = f8 正常返回 | f8.__name__ = f8
```

`@retry_full()` 和 `@retry_full` 差的就是**有没有那一次「先调用最外层」**。带括号（哪怕是空括号）才走「最外层 → 中间层 → 内层」这条链；不带括号等于把最外层直接当中间层用，参数位置全错位。

## 六、`return` 写在 `try` 里：`times=5` 却只进一次

```python
n_ok = 0

@retry_full(times=5)
def always_ok():
    global n_ok
    n_ok += 1
    return '一次就成'
```

实测：

```
④ always_ok() = 一次就成 | 函数体进了 1 次
```

`times=5` 只跑了 1 次，是 `try` 里那句 `return` 干的：

```python
for i in range(times):
    try:
        return func(*a, **kw)      # ← 成功就直接把结果交出去，for 循环当场结束
    except Exception as e:
        ...
```

**`return` 会结束整个 `wrapper` 函数**，不只是结束 `try` 块。所以循环不需要 `break`，也没有别的出口——成功路径上它根本走不到第二次迭代。

这一条反过来说明 `for` 循环在这里的语义：**它不是「执行五次」，是「最多执行五次」**。第一次就成功时，它退化成一次普通调用，开销只是多了一层 `try`。

## 七、少了最后那句 `raise`，异常就被吞了

把 `if i == times - 1: raise` 删掉，其余不动：

```python
def retry_no_raise(times=3):
    def deco(func):
        @functools.wraps(func)
        def wrapper(*a, **kw):
            for i in range(times):
                try:
                    return func(*a, **kw)
                except Exception as e:
                    print(f'   第{i+1}次失败：{e}')
                    # ← 既没有 raise，循环走完后也没有 return
        return wrapper
    return deco

@retry_no_raise(times=3)
def broken():
    raise ValueError('永远失败')
```

实测：

```
   第1次失败：永远失败
   第2次失败：永远失败
   第3次失败：永远失败
⑥ broken() = None
```

**调用方拿到的是 `None`，而且没有任何异常抛出。**

这跟「`wrapper` 忘了写 `return`」不是同一个错，虽然表现都是 `None`：

| 错法 | 表现 | 根因 |
|---|---|---|
| `wrapper` 里 `return func(...)` 写成了 `func(...)` | 成功时也返回 `None` | 值算出来了，但没往外传 |
| 最后一道 `raise` 漏了 | 失败时返回 `None`，成功时正常 | 异常被 `except` 吃掉，没人再抛出去 |

第二种更难查，因为它**只在失败时表现异常**。成功路径一切正常，等到真出错了不报错、只返回 `None`，错误会顺着代码往下传，直到某个不相干的地方炸在 `NoneType` 上——那时候栈顶已经不是装饰器了。

> [!TIP]
> 写 `except` 的通用规矩：捕获了要么处理掉、要么重新抛出。`except` 之后既不处理也不抛，等于把错误信息销毁。裸 `raise`（不带异常名）在 `except` 块里就是「把原样异常重新抛出、且保留原始 traceback」的写法。

## 八、`delay` 到底生效没有：量一遍

参数写了不等于生效。有一个「只打印、从不 sleep」的版本和一个真 sleep 的版本，用 `perf_counter` 各量一次。

**版本一：`delay` 只被印出来，从没 `time.sleep`**

```python
def retry_print_only(times=3, delay=1):
    def deco(func):
        @functools.wraps(func)
        def wrapper(*a, **kw):
            for i in range(times):
                try:
                    return func(*a, **kw)
                except Exception as e:
                    if i == times - 1:
                        raise
                    print(f'   第{i+1}次失败：{e}，{delay} 后再试')   # ← 这里没有 time.sleep
        return wrapper
    return deco

@retry_print_only(times=3, delay=0.5)
def slow_fail():          # 前两次必失败
    ...
```

```
   第1次失败：又超时，0.5 后再试
   第2次失败：又超时，0.5 后再试
   结果 = 终于成功 | 总耗时 = 0.0 秒
```

**版本二：同样的函数，换成带 `time.sleep(delay)` 的那份装饰器**

```
   第1次失败：又超时，0.5 后再试
   第2次失败：又超时，0.5 后再试
   结果 = 终于成功 | 总耗时 = 1.001 秒
```

两次打印的提示文字**一模一样**，只有耗时把它们区分开：`0.0` 秒 vs `1.001` 秒。2 次重试 × 0.5 秒 = 1.0 秒，多出来的 0.001 是 `sleep` 本身的调度误差——`sleep` 保证「至少睡这么久」，不保证「刚好这么久」。

> [!TIP]
> 为什么这里用 `perf_counter` 而不是 `time.time`：Day 10 第十三节量过一次，`perf_counter` 是单调递增的、专为量时长设计的；`time.time` 是墙上时钟，系统对时会让它往回跳，量出来的差值可能是负数。凡是「量一段代码花了多久」，一律 `perf_counter`。

## 九、重试计数挂哪儿：`global` 与函数属性

`always_ok` 那个计数器用的是模块级变量 + `global`。但函数对象自己就能挂属性，不写 `global` 也行：

```python
def flaky2():
    flaky2.attempts = getattr(flaky2, 'attempts', 0) + 1
    return flaky2.attempts
```

实测：

```
⑤ flaky2() 连着调三次: 1 2 3
```

**为什么不用 `global`**：`global` 管的是**名字绑定**——`n_ok += 1` 要给模块级名字 `n_ok` 重新绑一个新整数，不声明就是造一个局部的。而 `flaky2.attempts = ...` 是**给对象设属性**，压根没碰名字绑定，所以不需要任何声明。

这跟 Day 6 那条「名字是贴纸，贴在对象上」是同一件事的两面：给变量赋值是挪贴纸，给属性赋值是在对象本身上记东西。

`getattr(flaky2, 'attempts', 0)` 的第三参数是默认值，第一次调用时属性还不存在，取到 0 再加 1。函数对象的 `__dict__` 就是那个存属性的地方——Day 10 讲 `@wraps` 时提过 `WRAPPER_UPDATES = ('__dict__',)`，合并的正是这个字典。

## 十、`functools.partial` 能替掉最外层吗

三层里最外层只干一件事：把参数冻起来。那 `partial` 看起来正好能干这活：

```python
retry_twice = functools.partial(retry_full, times=2)      # 冻住 times
```

实测：

```
⑨ type(retry_twice) = partial
⑨ AttributeError: 'functools.partial' object has no attribute '__name__'
```

`retry_full` 是一个函数，有 `__name__`；`retry_twice` 是一个 **`partial` 对象**，它可调用、但不是函数，所以没有 `__name__`。

这就是「`partial` 冻的是参数、装饰器换的是函数」这句话的具体代价：

- **能用的地方**：`@retry_twice` 这种一次性把参数固定住的场景，`partial` 写起来比再套一层 `def` 短。
- **代价**：`hasattr(retry_twice, '__name__')` 实测是 `False`，`__doc__` 同样没有，调试器里看到的是一坨 `functools.partial(...)`。`inspect.signature` 倒还能用，但拿到的是冻过参数之后的样子——实测 `(*, times=2, delay=0)`，`times` 和 `delay` 都从「位置或关键字参数」变成了**只能按关键字传**。

`partial` 在 Day 10 第十四节出现过一次，当时是拿来修闭包晚绑定；这里是它的第二种用法（固定装饰器参数）。两种用法的共同点是：**`partial` 从来不产生新函数，它只是把参数提前塞进去。**

## 十一、力扣 242：三种写法，和 `Counter` 减法那个会漏报的坑

判断 `t` 是不是 `s` 的字母异位词。三种常见写法：

```python
from collections import Counter

def by_sort(s, t):
    return sorted(s) == sorted(t)

def by_counter(s, t):
    return Counter(s) == Counter(t)

def by_array(s, t):
    if len(s) != len(t):
        return False
    cnt = [0] * 26
    for c in s:
        cnt[ord(c) - 97] += 1
    for c in t:
        cnt[ord(c) - 97] -= 1
        if cnt[ord(c) - 97] < 0:
            return False
    return True
```

五个用例上三写法结果完全一致：

```
D by_sort    [True, False, False, True, True]
D by_counter [True, False, False, True, True]
D by_array   [True, False, False, True, True]
```

（用例依次是 `anagram/nagaram`、`rat/car`、`aacc/ccac`、`空串/空串`、`a/a`。）

复杂度对照：

| 写法 | 时间 | 空间 | 备注 |
|---|---|---|---|
| `sorted` | O(n log n) | O(n) | `sorted` 返回**新列表**，不是原地排；实测 `type(sorted('ba'))` 是 `list` |
| `Counter` | O(n) | O(n) | 一次计数一次比较 |
| 定长数组 | O(n) | O(1)（26 个格子） | 只有字符集已知且小时才划算 |

### 那个坑：`Counter` 相减为空 ≠ 是异位词

直觉上会想用减法：「两边一减，剩空的就是相等」。实测打脸：

```
T1 Counter('aab') - Counter('abb') = Counter({'a': 1})
T5 Counter('ab') - Counter('aabb') = Counter()
```

`Counter` 的减法会**把结果 ≤ 0 的键整个删掉**，不留 0、也不留负数。所以：

- `aab` 减 `abb`：`a` 多 1 留下、`b` 少 1 被删掉 → 结果非空，判「不是异位词」，**碰巧对了**。
- `ab` 减 `aabb`：`a`、`b` 都是 -1，全被删光 → 结果 `Counter()` 是**空的**，但这两个字符串长度都不等，**根本不是异位词**。这就是漏报。

所以判异位词只能用 `==`（`Counter` 的相等比较会看每个键的计数，且不会因为 0 值键而误判），或者先比长度再比减法。**「相减为空」表达的语义是「前者是后者的多重集超集」，不是「两者相等」。**

## 十二、可带走的问题清单

1. `retry(3)` 返回的是 `deco` 还是 `wrapper`？它的 `__name__` 是什么？
2. 为什么 `retry(3) is retry(3)` 是 `False`？
3. 三层里哪几层在定义阶段执行完？哪一层每次调用都执行？
4. `@retry` 少写括号，为什么定义阶段不报错？报错信息里点名的函数是哪一个？
5. `@retry()` 空括号里的默认参数是从哪来的？
6. `return` 写在 `try` 里，`times=5` 却只进一次，是谁停下的循环？
7. `for` 循环在重试里表达的是「执行 N 次」还是「最多 N 次」？
8. 漏掉 `raise` 之后调用方拿到什么？为什么它比抛异常更难查？
9. `except` 块的通用规矩是什么？裸 `raise` 保留了什么？
10. 提示文字写着「0.5 后再试」，怎么证明它真的等了 0.5 秒？
11. 为什么量耗时用 `perf_counter` 不用 `time.time`？
12. `flaky2.attempts` 为什么不用写 `global`？`n_ok += 1` 为什么就要写？
13. `getattr(obj, name, default)` 的第三个参数解决的是什么问题？
14. `functools.partial` 冻住参数，代价是什么属性没了？
15. `Counter` 相减为空，能不能推出「两个串是异位词」？反例是什么？

## 十三、小结

Day 10 的主线是「改对象还是换绑定」，今天这条线往下接了一格：**三层装饰器的三层，其实是把一次「换绑定」拆成了三个时刻**——定义时收参数、定义时收函数、调用时才收调用参数。前两个时刻都发生在函数还没被调用之前，所以 `times` 和 `delay` 一旦写定就改不了；第三个时刻才是每次运行真正跑的代码。

三个最容易翻车的点，各自对应一个「看起来正常、其实错了」：

- `@retry` 少括号：**定义时不报错**，等到调用才炸，而且炸在名字对不上的地方。
- 漏 `raise`：**成功时一切正常**，只在失败时返回 `None`，错误会漂到别处才炸。
- `delay` 只打印不 sleep：**提示文字说等着**，实测 0.0 秒，只有计时能拆穿。

共同点是它们都不在「顺利路径」上暴露。所以这类代码要配一个必然失败几次的函数去量，光看代码读不出来。
