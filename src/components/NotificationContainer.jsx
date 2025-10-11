import React from 'react';

function NotificationContainer({ notifications }) {
  return (
    <div id="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`fixed top-5 right-5 px-4 py-3 rounded text-white text-sm z-[10000] animate-slideIn max-w-[300px] break-words ${
            notification.type === 'success' ? 'bg-[#4ec9b0]' :
            notification.type === 'error' ? 'bg-[#d16969]' :
            notification.type === 'warning' ? 'bg-[#dcdcaa] text-black' :
            notification.type === 'info' ? 'bg-[#007acc]' : 'bg-[#3e3e42]'
          }`}
          style={{
            animation: 'slideIn 0.3s ease'
          }}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
}

export default NotificationContainer;
