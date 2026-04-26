import { NextRequest, NextResponse } from 'next/server';

// ==================== 距离和相似度计算 ====================

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==================== K-Means 聚类 ====================

function kMeansClustering(
  embeddings: number[][],
  k: number,
  maxIterations: number = 100
): { labels: number[]; centroids: number[][] } {
  const n = embeddings.length;
  if (n === 0) return { labels: [], centroids: [] };
  const dim = embeddings[0].length;

  // K-Means++ 初始化
  const centroidIndices: number[] = [Math.floor(Math.random() * n)];
  
  while (centroidIndices.length < k) {
    const distances: number[] = [];
    for (let i = 0; i < n; i++) {
      if (centroidIndices.includes(i)) {
        distances.push(0);
        continue;
      }
      const minDist = Math.min(
        ...centroidIndices.map((ci) => euclideanDistance(embeddings[i], embeddings[ci]))
      );
      distances.push(minDist ** 2);
    }
    const totalDist = distances.reduce((a, b) => a + b, 0);
    if (totalDist === 0) break;
    let random = Math.random() * totalDist;
    for (let i = 0; i < n; i++) {
      random -= distances[i];
      if (random <= 0 && !centroidIndices.includes(i)) {
        centroidIndices.push(i);
        break;
      }
    }
    if (centroidIndices.length < k + 1) {
      // 无法找到更多质心，随机添加
      while (centroidIndices.length < k) {
        const idx = Math.floor(Math.random() * n);
        if (!centroidIndices.includes(idx)) {
          centroidIndices.push(idx);
        }
      }
      break;
    }
  }

  let centroids = centroidIndices.slice(0, k).map((i) => [...embeddings[i]]);
  let labels: number[] = new Array(n).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    const newLabels = embeddings.map((emb) => {
      let minDist = Infinity;
      let label = 0;
      centroids.forEach((centroid, i) => {
        const dist = euclideanDistance(emb, centroid);
        if (dist < minDist) {
          minDist = dist;
          label = i;
        }
      });
      return label;
    });

    if (JSON.stringify(newLabels) === JSON.stringify(labels)) {
      break;
    }
    labels = newLabels;

    centroids = Array.from({ length: k }, (_, clusterIdx) => {
      const clusterPoints = embeddings.filter((_, i) => labels[i] === clusterIdx);
      if (clusterPoints.length === 0) {
        return centroids[clusterIdx] || new Array(dim).fill(0);
      }
      return clusterPoints[0].map((_, dimIdx) => {
        const sum = clusterPoints.reduce((acc, point) => acc + point[dimIdx], 0);
        return sum / clusterPoints.length;
      });
    });
  }

  return { labels, centroids };
}

// ==================== 轮廓系数计算 ====================

function calculateSilhouetteScore(
  embeddings: number[][],
  labels: number[]
): number {
  const n = embeddings.length;
  if (n < 2) return 0;

  const uniqueLabels = [...new Set(labels)];
  if (uniqueLabels.length === 1) return 0;

  let totalSilhouette = 0;

  for (let i = 0; i < n; i++) {
    const cluster = labels[i];
    const sameCluster = embeddings.filter((_, j) => labels[j] === cluster);
    
    let a = 0;
    if (sameCluster.length > 1) {
      a = sameCluster.reduce((sum, emb) => {
        const idx = embeddings.indexOf(emb);
        return sum + (idx !== i ? euclideanDistance(embeddings[i], emb) : 0);
      }, 0) / (sameCluster.length - 1);
    }

    let b = Infinity;
    for (const otherLabel of uniqueLabels) {
      if (otherLabel === cluster) continue;
      const otherCluster = embeddings.filter((_, j) => labels[j] === otherLabel);
      if (otherCluster.length === 0) continue;
      const avgDist = otherCluster.reduce(
        (sum, emb) => sum + euclideanDistance(embeddings[i], emb),
        0
      ) / otherCluster.length;
      b = Math.min(b, avgDist);
    }

    const silhouette = b === Infinity ? 0 : (b - a) / Math.max(a, b);
    totalSilhouette += silhouette;
  }

  return totalSilhouette / n;
}

// 自动选择最优 K 值
function findOptimalK(embeddings: number[][], maxK: number = 10): number {
  const n = embeddings.length;
  const minK = 2;
  const actualMaxK = Math.min(maxK, Math.floor(Math.sqrt(n)));

  let bestK = minK;
  let bestScore = -Infinity;

  for (let k = minK; k <= actualMaxK; k++) {
    let totalScore = 0;
    for (let run = 0; run < 3; run++) {
      const { labels } = kMeansClustering(embeddings, k);
      totalScore += calculateSilhouetteScore(embeddings, labels);
    }
    const avgScore = totalScore / 3;

    if (avgScore > bestScore) {
      bestScore = avgScore;
      bestK = k;
    }
  }

  return bestK;
}

// ==================== UMAP 风格降维（更好的全局结构） ====================

