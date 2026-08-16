---
title: DeepSeek Harness 插件完全指南：从社区安装到自定义开发
published: 2026-08-16
description: 一份尽量详细的 DeepSeek Harness（DSH）插件使用手册——从"一切皆插件"的架构理念、社区插件市场与一键安装，到 profile / bundle 机制、工具插件、UI 双半区插件、agent preset、skill，再到打包发布与安全须知，覆盖完整闭环。
tags: [DeepSeek Harness, 插件, Agent, 教程, 开源]
category: 技术分享
pinned: false
---

> [!TIP]
> 本文基于 DeepSeek Harness 官方源码仓库（`deepseek-harness`）文档、官方 Web UI 源码、以及社区插件仓库（`dsh-web-ui` 等）的一手资料整理。
> DSH 仍处于 **developer preview** 阶段，接口快速迭代，文中命令与包名请以最新版为准。

---

## 📖 目录

1. DSH 与"一切皆插件"
2. 插件体系速览：六个关键概念
3. 快速开始：安装 DSH 与 Web UI
4. 从社区安装插件
5. 值得一试的社区插件
6. 自定义插件：从零到第一个工具
7. 进阶：UI 双半区插件 / preset / skill / 动态插件
8. 打包、安装与发布
9. 安全须知
10. 参考与延伸阅读

> 页面右侧/悬浮的目录（TOC）会自动生成，点击可跳转。

---

## DSH 与"一切皆插件"

**DeepSeek Harness**（命令名 `dsh`）是 DeepSeek AI 开源的 Agent 运行框架（harness）。它最核心的设计理念只有一句话：

> **Everything is a plugin（一切皆插件）。**

