import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: '请提供提示词' }, { status: 400 });
    }

    const client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });

    const response = await client.chat.completions.create({
      model: process.env.DASHSCOPE_MODEL || 'qwen-plus-latest',
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content: '你是一个充满创意的小红书博主，擅长跨界联想和创意灵感生成。你的回复应该活泼有趣，适合小红书的语境。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return NextResponse.json({ result: response.choices[0]?.message?.content || '' });
  } catch (error) {
    console.error('AI insight error:', error);
    return NextResponse.json(
      { error: 'AI 联想生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
