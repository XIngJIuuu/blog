---
title: Python 学习笔记 Day 5：字符串、列表、字典常用方法与 f-string 格式化
published: 2026-09-13
description: Python 第五天笔记：str/list/dict 三类内置容器的常用方法速查，f-string 的对齐、补零、千分位与 !r 格式，列表变量是引用带来的赋值与拷贝区别，字典 get 与方括号、setdefault 计数分组两个高频套路，以及 BMI、回文判断、九九乘法表、质数统计、两数之和等综合练习。
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day5
draft: false
pinned: false
---

> [!NOTE]
> 这是第五天 Python 学习笔记，由入门阶段的练习代码整理而成。前几天把语法主干走完了：Day 2 是"数据怎么存"，Day 3 是"逻辑怎么复用"，Day 4 是"数据怎么流动"。今天补齐最后一块——**每类数据手上有哪些顺手的方法**，以及把这些方法串起来写的一组综合练习。
>
> 这一天内容偏"查表"，不必背，重点是形成三个条件反射：字符串方法**都返回新串**、列表变量**存的是引用**、字典取值**优先用 `get`**。

## 一、字符串常用方法

先记住一条总原则：**str 是不可变的**，所以字符串方法没有一个能"原地修改"，全都是**返回一个新字符串**，原串永远保持原样。

```python
s = "Hello, Python"

print(s.upper())          # HELLO, PYTHON
print(s.lower())          # hello, python
print(s)                  # Hello, Python —— 原串没变
```

### 1. 拆分与拼接

```python
s = "Hello, Python"
print(s.split(", "))              # ['Hello', 'Python']
print("-".join(["2026", "09", "07"]))   # 2026-09-07
```

- `split(分隔符)`：字符串 → 列表，相当于 C 里手写的 `strtok`。
- `join(列表)`：**列表 → 字符串**，注意调用者是"分隔符"而不是列表，读作"用 `-` 把这些元素连起来"。

> [!WARNING]
> `join` 只能拼接字符串元素，列表里有整数会直接 `TypeError`。要拼混合内容先转一下：`"-".join(str(x) for x in [2026, 9, 7])`。

### 2. 裁剪、替换、查找

```python
print("  hello  ".strip())        # 'hello'，去两端空白（还有 lstrip / rstrip）
print("Hello, Python".replace("Python", "World"))   # Hello, World
print("Hello, Python".find("Py"))   # 7，找不到返回 -1（类似 strstr 拿到下标）
print("Hello, Python".find("Java")) # -1
print("Hello, Python".count("o"), len("Hello, Python"))   # 2 13
```

`find` 返回的是**下标**，和 C 里 `strstr` 返回指针不一样；判断"有没有"用 `in` 更直白：`"Py" in s`。

### 3. 内容判断

```python
print("123".isdigit())      # True，全是数字
print("abc".isalpha())      # True，全是字母
print("abc123".isalnum())   # True，全是字母或数字
print("abc123".isdigit())   # False，混了字母就不算
```

这类方法在数据清洗里最好用——一个 `isalnum()` 就把标点和空格全滤掉了（见练习 2）。

## 二、f-string 格式化速查

Day 1 介绍过三种格式化方式，实战里只用 f-string。它的语法 `{值:格式}`，冒号后面就是格式说明符，基本能一一对应 C 的 `printf`：

```python
pi = 3.14159
n = 42

print(f"{pi:.2f}")     # 3.14     —— 对应 %.2f，保留两位小数
print(f"[{n:5d}]")     # [   42]  —— 对应 %5d，宽度 5，默认右对齐
print(f"{n:05d}")      # 00042    —— 对应 %05d，宽度 5，不足补 0
print(f"{1234567:,}")  # 1,234,567 —— 千分位
```

### 1. 对齐与填充

```python
print(f"{'hi':>10}|")   #         hi|   右对齐，宽度 10
print(f"{'hi':<10}|")   # hi        |   左对齐
print(f"{'hi':^10}|")   #     hi    |   居中
print(f"{n:*^9}")       # ***42****  —— 居中的同时用 * 填充空白
```

