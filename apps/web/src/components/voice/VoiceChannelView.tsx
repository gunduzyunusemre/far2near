import React, { useEffect, useRef } from 'react';
import { useRoomStore } from '../../stores/useRoomStore';
import { useWebRTCStore } from '../../stores/useWebRTCStore';
import { WebRTCService } from '../../lib/webrtc';
import { getSocket } from '../../lib/socket';
import { audioFX } from '../../lib/audioFX';
import { SocketEvents, UserRole } from '@far2near/shared-types';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  PhoneOff,
  Radio,
} from 'lucide-react';

interface VideoTileProps {
  stream?: MediaStream | null;
  nickname: string;
  avatar: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isHandRaised: boolean;
  role: UserRole;
  isLocal?: boolean;
}

const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  nickname,
  avatar,
  isSpeaking,
  isMuted,
  isCameraOn,
  isHandRaised,
  role,
  isLocal,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream && isCameraOn) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});
    }
  }, [stream, isCameraOn]);

  return (
    <div
      className={`relative bg-[#1e1f22] rounded-2xl overflow-hidden aspect-video flex items-center justify-center border transition-all duration-200 ${
        isSpeaking ? 'border-emerald-500 shadow-[0_0_15px_rgba(35,165,90,0.4)]' : 'border-white/5'
      }`}
    >
      {/* Video Element or Avatar */}
      {isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover bg-black"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-4">
          <div className="relative">
            <img
              src={avatar}
              alt={nickname}
              className={`w-20 h-20 rounded-full bg-[#2b2d31] object-cover transition-all ${
                isSpeaking ? 'ring-4 ring-emerald-500 scale-105 shadow-xl' : ''
              }`}
            />
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
        </div>
      )}

      {/* Badges Overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {isHandRaised && (
          <span className="px-2 py-1 bg-amber-500/90 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-1 animate-bounce">
            ✋ El Kaldırdı
          </span>
        )}
        {isMuted && (
          <span className="p-1.5 bg-discord-red/90 text-white rounded-full shadow-lg">
            <MicOff className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Bottom Name Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white truncate max-w-[140px]">
            {nickname} {isLocal && '(Sen)'}
          </span>
          {role === UserRole.OWNER && <span className="text-[10px]" title="Kurucu">👑</span>}
        </div>
      </div>
    </div>
  );
};

interface ScreenShareStageProps {
  stream: MediaStream | null;
  sharerName: string;
}

const ScreenShareStage: React.FC<ScreenShareStageProps> = ({ stream, sharerName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});
    }
  }, [stream]);

  return (
    <div className="mb-4 relative rounded-2xl overflow-hidden bg-black border border-brand/40 max-h-[60vh] flex items-center justify-center shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain max-h-[60vh] bg-black"
      />
      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-2 border border-white/10">
        <Monitor className="w-4 h-4 text-emerald-400" />
        <span>{sharerName} ekranını paylaşıyor</span>
      </div>
    </div>
  );
};

export const VoiceChannelView: React.FC = () => {
  const { currentRoom, currentUser, participants, activeChannelId, channels } = useRoomStore();
  const {
    currentVoiceChannelId,
    isMuted,
    isCameraOn,
    isScreenSharing,
    isHandRaised,
    speakingUserIds,
    peerStreams,
    localStream,
    screenStream,
    setMuted,
    setCameraOn,
    setScreenSharing,
    setHandRaised,
    setLocalStream,
    setScreenStream,
    setPeerStream,
    removePeerStream,
    setUserSpeaking,
    resetWebRTC,
  } = useWebRTCStore();

  const webrtcService = WebRTCService.getInstance();

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const voiceParticipants = participants.filter((p) => p.voiceChannelId === activeChannelId);

  useEffect(() => {
    const unsubSpeaking = webrtcService.onSpeakingChange((speaking) => {
      if (currentUser) setUserSpeaking(currentUser.id, speaking);
    });

    const unsubRemoteStream = webrtcService.onRemoteStream((peerSocketId, stream) => {
      setPeerStream(peerSocketId, stream);
    });

    const unsubDisconnect = webrtcService.onPeerDisconnect((peerSocketId) => {
      removePeerStream(peerSocketId);
    });

    return () => {
      unsubSpeaking();
      unsubRemoteStream();
      unsubDisconnect();
    };
  }, [currentUser]);

  // Find who is sharing screen (local or remote peer)
  const screenSharer = voiceParticipants.find((p) =>
    p.id === currentUser?.id ? isScreenSharing : p.isScreenSharing
  );
  const activeScreenStream = screenSharer
    ? screenSharer.id === currentUser?.id
      ? screenStream
      : peerStreams.get(screenSharer.socketId) || null
    : null;

  const toggleMic = () => {
    const nextMuted = !isMuted;
    setMuted(nextMuted);
    webrtcService.toggleMicrophone(nextMuted);
    audioFX.playMute(nextMuted);
    getSocket().emit(SocketEvents.MEDIA_STATE_CHANGE, { isMuted: nextMuted });
  };

  const toggleCam = async () => {
    const nextCam = !isCameraOn;
    setCameraOn(nextCam);
    const stream = await webrtcService.toggleCamera(nextCam);
    setLocalStream(stream);
    getSocket().emit(SocketEvents.MEDIA_STATE_CHANGE, { isCameraOn: nextCam });
  };

  const toggleScreen = async () => {
    if (!isScreenSharing) {
      const stream = await webrtcService.startScreenShare();
      if (stream) {
        setScreenSharing(true);
        setScreenStream(stream);
        getSocket().emit(SocketEvents.MEDIA_STATE_CHANGE, { isScreenSharing: true });
      }
    } else {
      await webrtcService.stopScreenShare();
      setScreenSharing(false);
      setScreenStream(null);
      getSocket().emit(SocketEvents.MEDIA_STATE_CHANGE, { isScreenSharing: false });
    }
  };

  const toggleHand = () => {
    const nextHand = !isHandRaised;
    setHandRaised(nextHand);
    getSocket().emit(SocketEvents.RAISE_HAND_TOGGLE, { isHandRaised: nextHand });
  };

  const handleLeaveVoice = () => {
    audioFX.playLeave();
    getSocket().emit(SocketEvents.VOICE_LEAVE, () => {
      webrtcService.leaveVoiceChannel();
      resetWebRTC();
    });
  };

  const isInThisChannel = currentVoiceChannelId === activeChannelId;

  return (
    <div className="flex-1 h-full bg-[#1e1f22] flex flex-col min-w-0 overflow-hidden relative">
      {/* Voice Stage Header */}
      <div className="h-14 px-4 border-b border-[#111214] flex items-center justify-between shadow-sm bg-[#1e1f22]">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
          <h3 className="text-sm font-bold text-white">
            {activeChannel?.name || 'Sesli Kanal'}
          </h3>
          <span className="text-xs text-discord-muted">
            ({voiceParticipants.length} katılımcı)
          </span>
        </div>
      </div>

      {/* Stage Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center">
        {/* If Screen Share is Active, show Large Theatre Stage */}
        {screenSharer && activeScreenStream && (
          <ScreenShareStage
            stream={activeScreenStream}
            sharerName={screenSharer.nickname}
          />
        )}

        {/* Video / Avatar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max">
          {voiceParticipants.map((p) => {
            const isLocal = p.id === currentUser?.id;
            const isSpeaking = speakingUserIds.has(p.id) || p.isSpeaking;
            const peerStream = isLocal ? localStream : peerStreams.get(p.socketId);
            const isCamActive = isLocal ? isCameraOn : Boolean(p.isCameraOn);

            return (
              <VideoTile
                key={p.id}
                stream={peerStream}
                nickname={p.nickname}
                avatar={p.avatar}
                isSpeaking={isSpeaking}
                isMuted={p.isMuted}
                isCameraOn={isCamActive}
                isHandRaised={p.isHandRaised}
                role={p.role}
                isLocal={isLocal}
              />
            );
          })}
        </div>
      </div>

      {/* Floating In-Channel Voice Control Bar */}
      {isInThisChannel && (
        <div className="p-4 bg-[#141517] border-t border-[#111214] flex items-center justify-center gap-3 z-20">
          <button
            onClick={toggleMic}
            title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            className={`p-3.5 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-md ${
              isMuted
                ? 'bg-discord-red text-white hover:bg-discord-red/90'
                : 'bg-[#2b2d31] text-white hover:bg-[#35373c]'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleCam}
            title={isCameraOn ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
            className={`p-3.5 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-md ${
              isCameraOn
                ? 'bg-brand text-white hover:bg-brand-hover ring-2 ring-brand-light'
                : 'bg-[#2b2d31] text-white hover:bg-[#35373c]'
            }`}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleScreen}
            title={isScreenSharing ? 'Ekran Paylaşımını Durdur' : 'Ekranını Paylaş'}
            className={`p-3.5 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-md ${
              isScreenSharing
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-400'
                : 'bg-[#2b2d31] text-white hover:bg-[#35373c]'
            }`}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleHand}
            title={isHandRaised ? 'Eli İndir' : 'Söz İste / El Kaldır'}
            className={`p-3.5 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-md ${
              isHandRaised
                ? 'bg-amber-500 text-white hover:bg-amber-600 animate-bounce'
                : 'bg-[#2b2d31] text-white hover:bg-[#35373c]'
            }`}
          >
            <Hand className="w-5 h-5" />
          </button>

          <button
            onClick={handleLeaveVoice}
            title="Kanaldan Ayrıl"
            className="p-3.5 rounded-2xl bg-discord-red text-white hover:bg-discord-red/90 font-semibold flex items-center gap-2 transition-all shadow-md"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
