import { Server, Socket } from 'socket.io';
import {
  SocketEvents,
  SignalMessage,
  MediaStateUpdate,
  PermissionFlags,
  hasPermission,
} from '@far2near/shared-types';
import { RoomManager } from '../models/roomManager.js';

export function registerWebRTCHandlers(io: Server, socket: Socket) {
  const roomManager = RoomManager.getInstance();

  // Join Voice Channel
  socket.on(SocketEvents.VOICE_JOIN, (data: { channelId: string }, callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) {
      if (typeof callback === 'function') callback({ success: false, error: 'Oturum bulunamadı' });
      return;
    }

    const { activeRoom, participant: sender } = session;
    sender.voiceChannelId = data.channelId;

    // Get list of other participants in this voice channel
    const peersInChannel: { socketId: string; userId: string; nickname: string; avatar: string; mediaState: any }[] = [];

    for (const [userId, p] of activeRoom.participants.entries()) {
      if (p.voiceChannelId === data.channelId && p.socketId !== socket.id) {
        peersInChannel.push({
          socketId: p.socketId,
          userId: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          mediaState: {
            isMuted: p.isMuted,
            isDeafened: p.isDeafened,
            isCameraOn: p.isCameraOn,
            isScreenSharing: p.isScreenSharing,
            isHandRaised: p.isHandRaised,
            isSpeaking: p.isSpeaking,
          },
        });
      }
    }

    // Broadcast to others in the voice channel that new peer joined
    socket.to(activeRoom.room.id).emit(SocketEvents.VOICE_PEER_JOINED, {
      socketId: socket.id,
      userId: sender.id,
      nickname: sender.nickname,
      avatar: sender.avatar,
      channelId: data.channelId,
    });

    // Also update room state
    io.to(activeRoom.room.id).emit(SocketEvents.ROOM_USER_UPDATED, sender);

    if (typeof callback === 'function') {
      callback({
        success: true,
        channelId: data.channelId,
        peers: peersInChannel,
      });
    }
  });

  // Leave Voice Channel
  socket.on(SocketEvents.VOICE_LEAVE, (callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;
    const previousChannelId = sender.voiceChannelId;
    sender.voiceChannelId = null;
    sender.isSpeaking = false;
    sender.isCameraOn = false;
    sender.isScreenSharing = false;

    if (previousChannelId) {
      socket.to(activeRoom.room.id).emit(SocketEvents.VOICE_PEER_LEFT, {
        socketId: socket.id,
        userId: sender.id,
        channelId: previousChannelId,
      });
    }

    io.to(activeRoom.room.id).emit(SocketEvents.ROOM_USER_UPDATED, sender);
    if (typeof callback === 'function') callback({ success: true });
  });

  // Relay WebRTC Signals (Offer, Answer, ICE Candidate) between peers
  socket.on(SocketEvents.WEBRTC_SIGNAL, (data: SignalMessage) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const targetSocket = io.sockets.sockets.get(data.targetSocketId);
    if (targetSocket) {
      targetSocket.emit(SocketEvents.WEBRTC_SIGNAL, {
        senderSocketId: socket.id,
        senderUserId: session.participant.id,
        channelId: data.channelId,
        signal: data.signal,
      });
    }
  });

  // Media State Changes (Mute, Deafen, Camera, Screen Share, Speaking, Raise Hand)
  socket.on(SocketEvents.MEDIA_STATE_CHANGE, (data: Partial<MediaStateUpdate>) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;

    if (data.isMuted !== undefined) sender.isMuted = data.isMuted;
    if (data.isDeafened !== undefined) sender.isDeafened = data.isDeafened;
    if (data.isCameraOn !== undefined) sender.isCameraOn = data.isCameraOn;
    if (data.isScreenSharing !== undefined) sender.isScreenSharing = data.isScreenSharing;
    if (data.isHandRaised !== undefined) sender.isHandRaised = data.isHandRaised;
    if (data.isSpeaking !== undefined) sender.isSpeaking = data.isSpeaking;

    // Broadcast updated state to entire room
    io.to(activeRoom.room.id).emit(SocketEvents.MEDIA_STATE_UPDATED, {
      userId: sender.id,
      socketId: socket.id,
      channelId: sender.voiceChannelId,
      isMuted: sender.isMuted,
      isDeafened: sender.isDeafened,
      isCameraOn: sender.isCameraOn,
      isScreenSharing: sender.isScreenSharing,
      isHandRaised: sender.isHandRaised,
      isSpeaking: sender.isSpeaking,
    });
  });

  // Toggle Hand Raise
  socket.on(SocketEvents.RAISE_HAND_TOGGLE, (data: { isHandRaised: boolean }) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;
    sender.isHandRaised = data.isHandRaised;

    io.to(activeRoom.room.id).emit(SocketEvents.MEDIA_STATE_UPDATED, {
      userId: sender.id,
      socketId: socket.id,
      channelId: sender.voiceChannelId,
      isHandRaised: sender.isHandRaised,
    });
  });
}
