import { WebRTCSignalData, SocketEvents } from '@far2near/shared-types';
import { getSocket } from './socket';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

export interface PeerConnectionInfo {
  peerSocketId: string;
  peerUserId: string;
  connection: RTCPeerConnection;
  remoteStream: MediaStream;
}

export class WebRTCService {
  private static instance: WebRTCService;
  private localAudioStream: MediaStream | null = null;
  private localVideoStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private peerConnections: Map<string, PeerConnectionInfo> = new Map();
  private currentVoiceChannelId: string | null = null;

  // Audio Analyser for VAD
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadInterval: number | null = null;
  private isCurrentlySpeaking: boolean = false;
  private onSpeakingChangeCallbacks: Set<(isSpeaking: boolean) => void> = new Set();
  private onRemoteStreamCallbacks: Set<(peerSocketId: string, stream: MediaStream) => void> = new Set();
  private onPeerDisconnectCallbacks: Set<(peerSocketId: string) => void> = new Set();

  private constructor() {
    this.setupSocketListeners();
  }

  public static getInstance(): WebRTCService {
    if (!WebRTCService.instance) {
      WebRTCService.instance = new WebRTCService();
    }
    return WebRTCService.instance;
  }

  private setupSocketListeners() {
    const socket = getSocket();

    socket.on(SocketEvents.WEBRTC_SIGNAL, async (data: {
      senderSocketId: string;
      senderUserId: string;
      channelId: string;
      signal: WebRTCSignalData;
    }) => {
      if (data.channelId !== this.currentVoiceChannelId) return;

      const { senderSocketId, senderUserId, signal } = data;

      if (signal.type === 'offer') {
        const peer = this.getOrCreatePeerConnection(senderSocketId, senderUserId);
        if (signal.sdp) {
          try {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const answer = await peer.connection.createAnswer();
            await peer.connection.setLocalDescription(answer);

            socket.emit(SocketEvents.WEBRTC_SIGNAL, {
              targetSocketId: senderSocketId,
              channelId: this.currentVoiceChannelId,
              signal: { type: 'answer', sdp: answer },
            });
          } catch (err) {
            console.warn('Error handling offer:', err);
          }
        }
      } else if (signal.type === 'answer') {
        const peer = this.peerConnections.get(senderSocketId);
        if (peer && signal.sdp) {
          try {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } catch (err) {
            console.warn('Error handling answer:', err);
          }
        }
      } else if (signal.type === 'candidate') {
        const peer = this.peerConnections.get(senderSocketId);
        if (peer && signal.candidate) {
          try {
            await peer.connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.warn('Error adding ICE candidate:', e);
          }
        }
      }
    });

    socket.on(SocketEvents.VOICE_PEER_JOINED, async (data: { socketId: string; userId: string; channelId: string }) => {
      if (data.channelId === this.currentVoiceChannelId && data.socketId !== socket.id) {
        await this.initiateCall(data.socketId, data.userId);
      }
    });

    socket.on(SocketEvents.VOICE_PEER_LEFT, (data: { socketId: string }) => {
      this.closePeerConnection(data.socketId);
    });
  }

  public async joinVoiceChannel(channelId: string, peers: { socketId: string; userId: string }[]): Promise<MediaStream | null> {
    this.currentVoiceChannelId = channelId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.localAudioStream = stream;
      this.setupVAD(stream);
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
    }

    for (const peer of peers) {
      await this.initiateCall(peer.socketId, peer.userId);
    }

