# 小红书收藏夹智能聚类 - 项目指南

## 项目概述

这是一个基于 AI 的小红书收藏夹智能聚类工具，通过语义分析和聚类算法自动整理收藏内容，并提供知识图谱可视化和跨界创意生成功能。

### 核心价值
- **自动分类**：无需手动整理，AI 自动识别内容主题
- **可视化探索**：知识图谱让内容关系一目了然
- **创意启发**：跨界联想激发内容创作灵感

### 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **可视化**: D3.js (力导向布局)
- **向量化**: BGE-small-zh / Coze Embedding
- **AI 生成**: LLM SDK (Coze)

---

## 目录结构

```
├── public/                 # 静态资源
├── src/
│   ├── app/                # 页面路由与 API
│   │   ├── api/
│   │   │   ├── embed/       # 向量化 API
│   │   │   ├── cluster/     # 聚类 API
│   │   │   ├── cluster-name/ # 聚类命名 API
│   │   │   ├── ai-insight/  # AI 联想 API
│   │   │   └── qa/          # 智能问答 API
│   │   ├── page.tsx        # 主页面（包含所有视图）
│   │   ├── layout.tsx      # 根布局
│   │   └── globals.css     # 全局样式
│   ├── components/
│   │   ├── ui/             # Shadcn UI 组件库
│   │   └── NetworkGraph.tsx # 知识图谱组件
│   └── lib/
│       └── utils.ts        # 通用工具函数
├── DESIGN.md               # 详细设计说明
├── AGENTS.md               # 本文件
└── package.json            # 项目依赖
```

---

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

---

## 核心功能说明

### 1. 数据导入 (src/app/page.tsx)

**支持格式**：
- CSV：小红书官方导出格式
- JSON：结构化数据
- 纯文本：逐行输入标题

**解析逻辑**：
- CSV：解析列名（标题、作者、链接等）并提取标题
- JSON：支持两种格式
  - 字符串数组：`["标题1", "标题2"]`
  - 对象数组：`[{"title": "...", "author": "..."}]`

### 2. 向量化 (src/app/api/embed/route.ts)

**双模型方案**：
- **BGE-small-zh**：本地运行，中文优化
  - 使用 `@xenova/transformers`
  - 模型路径：`Xenova/bge-small-zh-v1.5`
  - 失败时自动回退到 Coze
- **Coze Embedding**：云端备选
  - 使用 `coze-coding-dev-sdk` 的 Embedding 能力
  - 快速稳定

**API 路由**：
```
POST /api/embed
Body: { texts: string[], provider: 'bge' | 'coze' }
Response: { embeddings: number[][] }
```

### 3. 聚类 (src/app/api/cluster/route.ts)

**算法流程**：
1. **降维**：使用力导向布局风格的坐标映射（类似 UMAP）
2. **聚类**：K-Means++ 算法
3. **评估**：计算轮廓系数

**两种模式**：
- **自动聚类**：尝试 K=2 到 K=10，选择轮廓系数最高的
- **手动聚类**：用户指定 K 值

**API 路由**：
```
POST /api/cluster
Body: { embeddings: number[][], clusterCount: number, autoCluster: boolean }
Response: {
  labels: number[],      // 每个样本的聚类标签
  positions: number[][], // 降维后的二维坐标
  clusterCount: number,  // 实际聚类数
  silhouetteScore: number // 轮廓系数
}

### 3.1 聚类命名 (src/app/api/cluster-name/route.ts)

**功能描述**：
聚类完成后，为每个聚类生成简短有意义的中文名称。

**技术实现**：
- 使用 LLM 分析聚类内容
- 每次取聚类中最多 10 条内容作为样本
- 生成 2-4 字的小红书风格名称
- 失败时返回默认名称

**API 路由**：
```
POST /api/cluster-name
Body: { clusters: [{ id: number, items: [{ title, author?, likes? }] }] }
Response: { clusters: [{ id: number, name: string }] }
```
```

