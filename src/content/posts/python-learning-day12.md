---
title: Python 学习笔记 Day 12：sorted 排的不是你以为的那个东西
published: 2026-09-21
description: "Python 第十二天笔记，按条目排的可查清单。主线只有一句：排序真正比较的不是元素本身，而是 key 函数产出的那串值——由此推出四件事。稳定性是唯一能被利用的保证（实测三个同分元素照抄原顺序）；多条件靠元组 key，而取负只对数字有效，字符串取负会抛 bad operand type for unary minus 那个 TypeError；reverse=True 翻的是整个 key 元组的顺序而不是第一个条件；key 函数在比较开始之前按原表顺序逐个调用（实测调用顺序与次数，以及为什么元组里混类型有时报有时不报）。另有 itemgetter 与 lambda 的实测速度差、cmp_to_key 返回的 KeyWrapper、字典四种 sorted 各排什么、tuple 没有 sort 方法，以及力扣 26 的写指针实现和它在空数组上的边界。"
tags: [Python, 学习笔记]
category: Python学习
slug: python-learning-day12
draft: false
pinned: false
---

> [!NOTE]
> 这是第十二天 Python 学习笔记，延续前两篇的形式：**按条目排的可查清单**，每条结论下面都跟着实测输出。
>
> 前两篇都在讲"名字绑到哪个对象上"。这篇换一个更具体的场景：排序。因为排序里有一件事和那条主线严丝合缝——**你以为是元素在比大小，其实一直是 `key` 的返回值在比**。

## 一、主线：排的是 key，不是元素

```python
rows = [{'name': '张三', 'score': 88, 'age': 20},
        {'name': '李四', 'score': 95, 'age': 19},
        {'name': '王五', 'score': 88, 'age': 19},
        {'name': '赵六', 'score': 88, 'age': 22}]
```

下面这一行里，`sorted` 从头到尾**没有比较过一次字典**：

```python
sorted(rows, key=lambda r: (-r['score'], r['age']))
```

它比较的是 `(-88, 20)`、`(-95, 19)` 这四个元组。整篇的每个现象——为什么负号只对数字有效、为什么 `reverse` 会把两个条件一起翻、为什么同分的人保持原顺序、为什么元组里混类型有时不报错——全都是这一句话的推论。

## 二、`sorted` 和 `sort` 不是一类东西

```python
nums = [3, 1, 2]
r = sorted(nums)
print(r, r is nums)      # 新对象
s = nums.sort()
print(s, nums)           # None，但 nums 变了
```

实测：

```
① sorted 返回: [1, 2, 3] | 和原表是同一个对象吗: False
① sort 返回: None | nums 现在: [1, 2, 3]
```

| | 返回 | 原对象 | 能用在谁身上 |
|---|---|---|---|
| `sorted(x)` | **新列表** | 不动 | 任何可迭代对象 |
| `x.sort()` | **`None`** | 原地改 | 只有 list 有这个方法 |

**为什么 `sort()` 故意返回 `None`**：如果它返回排好的表，就会有 `t = t.sort()` 这种写法——看着像链式操作，实际上把 `t` 绑到了 `None` 上。返回 `None` 逼你分两步写，也就逼你承认"原对象被改了"。这和 Day 10 第一节那条主线是同一件事：`x.sort()` 是改对象，`sorted(x)` 是换绑定。

顺带一条实测：`tuple` **没有** `sort` 方法（`hasattr((), 'sort')` 是 `False`），但 `sorted(())` 能排，返回的是 `list`。不可变对象没有"原地"这个选项。

## 三、稳定性：唯一能被利用的保证

```python
pair = [('张三', 88), ('李四', 95), ('王五', 88), ('赵六', 88)]
sorted(pair, key=lambda t: t[1])
```

```
② 按分数升序: [('张三', 88), ('王五', 88), ('赵六', 88), ('李四', 95)]
```

