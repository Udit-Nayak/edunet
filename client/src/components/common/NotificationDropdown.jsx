import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notificationAPI } from '../../services/api';
import { formatTimeAgo } from '../../utils/formatters';
import { 
  FiBell, 
  FiCheck, 
  FiArrowUp, 
  FiMessageSquare,
  FiCheckCircle,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch {
      // Failed to fetch unread count - will retry on next interval
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications({ limit: 20 });
      setNotifications(response.data.notifications);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch  {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationAPI.deleteNotification(id);
      const deletedNotification = notifications.find(n => n._id === id);
      setNotifications(notifications.filter(n => n._id !== id));
      if (!deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id, { stopPropagation: () => {} });
    }

    // Navigate to the relevant page
    if (notification.post) {
      navigate(`/post/${notification.post._id}`);
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'post_upvote':
      case 'answer_upvote':
      case 'comment_upvote':
        return <FiArrowUp className="w-4 h-4 text-primary" />;
      case 'new_answer':
      case 'new_comment_on_post':
      case 'new_comment_on_answer':
      case 'reply_to_comment':
        return <FiMessageSquare className="w-4 h-4 text-accent-blue" />;
      case 'answer_accepted':
        return <FiCheckCircle className="w-4 h-4 text-accent-green" />;
      default:
        return <FiBell className="w-4 h-4 text-text-secondary" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 flex items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary rounded-full transition-colors outline-none"
      >
        <FiBell className="w-[22px] h-[22px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold text-white bg-accent-red rounded-full border-2 border-bg-primary shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-bg-primary rounded-xl shadow-dropdown border border-border z-50 max-h-[600px] overflow-hidden flex flex-col origin-top-right"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-bg-secondary/50">
              <h3 className="text-[16px] font-bold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[13px] font-bold text-primary hover:text-primary-hover transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 no-scrollbar">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center text-text-tertiary">
                  <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiBell className="w-8 h-8 text-text-tertiary opacity-50" />
                  </div>
                  <p className="text-[15px] font-medium text-text-primary mb-1">You're all caught up!</p>
                  <p className="text-[13px] text-text-secondary">No new notifications.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-surface-hover cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Sender Avatar */}
                        <div className="relative">
                          <img
                            src={notification.sender?.avatar}
                            alt={notification.sender?.username}
                            className="w-10 h-10 rounded-full flex-shrink-0 object-cover border border-border"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-bg-primary p-0.5 rounded-full shadow-sm">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-[14px] text-text-primary leading-snug">
                            <span className="font-bold">
                              {notification.sender?.username}
                            </span>{' '}
                            <span className="text-text-secondary">{notification.message}</span>
                          </p>
                          {notification.post?.title && (
                            <p className="text-[13px] font-medium text-text-primary mt-1.5 truncate border-l-2 border-border pl-2">
                              "{notification.post.title}"
                            </p>
                          )}
                          <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mt-2">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-center space-y-2 flex-shrink-0 opacity-0 md:group-hover:opacity-100 transition-opacity">
                          {!notification.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(notification._id, e)}
                              className="w-7 h-7 flex items-center justify-center text-primary bg-bg-primary border border-border hover:bg-primary/10 hover:border-primary/30 rounded-lg transition-colors shadow-sm"
                              title="Mark as read"
                            >
                              <FiCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(notification._id, e)}
                            className="w-7 h-7 flex items-center justify-center text-accent-red bg-bg-primary border border-border hover:bg-accent-red/10 hover:border-accent-red/30 rounded-lg transition-colors shadow-sm"
                            title="Delete"
                          >
                            <FiX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}