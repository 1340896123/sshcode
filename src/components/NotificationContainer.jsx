import React from 'react';

function NotificationContainer({ notifications }) {
  return (
    <div id="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
}

export default NotificationContainer;