三个 88 分的相对顺序是**张三→王五→赵六**，和它们在输入里出现的先后**一模一样**。这不是运气，是 Python 明确写进文档的保证：**排序稳定，等键记录保持原始顺序**。这条保证是第八节"排两次"能成立的全部依据。

## 四、多条件与「取负」的本质

想要"分数降序，同分按年龄升序"：

```python
sorted(rows, key=lambda r: (-r['score'], r['age']))
```

```
③ 多条件: [('李四', 95, 19), ('王五', 88, 19), ('张三', 88, 20), ('赵六', 88, 22)]
```

`-r['score']` 做的事是**把"降序"翻译成"升序"**：分数越大，负数越小，升序排就把它推到前面。所以"取负"的本质不是数学运算，是**把方向编码进数值本身**。

这也直接给出了它的适用边界：**只有存在"负"这个概念的类型才能这么干**。字符串没有负号，所以下面这行直接抛：

```python
sorted(rows, key=lambda r: (r['score'], -r['name']))   # 想"分数升、名字降"
```

```
④ TypeError: bad operand type for unary -: 'str'
```

## 五、`reverse=True` 翻的是整个 key 元组

有人会说：那我不写负号，直接 `reverse=True` 不就行了。给同一个 key 加上 `reverse`：

```python
sorted(rows, key=lambda r: (-r['score'], r['age']), reverse=True)
```

```
③ 不加: [('李四', 95, 19), ('王五', 88, 19), ('张三', 88, 20), ('赵六', 88, 22)]
⑤ 加了: [('赵六', 88, 22), ('张三', 88, 20), ('王五', 88, 19), ('李四', 95, 19)]
```

**两个条件一起翻了**：李四从第一个变成最后一个（分数方向翻了），年龄也从 19→20→22 变成 22→20→19（年龄方向也翻了）。

因为 `reverse` 是在**排完之后把整个结果倒过来**，它不知道你元组里第一位是主条件、第二位是次条件。所以：

- 想"分数降、年龄升"→ 用负号：`(-score, age)`
- 想"分数降、年龄也降"→ 用 `reverse=True` 配 `(score, age)`
- 想"分数升、年龄降"→ 用负号：`(score, -age)`

**规则：两个条件里，方向"和主条件相反"的那个才需要取负。**

## 六、`(-score, name)` 为什么不报错

第四节里 `(-r['score'], r['name'])` 这种写法是**完全合法**的，而且真的实现了"分数降、名字升"：

```python
sorted(rows, key=lambda r: (-r['score'], r['name']))
```

```
④ 分数取负、名字不取负: [('李四', 95), ('张三', 88), ('王五', 88), ('赵六', 88)]
```

三个 88 分最后是 张三→王五→赵六（按 Unicode 码位升序），**名字升序确实做到了**。

区别在于负号加在谁身上：`-r['score']` 是数字取负，合法；`-r['name']` 是字符串取负，压根不存在这个运算。元组比较是**逐位**进行的，每一位各自决定自己怎么比，所以"一位降序、一位升序"这种混合方向，本来就不需要整体翻转——**只要需要反向的那一位是数字**。

## 七、`key` 到底什么时候被调用

这是第六节那个报错的定位关键。给 `key` 函数加个计数器：

```python
calls = []
def key(x):
    calls.append(x)
    return -x
sorted([3, 1, 2], key=key)
```

实测：

```
排序前 calls: []
排序后 calls: [3, 1, 2] | 结果: [3, 2, 1] | 调用次数: 3
```

**`key` 是在比较开始之前调用的，按原表顺序，每个元素各调一次。** 这就是官方文档里说的 *装饰 - 排序 - 去装饰*（decorate-sort-undecorate）：先用 key 把每个元素换成一个辅助值，排序只比这些辅助值，排完再取回原元素。

推论：`-r['name']` 那个 `TypeError` 发生在**取负这一步**，不是比较那一步。而且实测它是在**第一个元素**上就抛了——四个名字并没有全试一遍。所以这类错误和"数据量""分布"无关，只要 key 函数本身写错，一个元素就够。

