import React, { useEffect, useState } from 'react';
import { useRoomStore } from './stores/useRoomStore';
import { useChatStore } from './stores/useChatStore';
import { useWebRTCStore } from './stores/useWebRTCStore';
import { useAuthStore } from './stores/useAuthStore';
import { getSocket } from './lib/socket';
import { audioFX } from './lib/audioFX';
import { SocketEvents, Participant } from '@far2near/shared-types';

import { JoinCreateModal } from './components/room/JoinCreateModal';
import { Sidebar } from './components/room/Sidebar';
import { ChatPanel } from './components/chat/ChatPanel';
import { VoiceChannelView } from './components/voice/VoiceChannelView';
import { ParticipantsPanel } from './components/room/ParticipantsPanel';
import { RoomSettingsModal } from './components/settings/RoomSettingsModal';
import { AuditLogsModal } from './components/settings/AuditLogsModal';
import { JoinRequestToast } from './components/room/JoinRequestToast';
import { LeaveModal } from './components/room/LeaveModal';

export const App: React.FC = () => {
  const {
    currentRoom,
    activeChannelType,
    addParticipant,
    removeParticipant,
    updateParticipant,
    updateRoomSettings,
    addJoinRequest,
    addAuditLog,
    leaveRoom,
  } = useRoomStore();

  const {
    addMessage,
    editMessage,
    deleteMessage,
    updateReaction,
    setTypingUser,
  } = useChatStore();

  const { setUserSpeaking } = useWebRTCStore();
  const { nickname } = useAuthStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const socket = getSocket();

    // User Joined
    socket.on(SocketEvents.ROOM_USER_JOINED, (participant: Participant) => {
      addParticipant(participant);
      audioFX.playJoin();
      showToast(`👋 ${participant.nickname} odaya katıldı`);
    });

    // User Left
    socket.on(SocketEvents.ROOM_USER_LEFT, (data: { userId: string; nickname: string }) => {
      removeParticipant(data.userId);
      audioFX.playLeave();
      showToast(`🚪 ${data.nickname} odadan ayrıldı`);
    });

    // User Updated
    socket.on(SocketEvents.ROOM_USER_UPDATED, (participant: Participant) => {
      updateParticipant(participant);
    });

    // Room Settings Changed
    socket.on(SocketEvents.ROOM_SETTINGS_CHANGED, (settings) => {
      updateRoomSettings(settings);
      showToast('⚙️ Oda ayarları güncellendi');
    });

    // Join Request (for private rooms)
    socket.on(SocketEvents.ROOM_JOIN_REQUEST, (request) => {
      addJoinRequest(request);
      audioFX.playMessage();
    });

    // Chat New Message
    socket.on(SocketEvents.CHAT_NEW_MESSAGE, (msg) => {
      addMessage(msg);
      if (msg.senderName !== nickname) {
        audioFX.playMessage();
      }
    });

    // Chat Edit Message
    socket.on(SocketEvents.CHAT_MESSAGE_EDITED, (msg) => {
      editMessage(msg);
    });

    // Chat Delete Message
    socket.on(SocketEvents.CHAT_MESSAGE_DELETED, (data: { messageId: string }) => {
      deleteMessage(data.messageId);
    });

    // Chat Reaction
    socket.on(SocketEvents.CHAT_REACTION_UPDATED, (data) => {
      updateReaction(data.messageId, data.reactions);
    });

    // Chat Typing
    socket.on(SocketEvents.CHAT_USER_TYPING, (data) => {
      setTypingUser(data);
    });

    // Media State Updated
    socket.on(SocketEvents.MEDIA_STATE_UPDATED, (data: any) => {
      if (data.isSpeaking !== undefined) {
        setUserSpeaking(data.userId, data.isSpeaking);
      }
      const existing = useRoomStore.getState().participants.find((p) => p.id === data.userId);
      if (existing) {
        updateParticipant({
          ...existing,
          isMuted: data.isMuted !== undefined ? data.isMuted : existing.isMuted,
          isDeafened: data.isDeafened !== undefined ? data.isDeafened : existing.isDeafened,
          isCameraOn: data.isCameraOn !== undefined ? data.isCameraOn : existing.isCameraOn,
          isScreenSharing: data.isScreenSharing !== undefined ? data.isScreenSharing : existing.isScreenSharing,
          isHandRaised: data.isHandRaised !== undefined ? data.isHandRaised : existing.isHandRaised,
          isSpeaking: data.isSpeaking !== undefined ? data.isSpeaking : existing.isSpeaking,
        });
      }
    });

    // System Error
    socket.on(SocketEvents.ERROR, (err: { message: string }) => {
      showToast(`⚠️ ${err.message}`);
      if (err.message.includes('çıkarıldınız') || err.message.includes('yasaklandınız')) {
        leaveRoom();
      }
    });

    return () => {
      socket.off(SocketEvents.ROOM_USER_JOINED);
      socket.off(SocketEvents.ROOM_USER_LEFT);
      socket.off(SocketEvents.ROOM_USER_UPDATED);
      socket.off(SocketEvents.ROOM_SETTINGS_CHANGED);
      socket.off(SocketEvents.ROOM_JOIN_REQUEST);
      socket.off(SocketEvents.CHAT_NEW_MESSAGE);
      socket.off(SocketEvents.CHAT_MESSAGE_EDITED);
      socket.off(SocketEvents.CHAT_MESSAGE_DELETED);
      socket.off(SocketEvents.CHAT_REACTION_UPDATED);
      socket.off(SocketEvents.CHAT_USER_TYPING);
      socket.off(SocketEvents.MEDIA_STATE_UPDATED);
      socket.off(SocketEvents.ERROR);
    };
  }, [nickname]);

  if (!currentRoom) {
    return <JoinCreateModal onJoined={() => {}} />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#1e1f22] overflow-hidden select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 bg-[#111214]/90 border border-brand/40 backdrop-blur-xl text-white text-xs font-semibold rounded-xl shadow-2xl animate-slide-up flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3-Column Discord-like Layout */}
      {/* 1. Left Channels & User Sidebar */}
      <Sidebar />

      {/* 2. Middle Stage / Chat View */}
      <main className="flex-1 h-full min-w-0 flex flex-col overflow-hidden">
        {activeChannelType === 'voice' ? <VoiceChannelView /> : <ChatPanel />}
      </main>

      {/* 3. Right Participants Sidebar */}
      <ParticipantsPanel />

      {/* Modals & Overlays */}
      <RoomSettingsModal />
      <AuditLogsModal />
      <JoinRequestToast />
      <LeaveModal />
    </div>
  );
};
