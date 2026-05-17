# 小红书收藏夹智能聚类 (Xiaohongshu Favorites Intelligent Clustering)

[中文版 README](./README-zh.md)

This is an AI-powered full-stack tool for intelligent clustering of Xiaohongshu (Little Red Book) favorites. Users upload their saved content, which is then semantically embedded, clustered via K-Means++, and visualized through an interactive D3.js knowledge graph. Additional features include cross-cluster creative brainstorming, post-level insights, and RAG-based Q&A.

## Features

- **Smart Clustering**: Semantic embedding + K-Means++ clustering, auto-generated groups
- **Knowledge Graph**: D3.js force-directed graph with drag, zoom, and filter support
- **AI Creative Insights**: Cross-cluster creative associations, discovering hidden connections
- **Intelligent Q&A**: RAG-based Q&A with source citations
- **Multi-format Support**: CSV / JSON / plain text import

## Quick Start

### Configure Environment Variables

Before starting, create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Fill in the required environment variables (DashScope API key for AI).

### Install Dependencies

```bash
pnpm install
```

> **Note**: pnpm is required. The preinstall script enforces this. Version 9.0+ is recommended.

### Start Development Server

```bash
pnpm dev
```

Then open [http://localhost:5000](http://localhost:5000) in your browser.

### Build for Production

```bash
pnpm build
```

### Start Production Server

```bash
pnpm start
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript 5 (strict mode) |
| UI | shadcn/ui (Radix UI) + Tailwind CSS v4 |
| Visualization | D3.js force-directed graph |
| Embedding | `@xenova/transformers` (BGE-small-zh local) + Coze Embedding (cloud fallback) |
| LLM | Coze SDK (doubao-seed model) via DashScope API |
| Package Manager | pnpm 9+ |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main single-page app
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles + shadcn theme variables
│   └── api/                        # API routes
│       ├── embed/route.ts          # Semantic embedding (BGE / Coze)
│       ├── cluster/route.ts        # K-Means++ clustering
│       ├── cluster-name/route.ts   # LLM-generated cluster names
│       ├── ai-insight/route.ts     # Cross-cluster creative insights
│       ├── post-insight/route.ts   # Post-level insights (SSE streaming)
│       └── qa/route.ts             # RAG-based Q&A
├── components/
│   ├── NetworkGraph.tsx            # D3.js force-directed graph
│   └── ui/                         # shadcn/ui base components
└── server.ts                       # Custom HTTP server entry point

scripts/                            # Build scripts
```

## Data Flow

1. **Import**: User uploads CSV/JSON/text → parsed into item list
2. **Embedding**: Items → `/api/embed` → BGE semantic vectors (falls back to Coze cloud)
3. **Clustering**: Vectors → `/api/cluster` → K-Means++ cluster labels + 2D coordinates
4. **Visualization**: Results → D3 force simulation + overview statistics
5. **Creative Insights**: Cluster pairs → `/api/ai-insight` → cross-domain creative proposals
6. **Intelligent Q&A**: Question + items → `/api/qa` → Top-K retrieval → LLM response with citations

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/embed` | POST | Text embedding (BGE local → Coze cloud fallback) |
| `/api/cluster` | POST | K-Means++ clustering with silhouette evaluation |
| `/api/cluster-name` | POST | LLM-generated cluster names (2-4 Chinese characters) |
| `/api/ai-insight` | POST | Cross-cluster creative brainstorming |
| `/api/post-insight` | POST | Post-level insights (SSE streaming) |
| `/api/qa` | POST | RAG Q&A with source citations |

## Development Conventions

- **Path Aliases**: Use `@/` for imports (maps to `./src/*`)
- **Components**: Prefer existing shadcn/ui components in `src/components/ui/`
- **Package Manager**: pnpm only (enforced by preinstall script)
- **Client Components**: Mark with `'use client'`; use `useEffect` + `useState` for dynamic data
- **Styling**: Tailwind classes + `cn()` utility (`@/lib/utils`) for conditional class merging

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DASHSCOPE_API_KEY` | DashScope API key (get from https://bailian.console.aliyun.com/) |
| `DASHSCOPE_MODEL` | Model name (default: `qwen-plus-latest`) |
| `PORT` | Server port (default: `5000`) |
| `HOSTNAME` | Server hostname (default: `localhost`) |
| `COZE_PROJECT_ENV` | Coze project environment (`DEV` or `PROD`) |

## Reference

- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [D3.js](https://d3js.org)
- [Transformers.js](https://xenova.github.io/transformers.js)
- [Coze SDK](https://www.coze.com/docs)
- [DashScope](https://bailian.console.aliyun.com/)