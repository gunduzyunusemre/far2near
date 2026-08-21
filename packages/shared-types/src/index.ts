/**
 * far2near - Shared Types and Protocol Definitions
 */

// ==================== ROLES & PERMISSIONS ====================
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
  MUTED = 'MUTED',
}

export const PermissionFlags = {
  SEND_MESSAGES: 1 << 0,      // 1
  SPEAK: 1 << 1,              // 2
  STREAM_VIDEO: 1 << 2,       // 4
  SHARE_SCREEN: 1 << 3,       // 8
  MANAGE_MESSAGES: 1 << 4,    // 16 (delete/edit any)
  MANAGE_USERS: 1 << 5,       // 32 (kick/ban/mute)
  MANAGE_ROOM: 1 << 6,        // 64 (change settings, lock)
  INVITE_USERS: 1 << 7,       // 128
} as const;

export type PermissionKey = keyof typeof PermissionFlags;

export const DefaultRolePermissions: Record<UserRole, number> = {
  [UserRole.OWNER]: 0b11111111, // All permissions (255)
  [UserRole.ADMIN]: PermissionFlags.SEND_MESSAGES |
                    PermissionFlags.SPEAK |
                    PermissionFlags.STREAM_VIDEO |
                    PermissionFlags.SHARE_SCREEN |
                    PermissionFlags.MANAGE_MESSAGES |
                    PermissionFlags.MANAGE_USERS |
                    PermissionFlags.INVITE_USERS,
  [UserRole.MODERATOR]: PermissionFlags.SEND_MESSAGES |
                        PermissionFlags.SPEAK |
                        PermissionFlags.STREAM_VIDEO |
                        PermissionFlags.SHARE_SCREEN |
                        PermissionFlags.MANAGE_MESSAGES |
                        PermissionFlags.MANAGE_USERS |
                        PermissionFlags.INVITE_USERS,
  [UserRole.MEMBER]: PermissionFlags.SEND_MESSAGES |
                     PermissionFlags.SPEAK |
                     PermissionFlags.STREAM_VIDEO |
                     PermissionFlags.SHARE_SCREEN |
                     PermissionFlags.INVITE_USERS,
  [UserRole.MUTED]: 0, // No speaking or messaging
};

export function hasPermission(bitmask: number, permission: number): boolean {
  return (bitmask & permission) === permission;
}

// ==================== USER & PARTICIPANT ====================
export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  customStatus?: string;
  joinedAt: number;
}

export interface Participant extends UserProfile {
  socketId: string;
  role: UserRole;
  permissions: number;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  voiceChannelId: string | null;
}

// ==================== ROOM & CHANNELS ====================
export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  description?: string;
}

export interface RoomSettings {
  name: string;
  description: string;
  coverImage?: string;
  maxParticipants: number;
  isPrivate: boolean; // Requires approval
  isLocked: boolean; // No new joins
  recordHistory: boolean;
  hasPassword?: boolean;
}

export interface Room {
  id: string; // 6-digit alphanumeric (e.g. A3B9K2)
  ownerId: string;
  settings: RoomSettings;
  channels: Channel[];
  createdAt: number;
  participantCount?: number;
}

export interface JoinRequest {
  id: string;
  socketId: string;
  user: UserProfile;
  requestedAt: number;
}

// ==================== CHAT & MESSAGES ====================
export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string; // Base64 data URL or peer blob link
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: UserRole;
  content: string;
  timestamp: number;
  editedAt?: number;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  isSystem?: boolean;
}

// ==================== WEBRTC SIGNALING ====================
export interface WebRTCSignalData {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface SignalMessage {
  targetSocketId: string;
  senderSocketId: string;
  senderUserId: string;
  channelId: string;
  signal: WebRTCSignalData;
}

export interface MediaStateUpdate {
  userId: string;
  channelId: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isSpeaking?: boolean;
}

// ==================== AUDIT LOG ====================
export type AuditAction =
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'USER_KICKED'
  | 'USER_BANNED'
  | 'USER_MUTED'
  | 'ROLE_UPDATED'
  | 'MESSAGE_DELETED'
  | 'SETTINGS_UPDATED'
  | 'ROOM_LOCKED';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  details?: string;
  timestamp: number;
}

// ==================== JWT PAYLOAD ====================
export interface RoomTokenPayload {
  userId: string;
  roomId: string;
  nickname: string;
  role: UserRole;
  permissions: number;
  exp?: number;
  iat?: number;
}

// ==================== SOCKET EVENTS ====================
export const SocketEvents = {
  // Connection & Auth
  AUTH_TOKEN: 'auth:token',
  ERROR: 'system:error',

  // Room lifecycle
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_JOIN_REQUEST: 'room:join_request',
  ROOM_JOIN_RESPONSE: 'room:join_response',
  ROOM_LEAVE: 'room:leave',
  ROOM_DATA: 'room:data',
  ROOM_SETTINGS_UPDATE: 'room:settings_update',
  ROOM_SETTINGS_CHANGED: 'room:settings_changed',
  ROOM_KICK_USER: 'room:kick_user',
  ROOM_BAN_USER: 'room:ban_user',
  ROOM_MUTE_USER: 'room:mute_user',
  ROOM_UPDATE_ROLE: 'room:update_role',
  ROOM_USER_JOINED: 'room:user_joined',
  ROOM_USER_LEFT: 'room:user_left',
  ROOM_USER_UPDATED: 'room:user_updated',
  ROOM_AUDIT_LOGS: 'room:audit_logs',

  // Chat
  CHAT_SEND_MESSAGE: 'chat:send_message',
  CHAT_NEW_MESSAGE: 'chat:new_message',
  CHAT_EDIT_MESSAGE: 'chat:edit_message',
  CHAT_MESSAGE_EDITED: 'chat:message_edited',
  CHAT_DELETE_MESSAGE: 'chat:delete_message',
  CHAT_MESSAGE_DELETED: 'chat:message_deleted',
  CHAT_ADD_REACTION: 'chat:add_reaction',
  CHAT_REACTION_UPDATED: 'chat:reaction_updated',
  CHAT_TYPING_START: 'chat:typing_start',
  CHAT_TYPING_STOP: 'chat:typing_stop',
  CHAT_USER_TYPING: 'chat:user_typing',

  // Voice & WebRTC
  VOICE_JOIN: 'voice:join',
  VOICE_LEAVE: 'voice:leave',
  VOICE_PEER_JOINED: 'voice:peer_joined',
  VOICE_PEER_LEFT: 'voice:peer_left',
  WEBRTC_SIGNAL: 'webrtc:signal',
  MEDIA_STATE_CHANGE: 'media:state_change',
  MEDIA_STATE_UPDATED: 'media:state_updated',
  RAISE_HAND_TOGGLE: 'voice:raise_hand',
} as const;
