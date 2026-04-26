import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

interface PostInsightRequest {
  post1: {
    title: string;
    author?: string;
    content?: string;
  };
  post2: {
    title: string;
    author?: string;
    content?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PostInsightRequest = await request.json();
    const { post1, post2 } = body;

    if (!post1?.title || !post2?.title) {
      return NextResponse.json(
        { error: '请选择两个帖子' },
        { status: 400 }
      );
    }

    // 构建提示词
    const prompt = `你是一位资深的小红书内容创作者和创意策划师。现在有两个看似不相关的帖子：

【帖子1】
标题：${post1.title}
${post1.author ? `作者：${post1.author}` : ''}
${post1.content ? `内容：${post1.content}` : ''}

【帖子2】
标题：${post2.title}
${post2.author ? `作者：${post2.author}` : ''}
${post2.content ? `内容：${post2.content}` : ''}

请发挥你的创意想象力，分析这两个帖子的潜在联系，并提供至少3个跨界创意灵感。要求：
1. 找出两个帖子之间的深层联系或共同点
2. 给出具体的创意方向，包括：内容主题、创作角度、目标受众
3. 每个创意要独特且可执行
4. 语言风格要符合小红书的调性，年轻、有趣、有洞察

请用中文回答。`;

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      {
        role: 'system' as const,
        content: '你是一个充满创意的小红书博主，擅长跨界联想和创意灵感生成。你的回复应该活泼有趣，适合小红书的语境。',
      },
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    const stream = client.stream(messages, {
      temperature: 0.9,
    });

    // 流式返回
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Post insight error:', error);
    return NextResponse.json(
      { error: '联想生成失败，请重试' },
      { status: 500 }
    );
  }
}
