import { NextRequest, NextResponse } from 'next/server';

interface XHSNote {
  noteId: string;
  title: string;
  type: string;
  user: {
    userId: string;
    nickname: string;
    avatar: string;
  };
  interactInfo: {
    likedCount: string;
    collectedCount: string;
    commentCount: string;
    shareCount: string;
  };
  time: string;
  imageList: Array<{ urlDefault: string; width: number; height: number }>;
  video?: {
    url: string;
    width: number;
    height: number;
  };
  tagList: Array<{ id: string; name: string }>;
}

function extractUserIdFromUrl(url: string): string | null {
  const patterns = [
    /xiaohongshu\.com\/user\/profile\/([a-f0-9]+)/i,
    /user\/profile\/([a-f0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

async function fetchUserNotes(
  userId: string,
  cookie: string
): Promise<{ notes: XHSNote[]; hasMore: boolean; cursor: string }> {
  const response = await fetch(
    'https://edith.xiaohongsh.com/api/galaxy/creator/getSelfFeed',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://www.xiaohongshu.com/user/profile/${userId}`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        userId: userId,
        cursor: '',
        num: 30,
        image_scenes: ['fc_cms_img_url', 'cr_img_cover'],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(data.msg || '获取笔记失败');
  }

  return {
    notes: data.data?.notes || [],
    hasMore: data.data?.hasMore || false,
    cursor: data.data?.cursor || '',
  };
}

function formatNotes(notes: XHSNote[], userNickname: string) {
  return notes.map((note) => ({
    id: note.noteId,
    title: note.title || '',
    author: note.user?.nickname || userNickname,
    link: `https://www.xiaohongshu.com/user/profile/${note.user?.userId}/${note.noteId}`,
    likes: note.interactInfo?.likedCount || '0',
    collects: note.interactInfo?.collectedCount || '0',
    comments: note.interactInfo?.commentCount || '0',
    shares: note.interactInfo?.shareCount || '0',
    publishTime: note.time ? new Date(Number(note.time) * 1000).toISOString().split('T')[0] : '',
    description: note.title || '',
    topics: note.tagList?.map((t) => t.name).join(',') || '',
    images: note.imageList?.map((img) => img.urlDefault).join('\n') || '',
    videoUrl: note.video?.url || '',
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { profileUrl, cookie, maxNotes = 100 } = await request.json();

    if (!profileUrl) {
      return NextResponse.json({ error: '请提供小红书用户主页 URL' }, { status: 400 });
    }

    if (!cookie) {
      return NextResponse.json({
        error: 'Cookie 不能为空。请在浏览器中登录小红书后，从开发者工具复制 Cookie',
        hint: '打开小红书网页版 F12 → Application → Cookies → 复制全部 Cookie 值'
      }, { status: 400 });
    }

    const userId = extractUserIdFromUrl(profileUrl);
    if (!userId) {
      return NextResponse.json({ error: '无法从 URL 中提取用户 ID，请确认是否是正确的用户主页链接' }, { status: 400 });
    }

    const allNotes: XHSNote[] = [];
    let cursor = '';
    let hasMore = true;
    let fetchCount = 0;
    const maxIterations = Math.ceil(maxNotes / 30);

    // 分页获取笔记
    while (hasMore && fetchCount < maxIterations && allNotes.length < maxNotes) {
      const result = await fetchUserNotes(userId, cookie);

      allNotes.push(...result.notes);
      cursor = result.cursor;
      hasMore = result.hasMore;
      fetchCount++;

      // 添加延迟避免限流
      if (hasMore && fetchCount < maxIterations) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (allNotes.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未获取到笔记，请确认 Cookie 是否有效（可能已过期）',
      }, { status: 200 });
    }

    const userNickname = allNotes[0]?.user?.nickname || '未知用户';
    const formattedNotes = formatNotes(allNotes, userNickname);

    return NextResponse.json({
      success: true,
      posts: formattedNotes,
      count: formattedNotes.length,
      userId,
      userNickname,
      hasMore: allNotes.length >= maxNotes && hasMore,
    });
  } catch (error: unknown) {
    console.error('Scrape error:', error);
    const message = error instanceof Error ? error.message : '爬取失败';
    return NextResponse.json({ error: message }, { status: 200 });
  }
}
