import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { Card, Button, Badge, Loader, EmptyState } from '../components/ui';
import type { Notification } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const NotifTypeColor: Record<string, 'blue' | 'green' | 'yellow' | 'purple' | 'slate'> = {
  LEAVE: 'blue',
  ATTENDANCE: 'green',
  PAYROLL: 'purple',
  SYSTEM: 'slate',
};

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const fetch = async () => {
    setIsLoading(true);
    try {
      const res = await notificationService.getNotifications({ limit: 50 });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch { toast.error('Failed to load notifications'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to mark all as read'); }
    finally { setMarkingAll(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-500">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            id="mark-all-read-btn"
            size="sm"
            variant="outline"
            leftIcon={<CheckCheck className="w-4 h-4" />}
            isLoading={markingAll}
            onClick={handleMarkAllRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <Loader className="h-32" />
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="w-10 h-10" />}
            title="No notifications"
            description="You're all caught up! New notifications will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={clsx(
                'flex items-start gap-3 p-4 rounded-xl border transition-colors',
                notif.is_read
                  ? 'bg-white border-slate-200'
                  : 'bg-blue-50 border-blue-200'
              )}
            >
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                notif.is_read ? 'bg-slate-100' : 'bg-blue-100'
              )}>
                <Bell className={clsx('w-4 h-4', notif.is_read ? 'text-slate-400' : 'text-blue-600')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={clsx('text-sm font-medium', notif.is_read ? 'text-slate-600' : 'text-slate-800')}>
                    {notif.title}
                  </p>
                  <Badge variant={NotifTypeColor[notif.type] || 'slate'}>{notif.type}</Badge>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{notif.message}</p>
                <p className="text-xs text-slate-400 mt-1" title={format(new Date(notif.created_at), 'MMM d, yyyy hh:mm a')}>
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
              {!notif.is_read && (
                <button
                  id={`mark-read-${notif.id}`}
                  onClick={() => handleMarkRead(notif.id)}
                  className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors flex-shrink-0 mt-0.5"
                  title="Mark as read"
                >
                  <Check className="w-3 h-3 text-blue-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
