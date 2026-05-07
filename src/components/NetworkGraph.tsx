'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  title: string;
  cluster: number;
  x: number;
  y: number;
  author?: string;
  link?: string;
  likes?: string;
  collects?: string;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  strength: number;
}

interface NetworkGraphProps {
  data: Node[];
  selectedCluster: number | null;
  onSelectCluster: (cluster: number | null) => void;
  onSelectNode: (node: Node | null) => void;
  clusterNames?: Record<number, string>;
  selectedPosts?: (Node | null)[];
  onSelectPost?: (posts: (Node | null)[]) => void;
}

// 聚类颜色 - 匹配主题
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

export default function NetworkGraph({
  data,
  selectedCluster,
  onSelectCluster,
  onSelectNode,
  clusterNames = {},
  selectedPosts = [null, null],
  onSelectPost,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // 更新尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 300), height: Math.max(height, 300) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 创建网络图
  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    // 计算聚类中心位置（圆形布局）
    const clusters = [...new Set(data.map((d) => d.cluster))];
    const clusterCenters: Record<number, { x: number; y: number }> = {};
    const clusterRadius = Math.min(width, height) * 0.35;

    clusters.forEach((cluster, i) => {
      const angle = (2 * Math.PI * i) / clusters.length - Math.PI / 2;
      clusterCenters[cluster] = {
        x: centerX + clusterRadius * Math.cos(angle),
        y: centerY + clusterRadius * Math.sin(angle),
      };
    });

    // 创建节点数据
    const nodes: Node[] = data.map((d) => ({
      ...d,
      x: clusterCenters[d.cluster]?.x || centerX,
      y: clusterCenters[d.cluster]?.y || centerY,
    }));

    // 创建连接（同聚类内的节点相互连接）
    const links: Link[] = [];
    const clusterNodes: Record<number, Node[]> = {};

    nodes.forEach((node) => {
      if (!clusterNodes[node.cluster]) {
        clusterNodes[node.cluster] = [];
      }
      clusterNodes[node.cluster].push(node);
    });

    // 每个聚类内创建连接
    Object.entries(clusterNodes).forEach(([cluster, clusterNodeList]) => {
      const n = clusterNodeList.length;
      clusterNodeList.forEach((node, i) => {
        for (let j = i + 1; j < Math.min(i + 3, n); j++) {
          links.push({
            source: node.id,
            target: clusterNodeList[j].id,
            strength: 0.3,
          });
        }
      });
    });

    // 添加聚类间的弱连接
    for (let i = 0; i < clusters.length - 1; i++) {
      const cluster1 = clusterNodes[clusters[i]];
      const cluster2 = clusterNodes[clusters[i + 1]];
      if (cluster1?.length && cluster2?.length) {
        links.push({
          source: cluster1[0].id,
          target: cluster2[0].id,
          strength: 0.05,
        });
      }
    }

    // 创建 SVG 组
    const g = svg.append('g');

    // 添加缩放功能
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // 创建力导向模拟
    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force(
        'link',
        d3
          .forceLink<Node, Link>(links)
          .id((d) => d.id)
          .strength((d) => d.strength)
          .distance(50)
      )
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius(30))
      .force(
        'x',
        d3
          .forceX<Node>((d) => clusterCenters[d.cluster]?.x || centerX)
          .strength(0.1)
      )
      .force(
        'y',
        d3
          .forceY<Node>((d) => clusterCenters[d.cluster]?.y || centerY)
          .strength(0.1)
      );

    // 绘制连线
    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 1)
      .attr('opacity', (d) => {
        const sourceCluster = typeof d.source === 'object' ? d.source.cluster : 0;
        if (selectedCluster === null) return 0.2;
        return sourceCluster === selectedCluster ? 0.4 : 0.05;
      });

    // 绘制节点
    const node = g
      .append('g')
      .selectAll<SVGGElement, Node>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // 节点光晕效果
    node
      .append('circle')
      .attr('r', (d) => {
        const isHighlighted = selectedCluster !== null && d.cluster === selectedCluster;
        const isSelected = selectedPosts?.some((p) => p?.id === d.id);
        if (isSelected) return 24;
        if (isHighlighted) return 20;
        return 14;
      })
      .attr('fill', (d) => CLUSTER_COLORS[d.cluster % 10])
      .attr('opacity', (d) => {
        const isHighlighted = selectedCluster !== null && d.cluster === selectedCluster;
        const isSelected = selectedPosts?.some((p) => p?.id === d.id);
        if (isSelected) return 0.8;
        if (isHighlighted) return 0.5;
        return 0.1;
      })
      .attr('filter', 'blur(6px)');

    // 节点核心
    node
      .append('circle')
      .attr('r', (d) => {
        const isHighlighted = selectedCluster !== null && d.cluster === selectedCluster;
        const isSelected = selectedPosts?.some((p) => p?.id === d.id);
        if (isSelected) return 10;
        if (isHighlighted) return 7;
        return 4;
      })
      .attr('fill', (d) => CLUSTER_COLORS[d.cluster % 10])
      .attr('stroke', (d) => {
        const isHighlighted = selectedCluster !== null && d.cluster === selectedCluster;
        const isSelected = selectedPosts?.some((p) => p?.id === d.id);
        if (isSelected) return '#ffffff';
        if (isHighlighted) return CLUSTER_COLORS[d.cluster % 10];
        return '#0f0f12';
      })
      .attr('stroke-width', (d) => {
        const isHighlighted = selectedCluster !== null && d.cluster === selectedCluster;
        const isSelected = selectedPosts?.some((p) => p?.id === d.id);
        if (isSelected) return 3;
        if (isHighlighted) return 2;
        return 1;
      })
      .attr('opacity', (d) => {
        if (selectedCluster === null) return 1;
        return d.cluster === selectedCluster ? 1 : 0.25;
      });

    // 交互事件
    node
      .on('mouseenter', (event, d) => {
        d3.select(event.currentTarget).raise();
        const isSelected = selectedPosts?.some((p) => p?.id === d.id);
        const isHighlighted = selectedCluster !== null && d.cluster === selectedCluster;
        d3.select(event.currentTarget)
          .select('circle:nth-child(2)')
          .transition()
          .duration(150)
          .attr('r', isSelected ? 12 : isHighlighted ? 10 : 6);
        onSelectNode(d);
      })
      .on('mouseleave', (event) => {
        const d = d3.select(event.currentTarget).datum() as Node;
        const isSelected = selectedPosts?.some((p) => p?.id === d.id);
        const isHighlighted = selectedCluster !== null && d.cluster === selectedCluster;
        d3.select(event.currentTarget)
          .select('circle:nth-child(2)')
          .transition()
          .duration(150)
          .attr('r', isSelected ? 10 : isHighlighted ? 7 : 4);
        onSelectNode(null);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        // 如果按下了 Shift 键，选择帖子
        if (event.shiftKey && onSelectPost) {
          const newSelected = [...(selectedPosts || [null, null])];
          const selectedIndex = newSelected[0] ? 1 : 0;
          newSelected[selectedIndex] = d;
          onSelectPost(newSelected);
        } else {
          // 普通点击切换聚类筛选
          onSelectCluster(selectedCluster === d.cluster ? null : d.cluster);
        }
      });

    // 点击背景取消选择
    svg.on('click', () => {
      onSelectCluster(null);
    });

    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as Node).x)
        .attr('y1', (d) => (d.source as Node).y)
        .attr('x2', (d) => (d.target as Node).x)
        .attr('y2', (d) => (d.target as Node).y);

      node.attr('transform', (d) => `translate(${d.x}, ${d.y})`);
    });

    // 运行一段时间后停止
    setTimeout(() => {
      simulation.stop();
    }, 3000);

    return () => {
      simulation.stop();
    };
  }, [data, dimensions, selectedCluster, onSelectCluster, onSelectNode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0f0f12] rounded-3xl"
      style={{ minHeight: '400px' }}
    >
      {/* 聚类光晕背景 */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        {data.length > 0 &&
          [...new Set(data.map((d) => d.cluster))].map((cluster, i) => (
            <div
              key={cluster}
              className="absolute rounded-full blur-3xl animate-pulse"
              style={{
                backgroundColor: CLUSTER_COLORS[cluster % 10],
                width: '100px',
                height: '100px',
                top: `${20 + (i * 18) % 60}%`,
                left: `${15 + (i * 25) % 70}%`,
                opacity: 0.2,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
      </div>

      {/* 图例 */}
      <div className="absolute top-6 left-6 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 w-64">
        <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-500" />
          语义地图
        </h4>
        <p className="text-[10px] text-white/50 leading-relaxed">
          基于 BGE 模型。节点越近表示标题语义越接近。点击节点可筛选笔记。
        </p>
      </div>

      {/* 聚类标签 */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 items-end">
        {[...new Set(data.map((d) => d.cluster))].map((cluster) => {
          const count = data.filter((d) => d.cluster === cluster).length;
          return (
            <div
              key={cluster}
              onClick={() =>
                onSelectCluster(selectedCluster === cluster ? null : cluster)
              }
              className={`flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md border rounded-xl cursor-pointer hover:bg-white/10 transition-all ${
                selectedCluster === cluster ? 'border-red-500/50' : 'border-white/10'
              }`}
            >
              <span className="text-xs font-medium">
                {clusterNames[cluster] || `聚类 ${cluster + 1}`}
              </span>
              <span className="text-xs text-white/40">{count}</span>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CLUSTER_COLORS[cluster % 10] }}
              />
            </div>
          );
        })}
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="relative z-10"
      />

      {/* 操作提示 */}
      <div className="absolute bottom-6 left-6 text-white/30 text-xs z-20">
        拖拽节点调整位置 · 滚轮缩放 · 点击筛选
      </div>
    </div>
  );
}
