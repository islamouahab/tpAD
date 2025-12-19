import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import api from '../api/axios';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications/');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/mark_read/`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark_all_read/');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray-500 mt-1">{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <CheckCheck size={20} className="mr-2" />
            Mark All as Read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white rounded-xl shadow-md p-4 flex items-start gap-4 ${
              !notification.is_read ? 'border-l-4 border-blue-500' : ''
            }`}
          >
            <div className={`p-2 rounded-full ${notification.is_read ? 'bg-gray-100' : 'bg-blue-100'}`}>
              <Bell size={20} className={notification.is_read ? 'text-gray-500' : 'text-blue-600'} />
            </div>
            <div className="flex-1">
              <p className={`${notification.is_read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                {notification.message}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>
            {!notification.is_read && (
              <button
                onClick={() => markAsRead(notification.id)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                title="Mark as read"
              >
                <Check size={20} />
              </button>
            )}
          </div>
        ))}
        
        {notifications.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <Bell size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
