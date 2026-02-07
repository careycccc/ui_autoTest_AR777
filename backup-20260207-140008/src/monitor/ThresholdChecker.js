export class ThresholdChecker {
  constructor(thresholds, screenshotFn) {
    this.thresholds = thresholds;
    this.screenshotFn = screenshotFn;
    this.violations = [];
  }

  async check(metrics, context = '') {
    const violations = [];

    // ========== Web Vitals 检查 ==========
    if (metrics.webVitals) {
      const wv = metrics.webVitals;
      
      if (wv.lcp !== null && wv.lcp !== undefined) {
        violations.push(...this.checkMetric('LCP', wv.lcp, this.thresholds.lcp, 'ms'));
      }
      if (wv.cls !== null && wv.cls !== undefined) {
        violations.push(...this.checkMetric('CLS', wv.cls, this.thresholds.cls, ''));
      }
      if (wv.inp !== null && wv.inp !== undefined) {
        violations.push(...this.checkMetric('INP', wv.inp, this.thresholds.inp, 'ms'));
      }
      if (wv.fcp !== null && wv.fcp !== undefined) {
        violations.push(...this.checkMetric('FCP', wv.fcp, this.thresholds.fcp, 'ms'));
      }
      if (wv.ttfb !== null && wv.ttfb !== undefined) {
        violations.push(...this.checkMetric('TTFB', wv.ttfb, this.thresholds.ttfb, 'ms'));
      }
      if (wv.fid !== null && wv.fid !== undefined) {
        violations.push(...this.checkMetric('FID', wv.fid, this.thresholds.fid, 'ms'));
      }
    }

    // ========== 内存检查 ==========
    if (metrics.memory && metrics.memory.usedJSHeapSize) {
      const heapMB = metrics.memory.usedJSHeapSize / 1024 / 1024;
      violations.push(...this.checkMetric('JS Heap', heapMB, this.thresholds.jsHeapSize, 'MB'));
    }

    // ========== DOM 检查 ==========
    if (metrics.dom) {
      if (metrics.dom.nodes) {
        violations.push(...this.checkMetric('DOM Nodes', metrics.dom.nodes, this.thresholds.domNodes, ''));
      }
      if (metrics.dom.jsEventListeners) {
        violations.push(...this.checkMetric('Event Listeners', metrics.dom.jsEventListeners, this.thresholds.jsEventListeners, ''));
      }
    }

    // ========== 渲染检查 ==========
    if (metrics.render) {
      if (metrics.render.layoutsPerSec) {
        violations.push(...this.checkMetric('Layouts/sec', metrics.render.layoutsPerSec, this.thresholds.layoutsPerSec, ''));
      }
      if (metrics.render.styleRecalcsPerSec) {
        violations.push(...this.checkMetric('Style Recalcs/sec', metrics.render.styleRecalcsPerSec, this.thresholds.styleRecalcsPerSec, ''));
      }
    }

    // ========== CPU 检查 ==========
    if (metrics.cpu && metrics.cpu.usage !== undefined) {
      violations.push(...this.checkMetric('CPU Usage', metrics.cpu.usage, this.thresholds.cpuUsage, '%'));
    }

    // ========== FPS 检查（反向，低于阈值告警）==========
    if (metrics.fps && metrics.fps.current) {
      violations.push(...this.checkMetricReverse('FPS', metrics.fps.current, this.thresholds.fps, ''));
    }

    // ========== Long Tasks 检查 ==========
    if (metrics.longTaskStats) {
      violations.push(...this.checkMetric('Long Task Count', metrics.longTaskStats.count, this.thresholds.longTaskCount, ''));
      violations.push(...this.checkMetric('Max Long Task', metrics.longTaskStats.maxDuration, this.thresholds.longTaskDuration, 'ms'));
    }

    // 记录违规
    if (violations.length > 0) {
      for (const v of violations) {
        v.context = context;
        v.timestamp = new Date().toISOString();
        this.violations.push(v);
      }

      // 截图
      if (this.screenshotFn && violations.some(v => v.level === 'critical')) {
        try {
          const screenshotPath = await this.screenshotFn('threshold-violation');
          violations.forEach(v => v.screenshot = screenshotPath);
        } catch (e) {}
      }
    }

    return violations;
  }

  checkMetric(name, value, threshold, unit) {
    const violations = [];
    
    if (!threshold) return violations;

    if (value >= threshold.critical) {
      violations.push({
        metric: name,
        value: value,
        threshold: threshold.critical,
        level: 'critical',
        unit: unit,
        message: `${name}: ${value.toFixed(2)}${unit} 超过严重阈值 ${threshold.critical}${unit}`
      });
    } else if (value >= threshold.warning) {
      violations.push({
        metric: name,
        value: value,
        threshold: threshold.warning,
        level: 'warning',
        unit: unit,
        message: `${name}: ${value.toFixed(2)}${unit} 超过警告阈值 ${threshold.warning}${unit}`
      });
    }

    return violations;
  }

  checkMetricReverse(name, value, threshold, unit) {
    const violations = [];
    
    if (!threshold) return violations;

    if (value <= threshold.critical) {
      violations.push({
        metric: name,
        value: value,
        threshold: threshold.critical,
        level: 'critical',
        unit: unit,
        message: `${name}: ${value.toFixed(2)}${unit} 低于严重阈值 ${threshold.critical}${unit}`
      });
    } else if (value <= threshold.warning) {
      violations.push({
        metric: name,
        value: value,
        threshold: threshold.warning,
        level: 'warning',
        unit: unit,
        message: `${name}: ${value.toFixed(2)}${unit} 低于警告阈值 ${threshold.warning}${unit}`
      });
    }

    return violations;
  }

  getViolations() {
    return this.violations;
  }

  getCriticalViolations() {
    return this.violations.filter(v => v.level === 'critical');
  }

  getWarningViolations() {
    return this.violations.filter(v => v.level === 'warning');
  }

  getSummary() {
    const byMetric = {};
    for (const v of this.violations) {
      if (!byMetric[v.metric]) {
        byMetric[v.metric] = { warning: 0, critical: 0, max: 0 };
      }
      byMetric[v.metric][v.level]++;
      byMetric[v.metric].max = Math.max(byMetric[v.metric].max, v.value);
    }
    return {
      total: this.violations.length,
      critical: this.getCriticalViolations().length,
      warning: this.getWarningViolations().length,
      byMetric
    };
  }
}
