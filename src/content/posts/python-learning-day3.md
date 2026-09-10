---
title: Python 学习笔记 Day 3：函数定义、参数体系与递归
published: 2026-09-09
description: Python 第三天笔记：内置函数调用与类型转换、def 定义函数与参数检查、返回多个值、跨文件导入函数，位置/默认/可变/关键字/命名关键字五种参数与组合规则，递归与尾递归，以及一元二次方程、可变参数乘积、汉诺塔练习。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day3
draft: false
pinned: false
---

> [!NOTE]
> 这是第三天 Python 学习笔记，由入门阶段的练习代码整理而成。前两天解决的是"数据怎么存"，今天开始解决"逻辑怎么复用"——函数，重点是 Python 参数体系的五种玩法和默认参数那个经典坑。

## 一、调用内置函数

Python 内置了很多可以直接使用的函数，调用时传入参数即可：

```python
print(abs(-5))     # 5，绝对值
print(abs(10))     # 10
print(abs(-3.14))  # 3.14

print(max(1, 2, 3, 4, 5))  # 5，max() 可以接收任意多个参数
print(max(-1, -2, -3))     # -1
```

参数个数或类型不对时，Python 会直接抛出错误。比如 `abs()` 只接受一个参数，传字符串会报 `TypeError: bad operand type for abs(): 'str'`——**内置函数会自己检查参数类型**，这一点后面自定义函数时要手动补上。

### 1. 数据类型转换

```python
print(int("123"))      # 123，字符串转整数
print(int(3.14))       # 3，浮点数转整数是截断，不是四舍五入
print(float("123.45")) # 123.45
print(str(123))        # '123'

bool(0)   # False
bool(1)   # True
```

### 2. 函数名也是一个变量

函数名其实就是指向函数对象的引用，可以把函数名赋给另一个变量，相当于给函数起别名：

```python
a = abs
print(a(-10))   # 10，a 和 abs 指向同一个函数对象
```

## 二、定义函数

用 `def` 语句定义函数，依次是函数名、括号、参数和冒号：

```python
def my_abs(x):
    if x >= 0:
        return x
    else:
        return -x

print(my_abs(-10))   # 10
```

几点说明：

- 函数体内部一旦执行到 `return`，函数就结束并把结果返回
- 没有 `return` 语句时，函数返回 `None`；只写 `return`（不带值）也等价于返回 `None`
- 函数体内可以用 `pass` 占位，先让代码跑起来，细节以后再补：

```python
def nop():
    pass

age = 0
if age >= 18:
    pass   # TODO: 判断是否成年
```

### 1. 参数检查

内置函数 `abs()` 会对参数做类型检查，而我们定义的 `my_abs()` 没有检查，传入字符串时会在 `if x >= 0` 处报出莫名其妙的错。所以自定义函数应该自己把检查补上：

```python
def my_abs(x):
    if not isinstance(x, (int, float)):
        raise TypeError('bad operand type')
    if x >= 0:
        return x
    else:
        return -x
```

`isinstance(object, classinfo)` 判断一个对象是否是已知类型，返回 `True` / `False`，`classinfo` 可以是单个类型，也可以是类型元组（匹配其中任意一个即可）：

```python
isinstance(10, int)                # True
isinstance("hello", str)           # True
isinstance([1, 2], list)           # True
isinstance(3.14, (int, float))     # True —— 传元组，匹配任意一个即可
isinstance(10, (str, list))        # False
```

两个容易踩的点：

- `bool` 是 `int` 的子类，所以 `isinstance(True, int)` 返回 `True`
- Python 3 中 `int` 和 `float` 互不包含，`isinstance(5, float)` 是 `False`

`isinstance()` 和 `type()` 的区别在于：`type()` 不会认为子类是一种父类类型，判断继承关系时要用 `isinstance()`。

### 2. 返回多个值

函数可以直接返回多个值，调用时用多个变量接收：

```python
import math

def move(x, y, step, angle=0):
    nx = x + step * math.cos(angle)
    ny = y - step * math.sin(angle)
    return nx, ny

x, y = move(100, 100, 60, math.pi / 6)
print(x, y)   # 151.96152422706632 70.0
```

看起来返回了两个值，实际上返回的是一个 **tuple**：`return nx, ny` 等价于 `return (nx, ny)`，只是写法上省略了括号；而 `x, y = ...` 是按位置依次解包赋值。

