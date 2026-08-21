import { create } from 'zustand';

interface WebRTCState {
  currentVoiceChannelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  speakingUserIds: Set<string>;
  peerStreams: Map<string, MediaStream>; // socketId -> MediaStream
  localStream: MediaStream | null;
  screenStream: MediaStream | null;

  setVoiceChannel: (channelId: string | null) => void;
  setMuted: (isMuted: boolean) => void;
  setDeafened: (isDeafened: boolean) => void;
  setCameraOn: (isCameraOn: boolean) => void;
  setScreenSharing: (isScreenSharing: boolean) => void;
  setHandRaised: (isHandRaised: boolean) => void;
  setUserSpeaking: (userId: string, isSpeaking: boolean) => void;
  setPeerStream: (socketId: string, stream: MediaStream) => void;
  removePeerStream: (socketId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  resetWebRTC: () => void;
}

export const useWebRTCStore = create<WebRTCState>((set) => ({
  currentVoiceChannelId: null,
  isMuted: false,
  isDeafened: false,
  isCameraOn: false,
  isScreenSharing: false,
  isHandRaised: false,
  speakingUserIds: new Set(),
  peerStreams: new Map(),
  localStream: null,
  screenStream: null,

  setVoiceChannel: (currentVoiceChannelId) => set({ currentVoiceChannelId }),
  setMuted: (isMuted) => set({ isMuted }),
  setDeafened: (isDeafened) => set({ isDeafened }),
  setCameraOn: (isCameraOn) => set({ isCameraOn }),
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  setHandRaised: (isHandRaised) => set({ isHandRaised }),

  setUserSpeaking: (userId, isSpeaking) =>
    set((state) => {
      const next = new Set(state.speakingUserIds);
      if (isSpeaking) next.add(userId);
      else next.delete(userId);
      return { speakingUserIds: next };
    }),

  setPeerStream: (socketId, stream) =>
    set((state) => {
      const next = new Map(state.peerStreams);
      next.set(socketId, stream);
      return { peerStreams: next };
    }),

  removePeerStream: (socketId) =>
    set((state) => {
      const next = new Map(state.peerStreams);
      next.delete(socketId);
      return { peerStreams: next };
    }),

  setLocalStream: (localStream) => set({ localStream }),
  setScreenStream: (screenStream) => set({ screenStream }),

  resetWebRTC: () =>
    set({
      currentVoiceChannelId: null,
      isMuted: false,
      isDeafened: false,
      isCameraOn: false,
      isScreenSharing: false,
      isHandRaised: false,
      speakingUserIds: new Set(),
      peerStreams: new Map(),
      localStream: null,
      screenStream: null,
    }),
}));
