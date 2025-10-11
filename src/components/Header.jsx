import React from 'react';

function Header({ connectionStatus, onOpenSessionModal, onOpenSettingsModal }) {
  return (
    <header className="header">
      <div className="header-left">
        <h1>SSH Remote App</h1>
        <button 
          className="btn btn-primary" 
          onClick={onOpenSessionModal}
        >
          会话管理
        </button>
      </div>
      <div className="header-right">
        <span 
          id="connection-status" 
          className={`status-indicator ${connectionStatus.includes('已连接') ? 'connected' : ''}`}
        >
          {connectionStatus}
        </span>
        <button 
          className="btn btn-secondary" 
          onClick={onOpenSettingsModal}
        >
          设置
        </button>
      </div>
    </header>
  );
}

export default Header;