## 八、第二条路：排两次，顺序不能反

混合方向还有另一条不依赖负号的路：**先按次要条件排，再按主要条件排**。

```python
t = sorted(rows, key=lambda r: r['name'])               # 先排次要条件
t = sorted(t, key=lambda r: r['score'], reverse=True)   # 再排主要条件
```

实测两种顺序：

```
⑥ 先名字、后分数降序: [('李四', 95), ('张三', 88), ('王五', 88), ('赵六', 88)]
   反过来（先分数、后名字）: [('张三', 88), ('李四', 95), ('王五', 88), ('赵六', 88)]
```

**顺序反了就全错**：反过来排，95 分的李四被塞到了中间。原因是第二次排序只看名字，而名字互不相同——第一次排出来的分数序被**彻底覆盖**了。

"先次的、后主的"之所以成立，靠的正是第三节的稳定性：第二次排序时，`score` 相同的那几个元素保持第一次排好的相对顺序。**稳定性唯一能被利用起来的地方，就是这里。**

官方文档还给了这条路的通用包装：

```python
def multisort(xs, specs):
    for key, reverse in reversed(specs):          # ← 注意这个 reversed
        xs.sort(key=attrgetter(key), reverse=reverse)
    return xs

multisort(list(students), (('grade', True), ('age', False)))
```

`reversed(specs)` 就是把"先写主条件"的参数顺序倒过来执行，和上面手动两趟是同一件事。实测两者结果一致：

```
M1 multisort:      [('dave', 'B', 10), ('jane', 'B', 12), ('john', 'A', 15)]
M2 手写两次:       [('dave', 'B', 10), ('jane', 'B', 12), ('john', 'A', 15)]
```

## 九、`itemgetter` / `attrgetter` / `partial` 当 key

`key` 要的是**可调用对象**，不一定是 lambda：

```python
from operator import itemgetter, attrgetter
from functools import partial
from unicodedata import normalize

sorted(rows, key=itemgetter('score'))          # 等价于 lambda r: r['score']
sorted(students, key=attrgetter('age'))        # 对象属性版
sorted(names, key=partial(normalize, 'NFD'))   # 冻住第一个参数，只留 x 进来
```

三种写法实测都成立。最后一个值得多说一句：`partial(normalize, 'NFD')` 把 `normalize` 从二元函数降成了一元函数，正好能当 key 用——**这是 `partial` 除了"固定装饰器参数"之外的第二种典型用法**。

`itemgetter` 比 lambda 快，但**快多少这件事别记数字**。同一台机器、同一份数据、各跑十万次，我实测了三次：

```
⑨ itemgetter 0.0279s | lambda 0.0330s | 快 15.4%
⑨ itemgetter 0.0147s | lambda 0.0206s | 快 28.6%
⑨ itemgetter 0.0169s | lambda 0.0250s | 快 32.7%
```

**同一台机器上从 15.4% 到 32.7% 都出现过。** 能依赖的结论只有一句：`itemgetter` 稳定地更快（少一层 Python 函数调用），但百分比是噪声，写进任何文档都是错的。

另外 `itemgetter` 可以一次要多个字段，直接就是多条件：

```python
sorted(students, key=itemgetter(1, 2))     # 先按第 1 位、再按第 2 位
```

实测：`[('john', 'A', 15), ('dave', 'B', 10), ('jane', 'B', 12)]`——`grade` 升序，同 `grade` 的按 `age` 升序。

## 十、`cmp_to_key`：老式比较函数的桥

不是所有排序都能写成"取一个值出来比"。这时候用 `functools.cmp_to_key`，把老式的 `cmp(a, b) → -1/0/1` 适配成 key：

