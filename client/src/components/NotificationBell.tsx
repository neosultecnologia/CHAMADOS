import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, Package, AlertTriangle, Info } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type NotificationType = 
  | 'stock_critical'
  | 'stock_low'
  | 'request_created'
  | 'request_updated'
  | 'request_completed'
  | 'task_assigned'
  | 'task_due_soon'
  | 'system';

interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: number;
  referenceType?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: number;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'stock_critical':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'stock_low':
      return <Package className="h-4 w-4 text-yellow-500" />;
    case 'request_created':
    case 'request_updated':
    case 'request_completed':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'task_assigned':
    case 'task_due_soon':
      return <Bell className="h-4 w-4 text-purple-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'stock_critical':
      return 'bg-red-500/10 border-red-500/20';
    case 'stock_low':
      return 'bg-yellow-500/10 border-yellow-500/20';
    case 'request_created':
    case 'request_updated':
    case 'request_completed':
      return 'bg-blue-500/10 border-blue-500/20';
    case 'task_assigned':
    case 'task_due_soon':
      return 'bg-purple-500/10 border-purple-500/20';
    default:
      return 'bg-gray-500/10 border-gray-500/20';
  }
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Fetch notifications
  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery(
    { limit: 20 },
    { 
      refetchInterval: 30000, // Poll every 30 seconds
      staleTime: 10000,
    }
  );

  // Fetch unread count
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const deleteAllMutation = trpc.notifications.deleteAll.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate({ id: notification.id });
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setIsOpen(false);
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 rounded-full hover:bg-white/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5 text-white/80" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-[#0a1628] border border-white/10 shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-cyan-400" />
                <span className="font-semibold text-white">Notificações</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 text-xs">
                    {unreadCount} não lidas
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-white/60 hover:text-white hover:bg-white/10"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Marcar todas
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-white/60 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => deleteAllMutation.mutate()}
                    disabled={deleteAllMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <ScrollArea className="max-h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                  <Bell className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification: Notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`relative group cursor-pointer transition-colors ${
                        notification.isRead ? 'bg-transparent' : 'bg-white/5'
                      } hover:bg-white/10`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3 p-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium ${notification.isRead ? 'text-white/70' : 'text-white'}`}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-cyan-500" />
                            )}
                          </div>
                          <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-white/30 mt-1">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate({ id: notification.id });
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate({ id: notification.id });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-white/10 bg-white/5">
                <Button
                  variant="ghost"
                  className="w-full h-8 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                  onClick={() => {
                    // Navigate to notifications page if exists
                    setIsOpen(false);
                  }}
                >
                  Ver todas as notificações
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
