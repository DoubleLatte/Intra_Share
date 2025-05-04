import React, { useEffect } from 'react';

function Notifications({ notifications, setNotifications }) {
  useEffect(() => {
    notifications.forEach((notification) => {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, 5000);
    });
  }, [notifications, setNotifications]);

  const closeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="notifications">
      {notifications.map((notification) => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          {notification.message}
          <button onClick={() => closeNotification(notification.id)}>X</button>
        </div>
      ))}
    </div>
  );
}

export default Notifications;
