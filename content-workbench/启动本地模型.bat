@echo off
chcp 65001 >nul
set OLLAMA_ORIGINS=*
set OLLAMA_MODELS=D:\ollama\models
echo 正在启动本地模型服务（Ollama）...
echo 允许云端网页访问，模型存储目录：D:\ollama\models
start "ollama" /min cmd /c "ollama serve"
timeout /t 3 /nobreak >nul
ollama list
echo.
echo 若上方列出了模型名（如 qwen3:4b）即已就绪。
echo 此窗口可以关闭，模型服务会在后台继续运行。
pause
