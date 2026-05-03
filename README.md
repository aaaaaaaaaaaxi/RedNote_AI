# 小红书收藏夹智能聚类

基于 AI 的小红书收藏夹智能聚类全栈工具。用户上传收藏内容后，系统进行语义向量化、K-Means++ 聚类，并通过交互式 D3.js 知识图谱进行可视化。

## 功能特性

- **智能聚类**：语义向量化 + K-Means++ 聚类算法，自动生成分组
- **知识图谱**：D3.js 力导向图可视化，支持拖拽、缩放、筛选
- **AI 创意联想**：跨聚类跨界联想，发现收藏间的隐藏关联
- **智能问答**：基于 RAG 的收藏内容问答，带引用溯源
- **多格式支持**：CSV / JSON / 文本多种导入方式

## 快速开始

### 配置环境变量

启动前需创建 `.env` 文件，参考 `.env.example`：

```bash
cp .env.example .env
```

然后根据实际情况填写必要的环境变量（数据库、对象存储、AI API 等）。

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

在浏览器中打开 [http://localhost:5000](http://localhost:5000)。

### 构建生产版本

```bash
pnpm build
```

### 启动生产服务器

```bash
pnpm start
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript 5 (严格模式) |
| UI | shadcn/ui (基于 Radix UI) + Tailwind CSS v4 |
| 可视化 | D3.js 力导向图 |
| 向量化 | @xenova/transformers (BGE-small-zh 本地运行) |
| LLM | OpenAI API (或其他兼容 API) |
| 数据库 | PostgreSQL + Drizzle ORM |
| 对象存储 | AWS S3 / S3 兼容存储 |
| 包管理器 | pnpm 9+ |

## 项目结构

```
src/
├── app/
│   ├── page.tsx                    # 主单页应用
│   ├── layout.tsx                  # 根布局
│   ├── globals.css                 # 全局样式 + shadcn 主题变量
│   └── api/                        # API 路由
│       ├── embed/route.ts          # 向量化接口
│       ├── cluster/route.ts        # K-Means++ 聚类
│       ├── cluster-name/route.ts   # LLM 生成聚类名称
│       ├── ai-insight/route.ts     # 跨聚类创意联想
│       ├── post-insight/route.ts   # 帖子级联想 (SSE)
│       └── qa/route.ts             # RAG 智能问答
├── components/
│   ├── NetworkGraph.tsx            # D3.js 力导向图
│   └── ui/                         # shadcn/ui 基础组件
└── server.ts                       # 自定义 HTTP 服务器入口

server/                            # 服务端构建输出
scripts/                           # 构建脚本
```

## 数据流

1. **导入**：用户上传 CSV/JSON/文本 → 解析为条目列表
2. **向量化**：条目 → `/api/embed` → BGE 语义向量
3. **聚类**：向量 → `/api/cluster` → K-Means++ 聚类标签 + 二维坐标
4. **可视化**：结果 → D3 力导向图 + 总览统计
5. **创意联想**：聚类对 → `/api/ai-insight` → 跨界创意方案
6. **智能问答**：问题 + 条目 → `/api/qa` → Top-K 检索 → LLM 带引用的回答

## API 接口

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/embed` | POST | 文本向量化 (BGE) |
| `/api/cluster` | POST | K-Means++ 聚类 |
| `/api/cluster-name` | POST | LLM 生成聚类名称 |
| `/api/ai-insight` | POST | 跨聚类创意联想 |
| `/api/post-insight` | POST | 帖子级联想 (SSE 流式) |
| `/api/qa` | POST | RAG 智能问答 |

## 开发规范

- **路径别名**：使用 `@/` 导入 (映射到 `./src/*`)
- **组件**：优先使用 `src/components/ui/` 中的 shadcn/ui 组件
- **包管理器**：仅限 pnpm (preinstall 脚本强制执行)
- **客户端组件**：标记 `'use client'`，动态数据使用 `useEffect` + `useState`
- **样式**：Tailwind 类名 + `cn()` 工具函数 (`@/lib/utils`) 合并类名

## 参考文档

- [Next.js 文档](https://nextjs.org/docs)
- [shadcn/ui 组件](https://ui.shadcn.com)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [D3.js](https://d3js.org)
- [Transformers.js](https://xenova.github.io/transformers.js)
