#!/bin/bash

# Watch RAG-related logs in real-time
# Usage: ./watch-rag-logs.sh

echo "🔍 Watching RAG activity in logs..."
echo "📍 Monitoring: logs/combined.log"
echo "🛑 Press Ctrl+C to stop"
echo ""
echo "================================================"
echo ""

tail -f logs/combined.log | grep --line-buffered -E "(🔍|✅|⚠️|❌|📄|📊|search|embedding|indexed|RAG|vector|Document Intelligence)" | while read line; do
    # Color output for easier reading
    if echo "$line" | grep -q "❌"; then
        echo -e "\033[0;31m$line\033[0m"  # Red for errors
    elif echo "$line" | grep -q "✅"; then
        echo -e "\033[0;32m$line\033[0m"  # Green for success
    elif echo "$line" | grep -q "⚠️"; then
        echo -e "\033[0;33m$line\033[0m"  # Yellow for warnings
    elif echo "$line" | grep -q "🔍"; then
        echo -e "\033[0;36m$line\033[0m"  # Cyan for searches
    else
        echo "$line"
    fi
done

