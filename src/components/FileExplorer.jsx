import React, { useState, useEffect } from 'react';

function FileExplorer({ tabId, isConnected, onGetFileList, onShowNotification }) {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected) {
      loadFiles(currentPath);
    }
  }, [isConnected, currentPath]);

  const loadFiles = async (path) => {
    if (!isConnected) return;

    setLoading(true);
    try {
      const result = await onGetFileList(tabId, path);
      if (result.success) {
        setFiles(result.files || []);
      } else {
        onShowNotification(`加载文件列表失败: ${result.error}`, 'error');
        setFiles([]);
      }
    } catch (error) {
      onShowNotification(`加载文件列表失败: ${error.message}`, 'error');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePathChange = (e) => {
    setCurrentPath(e.target.value);
  };

  const handleNavigate = () => {
    loadFiles(currentPath);
  };

  const handleFileClick = (file) => {
    if (file.type === 'd') {
      // 目录，进入该目录
      const newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      setCurrentPath(newPath);
    } else {
      // 文件，可以添加文件操作逻辑
      onShowNotification(`点击了文件: ${file.name}`, 'info');
    }
  };

  const handleGoBack = () => {
    if (currentPath === '/') return;
    
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    setCurrentPath(parentPath);
  };

  const handleRefresh = () => {
    loadFiles(currentPath);
  };

  const formatFileSize = (size) => {
    if (!size) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  return (
    <section 
      className="w-full h-full bg-[#252526] border-r border-[#3e3e42] flex flex-col relative overflow-hidden" 
      data-tab-id={tabId}
    >
      <div className="flex justify-between items-center px-4 py-3 bg-[#2d2d30] border-b border-[#3e3e42]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#cccccc]">📁 文件目录</span>
        </div>
        <div className="flex gap-2">
          <button 
            className="px-3 py-1.5 border-none rounded cursor-pointer text-xs font-medium transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:shadow-lg active:scale-95 flex items-center gap-1" 
            title="新建文件 (Ctrl+Shift+N)"
          >
            <span>📄</span>
            <span>新建</span>
          </button>
          <button 
            className="px-3 py-1.5 border-none rounded cursor-pointer text-xs font-medium transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:shadow-lg active:scale-95 flex items-center gap-1" 
            title="新建目录 (Ctrl+Shift+D)"
          >
            <span>📁</span>
            <span>新建</span>
          </button>
          <button 
            className="px-3 py-1.5 border-none rounded cursor-pointer text-xs font-medium transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:shadow-lg active:scale-95 flex items-center gap-1" 
            onClick={handleRefresh}
            title="刷新目录"
          >
            <span>🔄</span>
            <span>刷新</span>
          </button>
          <button 
            className="px-3 py-1.5 border-none rounded cursor-pointer text-xs font-medium transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:shadow-lg active:scale-95 flex items-center gap-1"
            title="上传文件"
          >
            <span>⬆️</span>
            <span>上传</span>
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 px-4 py-3 bg-[#2d2d30] border-b border-[#3e3e42]">
        <div className="flex-1 relative">
          <input 
            type="text" 
            className="w-full px-3 py-2 bg-[#3e3e42] border border-[#5a5a5a] text-[#d4d4d4] rounded-lg font-inherit text-sm outline-none transition-all duration-200 focus:border-[#007acc] focus:shadow-[0_0_0_3px_rgba(0,122,204,0.15)] placeholder:text-[#969696] pr-8"
            value={currentPath}
            onChange={handlePathChange}
            placeholder="输入路径..."
            title="支持Tab自动完成，Ctrl+↑/↓浏览历史"
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#969696] text-xs">
            📍
          </span>
        </div>
        <button 
          className="px-3 py-2 border-none rounded cursor-pointer text-xs font-medium transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:shadow-lg active:scale-95 flex items-center gap-1" 
          onClick={handleNavigate}
          title="前往指定路径 (Enter)"
        >
          <span>🚀</span>
          <span>前往</span>
        </button>
        <button 
          className="px-3 py-2 border-none rounded cursor-pointer text-xs font-medium transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:shadow-lg active:scale-95 flex items-center gap-1" 
          onClick={handleGoBack}
          title="返回上级目录 (Backspace)"
        >
          <span>⬅️</span>
          <span>返回</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto relative transition-all duration-200">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="w-8 h-8 border-2 border-[#3e3e42] border-t-[#007acc] rounded-full animate-spin mb-4"></div>
            <div className="text-sm text-[#969696]">正在加载文件列表...</div>
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="text-4xl mb-4">🔌</div>
            <div className="text-sm text-[#969696] mb-2">请先连接SSH服务器</div>
            <div className="text-xs text-[#666]">连接后即可浏览远程文件</div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="text-4xl mb-4">📂</div>
            <div className="text-sm text-[#969696] mb-2">目录为空</div>
            <div className="text-xs text-[#666]">此目录中没有文件或子目录</div>
          </div>
        ) : (
          <div className="w-full">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#2d2d30] border-b border-[#3e3e42] text-xs text-[#cccccc] font-medium sticky top-0 z-10">
              <div className="col-span-6">名称</div>
              <div className="col-span-2 text-right">大小</div>
              <div className="col-span-3 text-right">修改时间</div>
              <div className="col-span-1 text-right">权限</div>
            </div>
            
            {/* 文件列表 */}
            <div className="min-h-full">
              {currentPath !== '/' && (
                <div 
                  className="grid grid-cols-12 gap-2 px-4 py-2.5 cursor-pointer transition-all duration-200 hover:bg-[#2d2d30] border-b border-[#3e3e42]/20 items-center group" 
                  onClick={() => handleGoBack()}
                >
                  <div className="col-span-6 flex items-center">
                    <span className="w-4 h-4 mr-2 text-[#dcdcaa] group-hover:scale-110 transition-transform">📁</span>
                    <span className="text-sm text-[#d4d4d4] group-hover:text-white transition-colors">.. (返回上级)</span>
                  </div>
                  <div className="col-span-2 text-right text-[11px] text-[#969696] font-mono">—</div>
                  <div className="col-span-3 text-right text-[11px] text-[#969696]">—</div>
                  <div className="col-span-1 text-right text-[11px] text-[#969696] font-mono">—</div>
                </div>
              )}
              
              {files.map((file, index) => (
                <div 
                  key={index} 
                  className={`grid grid-cols-12 gap-2 px-4 py-2.5 cursor-pointer transition-all duration-200 hover:bg-[#2d2d30] border-b border-[#3e3e42]/20 items-center group ${
                    file.type === 'd' ? 'directory' : 'file'
                  }`}
                  onClick={() => handleFileClick(file)}
                >
                  <div className="col-span-6 flex items-center min-w-0">
                    <span className={`w-4 h-4 mr-2 flex-shrink-0 group-hover:scale-110 transition-transform ${
                      file.type === 'd' ? 'text-[#dcdcaa]' : 'text-[#9cdcfe]'
                    }`}>
                      {file.type === 'd' ? '📁' : '📄'}
                    </span>
                    <span className="text-sm text-[#d4d4d4] truncate group-hover:text-white transition-colors">
                      {file.name}
                    </span>
                    {file.type === 'd' && (
                      <span className="ml-2 px-1.5 py-0.5 bg-[#007acc]/20 text-[#007acc] text-[10px] rounded-full font-medium">
                        目录
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-[11px] text-[#969696] font-mono group-hover:text-[#cccccc] transition-colors">
                    {formatFileSize(file.size)}
                  </div>
                  <div className="col-span-3 text-right text-[11px] text-[#969696] group-hover:text-[#cccccc] transition-colors">
                    {formatDate(file.mtime)}
                  </div>
                  <div className="col-span-1 text-right text-[11px] text-[#969696] font-mono group-hover:text-[#cccccc] transition-colors">
                    {file.permissions || '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default FileExplorer;
