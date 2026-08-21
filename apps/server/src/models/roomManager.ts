import {
  Room,
  RoomSettings,
  Participant,
  Channel,
  ChatMessage,
  AuditLogEntry,
  UserRole,
  DefaultRolePermissions,
  JoinRequest,
  AuditAction,
} from '@far2near/shared-types';
import crypto from 'crypto';

interface ActiveRoom {
  room: Room;
  participants: Map<string, Participant>; // userId -> Participant
  socketUserMap: Map<string, string>; // socketId -> userId
  joinRequests: Map<string, JoinRequest>; // requestId -> JoinRequest
  bannedUserIds: Set<string>;
  bannedIps: Set<string>;
  messages: ChatMessage[];
  auditLogs: AuditLogEntry[];
}

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, ActiveRoom> = new Map(); // roomId -> ActiveRoom

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Create a new room with default channels and owner
   */
  public createRoom(
    roomId: string,
    ownerUser: { id: string; nickname: string; avatar: string; socketId: string },
    settings: Partial<RoomSettings> = {}
  ): ActiveRoom {
    const defaultSettings: RoomSettings = {
      name: settings.name || `${ownerUser.nickname}'in Odası`,
      description: settings.description || 'far2near P2P Odası',
      maxParticipants: settings.maxParticipants || 25,
      isPrivate: settings.isPrivate || false,
      isLocked: false,
      recordHistory: settings.recordHistory ?? true,
      coverImage: settings.coverImage || '',
    };

    const defaultChannels: Channel[] = [
      { id: 'general-text', name: 'genel-sohbet', type: 'text', description: 'Ana metin kanalı' },
      { id: 'announcements', name: 'duyurular', type: 'text', description: 'Önemli duyurular' },
      { id: 'voice-1', name: 'Sesli Kanal 1', type: 'voice', description: 'Ana sesli oda' },
      { id: 'voice-2', name: 'Sesli Kanal 2', type: 'voice', description: 'Oyun / Sohbet odası' },
    ];

    const newRoom: Room = {
      id: roomId,
      ownerId: ownerUser.id,
      settings: defaultSettings,
      channels: defaultChannels,
      createdAt: Date.now(),
    };

    const ownerParticipant: Participant = {
      id: ownerUser.id,
      nickname: ownerUser.nickname,
      avatar: ownerUser.avatar,
      joinedAt: Date.now(),
      socketId: ownerUser.socketId,
      role: UserRole.OWNER,
      permissions: DefaultRolePermissions[UserRole.OWNER],
      isMuted: false,
      isDeafened: false,
      isCameraOn: false,
      isScreenSharing: false,
      isHandRaised: false,
      isSpeaking: false,
      voiceChannelId: null,
    };

    const activeRoom: ActiveRoom = {
      room: newRoom,
      participants: new Map([[ownerUser.id, ownerParticipant]]),
      socketUserMap: new Map([[ownerUser.socketId, ownerUser.id]]),
      joinRequests: new Map(),
      bannedUserIds: new Set(),
      bannedIps: new Set(),
      messages: [
        {
          id: crypto.randomUUID(),
          roomId,
          channelId: 'general-text',
          senderId: 'system',
          senderName: 'far2near Sistem',
          senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=far2near',
          senderRole: UserRole.OWNER,
          content: `🎉 **${defaultSettings.name}** odası başarıyla kuruldu! Davet linki veya 6 haneli kod (${roomId}) ile arkadaşlarınızı çağırabilirsiniz.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      auditLogs: [
        {
          id: crypto.randomUUID(),
          action: 'USER_JOINED',
          actorId: ownerUser.id,
          actorName: ownerUser.nickname,
          details: 'Oda oluşturuldu ve kurucu katıldı',
          timestamp: Date.now(),
        },
      ],
    };

    this.rooms.set(roomId, activeRoom);
    return activeRoom;
  }

  public getRoom(roomId: string): ActiveRoom | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public getRoomBySocketId(socketId: string): { activeRoom: ActiveRoom; participant: Participant } | undefined {
    for (const activeRoom of this.rooms.values()) {
      const userId = activeRoom.socketUserMap.get(socketId);
      if (userId) {
        const participant = activeRoom.participants.get(userId);
        if (participant) {
          return { activeRoom, participant };
        }
      }
    }
    return undefined;
  }

  public addParticipant(
    roomId: string,
    user: { id: string; nickname: string; avatar: string; socketId: string },
    role: UserRole = UserRole.MEMBER
  ): Participant {
    const activeRoom = this.getRoom(roomId);
    if (!activeRoom) throw new Error('Oda bulunamadı');

    const participant: Participant = {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      joinedAt: Date.now(),
      socketId: user.socketId,
      role,
      permissions: DefaultRolePermissions[role],
      isMuted: false,
      isDeafened: false,
      isCameraOn: false,
      isScreenSharing: false,
      isHandRaised: false,
      isSpeaking: false,
      voiceChannelId: null,
    };

    activeRoom.participants.set(user.id, participant);
    activeRoom.socketUserMap.set(user.socketId, user.id);

    this.addAuditLog(roomId, {
      action: 'USER_JOINED',
      actorId: user.id,
      actorName: user.nickname,
      details: `${user.nickname} odaya katıldı.`,
    });

    return participant;
  }

  public removeParticipant(socketId: string): { activeRoom: ActiveRoom; participant: Participant } | undefined {
    for (const activeRoom of this.rooms.values()) {
      const userId = activeRoom.socketUserMap.get(socketId);
      if (userId) {
        const participant = activeRoom.participants.get(userId);
        if (participant) {
          activeRoom.participants.delete(userId);
          activeRoom.socketUserMap.delete(socketId);

          this.addAuditLog(activeRoom.room.id, {
            action: 'USER_LEFT',
            actorId: participant.id,
            actorName: participant.nickname,
            details: `${participant.nickname} odadan ayrıldı.`,
          });

          // If room is empty, clean up after 5 minutes
          if (activeRoom.participants.size === 0) {
            setTimeout(() => {
              const currentRoom = this.rooms.get(activeRoom.room.id);
              if (currentRoom && currentRoom.participants.size === 0) {
                this.rooms.delete(activeRoom.room.id);
              }
            }, 300000);
          }

          return { activeRoom, participant };
        }
      }
    }
    return undefined;
  }

  public addMessage(roomId: string, message: ChatMessage): void {
    const activeRoom = this.getRoom(roomId);
    if (!activeRoom) return;

    activeRoom.messages.push(message);
    if (activeRoom.messages.length > 200) {
      activeRoom.messages.shift(); // keep last 200 in memory
    }
  }

  public editMessage(roomId: string, messageId: string, newContent: string): ChatMessage | null {
    const activeRoom = this.getRoom(roomId);
    if (!activeRoom) return null;

    const message = activeRoom.messages.find((m) => m.id === messageId);
    if (message) {
      message.content = newContent;
      message.editedAt = Date.now();
      return message;
    }
    return null;
  }

  public deleteMessage(roomId: string, messageId: string, deletedBy: Participant): boolean {
    const activeRoom = this.getRoom(roomId);
    if (!activeRoom) return false;

    const index = activeRoom.messages.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      const msg = activeRoom.messages[index];
      activeRoom.messages.splice(index, 1);

      this.addAuditLog(roomId, {
        action: 'MESSAGE_DELETED',
        actorId: deletedBy.id,
        actorName: deletedBy.nickname,
        details: `${msg.senderName} tarafından yazılan mesaj silindi: "${msg.content.slice(0, 30)}..."`,
      });
      return true;
    }
    return false;
  }

  public addReaction(roomId: string, messageId: string, emoji: string, userId: string): ChatMessage | null {
    const activeRoom = this.getRoom(roomId);
    if (!activeRoom) return null;

    const message = activeRoom.messages.find((m) => m.id === messageId);
    if (!message) return null;

    if (!message.reactions) message.reactions = [];

    const existingReaction = message.reactions.find((r) => r.emoji === emoji);
    if (existingReaction) {
      if (existingReaction.userIds.includes(userId)) {
        // Toggle off
        existingReaction.userIds = existingReaction.userIds.filter((id) => id !== userId);
        if (existingReaction.userIds.length === 0) {
          message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        existingReaction.userIds.push(userId);
      }
    } else {
      message.reactions.push({ emoji, userIds: [userId] });
    }

    return message;
  }

  public addAuditLog(
    roomId: string,
    entry: {
      action: AuditAction;
      actorId: string;
      actorName: string;
      targetId?: string;
      targetName?: string;
      details?: string;
    }
  ): AuditLogEntry {
    const activeRoom = this.getRoom(roomId);
    const log: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...entry,
    };

    if (activeRoom) {
      activeRoom.auditLogs.unshift(log);
      if (activeRoom.auditLogs.length > 100) {
        activeRoom.auditLogs.pop();
      }
    }
    return log;
  }
}
