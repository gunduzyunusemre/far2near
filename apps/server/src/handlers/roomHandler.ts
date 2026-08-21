import { Server, Socket } from 'socket.io';
import {
  SocketEvents,
  UserRole,
  PermissionFlags,
  hasPermission,
  DefaultRolePermissions,
  RoomSettings,
} from '@far2near/shared-types';
import { RoomManager } from '../models/roomManager.js';
import { generateRoomCode, signRoomToken } from '../utils/crypto.js';
import {
  CreateRoomSchema,
  JoinRoomSchema,
  RoomSettingsUpdateSchema,
  UpdateRoleSchema,
} from '../utils/validation.js';

export function registerRoomHandlers(io: Server, socket: Socket) {
  const roomManager = RoomManager.getInstance();

  // Create Room
  socket.on(SocketEvents.ROOM_CREATE, (data: any, callback: any) => {
    try {
      const parsed = CreateRoomSchema.parse(data);
      const roomId = generateRoomCode();
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const activeRoom = roomManager.createRoom(
        roomId,
        {
          id: userId,
          nickname: parsed.nickname,
          avatar: parsed.avatar,
          socketId: socket.id,
        },
        {
          name: parsed.name,
          description: parsed.description,
          maxParticipants: parsed.maxParticipants,
          isPrivate: parsed.isPrivate,
          recordHistory: parsed.recordHistory,
        }
      );

      socket.join(roomId);

      const token = signRoomToken({
        userId,
        roomId,
        nickname: parsed.nickname,
        role: UserRole.OWNER,
        permissions: DefaultRolePermissions[UserRole.OWNER],
      });

      const response = {
        success: true,
        roomId,
        token,
        user: activeRoom.participants.get(userId),
        room: activeRoom.room,
        participants: Array.from(activeRoom.participants.values()),
        messages: activeRoom.messages,
        channels: activeRoom.room.channels,
        auditLogs: activeRoom.auditLogs,
      };

      if (typeof callback === 'function') callback(response);
      else socket.emit(SocketEvents.ROOM_DATA, response);
    } catch (error: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message || 'Oda oluşturulamadı' });
      } else {
        socket.emit(SocketEvents.ERROR, { message: error.message || 'Oda oluşturulamadı' });
      }
    }
  });

  // Join Room
  socket.on(SocketEvents.ROOM_JOIN, (data: any, callback: any) => {
    try {
      const parsed = JoinRoomSchema.parse(data);
      const activeRoom = roomManager.getRoom(parsed.roomId);

      if (!activeRoom) {
        throw new Error('Oda bulunamadı veya kapatılmış olabilir.');
      }

      if (activeRoom.room.settings.isLocked) {
        throw new Error('Bu oda şu anda kilitlidir, yeni katılımcı kabul edilmiyor.');
      }

      if (activeRoom.participants.size >= activeRoom.room.settings.maxParticipants) {
        throw new Error('Oda maksimum katılımcı sınırına ulaştı.');
      }

      const clientIp = socket.handshake.address;
      if (activeRoom.bannedIps.has(clientIp)) {
        throw new Error('Bu odaya erişiminiz engellendi (Yasaklandınız).');
      }

      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Check if room requires approval (Private mode)
      if (activeRoom.room.settings.isPrivate) {
        const requestId = `req_${Date.now()}`;
        const joinReq = {
          id: requestId,
          socketId: socket.id,
          user: {
            id: userId,
            nickname: parsed.nickname,
            avatar: parsed.avatar,
            joinedAt: Date.now(),
          },
          requestedAt: Date.now(),
        };

        activeRoom.joinRequests.set(requestId, joinReq);

        // Notify room owner/admins
        for (const [pUserId, participant] of activeRoom.participants.entries()) {
          if (participant.role === UserRole.OWNER || participant.role === UserRole.ADMIN) {
            io.to(participant.socketId).emit(SocketEvents.ROOM_JOIN_REQUEST, joinReq);
          }
        }

        if (typeof callback === 'function') {
          callback({ success: true, pendingApproval: true, message: 'Katılma isteğiniz oda sahibine iletildi, onay bekleniyor...' });
        }
        return;
      }

      // Direct join
      const participant = roomManager.addParticipant(
        parsed.roomId,
        {
          id: userId,
          nickname: parsed.nickname,
          avatar: parsed.avatar,
          socketId: socket.id,
        },
        UserRole.MEMBER
      );

      socket.join(parsed.roomId);

      const token = signRoomToken({
        userId,
        roomId: parsed.roomId,
        nickname: parsed.nickname,
        role: UserRole.MEMBER,
        permissions: DefaultRolePermissions[UserRole.MEMBER],
      });

      const response = {
        success: true,
        roomId: parsed.roomId,
        token,
        user: participant,
        room: activeRoom.room,
        participants: Array.from(activeRoom.participants.values()),
        messages: activeRoom.messages,
        channels: activeRoom.room.channels,
        auditLogs: activeRoom.auditLogs,
      };

      // Broadcast to existing members
      socket.to(parsed.roomId).emit(SocketEvents.ROOM_USER_JOINED, participant);

      if (typeof callback === 'function') callback(response);
      else socket.emit(SocketEvents.ROOM_DATA, response);
    } catch (error: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message || 'Odaya katılınamadı' });
      } else {
        socket.emit(SocketEvents.ERROR, { message: error.message || 'Odaya katılınamadı' });
      }
    }
  });

  // Approve/Reject Join Request (Owner/Admin)
  socket.on(SocketEvents.ROOM_JOIN_RESPONSE, (data: { requestId: string; approved: boolean }, callback) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;
    if (!hasPermission(sender.permissions, PermissionFlags.MANAGE_USERS)) {
      if (typeof callback === 'function') callback({ success: false, error: 'Yetkiniz yok' });
      return;
    }

    const req = activeRoom.joinRequests.get(data.requestId);
    if (!req) {
      if (typeof callback === 'function') callback({ success: false, error: 'İstek bulunamadı' });
      return;
    }

    activeRoom.joinRequests.delete(data.requestId);

    if (data.approved) {
      const participant = roomManager.addParticipant(
        activeRoom.room.id,
        {
          id: req.user.id,
          nickname: req.user.nickname,
          avatar: req.user.avatar,
          socketId: req.socketId,
        },
        UserRole.MEMBER
      );

      const targetSocket = io.sockets.sockets.get(req.socketId);
      if (targetSocket) {
        targetSocket.join(activeRoom.room.id);
        const token = signRoomToken({
          userId: req.user.id,
          roomId: activeRoom.room.id,
          nickname: req.user.nickname,
          role: UserRole.MEMBER,
          permissions: DefaultRolePermissions[UserRole.MEMBER],
        });

        targetSocket.emit(SocketEvents.ROOM_DATA, {
          success: true,
          roomId: activeRoom.room.id,
          token,
          user: participant,
          room: activeRoom.room,
          participants: Array.from(activeRoom.participants.values()),
          messages: activeRoom.messages,
          channels: activeRoom.room.channels,
          auditLogs: activeRoom.auditLogs,
        });

        io.to(activeRoom.room.id).emit(SocketEvents.ROOM_USER_JOINED, participant);
      }
    } else {
      const targetSocket = io.sockets.sockets.get(req.socketId);
      if (targetSocket) {
        targetSocket.emit(SocketEvents.ERROR, { message: 'Odaya katılma isteğiniz reddedildi.' });
      }
    }

    if (typeof callback === 'function') callback({ success: true });
  });

  // Room Settings Update
  socket.on(SocketEvents.ROOM_SETTINGS_UPDATE, (data: any, callback: any) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;
    if (!hasPermission(sender.permissions, PermissionFlags.MANAGE_ROOM)) {
      if (typeof callback === 'function') callback({ success: false, error: 'Oda ayarlarını değiştirme yetkiniz yok' });
      return;
    }

    try {
      const parsed = RoomSettingsUpdateSchema.parse(data);
      Object.assign(activeRoom.room.settings, parsed);

      roomManager.addAuditLog(activeRoom.room.id, {
        action: 'SETTINGS_UPDATED',
        actorId: sender.id,
        actorName: sender.nickname,
        details: 'Oda ayarları güncellendi',
      });

      io.to(activeRoom.room.id).emit(SocketEvents.ROOM_SETTINGS_CHANGED, activeRoom.room.settings);
      if (typeof callback === 'function') callback({ success: true, settings: activeRoom.room.settings });
    } catch (error: any) {
      if (typeof callback === 'function') callback({ success: false, error: error.message });
    }
  });

  // Kick User
  socket.on(SocketEvents.ROOM_KICK_USER, (data: { targetUserId: string }, callback: any) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;
    if (!hasPermission(sender.permissions, PermissionFlags.MANAGE_USERS)) {
      if (typeof callback === 'function') callback({ success: false, error: 'Kullanıcı atma yetkiniz yok' });
      return;
    }

    const target = activeRoom.participants.get(data.targetUserId);
    if (target) {
      if (target.role === UserRole.OWNER) {
        if (typeof callback === 'function') callback({ success: false, error: 'Oda kurucusunu atamazsınız' });
        return;
      }

      roomManager.addAuditLog(activeRoom.room.id, {
        action: 'USER_KICKED',
        actorId: sender.id,
        actorName: sender.nickname,
        targetId: target.id,
        targetName: target.nickname,
        details: `${target.nickname} odadan atıldı.`,
      });

      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.emit(SocketEvents.ERROR, { message: 'Oda yöneticisi tarafından odadan çıkarıldınız.' });
        targetSocket.leave(activeRoom.room.id);
      }

      activeRoom.participants.delete(target.id);
      activeRoom.socketUserMap.delete(target.socketId);

      io.to(activeRoom.room.id).emit(SocketEvents.ROOM_USER_LEFT, { userId: target.id, nickname: target.nickname });
      if (typeof callback === 'function') callback({ success: true });
    }
  });

  // Ban User
  socket.on(SocketEvents.ROOM_BAN_USER, (data: { targetUserId: string }, callback: any) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;
    if (!hasPermission(sender.permissions, PermissionFlags.MANAGE_USERS)) {
      if (typeof callback === 'function') callback({ success: false, error: 'Yasaklama yetkiniz yok' });
      return;
    }

    const target = activeRoom.participants.get(data.targetUserId);
    if (target) {
      if (target.role === UserRole.OWNER) {
        if (typeof callback === 'function') callback({ success: false, error: 'Oda kurucusunu yasaklayamazsınız' });
        return;
      }

      activeRoom.bannedUserIds.add(target.id);

      roomManager.addAuditLog(activeRoom.room.id, {
        action: 'USER_BANNED',
        actorId: sender.id,
        actorName: sender.nickname,
        targetId: target.id,
        targetName: target.nickname,
        details: `${target.nickname} kalıcı olarak yasaklandı.`,
      });

      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.emit(SocketEvents.ERROR, { message: 'Bu odadan kalıcı olarak yasaklandınız.' });
        targetSocket.leave(activeRoom.room.id);
      }

      activeRoom.participants.delete(target.id);
      activeRoom.socketUserMap.delete(target.socketId);

      io.to(activeRoom.room.id).emit(SocketEvents.ROOM_USER_LEFT, { userId: target.id, nickname: target.nickname });
      if (typeof callback === 'function') callback({ success: true });
    }
  });

  // Update Role
  socket.on(SocketEvents.ROOM_UPDATE_ROLE, (data: any, callback: any) => {
    const session = roomManager.getRoomBySocketId(socket.id);
    if (!session) return;

    const { activeRoom, participant: sender } = session;
    if (sender.role !== UserRole.OWNER) {
      if (typeof callback === 'function') callback({ success: false, error: 'Yalnızca oda sahibi rol değiştirebilir' });
      return;
    }

    try {
      const parsed = UpdateRoleSchema.parse(data);
      const target = activeRoom.participants.get(parsed.targetUserId);
      if (target && target.role !== UserRole.OWNER) {
        target.role = parsed.newRole;
        target.permissions = DefaultRolePermissions[parsed.newRole];

        roomManager.addAuditLog(activeRoom.room.id, {
          action: 'ROLE_UPDATED',
          actorId: sender.id,
          actorName: sender.nickname,
          targetId: target.id,
          targetName: target.nickname,
          details: `${target.nickname} kullanıcısının rolü "${parsed.newRole}" olarak güncellendi.`,
        });

        io.to(activeRoom.room.id).emit(SocketEvents.ROOM_USER_UPDATED, target);
        if (typeof callback === 'function') callback({ success: true, participant: target });
      }
    } catch (error: any) {
      if (typeof callback === 'function') callback({ success: false, error: error.message });
    }
  });
}
