'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutDashboard,
  Network,
  Sparkles,
  Upload,
  Settings,
  PieChart,
  Zap,
  ArrowRightLeft,
  Info,
  FileText,
  Loader2,
  Cpu,
  Wand2,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageCircleQuestion,
  ExternalLink,
} from 'lucide-react';
import NetworkGraph from '@/components/NetworkGraph';

// 聚类颜色
const CLUSTER_COLORS: Record<number, string> = {
  0: '#FF6B6B',
  1: '#4DABF7',
  2: '#51CF66',
  3: '#FCC419',
  4: '#CC5DE8',
  5: '#FF8C42',
  6: '#20C997',
  7: '#F472B6',
  8: '#A3E635',
  9: '#818CF8',
};

interface PostItem {
  id: string;
  title: string;
  author?: string;
  link?: string;
  likes?: string;
  collects?: string;
  publishTime?: string;
  description?: string;
  comments?: string;
  shares?: string;
  topics?: string;
}

interface ClusterResult {
  id: string;
  title: string;
  cluster: number;
  x: number;
  y: number;
  author?: string;
  link?: string;
  likes?: string;
  collects?: string;
  publishTime?: string;
  description?: string;
}

interface ClusterInfo {
  id: number;
  name: string;
  color: string;
  count: number;
  tags: string[];
  summary: string;
}

// 导航项组件
function NavItem({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all relative group ${
        active
          ? 'bg-white/10 text-white'
          : disabled
          ? 'opacity-20 cursor-not-allowed'
          : 'text-white/40 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      {!disabled && (
        <div className="absolute left-14 px-2 py-1 bg-white text-black text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </button>
  );
}

// 功能小卡片
function FeatureSmall({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center p-4">
      <div className="mb-3">{icon}</div>
      <div className="text-sm font-bold mb-1">{title}</div>
      <div className="text-[11px] text-white/30">{desc}</div>
    </div>
  );
}

// 统计卡片
function StatCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
      <p className="text-white/40 text-[11px] mb-1">{title}</p>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-[10px] text-white/30">{detail}</div>
    </div>
  );
}