格式说明符的结构是 `[填充字符][对齐符号][宽度]`：`>` 右、`<` 左、`^` 居中，不写填充字符就用空格。

### 2. `!r`：按"原始形式"输出

```python
c = "A man, a plan"
print(f"{c!r} -> True")   # 'A man, a plan' -> True
```

`!r` 等价于对值调用 `repr()`，会带上引号和转义字符。调试时打印字符串特别有用——空格和空串一眼就能看出来（`''` 和 `f"{s}"` 输出成两个看不见的引号，高下立判）。

## 三、列表常用方法

### 1. 增、删、改、查

```python
lst = [10, 20, 30]
lst.append(40)          # 尾部添加，自动扩容
lst.insert(0, 5)        # 指定位置插入（O(n)，少用）
lst.extend([50, 60])    # 合并另一个列表
print(lst)              # [5, 10, 20, 30, 40, 50, 60]

lst.remove(20)          # 按值删除（只删第一个，不存在会报错）
last = lst.pop()        # 弹出末尾并返回（C 里要自己维护长度）
first = lst.pop(0)      # 弹出指定位置
print(lst, "| 弹出:", last, first)   # [10, 30, 40, 50] | 弹出: 60 5

lst[0] = 99             # 按下标修改，和 C 一样
print(30 in lst)        # True，成员判断，替代 C 的手写循环查找
print(lst.index(30))    # 1，查下标（找不到抛 ValueError）
print(len(lst), sum(lst), max(lst))   # 4 219 99
```

四个删除方法的区别值得记一下：

| 方法 | 依据 | 返回值 | 找不到时 |
|---|---|---|---|
| `remove(x)` | 按值 | 无 | `ValueError` |
| `pop()` / `pop(i)` | 按下标 | **被删的元素** | `IndexError` |
| `del lst[i]` | 按下标（语句） | 无 | `IndexError` |

### 2. sort 与 sorted

```python
scores = [88, 72, 95, 60]
scores.sort()                       # 原地排序，小→大，原列表被改
print(scores)                       # [60, 72, 88, 95]
print(sorted(scores, reverse=True)) # [95, 88, 72, 60]，返回新列表，原列表没动
print(scores)                       # [60, 72, 88, 95]
```

一句话区分：**`sort()` 是方法、改自己、返回 `None`；`sorted()` 是函数、返回新列表**。所以 `scores = scores.sort()` 会把列表变成 `None`，这是新手最常见的一个坑。`sorted()` 因为不改原对象，还能直接用于 dict、字符串等任意可迭代对象。

## 四、列表变量存的是引用

这是今天最需要留一个印象的一条。C 里数组压根不能整体赋值（`int b[3] = a;` 语法就不通过），要复制只能手写循环或 `memcpy`，两块内存天然独立；而 Python 里 `b = a` **只复制"地址"**：

```python
a = [1, 2, 3]
b = a              # b 和 a 指向同一个列表（两个指针指向同一块内存）
b.append(4)
print(a)           # [1, 2, 3, 4] —— a 也变了，因为根本没有 b 这个独立列表
print(b is a)      # True，is 判断是不是同一个对象
```

要真正复制一份，得显式拷贝：

```python
c = a.copy()       # 或者 c = a[:]，切片复制（Day 4 提过）
c.append(5)
print(a, c)        # [1, 2, 3, 4] [1, 2, 3, 4, 5]
print(c is a)      # False
```

> [!WARNING]
> `copy()` 和 `a[:]` 都是**浅拷贝**：外层列表是新的，里面每个元素仍是共享的引用。嵌套列表一改就两边同时变：
>
> ```python
> import copy
> nested = [[1, 2], [3]]
> d = nested.copy()
> d[0].append(99)
> print(nested)   # [[1, 2, 99], [3]] —— 内层被一起改了
> ```
>
> 需要彻底独立的一份用 `copy.deepcopy(nested)`。

顺带一提，整数、字符串这类不可变对象不会有这个困扰：`b = 3` 之后 `b += 1` 不会改掉 `a`。可变（list / dict / set）+ 引用，才需要时刻想着"我改的是不是同一块内存"。

