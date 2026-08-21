import React from 'react';
import { useRoomStore } from '../../stores/useRoomStore';
import { getSocket } from '../../lib/socket';
import { SocketEvents } from '@far2near/shared-types';
import { UserCheck, UserX, Shield } from 'lucide-react';

export const JoinRequestToast: React.FC = () => {
  const { joinRequests, removeJoinRequest } = useRoomStore();

  if (joinRequests.length === 0) return null;

  const handleRespond = (requestId: string, approved: boolean) => {
    getSocket().emit(SocketEvents.ROOM_JOIN_RESPONSE, { requestId, approved });
    removeJoinRequest(requestId);
  };

  return (
    <div className="fixed bottom-20 right-6 z-50 space-y-2 max-w-sm w-full animate-slide-up">
      {joinRequests.map((req) => (
        <div
          key={req.id}
          className="p-4 bg-[#1e1f22] rounded-2xl border border-brand/40 shadow-2xl backdrop-blur-xl flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <img
              src={req.user.avatar}
              alt={req.user.nickname}
              className="w-10 h-10 rounded-full bg-[#2b2d31] object-cover ring-2 ring-brand/50"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {req.user.nickname}
              </div>
              <div className="text-[11px] text-discord-muted">
                Odaya katılmak için izin istiyor
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleRespond(req.id, false)}
              className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-discord-muted hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <UserX className="w-3.5 h-3.5" />
              Reddet
            </button>
            <button
              onClick={() => handleRespond(req.id, true)}
              className="py-1.5 px-3 rounded-xl bg-brand hover:bg-brand-hover text-xs font-semibold text-white transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Onayla
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