function umapStyleReduction(
  embeddings: number[][],
  nNeighbors: number = 15,
  minDist: number = 0.1,
  iterations: number = 500
): number[][] {
  const n = embeddings.length;
  if (n < 2) return embeddings.map(() => [0, 0]);

  // 步骤1：构建 k-NN 图
  const neighbors: number[][] = [];
  for (let i = 0; i < n; i++) {
    const distances: [number, number][] = [];
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const sim = cosineSimilarity(embeddings[i], embeddings[j]);
        distances.push([j, sim]);
      }
    }
    distances.sort((a, b) => b[1] - a[1]); // 按相似度降序
    neighbors.push(distances.slice(0, nNeighbors).map((d) => d[0]));
  }

  // 步骤2：计算高维相似度矩阵（对称化）
  const similarities: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (const j of neighbors[i]) {
      const sim = Math.max(0, cosineSimilarity(embeddings[i], embeddings[j]));
      // 对称化
      similarities[i][j] = sim;
      similarities[j][i] = sim;
    }
  }

  // 步骤3：使用力导向布局进行降维
  // 初始化位置（使用谱嵌入作为初始位置，更稳定）
  const positions = spectralInit(n, similarities);

  // 力导向优化
  const learningRate = 0.1;
  
  for (let iter = 0; iter < iterations; iter++) {
    const gradients: number[][] = Array.from({ length: n }, () => [0, 0]);
    
    // 吸引力：连接的点互相吸引
    for (let i = 0; i < n; i++) {
      for (const j of neighbors[i]) {
        const dx = positions[j][0] - positions[i][0];
        const dy = positions[j][1] - positions[i][1];
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        
        const sim = similarities[i][j];
        const force = sim * Math.max(0, dist - minDist);
        
        gradients[i][0] += force * dx / dist;
        gradients[i][1] += force * dy / dist;
      }
    }

    // 排斥力：所有点之间有排斥力，保持分布
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[j][0] - positions[i][0];
        const dy = positions[j][1] - positions[i][1];
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        
        // 排斥力与距离成反比
        const repulsion = -1 / (dist * dist);
        
        gradients[i][0] += repulsion * dx / dist;
        gradients[i][1] += repulsion * dy / dist;
        gradients[j][0] -= repulsion * dx / dist;
        gradients[j][1] -= repulsion * dy / dist;
      }
    }

    // 应用梯度更新
    const decay = 1 - iter / iterations;
    for (let i = 0; i < n; i++) {
      positions[i][0] += gradients[i][0] * learningRate * decay;
      positions[i][1] += gradients[i][1] * learningRate * decay;
    }
  }

  // 归一化到 [-1, 1]
  return normalizePositions(positions);
}

// 谱嵌入初始化（更好的初始位置）
function spectralInit(n: number, similarities: number[][]): number[][] {
  // 简化版谱嵌入：使用随机游走的拉普拉斯特征映射
  // 计算度矩阵
  const degrees: number[] = [];
  for (let i = 0; i < n; i++) {
    degrees[i] = similarities[i].reduce((sum, s) => sum + s, 0) || 1;
  }

  // 归一化拉普拉斯矩阵并计算前两个特征向量（简化：使用幂迭代）
  // 初始化随机向量
  let positions: number[][] = [];
  for (let i = 0; i < n; i++) {
    positions.push([Math.random() - 0.5, Math.random() - 0.5]);
  }

  // 幂迭代求特征向量
  for (let iter = 0; iter < 50; iter++) {
    const newPositions: number[][] = [];
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      for (let j = 0; j < n; j++) {
        if (similarities[i][j] > 0) {
          x += similarities[i][j] / Math.sqrt(degrees[i] * degrees[j]) * positions[j][0];
          y += similarities[i][j] / Math.sqrt(degrees[i] * degrees[j]) * positions[j][1];
        }
      }
      newPositions.push([x, y]);
    }
    positions = newPositions;
  }

  return positions;
}

// 归一化位置
function normalizePositions(positions: number[][]): number[][] {
  const n = positions.length;
  let maxX = -Infinity, maxY = -Infinity;
  let minX = Infinity, minY = Infinity;
  
  for (const pos of positions) {
    maxX = Math.max(maxX, pos[0]);
    minX = Math.min(minX, pos[0]);
    maxY = Math.max(maxY, pos[1]);
    minY = Math.min(minY, pos[1]);
  }

  const rangeX = (maxX - minX) || 1;
  const rangeY = (maxY - minY) || 1;
  const scale = Math.max(rangeX, rangeY) / 2;

  return positions.map((pos) => [
    (pos[0] - (minX + maxX) / 2) / scale,
    (pos[1] - (minY + maxY) / 2) / scale,
  ]);
}

// ==================== API 处理 ====================

export async function POST(request: NextRequest) {
  try {
    const { embeddings, clusterCount, autoCluster = false } = await request.json();

    if (!embeddings || !Array.isArray(embeddings) || embeddings.length === 0) {
      return NextResponse.json({ error: 'embeddings 数组不能为空' }, { status: 400 });
    }

    // 步骤1：先进行降维
    // 使用 UMAP 风格降维，更好地保留全局结构和局部邻域关系
    const positions = umapStyleReduction(embeddings);

    // 步骤2：在降维后的空间进行聚类
    // 这样聚类结果和可视化位置就会一致
    const positions2D = positions.map((p) => p);

    let labels: number[];
    let clusterCountResult: number;
    let silhouetteScore: number;
    let centroids: number[][] | undefined;

    if (autoCluster) {
      // 自动聚类：使用轮廓系数选择最优 K
      const optimalK = findOptimalK(positions2D, Math.min(10, Math.floor(embeddings.length / 2)));
      const kmeansResult = kMeansClustering(positions2D, optimalK);
      labels = kmeansResult.labels;
      centroids = kmeansResult.centroids;
      clusterCountResult = optimalK;
    } else {
      // 手动指定聚类数
      const k = Math.min(clusterCount || 5, embeddings.length);
      const kmeansResult = kMeansClustering(positions2D, k);
      labels = kmeansResult.labels;
      centroids = kmeansResult.centroids;
      clusterCountResult = k;
    }

    // 计算轮廓系数
    silhouetteScore = calculateSilhouetteScore(positions2D, labels);

    return NextResponse.json({
      success: true,
      labels,
      centroids,
      positions,
      clusterCount: clusterCountResult,
      silhouetteScore: Math.round(silhouetteScore * 1000) / 1000,
    });
  } catch (error: unknown) {
    console.error('Clustering error:', error);
    const message = error instanceof Error ? error.message : '聚类失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
