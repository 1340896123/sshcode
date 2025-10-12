import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TabManager from './components/TabManager';
import SessionModal from './components/SessionModal';
import SettingsModal from './components/SettingsModal';
import TailwindTestButton from './components/TailwindTestButton';
import { ToastContainer, useToast } from './components/ui';
import { useElectronAPI } from './hooks/useElectronAPI';

function AppContent() {
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('未连接');
  
  const electronAPI = useElectronAPI();
  const toast = useToast();

  useEffect(() => {
    // 设置Electron API
    if (typeof window !== 'undefined' && window.require) {
      const { ipcRenderer } = window.require('electron');
      const path = window.require('path');
      window.ipcRenderer = ipcRenderer;
      window.path = path;
      
      window.electronAPI = {
        saveSession: (data) => window.ipcRenderer.invoke('save-session', data),
        getSessions: () => window.ipcRenderer.invoke('get-sessions'),
        deleteSession: (id) => window.ipcRenderer.invoke('delete-session', id),
        sshConnect: (config) => window.ipcRenderer.invoke('ssh-connect', config),
        sshExecute: (id, command) => window.ipcRenderer.invoke('ssh-execute', id, command),
        sshDisconnect: (id) => window.ipcRenderer.invoke('ssh-disconnect', id),
        getFileList: (id, path) => window.ipcRenderer.invoke('get-file-list', id, path),
        getConfig: () => window.ipcRenderer.invoke('getConfig'),
        saveConfig: (config) => window.ipcRenderer.invoke('saveConfig', config),
        testAIConnection: (config) => window.ipcRenderer.invoke('testAIConnection', config),
        readSSHKey: (keyPath) => window.ipcRenderer.invoke('readSSHKey', keyPath),
        uploadFile: (id, localPath, remotePath) => window.ipcRenderer.invoke('uploadFile', id, localPath, remotePath),
        uploadDroppedFile: (id, file, remotePath) => window.ipcRenderer.invoke('uploadDroppedFile', id, file, remotePath),
        selectAndUploadFile: (id, remotePath) => window.ipcRenderer.invoke('selectAndUploadFile', id, remotePath),
        downloadFile: (id, remotePath) => window.ipcRenderer.invoke('downloadFile', id, remotePath),
        downloadAndOpenFile: (id, remotePath) => window.ipcRenderer.invoke('downloadAndOpenFile', id, remotePath),
        startFileWatcher: (remotePath, localPath) => window.ipcRenderer.invoke('startFileWatcher', remotePath, localPath),
        stopFileWatcher: (localPath) => window.ipcRenderer.invoke('stopFileWatcher', localPath)
      };
    }

    // 键盘快捷键处理
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K 打开会话管理
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSessionModalOpen(true);
      }
      
      // Escape 关闭所有模态框
      if (e.key === 'Escape') {
        setIsSessionModalOpen(false);
        setIsSettingsModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSessionConnected = (sessionData) => {
    setConnectionStatus(`已连接 - ${sessionData.name}`);
    toast.success(`已连接到 ${sessionData.name}`);
  };

  const handleSessionDisconnected = () => {
    setConnectionStatus('未连接');
  };

  return (
    <div className="app">
      <Header 
        connectionStatus={connectionStatus}
        onOpenSessionModal={() => setIsSessionModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      />
      
      <TabManager 
        onSessionConnected={handleSessionConnected}
        onSessionDisconnected={handleSessionDisconnected}
        onShowNotification={toast}
      />

      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        onShowNotification={toast}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onShowNotification={toast}
      />

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <TailwindTestButton />
    </div>
  );
}

function App() {
  return (
    <>
      <AppContent />
    </>
  );
}

export default App;
