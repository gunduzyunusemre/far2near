import React, { useState } from 'react';
import { useRoomStore } from '../../stores/useRoomStore';
import { useWebRTCStore } from '../../stores/useWebRTCStore';
import { getSocket } from '../../lib/socket';
import {
  UserRole,
  Participant,
  PermissionFlags,
  hasPermission,
  SocketEvents,
} from '@far2near/shared-types';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserX,
  MicOff,
  MoreVertical,
  Volume2,
  Hand,
  Crown,
  Ban,
} from 'lucide-react';

export const ParticipantsPanel: React.FC = () => {
  const { participants, currentUser, currentRoom } = useRoomStore();
  const { speakingUserIds } = useWebRTCStore();

  const [selectedUser, setSelectedUser] = useState<Participant | null>(null);

  const isOwner = currentUser?.role === UserRole.OWNER;
  const canManageUsers = hasPermission(
    currentUser?.permissions || 0,
    PermissionFlags.MANAGE_USERS
  );

  const owners = participants.filter((p) => p.role === UserRole.OWNER);
  const admins = participants.filter((p) => p.role === UserRole.ADMIN);
  const mods = participants.filter((p) => p.role === UserRole.MODERATOR);
  const members = participants.filter((p) => p.role === UserRole.MEMBER);
  const mutedUsers = participants.filter((p) => p.role === UserRole.MUTED);
  const handRaisedUsers = participants.filter((p) => p.isHandRaised);

  const handleUpdateRole = (targetUserId: string, newRole: UserRole) => {
    getSocket().emit(SocketEvents.ROOM_UPDATE_ROLE, { targetUserId, newRole });
    setSelectedUser(null);
  };

  const handleKick = (targetUserId: string) => {
    if (window.confirm('Bu kullanıcıyı odadan atmak istediğinize emin misiniz?')) {
      getSocket().emit(SocketEvents.ROOM_KICK_USER, { targetUserId });
      setSelectedUser(null);
    }
  };

  const handleBan = (targetUserId: string) => {
    if (window.confirm('Bu kullanıcıyı kalıcı olarak yasaklamak istediğinize emin misiniz?')) {
      getSocket().emit(SocketEvents.ROOM_BAN_USER, { targetUserId });
      setSelectedUser(null);
    }
  };

  const renderUserItem = (p: Participant) => {
    const isSpeaking = speakingUserIds.has(p.id) || p.isSpeaking;
    const isSelf = p.id === currentUser?.id;
    const canModerateThis = canManageUsers && !isSelf && p.role !== UserRole.OWNER;

    return (
      <div
        key={p.id}
        className="group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#2b2d31]/60 transition-colors cursor-pointer"
        onClick={() => {
          if (canModerateThis) setSelectedUser(selectedUser?.id === p.id ? null : p);
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <img
              src={p.avatar}
              alt={p.nickname}
              className={`w-8 h-8 rounded-full bg-[#2b2d31] object-cover transition-all ${
                isSpeaking ? 'ring-2 ring-emerald-500 scale-105' : ''
              }`}
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#2b2d31] ${
                p.voiceChannelId ? 'bg-emerald-500' : 'bg-discord-muted'
              }`}
            />
          </div>

          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-medium truncate ${
                  isSpeaking ? 'text-emerald-400 font-semibold' : 'text-discord-text'
                }`}
              >
                {p.nickname} {isSelf && '(Sen)'}
              </span>
              {p.role === UserRole.OWNER && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              {p.role === UserRole.ADMIN && <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
              {p.role === UserRole.MODERATOR && <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
            </div>
            {p.customStatus && (
              <div className="text-[10px] text-discord-muted truncate">{p.customStatus}</div>
            )}
          </div>
        </div>

        {/* State icons */}
        <div className="flex items-center gap-1">
          {p.isHandRaised && <span className="text-xs animate-bounce" title="El Kaldırdı">✋</span>}
          {p.isMuted && <MicOff className="w-3.5 h-3.5 text-discord-red" />}
          {canModerateThis && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(selectedUser?.id === p.id ? null : p);
              }}
              className="p-1 rounded text-discord-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Dropdown Menu */}
        {selectedUser?.id === p.id && canModerateThis && (
          <div
            className="absolute right-0 top-10 glass-dropdown rounded-xl p-1.5 z-30 shadow-2xl w-48 space-y-1 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] font-bold text-discord-muted uppercase border-b border-white/5">
              {p.nickname} Yönetimi
            </div>

            {isOwner && (
              <>
                <button
                  onClick={() => handleUpdateRole(p.id, UserRole.ADMIN)}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 flex items-center gap-2 text-indigo-300"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Yönetici Yap (Admin)
                </button>
                <button
                  onClick={() => handleUpdateRole(p.id, UserRole.MODERATOR)}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 flex items-center gap-2 text-blue-300"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Moderatör Yap
                </button>
                <button
                  onClick={() => handleUpdateRole(p.id, UserRole.MEMBER)}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 flex items-center gap-2 text-discord-text"
                >
                  Üye Yap
                </button>
              </>
            )}

            <button
              onClick={() => handleUpdateRole(p.id, p.role === UserRole.MUTED ? UserRole.MEMBER : UserRole.MUTED)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 flex items-center gap-2 text-amber-300"
            >
              <MicOff className="w-3.5 h-3.5" />
              {p.role === UserRole.MUTED ? 'Susturmayı Kaldır' : 'Sustur (Mute)'}
            </button>

            <button
              onClick={() => handleKick(p.id)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-red-500/20 flex items-center gap-2 text-discord-red"
            >
              <UserX className="w-3.5 h-3.5" />
              Odadan At (Kick)
            </button>

            <button
              onClick={() => handleBan(p.id)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-red-500/20 flex items-center gap-2 text-discord-red font-semibold"
            >
              <Ban className="w-3.5 h-3.5" />
              Yasakla (Ban)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-60 h-full bg-[#2b2d31] flex flex-col border-l border-[#1f2023] select-none shrink-0 z-10">
      {/* Header */}
      <div className="h-14 px-4 border-b border-[#1f2023] flex items-center justify-between shadow-sm">
        <h3 className="text-xs font-bold text-discord-muted uppercase tracking-wider">
          Katılımcılar — {participants.length}
        </h3>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Hand Raised Highlight */}
        {handRaisedUsers.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 space-y-1">
            <div className="px-1 text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1">
              <Hand className="w-3 h-3 animate-bounce" />
              Söz İsteyenler ({handRaisedUsers.length})
            </div>
            {handRaisedUsers.map((p) => renderUserItem(p))}
          </div>
        )}

        {/* Kurucu / Owners */}
        {owners.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-bold tracking-wider text-amber-400 uppercase">
              👑 Oda Sahibi — {owners.length}
            </div>
            <div className="space-y-0.5">{owners.map((p) => renderUserItem(p))}</div>
          </div>
        )}

        {/* Admins */}
        {admins.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-bold tracking-wider text-indigo-400 uppercase">
              🛡️ Yönetici — {admins.length}
            </div>
            <div className="space-y-0.5">{admins.map((p) => renderUserItem(p))}</div>
          </div>
        )}

        {/* Mods */}
        {mods.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-bold tracking-wider text-blue-400 uppercase">
              ⚔️ Moderatör — {mods.length}
            </div>
            <div className="space-y-0.5">{mods.map((p) => renderUserItem(p))}</div>
          </div>
        )}

        {/* Members */}
        {members.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-bold tracking-wider text-discord-muted uppercase">
              Çevrimiçi Üyeler — {members.length}
            </div>
            <div className="space-y-0.5">{members.map((p) => renderUserItem(p))}</div>
          </div>
        )}

        {/* Muted */}
        {mutedUsers.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-bold tracking-wider text-discord-red uppercase">
              🔇 Susturulanlar — {mutedUsers.length}
            </div>
            <div className="space-y-0.5">{mutedUsers.map((p) => renderUserItem(p))}</div>
          </div>
        )}
      </div>
    </aside>
  );
};
