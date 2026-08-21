import { Server, Socket } from 'socket.io';
import {
  SocketEvents,
  ChatMessage,
  PermissionFlags,
  hasPermission,
  UserRole,
} from '@far2near/shared-types';
import { RoomManager } from '../models/roomManager.js';
import { SendMessageSchema } from '../utils/validation.js';
import crypto from 'crypto';

export function registerChatHandlers(io: Server, socket: Socket) {
  const roomManager = RoomManager.getInstance();

  // Send Message
  socket.on(SocketEvents.CHAT_SEND_MESSAGE, (data, callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) {
      if (typeof callback === 'function') callback({ success: false, error: 'Oturum bulunamadı' });
      return;
    }

    const { activeRoom, participant: sender } = session;
    if (!hasPermission(sender.permissions, PermissionFlags.SEND_MESSAGES)) {
      if (typeof callback === 'function') callback({ success: false, error: 'Mesaj gönderme yetkiniz yok (Susturulmuş olabilirsiniz)' });
      return;
    }

    try {
      const parsed = SendMessageSchema.parse(data);

      let replyToData = undefined;
      if (parsed.replyToId) {
        const repliedMsg = activeRoom.messages.find((m) => m.id === parsed.replyToId);
        if (repliedMsg) {
          replyToData = {
            id: repliedMsg.id,
            senderName: repliedMsg.senderName,
            content: repliedMsg.content.slice(0, 100),
          };
        }
      }

      const newMsg: ChatMessage = {
        id: crypto.randomUUID(),
        roomId: activeRoom.room.id,
        channelId: parsed.channelId,
        senderId: sender.id,
        senderName: sender.nickname,
        senderAvatar: sender.avatar,
        senderRole: sender.role,
        content: parsed.content,
        timestamp: Date.now(),
        attachments: parsed.attachments,
        reactions: [],
        replyTo: replyToData,
      };

      roomManager.addMessage(activeRoom.room.id, newMsg);

      // Broadcast to room
      io.to(activeRoom.room.id).emit(SocketEvents.CHAT_NEW_MESSAGE, newMsg);

      if (typeof callback === 'function') callback({ success: true, message: newMsg });
    } catch (error: any) {
      if (typeof callback === 'function') callback({ success: false, error: error.message });
    }
  });

  // Edit Message
  socket.on(SocketEvents.CHAT_EDIT_MESSAGE, (data: { messageId: string; content: string }, callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;
    const msg = activeRoom.messages.find((m) => m.id === data.messageId);
    if (!msg) {
      if (typeof callback === 'function') callback({ success: false, error: 'Mesaj bulunamadı' });
      return;
    }

    // Only original author can edit
    if (msg.senderId !== sender.id) {
      if (typeof callback === 'function') callback({ success: false, error: 'Sadece kendi mesajınızı düzenleyebilirsiniz' });
      return;
    }

    const updated = roomManager.editMessage(activeRoom.room.id, data.messageId, data.content);
    if (updated) {
      io.to(activeRoom.room.id).emit(SocketEvents.CHAT_MESSAGE_EDITED, updated);
      if (typeof callback === 'function') callback({ success: true, message: updated });
    }
  });

  // Delete Message
  socket.on(SocketEvents.CHAT_DELETE_MESSAGE, (data: { messageId: string }, callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;
    const msg = activeRoom.messages.find((m) => m.id === data.messageId);
    if (!msg) {
      if (typeof callback === 'function') callback({ success: false, error: 'Mesaj bulunamadı' });
      return;
    }

    const isAuthor = msg.senderId === sender.id;
    const canManageMessages = hasPermission(sender.permissions, PermissionFlags.MANAGE_MESSAGES);

    if (!isAuthor && !canManageMessages) {
      if (typeof callback === 'function') callback({ success: false, error: 'Bu mesajı silme yetkiniz yok' });
      return;
    }

    const deleted = roomManager.deleteMessage(activeRoom.room.id, data.messageId, sender);
    if (deleted) {
      io.to(activeRoom.room.id).emit(SocketEvents.CHAT_MESSAGE_DELETED, { messageId: data.messageId, channelId: msg.channelId });
      if (typeof callback === 'function') callback({ success: true });
    }
  });

  // Add/Toggle Reaction
  socket.on(SocketEvents.CHAT_ADD_REACTION, (data: { messageId: string; emoji: string }, callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;
    const updated = roomManager.addReaction(activeRoom.room.id, data.messageId, data.emoji, sender.id);
    if (updated) {
      io.to(activeRoom.room.id).emit(SocketEvents.CHAT_REACTION_UPDATED, {
        messageId: updated.id,
        reactions: updated.reactions,
      });
      if (typeof callback === 'function') callback({ success: true, reactions: updated.reactions });
    }
  });

  // Typing Indicators
  socket.on(SocketEvents.CHAT_TYPING_START, (data: { channelId: string }) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    socket.to(session.activeRoom.room.id).emit(SocketEvents.CHAT_USER_TYPING, {
      userId: session.participant.id,
      nickname: session.participant.nickname,
      channelId: data.channelId,
      isTyping: true,
    });
  });

  socket.on(SocketEvents.CHAT_TYPING_STOP, (data: { channelId: string }) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    socket.to(session.activeRoom.room.id).emit(SocketEvents.CHAT_USER_TYPING, {
      userId: session.participant.id,
      nickname: session.participant.nickname,
      channelId: data.channelId,
      isTyping: false,
    });
  });
}
