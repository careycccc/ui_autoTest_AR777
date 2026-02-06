import fs from 'fs';
import path from 'path';

export class HTMLReporter {
  constructor(outputDir, config) {
    this.outputDir = outputDir;
    this.config = config;
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  async generate(results) {
    const jsonPath = path.join(this.outputDir, 'test-report.json');
    const htmlPath = path.join(this.outputDir, 'test-report.html');
    
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    
    const htmlContent = this.generateHTML(results);
    fs.writeFileSync(htmlPath, htmlContent);
    
    return { htmlPath, jsonPath };
  }

  generateHTML(results) {
    const { total, passed, failed, skipped, suites, duration, thresholdViolations } = results;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    
    const allPerformance = [];
    const allNetworkRequests = [];
    
    suites.forEach(suite => {
      if (suite.performance) allPerformance.push(...suite.performance);
      if (suite.networkRequests) allNetworkRequests.push(...suite.networkRequests);
    });

    const criticalViolations = (thresholdViolations || []).filter(v => v.level === 'critical');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI自动化测试报告</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; color: #333; line-height: 1.6; }
        .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
        
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 16px; margin-bottom: 24px; }
        header h1 { font-size: 32px; margin-bottom: 16px; text-align: center; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 16px; margin-top: 20px; }
        .summary-item { text-align: center; background: rgba(255,255,255,0.15); padding: 16px; border-radius: 12px; }
        .summary-value { font-size: 32px; font-weight: bold; }
        .summary-label { font-size: 13px; opacity: 0.9; }
        .summary-item.passed .summary-value { color: #4ade80; }
        .summary-item.failed .summary-value { color: #f87171; }
        
        .tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .tab { padding: 12px 24px; background: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; color: #666; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .tab:hover { background: #f8f9fa; }
        .tab.active { background: #667eea; color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .card h3 { color: #333; margin-bottom: 16px; font-size: 18px; }
        
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
        .metric-card { background: #f8f9fa; border-radius: 12px; padding: 16px; text-align: center; position: relative; }
        .metric-value { font-size: 24px; font-weight: bold; color: #667eea; }
        .metric-label { color: #666; font-size: 12px; margin-top: 4px; }
        .metric-note { color: #999; font-size: 10px; margin-top: 4px; font-style: italic; }
        .metric-card.good { border-left: 4px solid #10b981; }
        .metric-card.good .metric-value { color: #10b981; }
        .metric-card.warning { border-left: 4px solid #f59e0b; }
        .metric-card.warning .metric-value { color: #f59e0b; }
        .metric-card.bad { border-left: 4px solid #ef4444; }
        .metric-card.bad .metric-value { color: #ef4444; }
        .metric-card.na { border-left: 4px solid #9ca3af; opacity: 0.7; }
        .metric-card.na .metric-value { color: #9ca3af; }
        
        .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .info-box h4 { color: #1e40af; margin-bottom: 8px; font-size: 14px; }
        .info-box p { color: #1e40af; font-size: 13px; margin-bottom: 4px; }
        .info-box ul { margin-left: 20px; color: #1e40af; font-size: 13px; }
        
        .suite { margin-bottom: 24px; }
        .suite-header { background: #f8f9fa; padding: 16px 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .suite-name { font-weight: 600; font-size: 16px; }
        .device-badge { display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4338ca; border-radius: 20px; font-size: 12px; font-weight: 500; margin-left: 8px; }
        .suite-body { background: white; border-radius: 0 0 12px 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        
        .test-case { border-bottom: 1px solid #f0f0f0; }
        .test-case:last-child { border-bottom: none; }
        .test-header { padding: 16px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
        .test-header:hover { background: #f8f9fa; }
        .test-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .test-status.passed { background: #dcfce7; color: #166534; }
        .test-status.failed { background: #fee2e2; color: #991b1b; }
        .test-details { display: none; padding: 0 20px 20px; background: #fafafa; }
        .test-details.open { display: block; }
        
        .step { display: flex; gap: 12px; padding: 12px 16px; background: white; border-radius: 8px; margin-bottom: 8px; }
        .step-number { background: #667eea; color: white; min-width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
        .step.failed .step-number { background: #ef4444; }
        .step-content { flex: 1; }
        .step-name { font-weight: 500; }
        .step-duration { color: #888; font-size: 12px; }
        
        .error-box { background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-top: 16px; }
        .error-message { color: #991b1b; font-weight: 500; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; font-size: 12px; color: #666; }
        .url-cell { max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
        .status-badge.completed { background: #dcfce7; color: #166534; }
        .status-badge.failed { background: #fee2e2; color: #991b1b; }
        
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; }
        .modal.open { display: flex; }
        .modal img { max-width: 95%; max-height: 95%; border-radius: 8px; }
        .modal-close { position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🧪 UI 自动化测试报告</h1>
            <div class="summary-grid">
                <div class="summary-item"><div class="summary-value">${total}</div><div class="summary-label">总用例</div></div>
                <div class="summary-item passed"><div class="summary-value">${passed}</div><div class="summary-label">通过</div></div>
                <div class="summary-item failed"><div class="summary-value">${failed}</div><div class="summary-label">失败</div></div>
                <div class="summary-item"><div class="summary-value">${passRate}%</div><div class="summary-label">通过率</div></div>
                <div class="summary-item"><div class="summary-value">${(duration / 1000).toFixed(1)}s</div><div class="summary-label">耗时</div></div>
            </div>
        </header>

        <div class="tabs">
            <button class="tab active" onclick="showTab('results')">📋 测试结果</button>
            <button class="tab" onclick="showTab('performance')">📊 性能数据</button>
            <button class="tab" onclick="showTab('network')">🌐 网络</button>
        </div>

        <div id="results" class="tab-content active">
            ${suites.map(suite => this.generateSuiteHTML(suite)).join('')}
        </div>

        <div id="performance" class="tab-content">
            ${this.generatePerformanceHTML(allPerformance)}
        </div>

        <div id="network" class="tab-content">
            ${this.generateNetworkHTML(allNetworkRequests)}
        </div>
    </div>

    <div class="modal" id="imageModal" onclick="closeModal()">
        <span class="modal-close">&times;</span>
        <img id="modalImage" src="">
    </div>

    <script>
        function showTab(tabId) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        }
        function toggleTest(el) { el.nextElementSibling.classList.toggle('open'); }
        function openImage(src) {
            document.getElementById('modalImage').src = src;
            document.getElementById('imageModal').classList.add('open');
        }
        function closeModal() { document.getElementById('imageModal').classList.remove('open'); }
    </script>
</body>
</html>`;
  }

  generateSuiteHTML(suite) {
    const passedCount = suite.tests.filter(t => t.status === 'passed').length;
    const failedCount = suite.tests.filter(t => t.status === 'failed').length;
    
    return `
      <div class="suite">
        <div class="suite-header">
          <div class="suite-name">📁 ${suite.name}<span class="device-badge">${suite.device || 'Desktop'}</span></div>
          <div>
            <span style="color: #10b981">✓ ${passedCount}</span>
            <span style="color: #ef4444; margin-left: 12px;">✗ ${failedCount}</span>
            <span style="color: #888; margin-left: 12px;">⏱ ${(suite.duration / 1000).toFixed(2)}s</span>
          </div>
        </div>
        <div class="suite-body">
          ${suite.tests.map(test => `
            <div class="test-case">
              <div class="test-header" onclick="toggleTest(this)">
                <div>
                  <span class="test-status ${test.status}">${test.status === 'passed' ? '✓' : '✗'} ${test.status}</span>
                  <span style="margin-left: 12px;">${test.name}</span>
                </div>
                <span style="color: #888; font-size: 13px;">${(test.duration / 1000).toFixed(2)}s</span>
              </div>
              <div class="test-details">
                ${test.error ? `<div class="error-box"><div class="error-message">❌ ${test.error.message}</div></div>` : ''}
                ${test.steps.length > 0 ? `
                  <div style="margin-top: 16px;">
                    ${test.steps.map(step => `
                      <div class="step ${step.status}">
                        <div class="step-number">${step.number}</div>
                        <div class="step-content">
                          <div class="step-name">${step.name}</div>
                          <div class="step-duration">${(step.duration / 1000).toFixed(2)}s</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  generatePerformanceHTML(performanceData) {
    if (performanceData.length === 0) {
      return '<div class="card"><p style="color: #888; text-align: center;">暂无性能数据</p></div>';
    }

    const latest = performanceData[performanceData.length - 1];
    const wv = latest.webVitals || {};
    const cpu = latest.cpu || {};
    const fps = latest.fps || {};
    const frameStats = latest.frameStats || {};
    const lt = latest.longTaskStats || {};
    const gpuEst = latest.gpuEstimate || {};
    const interactionHappened = latest.interactionHappened || false;

    const getClass = (value, warning, critical, reverse = false) => {
      if (value === null || value === undefined || isNaN(value)) return 'na';
      if (reverse) {
        if (value <= critical) return 'bad';
        if (value <= warning) return 'warning';
        return 'good';
      } else {
        if (value >= critical) return 'bad';
        if (value >= warning) return 'warning';
        return 'good';
      }
    };

    const formatValue = (v, unit = '', decimals = 0) => {
      if (v === null || v === undefined || isNaN(v)) return 'N/A';
      return v.toFixed(decimals) + unit;
    };

    return `
      <div class="card">
        <h3>⚡ Web Vitals</h3>
        <div class="metrics-grid">
          <div class="metric-card ${getClass(wv.lcp, 2500, 4000)}">
            <div class="metric-value">${formatValue(wv.lcp, 'ms')}</div>
            <div class="metric-label">LCP</div>
          </div>
          <div class="metric-card ${getClass(wv.fcp, 1800, 3000)}">
            <div class="metric-value">${formatValue(wv.fcp, 'ms')}</div>
            <div class="metric-label">FCP</div>
          </div>
          <div class="metric-card ${getClass(wv.cls, 0.1, 0.25)}">
            <div class="metric-value">${wv.cls !== undefined ? wv.cls.toFixed(4) : 'N/A'}</div>
            <div class="metric-label">CLS</div>
          </div>
          <div class="metric-card ${getClass(wv.ttfb, 800, 1800)}">
            <div class="metric-value">${formatValue(wv.ttfb, 'ms')}</div>
            <div class="metric-label">TTFB</div>
          </div>
          <div class="metric-card ${interactionHappened ? getClass(wv.fid, 100, 300) : 'na'}">
            <div class="metric-value">${formatValue(wv.fid, 'ms')}</div>
            <div class="metric-label">FID</div>
            <div class="metric-note">${interactionHappened ? '' : '需要用户交互'}</div>
          </div>
          <div class="metric-card ${interactionHappened ? getClass(wv.inp, 200, 500) : 'na'}">
            <div class="metric-value">${formatValue(wv.inp, 'ms')}</div>
            <div class="metric-label">INP</div>
            <div class="metric-note">${interactionHappened ? '' : '需要用户交互'}</div>
          </div>
        </div>
      </div>

      <div class="info-box">
        <h4>ℹ️ 关于 FID 和 INP</h4>
        <p><strong>FID (First Input Delay)</strong>: 用户首次交互（点击、触摸）到浏览器响应的延迟时间。</p>
        <p><strong>INP (Interaction to Next Paint)</strong>: 所有交互中响应最慢的延迟时间。</p>
        <p>⚠️ 这两个指标需要<strong>用户实际进行交互操作</strong>（如点击按钮）才能采集到数据。自动化测试中如果没有触发交互，这些值会显示为 N/A。</p>
      </div>

      <div class="card">
        <h3>🖥️ CPU 使用情况</h3>
        <div class="metrics-grid">
          <div class="metric-card ${getClass(cpu.usage, 50, 80)}">
            <div class="metric-value">${formatValue(cpu.usage, '%', 1)}</div>
            <div class="metric-label">CPU 使用率</div>
            <div class="metric-note">基于任务执行时间估算</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${formatValue(cpu.totalScriptTime, 'ms')}</div>
            <div class="metric-label">脚本执行时间</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${formatValue(cpu.totalLayoutTime, 'ms')}</div>
            <div class="metric-label">布局计算时间</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${formatValue(cpu.totalTaskTime, 'ms')}</div>
            <div class="metric-label">总任务时间</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>🎮 GPU & 渲染</h3>
        <div class="metrics-grid">
          <div class="metric-card ${gpuEst.load !== undefined ? getClass(gpuEst.load, 60, 80) : 'na'}">
            <div class="metric-value">${gpuEst.load !== undefined ? gpuEst.load + '%' : 'N/A'}</div>
            <div class="metric-label">GPU 负载估算</div>
            <div class="metric-note">${gpuEst.note || '基于帧时间估算'}</div>
          </div>
          <div class="metric-card ${frameStats.avgFrameTime ? getClass(frameStats.avgFrameTime, 16.67, 33.33) : 'na'}">
            <div class="metric-value">${formatValue(frameStats.avgFrameTime, 'ms', 2)}</div>
            <div class="metric-label">平均帧时间</div>
            <div class="metric-note">目标: ≤16.67ms (60fps)</div>
          </div>
          <div class="metric-card ${frameStats.jankRate !== undefined ? getClass(frameStats.jankRate, 5, 15) : 'na'}">
            <div class="metric-value">${formatValue(frameStats.jankRate, '%', 1)}</div>
            <div class="metric-label">丢帧率</div>
            <div class="metric-note">帧时间 >16.67ms 的比例</div>
          </div>
          <div class="metric-card" style="grid-column: span 2;">
            <div class="metric-value" style="font-size: 14px;">${latest.gpu?.renderer || 'N/A'}</div>
            <div class="metric-label">GPU 型号</div>
          </div>
        </div>
      </div>

      <div class="info-box">
        <h4>ℹ️ GPU 负载估算说明</h4>
        <p>GPU 负载是<strong>基于帧渲染时间估算</strong>的，并非真实 GPU 使用率（浏览器不提供此数据）。</p>
        <ul>
          <li><strong>0-25%</strong>: 页面简单，GPU 很空闲（帧时间 1-8ms）</li>
          <li><strong>25-60%</strong>: 正常渲染负载（帧时间 8-16.67ms）</li>
          <li><strong>60-90%</strong>: 较高负载，可能开始掉帧（帧时间 16.67-33.33ms）</li>
          <li><strong>90-100%</strong>: 高负载，明显卡顿（帧时间 >33.33ms）</li>
        </ul>
      </div>

      <div class="card">
        <h3>🎬 帧率 (FPS)</h3>
        <div class="metrics-grid">
          <div class="metric-card ${getClass(fps.current, 50, 30, true)}">
            <div class="metric-value">${fps.current || 'N/A'}</div>
            <div class="metric-label">当前 FPS</div>
          </div>
          <div class="metric-card ${getClass(fps.avg, 50, 30, true)}">
            <div class="metric-value">${fps.avg || 'N/A'}</div>
            <div class="metric-label">平均 FPS</div>
          </div>
          <div class="metric-card ${getClass(fps.min, 50, 30, true)}">
            <div class="metric-value">${fps.min || 'N/A'}</div>
            <div class="metric-label">最低 FPS</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${fps.max || 'N/A'}</div>
            <div class="metric-label">最高 FPS</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>⏱️ Long Tasks (>50ms)</h3>
        <div class="metrics-grid">
          <div class="metric-card ${getClass(lt.count, 5, 10)}">
            <div class="metric-value">${lt.count || 0}</div>
            <div class="metric-label">任务数量</div>
          </div>
          <div class="metric-card ${getClass(lt.maxDuration, 100, 200)}">
            <div class="metric-value">${formatValue(lt.maxDuration, 'ms')}</div>
            <div class="metric-label">最长任务</div>
          </div>
          <div class="metric-card ${getClass(lt.totalDuration, 200, 500)}">
            <div class="metric-value">${formatValue(lt.totalDuration, 'ms')}</div>
            <div class="metric-label">总阻塞时间 (TBT)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${formatValue(lt.avgDuration, 'ms')}</div>
            <div class="metric-label">平均耗时</div>
          </div>
        </div>
      </div>

      <div class="info-box">
        <h4>ℹ️ Long Tasks 说明</h4>
        <p><strong>Long Task (长任务)</strong>是指执行时间超过 50ms 的 JavaScript 任务。</p>
        <p><strong>为什么重要？</strong></p>
        <ul>
          <li>浏览器主线程是单线程的，长任务会阻塞用户交互</li>
          <li>当任务执行超过 50ms 时，用户会感觉到界面"卡顿"</li>
          <li><strong>50-100ms</strong>: 轻微延迟感</li>
          <li><strong>100-300ms</strong>: 明显卡顿</li>
          <li><strong>>300ms</strong>: 严重卡顿，用户体验差</li>
        </ul>
        <p><strong>总阻塞时间 (TBT)</strong>: 所有长任务超过 50ms 部分的时间总和，是衡量页面响应能力的重要指标。</p>
      </div>

      <div class="card">
        <h3>💾 内存 & DOM</h3>
        <div class="metrics-grid">
          <div class="metric-card ${getClass(latest.memory?.usedJSHeapSize ? latest.memory.usedJSHeapSize / 1024 / 1024 : 0, 50, 100)}">
            <div class="metric-value">${latest.memory?.usedJSHeapSize ? (latest.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}</div>
            <div class="metric-label">JS Heap</div>
          </div>
          <div class="metric-card ${getClass(latest.dom?.nodes, 1500, 3000)}">
            <div class="metric-value">${latest.dom?.nodes || 'N/A'}</div>
            <div class="metric-label">DOM 节点</div>
          </div>
          <div class="metric-card ${getClass(latest.dom?.jsEventListeners, 500, 1000)}">
            <div class="metric-value">${latest.dom?.jsEventListeners || 'N/A'}</div>
            <div class="metric-label">事件监听器</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${latest.dom?.frames || 'N/A'}</div>
            <div class="metric-label">Frames</div>
          </div>
        </div>
      </div>
    `;
  }

  generateNetworkHTML(requests) {
    if (!requests || requests.length === 0) {
      return '<div class="card"><p style="color: #888; text-align: center;">暂无网络请求</p></div>';
    }

    const stats = {
      total: requests.length,
      completed: requests.filter(r => r.status === 'completed').length,
      failed: requests.filter(r => r.status === 'failed').length,
      totalSize: requests.reduce((sum, r) => sum + (r.size || 0), 0)
    };

    const formatBytes = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return `
      <div class="card">
        <h3>📊 网络统计</h3>
        <div class="metrics-grid">
          <div class="metric-card"><div class="metric-value">${stats.total}</div><div class="metric-label">总请求</div></div>
          <div class="metric-card good"><div class="metric-value">${stats.completed}</div><div class="metric-label">成功</div></div>
          <div class="metric-card ${stats.failed > 0 ? 'bad' : ''}"><div class="metric-value">${stats.failed}</div><div class="metric-label">失败</div></div>
          <div class="metric-card"><div class="metric-value">${formatBytes(stats.totalSize)}</div><div class="metric-label">总大小</div></div>
        </div>
      </div>
      <div class="card">
        <h3>📋 请求列表</h3>
        <div style="overflow-x: auto;">
          <table>
            <thead><tr><th>状态</th><th>方法</th><th>URL</th><th>类型</th><th>大小</th><th>耗时</th></tr></thead>
            <tbody>
              ${requests.slice(0, 50).map(req => `
                <tr>
                  <td><span class="status-badge ${req.status}">${req.status}</span></td>
                  <td>${req.method}</td>
                  <td class="url-cell" title="${req.url}">${req.url}</td>
                  <td>${req.resourceType || '-'}</td>
                  <td>${formatBytes(req.size)}</td>
                  <td>${req.duration ? req.duration.toFixed(0) + 'ms' : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  getRelativePath(absolutePath) {
    return './screenshots/' + path.basename(absolutePath);
  }
}
