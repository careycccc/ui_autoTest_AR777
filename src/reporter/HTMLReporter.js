import fs from 'fs';
import path from 'path';
import { PerformanceAnalyzer } from '../utils/PerformanceAnalyzer.js';

export class HTMLReporter {
  constructor(outputDir, config) {
    this.outputDir = outputDir;
    this.config = config;
    this.analyzer = new PerformanceAnalyzer(config?.thresholds);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    this.metricDescriptions = {
      'LCP': { name: '最大内容绘制', desc: '主要内容加载时间', good: '<2.5s', bad: '>4s' },
      'FCP': { name: '首次内容绘制', desc: '首次渲染时间', good: '<1.8s', bad: '>3s' },
      'CLS': { name: '累积布局偏移', desc: '视觉稳定性', good: '<0.1', bad: '>0.25' },
      'FID': { name: '首次输入延迟', desc: '交互响应时间', good: '<100ms', bad: '>300ms' },
      'INP': { name: '交互到绘制', desc: '交互性能', good: '<200ms', bad: '>500ms' },
      'TTFB': { name: '首字节时间', desc: '服务器响应', good: '<800ms', bad: '>1.8s' },
      'First Paint': { name: '首次绘制', desc: '首次像素渲染', good: '<1s', bad: '>2s' },
      'DOM Ready': { name: 'DOM加载', desc: 'HTML解析完成', good: '<2s', bad: '>4s' },
      'Load': { name: '完全加载', desc: '所有资源加载', good: '<3s', bad: '>6s' },
      'DNS': { name: 'DNS解析', desc: '域名解析', good: '<50ms', bad: '>100ms' },
      'TCP': { name: 'TCP连接', desc: '连接耗时', good: '<100ms', bad: '>200ms' },
      'Response': { name: '响应时间', desc: '服务器响应', good: '<200ms', bad: '>500ms' },
      'JS Heap': { name: 'JS内存', desc: '内存使用', good: '<50MB', bad: '>100MB' },
      'DOM Nodes': { name: 'DOM节点', desc: '元素数量', good: '<1500', bad: '>3000' },
      'Event Listeners': { name: '事件监听', desc: '监听器数量', good: '<500', bad: '>1000' },
      'CPU': { name: 'CPU', desc: '处理器占用', good: '<50%', bad: '>80%' },
      'FPS': { name: '帧率', desc: '渲染帧率', good: '>50', bad: '<30' },
      'Layout Count': { name: '布局次数', desc: '重排次数', good: '<50', bad: '>100' },
      'TBT': { name: '总阻塞时间', desc: '长任务阻塞总时长', good: '<200ms', bad: '>600ms' },
      '切换耗时': { name: '页面切换', desc: 'SPA路由切换耗时', good: '<2s', bad: '>5s' },
      '长任务数': { name: '长任务', desc: '超过50ms的任务', good: '<3', bad: '>10' },
      '最长阻塞': { name: '最长阻塞', desc: '最长的一次阻塞', good: '<100ms', bad: '>200ms' },
      '严重卡顿': { name: '严重卡顿', desc: '超过100ms的任务', good: '0次', bad: '>3次' },
      '新资源数': { name: '新资源', desc: '切换后加载的资源', good: '<20', bad: '>50' },
      '新资源大小': { name: '新资源大小', desc: '新加载资源总大小', good: '<500KB', bad: '>2MB' }

    };
  }

