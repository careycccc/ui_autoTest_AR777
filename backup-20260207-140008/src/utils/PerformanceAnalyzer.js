export class PerformanceAnalyzer {
  constructor(thresholds = {}) {
    this.thresholds = {
      lcp: { warning: 2500, critical: 4000 },
      fcp: { warning: 1800, critical: 3000 },
      cls: { warning: 0.1, critical: 0.25 },
      fid: { warning: 100, critical: 300 },
      inp: { warning: 200, critical: 500 },
      ttfb: { warning: 800, critical: 1800 },
      pageLoadTime: { warning: 2000, critical: 5000 }, // SPA 页面切换
      ...thresholds
    };
  }

  analyze(perfData) {
    const analysis = { score: 100, grade: 'A', issues: [], details: {}, isSPA: perfData.isSPA };

    // 根据是否是 SPA 页面选择不同的分析策略
    if (perfData.isSPA) {
      analysis.details.spaLoad = this.analyzeSPALoad(perfData);
      analysis.details.newResources = this.analyzeNewResources(perfData);
    } else {
      analysis.details.lcp = this.analyzeLCP(perfData);
      analysis.details.fcp = this.analyzeFCP(perfData);
      analysis.details.ttfb = this.analyzeTTFB(perfData);
      analysis.details.pageLoad = this.analyzePageLoad(perfData);
    }

    // 通用分析
    analysis.details.cls = this.analyzeCLS(perfData);
    analysis.details.inp = this.analyzeINP(perfData);
    analysis.details.longTasks = this.analyzeLongTasks(perfData);
    analysis.details.dom = this.analyzeDOM(perfData);
    analysis.details.memory = this.analyzeMemory(perfData);

    Object.values(analysis.details).forEach(d => {
      if (d?.issues) analysis.issues.push(...d.issues);
    });

    analysis.issues.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return (order[a.severity] || 3) - (order[b.severity] || 3);
    });

    analysis.score = this.calculateScore(analysis.issues);
    analysis.grade = this.getGrade(analysis.score);

    return analysis;
  }

  // SPA 页面加载分析
  analyzeSPALoad(perfData) {
    const spa = perfData.spaMetrics || {};
    const loadTime = spa.pageLoadTime || perfData.pageLoadTime;

    if (!loadTime) return { status: 'unknown', issues: [] };

    const result = {
      value: loadTime,
      status: this.getStatus(loadTime, this.thresholds.pageLoadTime),
      issues: []
    };

    if (result.status === 'good') return result;

    const issue = {
      type: 'spa_load',
      severity: result.status,
      title: `SPA 页面切换耗时: ${loadTime}ms`,
      description: '从点击到页面内容显示的时间',
      causes: [],
      details: [],
      suggestions: []
    };

    issue.details.push({
      label: '📊 页面切换详情',
      items: [
        `总耗时: ${loadTime}ms`,
        `新加载资源: ${spa.newResourcesCount || 0} 个`,
        `新资源大小: ${this.formatSize(spa.newResourcesTotalSize || 0)}`,
        `新资源加载: ${Math.round(spa.newResourcesLoadTime || 0)}ms`
      ]
    });

    if (spa.newResourcesLoadTime > 1000) {
      issue.causes.push({
        reason: '新资源加载慢',
        detail: `新加载的资源耗时 ${Math.round(spa.newResourcesLoadTime)}ms`,
        suggestion: '预加载关键资源，使用代码分割'
      });
    }

    if (spa.largestNewResource) {
      issue.details.push({
        label: '🐢 最慢的新资源',
        items: [
          `URL: ${this.shortenUrl(spa.largestNewResource.url, 50)}`,
          `类型: ${spa.largestNewResource.type}`,
          `耗时: ${Math.round(spa.largestNewResource.duration)}ms`,
          `大小: ${this.formatSize(spa.largestNewResource.transferSize)}`
        ]
      });
    }

    issue.suggestions.push(
      '使用路由预加载 (prefetch)',
      '代码分割，按需加载',
      '骨架屏提升感知速度',
      '关键资源预加载'
    );

    result.issues.push(issue);
    return result;
  }

  // 新资源加载分析
  analyzeNewResources(perfData) {
    const newResources = perfData.newResources || [];
    const result = { count: newResources.length, issues: [] };

    if (newResources.length === 0) return result;

    const slow = newResources.filter(r => r.duration > 500);
    const large = newResources.filter(r => r.transferSize > 100 * 1024);

    if (slow.length > 0) {
      const sorted = [...slow].sort((a, b) => b.duration - a.duration);
      const issue = {
        type: 'slow_new_resources',
        severity: 'warning',
        title: `${slow.length} 个新加载资源较慢`,
        description: '页面切换后加载的慢资源',
        causes: [],
        details: [],
        suggestions: []
      };

      issue.details.push({
        label: '🐢 慢资源列表',
        items: sorted.slice(0, 5).map(r =>
          `[${r.type}] ${this.shortenUrl(r.url, 40)}\n  耗时: ${Math.round(r.duration)}ms | 大小: ${this.formatSize(r.transferSize)}`
        )
      });

      issue.suggestions.push('预加载关键资源', '使用 CDN', '压缩资源');
      result.issues.push(issue);
    }

    return result;
  }

  analyzeLCP(perfData) {
    const wv = perfData.webVitals || {};
    const value = wv.lcp;
    const lcpDetails = perfData.lcpElementDetails;
    const lcpResource = perfData.lcpResourceTiming;
    
    if (value == null) return { status: 'unknown', message: '无法获取 LCP', issues: [] };

    const result = { value, status: this.getStatus(value, this.thresholds.lcp), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'lcp', severity: result.status,
      title: `LCP 过慢: ${Math.round(value)}ms`,
      description: 'LCP 表示最大内容元素的渲染时间',
      causes: [], details: [], suggestions: []
    };

    if (lcpDetails) {
      if (lcpDetails.isImage && lcpResource) {
        issue.description = `LCP 元素是图片 <${lcpDetails.tag}>`;
        issue.details.push({
          label: '🖼️ LCP 图片详情',
          items: [
            `URL: ${this.shortenUrl(lcpResource.url, 60)}`,
            `总耗时: ${Math.round(lcpResource.duration)}ms`,
            `TTFB: ${Math.round(lcpResource.ttfb)}ms`,
            `下载: ${Math.round(lcpResource.downloadTime)}ms`,
            `大小: ${this.formatSize(lcpResource.transferSize)}`
          ]
        });
        
        if (lcpResource.ttfb > 500) {
          issue.causes.push({ reason: '图片服务器响应慢', detail: `TTFB ${Math.round(lcpResource.ttfb)}ms`, suggestion: '使用 CDN' });
        }
        if (lcpResource.downloadTime > 1000) {
          issue.causes.push({ reason: '图片下载慢', detail: `${Math.round(lcpResource.downloadTime)}ms, ${this.formatSize(lcpResource.transferSize)}`, suggestion: '压缩图片' });
        }
      }
    }

    const blocking = perfData.blockingResources || [];
    if (blocking.length > 0) {
      issue.causes.push({
        reason: `${blocking.length} 个阻塞资源`,
        resources: blocking.slice(0, 5).map(r => ({ url: this.shortenUrl(r.url, 40), duration: `${Math.round(r.duration)}ms` }))
      });
    }

    issue.suggestions.push('预加载 LCP 图片', '使用 WebP 格式', '使用 CDN');
    result.issues.push(issue);
    return result;
  }

  analyzeFCP(perfData) {
    const wv = perfData.webVitals || {};
    const nav = perfData.navigation || {};
    const value = wv.fcp;

    if (value == null) return { status: 'unknown', issues: [] };

    const result = { value, status: this.getStatus(value, this.thresholds.fcp), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'fcp', severity: result.status,
      title: `首次内容绘制过慢: ${Math.round(value)}ms`,
      description: 'FCP 表示首次看到内容的时间',
      causes: [], details: [], suggestions: []
    };

    issue.details.push({
      label: '⏱️ 时间分解',
      items: [
        `DNS: ${Math.round(nav.dnsTime || 0)}ms`,
        `TCP: ${Math.round(nav.tcpTime || 0)}ms`,
        `TTFB: ${Math.round(nav.ttfb || 0)}ms`,
        `下载: ${Math.round(nav.responseTime || nav.downloadTime || 0)}ms`
      ]
    });

    const blocking = perfData.blockingResources || [];
    if (blocking.length > 0) {
      issue.causes.push({ reason: `${blocking.length} 个阻塞资源`, resources: blocking.slice(0, 3).map(r => ({ url: this.shortenUrl(r.url, 40), duration: `${Math.round(r.duration)}ms` })) });
    }

    issue.suggestions.push('内联关键 CSS', 'async/defer 加载 JS', '使用 CDN');
    result.issues.push(issue);
    return result;
  }

  analyzeTTFB(perfData) {
    const nav = perfData.navigation || {};
    const value = perfData.webVitals?.ttfb || nav.ttfb;

    if (!value) return { status: 'unknown', issues: [] };

    const result = { value, status: this.getStatus(value, this.thresholds.ttfb), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'ttfb', severity: result.status,
      title: `首字节时间过长: ${Math.round(value)}ms`,
      description: 'TTFB 是请求到首字节的时间',
      causes: [], details: [], suggestions: []
    };

    issue.details.push({
      label: '⏱️ 分解',
      items: [`DNS: ${Math.round(nav.dnsTime || 0)}ms`, `TCP: ${Math.round(nav.tcpTime || 0)}ms`, `SSL: ${Math.round(nav.sslTime || 0)}ms`]
    });

    if (nav.dnsTime > 50) issue.causes.push({ reason: 'DNS 解析慢', detail: `${Math.round(nav.dnsTime)}ms`, suggestion: 'dns-prefetch' });
    if (nav.tcpTime > 100) issue.causes.push({ reason: 'TCP 连接慢', detail: `${Math.round(nav.tcpTime)}ms`, suggestion: 'preconnect' });

    issue.suggestions.push('使用 CDN', '优化服务器', '启用缓存');
    result.issues.push(issue);
    return result;
  }

  analyzePageLoad(perfData) {
    const nav = perfData.navigation || {};
    const value = nav.loadEventEnd || nav.totalTime;
    const slow = perfData.slowResources || [];

    if (!value) return { status: 'unknown', issues: [] };

    const threshold = { warning: 3000, critical: 6000 };
    const result = { value, status: this.getStatus(value, threshold), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'page_load', severity: result.status,
      title: `页面加载过慢: ${Math.round(value)}ms`,
      description: '所有资源加载完成',
      causes: [], details: [], suggestions: []
    };

    const stats = perfData.resourceStats || {};
    if (stats.total) {
      issue.details.push({
        label: '📊 资源统计',
        items: [
          `总数: ${stats.total}`,
          `总大小: ${this.formatSize(stats.totalSize)}`,
          `JS: ${stats.byType?.script?.count || 0} 个`,
          `CSS: ${stats.byType?.css?.count || 0} 个`,
          `图片: ${stats.byType?.image?.count || 0} 个`
        ]
      });
    }

    if (slow.length > 0) {
      const sorted = [...slow].sort((a, b) => b.duration - a.duration);
      issue.details.push({
        label: '🐢 最慢资源 TOP 5',
        items: sorted.slice(0, 5).map(r => `[${r.type}] ${this.shortenUrl(r.url, 40)}\n  耗时: ${Math.round(r.duration)}ms | 大小: ${this.formatSize(r.transferSize)}`)
      });
    }

    issue.suggestions.push('压缩图片', '延迟加载', '使用 CDN', '代码分割');
    result.issues.push(issue);
    return result;
  }

  analyzeCLS(perfData) {
    const value = perfData.webVitals?.cls;
    const entries = perfData.clsEntries || [];

    if (value == null) return { status: 'unknown', issues: [] };

    const result = { value, status: this.getStatus(value, this.thresholds.cls), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'cls', severity: result.status,
      title: `布局偏移过高: ${value.toFixed(3)}`,
      description: 'CLS 衡量视觉稳定性',
      causes: [], details: [], suggestions: []
    };

    if (entries.length > 0) {
      const significant = entries.filter(e => e.value > 0.05);
      if (significant.length > 0) {
        issue.details.push({
          label: `📐 重大偏移 (${significant.length} 次)`,
          items: significant.slice(0, 5).map(e => {
            let info = `时间: ${Math.round(e.time)}ms, 值: ${e.value.toFixed(4)}`;
            if (e.sources?.length > 0) info += `\n  元素: ${e.sources.map(s => s.element).join(', ')}`;
            return info;
          })
        });
      }
    }

    issue.suggestions.push('设置图片尺寸', '预留动态内容空间', 'font-display: swap');
    result.issues.push(issue);
    return result;
  }

  analyzeINP(perfData) {
    const value = perfData.webVitals?.inp;
    const interactions = perfData.interactions || [];

    if (value == null) return { status: 'unknown', issues: [] };

    const result = { value, status: this.getStatus(value, this.thresholds.inp), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'inp', severity: result.status,
      title: `交互响应慢: ${Math.round(value)}ms`,
      description: 'INP 衡量交互响应性',
      causes: [], details: [], suggestions: []
    };

    const slowInteractions = interactions.filter(i => i.duration > 100);
    if (slowInteractions.length > 0) {
      issue.details.push({
        label: '⚡ 慢交互',
        items: slowInteractions.slice(0, 5).map(i => `${i.type}: ${Math.round(i.duration)}ms (输入延迟: ${Math.round(i.inputDelay)}ms, 处理: ${Math.round(i.processingTime)}ms)`)
      });
    }

    issue.suggestions.push('优化事件处理', '使用防抖节流', '拆分长任务');
    result.issues.push(issue);
    return result;
  }

  analyzeLongTasks(perfData) {
    const tasks = perfData.longTasks || [];
    const result = { count: tasks.length, totalTime: tasks.reduce((sum, t) => sum + t.duration, 0), issues: [] };

    if (tasks.length === 0) return result;

    const issue = {
      type: 'long_tasks',
      severity: result.totalTime > 500 ? 'critical' : 'warning',
      title: `${tasks.length} 个长任务，阻塞 ${Math.round(result.totalTime)}ms`,
      description: '长任务阻塞主线程',
      causes: [], details: [], suggestions: []
    };

    const sorted = [...tasks].sort((a, b) => b.duration - a.duration);
    issue.details.push({
      label: '⏳ 长任务列表',
      items: sorted.slice(0, 5).map(t => `开始: ${Math.round(t.startTime)}ms, 持续: ${Math.round(t.duration)}ms\n  来源: ${t.source || '主线程'}`)
    });

    issue.suggestions.push('拆分长任务', 'Web Worker', 'requestIdleCallback');
    result.issues.push(issue);
    return result;
  }

  analyzeDOM(perfData) {
    const dom = perfData.dom || {};
    const nodes = dom.nodes || perfData.domStats?.totalNodes || 0;

    const result = { nodes, issues: [] };
    if (nodes <= 1500) return result;

    const issue = {
      type: 'dom_size',
      severity: nodes > 3000 ? 'critical' : 'warning',
      title: `DOM 节点过多: ${nodes}`,
      description: '影响内存和渲染',
      causes: [], details: [], suggestions: []
    };

    const domStats = perfData.domStats || {};
    if (domStats.tagCounts) {
      const topTags = Object.entries(domStats.tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      issue.details.push({ label: '🏷️ 元素 TOP 10', items: topTags.map(([tag, count]) => `<${tag}>: ${count}`) });
    }

    issue.suggestions.push('虚拟滚动', '延迟渲染', '简化 DOM');
    result.issues.push(issue);
    return result;
  }

  analyzeMemory(perfData) {
    const mem = perfData.memory || {};
    const usedMB = mem.usedJSHeapMB ? parseFloat(mem.usedJSHeapMB) : null;

    if (usedMB == null) return { status: 'unknown', issues: [] };

    const status = usedMB > 100 ? 'critical' : usedMB > 50 ? 'warning' : 'good';
    const result = { used: usedMB, status, issues: [] };

    if (status === 'good') return result;

    const issue = {
      type: 'memory', severity: status,
      title: `内存过高: ${usedMB}MB`,
      description: '可能存在内存泄漏',
      causes: [], details: [], suggestions: []
    };

    issue.details.push({ label: '💾 内存', items: [`已用: ${usedMB}MB`, `总量: ${mem.totalJSHeapSize ? (mem.totalJSHeapSize / 1024 / 1024).toFixed(2) : 'N/A'}MB`] });
    issue.suggestions.push('检查内存泄漏', '清理数据', '使用 WeakMap');
    result.issues.push(issue);
    return result;
  }

  getStatus(value, threshold) {
    if (!threshold) return 'unknown';
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'good';
  }

  calculateScore(issues) {
    let score = 100;
    issues.forEach(i => {
      if (i.severity === 'critical') score -= 20;
      else if (i.severity === 'warning') score -= 10;
      else score -= 5;
    });
    return Math.max(0, Math.min(100, score));
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  shortenUrl(url, max = 50) {
    if (!url) return 'N/A';
    try {
      const p = new URL(url).pathname + new URL(url).search;
      return p.length > max ? '...' + p.slice(-max + 3) : p;
    } catch { return url.length > max ? url.slice(0, max - 3) + '...' : url; }
  }

  formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }
}