// 放置区域
function DropZone({
  cluster,
  onClear,
  placeholder,
}: {
  cluster: ClusterInfo | null;
  onClear: () => void;
  placeholder: string;
}) {
  return (
    <div
      className={`w-48 h-56 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center transition-all ${
        cluster
          ? 'bg-white/10 border-white/30'
          : 'border-white/10 text-white/20'
      }`}
    >
      {cluster ? (
        <>
          <div
            className="w-12 h-12 rounded-xl mb-3"
            style={{ backgroundColor: cluster.color }}
          />
          <div className="font-bold text-sm mb-1">{cluster.name}</div>
          <button
            onClick={onClear}
            className="text-[10px] text-red-400 mt-2 hover:text-red-300"
          >
            移除
          </button>
        </>
      ) : (
        <span>{placeholder}</span>
      )}
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'graph' | 'ai' | 'qa'>('dashboard');
  const [hasData, setHasData] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 数据状态
  const [inputText, setInputText] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [clusterCount, setClusterCount] = useState(5);
  const [autoCluster, setAutoCluster] = useState(true);
  const [embeddingProvider, setEmbeddingProvider] = useState<'dashscope' | 'bge'>('dashscope');
  const [results, setResults] = useState<ClusterResult[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ClusterResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [silhouetteScore, setSilhouetteScore] = useState<number | null>(null);
  const [actualClusterCount, setActualClusterCount] = useState<number>(0);

  // 数据输入方式
  const [inputMethod, setInputMethod] = useState<'upload' | 'scrape'>('upload');

  // 爬取状态
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeCookie, setScrapeCookie] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedUser, setScrapedUser] = useState<string>('');
  const [clusterNames, setClusterNames] = useState<Record<number, string>>({});

  // AI 联想状态
  const [selectedClustersForAI, setSelectedClustersForAI] = useState<(ClusterInfo | null)[]>([null, null]);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [aiIdea, setAiIdea] = useState('');

  // 智能问答状态
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [references, setReferences] = useState<Array<{ title: string; author?: string; link?: string }>>([]);
  const [isAsking, setIsAsking] = useState(false);

  // 帖子联想状态
  const [selectedPosts, setSelectedPosts] = useState<(ClusterResult | null)[]>([null, null]);
  const [postInsight, setPostInsight] = useState('');
  const [isGeneratingPostInsight, setIsGeneratingPostInsight] = useState(false);

  // 智能问答处理函数
  const askQuestion = async () => {
    if (!question.trim() || isAsking) return;

    setIsAsking(true);
    setAnswer('');
    setReferences([]);

    try {
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          items: results.map((r) => ({
            title: r.title,
            author: r.author,
            link: r.link,
          })),
          topK: 5,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setAnswer(`抱歉，发生了错误：${data.error}`);
      } else {
        setAnswer(data.answer || '抱歉，未能找到相关回答。');
        setReferences(data.references || []);
      }
    } catch (error) {
      console.error('QA error:', error);
      setAnswer('抱歉，网络请求失败了，请稍后重试。');
    } finally {
      setIsAsking(false);
    }
  };

  // 帖子联想处理函数
  const startPostInsight = async () => {
    if (!selectedPosts[0] || !selectedPosts[1]) {
      setError('请在图谱中点击选择两个帖子');
      return;
    }

    setIsGeneratingPostInsight(true);
    setPostInsight('');
    setError(null);

    try {
      const response = await fetch('/api/post-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post1: {
            title: selectedPosts[0].title,
            author: selectedPosts[0].author,
            content: selectedPosts[0].description,
          },
          post2: {
            title: selectedPosts[1].title,
            author: selectedPosts[1].author,
            content: selectedPosts[1].description,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  setPostInsight((prev) => prev + data.text);
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Post insight error:', error);
      setPostInsight('抱歉，联想生成失败了，请稍后重试。');
    } finally {
      setIsGeneratingPostInsight(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 聚类信息
  const clusterInfos: ClusterInfo[] = useMemo(() => {
    const groups: Record<number, ClusterResult[]> = {};
    results.forEach((item) => {
      if (!groups[item.cluster]) {
        groups[item.cluster] = [];
      }
      groups[item.cluster].push(item);
    });

    return Object.entries(groups).map(([cluster, items]) => ({
      id: parseInt(cluster),
      name: clusterNames[parseInt(cluster)] || `聚类 ${parseInt(cluster) + 1}`,
      color: CLUSTER_COLORS[parseInt(cluster) % 10],
      count: items.length,
      tags: items.slice(0, 3).map((i) => i.title.slice(0, 6)),
      summary: items[0]?.title.slice(0, 20) + '...',
    }));
  }, [results, clusterNames]);

  // 解析 CSV 文件
  const parseCSV = useCallback((csvText: string): PostItem[] => {
    // 正确的 CSV 行分割：支持字段内换行
    const csvLines: string[] = [];
    let currentLine = '';
    let quoteCount = 0;
    for (const ch of csvText) {
      if (ch === '"') quoteCount++;
      if (ch === '\n' && quoteCount % 2 === 0) {
        csvLines.push(currentLine);
        currentLine = '';
      } else {
        currentLine += ch;
      }
    }
    if (currentLine.trim()) csvLines.push(currentLine);

    if (csvLines.length < 2) return [];

    const headers = csvLines[0].split(',').map((h) => h.replace(/"/g, '').trim());

    const titleIndex = headers.findIndex((h) => h === '标题');
    const idIndex = headers.findIndex((h) => h === '笔记ID');
    const authorIndex = headers.findIndex((h) => h === '作者');
    const linkIndex = headers.findIndex((h) => h === '笔记链接');
    const likesIndex = headers.findIndex((h) => h === '点赞数');
    const collectsIndex = headers.findIndex((h) => h === '收藏数');
    const publishTimeIndex = headers.findIndex((h) => h === '发布时间');
    const descIndex = headers.findIndex((h) => h === '笔记描述');

    const posts: PostItem[] = [];

    for (let i = 1; i < csvLines.length; i++) {
      let line = csvLines[i];
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());

      const title = titleIndex >= 0 ? values[titleIndex] : '';
      if (title) {
        posts.push({
          id: idIndex >= 0 ? values[idIndex] : `post-${i}`,
          title,
          author: authorIndex >= 0 ? values[authorIndex] : undefined,
          link: linkIndex >= 0 ? values[linkIndex] : undefined,
          likes: likesIndex >= 0 ? values[likesIndex] : undefined,
          collects: collectsIndex >= 0 ? values[collectsIndex] : undefined,
          publishTime: publishTimeIndex >= 0 ? values[publishTimeIndex] : undefined,
          description: descIndex >= 0 ? values[descIndex] : undefined,
        });
      }
    }

    return posts;
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const posts = parseCSV(text);
      if (posts.length > 0) {
        setJsonInput(JSON.stringify(posts, null, 2));
      } else {
        setError('无法解析CSV文件，请检查文件格式');
      }
    };
    reader.readAsText(file);
  }, [parseCSV]);

  const handleScrape = useCallback(async () => {
    if (!scrapeUrl.trim()) {
      setError('请输入小红书用户主页 URL');
      return;
    }

    setIsScraping(true);
    setError(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileUrl: scrapeUrl.trim(),
          cookie: scrapeCookie.trim(),
          maxNotes: 100,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.posts && data.posts.length > 0) {
        setJsonInput(JSON.stringify(data.posts, null, 2));
        setScrapedUser(data.userNickname || '未知用户');
        setFileName(`爬取自 ${data.userNickname} 的笔记 (${data.count} 条)`);
      } else {
        throw new Error('未找到任何笔记，请确认 URL 是否正确');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '爬取失败');
    } finally {
      setIsScraping(false);
    }
  }, [scrapeUrl, scrapeCookie]);

  const parseInput = useCallback((): PostItem[] => {
    if (jsonInput.trim()) {
      try {
        const jsonData = JSON.parse(jsonInput);
        if (Array.isArray(jsonData)) {
          return jsonData
            .map((item, index) => {
              if (typeof item === 'string') {
                return { id: `post-${index}`, title: item };
              }
              return {
                id: item.id || item.笔记ID || `post-${index}`,
                title: item.title || item.标题 || '',
                author: item.author || item.作者,
                link: item.link || item.笔记链接,
                likes: item.likes || item.点赞数,
                collects: item.collects || item.收藏数,
                publishTime: item.publishTime || item.发布时间,
                description: item.description || item.笔记描述,
              };
            })
            .filter((p) => p.title);
        }
      } catch {
        // 继续尝试文本解析
      }
    }

    const lines = inputText.split('\n').filter((line) => line.trim());
    return lines.map((line, index) => ({
      id: `post-${index}`,
      title: line.trim(),
    }));
  }, [inputText, jsonInput]);

  const handleProcess = useCallback(async () => {
    const posts = parseInput();

    if (posts.length === 0) {
      setError('请输入至少一条收藏内容');
      return;
    }

    setIsUploading(true);
    setLoadingMessage(embeddingProvider === 'bge' ? '加载 BGE 中文模型...' : '正在向量化...');
    setError(null);
    setResults([]);
    setSilhouetteScore(null);

    try {
      setLoadingMessage('正在向量化内容...');
      const embedResponse = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: posts.map((p) => {
            if (!p.title && !p.description) return '';
            if (!p.title) return p.description || '';
            if (!p.description) return p.title;
            return `${p.title}。${p.description}`;
          }),
          provider: embeddingProvider,
        }),
      });

      if (!embedResponse.ok) {
        const errData = await embedResponse.json();
        throw new Error(errData.error || '向量化失败');
      }

      const embedData = await embedResponse.json();
      const embeddings = embedData.embeddings;

      setLoadingMessage('正在聚类分析...');
      const clusterResponse = await fetch('/api/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeddings,
          clusterCount: Math.min(clusterCount, posts.length),
          autoCluster,
        }),
      });

      if (!clusterResponse.ok) {
        const errData = await clusterResponse.json();
        throw new Error(errData.error || '聚类失败');
      }

      const clusterData = await clusterResponse.json();

      const combinedResults: ClusterResult[] = posts.map((post, index) => ({
        id: post.id,
        title: post.title,
        cluster: clusterData.labels[index],
        x: clusterData.positions[index][0],
        y: clusterData.positions[index][1],
        author: post.author,
        link: post.link,
        likes: post.likes,
        collects: post.collects,
        publishTime: post.publishTime,
        description: post.description,
      }));

      setResults(combinedResults);
      setSilhouetteScore(clusterData.silhouetteScore);
      setActualClusterCount(clusterData.clusterCount);
      setHasData(true);
      setActiveTab('dashboard');

      // 调用聚类命名 API
      try {
        setLoadingMessage('正在生成聚类名称...');
        const groups: Record<number, typeof posts> = {};
        combinedResults.forEach((item) => {
          if (!groups[item.cluster]) {
            groups[item.cluster] = [];
          }
          groups[item.cluster].push(item);
        });

        const clusterItems = Object.entries(groups).map(([id, items]) => ({
          id: parseInt(id),
          items: items.slice(0, 10).map((item) => ({
            title: item.title,
            author: item.author,
            likes: item.likes,
          })),
        }));

        const nameResponse = await fetch('/api/cluster-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clusters: clusterItems }),
        });

        if (nameResponse.ok) {
          const nameData = await nameResponse.json();
          const names: Record<number, string> = {};
          nameData.clusters.forEach((c: { id: number; name: string }) => {
            names[c.id] = c.name;
          });
          setClusterNames(names);
        }
      } catch {
        // 命名失败不影响主流程，使用默认名称
        console.log('聚类命名失败，使用默认名称');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setIsUploading(false);
      setLoadingMessage('');
    }
  }, [parseInput, clusterCount, autoCluster, embeddingProvider]);

  const handleClear = useCallback(() => {
    setInputText('');
    setJsonInput('');
    setResults([]);
    setError(null);
    setSelectedCluster(null);
    setFileName('');
    setSilhouetteScore(null);
    setActualClusterCount(0);
    setClusterNames({});
    setHasData(false);
    setActiveTab('dashboard');
    setSelectedClustersForAI([null, null]);
    setAiIdea('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // AI 联想生成
  const generateAIInsight = useCallback(async () => {
    if (!selectedClustersForAI[0] || !selectedClustersForAI[1]) return;
    
    setIsGeneratingIdea(true);
    setAiIdea('');

    try {
      const prompt = `我有两个小红书收藏夹聚类：
1. "${selectedClustersForAI[0].name}" - 包含 ${selectedClustersForAI[0].count} 条内容，标签：${selectedClustersForAI[0].tags.join('、')}
2. "${selectedClustersForAI[1].name}" - 包含 ${selectedClustersForAI[1].count} 条内容，标签：${selectedClustersForAI[1].tags.join('、')}

请给出一个独特的跨界联想创意方案。要求：150字以内，活泼的小红书语境，给出具体的创意点子。`;

      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('AI 联想生成失败');
      }

      const data = await response.json();
      setAiIdea(data.result || '生成成功，但无返回内容');
    } catch (err) {
      setAiIdea('联想失败，请稍后重试。');
    } finally {
      setIsGeneratingIdea(false);
    }
  }, [selectedClustersForAI]);

  const clusterGroups = useMemo(() => {
    const groups: Record<number, ClusterResult[]> = {};
    results.forEach((item) => {
      if (!groups[item.cluster]) {
        groups[item.cluster] = [];
      }
      groups[item.cluster].push(item);
    });
    return groups;
  }, [results]);

  return (
    <div className="flex h-screen bg-[#0f0f12] text-slate-200 font-sans overflow-hidden text-[14px]">
      {/* 侧边导航栏 */}
      <aside className="w-20 border-r border-white/10 flex flex-col items-center py-8 gap-8 bg-[#0f0f12] z-20">
        <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
          <Sparkles className="text-white" size={24} />
        </div>
        <nav className="flex flex-col gap-6">
          <NavItem
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={22} />}
            label="总览"
          />
          <NavItem
            active={activeTab === 'graph'}
            disabled={!hasData}
            onClick={() => hasData && setActiveTab('graph')}
            icon={<Network size={22} />}
            label="图谱"
          />
          <NavItem
            active={activeTab === 'ai'}
            disabled={!hasData}
            onClick={() => hasData && setActiveTab('ai')}
            icon={<Zap size={22} />}
            label="联想"
          />
          <NavItem
            active={activeTab === 'qa'}
            disabled={!hasData}
            onClick={() => hasData && setActiveTab('qa')}
            icon={<MessageCircleQuestion size={22} />}
            label="问答"
          />
        </nav>
        <div className="mt-auto">
          <NavItem
            onClick={handleClear}
            icon={<Settings size={22} />}
            label="重置"
          />
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* 顶部栏 */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#0f0f12]/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              {!hasData
                ? '欢迎使用 RedNote AI'
                : activeTab === 'dashboard'
                ? '数据洞察中心'
                : activeTab === 'graph'
                ? '知识图谱交互'
                : 'AI 跨界联想'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {hasData && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-sm"
              >
                <Upload size={14} />
                <span>更新数据</span>
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
            />
          </div>
        </header>

        {/* 核心内容展示 */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {!hasData ? (
            /* 上传数据的起始页 */
            <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto text-center">
              {/* 输入方式切换 Tab */}
              <div className="mb-8">
                <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as 'upload' | 'scrape')}>
                  <TabsList className="bg-white/5 h-10 px-1 rounded-xl">
                    <TabsTrigger
                      value="upload"
                      className="data-[state=active]:bg-white/10 rounded-lg px-6 text-sm"
                    >
                      <Upload size={16} className="mr-2" />
                      上传 CSV
                    </TabsTrigger>
                    <TabsTrigger
                      value="scrape"
                      className="data-[state=active]:bg-white/10 rounded-lg px-6 text-sm"
                    >
                      <Network size={16} className="mr-2" />
                      爬取用户
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* 上传 CSV 模式 */}
              {inputMethod === 'upload' && (
                <div className="relative mb-12 group">
                  <div className="absolute -inset-4 bg-red-500/20 rounded-[40px] blur-3xl group-hover:bg-red-500/30 transition-all duration-500" />
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className="relative w-72 h-72 bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 rounded-[40px] flex flex-col items-center justify-center cursor-pointer hover:border-red-500/50 hover:scale-[1.02] transition-all group shadow-2xl"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="text-red-500 animate-spin" size={48} />
                        <div className="text-lg font-medium">{loadingMessage || '处理中...'}</div>
                        <div className="text-xs text-white/40">向量化提取与降维聚类中</div>
                      </div>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <Upload className="text-red-500" size={36} />
                        </div>
                        <div className="text-xl font-bold mb-2">上传小红书 CSV</div>
                        <p className="text-white/40 text-sm px-8">
                          拖拽文件到此处或点击浏览
                          <br />
                          支持从"设置-账号-个人信息下载"导出的数据
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 爬取用户模式 */}
              {inputMethod === 'scrape' && (
                <div className="w-full max-w-lg mb-12">
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-red-500/20 rounded-[40px] blur-3xl group-hover:bg-red-500/30 transition-all duration-500" />
                    <div className="relative bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 rounded-[40px] p-8 shadow-2xl">
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Network className="text-red-500" size={28} />
                          </div>
                          <div className="text-lg font-bold">爬取用户笔记</div>
                          <p className="text-white/40 text-xs mt-2">
                            需要 Cookie 才能获取笔记列表
                          </p>
                        </div>

                        <div className="space-y-4 text-left">
                          <div>
                            <Label className="text-white/70 text-xs mb-1 block">用户主页 URL</Label>
                            <Input
                              placeholder="https://www.xiaohongshu.com/user/profile/xxx"
                              value={scrapeUrl}
                              onChange={(e) => setScrapeUrl(e.target.value)}
                              className="bg-white/5 border-white/10 text-white text-sm h-10"
                            />
                          </div>

                          <div>
                            <Label className="text-white/70 text-xs mb-1 block">
                              Cookie <span className="text-red-400">*必填</span>
                            </Label>
                            <Textarea
                              placeholder="从浏览器开发者工具复制完整 Cookie"
                              value={scrapeCookie}
                              onChange={(e) => setScrapeCookie(e.target.value)}
                              className="bg-white/5 border-white/10 text-white text-xs h-16 resize-none font-mono"
                            />
                            <p className="text-white/30 text-[10px] mt-1">
                              获取方法：登录小红书网页版 → F12 → Application → Cookies → 复制全部 Cookie
                            </p>
                          </div>

                          <Button
                            onClick={handleScrape}
                            disabled={isScraping}
                            className="w-full bg-red-500 hover:bg-red-600 text-white h-10"
                          >
                            {isScraping ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                爬取中...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                开始爬取
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 文件已选择或手动输入 */}
              {(fileName || jsonInput || inputText) && !isUploading && !isScraping && (
                <div className="w-full max-w-lg mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="space-y-4">
                    {fileName && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-red-500" />
                        <span className="text-white/70">{fileName}</span>
                      </div>
                    )}

                    <Tabs defaultValue="json" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-white/5 h-8">
                        <TabsTrigger value="json" className="text-xs">JSON 预览</TabsTrigger>
                        <TabsTrigger value="text" className="text-xs">手动输入</TabsTrigger>
                      </TabsList>
                      <TabsContent value="json">
                        <Textarea
                          placeholder="JSON 数据..."
                          value={jsonExpanded ? jsonInput : (() => {
                            try {
                              const data = JSON.parse(jsonInput);
                              if (Array.isArray(data) && data.length > 5) {
                                return JSON.stringify(data.slice(0, 5), null, 2) + `\n\n... 共 ${data.length} 条，点击下方展开查看全部`;
                              }
                            } catch {}
                            return jsonInput;
                          })()}
                          onChange={(e) => setJsonInput(e.target.value)}
                          className="min-h-[120px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-xs"
                          readOnly={!jsonExpanded}
                        />
                        {(() => {
                          try {
                            const data = JSON.parse(jsonInput);
                            if (Array.isArray(data) && data.length > 5) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setJsonExpanded(!jsonExpanded)}
                                  className="mt-2 flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
                                >
                                  {jsonExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  {jsonExpanded ? '收起' : `展开全部 ${data.length} 条`}
                                </button>
                              );
                            }
                          } catch {}
                          return null;
                        })()}
                      </TabsContent>
                      <TabsContent value="text">
                        <Textarea
                          placeholder="每行一条标题..."
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          className="min-h-[120px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        />
                      </TabsContent>
                    </Tabs>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-white/50 text-xs flex items-center gap-1">
                          <Cpu className="h-3 w-3" />
                          模型
                        </Label>
                        <Select
                          value={embeddingProvider}
                          onValueChange={(v) => setEmbeddingProvider(v as 'dashscope' | 'bge')}
                        >
                          <SelectTrigger className="w-36 h-7 bg-white/5 border-white/10 text-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-white/10">
                            <SelectItem value="dashscope" className="text-white text-xs">
                              百炼 Embedding
                            </SelectItem>
                            <SelectItem value="bge" className="text-white text-xs">
                              BGE-small-zh
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-white/50 text-xs">自动聚类</Label>
                        <Switch checked={autoCluster} onCheckedChange={setAutoCluster} />
                      </div>

                      {!autoCluster && (
                        <Input
                          type="number"
                          min={2}
                          max={20}
                          value={clusterCount}
                          onChange={(e) => setClusterCount(parseInt(e.target.value) || 5)}
                          className="w-16 h-7 bg-white/5 border-white/10 text-white text-xs"
                        />
                      )}
                    </div>

                    {error && (
                      <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                        {error}
                      </div>
                    )}

                    <Button
                      onClick={handleProcess}
                      disabled={isUploading}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-medium"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {loadingMessage}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          开始分析
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-8 w-full">
                <FeatureSmall
                  icon={<FileText className="text-blue-400" />}
                  title="标题提取"
                  desc="从收藏夹中自动提取笔记标题"
                />
                <FeatureSmall
                  icon={<Network className="text-purple-400" />}
                  title="语义聚类"
                  desc="通过向量化技术进行智能分类"
                />
                <FeatureSmall
                  icon={<Zap className="text-yellow-400" />}
                  title="联想提示"
                  desc="AI 驱动跨界灵感生成"
                />
              </div>
            </div>
          ) : (
            /* 已上传数据后的视图 */
            <div className="animate-in fade-in duration-700">
              {/* 总览视图 */}
              {activeTab === 'dashboard' && (
                <div className="max-w-7xl mx-auto space-y-8">
                  <div className="grid grid-cols-4 gap-6">
                    <StatCard
                      title="总收藏数"
                      value={results.length}
                      detail="已成功分析"
                    />
                    <StatCard
                      title="聚类数量"
                      value={actualClusterCount}
                      detail="由 AI 赋能"
                    />
                    <StatCard
                      title="平均置信度"
                      value={silhouetteScore?.toFixed(3) || '-'}
                      detail="语义匹配度"
                    />
                    <StatCard
                      title="向量化模型"
                      value={embeddingProvider === 'bge' ? 'BGE' : '百炼'}
                      detail="中文优化"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-8">
                    <div className="col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 h-80 flex flex-col">
                      <h3 className="font-semibold mb-6 flex items-center gap-2">
                        <PieChart size={18} /> 聚类分布
                      </h3>
                      <div className="flex-1 flex items-end justify-between px-4 pb-2">
                        {Object.entries(clusterGroups).map(([cluster, items], i) => {
                          const maxCount = Math.max(...Object.values(clusterGroups).map((g) => g.length));
                          const height = (items.length / maxCount) * 100;
                          return (
                            <div
                              key={cluster}
                              className="flex flex-col items-center gap-2"
                            >
                              <div
                                className="w-10 rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                                style={{
                                  height: `${height}%`,
                                  backgroundColor: CLUSTER_COLORS[parseInt(cluster) % 10],
                                  minHeight: '20px',
                                }}
                                onClick={() => setSelectedCluster(parseInt(cluster))}
                              />
                              <span className="text-[10px] text-white/40">{items.length}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-80 overflow-hidden flex flex-col">
                      <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
                        <Info size={14} /> 聚类摘要预览
                      </h3>
                      <ScrollArea className="flex-1 pr-2">
                        <div className="space-y-4">
                          {clusterInfos.map((c) => (
                            <div
                              key={c.id}
                              className="border-l-2 pl-3 py-1 hover:bg-white/5 rounded-r-lg transition-colors cursor-pointer"
                              style={{ borderColor: c.color }}
                              onClick={() => {
                                setActiveTab('graph');
                                setSelectedCluster(c.id);
                              }}
                            >
                              <div className="text-xs font-bold">{c.name}</div>
                              <div className="text-[10px] text-white/40 italic line-clamp-1">
                                {c.summary}
                              </div>
                              <div className="text-[10px] text-white/30 mt-1">
                                {c.count} 条内容
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>

                  {/* 详细列表 */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <h3 className="font-semibold mb-4 text-sm">收藏列表</h3>
                    <ScrollArea className="h-[200px]">
                      <div className="grid grid-cols-2 gap-2">
                        {results
                          .filter((r) => selectedCluster === null || r.cluster === selectedCluster)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: CLUSTER_COLORS[item.cluster % 10] }}
                              />
                              <span className="text-xs truncate">{item.title}</span>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* 知识图谱视图 */}
              {activeTab === 'graph' && (
                <div className="flex flex-col h-full gap-4">
                  {/* 图谱区域 */}
                  <div className="flex-1 relative bg-white/5 border border-white/10 rounded-3xl min-h-[500px]">
                    <NetworkGraph
                      data={results}
                      selectedCluster={selectedCluster}
                      onSelectCluster={setSelectedCluster}
                      onSelectNode={setHoveredNode}
                      clusterNames={clusterNames}
                      selectedPosts={selectedPosts}
                      onSelectPost={setSelectedPosts}
                    />

                    {/* 悬停节点详情 */}
                    {hoveredNode && !selectedPosts.some(p => p?.id === hoveredNode.id) && (
                      <div className="absolute top-6 right-6 p-4 bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 w-64">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CLUSTER_COLORS[hoveredNode.cluster % 10] }}
                          />
                          <span className="text-xs text-white/50">
                            {clusterNames[hoveredNode.cluster] || `聚类 ${hoveredNode.cluster + 1}`}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm mb-2">{hoveredNode.title}</h4>
                        {hoveredNode.author && (
                          <p className="text-xs text-white/40">@{hoveredNode.author}</p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button
                            disabled={selectedPosts.filter(Boolean).length >= 2}
                            onClick={() => {
                              if (!selectedPosts[0]) {
                                setSelectedPosts([hoveredNode, selectedPosts[1]]);
                              } else if (!selectedPosts[1]) {
                                setSelectedPosts([selectedPosts[0], hoveredNode]);
                              }
                            }}
                            className={`text-xs px-3 py-1 rounded-full transition-all ${
                              selectedPosts.filter(Boolean).length < 2
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer'
                                : 'bg-white/5 text-white/30 cursor-not-allowed'
                            }`}
                          >
                            {selectedPosts[0] ? '选为帖子2' : '选为帖子1'}
                          </button>
                          {hoveredNode.link && (
                            <a
                              href={hoveredNode.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-white/50 hover:text-red-400 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-all"
                            >
                              查看原文 →
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 帖子联想面板 */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    {/* 已选帖子 */}
                    {selectedPosts.some(Boolean) ? (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-white/60 flex items-center gap-2">
                            <Wand2 className="w-4 h-4" />
                            已选择 {selectedPosts.filter(Boolean).length}/2 个帖子
                          </h3>
                          <button
                            onClick={() => setSelectedPosts([null, null])}
                            className="text-xs text-white/40 hover:text-white flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            清除选择
                          </button>
                        </div>
                        <div className="flex gap-4">
                          {[0, 1].map(index => (
                            selectedPosts[index] ? (
                              <div
                                key={index}
                                className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs text-white/40">帖子 {index + 1}</span>
                                  <button
                                    onClick={() => {
                                      const newSelected = [...selectedPosts];
                                      newSelected[index] = null;
                                      setSelectedPosts(newSelected);
                                    }}
                                    className="text-white/40 hover:text-white ml-auto"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <p className="text-sm mb-2">{selectedPosts[index].title}</p>
                                {selectedPosts[index].author && (
                                  <p className="text-xs text-white/30">@{selectedPosts[index].author}</p>
                                )}
                              </div>
                            ) : (
                              <div
                                key={index}
                                className="flex-1 p-4 bg-white/5 rounded-xl border border-dashed border-white/10 flex items-center justify-center"
                              >
                                <span className="text-xs text-white/30">
                                  {index === 0 ? '在图谱中点击第一个帖子' : '在图谱中点击第二个帖子'}
                                </span>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 mb-4">
                        <p className="text-sm text-white/40">在图谱中点击帖子或悬停后选择来开始联想</p>
                      </div>
                    )}

                    {/* 联想按钮和结果 */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        {/* 联想结果 */}
                        {(postInsight || isGeneratingPostInsight) && (
                          <div className="p-4 bg-black/40 rounded-xl border border-white/10">
                            <h4 className="text-xs font-medium text-white/40 mb-2 flex items-center gap-2">
                              <Sparkles className="w-3 h-3" />
                              创意灵感
                            </h4>
                            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                              {postInsight}
                              {isGeneratingPostInsight && (
                                <span className="inline-block animate-pulse text-red-400 ml-1">|</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 联想按钮 */}
                      <div className="flex items-start">
                        <button
                          disabled={!selectedPosts[0] || !selectedPosts[1] || isGeneratingPostInsight}
                          onClick={startPostInsight}
                          className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${
                            selectedPosts[0] && selectedPosts[1]
                              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 cursor-pointer'
                              : 'bg-white/10 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          {isGeneratingPostInsight ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4" />
                              帖子联想
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI 联想视图 */}
              {activeTab === 'ai' && (
                <div className="h-full flex flex-col max-w-4xl mx-auto pb-12">
                  <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold mb-2">AI 跨界联想实验室</h2>
                    <p className="text-white/40 text-sm">选择下方聚类，由 AI 寻找跨界联系</p>
                  </div>

                  <div className="flex items-center justify-center gap-8 mb-10">
                    <DropZone
                      cluster={selectedClustersForAI[0]}
                      onClear={() => setSelectedClustersForAI([null, selectedClustersForAI[1]])}
                      placeholder="聚类 A"
                    />
                    <ArrowRightLeft className="text-white/20" />
                    <DropZone
                      cluster={selectedClustersForAI[1]}
                      onClear={() => setSelectedClustersForAI([selectedClustersForAI[0], null])}
                      placeholder="聚类 B"
                    />
                  </div>

                  <div className="flex justify-center mb-10">
                    <button
                      disabled={
                        !selectedClustersForAI[0] ||
                        !selectedClustersForAI[1] ||
                        isGeneratingIdea
                      }
                      onClick={generateAIInsight}
                      className={`px-10 py-3 rounded-full font-bold flex items-center gap-3 transition-all ${
                        selectedClustersForAI[0] && selectedClustersForAI[1]
                          ? 'bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20'
                          : 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed'
                      }`}
                    >
                      {isGeneratingIdea ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Sparkles size={20} />
                      )}
                      {isGeneratingIdea ? 'AI 正在联想...' : '开始联想'}
                    </button>
                  </div>

                  {aiIdea && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-in slide-in-from-bottom-2 duration-500">
                      <div className="flex items-center gap-2 text-indigo-400 mb-3 text-xs font-bold uppercase">
                        <Zap size={14} /> 联想洞察
                      </div>
                      <p className="text-sm leading-relaxed text-white/80">{aiIdea}</p>
                    </div>
                  )}

                  <div className="mt-10 grid grid-cols-4 gap-4">
                    {clusterInfos.map((cluster) => (
                      <button
                        key={cluster.id}
                        onClick={() => {
                          const isSelected = selectedClustersForAI.find(
                            (c) => c?.id === cluster.id
                          );
                          if (isSelected) {
                            setSelectedClustersForAI(
                              selectedClustersForAI.filter((c) => c?.id !== cluster.id) as [
                                ClusterInfo | null,
                                ClusterInfo | null
                              ]
                            );
                          } else if (!selectedClustersForAI[0]) {
                            setSelectedClustersForAI([cluster, selectedClustersForAI[1]]);
                          } else if (!selectedClustersForAI[1]) {
                            setSelectedClustersForAI([selectedClustersForAI[0], cluster]);
                          } else {
                            // 替换第二个
                            setSelectedClustersForAI([selectedClustersForAI[0], cluster]);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          selectedClustersForAI.find((c) => c?.id === cluster.id)
                            ? 'bg-red-500/10 border-red-500/50'
                            : 'bg-white/5 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div
                          className="w-full h-1 rounded-full mb-2"
                          style={{ backgroundColor: cluster.color }}
                        />
                        <div className="font-bold text-xs truncate">{cluster.name}</div>
                        <div className="text-[10px] text-white/40 mt-1">{cluster.count} 条</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 智能问答视图 */}
              {activeTab === 'qa' && (
                <div className="h-full flex flex-col">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">智能问答</h2>
                    <p className="text-white/40 text-sm">基于收藏内容，AI 智能回答你的问题</p>
                  </div>

                  <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-8">
                    {/* 问题输入 */}
                    <div className="mb-6">
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="输入你的问题，例如：有哪些关于装修的建议？"
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 resize-none focus:outline-none focus:border-red-500/50 transition-colors"
                      />
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={askQuestion}
                          disabled={!question.trim() || isAsking}
                          className={`px-8 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all ${
                            question.trim() && !isAsking
                              ? 'bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20'
                              : 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed'
                          }`}
                        >
                          {isAsking ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <MessageCircleQuestion size={18} />
                          )}
                          {isAsking ? 'AI 正在思考...' : '提问'}
                        </button>
                      </div>
                    </div>

                    {/* 回答区域 */}
                    {(answer || isAsking) && (
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 overflow-auto">
                        {isAsking ? (
                          <div className="flex items-center justify-center h-32">
                            <Loader2 className="animate-spin text-red-500" size={32} />
                          </div>
                        ) : (
                          <>
                            {/* 回答内容 */}
                            <div className="mb-6">
                              <div className="flex items-center gap-2 text-red-400 mb-3 text-xs font-bold uppercase">
                                <MessageCircleQuestion size={14} /> AI 回答
                              </div>
                              <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{answer}</p>
                            </div>

                            {/* 参考来源 */}
                            {references.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 text-white/60 mb-3 text-xs font-bold uppercase">
                                  <FileText size={14} /> 参考来源
                                </div>
                                <div className="space-y-2">
                                  {references.map((ref, index) => (
                                    <div
                                      key={index}
                                      className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all"
                                    >
                                      <span className="text-red-400 font-mono text-xs mt-0.5">[{index + 1}]</span>
                                      <div className="flex-1 min-w-0">
                                        {ref.link ? (
                                          <a
                                            href={ref.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-sm font-medium text-white hover:text-red-400 truncate transition-colors"
                                          >
                                            {ref.title}
                                          </a>
                                        ) : (
                                          <p className="text-sm font-medium text-white truncate">{ref.title}</p>
                                        )}
                                        {ref.author && (
                                          <p className="text-xs text-white/40 mt-1">@{ref.author}</p>
                                        )}
                                      </div>
                                      {ref.link && (
                                        <ExternalLink size={14} className="text-white/30 flex-shrink-0 mt-1" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* 空状态 */}
                    {!answer && !isAsking && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <MessageCircleQuestion className="mx-auto text-white/10 mb-4" size={48} />
                          <p className="text-white/30 text-sm">输入问题，AI 将从收藏内容中寻找答案</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
