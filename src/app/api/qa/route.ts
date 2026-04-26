import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 计算余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 向量化文本（使用百炼 Embedding）
async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  });

  const batchSize = 10;
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await client.embeddings.create({
      model: 'text-embedding-v3',
      input: batch,
    });
    embeddings.push(...response.data.map((item) => item.embedding));
  }

  return embeddings;
}

// 从相关内容提取引用格式
function formatReferences(references: Array<{ title: string; author?: string; link?: string }>): string {
  return references
    .map((ref, i) => `[${i + 1}] ${ref.title}${ref.author ? ` - @${ref.author}` : ''}`)
    .join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { question, items, topK = 5 } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: '问题不能为空' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '收藏内容不能为空' }, { status: 400 });
    }

    // 1. 向量化问题
    const questionEmbedding = await embedTexts([question]);

    // 2. 向量化所有收藏内容
    const itemTexts = items.map((item: { title: string; author?: string; link?: string }) =>
      `${item.title}${item.author ? ` - @${item.author}` : ''}`
    );
    const itemEmbeddings = await embedTexts(itemTexts);

    // 3. 计算相似度并排序
    const similarities = items.map((item: { title: string; author?: string; link?: string }, index: number) => ({
      item,
      similarity: cosineSimilarity(questionEmbedding[0], itemEmbeddings[index]),
      index,
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);

    // 4. 取 Top K 个最相关的内容
    const topResults = similarities.slice(0, topK);
    const references = topResults.map((r) => r.item);

    // 5. 构建 prompt
    const itemsList = references.map((r, i) => `${i + 1}. ${r.title}${r.author ? ` (作者: ${r.author})` : ''}`).join('\n');

    const systemPrompt = `你是一个智能助手，基于用户提供的收藏内容来回答问题。

你的任务：
1. 仔细阅读用户提出的问题
2. 从提供的收藏内容中找出相关信息
3. 结合这些内容，用你自己的话来回答问题
4. 如果有相关内容，要明确引用（用 [1]、[2] 这样的格式）
5. 如果没有相关内容，诚实地告诉用户"暂无找到相关内容"

注意事项：
- 不要编造内容，只基于提供的收藏内容来回答
- 引用时要具体指出是哪篇内容
- 回答要简洁有条理
- 保持小红书社区的风格，友好亲切`;

    const userPrompt = `问题：${question}

相关收藏内容：
${itemsList}

请基于以上收藏内容回答问题，并标注引用来源。`;

    // 6. 调用 LLM 生成回答
    const openai = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });

    const response = await openai.chat.completions.create({
      model: process.env.DASHSCOPE_MODEL || 'qwen-plus-latest',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const answer = response.choices[0]?.message?.content || '';

    return NextResponse.json({
      answer,
      references,
      totalItems: items.length,
      matchedCount: references.length,
    });
  } catch (error: unknown) {
    console.error('QA error:', error);
    const message = error instanceof Error ? error.message : '问答生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
