---
title: Python 学习笔记 Day 2：列表、元组与流程控制
published: 2026-09-08
description: Python 第二天笔记：list 与 tuple 的使用与区别、if 条件判断、for/while 循环与 break/continue、dict 与 set，以及 match-case 模式匹配。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day2
draft: false
pinned: false
---

> [!NOTE]
> 这是第二天 Python 学习笔记，由入门阶段的练习代码整理而成，接在第一天的数据类型之后，内容仍然偏基础。

## 一、列表 list：有序的可变集合

list 是 Python 内置的**有序集合**，用方括号 `[]` 表示，可以随时添加和删除元素：

```python
classmates = ['Michael', 'Bob', 'Tracy']
```

### 1. 用索引访问元素

索引从 **0** 开始；要取最后一个元素，除了用 `len(classmates) - 1` 计算索引，还可以直接用 `-1` 表示倒数：

```python
print(classmates[0])                    # Michael
print(classmates[len(classmates) - 1])  # Tracy
print(classmates[-1])                   # Tracy，倒数第一个
print(classmates[-2])                   # Bob，倒数第二个
```

索引越界会报 `IndexError`，要确保索引不超过 `len(classmates) - 1`。

### 2. 添加与删除

```python
classmates = ['Michael', 'Bob', 'Tracy']
classmates.append('Adam')   # 末尾追加 → ['Michael', 'Bob', 'Tracy', 'Adam']
classmates.pop()            # 删除末尾元素 → ['Michael', 'Bob', 'Tracy']
classmates.pop(1)           # 删除指定索引的元素 → ['Michael', 'Tracy']
```

### 3. 元素类型可以不同，还能嵌套

list 里的元素数据类型不需要一致，甚至可以再放一个 list：

```python
s = ['python', 'java', ['asp', 'php'], 'scheme']
print(len(s))    # 4，嵌套的 list 只算一个元素
print(s[2][1])   # php，先取 s[2] 这个 list，再取它的第 1 个元素
```

空 list 就是 `L = []`，`len(L)` 为 0。

## 二、元组 tuple：初始化后不可修改

tuple 和 list 非常类似，也是有序列表，但**一旦初始化就不能修改**：

```python
t = ('a', 'b', ['A', 'B'])
```

两个易错点：

```python
t = ()      # 空 tuple
t = (1,)    # 只有一个元素时必须加逗号——如果写成 (1)，括号会被当成数学运算的括号
```

"不可变"的准确含义是：tuple 的指向不能变。如果元素本身是个 list，那么这个 list **里面的元素**是可以修改的：

```python
t = ('a', 'b', ['A', 'B'])
t[2][0] = 'X'
t[2][1] = 'Y'
print(t)   # ('a', 'b', ['X', 'Y'])
```

## 三、条件判断 if / elif / else

```python
age = 20
if age >= 18:
    print('adult')
elif age >= 6:
    print('teenager')
else:
    print('kid')
```

两个要点：

- `if`、`elif`、`else` 后面都要加**冒号 `:`**，表示代码块开始
- 判断是**从上到下**进行的，命中一个条件后就不再看后面的条件，所以要注意条件的**顺序**——比如要把 `age >= 18` 写在 `age >= 6` 前面

`input()` 可以接收用户输入，返回的是 **str** 类型，参与数值比较前要用 `int()` 转换：

```python
birth = input('birth: ')   # 返回 str
birth = int(birth)         # 转成 int
if birth < 2000:
    print('00前')
else:
    print('00后')
```

## 四、循环：for-in 与 while

### 1. for-in 循环

依次把 list 或 tuple 中的每个元素迭代出来：

```python
names = ['Michael', 'Bob', 'Tracy']
for name in names:
    print(name)
```

> 变量 `name` 不需要提前声明——`for name in names` 的每一轮循环其实都在执行 `name = 某个元素`，而 Python 的变量只是给对象贴的标签，第一次赋值时就自动创建了，不像 C/Java 那样要先写声明。

配合 `range()` 计算 1~100 的整数和：

```python
sum = 0
for x in range(101):   # range(101) 生成 0 ~ 100 的整数
    sum = sum + x
print(sum)             # 5050
```

注意 `range(5)` 生成的序列是**从 0 开始、小于 5** 的整数，即 `0, 1, 2, 3, 4`。

### 2. while 循环

只要条件满足就不断循环，条件不满足时退出：

```python
sum = 0
n = 99
while n > 0:
    sum = sum + n
    n = n - 1
print(sum)   # 4950，即 1 ~ 99 的和
```

### 3. break 与 continue

- `break`：提前退出**整个**循环
- `continue`：提前结束**本轮**循环，直接开始下一轮

```python
# break：n 到 11 时满足条件，结束整个循环
n = 1
while n <= 100:
    if n > 10:
        break
    print(n)
    n = n + 1
print('END')

# continue：n 为偶数时跳过打印，只输出 10 以内的奇数
n = 0
while n < 10:
    n = n + 1
    if n % 2 == 0:
        continue   # 后面的 print() 不会执行
    print(n)
```

## 五、dict：键值对集合

