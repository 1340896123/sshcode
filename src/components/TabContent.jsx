import React from 'react';
import FileExplorer from './FileExplorer';
import Terminal from './Terminal';
import AIChat from './AIChat';

function TabContent({ 
  tab, 
  isActive, 
  onConnectSession, 
  onDisconnectSession, 
  onExecuteCommand, 
  onGetFileList, 
  onShowNotification 
}) {
  if (!isActive) return null;

  return (
    <div className="tab-content-panel" style={{ display: 'flex' }}>
      {/* 左侧文件目录 */}
      <FileExplorer
        tabId={tab.id}
        isConnected={tab.isConnected}
        onGetFileList={onGetFileList}
        onShowNotification={onShowNotification}
      />

      {/* 中间终端区域 */}
      <Terminal
        tabId={tab.id}
        isConnected={tab.isConnected}
        sessionData={tab.connectionConfig}
        onExecuteCommand={onExecuteCommand}
        onShowNotification={onShowNotification}
      />

      {/* 右侧AI聊天区域 */}
      <AIChat
        tabId={tab.id}
        isConnected={tab.isConnected}
        onShowNotification={onShowNotification}
      />
    </div>
  );
}

export default TabContent;
