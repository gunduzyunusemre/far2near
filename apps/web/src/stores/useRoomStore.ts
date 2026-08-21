import { create } from 'zustand';
import {
  Room,
  Participant,
  Channel,
  AuditLogEntry,
  JoinRequest,
  UserRole,
  RoomSettings,
} from '@far2near/shared-types';

interface RoomState {
  currentRoom: Room | null;
  currentUser: Participant | null;
  participants: Participant[];
  channels: Channel[];
  activeChannelId: string;
  activeChannelType: 'text' | 'voice';
  joinRequests: JoinRequest[];
  auditLogs: AuditLogEntry[];
  isSettingsOpen: boolean;
  isAuditLogsOpen: boolean;
  isLeaveModalOpen: boolean;

  setRoomData: (data: {
    room: Room;
    user: Participant;
    participants: Participant[];
    channels: Channel[];
    auditLogs: AuditLogEntry[];
  }) => void;
  setActiveChannel: (channelId: string, type: 'text' | 'voice') => void;
  updateParticipant: (participant: Participant) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateRoomSettings: (settings: RoomSettings) => void;
  addJoinRequest: (request: JoinRequest) => void;
  removeJoinRequest: (requestId: string) => void;
  addAuditLog: (log: AuditLogEntry) => void;
  setSettingsOpen: (open: boolean) => void;
  setAuditLogsOpen: (open: boolean) => void;
  setLeaveModalOpen: (open: boolean) => void;
  leaveRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoom: null,
  currentUser: null,
  participants: [],
  channels: [],
  activeChannelId: 'general-text',
  activeChannelType: 'text',
  joinRequests: [],
  auditLogs: [],
  isSettingsOpen: false,
  isAuditLogsOpen: false,
  isLeaveModalOpen: false,

  setRoomData: ({ room, user, participants, channels, auditLogs }) => {
    const defaultTextChannel = channels.find((c) => c.type === 'text') || channels[0];
    set({
      currentRoom: room,
      currentUser: user,
      participants,
      channels,
      activeChannelId: defaultTextChannel ? defaultTextChannel.id : 'general-text',
      activeChannelType: defaultTextChannel ? defaultTextChannel.type : 'text',
      auditLogs,
    });
  },

  setActiveChannel: (channelId, type) => set({ activeChannelId: channelId, activeChannelType: type }),

  updateParticipant: (participant) =>
    set((state) => ({
      participants: state.participants.map((p) => (p.id === participant.id ? { ...p, ...participant } : p)),
      currentUser: state.currentUser?.id === participant.id ? { ...state.currentUser, ...participant } : state.currentUser,
    })),

  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants.filter((p) => p.id !== participant.id), participant],
    })),

  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== userId),
    })),

  updateRoomSettings: (settings) =>
    set((state) => (state.currentRoom ? { currentRoom: { ...state.currentRoom, settings } } : {})),

  addJoinRequest: (request) =>
    set((state) => ({
      joinRequests: [...state.joinRequests.filter((r) => r.id !== request.id), request],
    })),

  removeJoinRequest: (requestId) =>
    set((state) => ({
      joinRequests: state.joinRequests.filter((r) => r.id !== requestId),
    })),

  addAuditLog: (log) =>
    set((state) => ({
      auditLogs: [log, ...state.auditLogs].slice(0, 100),
    })),

  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setAuditLogsOpen: (isAuditLogsOpen) => set({ isAuditLogsOpen }),
  setLeaveModalOpen: (isLeaveModalOpen) => set({ isLeaveModalOpen }),

  leaveRoom: () =>
    set({
      currentRoom: null,
      currentUser: null,
      participants: [],
      channels: [],
      activeChannelId: 'general-text',
      activeChannelType: 'text',
      joinRequests: [],
      auditLogs: [],
      isSettingsOpen: false,
      isAuditLogsOpen: false,
    }),
}));
