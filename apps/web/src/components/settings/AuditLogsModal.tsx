import React from 'react';
import { useRoomStore } from '../../stores/useRoomStore';
import { AuditAction } from '@far2near/shared-types';
import { X, FileText, UserPlus, UserMinus, Shield, Trash2, Settings, Lock } from 'lucide-react';

export const AuditLogsModal: React.FC = () => {
  const { auditLogs, isAuditLogsOpen, setAuditLogsOpen } = useRoomStore();

  if (!isAuditLogsOpen) return null;

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'USER_JOINED':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'USER_LEFT':
      case 'USER_KICKED':
      case 'USER_BANNED':
        return <UserMinus className="w-4 h-4 text-discord-red" />;
      case 'ROLE_UPDATED':
      case 'USER_MUTED':
        return <Shield className="w-4 h-4 text-indigo-400" />;
      case 'MESSAGE_DELETED':
        return <Trash2 className="w-4 h-4 text-amber-400" />;
      case 'SETTINGS_UPDATED':
      case 'ROOM_LOCKED':
        return <Settings className="w-4 h-4 text-brand-light" />;
      default:
        return <FileText className="w-4 h-4 text-discord-muted" />;
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#2b2d31] rounded-2xl border border-white/10 shadow-2xl p-6 overflow-hidden animate-slide-up flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-light" />
            <h3 className="text-base font-bold text-white">Denetim Günlüğü (Audit Log)</h3>
          </div>
          <button
            onClick={() => setAuditLogsOpen(false)}
            className="p-1 rounded-lg text-discord-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1">
          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-discord-muted">
              Henüz kaydedilmiş bir işlem yok.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-[#1e1f22] rounded-xl border border-white/5 flex items-start gap-3 text-xs"
              >
                <div className="p-2 rounded-lg bg-[#2b2d31] mt-0.5">{getActionIcon(log.action)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white truncate">{log.actorName}</span>
                    <span className="text-[10px] text-discord-muted">{formatTimestamp(log.timestamp)}</span>
                  </div>
                  <p className="text-discord-muted mt-0.5">{log.details || log.action}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