## 五、字典常用操作

### 1. 增删改查

```python
scores = {"张三": 90, "李四": 85}

scores["王五"] = 78        # 新增和修改是同一条语句：赋值
print(scores["张三"])      # 90，取值；键不存在会 KeyError（像数组越界）
print(scores.get("赵六"))      # None，get 不存在不报错（推荐）
print(scores.get("赵六", 0))   # 0，也可以给默认值

del scores["李四"]             # 按键删除（语句）
print(scores.pop("王五"))      # 78，弹出并返回被删的值
print(scores, "长度:", len(scores))   # {'张三': 90} 长度: 1
```

**`scores[key]` 与 `scores.get(key)` 的取舍**是这个系列里出现过两次的重点：前者适合"确定存在"的场景，后者适合"可能不存在"。用 `[]` 去取一个不存在的键，程序直接崩在 `KeyError` 上，而 `get` 给你一个 `None` 或默认值继续走。

### 2. 遍历与判断

```python
scores = {"张三": 90, "李四": 85, "王五": 78}

for name in scores:                # 默认遍历**键**
    print(name, scores[name])

for name, score in scores.items():  # 同时拿键和值，推荐写法
    print(f"{name}: {score}")

print("张三" in scores)     # True，in 判断的是**键**，O(1)
print(90 in scores.values())  # True，想判断值必须显式写 .values()
print(90 in scores)           # False
```

> [!NOTE]
> `in scores` 查的是键，因为键唯一且哈希定位；`in scores.values()` 要遍历所有值，是 O(n)。C 里遍历哈希表要自己管桶和链表，这里就是一行 `for k, v in d.items()`。

### 3. 两个高频套路

**计数**——`get(key, 0)` 的经典用法：

```python
text = "abracadabra"
counter = {}
for ch in text:
    counter[ch] = counter.get(ch, 0) + 1   # 没见过就从 0 开始，见过就在原值上加 1
print(counter)   # {'a': 5, 'b': 2, 'r': 2, 'c': 1, 'd': 1}
```

**分组**——`setdefault(key, [])`，键不存在就先塞一个空列表进去：

```python
students = [("一班", "张三"), ("二班", "李四"), ("一班", "王五")]
groups = {}
for cls, name in students:
    groups.setdefault(cls, []).append(name)
print(groups)   # {'一班': ['张三', '王五'], '二班': ['李四']}
```

`groups.setdefault(cls, []).append(name)` 完全等价于下面这段啰嗦写法，两者记住哪个都行：

```python
if cls not in groups:
    groups[cls] = []
groups[cls].append(name)
```

## 六、练习记录

### 1. BMI 计算器：输入、判断、保留两位小数

```python
height = float(input("请输入身高(m): "))
weight = float(input("请输入体重(kg): "))
bmi = weight / (height ** 2)
print(f"你的 BMI 是: {bmi:.2f}")     # 保留两位小数

if bmi < 18.5:
    print("过轻")
elif bmi >= 18.5 and bmi < 25:
    print("正常")
elif bmi >= 25 and bmi < 28:
    print("过重")
elif bmi >= 28 and bmi < 32:
    print("肥胖")
else:
    print("严重肥胖")
```

`input()` 拿到的永远是**字符串**，必须 `float()` 转一下才能参与运算——这一点和 C 的 `scanf("%f")` 不同，Python 不帮你转型。区间判断这里写成了 `bmi >= 18.5 and bmi < 25`，其实可以借 Python 的连续比较写成 `18.5 <= bmi < 25`，更短也更接近数学写法。

### 2. 文本清洗 + 回文判断：类型标注与生成器表达式

先写一个"只保留字母和数字并转小写"的清洗函数：

```python
def clean_text(text: str) -> str:          # 参数和返回值都可以写类型标注
    result = ""
    for ch in text:
        if ch.isalnum():                    # 是字母或数字才留下
            result += ch.lower()
    return result
```

