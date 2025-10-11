import React from 'react';

function Header({ connectionStatus, onOpenSessionModal, onOpenSettingsModal }) {
  return (
    <header className="flex justify-between items-center px-5 py-2.5 bg-[#2d2d30] border-b border-[#3e3e42] h-[60px]">
      <div className="flex items-center gap-5">
        <h1 className="text-lg text-[#569cd6]">SSH Remote App</h1>
        <button 
          className="px-3 py-1.5 border-none rounded cursor-pointer text-xs font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px"
          onClick={onOpenSessionModal}
        >
          会话管理
        </button>
      </div>
      <div className="flex items-center gap-4">
        <span 
          id="connection-status" 
          className={`px-2.5 py-1.25 rounded text-xs ${connectionStatus.includes('已连接') ? 'bg-[#4ec9b0] text-black' : 'bg-[#3e3e42] text-[#d4d4d4]'}`}
        >
          {connectionStatus}
        </span>
        <button 
          className="px-3 py-1.5 border-none rounded cursor-pointer text-xs font-inherit transition-all duration-200 outline-none bg-[#3e3e42] text-[#d4d4d4] hover:bg-[#5a5a5a] hover:opacity-80 active:translate-y-px"
          onClick={onOpenSettingsModal}
        >
          设置
        </button>
      </div>
    </header>
  );
}

export default Header;