DSH 本身是一个"微内核"：模型路由、Shell 执行、文件系统、工具注册表、会话持久化、Web UI……几乎每一项能力都由插件组合而成，插件之间通过底层 [Cordis](https://github.com/cordiverse/cordis) 插件框架（[设计论文](https://github.com/cordiverse/paper)）的 **Service / 事件 / 依赖注入**机制协作。这意味着：

- 官方交付物本身就是由几十个插件包（`@deepseek-ai/dsh-*`）组合出来的；
- 社区插件和官方插件走**完全相同的机制**，安装、加载、配置没有任何区别待遇；
- 你可以替换任意一层能力（比如换一个 LLM 适配器、换一个 Bash 执行器），而不用改框架源码。

官方仓库：[github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（MIT 协议）。官方在 [README](https://github.com/deepseek-ai/deepseek-harness) 中明确声明当前为 **Developer Preview**，会有破坏性变更，请留意版本。

## 插件体系速览：六个关键概念

要玩转 DSH 插件，先建立六个概念（后面都会用到）：

| 概念 | 一句话解释 | 类比 |
|---|---|---|
| **插件（Plugin）** | 一个导出 `apply(ctx)` 的 JS/TS 模块，通过 `ctx` 注册能力 | 一个"功能模块" |
| **组合包（Bundle）** | 一个附带配置层（`cordis.patch.yml`）的 npm 包，声明 `dsh.bundle` | 一个"可安装的功能包" |
| **Profile** | 位于 `$DSH_HOME/profiles/<名字>` 的组合配置目录，`dsh.profile.bundles` 列出按顺序叠加的 bundle | 一套"装机清单" |
| **Patch 层** | 对插件行的插入 / 覆盖 / 禁用，逐层叠加、后层胜出 | 配置补丁 |
| **Host 半区 / Browser 半区** | 一个双半区插件分别在 Node 宿主进程和浏览器里各跑一半，通过 RPC 通信 | 后端 + 前端 |
| **Agent Preset / Skill** | 前者是"会话级"的插件组合（决定这个 agent 会话有什么工具和 persona），后者是运行时按需加载的指令文档 | 角色卡 / 技能书 |

配置树从空根开始按以下顺序叠加（**后应用的层按行胜出**）：

1. Profile 的 `dsh.profile.bundles` 所列各组合包的 patch（按列表顺序）；
2. Profile 自己的 `cordis.patch.yml`；
3. Home 级 `$DSH_HOME/cordis.patch.yml`（各 profile 共享的机器级偏好）；
4. 启动参数 `--patch <path>` 指定的覆盖层。

## 快速开始：安装 DSH 与 Web UI

### 方式一：npm 安装（推荐）

需要 Node.js（官方建议 Node ≥ 22）。一条命令启动 Web UI：

```sh
npx @deepseek-ai/dsh web
```

也可以全局安装后直接使用 `dsh` 命令：

```sh
npm install -g @deepseek-ai/dsh
dsh web
```

默认在 `http://127.0.0.1:3080` 打开 Web UI。首次使用会自动初始化 `web` profile。

### 方式二：从源码运行

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

> 源码方式对**开发插件**最友好（见第六节），也方便阅读文档和示例。

### 常用命令

```sh
dsh web                          # 启动 Web UI（= dsh --profile web）
dsh --profile <name>             # 启动指定 profile
dsh --profile <name> --dump-config   # 不启动，打印组合后的完整配置树（验证插件是否挂载）
dsh plugin --profile <name> <pnpm args>  # 在 profile 目录内转发给 pnpm，管理插件
```

## 从社区安装插件

### 4.1 最常用的一条命令

DSH 插件的标准安装姿势是 `dsh plugin`（它把参数转发给 profile 目录里的 pnpm，因此所有 pnpm 子命令都可用）：

```sh
# 安装一个 npm 上已发布的插件
dsh plugin --profile web add @linxin666/dsh-web-ui-all

# 卸载
dsh plugin --profile web remove @linxin666/dsh-web-ui-all
```

装完**必须重启 `dsh web`** 才能看到效果。

以 `@linxin666` 这个 scope 为例——它就是社区最有名的 DSH Web UI 插件全家桶（[dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui)，Apache-2.0），一个包装齐任务看板、SSH、右侧面板、皮肤等十几个插件：

```sh
dsh plugin --profile web add @linxin666/dsh-web-ui-all
```

只想用皮肤则装 `@linxin666/dsh-skins`。也可以单独装某个插件：

```sh
dsh plugin --profile web add @linxin666/dsh-client-ui-task-board   # 任务看板
dsh plugin --profile web add @linxin666/dsh-ssh                    # 远程连接（SSH）
dsh plugin --profile web add @linxin666/dsh-tool-describe-image    # 图像理解工具
dsh plugin --profile web add @linxin666/dsh-pet                    # 鲸鱼娘宠物
```

### 4.2 去哪里发现插件

目前 DSH 没有官方中央插件市场，但社区已经形成了几条发现渠道：

| 渠道 | 说明 |
|---|---|
| [awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness) | 社区维护的精选清单（含中文版 README），按类别收录插件、预设、工具 |
| [dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui) | 最大的 Web UI 插件全家桶仓库，`@linxin666` scope 全部发布在 npm |
| [dsh-plugin-hub](https://github.com/Noob-stupid/dsh-plugin-hub) | DSH 插件管理面板 + GitHub dsh-plugin 插件市场，可一键启用/停用插件 |
| [whalehub-dsh](https://github.com/vvlife/whalehub-dsh) | WhaleHub 🐋 DSH 插件市场：发现、搜索、一键安装社区插件 |
| [deepseek-plugin-store](https://github.com/Ericwong5021/deepseek-plugin-store) | 独立社区插件商店，可提交经过验证的插件、工具与扩展 |
| [dshfind](https://dshfind.com) | 面向 DSH 的学习与分享社区，聚合论文精读、插件超市与用户排名 |
| [dsh-community-plugins](https://github.com/HubaKing/dsh-community-plugins) | 把插件市场索引注册为 skill，让每个 DSH 会话自己知道怎么发现/评估/安装社区插件 |
| [dsh-handbook](https://github.com/Electricitysheep/dsh-handbook) | 社区深度手册（安装 / 插件开发 / 性能调优 / 实测案例） |
| GitHub Topic | 在 GitHub 搜 `topic:dsh-plugin`，官方推荐插件作者给自己的仓库打这个 tag |
| GUI 内索引 | 装了 `dsh-web-ui` 后，**设置 → 插件配置 → Web UI 插件 → 社区插件**卡片会列出社区登记过的插件并链接到作者仓库 |

另外 npm 上可以直接搜 `dsh-` 前缀或 `@linxin666` scope，例如 [@dsh-feishu/dsh-feishu](https://www.npmjs.com/package/@dsh-feishu/dsh-feishu)（飞书接入）、[@sugarforever/dsh-mcp-apps](https://www.npmjs.com/package/@sugarforever/dsh-mcp-apps)（MCP 应用集合）等。

### 4.3 从 GitHub / 本地路径 / tarball 安装

不经过 npm 也能装：

```sh
# 从 GitHub 仓库安装（拉取的是源码，需要构建授权，见 8.3）
dsh plugin --profile demo add github:you/hello-plugin

# 本地目录（开发调试最常用）
dsh plugin --profile web add link:/absolute/path/to/hello-plugin
# 或相对路径
dsh plugin --profile demo add ./hello-plugin

# 本地 tarball
dsh plugin --profile demo add ./hello-plugin-0.1.0.tgz
```

### 4.4 GUI 里的插件管理

Web UI 本身也带插件管理界面：

- **设置 → 插件**：官方分区，**插件配置**标签页会为"宿主平面"上注册了配置命名空间的插件（如 Bash 执行器、agent 循环并发度、DeepSeek 搜索提供方）展示可展开的配置卡片，支持保存、放弃、重置为默认值；
- 装 `dsh-web-ui` 后，**设置 → 插件配置** 会多出各功能插件的开关与表单（Web UI 插件组），修改即时生效；
- 皮肤类插件在 **设置 → 皮肤中心** 统一管理（先试穿再应用，`~/.dsh/cordis.patch.yml` 中由 `dsh-skin use` 维护互斥的启用区段）；
- 会话内，agent 自己还能通过 `cordis_*` 工具动态定义/运行插件（见 7.5）。

### 4.5 验证、禁用与卸载

```sh
# 验证插件层已挂载（输出里应能看到对应插件的配置层）
dsh --profile web --dump-config

# 卸载
dsh plugin --profile web remove <package-name>
```

**禁用某个插件行而不卸载**：在任意 patch 层（比如 profile 的 `cordis.patch.yml`）写：

```yaml
- id: <插件行 id>
  disabled: true
```

皮肤管理（`dsh-skin use`）就是这么在 `~/.dsh/cordis.patch.yml` 里维护互斥启用区段的。装了一些插件管理面板（如 dsh-plugin-hub）后，也能在 GUI 里一键启用/停用插件。

常见"装了不生效"的原因：**安装后没有重启 `dsh web`**。另外聚合包子包较多时，profile 的 pnpm 布局问题也会导致 UI 不显示（见 8.4 的注意事项）。

## 值得一试的社区插件

### 5.1 dsh-web-ui 全家桶（@linxin666）

这是目前社区最活跃的 Web UI 插件集，全部插件既可独立安装，也可通过 `dsh-web-ui-all` 聚合包一次装齐：

| 插件 | 功能 |
|---|---|
| **任务看板**（`dsh-client-ui-task-board`） | 侧边栏「任务看板」：待规划/待办/进行中/已完成/已失败五列；任务可由真实 DSH 会话**实际执行**并回写状态；支持 5 段 cron 定时执行（如每天 23:00 自动升级 DSH） |
| **Git 图谱**（`dsh-client-ui-git-graph`） | 输入框上方的分支选择器 + 提交历史可视化，按时间线定位变更 |
| **右侧面板**（`dsh-client-ui-aionui-panel`） | 项目会话右侧出现「预览」与「文件/变更」两块面板：文件树、多格式预览（markdown/html/code/diff/csv/pdf/office/图片）、真实 git stage/unstage/discard、宽度可拖拽 |
| **远程连接**（`dsh-ssh`） | 侧边栏「SSH」入口：主机配置存 `~/.dsh/dsh-ssh.json`（可从 `~/.ssh/config` 导入）；Web 终端、SFTP 上传/下载、本地端口转发隧道、集群并发执行；agent 可直接调用 `ssh_exec` 等 6 个远程工具 |
| **图像理解**（`dsh-tool-describe-image`） | 给纯文本模型加视觉：`describe_image` 工具把图片交给 OpenAI 兼容视觉端点（Qwen-VL / GLM-4V / GPT-4o / Ollama 等），**只有文本进会话**；输入框还会多一个图片按钮 |
| **鲸鱼娘宠物**（`dsh-pet`） | 常驻界面的宠物，跟随 agent 状态切换动画（思考/等待/工作/庆祝），可互动、投喂、成长 |
| **实时令牌统计**（`dsh-live-stats`） | 输入框下方实时显示 TPS、LLM 耗时、上下文占用、缓存命中率、输入/输出 token |
| **移动端远程**（`dsh-remote-web-ui`） | 扫码配对后手机进入独立移动端界面，远程控制当前工作区；令牌一次性且限时 |
| **设置中心**（`dsh-client-ui-web-ui-settings`） | 统一收纳全家桶插件的开关与参数，含「社区插件」索引卡片 |
| **皮肤中心**（`dsh-skins` + `dsh-client-ui-skin-center`） | 10 款皮肤（Windows XP、Blue Fantasy、鲸吟、夕港、Miku、MC、QQ98 等），全部支持先试穿再应用 |
| **梁神模式**（`dsh-liangshen`） | 一个 agent preset 插件：两阶段锚定模式，启动时把预设同步到 `~/.dsh/.agent-presets/liangshen`，新建会话可选「梁神模式」 |

### 5.2 其他社区插件与预设

- [dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI)：Claude Code 风格全屏交互终端插件（像素鲸鱼顶栏、思考流式展开、双击 Esc 回滚、TPS 仪表）；
- [天书 TUI](https://github.com/huiliyi37/dsh-tianshu-tui)：交互式终端 UI，内置 TDD 与"证据门"等工作流；
- [Data Agent](https://github.com/omdsh-dev/dsh-data-agent)：专用 Data Agent 预设，让 AI 帮你查询、更新、分析数据；
- [Chat Summary](https://github.com/v833/dsh-chat-summary)：总结对话并导出 Markdown / DOCX / PDF；
- [Pilot 浏览器驾驶舱](https://github.com/guo6x/dsh-pilot)：零依赖 CDP 浏览器操控（8 个 `pilot_*` 工具 + 可拖拽驾驶舱面板）；
- [Built-in Capability Inspector](https://github.com/Starfie1d1272/dsh-builtin-toggles)：内置能力检查器，可 fail-closed 关闭 9 个内置 UI 能力；
- [Superpowers for DSH](https://github.com/LayneChai/superpowers-dsh)：把 obra/superpowers 的 TDD、调试、规划等技能适配到 DSH；
- [Agent Teams](https://github.com/Nanmicoder/dsh-agent-teams)：Agent 团队编排插件；
- [dsh-plugin-cc](https://github.com/cpj-dev/dsh-plugin-cc)：桥接 Claude Code 的插件；
- [dsh-doctor](https://github.com/coppynight/dsh-doctor)：flutter-doctor 风格的环境诊断修复插件；
- [dsh-naiwa-theme](https://github.com/DevourerM/dsh-naiwa-theme)：奶蛙主题皮肤；
- [dsh-feishu](https://www.npmjs.com/package/@dsh-feishu/dsh-feishu)、[@sugarforever/dsh-mcp-apps](https://www.npmjs.com/package/@sugarforever/dsh-mcp-apps)：飞书接入、MCP 应用集合；
- [DeepSeek Harness Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop)：桌面端外壳。

### 5.3 官方自带的 agent preset

DSH 官方随包自带 4 个 agent preset（位于 `apps/cli/config/agent-presets/`），新建会话时可在预设选择器中切换：

- `standard`：完整编码 agent（默认，bash/pwsh + 文件系统 + 全套工具）；
- `code`：Code Mode（单一 `run_code` 工具，走完整工具注册表）；
- `cordis`：面向 Cordis 插件开发的预设（在 `standard` 之上加了自省与动态插件工具集 `cordis_*`、组合编写 skill，以及"编辑属于哪个平面"的 persona）；
- `minimal`：最小化工具面（持久 bash + str_replace_editor 两个工具）。

梁神模式这类社区 preset 安装后出现在预设选择器中，与官方预设并列。

---

## 自定义插件：从零到第一个工具

### 6.1 环境准备

开发插件推荐从**源码 checkout** 开始（官方教程也以此为准）：

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
```

然后在仓库根目录建一个临时项目，用 `--patch` 覆盖层把本地插件插入 Web UI：

```sh
mkdir -p scratch-plugin/src
```

### 6.2 第一个插件：hello-plugin

在 DSH 里，**插件就是导出 `apply` 函数的模块**。框架加载时调用 `apply` 并传入 `ctx`（上下文对象），你通过 `ctx` 注册能力。创建 `scratch-plugin/src/my-plugin.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello-plugin'

export function apply(ctx: Context) {
  // 必需的依赖在 apply 执行前就已就绪
  console.log('[hello-plugin] plugin loaded!')
}
```

创建 `scratch-plugin/cordis.yml` 把它插入插件行（路径必须是绝对路径）：

```yaml
- insert:
    - id: hello
      name: '/absolute/path/to/deepseek-harness/scratch-plugin/src/my-plugin.ts'
```

启动：

```sh
pnpm dsh web --patch ./scratch-plugin/cordis.yml
```

打开 `http://127.0.0.1:3080`，终端会打印 `[hello-plugin] plugin loaded!`——第一个插件就跑起来了。

**自动清理**：通过 `ctx` 注册的任何东西（事件监听、工具、定时器）在插件卸载时都会被自动撤销。需要手动管理的资源用 `ctx.effect()` 声明清理函数：

```ts
import type { Context } from '@deepseek-ai/cordis'

export function apply(ctx: Context) {
  ctx.effect(() => {
    const timer = setInterval(() => console.log('heartbeat'), 5000)
    return () => clearInterval(timer)   // 卸载时执行
  })
}
```

### 6.3 开发一个工具插件

把 `my-plugin.ts` 换成下面内容，给 Web UI 加一个 `greet` 工具：

```ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'greet-tool'
export const inject = ['tools']          // 声明依赖：等待工具注册表就绪

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet someone by name.',
    parameters: {
      name: { type: 'string', required: true, description: 'The name to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  }))
}
```

`defineTool` 会从 `parameters` 推导并校验 `args` 类型；`execute` 返回 `output.schema` 声明的规范值，`output.render` 再把它转成给模型看的内容。重启后在会话里输入 `Use the greet tool to greet Ada.`，模型就会调用 `greet` 并得到 `Hello, Ada!`。

### 6.4 让插件接受配置

插件通过导出 `Config` 类型 + 同名的 Schemastery schema 来声明配置（默认值直接写在 schema 里）：

```ts
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'my-plugin'

export interface Config {
  greeting: string
  maxRetries: number
  verbose?: boolean
}

export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('Hello'),
  maxRetries: Schema.number().default(3),
  verbose: Schema.boolean().default(false),
})

export function apply(ctx: Context, config: Config) {
  console.log(config.greeting)   // 用户传入的值或 schema 默认值
}
```

在 `cordis.yml` 里配置：

```yaml
- insert:
    - id: hello
      name: './src/my-plugin.ts'
      config:
        greeting: 'Hi there'
        maxRetries: 5
```

配置不合法时插件会加载失败并给出明确错误。修改配置会触发热替换（卸载旧实例 → 加载新实例），注册自动清理，不会残留。

> 设计约定：**凡是不同部署可能取不同值的参数，都必须做成配置字段**（如 `timeoutMs`），检验标准是"能不能在 `cordis.yml` 里改掉而不动代码"。

### 6.5 生命周期与依赖注入

每个插件都有一个 Fiber 生命周期状态机：

```
PENDING → LOADING → ACTIVE
                 ↘ FAILED
ACTIVE → UNLOADING → DISPOSED
```

| 状态 | 含义 |
|---|---|
| PENDING | 已声明，依赖未就绪 |
| LOADING | 依赖就绪，正在执行 `apply` |
| ACTIVE | 插件运行中 |
| FAILED | `apply` 抛异常 |
| UNLOADING / DISPOSED | 正在/已完全卸载 |

要点：

- **`inject` 声明依赖**：`export const inject = ['tools', 'llm']`，框架保证这些服务就绪后才执行 `apply`；依赖的服务消失（如提供方被替换）时插件会被自动卸载、恢复后重新加载；
- **嵌套上下文**：`ctx.plugin(childPlugin)` 创建子 Fiber，随父插件一起卸载；
- **提前终止**：`await fiber.dispose()`，保证所有注册被移除、子插件递归卸载、异步清理完成后才 resolve；
- **HMR**：开发时修改插件源文件会自动热替换（`cordis-plugin-hmr`），不需要手动重启。

### 6.6 事件系统

服务之间通过**类型化事件**通信，有四种分发模式：

| 模式 | 是否 await | 分发顺序 | 有返回值 |
|---|---|---|---|
| `emit` | 否 | 按注册顺序观察 | 否 |
| `waterfall` | 否 | 按注册顺序观察 | 是（可包装/短路） |
| `parallel` | 是 | 所有监听器并行 | 否 |
| `serial` | 是 | 按注册顺序观察 | 是 |

典型例子——**权限门禁钩子插件**（拦截工具调用并决策放行/拒绝）：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'

declare function isAllowed(exec: ToolExecution): Promise<boolean>

export const name = 'permission-gate'

export function apply(ctx: Context) {
  ctx.on('tools/pre-execute', async (exec, next): Promise<PreToolDecision> => {
    if (!(await isAllowed(exec))) {
      return { kind: 'deny', reason: 'Denied by policy.' }
    }
    return next()
  })
}
```

这是 waterfall 中间件：`next()` 执行下游监听器，不调用 `next()` 直接返回就是短路（策略监听器拥有最终决策权）。沙箱、权限、plan-mode 插件都挂在这种扩展点上。

### 6.7 能力三角色：Service Definition / Provider / Consumer

当一项能力足够通用、需要可替换的提供方时（比如 Bash 执行），官方建议拆成三个角色：

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  dsh-shell   │────▶│  dsh-bash-local  │     │ dsh-tool-bash│
│(definition) │     │    (provider)     │     │(consumer/tool)│
└─────────────┘     └──────────────────┘     └──────────────┘
       ▲                                            │
       └────────────────────────────────────────────┘
                    inject: ['shell']
```

- **Service Definition**：定义 Cordis 服务（`Service` 子类 + Request/Result 类型）；
- **Service Provider**：实现该服务（如本地执行、远程执行、沙箱执行）；
- **Consumer**：把能力暴露为模型可调用的工具。

好处：换提供方只需在 `cordis.yml` 里换一行插件，Definition 和 Consumer 完全不动；三方只依赖 Definition，Provider 与 Consumer 互不依赖。**不要预防性拆分**——简单工具插件一个包就够。

### 6.8 工具参考速查

- 完整工具编写参考见官方 [adding-a-tool](https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/cookbook/adding-a-tool.md)：嵌套 schema、规范值、后台工作、策略钩子、Code Mode、UI 卡片；
- `ctx.tools.register()` 也接受原生 JSON Schema `ToolDefinition`（MCP 来源的工具就是这样到达的）；
- 常用扩展点：`tools/pre-execute`（决策门禁）、`tools/execute`（包裹分发：超时/重试/指标）、`tools/post-execute`（结果变换）、`tools/result`（对不可变结果的受限观察）、`ctx.tools.restrict()`（作用域化工具过滤）。

## 进阶：UI 双半区插件 / preset / skill / 动态插件

### 7.1 双半区插件（Host + Browser）

社区里绝大多数"Web UI 插件"都是**双半区**的：同一个 npm 包，Node 半区跑在宿主进程里，浏览器半区跑在 Web GUI 里。

- **Host 半区**：导出插件入口（`exports["."]`），可以做系统提示词注入、注册 agent 工具、提供 HTTP 路由、真实任务执行等；
- **Browser 半区**：在 `package.json` 里声明 `dsh.client`（`platform: "web"`、`inject` 依赖、可选 `immediately`），并导出 `exports["./client"]` 指向构建好的 bundle；DSH 的 client-modules 系统会扫描这类包，把它挂到 `/plugins/<id>/client.js`，并在页面 `<head>` 注入 `window.__DSH_BOOT__` 启动图；
- 浏览器半区通过注入 `@deepseek-ai/dsh-client-runtime` 等客户端服务与宿主通信，UI 通过 **slots（槽位）** 挂进侧边栏、设置页等位置（如 `settings.plugin.item` 槽注册设置卡片）。

`cordis.patch.yml` 只需要一行 insert（按包名引用，Node 才能解析到已安装的代码）：

```yaml
- insert:
    - id: ui-task-board
      name: '@linxin666/dsh-client-ui-task-board'
```

package.json 的关键声明（以社区 `dsh-ssh` 为模板）：

```json
{
  "name": "@linxin666/dsh-ssh",
  "main": "lib/index.js",
  "exports": {
    ".": "./lib/index.js",
    "./client": "./lib/client.js"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "inject": ["@deepseek-ai/dsh-client-runtime", "@deepseek-ai/dsh-client-connection", "@deepseek-ai/dsh-client-ui-settings"],
      "platform": "web"
    }
  }
}
```

> 开发调试双半区插件时，用 `dsh plugin --profile web add link:/path/to/package` 把本地包链进 profile，改完代码重新 build 后重启 `dsh web` 即可。

### 7.2 自定义 agent preset

**Agent Preset** 是一个目录，里面放一份 `agent.cordis.yml`（会话级插件组合）。挂载后，这个会话拥有自己的工具集与 persona，且**每个会话互相隔离**——同一个进程可以同时跑几个组成不同的 agent。官方随包预设位于 `apps/cli/config/agent-presets/`（standard / code / cordis / minimal）；用户预设放在 `~/.dsh/.agent-presets/<名字>/`，社区插件（如梁神模式）会在宿主启动时把预设同步进这个目录。

一份最小 preset（`preset.yml` 提供名字/描述/排序，`agent.cordis.yml` 定义组合）：

```yaml
# preset.yml
name: 我的模式
description: 自定义预设
order: 5
```

```yaml
# agent.cordis.yml —— 会话级插件行
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    text: >-
      You are a coding agent powered by the {{model}} model.
      Your working directory is {{cwd}}.

- id: tool-bash
  name: '@deepseek-ai/dsh-tool-bash'
  disabled: !!js process.platform === 'win32'

- id: tool-pwsh
  name: '@deepseek-ai/dsh-tool-pwsh'
  disabled: !!js process.platform !== 'win32'
```

注意：preset 行不能注册进程级全局服务（会被挂载校验拒绝）；跨会话的注册表、沙箱、审批、持久化都留在宿主组合里。

### 7.3 Skill（技能）

Skill 是"可选的指令"，agent 按需通过 `skill` 工具加载。本地发现按 rank 顺序扫描这些根目录：

| Rank | 来源 | 目录 |
|---|---|---|
| 100 | 项目级 | `<项目根>/.dsh/skills` |
| 200 | 项目级（agents 约定） | `<项目根>/.agents/skills` |
| 300 | 自定义 | `Config.customSkillDirs` |
| 400 | 用户级 | `~/.dsh/skills` |
| 500 | 用户级（agents 约定） | `~/.agents/skills` |
| 600 | 随包 | 部署方配置的 bundled 目录 |

写一个 skill 就是放一个 Markdown 指令文件（含 frontmatter），例如 `~/.dsh/skills/my-skill/SKILL.md`。社区已有把插件市场索引做成 skill 的例子（[dsh-community-plugins](https://github.com/HubaKing/dsh-community-plugins)），让会话天然"知道"怎么发现和安装社区插件。

### 7.4 Hooks / 记忆 / 定时任务等扩展点

官方扩展手册（extension-cookbook）给出功能→机制的映射，摘录几条常用映射：

| 想要的功能 | 挂到哪个插件机制 |
|---|---|
| 钩子系统（用户级/项目级） | `agent/session-start`、`agent/pre-step`、`agent/request`、`tools/pre-execute`、`tools/post-execute` |
| 系统提示词可配置 | `ctx.systemPrompt.section()`（支持排序与作用域覆盖） |
| AGENTS.md / 子目录指令 | 读取文件的 section 提供方；文件变更时 `agent.inject()` |
| MCP 接入 | 每个服务器一个插件，发现工具 → `ctx.tools.register()` |
| 记忆 | section 提供方 + 工具 |
| 定时任务（cron） | 插件注册面向模型的调度工具；定时触发 → 空闲时 `followup()` / 忙碌时 `inject()` |
| UI / CLI 输出 | 监听 `session/event`；输入 → `followup()` |
| 遥测 / 可回放 trace | `session/event` → JSONL；回放 = `sessions.create(id, { seed })` |
| 模型适配器 | `ctx.llm.registerAdapter` 注册 `LlmAdapter` 子类（如 `dsh-llm-deepseek`） |

### 7.5 让 agent 自己写插件：动态插件（cordis_* 工具）

这是 DSH 最"自指"的特性：**模型可以通过 `cordis_*` 工具在自己的运行时里动态定义并运行插件**，无需改任何文件：

| 工具 | 作用 |
|---|---|
| `cordis_inspect` | 只读自省：当前进程的服务、活插件 fiber、已注册工具、本会话的动态包、API/事件/client 槽位契约 |
| `cordis_define` | 记录一个包（名字 + 用途 + host 半区代码和/或 browser 半区代码），先做语法检查，不运行；会话里出现一张卡片 |
| `cordis_run` | 在 vm 沙箱里求值 host 半区，并把 browser 半区投递到所有打开的页面 |
| `cordis_stop` | 停掉运行中的包（定义保留，可再次运行） |
| `cordis_undefine` | 停止并遗忘定义（会话里卡片保留为"未加载"记录） |

动态包**只活在 DSH 进程内存里**：不创建文件、不装包、不改 `cordis.yml`，重启即消失。要保留实验成果，让 agent 走常规开发流程做成正式插件。

> **信任说明**：动态插件的 vm 沙箱隔离了全局对象，但**不是安全边界**（宿主域辅助函数理论上可以逃逸）。官方明确说"像对待 bash 工具一样谨慎地加载这个工具集"。

---

## 打包、安装与发布

### 8.1 Bundle 与 Profile 的概念

- **组合包（Bundle）**：一个声明了 `dsh.bundle.patch` 的 npm 包，patch 文件回答"这个包贡献什么插件行"；
- **Profile**：`$DSH_HOME/profiles/<名字>/` 目录，`package.json` 里 `dsh.profile.bundles` 有序列出组合包，`cordis.patch.yml` 存用户自己的 patch 层。

一个最小 bundle 的目录结构：

```
hello-plugin/
├── package.json       # 声明 dsh.bundle
├── cordis.patch.yml   # 该 bundle 贡献的插件行
└── index.js           # 插件模块
```

`package.json`：

```json
{
  "name": "dsh-hello-plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "files": ["index.js", "cordis.patch.yml"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

`cordis.patch.yml`（注意：按**包名**而不是源码相对路径引用，Node 才能解析）：

```yaml
- insert:
    - id: hello
      name: dsh-hello-plugin
```

### 8.2 安装进 profile

```sh
dsh plugin --profile demo add ./hello-plugin
```

首次使用会自动初始化 profile（`@deepseek-ai/dsh-base` 作为第一个组合包），pnpm 链接该目录，`dsh` 检测到 `dsh.bundle` 声明后把它追加进 `dsh.profile.bundles`：

```json
{
  "name": "dsh-profile-demo",
  "private": true,
  "dependencies": { "dsh-hello-plugin": "link:/path/to/hello-plugin" },
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "dsh-hello-plugin"] } }
}
```

验证并启动：

```sh
dsh --profile demo --dump-config   # 应看到 "# == dsh-hello-plugin" 配置层
dsh --profile demo
```

`remove` 会同时移除依赖和对应层。

### 8.3 从 GitHub 安装的"构建授权"这道坎

`dsh plugin add github:you/hello-plugin` 拉取的是**源码而不是构建产物**：没有任何环节运行 `build` 脚本，TypeScript 包到手时没有 `lib/` 输出会加载失败。需要两边配合：

- **作者**提供 `prepare` 脚本（pnpm 在 git 安装后运行它，从源码构建发布入口，且必须自包含）；
- **用户**为构建授权：pnpm ≥ 10 在显式允许前拒绝运行 git 依赖的 `prepare` 脚本。第一次 `add` 会失败并提示修法——把 pnpm 打印的确切包键加进该 profile 的 `pnpm-workspace.yaml`：

```yaml
allowBuilds:
  dsh-hello-plugin: true
```

然后重新 `add`。

> **请如实看待这项授权**：它允许该包代码**在安装时于你的机器上执行**，且不在 agent 的沙箱之内。只对源码可信的包授权，并锁定 commit（`github:you/hello-plugin#<sha>`）。

不想让用户授权构建，就分发构建产物：发布到 npm（`pnpm publish` 时构建好 `lib/`），或交付 tarball（`pnpm pack`）。

### 8.4 发布到 npm（社区实践）

社区插件（以 `@linxin666` 全家桶为例）的发布要点：

1. **用 `pnpm publish` 而不是 `npm publish`**——`pnpm pack` 会把聚合包里的 `workspace:*` 依赖改写为真实版本号，`npm pack` 不会；
2. `files` 字段必须包含 `cordis.patch.yml`（缺失会导致装不上）和构建产物 `lib/`；
3. 发布前移除 `private: true`（npm 拒绝发布 private 包）；
4. 补全 LICENSE 文件；按依赖顺序发布（功能包 → 皮肤包 → 聚合包）；
5. `dsh.client` 声明（platform/inject/exports["./client"]）要与 npm 版 `dsh-client-modules` 的消费逻辑逐字段吻合；
6. 发布前用 `pnpm pack --dry-run` 复核 tarball 内容。

### 8.5 让插件被发现：社区登记

- 给自己的仓库打 GitHub topic：**`dsh-plugin`**（官方 README 推荐，便于检索）；
- 在 `dsh-web-ui` 的 `community.json` 登记条目（`id` / `name` / `author` / `repo` 必填），维护者审核合并后，条目会出现在 GUI 的「社区插件」卡片中；
- 把插件写进 [awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness) 清单。

---

## 安全须知

1. **构建授权是真实的代码执行**：`allowBuilds` 放行的是"安装时在你机器上跑脚本"，不在任何沙箱内。只对可信源码放行，并锁定 commit。
2. **插件没有签名校验**：社区安全讨论（GitHub Discussions #587 等）指出，目前 DSH 插件加载不做签名/完整性校验，安装即可能写入配置——安装前请先看包的 `build`/`prepare` 脚本、检查来源仓库可信度，再决定是否放行。
3. **动态插件沙箱不是安全边界**：`cordis_*` 的 vm 沙箱用于隔离诚实代码，宿主域辅助函数理论上可逃逸——把它当 bash 权限一样对待。
4. **权限体系要会用**：DSH 的审批（approval）、文件沙箱（workspace-write / danger-full-access 等权限预设）是内置防线；安装第三方插件后，注意它在设置里申请的权限预设，警惕随意授予 `danger-full-access`。
5. **敏感信息**：密码/Token 不要写进 `cordis.yml` 或插件配置（有 credentials 领域和 secret 角色字段专门管理）；SSH 插件等把密码明文存在 `~/.dsh/dsh-ssh.json`（0600 权限），注意保护。
6. **升级谨慎**：DSH 处于 preview，插件与 SDK 版本需匹配（如 `@deepseek-ai/*` 核心 SDK 包与插件包的 `peerDependencies`）；pnpm 11 的 `minimumReleaseAge` 门禁可能静默装回旧版插件，必要时在 `pnpm-workspace.yaml` 里 `minimumReleaseAgeExclude` 排除插件 scope。

> 社区也在做安全侧的配套：有第三方审计报告（GitHub Discussions #454）、PoC 合集（[zzszmyf/dsh-security-pocs](https://github.com/zzszmyf/dsh-security-pocs)）、以及 dsh-plugin-audit 这类插件"安检门"工具。装任何第三方插件前，花一分钟看它的 `build`/`prepare` 脚本和 star/维护情况，是成本最低的防线。

---

## 参考与延伸阅读

- 官方仓库：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（含 [中文 README](https://github.com/deepseek-ai/deepseek-harness/blob/main/README.zh.md)）
- 官方开发文档（中文）：`docs/user/develop/`（第一个插件 → 工具 → 配置 → 打包发布 → 生命周期 → 能力三角色），以及 `docs/cookbook/`（工具参考、扩展手册）、`docs/cordis-tutorial/`（Cordis 框架教程）
- 社区全家桶：[dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui)（`@linxin666` scope，npm 可装）
- 插件市场与索引：[dsh-plugin-hub](https://github.com/Noob-stupid/dsh-plugin-hub) · [whalehub-dsh](https://github.com/vvlife/whalehub-dsh) · [deepseek-plugin-store](https://github.com/Ericwong5021/deepseek-plugin-store) · [dshfind](https://dshfind.com) · [dsh-community-plugins](https://github.com/HubaKing/dsh-community-plugins)
- 精选清单：[awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness)
- 深度手册：[dsh-handbook](https://github.com/Electricitysheep/dsh-handbook)
- 入门教程：[runoob 安装教程](https://www.runoob.com/deepseek-harness/deepseek-harness-install.html) · [runoob 发布插件教程](https://www.runoob.com/deepseek-harness/deepseek-harness-publish.html)（npm / GitHub / tarball 三种分发）
- 社区教程：《[DeepSeek Harness 一切皆插件：开源Agent框架强在哪，怎么装](https://developer.aliyun.com/article/1755970)》（阿里云开发者社区）· [DeepSeek Harness: Everything-is-a-Plugin Developer Preview](https://www.sitepoint.com/deepseek-harness-developer-preview/)（SitePoint）
- 官方安全讨论：[#587 插件配置写权限与无签名校验](https://github.com/deepseek-ai/deepseek-harness/discussions/587) · [#454 第三方插件安全审计](https://github.com/deepseek-ai/deepseek-harness/discussions/454) · [#451 沙箱逃逸与本地 RPC](https://github.com/deepseek-ai/deepseek-harness/discussions/451) · [#250 Web 审批回环](https://github.com/deepseek-ai/deepseek-harness/discussions/250) · [PoC 合集 zzszmyf/dsh-security-pocs](https://github.com/zzszmyf/dsh-security-pocs)

---

> [!TIP]
> **一句话总结**：DSH 插件 = 导出 `apply(ctx)` 的模块 + 一份 `cordis.patch.yml` 插件行 + 一个声明 `dsh.bundle` 的 npm 包。安装用 `dsh plugin --profile web add <包名>`，开发从 `--patch` 覆盖层开始，发布走 `pnpm publish`。剩下的，就是顺着 [官方文档](https://github.com/deepseek-ai/deepseek-harness/tree/main/docs/user/develop) 和社区示例，把想法变成插件。

