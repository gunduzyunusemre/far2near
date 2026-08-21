import React, { useState } from 'react';
import { useRoomStore } from '../../stores/useRoomStore';
import { getSocket } from '../../lib/socket';
import { SocketEvents } from '@far2near/shared-types';
import { X, Lock, Users, Shield, Save, Check } from 'lucide-react';

export const RoomSettingsModal: React.FC = () => {
  const { currentRoom, isSettingsOpen, setSettingsOpen } = useRoomStore();

  const [name, setName] = useState(currentRoom?.settings.name || '');
  const [description, setDescription] = useState(currentRoom?.settings.description || '');
  const [maxParticipants, setMaxParticipants] = useState(currentRoom?.settings.maxParticipants || 25);
  const [isPrivate, setIsPrivate] = useState(currentRoom?.settings.isPrivate || false);
  const [isLocked, setIsLocked] = useState(currentRoom?.settings.isLocked || false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isSettingsOpen || !currentRoom) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    getSocket().emit(
      SocketEvents.ROOM_SETTINGS_UPDATE,
      {
        name: name.trim(),
        description: description.trim(),
        maxParticipants,
        isPrivate,
        isLocked,
      },
      (res: any) => {
        setIsSaving(false);
        if (res && res.success) {
          setSavedSuccess(true);
          setTimeout(() => {
            setSavedSuccess(false);
            setSettingsOpen(false);
          }, 1000);
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#2b2d31] rounded-2xl border border-white/10 shadow-2xl p-6 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-light" />
            <h3 className="text-base font-bold text-white">Oda Ayarları & Moderasyon</h3>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1 rounded-lg text-discord-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-discord-muted mb-1">
              Oda Adı
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#1e1f22] text-white text-xs rounded-xl border border-white/10 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-discord-muted mb-1">
              Açıklama
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Odanız hakkında kısa bilgi"
              className="w-full px-3 py-2 bg-[#1e1f22] text-white text-xs rounded-xl border border-white/10 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-discord-muted mb-1 font-semibold">
              <span>Maksimum Katılımcı Sınırı</span>
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

          <div className="space-y-2 pt-2 border-t border-white/5">
            {/* Private Mode */}
            <div className="flex items-center justify-between p-3 bg-[#1e1f22] rounded-xl border border-white/5">
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-brand-light" />
                  Kapalı Oda (Onaylı Katılım)
                </div>
                <div className="text-[11px] text-discord-muted">
                  Yeni üyeler katılmadan önce yönetici onayı gerekir
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
              />
            </div>

            {/* Lock Room */}
            <div className="flex items-center justify-between p-3 bg-[#1e1f22] rounded-xl border border-white/5">
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-discord-red" />
                  Odayı Kilitle
                </div>
                <div className="text-[11px] text-discord-muted">
                  Hiçbir yeni katılımcı odaya katılamaz
                </div>
              </div>
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-discord-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand text-white hover:bg-brand-hover transition-all flex items-center gap-2 shadow-lg shadow-brand/20"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Kaydedildi</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