## 三、跨文件导入函数

函数可以写在一个 `.py` 文件里，再被其他文件导入使用。先建一个模块文件 `maxtest.py`：

```python
# maxtest.py
def max_test(a, b):
    if a > b:
        return a
    else:
        return b
```

然后在另一个文件里导入它：

```python
# test2.py
from maxtest import max_test

print(max_test(3, 5))   # 5
```

模块名就是文件名去掉 `.py` 后缀，`from 模块名 import 函数名` 只把需要的函数引进来。这也是后面拆分项目、写多文件程序的基础。

## 四、函数参数的五种形态

Python 的函数参数很灵活，一共五种，先在开头列个总览：

| 参数类型 | 定义写法 | 函数内部收到什么 |
|---|---|---|
| 位置参数 | `def f(x, y)` | 按顺序一一对应的值 |
| 默认参数 | `def f(x, n=2)` | 值；调用时没传就用默认值 |
| 可变参数 | `def f(*args)` | 一个 **tuple** |
| 命名关键字参数 | `def f(*, city, job)` | 必须以 `名=值` 传入的参数 |
| 关键字参数 | `def f(**kw)` | 一个 **dict** |

### 1. 位置参数

最普通的参数，调用时必须按顺序传入，一个都不能少：

```python
def power(x):
    return x * x

print(power(5))   # 25
```

要计算 `x` 的 `n` 次方，就再加一个参数：

```python
def power(x, n):
    s = 1
    while n > 0:
        n = n - 1
        s = s * x
    return s

print(power(5, 3))   # 125
```

这里的 `x`、`n` 都是位置参数，调用时必须都传，否则报错。

### 2. 默认参数

计算平方是高频操作，每次都写 `power(5, 2)` 太啰嗦，可以给 `n` 一个默认值：

```python
def power(x, n=2):
    s = 1
    while n > 0:
        n = n - 1
        s = s * x
    return s
```

再看一个学生注册的例子，除了必填的姓名和性别，年龄和城市都可以有默认值：

```python
def enroll(name, gender, age=6, city='Beijing'):
    print('name:', name)
    print('gender:', gender)
    print('age:', age)
    print('city:', city)

enroll('Bob', 'M', 7)              # age 用传入的 7，city 用默认值
enroll('Adam', 'M', city='Tianjin')  # 跳过 age，直接指定 city
```

默认参数把调用复杂度降了下来：能省则省，需要时再覆盖。规则是**必选参数在前、默认参数在后**。

#### 默认参数必须指向不可变对象

这是一个非常经典的坑：

```python
def add_end(L=[]):
    L.append('END')
    return L

add_end([1, 2, 3])   # [1, 2, 3, 'END']，传入 list 时正常
add_end(['x', 'y'])  # ['x', 'y', 'END']，正常

add_end()            # ['END']
add_end()            # ['END', 'END']        ← 出问题了
add_end()            # ['END', 'END', 'END'] ← 还在累积
```

原因：**Python 函数在定义的时候，默认参数 `L` 的值就已经被计算出来了**，也就是那个 `[]`。因为默认参数 `L` 本身是一个变量，它指向了这个 list 对象，每次调用 `add_end()` 时执行 `L.append('END')` 都是在修改这个对象本身的内存内容。所以下次再调用时，默认参数指向的已经不是"定义时的空 list"了。

结论：**默认参数必须指向不变对象**（`None`、数字、字符串、元组），绝不能指向 list、dict 这类可变对象。正确写法是用 `None` 做占位，在函数内部再创建：

```python
def add_end(L=None):
    if L is None:
        L = []
    L.append('END')
    return L
```

### 3. 可变参数

在参数前加一个 `*`，就可以传入任意个参数（包括 0 个）。函数内部收到的 `numbers` 是一个 **tuple**：

```python
def calc(*numbers):
    sum = 0
    for n in numbers:
        sum = sum + n * n
    return sum

calc(1, 2)     # 5
calc(1, 2, 3)  # 14
calc()         # 0
```

如果已经有一个 list 或 tuple，想把它传给可变参数，不用写 `calc(nums[0], nums[1], nums[2])`，直接在调用时加 `*` 解包即可：

```python
nums = [1, 2, 3]
calc(*nums)   # 14，*nums 把 list 的所有元素作为可变参数传进去
```

### 4. 关键字参数

