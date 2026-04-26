# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

一个基于 AI 的小红书收藏夹智能聚类全栈工具。用户上传收藏内容后，系统进行语义向量化、K-Means++ 聚类，并通过交互式 D3.js 知识图谱进行可视化。附加功能包括 AI 跨界创意联想、帖子级联想以及基于 RAG 的智能问答。

## 常用命令

```bash
pnpm dev          # 启动开发服务器，端口 5000（自定义服务器 src/server.ts）
pnpm build        # 构建 Next.js + 用 tsup 打包服务器
pnpm start        # 启动生产服务器
pnpm lint         # ESLint 检查（next + typescript 配置）
pnpm ts-check     # TypeScript 类型检查（tsc --noEmit）
pnpm install      # 安装依赖（仅限 pnpm — npm/yarn 会报错）
```

**包管理器：仅限 pnpm。** preinstall 脚本会强制执行此限制。

## 架构

### 技术栈
- **框架**：Next.js 16 (App Router) + React 19
- **语言**：TypeScript 5（严格模式）
- **UI**：shadcn/ui（基于 Radix UI）+ Tailwind CSS v4
- **可视化**：D3.js 力导向图
- **向量化**：`@xenova/transformers`（BGE-small-zh 本地运行）+ Coze Embedding 云端备选
- **AI/LLM**：`coze-coding-dev-sdk`（doubao-seed 模型）
- **服务器**：自定义 Node.js 服务器（`src/server.ts`），非 Next.js 内置服务器

### 关键文件

| 文件 | 用途 |
|------|------|
| `src/app/page.tsx` | 主单页应用 — 包含所有视图（总览、图谱、联想、问答、设置），侧边导航切换 |
| `src/components/NetworkGraph.tsx` | D3.js 力导向知识图谱，支持拖拽、缩放、点击筛选、Shift+点击选择 |
| `src/app/api/embed/route.ts` | 双模型向量化（BGE 本地 → Coze 云端自动回退） |
| `src/app/api/cluster/route.ts` | K-Means++ 聚类，轮廓系数评估，支持自动/手动选择 K 值 |
| `src/app/api/cluster-name/route.ts` | LLM 生成聚类名称（2-4 字中文） |
| `src/app/api/ai-insight/route.ts` | 跨聚类创意联想（LLM 生成） |
| `src/app/api/post-insight/route.ts` | 帖子级联想（SSE 流式输出） |
| `src/app/api/qa/route.ts` | RAG 智能问答 — 向量相似度检索 + LLM 生成带引用的回答 |
| `src/server.ts` | 自定义 HTTP 服务器入口（开发和生产环境共用） |

### 数据流
1. 用户上传 CSV/JSON/文本 → 解析为条目列表
2. 条目 → `/api/embed` → 向量嵌入（BGE 或 Coze）
3. 向量 → `/api/cluster` → K-Means++ 聚类标签 + 二维坐标
4. 结果 → `NetworkGraph.tsx`（D3 力导向模拟）+ 总览统计
5. 聚类对 → `/api/ai-insight` → 跨界创意方案
6. 问题 + 条目 → `/api/qa` → Top-K 检索 → LLM 带引用的回答

### 视觉设计
- 深色主题：背景 `#0f0f12`，强调色 `#ef4444`（红色，呼应小红书品牌）
- 玻璃态卡片：`bg-white/5`、`backdrop-blur-md`、`rounded-2xl`/`rounded-3xl`
- 10 种固定聚类颜色（`CLUSTER_COLORS` 常量），在 `page.tsx` 和 `NetworkGraph.tsx` 之间共享

## 开发规范

- **路径别名**：使用 `@/` 导入（映射到 `./src/*`）
- **组件**：优先使用 `src/components/ui/` 中已有的 shadcn/ui 组件，避免重复造轮子
- **API 路由**：统一放在 `src/app/api/` 下，使用 `HeaderUtils.extractForwardHeaders` 提取请求头，必须包含错误处理
- **客户端/服务端边界**：客户端组件标记 `'use client'`；动态数据使用 `useEffect` + `useState` 避免 Hydration 错误
- **表单**：使用 react-hook-form + zod 进行校验
- **样式**：Tailwind 类名 + `cn()` 工具函数（`@/lib/utils`）进行条件类名合并
