import React from 'react';
import { X, Bell, Check, Clock, Megaphone, Info, AlertTriangle } from 'lucide-react';
import { useSocket } from '../context/SocketContext.js';
import type { AppNotification } from '../types/index.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification?: (notif: AppNotification) => void;
}

export const NotificationDrawer: React.FC<Props> = ({ isOpen, onClose, onSelectNotification }) => {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useSocket();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <Megaphone size={16} className="text-purple-600 animate-bounce" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-600" />;
      case 'success':
        return <Check size={16} className="text-emerald-600" />;
      default:
        return <Info size={16} className="text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-slide-left">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-emerald-600" />
            <h3 className="font-bold text-sm text-zinc-900">Notifications & Alerts</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-emerald-600 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action bar */}
        {unreadCount > 0 && (
          <div className="px-5 py-2 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs">
            <span className="text-emerald-900 font-medium">{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</span>
            <button
              onClick={() => markAllNotificationsRead()}
              className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <Bell size={32} className="mx-auto opacity-30" />
              <p className="text-xs">No notifications yet.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) markNotificationRead(notif.id);
                  if (onSelectNotification) onSelectNotification(notif);
                }}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  notif.read
                    ? 'bg-white border-zinc-200 opacity-75 hover:bg-zinc-50'
                    : 'bg-emerald-50/50 border-emerald-200 shadow-xs hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`font-semibold ${notif.read ? 'text-zinc-800' : 'text-emerald-950'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-zinc-600 mt-1 leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