关键字参数允许传入任意个带参数名的参数，函数内部会自动把它们组装成一个 **dict**：

```python
def person(name, age, **kw):
    print('name:', name, 'age:', age, 'other:', kw)

person('Jack', 24, city='Beijing', job='Engineer')
# name: Jack age: 24 other: {'city': 'Beijing', 'job': 'Engineer'}

person('Bob', 30)
# name: Bob age: 30 other: {}

person('Adam', 45, gender='M', job='Engineer')
# name: Adam age: 45 other: {'gender': 'M', 'job': 'Engineer'}
```

关键字参数的好处是**扩展函数功能**：比如做一个用户注册，用户名和年龄必填，其他都是可选项，用 `**kw` 就不用为每个可选项都写一个参数。

同样地，已有的 dict 也可以用 `**` 解包传进去：

```python
extra = {'city': 'Beijing', 'job': 'Engineer'}
person('Alice', 25, **extra)
# name: Alice age: 25 other: {'city': 'Beijing', 'job': 'Engineer'}
```

如果只是想在 `**kw` 里挑出特定的几个，可以自己判断，但这样写很别扭：

```python
def person(name, age, **kw):
    if 'city' in kw:
        pass   # 有 city 参数
    if 'job' in kw:
        pass   # 有 job 参数
    print('name:', name, 'age:', age, 'other:', kw)
```

### 5. 命名关键字参数

要限制关键字参数的名字，可以用命名关键字参数——用一个特殊分隔符 `*`，`*` 后面的参数就只能是关键字参数，且必须传入参数名：

```python
def person(name, age, *, city, job):
    print(name, age, city, job)

person('Jack', 24, city='Beijing', job='Engineer')   # Jack 24 Beijing Engineer
# person('Jack', 24, 'Beijing', 'Engineer')          # 报错：缺少 city 和 job
```

如果函数定义里**已经有可变参数**，那后面的命名关键字参数就不再需要额外的 `*` 分隔符了：

```python
def person(name, age, *args, city, job):
    print(name, age, args, city, job)
```

命名关键字参数也可以有缺省值，有了默认值就不必每次都传：

```python
def person(name, age, *, city='Beijing', job):
    print(name, age, city, job)

person('Jack', 24, job='Engineer')   # Jack 24 Beijing Engineer
```

### 6. 参数组合

五种参数可以组合使用，但**定义顺序必须是：必选参数、默认参数、可变参数、命名关键字参数、关键字参数**：

```python
def f1(a, b, c=0, *args, **kw):
    print('a =', a, 'b =', b, 'c =', c, 'args =', args, 'kw =', kw)

def f2(a, b, c=0, *, d, **kw):
    print('a =', a, 'b =', b, 'c =', c, 'd =', d, 'kw =', kw)
```

调用时同样可以用 tuple 和 dict 解包：

```python
args = (1, 2, 3, 4)
f1(*args)              # a = 1 b = 2 c = 3 args = (4,) kw = {}

f2(1, 2, d=99, ext=None)   # a = 1 b = 2 c = 0 d = 99 kw = {'ext': None}
```

最后一条经验：**尽量不要在一个函数接口里塞太多种参数类型**，否则接口会变得复杂、不易理解和调用。

## 五、递归

函数内部调用自身就是递归。以阶乘 `n! = 1 × 2 × 3 × ... × n` 为例：

```python
def fact(n):
    if n == 1:
        return 1
    return n * fact(n - 1)
```

递归调用使用的是**栈空间**：在递归没有完成之前，每次调用都会在栈上开辟一块空间保存当前状态，所以递归次数过多会导致**栈溢出**（`RecursionError`）。

理论上可以写成**尾递归**来优化——尾递归指函数在最后一步调用自身，并且这个调用的返回值直接作为当前函数的返回值，`return` 语句里不带表达式：

```python
def fact(n):
    return fact_iter(n, 1)

def fact_iter(num, product):   # num: 当前阶乘数, product: 当前累乘结果
    if num == 1:
        return product
    return fact_iter(num - 1, num * product)
```

尾递归优化（TCO）是指编译器或解释器在实现尾递归时，不再为当前函数调用分配新的栈帧，而是直接复用当前栈帧，从而避免栈溢出。但**Python 并没有对尾递归做优化**，即使是尾递归照样会栈溢出，所以在 Python 中还是要尽量避免递归，能用循环就用循环。

## 六、练习记录