  // 🔥 新增：按父子关系分组页面
  groupPagesByParent(allPageRecords) {
    const groups = [];
    const parentMap = new Map();
    const processedIndices = new Set();

    // 第一步：收集所有被引用的父页面名称
    const referencedParentNames = new Set();
    allPageRecords.forEach(page => {
      if (page.parentTab) referencedParentNames.add(page.parentTab);
    });

    // 第二步：识别父页面（没有 parentTab/parentCase 且被其他页面引用）
    // 🔥 改进：对于同名的父页面，选择 URL 最简单的那个（通常是父页面）
    const candidateParents = new Map(); // key = pageName, value = [pages]

    // 收集所有候选父页面
    allPageRecords.forEach((page, index) => {
      const pageName = page.name || `页面 ${index + 1}`;
      // 🔥 修复：父页面的特征是 parentCase 为 null（没有子用例名称）
      // parentTab 可能等于自己的名字，也可能是 null
      const isParentPage = !page.parentCase || page.parentCase === null || page.parentCase === 'null';

      if (isParentPage && referencedParentNames.has(pageName)) {
        if (!candidateParents.has(pageName)) {
          candidateParents.set(pageName, []);
        }
        candidateParents.get(pageName).push({ page, index });
        console.log(`🔍 候选父页面: "${pageName}" (index: ${index}, parentTab: "${page.parentTab}", parentCase: "${page.parentCase}")`);
      }
    });

    // 为每个父页面名称选择最合适的页面
    candidateParents.forEach((candidates, pageName) => {
      // 🔥 选择策略：
      // 1. 优先选择 URL 路径最短的（通常是父页面，如 /earn）
      // 2. 如果路径长度相同，选择索引最小的（最早创建的）
      const bestCandidate = candidates.sort((a, b) => {
        const urlA = a.page.url || '';
        const urlB = b.page.url || '';

        // 提取路径部分（去掉域名和查询参数）
        const pathA = urlA.split('?')[0].split('#')[0];
        const pathB = urlB.split('?')[0].split('#')[0];

        // 计算路径深度（斜杠数量）
        const depthA = (pathA.match(/\//g) || []).length;
        const depthB = (pathB.match(/\//g) || []).length;

        if (depthA !== depthB) {
          return depthA - depthB; // 路径越短越好
        }

        // 路径深度相同，选择索引小的
        return a.index - b.index;
      })[0];

      const parentGroup = {
        name: pageName,
        index: bestCandidate.index,
        children: [],
        isParent: true,
        parentPage: bestCandidate.page
      };
      parentMap.set(pageName, parentGroup);
      groups.push(parentGroup);
      processedIndices.add(bestCandidate.index);

      console.log(`识别父页面: ${pageName} (index: ${bestCandidate.index}, url: ${bestCandidate.page.url})`);

      // 标记其他候选页面为已处理（避免重复）
      candidates.forEach(({ index }) => {
        if (index !== bestCandidate.index) {
          processedIndices.add(index);
          console.log(`跳过重复的父页面: ${pageName} (index: ${index})`);
        }
      });
    });

    // 🔥 第三步：将子页面添加到对应的父分组（去重）
    const addedCases = new Map(); // 用于去重：key = parentTab + caseName

    console.log(`\n🔍 开始处理子页面，总页面数: ${allPageRecords.length}`);

    allPageRecords.forEach((page, index) => {
      if (processedIndices.has(index)) return;

      const pageName = page.name || `页面 ${index + 1}`;
      const parentTab = page.parentTab;
      const caseName = page.parentCase;

      console.log(`🔍 页面 #${index}: "${pageName}", parentTab: "${parentTab}", parentCase: "${caseName}"`);

      if (parentTab) {
        // 有父页面，添加到父分组
        const parentGroup = parentMap.get(parentTab);
        console.log(`🔍 查找父分组 "${parentTab}": ${parentGroup ? '找到' : '未找到'}`);

        if (parentGroup) {
          // 🔥 去重：同一个父用例下，相同的 caseName 只添加一次（取第一个）
          const dedupeKey = `${parentTab}::${caseName}`;

          if (!addedCases.has(dedupeKey)) {
            parentGroup.children.push({
              name: pageName,
              fullName: pageName,
              index: index,
              page: page,
              caseName: caseName
            });
            addedCases.set(dedupeKey, true);
            console.log(`✅ 添加子页面到 "${parentTab}": "${caseName}"`);
          } else {
            console.log(`⏭️ 跳过重复子页面: "${caseName}"`);
          }

          processedIndices.add(index);
        }
      }
    });

    // 第四步：处理剩余的独立页面（没有父页面且不是父页面）
    allPageRecords.forEach((page, index) => {
      if (processedIndices.has(index)) return;

      const pageName = page.name || `页面 ${index + 1}`;
      const group = {
        name: pageName,
        index: index,
        children: [],
        isParent: false,
        page: page
      };
      groups.push(group);
      processedIndices.add(index);
    });

    // 🔥 第五步：按照定义的顺序排序
    // 顺序：首页 → 登录页 → 登录成功页 → 5个注册的父用例（按注册顺序）
    const pageOrder = ['首页', '登录页', '登录成功页', '活动资讯页', '新版返佣', '菜单页', '邀请转盘', 'home'];
    groups.sort((a, b) => {
      const aIndex = pageOrder.indexOf(a.name);
      const bIndex = pageOrder.indexOf(b.name);

      // 如果都在顺序列表中，按顺序排
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      // 如果只有a在列表中，a排前面
      if (aIndex !== -1) return -1;
      // 如果只有b在列表中，b排前面
      if (bIndex !== -1) return 1;
      // 都不在列表中，保持原顺序
      return 0;
    });

    return groups;
  }

  // 🔥 改进：渲染手风琴式页面导航
  renderPageNavigation(pageGroups) {
    let html = '';

    pageGroups.forEach((group, groupIndex) => {
      if (group.children.length > 0) {
        // 有子页面的父页面 - 手风琴样式
        const totalCount = group.children.length + 1; // +1 是父页面本身
        const hasErrors = group.parentPage?.apiErrors?.length > 0 ||
          group.children.some(c => c.page?.apiErrors?.length > 0);

        html += `
          <div class="page-nav-group">
            <button class="page-nav-parent ${groupIndex === 0 ? 'active' : ''}" data-group="${groupIndex}">
              <span class="nav-icon">▶</span>
              ${group.name}
              <span class="child-count">${totalCount} 项</span>
              ${hasErrors ? '<span class="error-badge">!</span>' : ''}
            </button>
            <div class="page-nav-children ${groupIndex === 0 ? 'expanded' : ''}">
              <!-- 第一项：父页面本身 -->
              <button class="page-nav-btn page-nav-child ${groupIndex === 0 ? 'active' : ''}" data-index="${group.index}">
                <span class="child-icon">📄</span>
                ${group.name}（主页）
                ${group.parentPage?.apiErrors?.length > 0 ? '<span class="error-badge">' + group.parentPage.apiErrors.length + '</span>' : ''}
              </button>
              <!-- 后续项：子用例 -->
              ${group.children.map((child, childIndex) => `
                <button class="page-nav-btn page-nav-child" data-index="${child.index}">
                  <span class="child-icon">└─</span>
                  ${child.caseName || child.name}
                  ${child.page?.apiErrors?.length > 0 ? '<span class="error-badge">' + child.page.apiErrors.length + '</span>' : ''}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        // 独立页面 - 普通按钮
        html += `
          <button class="page-nav-btn page-nav-single ${groupIndex === 0 && pageGroups[0].children.length === 0 ? 'active' : ''}" data-index="${group.index}">
            ${group.name}
            ${group.page?.apiErrors?.length > 0 ? '<span class="error-badge">' + group.page.apiErrors.length + '</span>' : ''}
          </button>
        `;
      }
    });

    return html;
  }

  imageToBase64(imagePath) {
    try {
      if (!fs.existsSync(imagePath)) return null;
      const buf = fs.readFileSync(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch { return null; }
  }

  async generate(results) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlPath = path.join(this.outputDir, `test-report-${ts}.html`);
    fs.writeFileSync(htmlPath, this.generateHTML(results));
    console.log('\n📊 报告已生成:', htmlPath);
    return { htmlPath };
  }

  generateHTML(results) {
    const { total, passed, failed, duration, suites, apiErrors } = results;

    // 🔥 新的统计逻辑：统计所有页面记录（包括子用例）
    const allPageRecords = [];
    for (const suite of suites) {
      if (suite.pageRecords) allPageRecords.push(...suite.pageRecords);
    }

    // 🔥 按页面名称分组，构建父子关系
    const pageGroups = this.groupPagesByParent(allPageRecords);

    // 🔥 重新计算通过/失败数（基于页面记录）
    const totalTests = allPageRecords.length; // 总测试数 = 页面切换次数
    let passedTests = 0;
    let failedTests = 0;

    // 统计每个页面的状态
    allPageRecords.forEach(page => {
      // 如果页面有测试失败标记、错误截图或API错误，算作失败
      if (page.testFailed || page.errorScreenshotTaken || (page.apiErrors && page.apiErrors.length > 0)) {
        failedTests++;
      } else {
        passedTests++;
      }
    });

    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UI自动化测试报告</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { background: white; border-radius: 16px; padding: 30px; margin-bottom: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .header h1 { color: #333; font-size: 28px; }
    .header-meta { color: #666; margin-top: 10px; font-size: 14px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .stat-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .stat-value { font-size: 28px; font-weight: 700; }
    .stat-label { color: #666; margin-top: 8px; font-size: 13px; }
    .stat-passed .stat-value { color: #10b981; }
    .stat-failed .stat-value { color: #ef4444; }
    .stat-rate .stat-value { color: #667eea; }
    
    /* 🔥 失败用例统计区域 - 可点击展开，最高优先级 */
    .stat-card.stat-failed { cursor: pointer; position: relative; z-index: 10000; }
    .stat-card.stat-failed:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(239, 68, 68, 0.15); }
    .failed-cases-dropdown { position: absolute; top: 100%; left: 0; right: 0; margin-top: 8px; background: white; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.25); z-index: 10001; display: none; max-height: 300px; overflow-y: auto; border: 2px solid #ef4444; }
    .failed-cases-dropdown.show { display: block; animation: slideDown 0.2s ease-out; }
    .failed-case-item { padding: 12px 16px; border-bottom: 1px solid #fee2e2; cursor: pointer; transition: all 0.2s; }
    .failed-case-item:last-child { border-bottom: none; }
    .failed-case-item:hover { background: #fef2f2; }
    .failed-case-name { font-size: 13px; font-weight: 500; color: #dc2626; margin-bottom: 4px; }
    .failed-case-reason { font-size: 12px; color: #6b7280; display: none; }
    .failed-case-item.expanded .failed-case-reason { display: block; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #fecaca; }
    
    .page-nav { background: white; border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
    
    /* 🔥 下拉框宽度自适应 */
    .page-nav-group { display: inline-flex; flex-direction: column; position: relative; margin-bottom: 8px; min-width: fit-content; max-width: 100%; z-index: 100; }
    
    .page-nav-parent { padding: 12px 20px; border: 2px solid #e5e7eb; background: #f9fafb; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; color: #374151; transition: all 0.3s; display: flex; align-items: center; gap: 8px; width: auto; text-align: left; white-space: nowrap; }
    .page-nav-parent:hover { border-color: #667eea; background: white; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1); }
    .page-nav-parent.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-color: transparent; color: white; }
    .page-nav-parent.expanded { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
    .nav-icon { font-size: 10px; transition: transform 0.3s; display: inline-block; }
    .page-nav-group.expanded .nav-icon { transform: rotate(90deg); }
    .child-count { font-size: 11px; opacity: 0.7; margin-left: auto; padding: 2px 8px; background: rgba(0,0,0,0.05); border-radius: 12px; white-space: nowrap; }
    .page-nav-parent.active .child-count { background: rgba(255,255,255,0.2); }
    
    /* 🔥 下拉列表绝对定位，宽度自适应内容，z-index 低于失败用例下拉框 */
    .page-nav-children { position: absolute; top: 100%; left: 0; z-index: 99; display: none; flex-direction: column; gap: 4px; padding: 8px; background: white; border: 2px solid #e5e7eb; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-width: 100%; width: max-content; }
    .page-nav-children.expanded { display: flex; animation: slideDown 0.3s ease-out; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .page-nav-child { padding: 10px 16px; border: 1px solid #e5e7eb; background: white; border-radius: 6px; font-size: 13px; display: flex; align-items: center; gap: 8px; transition: all 0.2s; white-space: nowrap; cursor: pointer; }
    .page-nav-child:hover { border-color: #667eea; background: #f0f4ff; transform: translateX(4px); }
    .child-icon { font-size: 12px; color: #9ca3af; }
    
    /* 🔥 独立页面按钮 */
    .page-nav-btn.page-nav-single { padding: 10px 20px; border: 2px solid #e5e7eb; background: white; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; color: #374151; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
    .page-nav-btn.page-nav-single:hover { border-color: #667eea; color: #667eea; }
    .page-nav-btn.page-nav-single.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-color: transparent; color: white; }
    
    .page-nav-btn { padding: 10px 20px; border: 2px solid #e5e7eb; background: white; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; color: #374151; transition: all 0.2s; }
    .page-nav-btn:hover { border-color: #667eea; color: #667eea; }
    .page-nav-btn.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-color: transparent; color: white; }
    .error-badge { background: #ef4444; color: white; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-left: 6px; font-weight: 600; }
    .page-section { display: none; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .page-section.active { display: block; }
    .page-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; }
    .page-title { font-size: 20px; font-weight: 600; }
    .page-url { font-size: 12px; opacity: 0.9; word-break: break-all; font-family: monospace; background: rgba(255,255,255,0.1); padding: 8px; border-radius: 6px; margin-top: 8px; }
    .page-meta { display: flex; gap: 20px; margin-top: 10px; font-size: 13px; opacity: 0.9; flex-wrap: wrap; }
    .section-tabs { display: flex; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
    .section-tab { padding: 14px 24px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #6b7280; position: relative; }
    .section-tab:hover { color: #667eea; }
    .section-tab.active { color: #667eea; background: white; }
    .section-tab.active::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #667eea; }
    .section-tab .badge { background: #ef4444; color: white; font-size: 11px; padding: 2px 6px; border-radius: 10px; margin-left: 6px; }
    .tab-panel { display: none; padding: 24px; }
    .tab-panel.active { display: block; }
    .metrics-section { margin-bottom: 28px; }
    .metrics-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #f3f4f6; }
    .metrics-section-title { font-size: 15px; font-weight: 600; color: #374151; }
    .metrics-section-desc { font-size: 12px; color: #9ca3af; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }
    .metric-card { background: #f9fafb; border-radius: 10px; padding: 14px; border: 1px solid #e5e7eb; }
    .metric-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
    .metric-name { font-size: 11px; color: #6b7280; font-weight: 500; }
    .metric-name-cn { font-size: 10px; color: #9ca3af; }
    .metric-status { font-size: 9px; padding: 2px 5px; border-radius: 6px; font-weight: 500; }
    .metric-status.good { background: #d1fae5; color: #059669; }
    .metric-status.warning { background: #fef3c7; color: #d97706; }
    .metric-status.bad { background: #fee2e2; color: #dc2626; }
    .metric-value-row { display: flex; align-items: baseline; gap: 3px; margin: 6px 0; }
    .metric-value { font-size: 22px; font-weight: 700; }
    .metric-unit { font-size: 11px; color: #9ca3af; }
    .metric-good { color: #10b981; }
    .metric-warning { color: #f59e0b; }
    .metric-bad { color: #ef4444; }
    .metric-na { color: #9ca3af; }
    .metric-desc { font-size: 10px; color: #9ca3af; line-height: 1.4; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; }
    .analysis-good { display: flex; align-items: center; gap: 16px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 1px solid #6ee7b7; border-radius: 12px; padding: 20px; margin-top: 24px; }
    .analysis-good-icon { font-size: 28px; }
    .analysis-good-text strong { color: #059669; font-size: 15px; }
    .analysis-good-text span { color: #047857; font-size: 13px; display: block; margin-top: 4px; }
    .analysis-section { background: #f9fafb; border-radius: 12px; padding: 20px; margin-top: 24px; border: 1px solid #e5e7eb; }
    .analysis-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
    .analysis-header h3 { font-size: 16px; color: #374151; margin: 0; }
    .analysis-score { padding: 6px 14px; border-radius: 16px; font-weight: 600; font-size: 13px; }
    .score-a { background: #d1fae5; color: #059669; }
    .score-b { background: #fef3c7; color: #d97706; }
    .score-c { background: #fed7aa; color: #c2410c; }
    .score-d, .score-f { background: #fee2e2; color: #dc2626; }
    .issue-group { margin-top: 16px; }
    .issue-group-title { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px; }
    .issue-card { background: white; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e5e7eb; overflow: hidden; cursor: pointer; }
    .issue-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #f9fafb; }
    .issue-icon { font-size: 14px; }
    .issue-title { flex: 1; font-weight: 500; color: #374151; font-size: 13px; }
    .expand-icon { font-size: 11px; color: #9ca3af; transition: transform 0.2s; }
    .issue-card.expanded .expand-icon { transform: rotate(180deg); }
    .issue-body { display: none; padding: 16px; border-top: 1px solid #e5e7eb; }
    .issue-card.expanded .issue-body { display: block; }
    .issue-desc { color: #6b7280; font-size: 13px; margin-bottom: 12px; line-height: 1.5; }
    .issue-section { margin-top: 14px; padding-top: 12px; border-top: 1px solid #f3f4f6; }
    .issue-section h5 { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 10px; }
    .cause-item { background: #fef2f2; border-radius: 6px; padding: 12px; margin-bottom: 10px; border-left: 3px solid #f87171; }
    .cause-reason { font-weight: 500; color: #dc2626; font-size: 12px; margin-bottom: 4px; }
    .cause-detail { color: #6b7280; font-size: 12px; line-height: 1.4; }
    .cause-suggestion { color: #059669; font-size: 11px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #fecaca; }
    .cause-resources { margin-top: 10px; overflow-x: auto; }
    .resource-table { width: 100%; font-size: 11px; border-collapse: collapse; }
    .resource-table th { background: #fee2e2; padding: 6px 10px; text-align: left; font-weight: 600; color: #991b1b; }
    .resource-table td { padding: 6px 10px; border-bottom: 1px solid #fecaca; color: #374151; }
    .resource-url { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 10px; }
    .detail-block { background: #f3f4f6; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
    .detail-label { font-weight: 600; color: #374151; font-size: 12px; margin-bottom: 6px; }
    .detail-list { margin: 0; padding: 0; list-style: none; }
    .detail-list li { margin-bottom: 3px; }
    .detail-list pre { margin: 0; padding: 6px 10px; background: #1f2937; color: #f9fafb; border-radius: 4px; font-size: 10px; line-height: 1.4; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
    .issue-section.suggestions { background: #f0fdf4; border-radius: 6px; padding: 12px; border-top: none; margin-top: 12px; }
    .issue-section.suggestions h5 { color: #059669; }
    .suggestion-list { margin: 0; padding-left: 18px; }
    .suggestion-list li { color: #047857; font-size: 12px; margin-bottom: 4px; line-height: 1.4; }
    .api-table-wrapper { overflow-x: auto; }
    .api-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .api-table th { background: #f3f4f6; padding: 10px 14px; text-align: left; font-weight: 600; color: #374151; }
    .api-table td { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; }
    .api-table tbody tr { cursor: pointer; transition: background 0.2s; }
    .api-table tbody tr:hover { background: #f9fafb; }
    .api-table tbody tr.has-error { background: #fef2f2; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 16px; font-size: 11px; font-weight: 600; }
    .status-ok { background: #d1fae5; color: #059669; }
    .status-error { background: #fee2e2; color: #dc2626; }
    .url-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 11px; }
    .error-row { display: none; }
    .error-row.open { display: table-row; }
    .error-panel { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 14px; margin: 6px; }
    .error-panel-header { font-weight: 600; color: #dc2626; margin-bottom: 10px; font-size: 13px; }
    .error-field { margin-bottom: 10px; }
    .error-field-label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 3px; }
    .error-field-value { font-size: 12px; color: #374151; word-break: break-all; }
    .error-panel pre { background: #1f2937; color: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 11px; margin-top: 6px; }
    .screenshots-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .screenshot-card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
    .screenshot-img-wrapper { position: relative; background: #f3f4f6; min-height: 600px; display: flex; align-items: center; justify-content: center; }
    .screenshot-card img { width: 300px; height: 600px; object-fit: contain; display: block; margin: 0 auto; }
    .screenshot-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 600px; color: #9ca3af; }
    .screenshot-info { padding: 12px; background: #f9fafb; }
    .screenshot-name { font-weight: 600; color: #374151; font-size: 13px; }
    .screenshot-time { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .empty-state { text-align: center; padding: 50px; color: #9ca3af; }
    .empty-state-icon { font-size: 40px; margin-bottom: 12px; }
    
    /* 控制台错误样式 */
    .console-errors-wrapper { padding: 16px; }
    .console-errors-summary { display: flex; gap: 16px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; }
    .console-error-stat { display: flex; align-items: center; gap: 8px; }
    .console-error-icon { font-size: 20px; }
    .console-error-count { font-size: 24px; font-weight: 700; color: #374151; }
    .console-error-label { font-size: 12px; color: #6b7280; }
    .console-errors-list { display: flex; flex-direction: column; gap: 12px; }
    .console-error-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #fff; }
    .console-error-card.console-error-critical { border-left: 4px solid #dc2626; background: #fef2f2; }
    .console-error-card.console-error-warning { border-left: 4px solid #f59e0b; background: #fffbeb; }
    .console-error-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .console-error-number { font-size: 11px; color: #6b7280; font-weight: 600; }
    .console-error-type { font-size: 12px; font-weight: 600; color: #374151; }
    .console-error-time { font-size: 11px; color: #6b7280; margin-left: auto; }
    .console-error-message { font-size: 14px; color: #1f2937; margin-bottom: 12px; font-family: monospace; background: #f3f4f6; padding: 12px; border-radius: 4px; word-break: break-all; }
    .console-error-location { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
    .console-error-location-label { font-weight: 600; }
    .console-error-location-value { font-family: monospace; font-size: 11px; }
    .console-error-stack { margin-top: 12px; }
    .console-error-stack summary { cursor: pointer; font-size: 12px; color: #6b7280; font-weight: 600; padding: 8px; background: #f9fafb; border-radius: 4px; }
    .console-error-stack pre { margin-top: 8px; background: #1f2937; color: #f9fafb; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 11px; line-height: 1.5; }
    .console-error-screenshot { margin-top: 12px; }
    .console-error-screenshot-label { font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px; }
    .console-error-screenshot img { width: 300px; height: 600px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb; }
    .console-error-reason { margin-top: 8px; padding: 8px 12px; background: #fef2f2; color: #991b1b; font-size: 12px; border-radius: 4px; border-left: 3px solid #dc2626; }
    .console-error-duplicate { opacity: 0.7; }
    .console-error-duplicate-badge { display: inline-block; padding: 2px 8px; background: #fbbf24; color: #78350f; font-size: 10px; font-weight: 600; border-radius: 12px; margin-left: 8px; }
    .console-error-no-screenshot { margin-top: 12px; padding: 8px 12px; background: #fef3c7; color: #92400e; font-size: 12px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 UI 自动化测试报告</h1>
      <div class="header-meta">📅 ${new Date().toLocaleString('zh-CN')} | ⏱️ ${(duration / 1000).toFixed(2)}s | 📄 ${allPageRecords.length} 个页面</div>
    </div>
    
    <div class="stats">
      <div class="stat-card"><div class="stat-value">${totalTests}</div><div class="stat-label">总测试数</div></div>
      <div class="stat-card stat-passed"><div class="stat-value">${passedTests}</div><div class="stat-label">✅ 通过</div></div>
      <div class="stat-card stat-failed" id="failed-stat-card">
        <div class="stat-value">${failedTests}</div>
        <div class="stat-label">❌ 失败</div>
        ${failedTests > 0 ? `
          <div class="failed-cases-dropdown" id="failed-cases-dropdown">
            ${allPageRecords.filter(p => p.testFailed || p.errorScreenshotTaken || (p.apiErrors && p.apiErrors.length > 0)).map((page, idx) => `
              <div class="failed-case-item" data-page-index="${allPageRecords.indexOf(page)}">
                <div class="failed-case-name">${idx + 1}. ${page.name}</div>
                <div class="failed-case-reason">
                  ${page.apiErrors && page.apiErrors.length > 0 ? '🔴 API错误: ' + page.apiErrors.map(e => e.message || e.error?.message).join(', ') : ''}
                  ${page.testFailed ? '❌ 测试失败' : ''}
                  ${page.errorScreenshotTaken ? '📸 已截图' : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="stat-card stat-rate"><div class="stat-value">${passRate}%</div><div class="stat-label">通过率</div></div>
      <div class="stat-card"><div class="stat-value">${allPageRecords.length}</div><div class="stat-label">📄 页面</div></div>
      <div class="stat-card"><div class="stat-value">${apiErrors?.length || 0}</div><div class="stat-label">🔴 API错误</div></div>
    </div>
    
    <div class="page-nav">
      <span style="color: #6b7280; font-weight: 500; padding: 10px;">📑 页面:</span>
      ${this.renderPageNavigation(pageGroups)}
    </div>
    
    ${allPageRecords.map((page, i) => this.generatePageSection(page, i)).join('')}
  </div>
  
  <script>
    // 🔥 失败用例统计卡片点击展开
    var failedStatCard = document.getElementById('failed-stat-card');
    var failedDropdown = document.getElementById('failed-cases-dropdown');
    
    if (failedStatCard && failedDropdown) {
      failedStatCard.addEventListener('click', function(e) {
        // 如果点击的是失败用例项，不处理
        if (e.target.closest('.failed-case-item')) return;
        
        // 🔥 关闭所有父用例下拉框
        document.querySelectorAll('.page-nav-children.expanded').forEach(function(dropdown) {
          dropdown.classList.remove('expanded');
          var parent = dropdown.closest('.page-nav-group');
          if (parent) {
            parent.querySelector('.page-nav-parent').classList.remove('expanded');
            parent.classList.remove('expanded');
          }
        });
        
        failedDropdown.classList.toggle('show');
      });
      
      // 点击失败用例项，展开显示原因并跳转到对应页面
      document.querySelectorAll('.failed-case-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          
          // 切换展开状态
          this.classList.toggle('expanded');
          
          // 如果是展开状态，跳转到对应页面
          if (this.classList.contains('expanded')) {
            var pageIndex = parseInt(this.getAttribute('data-page-index'));
            if (!isNaN(pageIndex)) {
              // 关闭下拉框
              failedDropdown.classList.remove('show');
              
              // 切换到对应页面
              document.querySelectorAll('.page-nav-btn').forEach(function(b) {
                b.classList.remove('active');
              });
              
              var targetBtn = document.querySelector('.page-nav-btn[data-index="' + pageIndex + '"]');
              if (targetBtn) {
                targetBtn.classList.add('active');
              }
              
              document.querySelectorAll('.page-section').forEach(function(s, i) {
                s.classList.toggle('active', i === pageIndex);
              });
            }
          }
        });
      });
      
      // 点击外部关闭下拉框
      document.addEventListener('click', function(e) {
        if (!failedStatCard.contains(e.target)) {
          failedDropdown.classList.remove('show');
        }
      });
    }
    
    // 🔥 手风琴展开/收起
    document.querySelectorAll('.page-nav-parent').forEach(function(parent) {
      parent.addEventListener('click', function(e) {
        // 如果点击的是子按钮，不处理
        if (e.target.classList.contains('page-nav-child')) return;
        
        var group = this.closest('.page-nav-group');
        var children = group.querySelector('.page-nav-children');
        var isExpanded = children.classList.contains('expanded');
        
        // 🔥 关闭失败用例下拉框
        if (failedDropdown) {
          failedDropdown.classList.remove('show');
        }
        
        // 🔥 关闭其他父用例的下拉框
        document.querySelectorAll('.page-nav-children.expanded').forEach(function(otherDropdown) {
          if (otherDropdown !== children) {
            otherDropdown.classList.remove('expanded');
            var otherParent = otherDropdown.closest('.page-nav-group');
            if (otherParent) {
              otherParent.querySelector('.page-nav-parent').classList.remove('expanded');
              otherParent.classList.remove('expanded');
            }
          }
        });
        
        // 切换展开状态
        children.classList.toggle('expanded', !isExpanded);
        this.classList.toggle('expanded', !isExpanded);
        group.classList.toggle('expanded', !isExpanded);
      });
    });
    
    // 页面切换
    document.querySelectorAll('.page-nav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var index = parseInt(this.getAttribute('data-index'));
        if (isNaN(index)) return;
        
        // 🔥 点击子项后自动收起父下拉框
        var parentGroup = this.closest('.page-nav-group');
        if (parentGroup) {
          var children = parentGroup.querySelector('.page-nav-children');
          var parent = parentGroup.querySelector('.page-nav-parent');
          if (children && children.classList.contains('expanded')) {
            children.classList.remove('expanded');
            parent.classList.remove('expanded');
            parentGroup.classList.remove('expanded');
          }
        }
        
        document.querySelectorAll('.page-nav-btn').forEach(function(b) {
          b.classList.remove('active');
        });
        this.classList.add('active');
        
        document.querySelectorAll('.page-section').forEach(function(s, i) {
          s.classList.toggle('active', i === index);
        });
      });
    });
    
    // Tab 切换
    document.querySelectorAll('.section-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var tabName = this.getAttribute('data-tab');
        var section = this.closest('.page-section');
        
        section.querySelectorAll('.section-tab').forEach(function(t) {
          t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
        });
        section.querySelectorAll('.tab-panel').forEach(function(p) {
          p.classList.toggle('active', p.getAttribute('data-tab') === tabName);
        });
      });
    });
    
    // 展开/折叠问题卡片
    document.querySelectorAll('.issue-card').forEach(function(card) {
      card.addEventListener('click', function() {
        this.classList.toggle('expanded');
      });
    });
    
    // 展开/折叠错误详情
    document.querySelectorAll('.api-table tbody tr:not(.error-row)').forEach(function(row) {
      row.addEventListener('click', function() {
        var errorRowId = this.getAttribute('data-error-row');
        if (errorRowId) {
          var errorRow = document.getElementById(errorRowId);
          if (errorRow) {
            errorRow.classList.toggle('open');
          }
        }
      });
    });
  </script>
</body>
</html>`;
  }


  // 渲染长任务数据
  renderLongTasks(metrics) {
    if (!metrics.longTasks) return '';

    const lt = metrics.longTasks;
    const isJanky = lt.isJanky;
    const icon = isJanky ? '⚠️' : '✅';

    return `
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-name">长任务监控</span>
        <span class="metric-status ${isJanky ? 'warning' : 'good'}">${icon}</span>
      </div>
      <div class="metric-value-row">
        <span class="metric-value ${isJanky ? 'metric-warning' : 'metric-good'}">${lt.count}</span>
        <span class="metric-unit">个</span>
      </div>
      <div class="metric-desc">长任务数量 (超过100ms: ${lt.severeCount}个)</div>
      <div class="metric-desc">最长阻塞: ${lt.maxDuration.toFixed(1)}ms</div>
    </div>
  `;
  }

  // 渲染 INP 数据
  renderINP(metrics) {
    const inp = metrics.inpDetails?.inp || metrics.webVitals?.inp;
    if (inp === null) return '';

    const grade = metrics.inpDetails?.grade || 'good';
    const icon = grade === 'good' ? '✅' : grade === 'needs-improvement' ? '🟡' : '🔴';

    return `
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-name">INP</span>
        <span class="metric-status ${grade === 'good' ? 'good' : grade === 'needs-improvement' ? 'warning' : 'bad'}">${icon}</span>
      </div>
      <div class="metric-value-row">
        <span class="metric-value ${grade === 'good' ? 'metric-good' : grade === 'needs-improvement' ? 'metric-warning' : 'metric-bad'}">${Math.round(inp)}</span>
        <span class="metric-unit">ms</span>
      </div>
      <div class="metric-desc">交互响应延迟</div>
    </div>
  `;
  }


  generatePageSection(page, index) {
    const perf = page.performanceData || {};
    const wv = perf.webVitals || {};
    const nav = perf.navigation || {};
    const mem = perf.memory || {};
    const dom = perf.dom || {};
    const cpu = perf.cpu || {};
    const fps = perf.fps || {};
    const apiRequests = page.apiRequests || [];
    const apiErrors = page.apiErrors || [];
    const consoleErrors = page.consoleErrors || [];
    const screenshots = page.screenshots || [];

    // 🔥 新增：显示来源页面信息
    let fromPageInfo = '';
    if (page.previousPage) {
      fromPageInfo = `<div class="page-url" style="background: rgba(255,255,255,0.15); margin-top: 8px;">
        ⬅️ 来自: ${page.previousPage.name || '未知页面'} 
        <span style="opacity: 0.8; font-size: 11px;">(${page.previousPage.url || '未知路由'})</span>
      </div>`;
    }

    return `
      <div id="page-${index}" class="page-section ${index === 0 ? 'active' : ''}">
        <div class="page-header">
          <div class="page-title">📄 ${page.name || '页面 ' + (index + 1)}</div>
          <div class="page-url">🔗 ${page.url || '未知路由'}</div>
          ${fromPageInfo}
          <div class="page-meta">
            <span>📱 ${page.device}</span>
            <span>🕐 ${page.startTime ? new Date(page.startTime).toLocaleTimeString('zh-CN') : '00:00:00'}</span>
            <span>📡 ${apiRequests.length} API</span>
            ${apiErrors.length > 0 ? '<span style="color:#fca5a5;">🔴 ' + apiErrors.length + ' 错误</span>' : '<span style="color:#86efac;">✅ 无错误</span>'}
            ${consoleErrors.length > 0 ? '<span style="color:#fca5a5;">💥 ' + consoleErrors.length + ' 控制台错误</span>' : ''}
          </div>
        </div>
        
        <div class="section-tabs">
          <button class="section-tab active" data-tab="perf">📊 性能</button>
          <button class="section-tab" data-tab="api">🌐 API (${apiRequests.length})${apiErrors.length > 0 ? '<span class="badge">' + apiErrors.length + '</span>' : ''}</button>
          <button class="section-tab" data-tab="console">💥 控制台 (${consoleErrors.length})${consoleErrors.length > 0 ? '<span class="badge">' + consoleErrors.length + '</span>' : ''}</button>
          <button class="section-tab" data-tab="screenshots">📸 截图 (${screenshots.length})</button>
        </div>
        
        <div class="tab-panel active" data-tab="perf">
          ${perf.isSPA ? this.generateMetricsSection('🎯 核心 Web Vitals', 'SPA页面指标', [
      { key: 'CLS', value: wv.cls, unit: '', thresholds: { warning: 0.1, critical: 0.25 } },
      { key: 'INP', value: wv.inp, unit: 'ms', thresholds: { warning: 200, critical: 500 } },
      { key: 'TBT', value: perf.longTaskStats?.totalBlockingTime, unit: 'ms', thresholds: { warning: 200, critical: 600 } }
    ]) : this.generateMetricsSection('🎯 核心 Web Vitals', '用户体验关键指标', [
      { key: 'LCP', value: wv.lcp, unit: 'ms', thresholds: { warning: 2500, critical: 4000 } },
      { key: 'FCP', value: wv.fcp, unit: 'ms', thresholds: { warning: 1800, critical: 3000 } },
      { key: 'CLS', value: wv.cls, unit: '', thresholds: { warning: 0.1, critical: 0.25 } },
      { key: 'INP', value: wv.inp, unit: 'ms', thresholds: { warning: 200, critical: 500 } },
      { key: 'TTFB', value: wv.ttfb, unit: 'ms', thresholds: { warning: 800, critical: 1800 } },
      { key: 'TBT', value: perf.longTaskStats?.totalBlockingTime, unit: 'ms', thresholds: { warning: 200, critical: 600 } }
    ])}

    ${perf.isSPA ? this.generateMetricsSection('⏱️ SPA 页面切换', '路由切换性能', [
      { key: '切换耗时', value: perf.spaMetrics?.pageLoadTime, unit: 'ms', thresholds: { warning: 2000, critical: 5000 } },
      { key: '长任务数', value: perf.longTaskStats?.count, unit: '', thresholds: { warning: 3, critical: 10 } },
      { key: '最长阻塞', value: perf.longTaskStats?.maxDuration, unit: 'ms', thresholds: { warning: 100, critical: 200 } },
      { key: '严重卡顿', value: perf.longTaskStats?.severeCount, unit: '次', thresholds: { warning: 1, critical: 3 } },
      { key: '新资源数', value: perf.spaMetrics?.newResourcesCount, unit: '', thresholds: { warning: 20, critical: 50 } },
      { key: '新资源大小', value: perf.spaMetrics?.newResourcesTotalSize ? Math.round(perf.spaMetrics.newResourcesTotalSize / 1024) : null, unit: 'KB', thresholds: { warning: 500, critical: 2000 } }
    ]) : this.generateMetricsSection('⏱️ 加载时序', '各阶段耗时', [
      { key: 'First Paint', value: perf.firstPaint || nav.firstPaint, unit: 'ms', thresholds: { warning: 1000, critical: 2000 } },
      { key: 'DOM Ready', value: nav.domContentLoaded, unit: 'ms', thresholds: { warning: 2000, critical: 4000 } },
      { key: 'Load', value: nav.loadEventEnd || nav.totalTime, unit: 'ms', thresholds: { warning: 3000, critical: 6000 } },
      { key: 'DNS', value: nav.dnsTime, unit: 'ms', thresholds: { warning: 50, critical: 100 } },
      { key: 'TCP', value: nav.tcpTime, unit: 'ms', thresholds: { warning: 100, critical: 200 } },
      { key: 'Response', value: nav.responseTime || nav.downloadTime, unit: 'ms', thresholds: { warning: 200, critical: 500 } }
    ])}

          ${this.generateMetricsSection('💻 资源使用', '占用情况', [
      { key: 'JS Heap', value: mem.usedJSHeapMB, unit: 'MB', thresholds: { warning: 50, critical: 100 } },
      { key: 'DOM Nodes', value: dom.nodes, unit: '', thresholds: { warning: 1500, critical: 3000 } },
      { key: 'Event Listeners', value: dom.jsEventListeners, unit: '', thresholds: { warning: 500, critical: 1000 } },
      { key: 'CPU', value: cpu.usage, unit: '%', thresholds: { warning: 50, critical: 80 } },
      { key: 'FPS', value: fps.current, unit: '', thresholds: { warning: 50, critical: 30 }, reverse: true },
      { key: 'Layout Count', value: perf.render?.layoutCount, unit: '', thresholds: { warning: 50, critical: 100 } }
    ])}
          ${page.performanceData ? this.generateDetailedAnalysis(page.performanceData) : ''}
        </div>
        
        <div class="tab-panel" data-tab="api">
          ${apiRequests.length > 0 ? `
            <div class="api-table-wrapper">
              <table class="api-table">
                <thead><tr><th>状态</th><th>方法</th><th>URL</th><th>耗时</th><th>大小</th></tr></thead>
                <tbody>${apiRequests.map((req, ri) => this.renderApiRow(req, index, ri)).join('')}</tbody>
              </table>
            </div>
          ` : '<div class="empty-state"><div class="empty-state-icon">📡</div><p>暂无API请求</p></div>'}
        </div>
        
        <div class="tab-panel" data-tab="console">
          ${consoleErrors.length > 0 ? `
            <div class="console-errors-wrapper">
              ${this.renderConsoleErrors(consoleErrors)}
            </div>
          ` : '<div class="empty-state"><div class="empty-state-icon">✅</div><p>暂无控制台错误</p></div>'}
        </div>
        
        <div class="tab-panel" data-tab="screenshots">
          ${screenshots.length > 0 ? `<div class="screenshots-grid">${screenshots.map(ss => this.renderScreenshot(ss)).join('')}</div>` : '<div class="empty-state"><div class="empty-state-icon">📷</div><p>暂无截图</p></div>'}
        </div>
      </div>
    `;
  }

  generateMetricsSection(title, desc, metrics) {
    return `<div class="metrics-section"><div class="metrics-section-header"><div class="metrics-section-title">${title}</div><div class="metrics-section-desc">${desc}</div></div><div class="metrics-grid">${metrics.map(m => this.renderMetricCard(m)).join('')}</div></div>`;
  }

  renderMetricCard(metric) {
    const { key, value, unit, thresholds, reverse } = metric;
    const desc = this.metricDescriptions[key] || {};
    let displayValue = '0', colorClass = 'metric-na', statusClass = '', statusText = '';

    if (value != null) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        displayValue = unit === 'ms' || unit === '%' ? Math.round(numValue) : key === 'CLS' ? numValue.toFixed(3) : unit === 'MB' ? numValue.toFixed(1) : Math.round(numValue);
        if (thresholds) {
          if (reverse) {
            if (numValue <= thresholds.critical) { colorClass = 'metric-bad'; statusClass = 'bad'; statusText = '差'; }
            else if (numValue <= thresholds.warning) { colorClass = 'metric-warning'; statusClass = 'warning'; statusText = '一般'; }
            else { colorClass = 'metric-good'; statusClass = 'good'; statusText = '良好'; }
          } else {
            if (numValue >= thresholds.critical) { colorClass = 'metric-bad'; statusClass = 'bad'; statusText = '差'; }
            else if (numValue >= thresholds.warning) { colorClass = 'metric-warning'; statusClass = 'warning'; statusText = '一般'; }
            else { colorClass = 'metric-good'; statusClass = 'good'; statusText = '良好'; }
          }
        } else { colorClass = 'metric-good'; }
      }
    }

    return `<div class="metric-card"><div class="metric-header"><div><div class="metric-name">${key}</div><div class="metric-name-cn">${desc.name || ''}</div></div>${statusText ? '<span class="metric-status ' + statusClass + '">' + statusText + '</span>' : ''}</div><div class="metric-value-row"><span class="metric-value ${colorClass}">${displayValue}</span>${value != null ? '<span class="metric-unit">' + unit + '</span>' : ''}</div>${desc.desc ? '<div class="metric-desc">' + desc.desc + '<br><span style="color:#10b981;">良好: ' + desc.good + '</span> | <span style="color:#ef4444;">差: ' + desc.bad + '</span></div>' : ''}</div>`;
  }



  generateDetailedAnalysis(perfData) {
    const analysis = this.analyzer.analyze(perfData);
    if (analysis.issues.length === 0) {
      return '<div class="analysis-good"><div class="analysis-good-icon">✅</div><div class="analysis-good-text"><strong>所有性能指标正常</strong><span>评分: ' + analysis.score + '/100 (' + analysis.grade + ')</span></div></div>';
    }
    const critical = analysis.issues.filter(i => i.severity === 'critical');
    const warning = analysis.issues.filter(i => i.severity === 'warning');
    return '<div class="analysis-section"><div class="analysis-header"><h3>🔍 性能问题分析</h3><span class="analysis-score score-' + analysis.grade.toLowerCase() + '">评分: ' + analysis.score + '/100 (' + analysis.grade + ')</span></div>' + (critical.length > 0 ? '<div class="issue-group"><h4 class="issue-group-title">🔴 严重问题 (' + critical.length + ')</h4>' + critical.map(i => this.renderDetailedIssue(i)).join('') + '</div>' : '') + (warning.length > 0 ? '<div class="issue-group"><h4 class="issue-group-title">🟡 需要优化 (' + warning.length + ')</h4>' + warning.map(i => this.renderDetailedIssue(i)).join('') + '</div>' : '') + '</div>';
  }

  renderDetailedIssue(issue) {
    let html = '<div class="issue-card"><div class="issue-header"><span class="issue-icon">' + (issue.severity === 'critical' ? '🔴' : '🟡') + '</span><span class="issue-title">' + issue.title + '</span><span class="expand-icon">▼</span></div><div class="issue-body"><p class="issue-desc">' + (issue.description || '') + '</p>';

    if (issue.causes && issue.causes.length > 0) {
      html += '<div class="issue-section"><h5>📋 具体原因</h5>';
      issue.causes.forEach(c => {
        html += '<div class="cause-item"><div class="cause-reason">❌ ' + c.reason + '</div><div class="cause-detail">' + (c.detail || '') + '</div>';
        if (c.suggestion) html += '<div class="cause-suggestion">💡 ' + c.suggestion + '</div>';
        if (c.resources && c.resources.length > 0) {
          html += '<div class="cause-resources"><table class="resource-table"><thead><tr><th>资源</th><th>类型</th><th>耗时</th><th>大小</th></tr></thead><tbody>';
          c.resources.forEach(r => {
            html += '<tr><td class="resource-url" title="' + (r.url || '') + '">' + (r.url || r.name || '0') + '</td><td>' + (r.type || '0') + '</td><td>' + (r.duration || r.time || r.ttfb || '0') + '</td><td>' + (r.size || '0') + '</td></tr>';
          });
          html += '</tbody></table></div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    if (issue.details && issue.details.length > 0) {
      html += '<div class="issue-section"><h5>📊 详细数据</h5>';
      issue.details.forEach(d => {
        html += '<div class="detail-block"><div class="detail-label">' + d.label + '</div>';
        if (d.value) html += '<div class="detail-value">' + d.value + '</div>';
        if (d.items && d.items.length > 0) {
          html += '<ul class="detail-list">';
          d.items.forEach(item => {
            html += '<li><pre>' + this.escapeHtml(item) + '</pre></li>';
          });
          html += '</ul>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    if (issue.suggestions && issue.suggestions.length > 0) {
      html += '<div class="issue-section suggestions"><h5>💡 优化建议</h5><ul class="suggestion-list">';
      issue.suggestions.forEach(s => { html += '<li>' + s + '</li>'; });
      html += '</ul></div>';
    }

    html += '</div></div>';
    return html;
  }

  renderApiRow(req, pageIndex, reqIndex) {
    const status = req.response?.status || (req.status === 'failed' ? 'ERR' : '0');
    const hasError = !!req.error;
    const statusClass = hasError || status >= 400 ? 'status-error' : 'status-ok';
    const errorRowId = 'error-row-' + pageIndex + '-' + reqIndex;

    let html = '<tr class="' + (hasError ? 'has-error' : '') + '" data-error-row="' + (hasError ? errorRowId : '') + '"><td><span class="status-badge ' + statusClass + '">' + status + '</span></td><td>' + (req.method || '0') + '</td><td class="url-cell" title="' + req.url + '">' + this.shortenUrl(req.url) + '</td><td>' + (req.duration ? Math.round(req.duration) + 'ms' : '0') + '</td><td>' + this.formatSize(req.size) + '</td></tr>';

    if (hasError) {
      html += '<tr id="' + errorRowId + '" class="error-row"><td colspan="5" style="padding:0;border:none;"><div class="error-panel"><div class="error-panel-header">⚠️ ' + this.getErrorTypeText(req.error?.type) + '</div><div class="error-field"><div class="error-field-label">错误信息</div><div class="error-field-value">' + (req.error?.message || '未知错误') + '</div></div><div class="error-field"><div class="error-field-label">URL</div><div class="error-field-value" style="font-family:monospace;font-size:11px;">' + req.url + '</div></div>' + (req.responseBody ? '<div class="error-field"><div class="error-field-label">响应</div><pre>' + this.formatJson(req.responseBody) + '</pre></div>' : '') + '</div></td></tr>';
    }

    return html;
  }

  renderScreenshot(ss) {
    const base64 = this.imageToBase64(ss.path);

    // 🔥 统一的图片样式：300x600，等比缩放，内容完整
    const imgStyle = 'width: 300px; height: 600px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb;';

    // 🔥 如果是错误截图，使用特殊样式
    if (ss.isError) {
      const imgHtml = base64
        ? '<img src="' + base64 + '" alt="' + ss.name + '" loading="lazy" style="' + imgStyle + '">'
        : '<div class="screenshot-placeholder" style="height: 600px;"><div style="font-size:40px;">📷</div><div>图片加载失败</div></div>';

      const errorReasonHtml = ss.errorReason
        ? '<div class="screenshot-error-reason" style="margin-top: 8px; padding: 8px 12px; background: #fef2f2; color: #991b1b; font-size: 12px; border-radius: 4px; border-left: 3px solid #dc2626;"><strong>错误原因:</strong> ' + this.escapeHtml(ss.errorReason) + '</div>'
        : '';

      return '<div class="screenshot-card" style="border-color: #dc2626;"><div class="screenshot-img-wrapper">' + imgHtml + errorReasonHtml + '</div><div class="screenshot-info" style="background: #fef2f2;"><div class="screenshot-name" style="color: #991b1b;">❌ ' + ss.name + '</div><div class="screenshot-time">' + (ss.timestamp ? new Date(ss.timestamp).toLocaleString('zh-CN') : '') + '</div></div></div>';
    }

    // 🔥 普通截图：同样使用 300x600 尺寸
    const normalImgHtml = base64
      ? '<img src="' + base64 + '" alt="' + ss.name + '" loading="lazy" style="' + imgStyle + '">'
      : '<div class="screenshot-placeholder" style="height: 600px;"><div style="font-size:40px;">📷</div><div>图片加载失败</div></div>';

    return '<div class="screenshot-card"><div class="screenshot-img-wrapper">' + normalImgHtml + '</div><div class="screenshot-info"><div class="screenshot-name">' + ss.name + '</div><div class="screenshot-time">' + (ss.timestamp ? new Date(ss.timestamp).toLocaleString('zh-CN') : '') + '</div></div></div>';
  }

  renderConsoleErrors(errors) {
    const errorsByType = {
      'error': errors.filter(e => e.type === 'error'),
      'warning': errors.filter(e => e.type === 'warning'),
      'uncaught-exception': errors.filter(e => e.type === 'uncaught-exception')
    };

    let html = '<div class="console-errors-summary">';
    html += '<div class="console-error-stat"><span class="console-error-icon">🔴</span><span class="console-error-count">' + errorsByType['error'].length + '</span><span class="console-error-label">错误</span></div>';
    html += '<div class="console-error-stat"><span class="console-error-icon">🟡</span><span class="console-error-count">' + errorsByType['warning'].length + '</span><span class="console-error-label">警告</span></div>';
    html += '<div class="console-error-stat"><span class="console-error-icon">💥</span><span class="console-error-count">' + errorsByType['uncaught-exception'].length + '</span><span class="console-error-label">异常</span></div>';
    html += '</div>';

    html += '<div class="console-errors-list">';
    errors.forEach((error, index) => {
      html += this.renderConsoleError(error, index);
    });
    html += '</div>';

    return html;
  }

  renderConsoleError(error, index) {
    const icon = this.getConsoleErrorIcon(error.type);
    const typeClass = error.type === 'error' || error.type === 'uncaught-exception' ? 'console-error-critical' : 'console-error-warning';
    const duplicateClass = error.isDuplicate ? 'console-error-duplicate' : '';

    let html = '<div class="console-error-card ' + typeClass + ' ' + duplicateClass + '">';
    html += '<div class="console-error-header">';
    html += '<span class="console-error-number">#' + (index + 1) + '</span>';
    html += '<span class="console-error-type">' + icon + ' ' + error.type.toUpperCase() + '</span>';
    if (error.isDuplicate) {
      html += '<span class="console-error-duplicate-badge">重复</span>';
    }
    html += '<span class="console-error-time">' + new Date(error.timestamp).toLocaleTimeString('zh-CN') + '</span>';
    html += '</div>';

    html += '<div class="console-error-message">' + this.escapeHtml(error.message) + '</div>';

    if (error.location) {
      html += '<div class="console-error-location">';
      html += '<span class="console-error-location-label">位置:</span> ';
      html += '<span class="console-error-location-value">' + this.escapeHtml(error.location.url) + ':' + error.location.lineNumber + ':' + error.location.columnNumber + '</span>';
      html += '</div>';
    }

    if (error.stackTrace) {
      html += '<details class="console-error-stack">';
      html += '<summary>堆栈跟踪</summary>';
      html += '<pre>' + this.escapeHtml(error.stackTrace) + '</pre>';
      html += '</details>';
    }

    if (error.screenshot) {
      const base64 = this.imageToBase64(error.screenshot);
      if (base64) {
        html += '<div class="console-error-screenshot">';
        html += '<div class="console-error-screenshot-label">📸 错误截图:</div>';
        // 🔥 固定尺寸 300x600，等比缩放
        html += '<img src="' + base64 + '" alt="错误截图" loading="lazy" style="width: 300px; height: 600px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb;">';
        // 🔥 显示错误原因
        html += '<div class="console-error-reason" style="margin-top: 8px; padding: 8px 12px; background: #fef2f2; color: #991b1b; font-size: 12px; border-radius: 4px; border-left: 3px solid #dc2626;">';
        html += '<strong>错误原因:</strong> ' + this.escapeHtml(error.message || '未知错误');
        if (error.location) {
          html += '<br><strong>位置:</strong> ' + this.escapeHtml(error.location);
        }
        html += '</div>';
        html += '</div>';
      }
    } else if (error.isDuplicate) {
      html += '<div class="console-error-no-screenshot">⏭️ 重复错误，已跳过截图</div>';
    }

    html += '</div>';
    return html;
  }

  getConsoleErrorIcon(type) {
    const icons = {
      'error': '🔴',
      'warning': '🟡',
      'info': '🔵',
      'log': '⚪',
      'uncaught-exception': '💥'
    };
    return icons[type] || '❓';
  }


  escapeHtml(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : ''; }
  getErrorTypeText(type) { return { server_error: '服务器错误', client_error: '客户端错误', api_error: 'API业务错误', network_error: '网络错误' }[type] || '错误'; }
  formatJson(data) { try { const s = typeof data === 'string' ? data : JSON.stringify(data, null, 2); return s.length > 1500 ? s.substring(0, 1500) + '\n...(截断)' : s; } catch { return String(data).substring(0, 1500); } }
  shortenUrl(url, max = 50) { try { const p = new URL(url).pathname + new URL(url).search; return p.length > max ? p.substring(0, max) + '...' : p; } catch { return url?.length > max ? url.substring(0, max) + '...' : url; } }
  formatSize(bytes) { if (!bytes) return '0'; if (bytes < 1024) return bytes + 'B'; if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'; return (bytes / 1024 / 1024).toFixed(1) + 'MB'; }
}