用 Day 4 的生成器表达式 + `join`，同样的逻辑一行搞定：

```python
def clean_text_one_line(text: str) -> str:
    return "".join(ch.lower() for ch in text if ch.isalnum())
```

> [!NOTE]
> `-> str` 这类**类型标注（type annotation）只是给人和编辑器看的提示，Python 运行时并不强制检查**——传错类型照样能跑，只是 IDE 会画红线。它和 Day 3 里 `isinstance` 的真正检查是两回事。

回文判断就是"清洗完和自身反转比较"，一个切片 `[::-1]` 完事：

```python
def is_palindrome(text: str) -> bool:
    cleaned = clean_text(text)      # 清洗文本
    return cleaned == cleaned[::-1]  # 和反转后的自己比？

cases = [
    "A man, a plan, a canal: Panama",
    "race a car",
    "上海自来水来自海上",
    "12321",
    "",
]
for c in cases:
    print(f"{c!r} -> {is_palindrome(c)}")   # !r：按原始形式输出，带引号
# 'A man, a plan, a canal: Panama' -> True
# 'race a car' -> False
# '上海自来水来自海上' -> True
# '12321' -> True
# '' -> True
```

中文和数字都能直接判，因为 Python 3 的 `str` 本身就是 Unicode 序列，`[::-1]` 按"字符"反转而不是按字节——这在 C 里处理 UTF-8 是可要做一整套字节判断的。空串返回 `True` 也符合数学定义（空回文）。

### 3. 偶数和与九九乘法表：同一件事的两种写法

求 1~100 偶数和，`for` 和 `while` 各写一遍：

```python
total = 0
for i in range(1, 101):
    if i % 2 == 0:
        total += i
print("1~100 偶数和:", total)   # 2550

total = 0
i = 0
while i <= 100:
    total += i
    i += 2                       # 步长 2，直接跳过奇数
print("1~100 偶数和:", total)   # 2550
```

`while` 版本利用步长省掉 `if` 判断，其实最 Pythonic 的写法是 `sum(range(0, 101, 2))`——`range` 的第三个参数就是步长。

九九乘法表，重点在**两个 for + 格式化输出**：

```python
for i in range(1, 10):
    for j in range(1, i + 1):
        print(f"{j}x{i}={i*j:<4}", end="")   # <4：左对齐，占 4 宽
    print()                                   # 空 print 只负责换行
# 1x1=1
# 1x2=2   2x2=4
# 1x3=3   2x3=6   3x3=9
# ...
# 1x9=9   2x9=18  3x9=27  ...  9x9=81
```

两个细节：`end=""` 关掉 `print` 默认的换行（默认是 `end="\n"`），让同一行的式子连着打；`:<4` 给每格固定 4 宽的左对齐空间，不然像 `9x9=81` 这种两位数结果会把整列挤歪——这正好是前面 f-string 对齐的实战用途。

### 4. 质数统计：循环 + 提前返回

```python
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):   # 只试到平方根
        if n % i == 0:
            return False                     # 有一个因子就不是质数
    return True

count = 0
for i in range(1, 101):
    if is_prime(i):
        count += 1
print("1~100 中质数的个数:", count)   # 25
```

`int(n ** 0.5) + 1` 这个写法要注意：`x ** 0.5` 是浮点开方，`int()` 向下取整，`+1` 补回右边界（`range` 左闭右开）。只试到平方根，是因为 `n = a × b` 里必有一个因子 ≤ √n。同样一段统计，写成 `sum(1 for i in range(1, 101) if is_prime(i))` 更短。

### 5. 两数之和：用 dict 换时间

LeetCode 第 1 题。C 里的暴力解是两层 for，O(n²)；Python 里因为字典查找是 O(1)，自然想到用空间换时间：

```python
def two_sum(nums: list, target: int) -> list:
    """返回和为 target 的两个下标；哈希表解法 O(n)"""
    seen = {}                            # 值 -> 下标
    for i, n in enumerate(nums):
        if target - n in seen:           # 需要的那个"另一半"见过没有？
            return [seen[target - n], i]
        seen[n] = i                      # 把当前值和下标记下来
    return []
```

