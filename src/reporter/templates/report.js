// UI自动化测试报告 - JavaScript交互逻辑

// 立即执行，不等待DOMContentLoaded
(function () {
    console.log('报告页面脚本开始执行...');

    // 确保第一个页面立即显示
    var firstPage = document.getElementById('page-0');
    if (firstPage) {
        firstPage.style.display = 'block';
        firstPage.classList.add('active');
        console.log('首页已强制显示');
    }

    // 等待DOM完全加载后初始化交互功能
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReport);
    } else {
        initReport();
    }

    function initReport() {
        console.log('报告页面加载完成，初始化交互功能...');

        // 再次确保第一个页面显示
        var firstPage = document.getElementById('page-0');
        if (firstPage) {
            firstPage.style.display = 'block';
            firstPage.classList.add('active');
        }

        // 失败用例统计卡片点击展开
        var failedStatCard = document.getElementById('failed-stat-card');
        var failedDropdown = document.getElementById('failed-cases-dropdown');

        if (failedStatCard && failedDropdown) {
            failedStatCard.addEventListener('click', function (e) {
                // 如果点击的是失败用例项，不处理
                if (e.target.closest('.failed-case-item')) return;

                // 关闭所有父用例下拉框
                document.querySelectorAll('.page-nav-children.expanded').forEach(function (dropdown) {
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
            document.querySelectorAll('.failed-case-item').forEach(function (item) {
                item.addEventListener('click', function (e) {
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
                            switchToPage(pageIndex);
                        }
                    }
                });
            });

            // 点击外部关闭下拉框
            document.addEventListener('click', function (e) {
                if (!failedStatCard.contains(e.target)) {
                    failedDropdown.classList.remove('show');
                }
            });
        }

        // 手风琴展开/收起
        document.querySelectorAll('.page-nav-parent').forEach(function (parent) {
            parent.addEventListener('click', function (e) {
                // 如果点击的是子按钮，不处理
                if (e.target.classList.contains('page-nav-child')) return;

                var group = this.closest('.page-nav-group');
                var children = group.querySelector('.page-nav-children');
                var isExpanded = children.classList.contains('expanded');

                // 关闭失败用例下拉框
                if (failedDropdown) {
                    failedDropdown.classList.remove('show');
                }

                // 关闭其他父用例的下拉框
                document.querySelectorAll('.page-nav-children.expanded').forEach(function (otherDropdown) {
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

        // 页面切换函数
        function switchToPage(index) {
            console.log('切换到页面:', index);

            // 更新导航按钮状态
            document.querySelectorAll('.page-nav-btn').forEach(function (b) {
                b.classList.remove('active');
            });

            var targetBtn = document.querySelector('.page-nav-btn[data-index="' + index + '"]');
            if (targetBtn) {
                targetBtn.classList.add('active');
                console.log('找到目标按钮:', targetBtn);
            } else {
                console.warn('未找到索引为', index, '的导航按钮');
            }

            // 更新页面显示状态
            document.querySelectorAll('.page-section').forEach(function (s, i) {
                if (i === index) {
                    s.classList.add('active');
                    s.style.display = 'block';
                    console.log('显示页面:', i);
                } else {
                    s.classList.remove('active');
                    s.style.display = 'none';
                }
            });
        }

        // 页面切换
        document.querySelectorAll('.page-nav-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var index = parseInt(this.getAttribute('data-index'));
                if (isNaN(index)) {
                    console.warn('无效的页面索引:', this.getAttribute('data-index'));
                    return;
                }

                // 点击子项后自动收起父下拉框
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

                switchToPage(index);
            });
        });

        // Tab 切换
        document.querySelectorAll('.section-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                var tabName = this.getAttribute('data-tab');
                var section = this.closest('.page-section');

                section.querySelectorAll('.section-tab').forEach(function (t) {
                    t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
                });
                section.querySelectorAll('.tab-panel').forEach(function (p) {
                    p.classList.toggle('active', p.getAttribute('data-tab') === tabName);
                });
            });
        });

        // 展开/折叠问题卡片
        document.querySelectorAll('.issue-card').forEach(function (card) {
            card.addEventListener('click', function () {
                this.classList.toggle('expanded');
            });
        });

        // 展开/折叠错误详情
        document.querySelectorAll('.api-table tbody tr:not(.error-row)').forEach(function (row) {
            row.addEventListener('click', function () {
                var errorRowId = this.getAttribute('data-error-row');
                if (errorRowId) {
                    var errorRow = document.getElementById(errorRowId);
                    if (errorRow) {
                        errorRow.classList.toggle('open');
                    }
                }
            });
        });

        console.log('报告页面交互功能初始化完成');
    }
})();