    return this.localAudioStream;
  }

  private async initiateCall(targetSocketId: string, targetUserId: string) {
    const peer = this.getOrCreatePeerConnection(targetSocketId, targetUserId);
    try {
      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);

      const socket = getSocket();
      socket.emit(SocketEvents.WEBRTC_SIGNAL, {
        targetSocketId,
        channelId: this.currentVoiceChannelId,
        signal: { type: 'offer', sdp: offer },
      });
    } catch (err) {
      console.warn('Error creating offer:', err);
    }
  }

  private getOrCreatePeerConnection(peerSocketId: string, peerUserId: string): PeerConnectionInfo {
    let peer = this.peerConnections.get(peerSocketId);
    if (peer) return peer;

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const remoteStream = new MediaStream();

    // Attach local audio track if available
    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach((track) => {
        connection.addTrack(track, this.localAudioStream!);
      });
    }

    // Attach local active video track (screen share has priority over camera)
    const activeVideoTrack =
      this.localScreenStream?.getVideoTracks()[0] || this.localVideoStream?.getVideoTracks()[0];
    if (activeVideoTrack) {
      const parentStream = this.localScreenStream || this.localVideoStream;
      if (parentStream) connection.addTrack(activeVideoTrack, parentStream);
    }

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        getSocket().emit(SocketEvents.WEBRTC_SIGNAL, {
          targetSocketId: peerSocketId,
          channelId: this.currentVoiceChannelId,
          signal: { type: 'candidate', candidate: event.candidate.toJSON() },
        });
      }
    };

    connection.ontrack = (event) => {
      if (event.track) {
        const existingTrack = remoteStream.getTracks().find((t) => t.id === event.track.id);
        if (!existingTrack) {
          remoteStream.addTrack(event.track);
        }
      }
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
            remoteStream.addTrack(track);
          }
        });
      }

      // Notify with clone so React detects change
      const newStream = new MediaStream(remoteStream.getTracks());
      this.onRemoteStreamCallbacks.forEach((cb) => cb(peerSocketId, newStream));
    };

    connection.onconnectionstatechange = () => {
      if (
        connection.connectionState === 'disconnected' ||
        connection.connectionState === 'failed' ||
        connection.connectionState === 'closed'
      ) {
        this.closePeerConnection(peerSocketId);
      }
    };

    peer = { peerSocketId, peerUserId, connection, remoteStream };
    this.peerConnections.set(peerSocketId, peer);
    return peer;
  }

  public async toggleMicrophone(isMuted: boolean) {
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }

  public async toggleCamera(enable: boolean): Promise<MediaStream | null> {
    if (enable) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false,
        });
        this.localVideoStream = stream;
        const videoTrack = stream.getVideoTracks()[0];

        for (const peer of this.peerConnections.values()) {
          const videoSender = peer.connection.getSenders().find((s) => s.track?.kind === 'video');
          if (videoSender) {
            if (!this.localScreenStream) {
              await videoSender.replaceTrack(videoTrack);
            }
          } else {
            peer.connection.addTrack(videoTrack, stream);
          }
        }

        await this.renegotiateAll();
        return stream;
      } catch (err) {
        console.error('Camera access error:', err);
        return null;
      }
    } else {
      if (this.localVideoStream) {
        const track = this.localVideoStream.getVideoTracks()[0];
        if (track) track.stop();

        for (const peer of this.peerConnections.values()) {
          const videoSender = peer.connection.getSenders().find((s) => s.track === track || s.track?.kind === 'video');
          if (videoSender && !this.localScreenStream) {
            try {
              peer.connection.removeTrack(videoSender);
            } catch {}
          }
        }

        this.localVideoStream = null;
        await this.renegotiateAll();
      }
      return null;
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      this.localScreenStream = stream;
      const screenTrack = stream.getVideoTracks()[0];
      screenTrack.contentHint = 'detail';

      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      for (const peer of this.peerConnections.values()) {
        const videoSender = peer.connection.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          peer.connection.addTrack(screenTrack, stream);
        }
      }

      await this.renegotiateAll();
      return stream;
    } catch (err) {
      console.error('Screen sharing error:', err);
      return null;
    }
  }

  public async stopScreenShare() {
    if (this.localScreenStream) {
      const track = this.localScreenStream.getVideoTracks()[0];
      if (track) track.stop();

      for (const peer of this.peerConnections.values()) {
        const videoSender = peer.connection.getSenders().find((s) => s.track === track || s.track?.kind === 'video');
        if (videoSender) {
          if (this.localVideoStream) {
            const camTrack = this.localVideoStream.getVideoTracks()[0];
            await videoSender.replaceTrack(camTrack || null);
          } else {
            try {
              peer.connection.removeTrack(videoSender);
            } catch {}
          }
        }
      }

      this.localScreenStream = null;
      await this.renegotiateAll();
    }
  }

  private async renegotiateAll() {
    for (const peer of this.peerConnections.values()) {
      try {
        const offer = await peer.connection.createOffer();
        await peer.connection.setLocalDescription(offer);
        getSocket().emit(SocketEvents.WEBRTC_SIGNAL, {
          targetSocketId: peer.peerSocketId,
          channelId: this.currentVoiceChannelId,
          signal: { type: 'offer', sdp: offer },
        });
      } catch (err) {
        console.warn('Renegotiation failed for peer:', peer.peerSocketId, err);
      }
    }
  }

  private setupVAD(stream: MediaStream) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.vadInterval = window.setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const speakingThreshold = 18;

        const isSpeaking = average > speakingThreshold;
        if (isSpeaking !== this.isCurrentlySpeaking) {
          this.isCurrentlySpeaking = isSpeaking;
          this.onSpeakingChangeCallbacks.forEach((cb) => cb(isSpeaking));

          getSocket().emit(SocketEvents.MEDIA_STATE_CHANGE, {
            isSpeaking,
          });
        }
      }, 100);
    } catch (e) {
      console.warn('VAD setup failed:', e);
    }
  }

  public leaveVoiceChannel() {
    this.currentVoiceChannelId = null;

    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }

    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach((track) => track.stop());
      this.localAudioStream = null;
    }

    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach((track) => track.stop());
      this.localVideoStream = null;
    }

    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((track) => track.stop());
      this.localScreenStream = null;
    }

    this.peerConnections.forEach((peer) => {
      peer.connection.close();
    });
    this.peerConnections.clear();
  }

  private closePeerConnection(socketId: string) {
    const peer = this.peerConnections.get(socketId);
    if (peer) {
      peer.connection.close();
      this.peerConnections.delete(socketId);
      this.onPeerDisconnectCallbacks.forEach((cb) => cb(socketId));
    }
  }

  public onSpeakingChange(cb: (isSpeaking: boolean) => void) {
    this.onSpeakingChangeCallbacks.add(cb);
    return () => this.onSpeakingChangeCallbacks.delete(cb);
  }

  public onRemoteStream(cb: (peerSocketId: string, stream: MediaStream) => void) {
    this.onRemoteStreamCallbacks.add(cb);
    return () => this.onRemoteStreamCallbacks.delete(cb);
  }

  public onPeerDisconnect(cb: (peerSocketId: string) => void) {
    this.onPeerDisconnectCallbacks.add(cb);
    return () => this.onPeerDisconnectCallbacks.delete(cb);
  }

  public getLocalAudioStream() {
    return this.localAudioStream;
  }

  public getLocalVideoStream() {
    return this.localVideoStream;
  }

  public getLocalScreenStream() {
    return this.localScreenStream;
  }

  public getPeerStream(socketId: string): MediaStream | undefined {
    return this.peerConnections.get(socketId)?.remoteStream;
  }
}