```python
print(two_sum([2, 7, 11, 15], 9))   # [0, 1]
print(two_sum([3, 2, 4], 6))        # [1, 2]
```

思路是"边走边记"：走到 `7` 时，先看 `9 - 7 = 2` 在不在 `seen` 里，在就直接返回两个下标；不在就把 `7: 1` 存进去。**边遍历边写入**这一点很关键——如果一开始就把整张表建好再查，元素会跟"自己"配对：`two_sum([3, 2, 4], 6)` 会先命中 `3 + 3 = 6`，返回 `[0, 0]` 而不是正确答案 `[1, 2]`。

### 6. 可变参数 + 字典：合并销售记录

`*dicts` 收下任意多个字典，同键累加（Day 3 的 `*args` 在这里派上用场）：

```python
def merge_sales(*dicts: dict) -> dict:
    """合并多个销售记录，同键累加"""
    total = {}
    for d in dicts:
        for k, v in d.items():
            total[k] = total.get(k, 0) + v    # 没见过就从 0 开始加
    return total

print(merge_sales({"苹果": 3, "香蕉": 5}, {"苹果": 7}, {"橘子": 2}))
# {'苹果': 10, '香蕉': 5, '橘子': 2}
```

`total[k] = total.get(k, 0) + v` 就是第 5 节"计数套路"的变体，只不过累加的是值而不是 1。

### 7. 成绩查询：get 与方括号的区别收尾

```python
def query_grade(table: dict, name: str) -> str:
    score = table.get(name)          # 查不到得到 None，而不是 KeyError
    if score is None:
        return f"{name} 不在成绩表中"
    return f"{name} 的成绩是 {score}"

t = {"张三": 90, "李四": 85}
print(query_grade(t, "张三"), "|", query_grade(t, "赵六"))
# 张三 的成绩是 90 | 赵六 不在成绩表中
```

如果写成 `table[name]`，查"赵六"时函数就直接被 `KeyError` 打断，`if score is None` 那一步根本轮不到——这两个练习正好把"取值用 `get`、确定存在才用 `[]`"落到实处。

## 七、小结

Day 5 是"把工具捡起来"的一天，可以当速查表用：

- **str**：不可变，所有方法都返回新串。`upper/lower/strip/replace` 处理内容，`split`（串→表）和 `join`（表→串，调用者是分隔符）成对使用，`find` 返回下标或 `-1`，`isalnum/isalpha/isdigit` 用于内容判断。
- **f-string**：`{值:格式}`，`.2f` 小数位、`5d`/`05d` 宽度与补零、`>` `<` `^` 对齐、`*^9` 带填充字符、`:` 千分位、`!r` 原始形式。
- **list**：`append/insert/extend` 增，`remove`（按值）/`pop`（返回被删元素）/`del`（语句）删，`sort()` 原地改并返回 `None`、`sorted()` 返回新表，`index` 查下标、`in` 判断成员。
- **引用**：`b = a` 只是多一个名字，改 `b` 就是改 `a`；`a.copy()` / `a[:]` 是浅拷贝，嵌套结构会共享内层，需要独立时用 `copy.deepcopy()`。
- **dict**：赋值即新增/修改，`get(key, 默认值)` 防 `KeyError`（推荐），`[]` 直取（会抛错），`in` 判断的是键（O(1)）不是值（`values()` 是 O(n)）；计数用 `d[k] = d.get(k, 0) + 1`，分组用 `d.setdefault(k, []).append(v)`。

从 C 转过来最容易踩的是第四节：C 里"两个数组"是真的两块内存，Python 里 `b = a` 之后它们**是同一个对象**，函数参数传列表同理（所以函数能悄悄改掉你传进去的列表，这正是 Day 3 里"默认参数必须是不可变对象"的同一个原因）。今天这些练习基本都是三五行的短函数，但每个都对应一个 C 里要写几十行的活儿——哈希表、动态数组、字符串处理全在语言里备好了，这也是 Python 适合快速写工具脚本的原因。
