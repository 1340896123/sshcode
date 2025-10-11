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
    <section className="file-explorer" data-tab-id={tabId}>
      <div className="explorer-header">
        <h3>文件目录</h3>
        <div className="explorer-controls">
          <button 
            className="btn btn-small btn-new-file" 
            title="新建文件 (Ctrl+Shift+N)"
          >
            📄 新建
          </button>
          <button 
            className="btn btn-small btn-new-dir" 
            title="新建目录 (Ctrl+Shift+D)"
          >
            📁 新建
          </button>
          <button 
            className="btn btn-small btn-refresh-files" 
            onClick={handleRefresh}
          >
            刷新
          </button>
          <button 
            className="btn btn-small btn-upload"
            title="上传文件"
          >
            上传
          </button>
        </div>
      </div>
      
      <div className="breadcrumb">
        <input 
          type="text" 
          className="path-input current-path" 
          value={currentPath}
          onChange={handlePathChange}
          placeholder="输入路径..."
          title="支持Tab自动完成，Ctrl+↑/↓浏览历史"
        />
        <button 
          className="btn btn-small btn-navigate" 
          onClick={handleNavigate}
          title="前往指定路径 (Enter)"
        >
          前往
        </button>
        <button 
          className="btn btn-small btn-go-back" 
          onClick={handleGoBack}
          title="返回上级目录"
        >
          ⬅️
        </button>
      </div>
      
      <div className="file-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : !isConnected ? (
          <div className="empty-state">请先连接SSH服务器</div>
        ) : files.length === 0 ? (
          <div className="empty-state">目录为空</div>
        ) : (
          <table className="file-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>大小</th>
                <th>修改时间</th>
                <th>权限</th>
              </tr>
            </thead>
            <tbody>
              {currentPath !== '/' && (
                <tr className="file-item directory" onClick={() => handleGoBack()}>
                  <td colSpan="4">
                    <span className="file-icon">📁</span>
                    ..
                  </td>
                </tr>
              )}
              {files.map((file, index) => (
                <tr 
                  key={index} 
                  className={`file-item ${file.type === 'd' ? 'directory' : 'file'}`}
                  onClick={() => handleFileClick(file)}
                >
                  <td>
                    <span className="file-icon">
                      {file.type === 'd' ? '📁' : '📄'}
                    </span>
                    {file.name}
                  </td>
                  <td>{formatFileSize(file.size)}</td>
                  <td>{formatDate(file.mtime)}</td>
                  <td>{file.permissions || '-'}</td>
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
