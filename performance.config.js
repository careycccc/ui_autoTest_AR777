/**
 * 性能监控配置文件
 * 
 * 这个文件集中管理所有性能相关的配置参数
 * 修改这里的值会影响性能监控、阈值检查和报告生成
 */

export const performanceConfig = {
    // ============================================================
    // 性能监控配置
    // ============================================================
    monitoring: {
        enabled: true,                    // 是否启用性能监控
        sampleInterval: 1000,             // 采样频率（毫秒）- 降低可减少开销
        collectCPU: true,                 // 是否收集 CPU 使用率
        collectGPU: true,                 // 是否收集 GPU 信息
        collectFPS: true,                 // 是否收集帧率
        collectLongTasks: true,           // 是否收集长任务
        mobileOptimization: true          // 移动端优化（减少监控开销）
    },

    // ============================================================
    // 性能阈值配置
    // 说明：warning = 警告阈值，critical = 严重阈值
    // ============================================================
    thresholds: {
        // 核心 Web Vitals 指标
        webVitals: {
            lcp: {                          // Largest Contentful Paint (最大内容绘制)
                warning: 2500,                // 警告：2.5秒
                critical: 4000,               // 严重：4秒
                unit: 'ms',
                description: '主要内容加载时间'
            },
            fcp: {                          // First Contentful Paint (首次内容绘制)
                warning: 1800,                // 警告：1.8秒
                critical: 3000,               // 严重：3秒
                unit: 'ms',
                description: '首次渲染时间'
            },
            cls: {                          // Cumulative Layout Shift (累积布局偏移)
                warning: 0.1,                 // 警告：0.1
                critical: 0.25,               // 严重：0.25
                unit: '',
                description: '视觉稳定性'
            },
            inp: {                          // Interaction to Next Paint (交互到绘制)
                warning: 200,                 // 警告：200ms
                critical: 500,                // 严重：500ms
                unit: 'ms',
                description: '交互响应时间'
            },
            ttfb: {                         // Time to First Byte (首字节时间)
                warning: 800,                 // 警告：800ms
                critical: 1800,               // 严重：1.8秒
                unit: 'ms',
                description: '服务器响应时间'
            },
            fid: {                          // First Input Delay (首次输入延迟)
                warning: 100,                 // 警告：100ms
                critical: 300,                // 严重：300ms
                unit: 'ms',
                description: '首次交互延迟'
            }
        },

        // 资源使用指标
        resources: {
            jsHeapSize: {                   // JavaScript 堆内存
                warning: 50,                  // 警告：50MB
                critical: 100,                // 严重：100MB
                unit: 'MB',
                description: 'JS 内存使用'
            },
            domNodes: {                     // DOM 节点数量
                warning: 1500,                // 警告：1500个
                critical: 3000,               // 严重：3000个
                unit: '',
                description: 'DOM 节点数'
            },
            jsEventListeners: {             // JavaScript 事件监听器
                warning: 500,                 // 警告：500个
                critical: 1000,               // 严重：1000个
                unit: '',
                description: '事件监听器数量'
            }
        },

        // 渲染性能指标
        rendering: {
            layoutsPerSec: {                // 每秒布局次数
                warning: 50,                  // 警告：50次/秒
                critical: 100,                // 严重：100次/秒
                unit: '/s',
                description: '布局重排频率'
            },
            styleRecalcsPerSec: {           // 每秒样式重算次数
                warning: 50,                  // 警告：50次/秒
                critical: 100,                // 严重：100次/秒
                unit: '/s',
                description: '样式重算频率'
            },
            fps: {                          // 帧率
                warning: 50,                  // 警告：低于50fps
                critical: 30,                 // 严重：低于30fps
                unit: 'fps',
                description: '渲染帧率',
                reverse: true                 // 反向阈值（越低越差）
            },
            frameDropRate: {                // 掉帧率
                warning: 5,                   // 警告：5%
                critical: 15,                 // 严重：15%
                unit: '%',
                description: '掉帧率'
            }
        },

        // CPU 和任务指标
        cpu: {
            cpuUsage: {                     // CPU 使用率
                warning: 50,                  // 警告：50%
                critical: 80,                 // 严重：80%
                unit: '%',
                description: 'CPU 占用率'
            },
            longTaskDuration: {             // 长任务持续时间
                warning: 50,                  // 警告：50ms
                critical: 100,                // 严重：100ms
                unit: 'ms',
                description: '单个长任务时长'
            },
            longTaskCount: {                // 长任务数量
                warning: 5,                   // 警告：5个
                critical: 10,                 // 严重：10个
                unit: '',
                description: '长任务总数'
            }
        },

        // 网络请求指标
        network: {
            requestDuration: {              // 请求耗时
                warning: 1000,                // 警告：1秒
                critical: 3000,               // 严重：3秒
                unit: 'ms',
                description: 'API 请求时长'
            },
            failedRequests: {               // 失败请求数
                warning: 3,                   // 警告：3个
                critical: 10,                 // 严重：10个
                unit: '',
                description: '失败请求数量'
            }
        }
    },

    // ============================================================
    // 性能等级评分标准
    // ============================================================
    scoring: {
        gradeA: 90,                       // A级：90分以上
        gradeB: 75,                       // B级：75-89分
        gradeC: 60,                       // C级：60-74分
        gradeD: 40,                       // D级：40-59分
        // F级：40分以下
    },

    // ============================================================
    // 截图配置
    // ============================================================
    screenshot: {
        onStep: false,                    // 每个步骤是否截图
        onError: true,                    // 错误时是否截图
        onThresholdExceeded: true,        // 超过阈值时是否截图
        fullPage: false                   // 是否全页截图
    },

    // ============================================================
    // 网络监控配置
    // ============================================================
    network: {
        enabled: true,                    // 是否启用网络监控
        captureBody: true,                // 是否捕获请求/响应体
        maxBodySize: 50000                // 最大捕获体积（字节）
    }
};

// ============================================================
// 预设配置方案
// ============================================================

// 高性能模式（减少监控开销）
export const highPerformancePreset = {
    ...performanceConfig,
    monitoring: {
        ...performanceConfig.monitoring,
        sampleInterval: 2000,             // 降低采样频率
        collectCPU: false,
        collectGPU: false,
        collectFPS: false
    },
    screenshot: {
        ...performanceConfig.screenshot,
        onStep: false,
        onThresholdExceeded: false
    }
};

// 详细监控模式（完整数据收集）
export const detailedMonitoringPreset = {
    ...performanceConfig,
    monitoring: {
        ...performanceConfig.monitoring,
        sampleInterval: 500,              // 提高采样频率
        collectCPU: true,
        collectGPU: true,
        collectFPS: true,
        collectLongTasks: true
    },
    screenshot: {
        ...performanceConfig.screenshot,
        onStep: true,
        onThresholdExceeded: true
    }
};

// 移动端优化模式
export const mobileOptimizedPreset = {
    ...performanceConfig,
    monitoring: {
        ...performanceConfig.monitoring,
        sampleInterval: 1500,
        mobileOptimization: true
    },
    thresholds: {
        ...performanceConfig.thresholds,
        webVitals: {
            ...performanceConfig.thresholds.webVitals,
            lcp: { warning: 3000, critical: 5000, unit: 'ms' },
            fcp: { warning: 2200, critical: 3500, unit: 'ms' }
        }
    }
};
