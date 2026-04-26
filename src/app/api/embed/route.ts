import { NextRequest, NextResponse } from 'next/server';

// 动态导入 transformers.js（ESM 模块）
let pipeline: any = null;
let modelInstance: any = null;
let modelLoading = false;
let modelError: string | null = null;

async function getPipeline(): Promise<{ pipeline: any; error?: string }> {
  if (modelError) {
    return { pipeline: null, error: modelError };
  }
  
  if (!pipeline) {
    try {
      const { pipeline: p } = await import('@xenova/transformers');
      pipeline = p;
    } catch (e) {
      modelError = '无法加载 transformers.js 库';
      return { pipeline: null, error: modelError };
    }
  }
  
  if (!modelInstance && !modelLoading) {
    modelLoading = true;
    try {
      // 使用 BGE-small-zh-v1.5，中文效果最好
      modelInstance = await pipeline('feature-extraction', 'Xenova/bge-small-zh-v1.5', {
        quantized: true,
        progress_callback: (progress: any) => {
          console.log('Model loading progress:', progress);
        },
      });
    } catch (e: any) {
      modelError = `模型加载失败: ${e.message || '网络超时，请使用 Coze 模式'}`;
      console.error('Model loading error:', e);
      return { pipeline: null, error: modelError };
    } finally {
      modelLoading = false;
    }
  }
  
  if (modelLoading) {
    return { pipeline: null, error: '模型正在加载中，请稍后重试' };
  }
  
  return { pipeline: modelInstance };
}

// 使用 transformers.js 本地模型
async function embedWithTransformers(texts: string[]): Promise<{ embeddings: number[][]; error?: string }> {
  const { pipeline: extractor, error } = await getPipeline();
  
  if (error || !extractor) {
    return { embeddings: [], error };
  }

  const embeddings: number[][] = [];

  for (const text of texts) {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data as Float32Array);
    embeddings.push(embedding);
  }

  return { embeddings };
}

// 使用阿里百炼 Embedding（每批最多10条）
async function embedWithDashScope(texts: string[]): Promise<{ embeddings: number[][]; error?: string }> {
  try {
    const OpenAI = (await import('openai')).default;
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

    return { embeddings };
  } catch (e: any) {
    console.error('DashScope embedding error:', e);
    return { embeddings: [], error: e.message || '百炼 API 调用失败' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { texts, provider = 'dashscope' } = await request.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: 'texts 数组不能为空' }, { status: 400 });
    }

    let embeddings: number[][];
    let model: string;
    let dimension: number;
    let usedProvider = provider;

    if (provider === 'transformers' || provider === 'bge') {
      // 尝试使用本地 BGE 模型
      const result = await embedWithTransformers(texts);

      if (result.error || result.embeddings.length === 0) {
        // BGE 失败，自动切换到百炼
        console.log('BGE failed, falling back to DashScope:', result.error);
        const fallbackResult = await embedWithDashScope(texts);

        if (fallbackResult.error) {
          return NextResponse.json({ error: fallbackResult.error }, { status: 500 });
        }

        embeddings = fallbackResult.embeddings;
        model = 'text-embedding-v3 (fallback)';
        usedProvider = 'dashscope';
        dimension = embeddings[0]?.length || 1024;
      } else {
        embeddings = result.embeddings;
        model = 'BGE-small-zh-v1.5';
        dimension = embeddings[0]?.length || 512;
      }
    } else {
      // 使用百炼 Embedding
      const result = await embedWithDashScope(texts);

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      embeddings = result.embeddings;
      model = 'text-embedding-v3';
      dimension = embeddings[0]?.length || 1024;
    }

    return NextResponse.json({
      success: true,
      embeddings,
      count: embeddings.length,
      dimension,
      model,
      provider: usedProvider,
    });
  } catch (error: unknown) {
    console.error('Embedding error:', error);
    const message = error instanceof Error ? error.message : '向量化失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
