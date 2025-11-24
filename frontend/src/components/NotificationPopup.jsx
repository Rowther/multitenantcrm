import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { X, Check, Clock, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const NotificationPopup = ({ user, isOpen, onClose, onNotificationCountChange }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const popupRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && user) {
            fetchNotifications();
        }
    }, [isOpen, user]);

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/users/${user.id}/notifications`);
            setNotifications(response.data);

            // Update notification count
            const unreadCount = response.data.filter(n => !n.read_at).length;
            if (onNotificationCountChange) {
                onNotificationCountChange(unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await axios.patch(`${API}/users/${user.id}/notifications/${notificationId}/read`);
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.patch(`${API}/users/${user.id}/notifications/mark-all-read`);
            toast.success('All notifications marked as read');
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            toast.error('Failed to mark all as read');
        }
    };

    const handleNotificationClick = async (notification) => {
        // Mark as read
        if (!notification.read_at) {
            await markAsRead(notification.id);
        }

        // Navigate to work order if available
        const payload = notification.payload || {};
        if (payload.work_order_id && payload.company_id) {
            onClose();
            navigate(`/companies/${payload.company_id}/workorders/${payload.work_order_id}`);
        } else {
            console.error('Cannot navigate - missing data in notification payload:', {
                work_order_id: payload.work_order_id,
                company_id: payload.company_id,
                full_payload: payload
            });
            toast.error('Cannot open work order - missing information');
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'Unknown time';

        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Unknown time';

            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            return date.toLocaleDateString();
        } catch (error) {
            return 'Unknown time';
        }
    };

    const getNotificationMessage = (notification) => {
        const payload = notification.payload || {};
        const type = notification.type;

        // Get work order number with fallback
        const woNumber = payload.work_order_number || payload.work_order_id || null;

        if (type === 'work_order_status_updated' && woNumber) {
            const newStatus = (payload.new_status || 'unknown').toUpperCase();
            const userName = payload.updated_by_name || 'Someone';
            return `${woNumber}: Status → ${newStatus} (by ${userName})`;
        } else if (type === 'work_order_comment_added' && woNumber) {
            const userName = payload.comment_by_name || 'Someone';
            return `${woNumber}: New comment from ${userName}`;
        } else if (type === 'work_order_assigned' && woNumber) {
            return `${woNumber}: You have been assigned`;
        } else if (type === 'work_order_created' && woNumber) {
            const createdBy = payload.created_by_name || 'Someone';
            return `${woNumber}: New work order by ${createdBy}`;
        }

        // Fallback for old/unknown notifications - don't show IDs
        const message = notification.message || 'Work order update';
        // Check if message looks like a UUID (old notification ID)
        if (message.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)) {
            return 'Work order update';
        }
        return message;
    };

    if (!isOpen) return null;

    const unreadNotifications = notifications.filter(n => !n.read_at);
    const readNotifications = notifications.filter(n => n.read_at);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-6">
            <div
                ref={popupRef}
                className="bg-white rounded-lg shadow-2xl border border-slate-200 w-96 max-h-[600px] flex flex-col"
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800">Notifications</h3>
                        {unreadNotifications.length > 0 && (
                            <p className="text-xs text-slate-500">{unreadNotifications.length} unread</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadNotifications.length > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-slate-100 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <div>
                            {/* Unread Notifications */}
                            {unreadNotifications.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                                        <p className="text-xs font-semibold text-slate-600 uppercase">Unread</p>
                                    </div>
                                    {unreadNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className="p-4 border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors bg-blue-25"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-800 font-medium">
                                                        {getNotificationMessage(notification)}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTime(notification.payload?.created_at || notification.sent_at)}
                                                    </p>
                                                </div>
                                                {!notification.read_at && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(notification.id);
                                                        }}
                                                        className="p-1 hover:bg-slate-200 rounded flex-shrink-0"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="w-4 h-4 text-slate-600" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Read Notifications */}
                            {readNotifications.length > 0 && (
                                <div>
                                    {unreadNotifications.length > 0 && (
                                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                                            <p className="text-xs font-semibold text-slate-600 uppercase">Earlier</p>
                                        </div>
                                    )}
                                    {readNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors opacity-60"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 bg-slate-300 rounded-full mt-2 flex-shrink-0"></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-700">
                                                        {getNotificationMessage(notification)}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTime(notification.payload?.created_at || notification.sent_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPopup;
