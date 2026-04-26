import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: '请提供提示词' }, { status: 400 });
    }

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

    const response = await client.invoke(messages, {
      temperature: 0.9, // 更高的温度增加创意性
    });

    return NextResponse.json({ result: response.content });
  } catch (error) {
    console.error('AI insight error:', error);
    return NextResponse.json(
      { error: 'AI 联想生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
