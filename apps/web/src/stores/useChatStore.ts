import { create } from 'zustand';
import { ChatMessage, MessageReaction } from '@far2near/shared-types';

interface TypingUser {
  userId: string;
  nickname: string;
  channelId: string;
}

interface ChatState {
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  replyingTo: ChatMessage | null;

  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  editMessage: (message: ChatMessage) => void;
  deleteMessage: (messageId: string) => void;
  updateReaction: (messageId: string, reactions?: MessageReaction[]) => void;
  setTypingUser: (user: { userId: string; nickname: string; channelId: string; isTyping: boolean }) => void;
  setReplyingTo: (message: ChatMessage | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  typingUsers: [],
  replyingTo: null,

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages.filter((m) => m.id !== message.id), message],
    })),

  editMessage: (message) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === message.id ? message : m)),
    })),

  deleteMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),

  updateReaction: (messageId, reactions) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
    })),

  setTypingUser: ({ userId, nickname, channelId, isTyping }) =>
    set((state) => {
      if (isTyping) {
        const existing = state.typingUsers.some((u) => u.userId === userId && u.channelId === channelId);
        if (existing) return state;
        return { typingUsers: [...state.typingUsers, { userId, nickname, channelId }] };
      } else {
        return {
          typingUsers: state.typingUsers.filter((u) => !(u.userId === userId && u.channelId === channelId)),
        };
      }
    }),

  setReplyingTo: (replyingTo) => set({ replyingTo }),

  clearMessages: () => set({ messages: [], typingUsers: [], replyingTo: null }),
}));
