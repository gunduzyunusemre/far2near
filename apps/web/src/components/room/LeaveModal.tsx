import React from 'react';
import { useRoomStore } from '../../stores/useRoomStore';
import { useChatStore } from '../../stores/useChatStore';
import { useWebRTCStore } from '../../stores/useWebRTCStore';
import { WebRTCService } from '../../lib/webrtc';
import { audioFX } from '../../lib/audioFX';
import { getSocket } from '../../lib/socket';
import { LogOut, X, AlertTriangle } from 'lucide-react';

export const LeaveModal: React.FC = () => {
  const { isLeaveModalOpen, setLeaveModalOpen, leaveRoom } = useRoomStore();
  const { clearMessages } = useChatStore();
  const { resetWebRTC } = useWebRTCStore();

  if (!isLeaveModalOpen) return null;

  const handleConfirmLeave = () => {
    audioFX.playLeave();
    WebRTCService.getInstance().leaveVoiceChannel();
    resetWebRTC();
    clearMessages();
    leaveRoom();
    setLeaveModalOpen(false);

    // Refresh socket connection for a clean session
    getSocket().disconnect();
    getSocket().connect();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#2b2d31] rounded-2xl border border-white/10 shadow-2xl p-6 overflow-hidden animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-discord-red/10 text-discord-red">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Odadan Ayrıl</h3>
            <p className="text-xs text-discord-muted">Bağlantınız kesilecek</p>
          </div>
        </div>

        <p className="text-xs text-discord-text mb-6">
          Bu odadan ayrılmak istediğinizden emin misiniz? Dilediğiniz zaman oda koduyla tekrar katılabilirsiniz.
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setLeaveModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-discord-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            Vazgeç
          </button>
          <button
            onClick={handleConfirmLeave}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-discord-red hover:bg-discord-red/90 text-white transition-all shadow-md flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Ayrıl
          </button>
        </div>
      </div>
    </div>
  );
};
