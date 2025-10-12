import React, { useState, useEffect, useRef } from 'react';
import TabItem from './TabItem';
import TabContent from './TabContent';
import { useSSHConnection } from '../hooks/useElectronAPI';

function TabManager({ onSessionConnected, onSessionDisconnected, onShowNotification }) {
  const [tabs, setTabs] = useState(new Map());
  const [activeTabId, setActiveTabId] = useState(null);
  const [tabCounter, setTabCounter] = useState(0);
  const { connect, disconnect, executeCommand, isConnected } = useSSHConnection();
  const tabIdRef = useRef(0);

  useEffect(() => {
    // 创建第一个默认标签页
    createNewTab();
  }, []);

  const createNewTab = (sessionData = null) => {
    const tabId = `tab-${++tabIdRef.current}`;
    const newTab = {
      id: tabId,
      sessionId: sessionData?.id || null,
      sessionName: sessionData?.name || '未连接',
      isConnected: false,
      connectionConfig: sessionData || null
    };

    setTabs(prev => new Map(prev).set(tabId, newTab));
    setActiveTabId(tabId);
    
    return tabId;
  };

  const closeTab = (tabId) => {
    if (tabs.size <= 1) {
      onShowNotification('至少需要保留一个标签页', 'warning');
      return;
    }

    const tab = tabs.get(tabId);
    
    // 如果有连接，断开它
    if (tab.isConnected && tab.sessionId) {
      disconnect(tab.sessionId).catch(console.error);
    }

    setTabs(prev => {
      const newTabs = new Map(prev);
      newTabs.delete(tabId);
      return newTabs;
    });

    // 如果关闭的是当前活动标签页，切换到其他标签页
    if (activeTabId === tabId) {
      const remainingTabs = Array.from(tabs.keys()).filter(id => id !== tabId);
      if (remainingTabs.length > 0) {
        setActiveTabId(remainingTabs[0]);
      }
    }
  };

  const switchToTab = (tabId) => {
    if (!tabs.has(tabId)) return;
    setActiveTabId(tabId);
    
    // 触发标签页切换事件
    const tab = tabs.get(tabId);
    if (tab.isConnected && tab.sessionId) {
      onSessionConnected(tab);
    } else {
      onSessionDisconnected();
    }
  };

  const updateTabConnection = (tabId, isConnected, sessionData = null) => {
    setTabs(prev => {
      const newTabs = new Map(prev);
      const tab = newTabs.get(tabId);
      if (tab) {
        tab.isConnected = isConnected;
        if (sessionData) {
          tab.sessionId = sessionData.id;
          tab.sessionName = sessionData.name;
          tab.connectionConfig = sessionData;
        }
      }
      return newTabs;
    });

    if (isConnected && sessionData) {
      onSessionConnected(sessionData);
    } else {
      onSessionDisconnected();
    }
  };

  const handleConnectSession = async (sessionData) => {
    // 查找是否已有该会话的标签页
    let targetTabId = null;
    for (const [tabId, tab] of tabs) {
      if (tab.sessionId === sessionData.id) {
        targetTabId = tabId;
        break;
      }
    }

    if (targetTabId) {
      // 切换到已存在的标签页
      switchToTab(targetTabId);
    } else {
      // 创建新标签页
      targetTabId = createNewTab(sessionData);
    }

    try {
      await connect(sessionData);
      updateTabConnection(targetTabId, true, sessionData);
    } catch (error) {
      onShowNotification(`连接失败: ${error.message}`, 'error');
      updateTabConnection(targetTabId, false);
    }
  };

  const handleDisconnectSession = async (tabId) => {
    const tab = tabs.get(tabId);
    if (tab && tab.sessionId) {
      try {
        await disconnect(tab.sessionId);
        updateTabConnection(tabId, false);
      } catch (error) {
        onShowNotification(`断开连接失败: ${error.message}`, 'error');
      }
    }
  };

  const handleExecuteCommand = async (tabId, command) => {
    const tab = tabs.get(tabId);
    if (!tab || !tab.sessionId) {
      return { success: false, error: '没有活动的连接' };
    }

    try {
      return await executeCommand(tab.sessionId, command);
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleGetFileList = async (tabId, path) => {
    const tab = tabs.get(tabId);
    if (!tab || !tab.sessionId) {
      return { success: false, error: '没有活动的连接' };
    }

    try {
      return await window.electronAPI.getFileList(tab.sessionId, path);
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <div className="tab-manager flex-1 flex flex-col overflow-hidden">
      {/* 标签页导航 */}
      <div className="bg-[#2d2d30] border-b border-[#3e3e42]">
        <div className="flex items-center px-2.5 h-10">
          <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-[#5a5a5a] scrollbar-track-[#2d2d30]">
            <div className="flex">
              {Array.from(tabs.values()).map(tab => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  onClick={() => switchToTab(tab.id)}
                  onClose={() => closeTab(tab.id)}
                />
              ))}
            </div>
          </div>
          <button 
            className="min-w-8 h-8 m-1 p-0 flex items-center justify-center text-sm border-none rounded cursor-pointer font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px" 
            onClick={() => createNewTab()}
            title="新建SSH连接标签页"
          >
            ➕
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <main className="flex-1 h-full overflow-hidden w-full">
        <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden w-full">
          {Array.from(tabs.values()).map(tab => (
            <TabContent
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onConnectSession={handleConnectSession}
              onDisconnectSession={handleDisconnectSession}
              onExecuteCommand={handleExecuteCommand}
              onGetFileList={handleGetFileList}
              onShowNotification={onShowNotification}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default TabManager;