dict 用花括号 `{}` 表示，通过 key 直接查 value，也可以先定义后赋值：

```python
d = {'Michael': 95, 'Bob': 75, 'Tracy': 85, 'Adam': 68}
print(d['Michael'])   # 95
d['Adam'] = 67        # key 已存在就是修改，不存在就是新增
```

### 1. 避免 KeyError：判断 key 是否存在

直接访问不存在的 key 会报错，有两种安全的写法：

```python
# 方法一：in 关键字
if 'Alice' in d:
    print(d['Alice'])
else:
    print('Key not found')

# 方法二：get() 方法，key 不存在时返回 None 或指定的默认值
print(d.get('Alice'))           # None
print(d.get('Alice', -1))       # -1，自定义默认值
```

### 2. 删除 key

```python
d.pop('Bob')   # key 和对应的 value 一起删除
```

### 3. dict 与 list 的对比

| | list | dict |
|---|---|---|
| 查找 / 插入速度 | 随元素增加而变慢 | 不随元素增加而变慢 |
| 内存占用 | 小，浪费很少 | 大，用空间换时间 |

另外，dict 内部存放的顺序和 key 放入的顺序无关。

**key 必须是不可变对象**：dict 通过 key 计算存储位置，这个算法叫**哈希算法**。如果同一个 key 每次算出不同的位置，dict 内部就完全乱了，所以字符串、整数可以做 key，list 不行。

## 六、set：无序去重的集合

set 是一组**不重复** key 的集合，不存储 value，用 `set()` 传入 list 创建：

```python
s = set([1, 2, 3])         # {1, 2, 3}
s = set([1, 1, 2, 2, 3])   # 重复元素会被自动过滤
```

set 是无序的，显示顺序可能和存放顺序不一样。添加和删除：

```python
s.add(4)      # 添加
s.remove(4)   # 删除
```

set 可以看成数学意义上的集合，能做交集、并集运算：

```python
s1 = set([1, 2, 3])
s2 = set([2, 3, 4])
print(s1 & s2)   # {2, 3}，交集
print(s1 | s2)   # {1, 2, 3, 4}，并集
```

## 七、match-case 模式匹配

`match` 语句（Python 3.10+ 新增，类似 C 语言的 switch），依次用 `case` 匹配，最后可以用 `case _` 匹配任意值（相当于 default），没有匹配到任何 case 时就执行它：

```python
score = 'B'
match score:
    case 'A':
        print('score is A.')
    case 'B':
        print('score is B.')
    case 'C':
        print('score is C.')
    case _:
        print('invalid score.')
```

对比等价的 `if / elif` 链，`match` 的分支结构清爽得多。

### 复杂匹配

除了匹配单个值，还可以匹配多个值、匹配范围，并把匹配到的值绑定到变量：

```python
age = 15
match age:
    case x if x < 10:        # 匹配范围，并把 age 的值绑定到 x
        print(f'< 10 years old: {x}')
    case 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18:   # 用 | 匹配多个值
        print('11~18 years old.')
    case 19:
        print('19 years old.')
    case _:
        print('not sure.')
```

甚至可以按列表的结构匹配，用 `*变量` 收集剩余元素：

```python
args = ['gcc', 'hello.c', 'world.c']
match args:
    case ['gcc']:                    # 只有 gcc 一个元素，缺少文件
        print('gcc: missing source file(s).')
    case ['gcc', file1, *files]:     # gcc 后跟至少一个文件
        print('gcc compile: ' + file1 + ', ' + ', '.join(files))
    case ['clean']:
        print('clean')
    case _:
        print('invalid command.')
```

## 八、练习记录

**用索引取出嵌套 list 的指定元素**：

```python
L = [
    ['Apple', 'Google', 'Microsoft'],
    ['Java', 'Python', 'Ruby', 'PHP'],
    ['Adam', 'Bart', 'Bob']
]
print(L[0][0])   # Apple
print(L[1][1])   # Python
print(L[2][2])   # Bob
```

**BMI 计算器**：输入身高体重，按区间输出结论：

```python
height = float(input("请输入身高(米):"))
weight = float(input("请输入体重(公斤):"))
bmi = weight / (height ** 2)
print("您的BMI值是:", bmi)

if bmi < 18.5:
    print("过轻")
elif bmi < 25:
    print("正常")
elif bmi < 28:
    print("过重")
elif bmi < 32:
    print("肥胖")
else:
    print("严重肥胖")
```

正好用上了 `elif` 从上到下短路判断的特性。

**用循环对 list 中每个名字打出 Hello, xxx!**：

```python
names = ['Michael', 'Bob', 'Tracy']
for name in names:
    print('Hello, %s!' % name)
# 也可以用 f-string：print(f'Hello, {name}!')
```

---

> 小结：Day 2 覆盖了 Python 的四种核心容器——list（有序可变）、tuple（有序不可变）、dict（键值对）、set（无序去重），以及流程控制三板斧：if 条件判断、for/while 循环（含 break/continue）和 match-case 模式匹配。容器选择的简单经验：要顺序和可变性用 list，要不可变用 tuple，要按 key 快速查找用 dict，要去重和集合运算用 set。
