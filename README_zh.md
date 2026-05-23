<div align="center">

# FreeLLMAPI

**一个兼容 OpenAI 的 API 端点。聚合 11 个免费 LLM 提供商。每月约有超过 10 亿+ 免费 Token 可供使用。**

本代理将来自 Google、Groq、Cerebras、SambaNova、NVIDIA、Mistral、OpenRouter、GitHub Models、Cohere、Cloudflare 以及智谱 AI (Z.ai) 的免费 API 额度，统一聚合在单个 `/v1/chat/completions` 端点后。所有接入的 API 密钥均在 SQLite 数据库中通过 AES-256-GCM 强加密存储。智能路由器会根据配置为每次请求选择最佳模型，当某个提供商被限流（Rate Limited）时自动切换至下一个模型，并精确追踪各个密钥的消耗额度，确保您不会超出每个免费层级的限制。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#贡献指南)

简体中文 | [English](./README.md)

> [!NOTE]
> 本仓库 Fork 自上游项目 [tashfeenahmed/freellmapi](https://github.com/tashfeenahmed/freellmapi)。
> 我们在本分支中新增并优化了以下核心功能，以提升安全性和日常使用体验：
> - **全量汉化与多语言 (i18n)**：集成了多语言翻译词典，并在顶部导航栏增加了语言切换下拉框，支持在中文（默认）与英文之间快速无缝切换。
> - **管理员登录认证增强**：将原版的单一密码登录升级为更安全的 **“用户名 + 密码”** 登录校验（可在 `.env` 中通过 `ADMIN_USERNAME` 与 `ADMIN_PASSWORD` 灵活配置）。
> - **全平台自适应响应式 UI**：全面重构了控制台界面，添加了移动端汉表菜单，优化了输入表单与数据表格在窄屏/手机上的展示，确保移动端访问体验顺畅美观。
> - **完善的双语文档支持**：添加了完整的中文本地化自述文档 (`README_zh.md`) 以及双语导航切换。

![故障转移链与每提供商 Token 预算](repo-assets/fallback-chain.png)

</div>

---

## 目录

- [为什么需要这个项目](#为什么需要这个项目)
- [支持的提供商](#支持的提供商)
- [核心功能特性](#核心功能特性)
- [暂不支持的功能](#暂不支持的功能)
- [快速开始](#快速开始)
- [使用 API 接口](#使用-api-接口)
- [后台管理截图](#后台管理截图)
- [工作原理简介](#工作原理简介)
- [局限性与风险](#局限性与风险)
- [贡献指南](#贡献指南)
- [服务条款 (ToS) 审查报告](#服务条款-tos-审查报告)
- [免责声明](#免责声明)

---

## 为什么需要这个项目

目前各大 AI 实验室都提供了极其慷慨的免费层级服务——每个月提供数百万甚至数千万 Token，每天数千次免费请求。对于单个用户或单一应用，每个额度或许有些捉襟见肘，但如果将它们**聚合在一起**，总容量将可达到每月约 **13 亿 Token**，覆盖从小巧极速到大参数强推理的几十款前沿模型。

然而，手动接入这么多提供商极其繁琐：数十套不同的 SDK、不同的频率控制策略、以及不稳定的请求失败率。FreeLLMAPI 将它们融为单个兼容 OpenAI 的标准接口。只需将任何 OpenAI 兼容客户端的 Base URL 指向您的本地代理服务，路由器便会根据您配置好的 API 密钥自动、透明地调度路由。

## 支持的提供商

<table>
<tr>
<td align="center" width="180"><a href="https://ai.google.dev"><b>Google Gemini</b><br/>Gemini 2.5 Flash · 3.x previews</a></td>
<td align="center" width="180"><a href="https://groq.com"><b>Groq</b><br/>Llama 3.3, Llama 4, GPT-OSS, Qwen3</a></td>
<td align="center" width="180"><a href="https://cerebras.ai"><b>Cerebras</b><br/>Qwen3 235B (超极速)</a></td>
<td align="center" width="180"><a href="https://cloud.sambanova.ai"><b>SambaNova</b><br/>DeepSeek V3.x · Llama 4 · Gemma 3</a></td>
</tr>
<tr>
<td align="center"><a href="https://mistral.ai"><b>Mistral</b><br/>Large 3 · Medium 3.5 · Codestral · Devstral</a></td>
<td align="center"><a href="https://openrouter.ai"><b>OpenRouter</b><br/>21 款免费层级模型</a></td>
<td align="center"><a href="https://github.com/marketplace/models"><b>GitHub Models</b><br/>GPT-4.1 · GPT-4o</a></td>
<td align="center"><a href="https://developers.cloudflare.com/workers-ai"><b>Cloudflare</b><br/>Kimi K2 · GLM-4.7 · GPT-OSS · Granite 4</a></td>
</tr>
<tr>
<td align="center"><a href="https://cohere.com"><b>Cohere</b><br/>Command R+ · Command-A (测试版)</a></td>
<td align="center"><a href="https://docs.z.ai"><b>Z.ai (智谱 AI)</b><br/>GLM-4.5 · GLM-4.7 Flash</a></td>
<td align="center"><a href="https://build.nvidia.com"><b>NVIDIA NIM</b><br/>（默认在目录中禁用）</a></td>
<td align="center"><i>想要添加更多？请参阅 <a href="#贡献指南">贡献指南</a>。</i></td>
</tr>
</table>

## 核心功能特性

- **完全兼容 OpenAI** — 完美支持 `/v1/chat/completions` 和 `/v1/models`，可无缝对接任何 OpenAI SDK（包括 Python、Node.js SDK 等）以及各类开发工具（如 LangChain、LlamaIndex、Continue、Hermes、Dify 等）。只需更改 `base_url` 即可接入。
- **流式 (Streaming) 与非流式传输** — 对 `stream: true` 提供了完善的 Server-Sent Events (SSE) 协议支持。
- **函数/工具调用 (Tool Calling)** — 原生透传 OpenAI 样式的 `tools` 与 `tool_choice` 参数。代理会在多轮对话中透明处理工具链的回传与路由调度。
- **自动故障转移 (Automatic Fallover)** — 若被调度的提供商返回 429、5xx 错误或请求超时，路由器将自动跳过它并将其加入短暂的冷却队列，随后自动在您的故障转移链（Fallback Chain）中向下尝试其余模型（最高可重试 20 次）。
- **按密钥频率追踪** — 精确记录每个 `(platform, model, key)` 的分钟请求数 (RPM)、天请求数 (RPD) 以及 Token 消耗，确保请求在触发额度限制前被平滑路由。
- **粘性会话 (Sticky Sessions)** — 多轮对话将在 30 分钟内尽量锁定在同一模型，避免中途频繁切换模型造成的上下文语境丢失或幻觉上升。
- **密钥安全存储** — 所有上游 API 密钥在存入 SQLite 数据库前，都使用 AES-256-GCM 进行信封加密；解密过程仅发生于请求发送前的纯内存环境中。
- **统一 API 密钥** — 客户端只需配置一个系统生成的 `freellmapi-…` 统一 API 密钥，您的各类业务系统无需暴露或保存任何真实的源站平台密钥。
- **定期健康检查 (Health Checks)** — 自动探针对所有密钥进行健康状态更新（健康、被限流、失效、请求错误等），自动把失效的密钥踢出路由池。
- **管理后台 (Admin Dashboard)** — 提供基于 React + Vite 的控制台界面。支持密钥管理、拖拽排序故障转移链、数据统计分析、以及支持中文/英文切换的 Playground。
- **全量多语言 (i18n) 支持** — 支持中文（默认）与英文快速切换，方便在不同语言环境下使用管理控制台。
- **极低的运行消耗** — 适用于任何 Node.js 20+ 环境，包括服务器、本地 PC、树莓派等。闲置时内存消耗仅约 40MB 左右。

## 暂不支持的功能

由于项目定位为轻量级代理路由器，因此以下功能目前暂未实现（欢迎贡献 PR）：

- **文本嵌入** (`/v1/embeddings`)
- **图像生成** (`/v1/images/*`)
- **语音/音频** (`/v1/audio/*`)
- **多模态/视觉输入**（目前请求正文仅限纯文本）
- **旧版 Completions 接口** (`/v1/completions`）
- **多租户计费 / 分用户鉴权**（本系统为单用户本地优先设计）

---

## 快速开始

**系统要求：** Node.js 20+，npm 包管理器。

### 1. 克隆并安装依赖

```bash
git clone https://github.com/ChaunceyXCX/freellmapi.git
cd freellmapi
npm install
```

### 2. 初始化环境配置与加密密钥

```bash
# 复制示例配置文件
cp .env.example .env

# 为数据库生成随机的加密解密 Key
echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
```

### 3. 配置管理后台用户名与密码

在 `.env` 中填入您想要设置的管理员账户名和密码（若不填，密码默认将退回到生成的统一 API 密钥）：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

### 4. 启动开发模式

```bash
npm run dev
```

启动后，访问浏览器 **http://localhost:5173** 打开管理面板控制台。
在 **密钥 (Keys)** 页面添加对应的服务提供商 Key，在 **故障转移 (Fallback)** 页面拖拽规划您的模型优先级，并在 Keys 页面顶部复制您的**统一 API 密钥**。

### 5. 生产环境部署

```bash
npm run build
node server/dist/index.js     # 服务端与前端控制台都将在 3001 端口上服务
```

---

## 使用 API 接口

任何兼容 OpenAI 的 SDK 均可开箱即用：

### Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3001/v1",
    api_key="freellmapi-your-unified-key", # 您的统一 API 密钥
)

resp = client.chat.completions.create(
    model="auto",  # 使用 "auto" 让路由器自动决策最佳模型；或直接指定如 "gemini-2.5-flash"
    messages=[{"role": "user", "content": "用一句话概括罗马帝国的灭亡原因。"}],
)
print(resp.choices[0].message.content)
# 通过 X-Routed-Via 标头可以知道这个请求实际上被路由到了哪个供应商的模型
print("Routed via:", resp.headers.get("x-routed-via"))
```

### curl

```bash
curl http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer freellmapi-your-unified-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

### 流式返回 (Streaming)

```python
stream = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "写一首关于 SQLite 的小诗。"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

---

## 后台管理截图

### 密钥管理 (Keys)

配置您的提供商 API 凭证，并查看每个密钥的健康状态及健康检查时间。

![Keys](repo-assets/keys.png)

### 演练场 (Playground)

可直接在网页端调试多轮对话，获取最终响应并直观查看路由的模型及产生的请求延迟。

![Playground](repo-assets/playground.png)

### 统计分析 (Analytics)

清晰呈现分钟/天级的请求总量、成功率、平均请求延迟以及 Token 节省概览。

![Analytics](repo-assets/analytics.png)

---

## 工作原理简介

```
┌──────────────────┐    统一 API 密钥       ┌─────────────────────────┐
│   OpenAI SDK /   │ ─────────────────────▶ │  Express 代理服务 (:3001)│
│   各类 AI 客户端  │ ◀───────────────────── │  /v1/chat/completions   │
└──────────────────┘     Token 流式回传      └────────────┬────────────┘
                                                          │
                                                          ▼
                             ┌────────────────────────────────────────────────┐
                             │ 智能路由控制器 (Router)                         │
                             │  1. 在所有已激活密钥的模型中，根据优先级筛选：  │
                             │     (a) 处于健康状态的密钥且                    │
                             │     (b) 尚未达到当前限制频率的密钥。            │
                             │  2. 解密密钥，构造参数并向上游 API 发起调用。    │
                             │  3. 若返回 429/5xx -> 加入冷却池，在备选链中重试。│
                             └────────────────────────────────────────────────┘
                                                          │
    ┌──────────────┬────────────┬──────────┴─────────┬─────────────┬──────────┐
    ▼              ▼            ▼                    ▼             ▼          ▼
 Google          Groq        Cerebras           OpenRouter     Cloudflare   …等 11 家
```

- **路由模块** (`server/src/services/router.ts`) — 负责在多节点下选举最佳的模型路径。
- **频率与额度计数器** (`server/src/services/ratelimit.ts`) — 利用 SQLite 对调用频率进行平滑计算，实施毫秒级的主动防超额降级。
- **服务提供商适配器** (`server/src/providers/*.ts`) — 针对不同厂商 API 的非标字段（例如 Gemini 函数调用的结构化数据翻译）提供适配层。
- **健康探测模块** (`server/src/services/health.ts`) — 持续自动发送心跳检测探测包，确保存量密钥的有效性。

---

## 局限性与风险

聚合免费额度有着不可避免的折衷，请在生产使用前知悉：

- **无最顶尖推理模型**：免费层级的模型池主要集中在 Llama 3.3 70B、GLM-4.5、Qwen 3 Coder 和 Gemini 2.5 Pro。本项目无法提供类似 GPT-4o 满血版或 Claude 3.5 Sonnet 等昂贵推理模型的算力，请根据实际场景决定。
- **服务智能度随时间漂移**：高质量模型的每日免费额度较低。一旦它们在当天被耗尽，系统将自动回退到小型或低参数量的备选模型。您的 API 平均响应质量在每天接近 UTC 午夜时可能会有所下降（次日 UTC 0 点重置）。
- **响应延迟存在差异**：例如 Cerebras 和 Groq 以极速响应闻名，而有些提供商可能较慢。
- **无服务可用性保证 (SLA)**：提供商可能会在无预警的情况下修改、限制或彻底关闭免费额度。

---

## 贡献指南

我们非常欢迎社区提交 PR，为项目添砖加瓦！以下是一些有价值的开发方向：

1. **添加新的免费 API 供应商**：可以参考 `server/src/providers/openai-compat.ts` 模板添加，并集成测试。
2. **新增接口规范**：如实现 Embeddings 或 Moderations。
3. **优化路由算法**：例如引入平均延迟加权选举，或者区域 IP 自动避让等。
4. **控制台体验优化**：例如丰富统计分析面板的图表。

本地开发指南：
```bash
npm install
npm run dev     # 启动服务端 (3001) 及支持热重载的前端 UI (5173)
npm test        # 运行测试用例
```

---

## 服务条款 (ToS) 审查报告

截至 2026 年 5 月，本项目依据个人学术非商业性质，对各提供商的使用条款（ToS）进行了审查：

| 提供商 | ToS 审查状态 | 说明 |
|---|---|---|
| Google Gemini | ⚠️ 需注意 | 条款规定只允许商业或专业用途，禁止纯娱乐性质，个人开发代理目前处于灰色地带。 |
| Groq | ✅ 允许使用 | 明确允许接入第三方自定义应用。 |
| Cerebras | ✅ 允许使用 | 只要不转售、不泄露您的核心 API 密钥，代理本身符合规范。 |
| Mistral | ✅ 允许使用 | 明确支持个人测试和内部研发使用。 |
| OpenRouter | ✅ 允许使用 | 禁止公共分销/套壳，个人单用户部署完全合规。 |
| SambaNova | ⚠️ 模糊限制 | 条款禁止以“服务局”或多租户云服务的形式分发，个人闭环使用不受此限制。 |
| Cloudflare | ⚠️ 模糊限制 | 默认适用于通用 Workers 订阅使用协议。 |
| NVIDIA NIM | ⚠️ 需注意 | 仅限评估测试阶段，禁止接入任何生产流量。默认在配置中关闭。 |
| GitHub Models | ⚠️ 需注意 | 协议明文写道仅限“实验”与“快速原型制作”用途。 |
| Cohere | ❌ 不建议 | 条款第 14 条仍然禁止使用于“个人、家庭或非专业目的”。 |
| Zhipu CN | ✅ 允许使用 | 具有完善的个人科学研究豁免条款。 |

建议准则：**每家提供商只注册一个账号，禁止将端点转售，禁止将其公开共享，禁止将其作为高并发的大规模生产后端。**

---

## 免责声明

**本项目仅用于个人实验、学术交流和技术研究，请勿用于商业生产环境。** 免费层级是服务商为了让开发者体验和开发原型而设立的，并不提供 SLA 可靠性保证。如果您决定发布一款面向用户的真实应用，请务必将其切换到收费的官方生产 API。您在使用本代理时，仍然受您与各提供商直接签署的服务条款约束，您应对自身的合规性负全部责任。

---

## 开源协议

本项目采用 [MIT 协议](./LICENSE) 开源。
