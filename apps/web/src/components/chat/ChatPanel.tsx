import React, { useState, useRef, useEffect } from 'react';
import { useRoomStore } from '../../stores/useRoomStore';
import { useChatStore } from '../../stores/useChatStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getSocket } from '../../lib/socket';
import { renderSafeMarkdown } from '../../lib/markdown';
import { audioFX } from '../../lib/audioFX';
import {
  SocketEvents,
  ChatMessage,
  UserRole,
  PermissionFlags,
  hasPermission,
} from '@far2near/shared-types';
import {
  Hash,
  Send,
  Smile,
  Paperclip,
  Reply,
  Trash2,
  Edit2,
  X,
  FileText,
  Download,
  Image as ImageIcon,
  Check,
  CornerDownRight,
  MoreVertical,
} from 'lucide-react';

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🚀', '🎉', '👏', '👀', '💯', '✨'];

export const ChatPanel: React.FC = () => {
  const { currentRoom, currentUser, channels, activeChannelId } = useRoomStore();
  const {
    messages,
    typingUsers,
    replyingTo,
    setReplyingTo,
  } = useChatStore();
  const { nickname } = useAuthStore();

  const [inputContent, setInputContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachments, setAttachments] = useState<{ id: string; name: string; size: number; type: string; url: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const channelMessages = messages.filter((m) => m.channelId === activeChannelId);
  const channelTyping = typingUsers.filter((u) => u.channelId === activeChannelId && u.nickname !== nickname);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputContent(e.target.value);

    const socket = getSocket();
    socket.emit(SocketEvents.CHAT_TYPING_START, { channelId: activeChannelId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit(SocketEvents.CHAT_TYPING_STOP, { channelId: activeChannelId });
    }, 2000);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim() && attachments.length === 0) return;

    const socket = getSocket();
    socket.emit(
      SocketEvents.CHAT_SEND_MESSAGE,
      {
        channelId: activeChannelId,
        content: inputContent.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
        replyToId: replyingTo ? replyingTo.id : undefined,
      },
      (res: any) => {
        if (res && res.success) {
          audioFX.playMessage();
          setInputContent('');
          setAttachments([]);
          setReplyingTo(null);
          setShowEmojiPicker(false);
        }
      }
    );

    socket.emit(SocketEvents.CHAT_TYPING_STOP, { channelId: activeChannelId });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        alert(`${file.name} 25MB sınırını aşıyor.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Url = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: base64Url,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReaction = (messageId: string, emoji: string) => {
    getSocket().emit(SocketEvents.CHAT_ADD_REACTION, { messageId, emoji });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Bu mesajı silmek istediğinizden emin misiniz?')) {
      getSocket().emit(SocketEvents.CHAT_DELETE_MESSAGE, { messageId });
    }
  };

  const handleSaveEdit = (messageId: string) => {
    if (!editContent.trim()) return;
    getSocket().emit(SocketEvents.CHAT_EDIT_MESSAGE, { messageId, content: editContent.trim() });
    setEditingMessageId(null);
    setEditContent('');
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="flex-1 h-full bg-[#313338] flex flex-col min-w-0 overflow-hidden relative">
      {/* Channel Header */}
      <div className="h-14 px-4 border-b border-[#1f2023] flex items-center justify-between shadow-sm bg-[#313338] z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="w-5 h-5 text-discord-muted" />
          <h3 className="text-sm font-bold text-white truncate">
            {activeChannel?.name || 'genel-sohbet'}
          </h3>
          {activeChannel?.description && (
            <>
              <span className="text-discord-muted">|</span>
              <span className="text-xs text-discord-muted truncate">
                {activeChannel.description}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome Channel Banner */}
        <div className="py-6 border-b border-white/5 space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[#2b2d31] flex items-center justify-center mb-2">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">
            #{activeChannel?.name || 'genel-sohbet'} kanalına hoş geldiniz!
          </h2>
          <p className="text-xs text-discord-muted">
            Bu, #{activeChannel?.name} kanalının başlangıcıdır.
          </p>
        </div>

        {/* Message Items */}
        {channelMessages.map((msg, index) => {
          const isOwn = msg.senderId === currentUser?.id;
          const canManage = hasPermission(
            currentUser?.permissions || 0,
            PermissionFlags.MANAGE_MESSAGES
          );
          const isEditing = editingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className="group relative flex gap-3 p-1.5 -mx-1.5 rounded-lg hover:bg-[#2b2d31]/50 transition-colors animate-fade-in"
            >
              {/* Avatar */}
              <img
                src={msg.senderAvatar}
                alt={msg.senderName}
                className="w-10 h-10 rounded-full bg-[#2b2d31] object-cover shrink-0 mt-0.5"
              />

              {/* Message Body */}
              <div className="flex-1 min-w-0">
                {/* Reply To Reference (if any) */}
                {msg.replyTo && (
                  <div className="flex items-center gap-1 text-[11px] text-discord-muted mb-1">
                    <CornerDownRight className="w-3.5 h-3.5 text-brand-light" />
                    <span className="font-semibold text-brand-light">@{msg.replyTo.senderName}</span>
                    <span className="truncate italic">"{msg.replyTo.content}"</span>
                  </div>
                )}

                {/* Author & Timestamp */}
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-white hover:underline cursor-pointer">
                    {msg.senderName}
                  </span>
                  {msg.senderRole === UserRole.OWNER && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium">
                      👑 Kurucu
                    </span>
                  )}
                  {msg.senderRole === UserRole.ADMIN && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                      🛡️ Admin
                    </span>
                  )}
                  <span className="text-[10px] text-discord-muted">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                  {msg.editedAt && (
                    <span className="text-[9px] text-discord-muted italic">(düzenlendi)</span>
                  )}
                </div>

                {/* Content / Edit input */}
                {isEditing ? (
                  <div className="mt-1 space-y-1.5">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(msg.id);
                        if (e.key === 'Escape') setEditingMessageId(null);
                      }}
                      className="w-full px-3 py-1.5 bg-[#1e1f22] text-white rounded-md text-xs border border-brand focus:outline-none"
                      autoFocus
                    />
                    <div className="text-[10px] text-discord-muted flex gap-2">
                      <span>kaydetmek için <strong className="text-white">Enter</strong></span>
                      <span>iptal etmek için <strong className="text-white">Esc</strong></span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-xs text-[#dbdee1] markdown-body"
                    dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(msg.content) }}
                  />
                )}

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.attachments.map((att) => {
                      const isImage = att.type.startsWith('image/');
                      return (
                        <div key={att.id} className="rounded-lg overflow-hidden border border-white/10 bg-[#202225] max-w-sm">
                          {isImage ? (
                            <a href={att.url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={att.url}
                                alt={att.name}
                                className="max-h-60 max-w-full object-contain rounded hover:opacity-90 transition-opacity"
                              />
                            </a>
                          ) : (
                            <div className="p-3 flex items-center gap-3">
                              <FileText className="w-8 h-8 text-brand-light shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-white truncate">{att.name}</div>
                                <div className="text-[10px] text-discord-muted">{formatFileSize(att.size)}</div>
                              </div>
                              <a
                                href={att.url}
                                download={att.name}
                                className="p-1.5 rounded bg-brand text-white hover:bg-brand-hover transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {msg.reactions.map((r, i) => {
                      const hasReacted = r.userIds.includes(currentUser?.id || '');
                      return (
                        <button
                          key={i}
                          onClick={() => handleReaction(msg.id, r.emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${
                            hasReacted
                              ? 'bg-brand/20 border-brand/50 text-brand-light'
                              : 'bg-[#2b2d31] border-white/5 text-discord-muted hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span className="text-[11px]">{r.userIds.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Floating Action Menu on Hover */}
              <div className="absolute right-3 -top-3 hidden group-hover:flex items-center bg-[#2b2d31] border border-white/10 rounded-md shadow-md p-0.5 gap-0.5 z-10 animate-fade-in">
                {COMMON_EMOJIS.slice(0, 3).map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(msg.id, emoji)}
                    className="p-1 rounded hover:bg-[#35373c] text-xs transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}

                <button
                  onClick={() => setReplyingTo(msg)}
                  title="Yanıtla"
                  className="p-1 rounded text-discord-muted hover:text-white hover:bg-[#35373c] transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>

                {isOwn && (
                  <button
                    onClick={() => {
                      setEditingMessageId(msg.id);
                      setEditContent(msg.content);
                    }}
                    title="Düzenle"
                    className="p-1 rounded text-discord-muted hover:text-white hover:bg-[#35373c] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {(isOwn || canManage) && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    title="Sil"
                    className="p-1 rounded text-discord-muted hover:text-discord-red hover:bg-[#35373c] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {channelTyping.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-discord-muted flex items-center gap-1.5 animate-fade-in">
          <span className="inline-flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-light animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-light animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-light animate-bounce [animation-delay:0.4s]" />
          </span>
          <span>
            {channelTyping.map((u) => u.nickname).join(', ')} yazıyor...
          </span>
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[#2b2d31] border-t border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <Reply className="w-4 h-4 text-brand-light shrink-0" />
            <span className="text-discord-muted">Yanıtlanan:</span>
            <span className="font-semibold text-white">@{replyingTo.senderName}</span>
            <span className="text-discord-muted truncate italic">"{replyingTo.content}"</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded hover:bg-[#35373c] text-discord-muted hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment previews before send */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-[#2b2d31] border-t border-white/5 flex gap-2 overflow-x-auto">
          {attachments.map((att, idx) => (
            <div key={att.id} className="relative group bg-[#1e1f22] p-1.5 rounded-lg flex items-center gap-2 text-xs border border-white/10">
              <ImageIcon className="w-4 h-4 text-brand-light" />
              <span className="truncate max-w-[120px]">{att.name}</span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className="text-discord-red hover:bg-discord-red/10 p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message Input Box */}
      <div className="px-4 pb-4 pt-1 relative">
        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 right-4 glass-dropdown p-3 rounded-2xl grid grid-cols-5 gap-2 z-20 animate-slide-up shadow-2xl">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputContent((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-lg hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="relative flex items-center bg-[#383a40] rounded-xl px-3 py-2 border border-white/5 focus-within:border-brand/50 transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Dosya Ekle (Max 25MB)"
            className="p-1.5 rounded-full text-discord-muted hover:text-white hover:bg-[#2b2d31] transition-colors shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <textarea
            ref={inputRef}
            rows={1}
            value={inputContent}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`#${activeChannel?.name || 'genel-sohbet'} kanalına mesaj gönder...`}
            className="flex-1 bg-transparent text-white text-xs px-3 focus:outline-none resize-none max-h-32 placeholder:text-discord-muted"
          />

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="p-1.5 rounded-full text-discord-muted hover:text-amber-400 hover:bg-[#2b2d31] transition-colors"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!inputContent.trim() && attachments.length === 0}
              className="p-1.5 rounded-full bg-brand text-white hover:bg-brand-hover disabled:opacity-30 disabled:hover:bg-brand transition-all shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