### 1. 用 hex() 把整数转成十六进制字符串

```python
n1 = 255
n2 = 1000
print(hex(n1))   # 0xff
print(hex(n2))   # 0x3e8
```

### 2. 解一元二次方程 quadratic(a, b, c)

返回 `ax² + bx + c = 0` 的两个解，计算平方根用 `math.sqrt()`：

```python
import math

def quadratic(a, b, c):
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)) or not isinstance(c, (int, float)):
        raise TypeError('bad operand type')
    if a == 0:
        raise ValueError('a cannot be zero')   # 不是二次方程
    delta = b * b - 4 * a * c
    if delta < 0:
        raise ValueError('no real roots')      # 判别式小于 0，无实数解
    x1 = (-b + math.sqrt(delta)) / (2 * a)
    x2 = (-b - math.sqrt(delta)) / (2 * a)
    return x1, x2
```

这里同时用上了参数检查（`isinstance` + `raise`）和返回多个值——返回值正是前面说的 tuple。

### 3. 把 mul(x, y) 改造成可接收任意个参数

原始版本只能算两个数的乘积：

```python
def mul1(x, y):
    return x * y
```

用可变参数改造后可以接收一个或多个数，并且对 0 个参数的情况做了检查：

```python
def mul(*numbers):
    if not numbers:
        raise TypeError('mul() requires at least one argument')
    product = 1
    for n in numbers:
        product *= n
    return product
```

测试时要注意：**0 个参数的用例不能直接写在 `elif` 链里**——`mul()` 会抛异常，所以放在 `else` 分支里用 `try / except` 捕获：

```python
print('mul(5) =', mul(5))              # 5
print('mul(5, 6) =', mul(5, 6))        # 30
print('mul(5, 6, 7) =', mul(5, 6, 7))  # 210

if mul(5) != 5:
    print('mul(5)测试失败!')
elif mul(5, 6) != 30:
    print('mul(5, 6)测试失败!')
elif mul(5, 6, 7) != 210:
    print('mul(5, 6, 7)测试失败!')
elif mul(5, 6, 7, 9) != 1890:
    print('mul(5, 6, 7, 9)测试失败!')
else:
    try:
        mul()
        print('mul()测试失败!')
    except TypeError:
        print('测试成功!')
```

### 4. 汉诺塔

编写 `move(n, a, b, c)`，接收盘子数量 `n`，打印出把 `n` 个盘子从 A 借助 B 移动到 C 的每一步：

```python
def move(n, a, b, c):
    if not isinstance(n, int) or isinstance(n, bool) or n < 1:
        raise ValueError('n must be a positive integer')
    if n == 1:
        print(a, '-->', c)   # 只剩一个盘子，直接移动
        return
    move(n - 1, a, c, b)     # 先把上面 n-1 个从 A 移到 B
    print(a, '-->', c)       # 再把最大的盘子从 A 移到 C
    move(n - 1, b, a, c)     # 最后把 n-1 个从 B 移到 C
```

递归的思路是：把"移动 n 个盘子"拆成"移动 n-1 个盘子 + 移动最大的一个 + 再移动 n-1 个盘子"，终止条件是 `n == 1`。参数检查里特意排除了 `bool`——因为 `isinstance(True, int)` 是 `True`，不加判断的话 `move(True, ...)` 会被当成合法的 `n = 1`。

## 七、小结

Day 3 从"调用函数"走到"定义函数"，核心内容：

- **函数基础**：内置函数调用与类型转换、`def` 定义、参数检查（`isinstance` + `raise`）、返回多个值（本质是 tuple）、`pass` 占位、跨文件 `import`
- **参数体系**：位置参数 → 默认参数 → 可变参数 `*args` → 命名关键字参数 → 关键字参数 `**kw`，定义顺序不能乱
- **两个重点**：默认参数必须指向不可变对象（`L=[]` 的坑）；`*` 和 `**` 在**定义**时是"打包"（打包成 tuple / dict），在**调用**时是"解包"，方向正好相反
- **递归**：写法简洁但有栈溢出风险，Python 不做尾递归优化，能用循环就用循环

从 C 语言转过来的话，最容易不适应的大概就是参数这一块了：C 里参数数量和类型都是写死的，而 Python 可以用 `*args` / `**kw` 写出"什么都能接"的接口——灵活是灵活，但也更要克制，接口参数类型越多越难用。
