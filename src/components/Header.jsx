import React from 'react';
import { Button } from './ui/primitives/Button';
import { ConnectionBadge } from './ui/primitives/Badge';

function Header({ connectionStatus, onOpenSessionModal, onOpenSettingsModal }) {
  const isConnected = connectionStatus.includes('已连接');
  
  return (
    <header className="flex justify-between items-center px-5 py-2.5 bg-[#2d2d30] border-b border-[#3e3e42] h-[60px]">
      <div className="flex items-center gap-5">
        <h1 className="text-lg text-[#569cd6]">SSH Remote App</h1>
        <Button 
          variant="solid"
          color="primary"
          size="sm"
          onClick={onOpenSessionModal}
        >
          会话管理
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <ConnectionBadge 
          connected={isConnected}
          size="sm"
        />
        <Button 
          variant="outline"
          color="secondary"
          size="sm"
          onClick={onOpenSettingsModal}
        >
          设置
        </Button>
      </div>
    </header>
  );
}

export default Header;