```python
def cmp(a, b):
    if a['score'] != b['score']:
        return b['score'] - a['score']                        # 分数降序
    return (a['name'] > b['name']) - (a['name'] < b['name'])  # 名字升序

sorted(rows, key=functools.cmp_to_key(cmp))
```

```
cmp_to_key 排出来: [('李四', 95), ('张三', 88), ('王五', 88), ('赵六', 88)]
type(cmp_to_key(cmp)) 返回的是: KeyWrapper
```

结果和第五、六节的写法一致。`cmp_to_key` 返回的是一个 **`KeyWrapper`** 对象——它替被包装的元素补上了缺失的 `<`，比较时再回调你写的 `cmp`。

代价是**每个元素都要多包一层对象、每次比较都要调一次 Python 函数**，比 `key=` 慢得多。能用 `key=` 就别用 `cmp_to_key`；它存在的意义是"这个顺序根本写不出 key"。

## 十一、元组里混类型：为什么有时报有时不报

这一条是今天最容易在真实数据上翻车的。两份数据，`'k'` 里都是一个字符串配一个整数：

```python
mix_tie = [{'g': 1, 'k': 'a'}, {'g': 1, 'k': 2}]      # g 相等
mix_no  = [{'g': 1, 'k': 'a'}, {'g': 2, 'k': 2}]      # g 互不相等
sorted(mix_tie, key=lambda r: (r['g'], r['k']))
sorted(mix_no,  key=lambda r: (r['g'], r['k']))
```

实测：

```
⑦ mix_a TypeError: '<' not supported between instances of 'int' and 'str'
⑦ mix_b: [{'g': 1, 'k': 'a'}, {'g': 2, 'k': 2}]        ← 一声不响地排完了
```

**同样的脏数据，一个炸一个不炸。** 因为元组比较是逐位的：`mix_no` 的第一位 1 和 2 已经分出大小，第二位**根本没被拿出来比**；`mix_tie` 第一位相等，才被迫去比 `'a'` 和 `2`，撞上类型错误。

所以这类 bug 会在小样本上完全隐身——测试数据刚好没有重复的主键，就永远不报。数据一多、主键一重复，突然炸在生产的某个凌晨。**能报错至少还是好事，怕的是 `mix_no` 这种：它没错，只是你以后以为它永远不会错。**

## 十二、字典的四种 `sorted`

```python
sc = {'a': 3, 'b': 1, 'c': 2}
```

```
⑧ sorted(dict):                          ['a', 'b', 'c']
⑧ sorted(dict.values()):                 [1, 2, 3]
⑧ sorted(dict.items()):                  [('a', 3), ('b', 1), ('c', 2)]
⑧ sorted(dict, key=lambda k: sc[k]):     ['b', 'c', 'a']
```

- **直接吃字典排的是键**，因为字典被迭代时产出的就是键（`list(sc)` 是 `['a','b','c']`）。
- `sorted(dict.items())` 没写 key，于是按元组第 0 位排，**结果还是按键排**——这行很容易让人以为按值排了。
- 想按键对应的值排，必须显式 `key=lambda k: sc[k]`，拿到的是**键的列表**、按值定序（`['b','c','a']` 对应 1、2、3）。
- 想直接拿到按键值对排好的结果，用最后那种的 items 版：`sorted(sc.items(), key=lambda kv: kv[1])` → `[('b', 1), ('c', 2), ('a', 3)]`。

## 十三、自定义对象：没有 `<` 就不能直接排

```python
class P:
    def __init__(self, n):
        self.n = n

sorted([P(2), P(1)])                              # 炸
sorted([P(2), P(1)], key=lambda p: p.n)           # 不炸
```

```
⑩ 自定义对象直接排 TypeError: '<' not supported between instances of 'P' and 'P'
⑩ 给 key: [1, 2]
```

报错说得很直白：`P` 和 `P` 之间没有定义 `<`。给 `key` 就能排，是因为排序从此比的是 `p.n` 这些**整数**，`P` 对象自己从头到尾没参与过比较——这正是第一节那句话的又一次兑现。

