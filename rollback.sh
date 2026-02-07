#!/bin/bash

# 快速回滚脚本
# 使用方法: chmod +x rollback.sh && ./rollback.sh

echo "🔄 开始回滚到修复前的版本..."

# 查找最新的备份目录
BACKUP_DIR=$(ls -dt backup-* 2>/dev/null | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo "❌ 未找到备份目录"
    echo "请检查是否存在 backup-YYYYMMDD-HHMMSS 格式的目录"
    exit 1
fi

echo "📦 找到备份目录: $BACKUP_DIR"
echo ""

# 确认回滚
read -p "确认从 $BACKUP_DIR 回滚? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消回滚"
    exit 0
fi

echo "🔄 正在回滚..."

# 删除修复版本的新文件
rm -rf src/logger 2>/dev/null
rm -rf src/utils/ScreenshotManager.js 2>/dev/null

# 恢复备份的文件
cp -r "$BACKUP_DIR/src/"* src/
cp "$BACKUP_DIR/config.js" config.js

echo "✅ 回滚完成！"
echo ""
echo "📝 已恢复的文件："
echo "   - src/ (所有文件)"
echo "   - config.js"
echo ""
echo "🗑️  清理新增的依赖（可选）："
echo "   npm uninstall winston chalk"
echo ""
