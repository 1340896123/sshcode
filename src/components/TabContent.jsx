import React from 'react';
import FileExplorer from './FileExplorer';
import Terminal from './Terminal';
import AIChat from './AIChat';
import ThreePaneSplit from './ui/layout/ThreePaneSplit';

function TabContent({
  tab,
  isActive,
  onConnectSession,
  onDisconnectSession,
  onExecuteCommand,
  onGetFileList,
  onShowNotification
}) {
  console.log('TabContent render:', { tabId: tab.id, isActive, isConnected: tab.isConnected });

  if (!isActive) return null;

  return (
    <div className="w-full h-full flex">
      <ThreePaneSplit
        direction="horizontal"
        defaultSizes={[30, 40, 30]} // 3:4:3 比例
        minSizes={[15, 25, 15]} // 最小宽度限制
        maxSizes={[50, 60, 50]} // 最大宽度限制
        gutterSize={6}
        gutterStyle="both"
        className="w-full h-full"
        onResize={(sizes) => {
          // 可选：保存用户调整的尺寸到本地存储
          console.log('Panel sizes changed:', sizes);
        }}
        left={
          <div className="w-full h-full">
            <FileExplorer
              tabId={tab.id}
              isConnected={tab.isConnected}
              onGetFileList={onGetFileList}
              onShowNotification={onShowNotification}
            />
          </div>
        }
        center={
          <div className="w-full h-full">
            <Terminal
              tabId={tab.id}
              isConnected={tab.isConnected}
              sessionData={tab.connectionConfig}
              onExecuteCommand={onExecuteCommand}
              onShowNotification={onShowNotification}
            />
          </div>
        }
        right={
          <div className="w-full h-full">
            <AIChat
              tabId={tab.id}
              isConnected={tab.isConnected}
              onShowNotification={onShowNotification}
            />
          </div>
        }
      />
    </div>
  );
}

export default TabContent;
