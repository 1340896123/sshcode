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
      className="w-[var(--file-explorer-width)] min-w-[var(--min-file-explorer-width)] max-w-[var(--max-file-explorer-width)] bg-[#252526] border-r border-[#3e3e42] flex flex-col relative resize-x overflow-auto flex-shrink-0" 
      data-tab-id={tabId}
    >
      <div className="flex justify-between items-center px-4 py-2.5 bg-[#2d2d30] border-b border-[#3e3e42]">
        <h3 className="text-sm text-[#cccccc]">文件目录</h3>
        <div className="flex gap-1.5 flex-wrap">
          <button 
            className="px-2 py-1 border-none rounded cursor-pointer text-[11px] font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px whitespace-nowrap" 
            title="新建文件 (Ctrl+Shift+N)"
          >
            📄 新建
          </button>
          <button 
            className="px-2 py-1 border-none rounded cursor-pointer text-[11px] font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px whitespace-nowrap" 
            title="新建目录 (Ctrl+Shift+D)"
          >
            📁 新建
          </button>
          <button 
            className="px-2 py-1 border-none rounded cursor-pointer text-[11px] font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px whitespace-nowrap" 
            onClick={handleRefresh}
          >
            刷新
          </button>
          <button 
            className="px-2 py-1 border-none rounded cursor-pointer text-[11px] font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px whitespace-nowrap"
            title="上传文件"
          >
            上传
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 px-4 py-2 bg-[#2d2d30] border-b border-[#3e3e42]">
        <input 
          type="text" 
          className="flex-1 px-2.5 py-1.5 bg-[#3e3e42] border border-[#5a5a5a] text-[#d4d4d4] rounded font-inherit text-sm outline-none transition-colors duration-200 focus:border-[#007acc] focus:shadow-[0_0_0_2px_rgba(0,122,204,0.2)] placeholder:text-[#969696]"
          value={currentPath}
          onChange={handlePathChange}
          placeholder="输入路径..."
          title="支持Tab自动完成，Ctrl+↑/↓浏览历史"
        />
        <button 
          className="px-2 py-1 border-none rounded cursor-pointer text-[11px] font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px" 
          onClick={handleNavigate}
          title="前往指定路径 (Enter)"
        >
          前往
        </button>
        <button 
          className="px-2 py-1 border-none rounded cursor-pointer text-[11px] font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px" 
          onClick={handleGoBack}
          title="返回上级目录"
        >
          ⬅️
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto relative transition-all duration-200">
        {loading ? (
          <div className="inline-block w-5 h-5 border-2 border-[#3e3e42] border-t-[#007acc] rounded-full animate-spin mx-auto block mt-10"></div>
        ) : !isConnected ? (
          <div className="text-center text-[#666] p-10 text-sm">请先连接SSH服务器</div>
        ) : files.length === 0 ? (
          <div className="text-center text-[#666] p-10 text-sm">目录为空</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#2d2d30]">
                <th className="text-left px-4 py-2 text-xs text-[#cccccc] font-medium">名称</th>
                <th className="text-left px-4 py-2 text-xs text-[#cccccc] font-medium">大小</th>
                <th className="text-left px-4 py-2 text-xs text-[#cccccc] font-medium">修改时间</th>
                <th className="text-left px-4 py-2 text-xs text-[#cccccc] font-medium">权限</th>
              </tr>
            </thead>
            <tbody>
              {currentPath !== '/' && (
                <tr 
                  className="flex items-center px-4 py-2 cursor-pointer transition-colors duration-200 hover:bg-[#2d2d30] directory" 
                  onClick={() => handleGoBack()}
                >
                  <td colSpan="4" className="flex items-center">
                    <span className="w-4 h-4 mr-2 text-[#dcdcaa]">📁</span>
                    ..
                  </td>
                </tr>
              )}
              {files.map((file, index) => (
                <tr 
                  key={index} 
                  className={`flex items-center px-4 py-2 cursor-pointer transition-colors duration-200 hover:bg-[#2d2d30] ${file.type === 'd' ? 'directory' : 'file'}`}
                  onClick={() => handleFileClick(file)}
                >
                  <td className="flex items-center flex-1">
                    <span className={`w-4 h-4 mr-2 ${file.type === 'd' ? 'text-[#dcdcaa]' : 'text-[#9cdcfe]'}`}>
                      {file.type === 'd' ? '📁' : '📄'}
                    </span>
                    <span className="text-sm text-[#d4d4d4]">{file.name}</span>
                  </td>
                  <td className="text-[11px] text-[#969696] ml-2.5">{formatFileSize(file.size)}</td>
                  <td className="text-[11px] text-[#969696]">{formatDate(file.mtime)}</td>
                  <td className="text-[11px] text-[#969696]">{file.permissions || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default FileExplorer;
