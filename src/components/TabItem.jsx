import React from 'react';

function TabItem({ tab, isActive, onClick, onClose }) {
  const handleClick = (e) => {
    if (!e.target.classList.contains('tab-close')) {
      onClick();
    }
  };

  const handleClose = (e) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div 
      className={`tab-item ${isActive ? 'active' : ''}`}
      onClick={handleClick}
    >
      <div className="tab-content">
        <span className="tab-title">{tab.sessionName}</span>
        <span className={`tab-status ${tab.isConnected ? 'connected' : 'disconnected'}`}></span>
      </div>
      <button 
        className="tab-close" 
        onClick={handleClose}
        title="关闭标签页"
      >
        ×
      </button>
    </div>
  );
}

export default TabItem;
