import React, { useState } from 'react';
import { useRoomStore } from '../../stores/useRoomStore';
import { useWebRTCStore } from '../../stores/useWebRTCStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { WebRTCService } from '../../lib/webrtc';
import { audioFX } from '../../lib/audioFX';
import { getSocket } from '../../lib/socket';
import { SocketEvents, UserRole, PermissionFlags, hasPermission } from '@far2near/shared-types';
import {
  Hash,
  Volume2,
  Mic,
  MicOff,
  Headphones,
  Settings,
  LogOut,
  Copy,
  Check,
  Shield,
  FileText,
  Radio,
  PhoneOff,
  UserPlus,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    currentRoom,
    currentUser,
    channels,
    activeChannelId,
    participants,
    setActiveChannel,
    setSettingsOpen,
    setAuditLogsOpen,
    setLeaveModalOpen,
  } = useRoomStore();

  const {
    currentVoiceChannelId,
    isMuted,
    isDeafened,
    speakingUserIds,
    setVoiceChannel,
    setMuted,
    setDeafened,
    resetWebRTC,
  } = useWebRTCStore();

  const { nickname, avatar, customStatus } = useAuthStore();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const webrtcService = WebRTCService.getInstance();

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!currentRoom) return;
    const inviteUrl = `${window.location.origin}/?code=${currentRoom.id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoinVoiceChannel = async (channelId: string) => {
    if (currentVoiceChannelId === channelId) return; // already in

    audioFX.playJoin();
    const socket = getSocket();
    socket.emit(SocketEvents.VOICE_JOIN, { channelId }, async (res: any) => {
      if (res && res.success) {
        setVoiceChannel(channelId);
        setActiveChannel(channelId, 'voice');
        await webrtcService.joinVoiceChannel(channelId, res.peers || []);
      }
    });
  };

  const handleLeaveVoiceChannel = () => {
    audioFX.playLeave();
    const socket = getSocket();
    socket.emit(SocketEvents.VOICE_LEAVE, () => {
      webrtcService.leaveVoiceChannel();
      resetWebRTC();
      const defaultText = channels.find((c) => c.type === 'text') || channels[0];
      if (defaultText) setActiveChannel(defaultText.id, 'text');
    });
  };

  const toggleMic = () => {
    const nextMuted = !isMuted;
    setMuted(nextMuted);
    webrtcService.toggleMicrophone(nextMuted);
    audioFX.playMute(nextMuted);
    getSocket().emit(SocketEvents.MEDIA_STATE_CHANGE, { isMuted: nextMuted });
  };

  const toggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setDeafened(nextDeafened);
    if (nextDeafened && !isMuted) {
      setMuted(true);
      webrtcService.toggleMicrophone(true);
    }
    audioFX.playMute(nextDeafened);
    getSocket().emit(SocketEvents.MEDIA_STATE_CHANGE, { isDeafened: nextDeafened });
  };

  const isOwnerOrAdmin =
    currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.ADMIN;

  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <aside className="w-64 h-full bg-[#1e1f22] flex flex-col border-r border-[#111214] select-none shrink-0 z-10">
      {/* Top Room Header */}
      <div className="h-14 px-4 border-b border-[#111214] flex items-center justify-between shadow-sm bg-[#1e1f22]/50">
        <div className="flex-1 min-w-0 pr-2">
          <h2 className="text-sm font-bold text-white truncate tracking-tight">
            {currentRoom?.settings.name || 'far2near Odası'}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <button
              onClick={handleCopyCode}
              title="Oda Kodunu Kopyala"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2b2d31] hover:bg-[#35373c] text-[10px] font-mono font-medium text-brand-light transition-colors"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {currentRoom?.id}
            </button>
            <button
              onClick={handleCopyInviteLink}
              title="Davet Bağlantısını Kopyala"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand/20 hover:bg-brand/30 text-[10px] font-medium text-brand-light transition-colors"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <UserPlus className="w-3 h-3" />}
              Davet
            </button>
          </div>
        </div>

        {/* Admin / Owner Controls */}
        <div className="flex items-center gap-1">
          {isOwnerOrAdmin && (
            <>
              <button
                onClick={() => setAuditLogsOpen(true)}
                title="Denetim Günlüğü (Audit Log)"
                className="p-1.5 rounded-lg text-discord-muted hover:text-white hover:bg-[#2b2d31] transition-colors"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                title="Oda Ayarları"
                className="p-1.5 rounded-lg text-discord-muted hover:text-white hover:bg-[#2b2d31] transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* TEXT CHANNELS */}
        <div>
          <div className="px-2 mb-1 text-[11px] font-bold tracking-wider text-discord-muted uppercase flex items-center justify-between">
            <span>Metin Kanalları</span>
          </div>
          <div className="space-y-0.5">
            {textChannels.map((channel) => {
              const isActive = activeChannelId === channel.id;
              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel.id, 'text')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#35373c] text-white'
                      : 'text-discord-muted hover:bg-[#2b2d31] hover:text-[#dbdee1]'
                  }`}
                >
                  <Hash className="w-4 h-4 shrink-0 text-discord-muted" />
                  <span className="truncate">{channel.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* VOICE CHANNELS */}
        <div>
          <div className="px-2 mb-1 text-[11px] font-bold tracking-wider text-discord-muted uppercase flex items-center justify-between">
            <span>Sesli Kanallar</span>
            <Radio className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="space-y-1">
            {voiceChannels.map((channel) => {
              const isInThisVoice = currentVoiceChannelId === channel.id;
              const channelParticipants = participants.filter((p) => p.voiceChannelId === channel.id);

              return (
                <div key={channel.id} className="space-y-0.5">
                  <button
                    onClick={() => {
                      setActiveChannel(channel.id, 'voice');
                      if (!isInThisVoice) handleJoinVoiceChannel(channel.id);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all group ${
                      isInThisVoice
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-discord-muted hover:bg-[#2b2d31] hover:text-[#dbdee1]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Volume2 className={`w-4 h-4 shrink-0 ${isInThisVoice ? 'text-emerald-400 animate-pulse' : 'text-discord-muted'}`} />
                      <span className="truncate">{channel.name}</span>
                    </div>
                    {channelParticipants.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#111214] text-discord-muted">
                        {channelParticipants.length}
                      </span>
                    )}
                  </button>

                  {/* Connected Users inside this Voice Channel */}
                  {channelParticipants.length > 0 && (
                    <div className="pl-6 pr-1 space-y-1 py-1">
                      {channelParticipants.map((p) => {
                        const isSpeaking = speakingUserIds.has(p.id) || p.isSpeaking;
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#2b2d31]/50 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="relative">
                                <img
                                  src={p.avatar}
                                  alt={p.nickname}
                                  className={`w-5 h-5 rounded-full object-cover bg-[#2b2d31] transition-all ${
                                    isSpeaking ? 'ring-2 ring-emerald-500 scale-105' : ''
                                  }`}
                                />
                                {isSpeaking && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                )}
                              </div>
                              <span
                                className={`text-[11px] truncate ${
                                  isSpeaking ? 'text-emerald-400 font-semibold' : 'text-discord-muted'
                                }`}
                              >
                                {p.nickname}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {p.isHandRaised && <span className="text-xs animate-bounce">✋</span>}
                              {p.isMuted && <MicOff className="w-3 h-3 text-discord-red" />}
                              {p.isDeafened && <Headphones className="w-3 h-3 text-discord-red" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Connected Voice Status Bar (If active) */}
      {currentVoiceChannelId && (
        <div className="px-3 py-2 bg-[#141517] border-t border-[#111214] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            <div className="truncate">
              <div className="text-[11px] font-bold text-emerald-400 leading-none">Ses Bağlandı</div>
              <div className="text-[10px] text-discord-muted truncate">
                {channels.find((c) => c.id === currentVoiceChannelId)?.name || 'Sesli Kanal'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLeaveVoiceChannel}
            title="Sesli Kanaldan Ayrıl"
            className="p-1.5 rounded-md text-discord-muted hover:text-discord-red hover:bg-discord-red/10 transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom User Controls Bar */}
      <div className="h-14 px-2.5 bg-[#111214] flex items-center justify-between">
        {/* User profile snippet */}
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-1 p-1 rounded-md hover:bg-[#2b2d31]/40 transition-colors cursor-pointer">
          <div className="relative">
            <img
              src={avatar}
              alt={nickname}
              className="w-8 h-8 rounded-full bg-[#2b2d31] object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#111214]" />
          </div>
          <div className="truncate flex-1">
            <div className="text-xs font-semibold text-white truncate leading-tight flex items-center gap-1">
              {nickname}
              {currentUser?.role === UserRole.OWNER && <span title="Oda Sahibi">👑</span>}
            </div>
            <div className="text-[10px] text-discord-muted truncate leading-tight">
              {customStatus || '#far2near'}
            </div>
          </div>
        </div>

        {/* Actions buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleMic}
            title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            className={`p-2 rounded-md transition-colors ${
              isMuted
                ? 'text-discord-red bg-discord-red/10 hover:bg-discord-red/20'
                : 'text-discord-muted hover:text-white hover:bg-[#2b2d31]'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleDeafen}
            title={isDeafened ? 'Kulaklığı Aç' : 'Sağırlaştır'}
            className={`p-2 rounded-md transition-colors ${
              isDeafened
                ? 'text-discord-red bg-discord-red/10 hover:bg-discord-red/20'
                : 'text-discord-muted hover:text-white hover:bg-[#2b2d31]'
            }`}
          >
            <Headphones className="w-4 h-4" />
          </button>

          <button
            onClick={() => setLeaveModalOpen(true)}
            title="Odadan Ayrıl"
            className="p-2 rounded-md text-discord-muted hover:text-discord-red hover:bg-[#2b2d31] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
