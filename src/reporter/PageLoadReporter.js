import fs from 'fs';
import path from 'path';

/**
 * 首次进入页面性能报告生成器
 * 专门记录每个页面首次加载的各项性能指标
 */
export class PageLoadReporter {
  constructor(outputDir) {
    this.outputDir = outputDir;
    this.pageMetrics = [];
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * 添加页面性能数据
   */
  addPageMetrics(data) {
    this.pageMetrics.push({
      ...data,
      recordedAt: new Date().toISOString()
    });
  }

  /**
   * 生成报告（覆盖式）
   */
  generate() {
    // 固定文件名，覆盖式生成
    const jsonPath = path.join(this.outputDir, 'page-load-performance.json');
    const htmlPath = path.join(this.outputDir, 'page-load-performance.html');
    
    // 生成 JSON
    const report = {
      generatedAt: new Date().toISOString(),
      summary: this.generateSummary(),
      pages: this.pageMetrics
    };
    
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    // 生成 HTML
    const htmlContent = this.generateHTML(report);
    fs.writeFileSync(htmlPath, htmlContent);
    
    console.log('\n📊 首次加载性能报告:');
    console.log('   HTML: ' + htmlPath);
    console.log('   JSON: ' + jsonPath);
    
    return { htmlPath, jsonPath };
  }

  generateSummary() {
    if (this.pageMetrics.length === 0) return null;
    
    const metrics = ['ttfb', 'fcp', 'lcp', 'tti', 'visuallyComplete', 'domContentLoaded', 'load'];
    const summary = {};
    
    metrics.forEach(metric => {
      const values = this.pageMetrics
        .map(p => p.timing?.[metric])
        .filter(v => v !== null && v !== undefined && !isNaN(v));
      
      if (values.length > 0) {
        summary[metric] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });
    
    return summary;
  }

  generateHTML(report) {
    const { summary, pages } = report;
    
    // 阈值配置
    const thresholds = {
      ttfb: { good: 800, poor: 1800 },
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      tti: { good: 3800, poor: 7300 },
      visuallyComplete: { good: 3000, poor: 5000 },
      domContentLoaded: { good: 2000, poor: 4000 },
      load: { good: 3000, poor: 6000 },
      cls: { good: 0.1, poor: 0.25 },
      fid: { good: 100, poor: 300 }
    };

    const getScoreClass = (metric, value) => {
      if (value === null || value === undefined) return '';
      const t = thresholds[metric];
      if (!t) return '';
      
      // CLS 特殊处理
      if (metric === 'cls') {
        if (value <= t.good) return 'good';
        if (value <= t.poor) return 'needs-improvement';
        return 'poor';
      }
      
      if (value <= t.good) return 'good';
      if (value <= t.poor) return 'needs-improvement';
      return 'poor';
    };

    const formatTime = (ms) => {
      if (ms === null || ms === undefined) return 'N/A';
      if (ms < 1000) return ms.toFixed(0) + 'ms';
      return (ms / 1000).toFixed(2) + 's';
    };

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>首次进入页面性能报告</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
            color: #333; 
            line-height: 1.6;
            min-height: 100vh;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 24px; }
        
        header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: white;
            padding: 48px 40px;
            border-radius: 20px;
            margin-bottom: 32px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            position: relative;
            overflow: hidden;
        }
        header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
        }
        header h1 {
            font-size: 36px;
            margin-bottom: 8px;
            position: relative;
        }
        header p {
            opacity: 0.8;
            font-size: 16px;
            position: relative;
        }
        .header-stats {
            display: flex;
            gap: 32px;
            margin-top: 32px;
            position: relative;
        }
        .header-stat {
            text-align: center;
        }
        .header-stat-value {
            font-size: 42px;
            font-weight: 700;
        }
        .header-stat-label {
            font-size: 14px;
            opacity: 0.8;
        }

