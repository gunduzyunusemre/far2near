import { create } from 'zustand';

export const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Luna',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Milo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Shadow',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cosmo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Echo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aura',
];

interface AuthState {
  nickname: string;
  avatar: string;
  token: string | null;
  customStatus: string;
  setNickname: (nickname: string) => void;
  setAvatar: (avatar: string) => void;
  setToken: (token: string | null) => void;
  setCustomStatus: (status: string) => void;
}

const savedNickname = localStorage.getItem('far2near_nickname') || '';
const savedAvatar = localStorage.getItem('far2near_avatar') || AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];

export const useAuthStore = create<AuthState>((set) => ({
  nickname: savedNickname,
  avatar: savedAvatar,
  token: null,
  customStatus: '🎮 far2near ile bağlı',
  setNickname: (nickname) => {
    localStorage.setItem('far2near_nickname', nickname);
    set({ nickname });
  },
  setAvatar: (avatar) => {
    localStorage.setItem('far2near_avatar', avatar);
    set({ avatar });
  },
  setToken: (token) => set({ token }),
  setCustomStatus: (customStatus) => set({ customStatus }),
}));