### 4. 知识图谱 (src/components/NetworkGraph.tsx)

**技术实现**：
- **力导向布局**：D3.js `d3.forceSimulation`
- **力场设置**：
  - `forceLink`：节点间连接
  - `forceCharge`：节点排斥力
  - `forceCenter`：中心引力
  - `forceCollision`：碰撞检测
  - `forceX/Y`：聚类中心引力

**交互功能**：
- 拖拽节点调整位置
- 滚轮缩放画布
- 点击节点筛选聚类
- 悬停显示节点详情

**颜色映射**：
- 10 种固定颜色循环使用
- 参考 `CLUSTER_COLORS` 常量

### 5. AI 跨界联想 (src/app/api/ai-insight/route.ts)

**功能描述**：
选择两个聚类，生成跨界创意方案。

**技术实现**：
- 使用 LLM SDK (`coze-coding-dev-sdk`)
- 模型：`doubao-seed-1-8-251228`（默认）
- 温度：0.9（高创意性）
- 系统提示：小红书博主人设

**API 路由**：
```
POST /api/ai-insight
Body: { prompt: string }
Response: { result: string }
```

### 5.1 帖子联想 (src/app/api/post-insight/route.ts)

**功能描述**：
在知识图谱中选择两个帖子，AI 根据内容进行创意联想。

**技术实现**：
- 用户在图谱中 Shift + 点击选择两个帖子
- 将帖子内容发送给 LLM 进行创意联想
- 流式输出创意灵感

**交互方式**：
- Shift + 点击节点：选中帖子
- 选中后节点变大并有白色边框
- 点击"帖子联想"按钮生成创意

**API 路由**：
```
POST /api/post-insight
Body: {
  post1: { title: string, author?: string, content?: string },
  post2: { title: string, author?: string, content?: string }
}
Response: SSE stream with { text: string }
```

### 6. 智能问答 (src/app/api/qa/route.ts)

**功能描述**：
基于收藏内容，AI 智能回答用户的自然语言问题，并引用相关内容来源。

**技术实现**：
- **向量化检索**：使用 Embedding 将问题和内容转换为向量
- **相似度匹配**：计算余弦相似度，找出最相关的内容
- **RAG 生成**：将相关内容作为上下文，让 LLM 生成回答

**API 路由**：
```
POST /api/qa
Body: {
  question: string,           // 用户问题
  items: { title: string, author?: string }[], // 收藏内容
  topK?: number              // 返回的相关内容数量（默认 5）
}
Response: {
  answer: string,            // AI 生成的回答
  references: { title: string, author?: string }[], // 参考来源
  totalItems: number,       // 总内容数
  matchedCount: number      // 匹配数量
}
```

---

## 视觉设计规范

### 颜色系统

**主题色**：
- 背景色：`#0f0f12`（深灰）
- 强调色：`#ef4444`（红色）
- 文本色：`#e2e8f0`（浅灰）

**聚类颜色**（CLUSTER_COLORS）：
```typescript
const CLUSTER_COLORS: Record<number, string> = {
  0: '#FF6B6B', // 红
  1: '#4DABF7', // 蓝
  2: '#51CF66', // 绿
  3: '#FCC419', // 黄
  4: '#CC5DE8', // 紫
  5: '#FF8C42', // 橙
  6: '#20C997', // 青
  7: '#F472B6', // 粉
  8: '#A3E635', // 黄绿
  9: '#818CF8', // 靛蓝
};
```

### 组件样式

**圆角**：
- 小元素：`rounded-xl`
- 卡片：`rounded-2xl`
- 大卡片：`rounded-3xl`

**背景**：
- 半透明：`bg-white/5`（5% 不透明度）
- 高亮：`bg-white/10`
- 玻璃态：`backdrop-blur-md`

**边框**：
- 标准：`border border-white/10`
- 强调：`border-red-500/50`

### 字体大小

- 标题：`text-xl`（主标题）、`text-lg`（二级标题）
- 内容：`text-sm`（正文）
- 详情：`text-xs`、`text-[10px]`（辅助信息）