## 十四、力扣 26：写指针，和空数组那个边界

今天顺手做的一道题，和排序无关但和"原地改"有关：**有序数组去重**，返回新长度，要求原地。

```python
class Solution:
    def removeDuplicates(self, nums: List[int]) -> int:
        slow = 0
        for i in range(1, len(nums)):
            if nums[i] != nums[slow]:
                slow += 1
                nums[slow] = nums[i]
        return slow + 1
```

`slow` 指着「已去重区间的最后一个位置」，`i` 往前探。因为数组已排序，相同元素一定相邻，所以只需要和"上一个留下的"比，不用查表。时间 O(n)、空间 O(1)。

实测五组：

```
[1, 1, 2]                 -> k=2  nums=[1, 2, 2]
[0,0,1,1,1,2,2,3,3,4]     -> k=5  nums=[0, 1, 2, 3, 4, 2, 2, 3, 3, 4]
[1]                       -> k=1  nums=[1]
[1, 2, 3]                 -> k=3  nums=[1, 2, 3]
[1, 1, 1]                 -> k=1  nums=[1, 1, 1]
```

注意第二行：**函数返回 5，但 `nums` 本身还是 10 个元素**，只有前 5 位是有效的，后面是残渣。题目的判法就是只看 `nums[:k]`。

**边界**：`nums = []` 时这段代码返回 **1**（正确答案应该是 0）。力扣的约束写了 `1 <= nums.length`，所以判题能过；但这正是面试里会被接着问的那一句——答案是在开头补 `if not nums: return 0`。**"判题能过"和"函数正确"不是一回事。**

## 十五、可带走的问题清单

1. `sorted(x)` 和 `x.sort()` 分别返回什么？哪个改原对象？哪个能用在元组上？
2. `list.sort()` 为什么故意返回 `None`？
3. 同分元素保持原顺序，这叫什么保证？能不能依赖？
4. 多条件排序里，负号起的是什么作用？它的本质是什么？
5. 为什么"分数降、名字升"不需要 `reverse`，而 `(-score, name)` 也合法？
6. `reverse=True` 翻的是第一个条件还是整个结果？
7. `key` 函数是在比较之前还是之后调用的？调用顺序是什么？
8. 对字符串取负抛的 `TypeError`，是在第一个元素上抛还是四个都试一遍？
9. 排两次为什么必须"先次的、后主的"？反过来会怎样？
10. `itemgetter` 比 lambda 快，为什么我不让你记那个百分比？
11. `cmp_to_key` 返回的是什么类型的东西？它补上了哪个方法？代价是什么？
12. 元组 key 里混了不可比类型，为什么有时报有时不报？
13. `sorted(dict)` 排的是键还是值？`sorted(dict.items())` 呢？
14. 自定义对象直接排会抛什么？给 `key` 为什么不抛？
15. LC26 的返回值和新长度之外的数组内容，分别是什么关系？

## 十六、小结

整篇只有一句话：**排序比较的是 `key` 的返回值，不是元素本身。**

- 因为比的是 key，所以 `key` 必须在比较之前就把每个元素的替身算出来（第七节），所以字符串取负的错在第一个元素就炸。
- 因为比的是 key 而不是元素，所以 `reverse` 只能整体倒序、看不见"哪个是主条件"（第五节）。
- 因为比的是 key，同 key 的元素之间**没有胜负**，才需要一个额外规则来安置它们——那就是稳定性（第三节），而稳定性唯一有用的地方就是"排两次"（第八节）。
- 因为比的是 key，所以取负是"把方向编码进数值"，只对数字成立（第四、六节）。

Day 10 和 Day 11 问的是"这次改动落在原对象上，还是只把名字挪走了"。这篇问的是"到底是谁在比大小"。两个问题的共同点是：**Python 里很多看起来在操作 A 的语法，实际在操作从 A 派生出来的 B。**
