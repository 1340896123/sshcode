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
      className={`flex items-center min-w-[150px] max-w-[250px] h-8 mx-0.5 p-2 bg-[#3e3e42] border border-[#5a5a5a] rounded-t cursor-pointer transition-all duration-200 relative ${
        isActive ? 'bg-[#1e1e1e] border-[#3e3e42] border-b-[#1e1e1e]' : 'hover:bg-[#4a4a4a] hover:border-[#6a6a6a]'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center flex-1 min-w-0">
        <span className="text-xs text-[#cccccc] whitespace-nowrap overflow-hidden text-ellipsis mr-1.5">{tab.sessionName}</span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
          tab.isConnected ? 'bg-[#4ec9b0]' : 'bg-[#666]'
        }`}></span>
      </div>
      <button 
        className="bg-none border-none text-[#969696] text-base p-0.5 ml-1 rounded cursor-pointer opacity-0 transition-all duration-200 hover:bg-[#5a5a5a] hover:text-[#d4d4d4]"
        onClick={handleClose}
        title="关闭标签页"
      >
        ×
      </button>
    </div>
  );
}

export default TabItem;
