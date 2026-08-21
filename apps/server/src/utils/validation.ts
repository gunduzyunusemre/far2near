import { z } from 'zod';
import { UserRole } from '@far2near/shared-types';

export const CreateRoomSchema = z.object({
  nickname: z.string().trim().min(2, 'Nickname must be at least 2 characters').max(32),
  avatar: z.string().min(1).max(500),
  name: z.string().trim().min(2).max(50).optional(),
  description: z.string().max(200).optional(),
  maxParticipants: z.number().int().min(2).max(50).default(25),
  isPrivate: z.boolean().default(false),
  recordHistory: z.boolean().default(false),
});

export const JoinRoomSchema = z.object({
  roomId: z.string().trim().length(6, 'Room code must be 6 characters').toUpperCase(),
  nickname: z.string().trim().min(2).max(32),
  avatar: z.string().max(500),
  password: z.string().optional(),
});

export const SendMessageSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().max(4000),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().max(26214400), // Max 25MB
    type: z.string(),
    url: z.string(),
  })).optional(),
  replyToId: z.string().optional(),
});

export const RoomSettingsUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(200).optional(),
  coverImage: z.string().max(500).optional(),
  maxParticipants: z.number().int().min(2).max(50).optional(),
  isPrivate: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  recordHistory: z.boolean().optional(),
});

export const UpdateRoleSchema = z.object({
  targetUserId: z.string(),
  newRole: z.nativeEnum(UserRole),
});
