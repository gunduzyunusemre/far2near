import React, { useState, useEffect } from 'react';
import { useAuthStore, AVATAR_PRESETS } from '../../stores/useAuthStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useChatStore } from '../../stores/useChatStore';
import { getSocket } from '../../lib/socket';
import { SocketEvents } from '@far2near/shared-types';
import { audioFX } from '../../lib/audioFX';
import {
  Sparkles,
  Users,
  Lock,
  Radio,
  ArrowRight,
  ShieldCheck,
  Zap,
  Volume2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  onJoined: () => void;
}

export const JoinCreateModal: React.FC<Props> = ({ onJoined }) => {
  const { nickname, avatar, setNickname, setAvatar, setToken } = useAuthStore();
  const { setRoomData } = useRoomStore();
  const { setMessages } = useChatStore();

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Check URL params for invite code (e.g. /join/A3B9K2 or ?code=A3B9K2)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code') || urlParams.get('room');
    if (codeParam) {
      setRoomCode(codeParam.toUpperCase());
      setMode('join');
    }
  }, []);

  const randomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setErrorMessage('Lütfen bir takma ad (nickname) girin.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Oda oluşturuluyor...');

    const socket = getSocket();
    socket.emit(
      SocketEvents.ROOM_CREATE,
      {
        nickname: nickname.trim(),
        avatar,
        name: roomName.trim() || `${nickname}'in Odası`,
        isPrivate,
        maxParticipants,
        recordHistory: true,
      },
      (res: any) => {
        setIsLoading(false);
        if (res.success) {
          setToken(res.token);
          setRoomData({
            room: res.room,
            user: res.user,
            participants: res.participants,
            channels: res.channels,
            auditLogs: res.auditLogs,
          });
          setMessages(res.messages || []);
          audioFX.playJoin();
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          onJoined();
        } else {
          setErrorMessage(res.error || 'Oda oluşturulamadı.');
        }
      }
    );
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setErrorMessage('Lütfen bir takma ad (nickname) girin.');
      return;
    }
    if (!roomCode.trim() || roomCode.trim().length !== 6) {
      setErrorMessage('Lütfen 6 haneli geçerli bir oda kodu girin.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Odaya bağlanılıyor...');

    const socket = getSocket();
    socket.emit(
      SocketEvents.ROOM_JOIN,
      {
        roomId: roomCode.trim().toUpperCase(),
        nickname: nickname.trim(),
        avatar,
      },
      (res: any) => {
        setIsLoading(false);
        if (res.success) {
          if (res.pendingApproval) {
            setStatusMessage(res.message || 'Katılma isteğiniz oda sahibine iletildi. Onay bekleniyor...');
          } else {
            setToken(res.token);
            setRoomData({
              room: res.room,
              user: res.user,
              participants: res.participants,
              channels: res.channels,
              auditLogs: res.auditLogs,
            });
            setMessages(res.messages || []);
            audioFX.playJoin();
            onJoined();
          }
        } else {
          setErrorMessage(res.error || 'Odaya katılınamadı.');
        }
      }
    );
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#0e0f12]">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md bg-[#18191c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 animate-slide-up">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand to-brand-light flex items-center justify-center shadow-lg shadow-brand/25 mb-3">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            far2near <span className="text-xs px-2 py-0.5 rounded-full bg-brand/20 text-brand-light font-mono font-medium">P2P v1.0</span>
          </h1>
          <p className="text-xs text-discord-muted mt-1">
            Sunucusuz, uçtan uca şifreli sesli & metinli iletişim platformu
          </p>
        </div>

        {/* Profile / Avatar Picker */}
        <div className="bg-[#121316] p-4 rounded-xl border border-white/5 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <img
                src={avatar}
                alt="Avatar"
                className="w-16 h-16 rounded-full bg-[#202225] border-2 border-brand/50 p-0.5 object-cover transition-transform group-hover:scale-105"
              />
              <button
                type="button"
                onClick={randomizeAvatar}
                title="Rastgele Avatar Seç"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-brand text-white hover:bg-brand-hover shadow-md transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-discord-muted mb-1">
                Takma Adınız (Nickname)
              </label>
              <input
                type="text"
                required
                maxLength={24}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Örn: Neo, Alice, Trinity"
                className="w-full px-3 py-2 bg-[#202225] text-white rounded-lg border border-white/10 focus:border-brand focus:outline-none text-sm transition-colors"
              />
            </div>
          </div>

          {/* Quick Preset Avatars */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5 overflow-x-auto pb-1">
            <span className="text-[11px] text-discord-muted whitespace-nowrap">Hazır:</span>
            {AVATAR_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setAvatar(preset)}
                className={`w-7 h-7 rounded-full overflow-hidden border transition-all ${
                  avatar === preset ? 'border-brand scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={preset} alt="preset" className="w-full h-full bg-[#202225]" />
              </button>
            ))}
          </div>
        </div>

        {/* Tab Selector: Create vs Join */}
        <div className="grid grid-cols-2 p-1 bg-[#121316] rounded-xl mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'create'
                ? 'bg-brand text-white shadow-md'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Oda Oluştur
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('join');
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'join'
                ? 'bg-brand text-white shadow-md'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Odaya Katıl
          </button>
        </div>

        {/* Error / Status Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 animate-fade-in flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            {errorMessage}
          </div>
        )}
        {statusMessage && (
          <div className="mb-4 p-3 bg-brand/10 border border-brand/30 rounded-xl text-xs text-brand-light animate-fade-in flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            {statusMessage}
          </div>
        )}

        {/* Form: Create Room */}
        {mode === 'create' ? (
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-discord-muted mb-1.5">
                Oda Adı (Opsiyonel)
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder={nickname ? `${nickname}'in Odası` : 'Örn: Gece Tayfası'}
                className="w-full px-3.5 py-2.5 bg-[#121316] text-white rounded-xl border border-white/10 focus:border-brand focus:outline-none text-sm transition-colors"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#121316] rounded-xl border border-white/5">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-brand-light" />
                <div>
                  <div className="text-xs font-semibold text-white">Kapalı Oda Modu</div>
                  <div className="text-[11px] text-discord-muted">Yeni katılanlar onay bekler</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-discord-muted mb-1 font-semibold">
                <span>Maksimum Katılımcı</span>
                <span className="text-brand-light">{maxParticipants} Kişi</span>
              </div>
              <input
                type="range"
                min="2"
                max="50"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-brand to-brand-hover text-white font-semibold rounded-xl shadow-lg shadow-brand/25 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Odayı Başlat</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Form: Join Room */
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-discord-muted mb-1.5">
                6 Haneli Oda Kodu
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Örn: A3B9K2"
                className="w-full px-3.5 py-3 bg-[#121316] text-white font-mono tracking-widest text-center text-lg uppercase rounded-xl border border-white/10 focus:border-brand focus:outline-none transition-colors"
              />
              <p className="text-[11px] text-discord-muted mt-1.5 text-center">
                Arkadaşınızın paylaştığı 6 haneli kodu veya linki yapıştırın
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-brand to-brand-hover text-white font-semibold rounded-xl shadow-lg shadow-brand/25 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Odaya Katıl</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Feature badges footer */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-around text-[11px] text-discord-muted">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> P2P WebRTC
          </span>
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-brand-light" /> Canlı Ses
          </span>
          <span className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-indigo-400" /> Ekran Paylaşımı
          </span>
        </div>
      </div>
    </div>
  );
};