        .metrics-explanation {
            background: white;
            border-radius: 16px;
            padding: 24px 32px;
            margin-bottom: 32px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .metrics-explanation h2 {
            font-size: 20px;
            margin-bottom: 16px;
            color: #1a1a2e;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
        }
        .metric-explain {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 16px;
            border-left: 4px solid #667eea;
        }
        .metric-explain h4 {
            color: #667eea;
            margin-bottom: 4px;
            font-size: 14px;
        }
        .metric-explain p {
            font-size: 13px;
            color: #666;
        }
        .metric-explain .thresholds {
            margin-top: 8px;
            font-size: 12px;
        }
        .metric-explain .thresholds span {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            margin-right: 4px;
        }
        .metric-explain .thresholds .good { background: #dcfce7; color: #166534; }
        .metric-explain .thresholds .needs-improvement { background: #fef3c7; color: #92400e; }
        .metric-explain .thresholds .poor { background: #fee2e2; color: #991b1b; }

        .summary-section {
            background: white;
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 32px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .summary-section h2 {
            font-size: 22px;
            margin-bottom: 24px;
            color: #1a1a2e;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
        }
        .summary-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            border: 1px solid #eee;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }
        .summary-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.12);
        }
        .summary-card.good { border-left: 4px solid #10b981; }
        .summary-card.needs-improvement { border-left: 4px solid #f59e0b; }
        .summary-card.poor { border-left: 4px solid #ef4444; }
        .summary-card-value {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .summary-card.good .summary-card-value { color: #10b981; }
        .summary-card.needs-improvement .summary-card-value { color: #f59e0b; }
        .summary-card.poor .summary-card-value { color: #ef4444; }
        .summary-card-label {
            font-size: 13px;
            color: #666;
            margin-bottom: 8px;
        }
        .summary-card-range {
            font-size: 11px;
            color: #999;
        }

        .page-section {
            background: white;
            border-radius: 16px;
            margin-bottom: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        .page-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
        }
        .page-url {
            font-size: 16px;
            font-weight: 500;
            word-break: break-all;
        }
        .page-meta {
            display: flex;
            gap: 16px;
            font-size: 13px;
            opacity: 0.9;
        }
        .page-body {
            padding: 24px;
        }

        .timing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .timing-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            position: relative;
        }
        .timing-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            border-radius: 12px 12px 0 0;
        }
        .timing-card.good::before { background: #10b981; }
        .timing-card.needs-improvement::before { background: #f59e0b; }
        .timing-card.poor::before { background: #ef4444; }
        .timing-value {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .timing-card.good .timing-value { color: #10b981; }
        .timing-card.needs-improvement .timing-value { color: #f59e0b; }
        .timing-card.poor .timing-value { color: #ef4444; }
        .timing-label {
            font-size: 12px;
            color: #666;
        }
        .timing-card.highlight {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
        }
        .timing-card.highlight .timing-label {
            font-weight: 600;
            color: #92400e;
        }

        .waterfall-section h3 {
            font-size: 16px;
            margin-bottom: 16px;
            color: #333;
        }
        .waterfall {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            position: relative;
        }
        .waterfall-bar {
            height: 32px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            position: relative;
        }
        .waterfall-label {
            width: 140px;
            font-size: 12px;
            color: #666;
            flex-shrink: 0;
        }
        .waterfall-track {
            flex: 1;
            height: 20px;
            background: #e5e7eb;
            border-radius: 10px;
            position: relative;
            overflow: hidden;
        }
        .waterfall-fill {
            height: 100%;
            border-radius: 10px;
            position: absolute;
            left: 0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 8px;
            font-size: 11px;
            color: white;
            font-weight: 500;
            min-width: 40px;
        }
        .waterfall-fill.ttfb { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
        .waterfall-fill.fcp { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
        .waterfall-fill.lcp { background: linear-gradient(90deg, #10b981, #34d399); }
        .waterfall-fill.tti { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
        .waterfall-fill.vc { background: linear-gradient(90deg, #ec4899, #f472b6); }
        .waterfall-fill.load { background: linear-gradient(90deg, #6366f1, #818cf8); }

        .resource-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #eee;
        }
        .resource-stat {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 16px;
        }
        .resource-stat-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
        }
        .resource-stat-value {
            font-size: 20px;
            font-weight: 600;
            color: #333;
        }

        .screenshot-section {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #eee;
        }
        .screenshot-section h4 {
            font-size: 14px;
            color: #666;
            margin-bottom: 12px;
        }
        .screenshot-img {
            max-width: 100%;
            border-radius: 8px;
            border: 1px solid #eee;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .screenshot-img:hover {
            transform: scale(1.02);
        }

        .footer {
            text-align: center;
            padding: 24px;
            color: #888;
            font-size: 13px;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        .modal.open { display: flex; }
        .modal img {
            max-width: 95%;
            max-height: 95%;
            border-radius: 8px;
        }
        .modal-close {
            position: absolute;
            top: 20px;
            right: 30px;
            color: white;
            font-size: 40px;
            cursor: pointer;
        }

        @media (max-width: 768px) {
            .container { padding: 16px; }
            header { padding: 32px 24px; }
            header h1 { font-size: 28px; }
            .header-stats { flex-direction: column; gap: 16px; }
            .timing-grid { grid-template-columns: repeat(2, 1fr); }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 首次进入页面性能报告</h1>
            <p>Page Load Performance Report</p>
            <div class="header-stats">
                <div class="header-stat">
                    <div class="header-stat-value">${pages.length}</div>
                    <div class="header-stat-label">测试页面</div>
                </div>
                ${summary?.lcp ? `
                <div class="header-stat">
                    <div class="header-stat-value">${formatTime(summary.lcp.avg)}</div>
                    <div class="header-stat-label">平均 LCP</div>
                </div>
                ` : ''}
                ${summary?.tti ? `
                <div class="header-stat">
                    <div class="header-stat-value">${formatTime(summary.tti.avg)}</div>
                    <div class="header-stat-label">平均 TTI</div>
                </div>
                ` : ''}
                ${summary?.visuallyComplete ? `
                <div class="header-stat">
                    <div class="header-stat-value">${formatTime(summary.visuallyComplete.avg)}</div>
                    <div class="header-stat-label">平均视口渲染</div>
                </div>
                ` : ''}
            </div>
        </header>

        <div class="metrics-explanation">
            <h2>📖 指标说明</h2>
            <div class="metrics-grid">
                <div class="metric-explain">
                    <h4>TTFB (Time to First Byte)</h4>
                    <p>首字节时间 - 从请求开始到接收到第一个字节的时间</p>
                    <div class="thresholds">
                        <span class="good">≤800ms 良好</span>
                        <span class="needs-improvement">≤1800ms 需改进</span>
                        <span class="poor">>1800ms 较差</span>
                    </div>
                </div>
                <div class="metric-explain">
                    <h4>FCP (First Contentful Paint)</h4>
                    <p>首次内容绘制 - 页面首次绘制任何文本、图像等内容的时间</p>
                    <div class="thresholds">
                        <span class="good">≤1800ms 良好</span>
                        <span class="needs-improvement">≤3000ms 需改进</span>
                        <span class="poor">>3000ms 较差</span>
                    </div>
                </div>
                <div class="metric-explain">
                    <h4>LCP (Largest Contentful Paint)</h4>
                    <p>最大内容绘制 - 视口内最大内容元素渲染完成的时间</p>
                    <div class="thresholds">
                        <span class="good">≤2500ms 良好</span>
                        <span class="needs-improvement">≤4000ms 需改进</span>
                        <span class="poor">>4000ms 较差</span>
                    </div>
                </div>
                <div class="metric-explain" style="border-left-color: #ec4899;">
                    <h4>⭐ Visually Complete (视口渲染完成)</h4>
                    <p>当前视口内所有可见内容完全渲染完成的时间</p>
                    <div class="thresholds">
                        <span class="good">≤3000ms 良好</span>
                        <span class="needs-improvement">≤5000ms 需改进</span>
                        <span class="poor">>5000ms 较差</span>
                    </div>
                </div>
                <div class="metric-explain" style="border-left-color: #f59e0b;">
                    <h4>⭐ TTI (Time to Interactive)</h4>
                    <p>完全可交互时间 - 页面完全可响应用户交互的时间</p>
                    <div class="thresholds">
                        <span class="good">≤3800ms 良好</span>
                        <span class="needs-improvement">≤7300ms 需改进</span>
                        <span class="poor">>7300ms 较差</span>
                    </div>
                </div>
                <div class="metric-explain">
                    <h4>CLS (Cumulative Layout Shift)</h4>
                    <p>累积布局偏移 - 页面加载期间所有意外布局偏移的累积分数</p>
                    <div class="thresholds">
                        <span class="good">≤0.1 良好</span>
                        <span class="needs-improvement">≤0.25 需改进</span>
                        <span class="poor">>0.25 较差</span>
                    </div>
                </div>
            </div>
        </div>

        ${summary ? `
        <div class="summary-section">
            <h2>📊 总体性能概览</h2>
            <div class="summary-cards">
                ${summary.ttfb ? `
                <div class="summary-card ${getScoreClass('ttfb', summary.ttfb.avg)}">
                    <div class="summary-card-value">${formatTime(summary.ttfb.avg)}</div>
                    <div class="summary-card-label">TTFB 平均值</div>
                    <div class="summary-card-range">${formatTime(summary.ttfb.min)} - ${formatTime(summary.ttfb.max)}</div>
                </div>
                ` : ''}
                ${summary.fcp ? `
                <div class="summary-card ${getScoreClass('fcp', summary.fcp.avg)}">
                    <div class="summary-card-value">${formatTime(summary.fcp.avg)}</div>
                    <div class="summary-card-label">FCP 平均值</div>
                    <div class="summary-card-range">${formatTime(summary.fcp.min)} - ${formatTime(summary.fcp.max)}</div>
                </div>
                ` : ''}
                ${summary.lcp ? `
                <div class="summary-card ${getScoreClass('lcp', summary.lcp.avg)}">
                    <div class="summary-card-value">${formatTime(summary.lcp.avg)}</div>
                    <div class="summary-card-label">LCP 平均值</div>
                    <div class="summary-card-range">${formatTime(summary.lcp.min)} - ${formatTime(summary.lcp.max)}</div>
                </div>
                ` : ''}
                ${summary.visuallyComplete ? `
                <div class="summary-card ${getScoreClass('visuallyComplete', summary.visuallyComplete.avg)}">
                    <div class="summary-card-value">${formatTime(summary.visuallyComplete.avg)}</div>
                    <div class="summary-card-label">视口渲染完成</div>
                    <div class="summary-card-range">${formatTime(summary.visuallyComplete.min)} - ${formatTime(summary.visuallyComplete.max)}</div>
                </div>
                ` : ''}
                ${summary.tti ? `
                <div class="summary-card ${getScoreClass('tti', summary.tti.avg)}">
                    <div class="summary-card-value">${formatTime(summary.tti.avg)}</div>
                    <div class="summary-card-label">TTI 平均值</div>
                    <div class="summary-card-range">${formatTime(summary.tti.min)} - ${formatTime(summary.tti.max)}</div>
                </div>
                ` : ''}
                ${summary.load ? `
                <div class="summary-card ${getScoreClass('load', summary.load.avg)}">
                    <div class="summary-card-value">${formatTime(summary.load.avg)}</div>
                    <div class="summary-card-label">Load 平均值</div>
                    <div class="summary-card-range">${formatTime(summary.load.min)} - ${formatTime(summary.load.max)}</div>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}

        <h2 style="font-size: 22px; margin-bottom: 24px; color: #1a1a2e;">📄 各页面详细性能</h2>
        
        ${pages.map((page, index) => {
          const timing = page.timing || {};
          const maxTime = Math.max(
            timing.ttfb || 0,
            timing.fcp || 0,
            timing.lcp || 0,
            timing.tti || 0,
            timing.visuallyComplete || 0,
            timing.load || 0
          ) || 1;
          
          return `
          <div class="page-section">
            <div class="page-header">
              <div class="page-url">📍 ${page.url || 'Unknown URL'}</div>
              <div class="page-meta">
                <span>📱 ${page.device || 'Desktop'}</span>
                <span>🕐 ${new Date(page.recordedAt).toLocaleString()}</span>
              </div>
            </div>
            <div class="page-body">
              <div class="timing-grid">
                <div class="timing-card ${getScoreClass('ttfb', timing.ttfb)}">
                  <div class="timing-value">${formatTime(timing.ttfb)}</div>
                  <div class="timing-label">TTFB</div>
                </div>
                <div class="timing-card ${getScoreClass('fcp', timing.fcp)}">
                  <div class="timing-value">${formatTime(timing.fcp)}</div>
                  <div class="timing-label">FCP</div>
                </div>
                <div class="timing-card ${getScoreClass('lcp', timing.lcp)}">
                  <div class="timing-value">${formatTime(timing.lcp)}</div>
                  <div class="timing-label">LCP</div>
                </div>
                <div class="timing-card highlight ${getScoreClass('visuallyComplete', timing.visuallyComplete)}">
                  <div class="timing-value">${formatTime(timing.visuallyComplete)}</div>
                  <div class="timing-label">⭐ 视口渲染完成</div>
                </div>
                <div class="timing-card highlight ${getScoreClass('tti', timing.tti)}">
                  <div class="timing-value">${formatTime(timing.tti)}</div>
                  <div class="timing-label">⭐ 完全可交互 (TTI)</div>
                </div>
                <div class="timing-card ${getScoreClass('domContentLoaded', timing.domContentLoaded)}">
                  <div class="timing-value">${formatTime(timing.domContentLoaded)}</div>
                  <div class="timing-label">DOM Ready</div>
                </div>
                <div class="timing-card ${getScoreClass('load', timing.load)}">
                  <div class="timing-value">${formatTime(timing.load)}</div>
                  <div class="timing-label">Load</div>
                </div>
                <div class="timing-card ${getScoreClass('cls', timing.cls)}">
                  <div class="timing-value">${timing.cls !== undefined ? timing.cls.toFixed(4) : 'N/A'}</div>
                  <div class="timing-label">CLS</div>
                </div>
              </div>

              <div class="waterfall-section">
                <h3>📊 加载时间线</h3>
                <div class="waterfall">
                  <div class="waterfall-bar">
                    <div class="waterfall-label">TTFB</div>
                    <div class="waterfall-track">
                      <div class="waterfall-fill ttfb" style="width: ${((timing.ttfb || 0) / maxTime * 100)}%">${formatTime(timing.ttfb)}</div>
                    </div>
                  </div>
                  <div class="waterfall-bar">
                    <div class="waterfall-label">FCP</div>
                    <div class="waterfall-track">
                      <div class="waterfall-fill fcp" style="width: ${((timing.fcp || 0) / maxTime * 100)}%">${formatTime(timing.fcp)}</div>
                    </div>
                  </div>
                  <div class="waterfall-bar">
                    <div class="waterfall-label">LCP</div>
                    <div class="waterfall-track">
                      <div class="waterfall-fill lcp" style="width: ${((timing.lcp || 0) / maxTime * 100)}%">${formatTime(timing.lcp)}</div>
                    </div>
                  </div>
                  <div class="waterfall-bar">
                    <div class="waterfall-label">视口渲染完成</div>
                    <div class="waterfall-track">
                      <div class="waterfall-fill vc" style="width: ${((timing.visuallyComplete || 0) / maxTime * 100)}%">${formatTime(timing.visuallyComplete)}</div>
                    </div>
                  </div>
                  <div class="waterfall-bar">
                    <div class="waterfall-label">TTI (可交互)</div>
                    <div class="waterfall-track">
                      <div class="waterfall-fill tti" style="width: ${((timing.tti || 0) / maxTime * 100)}%">${formatTime(timing.tti)}</div>
                    </div>
                  </div>
                  <div class="waterfall-bar">
                    <div class="waterfall-label">Load</div>
                    <div class="waterfall-track">
                      <div class="waterfall-fill load" style="width: ${((timing.load || 0) / maxTime * 100)}%">${formatTime(timing.load)}</div>
                    </div>
                  </div>
                </div>
              </div>

              ${page.resources ? `
              <div class="resource-stats">
                <div class="resource-stat">
                  <div class="resource-stat-label">DOM 节点数</div>
                  <div class="resource-stat-value">${page.resources.domNodes || 'N/A'}</div>
                </div>
                <div class="resource-stat">
                  <div class="resource-stat-label">JS Heap</div>
                  <div class="resource-stat-value">${page.resources.jsHeapSize ? (page.resources.jsHeapSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</div>
                </div>
                <div class="resource-stat">
                  <div class="resource-stat-label">请求数</div>
                  <div class="resource-stat-value">${page.resources.requestCount || 'N/A'}</div>
                </div>
                <div class="resource-stat">
                  <div class="resource-stat-label">传输大小</div>
                  <div class="resource-stat-value">${page.resources.transferSize ? (page.resources.transferSize / 1024).toFixed(2) + ' KB' : 'N/A'}</div>
                </div>
              </div>
              ` : ''}

              ${page.screenshot ? `
              <div class="screenshot-section">
                <h4>📸 页面截图</h4>
                <img class="screenshot-img" src="./screenshots/${page.screenshot.split('/').pop()}" onclick="openImage(this.src)" alt="页面截图">
              </div>
              ` : ''}
            </div>
          </div>
          `;
        }).join('')}

        <div class="footer">
            <p>生成时间: ${new Date(report.generatedAt).toLocaleString()}</p>
            <p>UI 自动化测试平台 - 首次进入性能报告</p>
        </div>
    </div>

    <div class="modal" id="imageModal" onclick="closeModal()">
        <span class="modal-close">&times;</span>
        <img id="modalImage" src="">
    </div>

    <script>
        function openImage(src) {
            document.getElementById('modalImage').src = src;
            document.getElementById('imageModal').classList.add('open');
        }
        function closeModal() {
            document.getElementById('imageModal').classList.remove('open');
        }
    </script>
</body>
</html>`;
  }
}