---

## 页面视图结构

### 侧边导航
- **总览**：统计卡片、分布图、摘要列表
- **图谱**：知识图谱交互
- **联想**：跨界创意生成
- **问答**：智能问答探索
- **设置**：重置数据

### 状态管理
```typescript
// 主要状态
const [hasData, setHasData] = useState(false);        // 是否已上传数据
const [activeTab, setActiveTab] = useState('dashboard'); // 当前视图
const [results, setResults] = useState<ClusterResult[]>(); // 聚类结果
const [selectedCluster, setSelectedCluster] = useState<number | null>(); // 选中的聚类
```

---

## 常见开发任务

### 添加新的聚类颜色

修改 `src/app/page.tsx` 和 `src/components/NetworkGraph.tsx` 中的 `CLUSTER_COLORS` 常量。

### 修改聚类算法

编辑 `src/app/api/cluster/route.ts` 中的 `performKMeans` 函数。

### 调整图谱力场

编辑 `src/components/NetworkGraph.tsx` 中的 `d3.forceSimulation` 部分。

### 添加新的可视化类型

1. 在 `src/components/` 创建新组件
2. 在 `src/app/page.tsx` 中添加新的 Tab
3. 在侧边导航添加新的 NavItem

---

## 构建和测试

### 类型检查
```bash
npx tsc --noEmit
```

### 启动开发环境
```bash
pnpm run dev
# 服务运行在端口 5000
```

### 生产构建
```bash
pnpm run build
```

### 检查日志
```bash
tail -n 50 /app/work/logs/bypass/app.log
tail -n 50 /app/work/logs/bypass/console.log
```

---

## 设计原则

### 用户中心
- 三种导入方式降低使用门槛
- 自动聚类减少用户决策负担
- 直观的交互降低学习成本

### 视觉一致性
- 统一的深色主题
- 一致的圆角和玻璃态风格
- 颜色编码跨视图保持

### 渐进式披露
- 信息分层呈现
- 按需显示详情
- Hover 提示减少视觉噪音

### 即时反馈
- 每个操作都有视觉响应
- 加载状态清晰明确
- 物理模拟增强真实感

---

## 关键决策

### 为什么用 BGE 而不是其他模型？
- 中文优化，在小红书内容上表现更好
- 轻量级，加载快
- 本地运行，保护隐私

### 为什么先降维后聚类？
- 确保可视化位置与聚类类别一致
- 避免用户看到"标签分离"的困惑
- 降维后的坐标可用于力导向布局

### 为什么用红色强调色？
- 与小红书品牌色呼应
- 情感化设计，代表活力和创意
- 对比度强，引导注意力

### 为什么用力导向布局？
- 符合"知识图谱"的认知模型
- 自动平衡节点分布，无需手动调整
- 物理模拟直观易懂

---

## 参考文档

- **详细设计说明**：`DESIGN.md`
- **Next.js 文档**：https://nextjs.org/docs
- **D3.js 文档**：https://d3js.org
- **shadcn/ui 组件**：https://ui.shadcn.com
- **BGE 模型**：https://github.com/FlagOpen/FlagEmbedding
- **LLM SDK 指南**：已加载在技能中

---

## 注意事项

1. **Hydration 错误预防**：
   - 客户端组件使用 `'use client'`
   - 动态数据用 `useEffect` + `useState`
   - 严禁非法 HTML 嵌套

2. **API 调用**：
   - 所有 API 路由在 `src/app/api/`
   - 使用 `HeaderUtils.extractForwardHeaders` 提取头部
   - 必须进行错误处理

3. **性能优化**：
   - 图谱节点数量 >500 时考虑虚拟化
   - 使用 `useMemo` 缓存计算结果
   - 避免不必要的重新渲染

4. **类型安全**：
   - 所有组件和函数必须有类型注解
   - 使用接口定义数据结构
   - 避免使用 `any` 类型
