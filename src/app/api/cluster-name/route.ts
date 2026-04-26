import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

interface ClusterItem {
  title: string;
  author?: string;
  likes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { clusters } = await request.json();

    if (!clusters || !Array.isArray(clusters)) {
      return NextResponse.json({ error: '请提供聚类数据' }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建提示词，同时记录原始 id 与序号的关系
    const clusterIndexMap = clusters.map((cluster: { id: number; items: ClusterItem[] }, index: number) => ({
      originalId: cluster.id,
      displayIndex: index + 1,
    }));

    const clusterDescriptions = clusters.map((cluster: { id: number; items: ClusterItem[] }, index: number) => {
      const titles = cluster.items.slice(0, 10).map((item: ClusterItem) => `- ${item.title}`).join('\n');
      return `聚类${index + 1}:\n${titles}`;
    }).join('\n\n');

    const prompt = `你是一个专业的小红书内容分析师。请根据以下聚类中的内容，为每个聚类生成一个简短、有意义的中文名称（2-4个字）。

聚类内容：
${clusterDescriptions}

要求：
1. 名称要体现聚类的主题内容
2. 使用小红书常见的风格词汇
3. 每个名称2-4个字
4. 不要使用"聚类"、"分类"等词

请以JSON数组格式返回，序号对应上述聚类编号（聚类1对应id:0，聚类2对应id:1...）：
[{"id": 0, "name": "名称1"}, {"id": 1, "name": "名称2"}, ...]`;

    const messages = [
      {
        role: 'system' as const,
        content: '你是一个专业的内容分析师，擅长从内容中提取主题并生成简洁的名称。',
      },
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    const response = await client.invoke(messages, {
      temperature: 0.7,
    });

    // 解析返回的 JSON，将序号 id 映射回原始聚类 id
    let result;
    try {
      // 尝试直接解析
      let parsedResult = JSON.parse(response.content);
      // 将序号映射回原始 id
      result = parsedResult.map((item: { id: number; name: string }) => ({
        id: clusters[item.id]?.id ?? item.id,
        name: item.name,
      }));
    } catch {
      // 如果直接解析失败，尝试提取 JSON 部分
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        let parsedResult = JSON.parse(jsonMatch[0]);
        result = parsedResult.map((item: { id: number; name: string }) => ({
          id: clusters[item.id]?.id ?? item.id,
          name: item.name,
        }));
      } else {
        // 如果还是失败，返回默认名称（使用原始 id）
        result = clusters.map((c: { id: number }, i: number) => ({
          id: c.id,
          name: `主题 ${i + 1}`,
        }));
      }
    }

    return NextResponse.json({ clusters: result });
  } catch (error) {
    console.error('Cluster naming error:', error);
    return NextResponse.json(
      { error: '聚类命名失败，使用默认名称' },
      { status: 500 }
    );
  }
}
