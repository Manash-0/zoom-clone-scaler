'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface RemotePeer {
  peerId: string;
  displayName: string;
  stream?: MediaStream;
  isMuted?: boolean;
  isVideoOn?: boolean;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: string;
  isLocal?: boolean;
}

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(meetingCode: string, displayName: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [myPeerId, setMyPeerId] = useState<string>('');

  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize Local Media Stream
  const initLocalStream = useCallback(async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        console.warn('Camera/Microphone API not available (browser restricts HTTP LAN origins). Falling back to avatar mode.');
        const stream = new MediaStream();
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsVideoOn(false);
        return stream;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn('Failed to access camera/mic, falling back to dummy/audio stream:', err);
      // Fallback: create empty media stream or handle permission denied
      const stream = new MediaStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoOn(false);
      return stream;
    }
  }, []);

  // Create RTCPeerConnection for a remote peer
  const createPeerConnection = useCallback((targetPeerId: string, peerDisplayName: string) => {
    if (peerConnectionsRef.current.has(targetPeerId)) {
      return peerConnectionsRef.current.get(targetPeerId)!;
    }

    const pc = new RTCPeerConnection(STUN_SERVERS);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote track
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      setRemotePeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetPeerId) || {
          peerId: targetPeerId,
          displayName: peerDisplayName,
        };
        next.set(targetPeerId, {
          ...existing,
          stream: remoteStream,
        });
        return next;
      });
    };

    // Handle ICE Candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'ice-candidate',
            target_id: targetPeerId,
            sender_id: myPeerId,
            candidate: event.candidate,
          })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        removePeer(targetPeerId);
      }
    };

    peerConnectionsRef.current.set(targetPeerId, pc);
    return pc;
  }, [myPeerId]);

  const removePeer = useCallback((peerId: string) => {
    if (peerConnectionsRef.current.has(peerId)) {
      const pc = peerConnectionsRef.current.get(peerId);
      pc?.close();
      peerConnectionsRef.current.delete(peerId);
    }
    setRemotePeers((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  // Connect WebSocket
  const connectWebSocket = useCallback((stream: MediaStream) => {
    const generatedId = `peer-${Math.random().toString(36).substring(2, 9)}`;
    setMyPeerId(generatedId);

    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000') + `/ws/meetings/${meetingCode}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Join room signal
      ws.send(
        JSON.stringify({
          type: 'join',
          peer_id: generatedId,
          display_name: displayName,
          is_muted: isMuted,
          is_video_on: isVideoOn,
        })
      );
    };

    ws.onmessage = async (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      switch (data.type) {
        case 'room-joined': {
          const existingPeers: Array<{ peer_id: string; display_name: string }> = data.existing_peers || [];
          existingPeers.forEach((p) => {
            setRemotePeers((prev) => {
              const next = new Map(prev);
              next.set(p.peer_id, { peerId: p.peer_id, displayName: p.display_name });
              return next;
            });
          });
          break;
        }

        case 'peer-joined': {
          const newPeerId = data.peer_id;
          const peerName = data.display_name;
          setRemotePeers((prev) => {
            const next = new Map(prev);
            next.set(newPeerId, {
              peerId: newPeerId,
              displayName: peerName,
              isMuted: data.is_muted,
              isVideoOn: data.is_video_on,
            });
            return next;
          });

          // Initiate SDP Offer to newly joined peer
          const pc = createPeerConnection(newPeerId, peerName);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          ws.send(
            JSON.stringify({
              type: 'offer',
              target_id: newPeerId,
              sender_id: generatedId,
              sdp: offer,
            })
          );
          break;
        }

        case 'offer': {
          const senderId = data.sender_id;
          const pc = createPeerConnection(senderId, 'Peer');
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          ws.send(
            JSON.stringify({
              type: 'answer',
              target_id: senderId,
              sender_id: generatedId,
              sdp: answer,
            })
          );
          break;
        }

        case 'answer': {
          const senderId = data.sender_id;
          const pc = peerConnectionsRef.current.get(senderId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          }
          break;
        }

        case 'ice-candidate': {
          const senderId = data.sender_id;
          const pc = peerConnectionsRef.current.get(senderId);
          if (pc && data.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
          break;
        }

        case 'media-state': {
          const senderId = data.sender_id;
          setRemotePeers((prev) => {
            const next = new Map(prev);
            const existing = next.get(senderId);
            if (existing) {
              next.set(senderId, {
                ...existing,
                isMuted: data.is_muted,
                isVideoOn: data.is_video_on,
              });
            }
            return next;
          });
          break;
        }

        case 'chat-message': {
          setChatMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              senderName: data.sender_name,
              text: data.text,
              timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isLocal: data.sender_id === generatedId,
            },
          ]);
          break;
        }

        case 'peer-left': {
          removePeer(data.peer_id);
          break;
        }

        case 'host-action': {
          if (data.action === 'kick' && data.target_id === generatedId) {
            alert('You have been removed from the meeting by the host.');
            window.location.href = '/';
          } else if (data.action === 'mute' && data.target_id === generatedId) {
            // Mute local microphone
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach((track) => (track.enabled = false));
              setIsMuted(true);
            }
          }
          break;
        }
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };
  }, [displayName, isMuted, isVideoOn, meetingCode, createPeerConnection, removePeer]);

  // Start Call
  const startCall = useCallback(async () => {
    const stream = await initLocalStream();
    connectWebSocket(stream);
  }, [initLocalStream, connectWebSocket]);

  // Toggle Audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMutedState = !audioTrack.enabled;
        setIsMuted(newMutedState);

        // Broadcast state
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'media-state',
              sender_id: myPeerId,
              is_muted: newMutedState,
              is_video_on: isVideoOn,
            })
          );
        }
      }
    }
  }, [myPeerId, isVideoOn]);

  // Toggle Video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoState = videoTrack.enabled;
        setIsVideoOn(newVideoState);

        // Broadcast state
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'media-state',
              sender_id: myPeerId,
              is_muted: isMuted,
              is_video_on: newVideoState,
            })
          );
        }
      }
    }
  }, [myPeerId, isMuted]);

  // Send Chat Message
  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim() || !socketRef.current) return;
    const msg = {
      type: 'chat-message',
      sender_id: myPeerId,
      sender_name: displayName,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    socketRef.current.send(JSON.stringify(msg));
  }, [displayName, myPeerId]);

  // Host Action: Kick Peer
  const kickPeer = useCallback((targetPeerId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'host-action',
          action: 'kick',
          target_id: targetPeerId,
        })
      );
    }
  }, []);

  // Host Action: Mute Peer
  const mutePeer = useCallback((targetPeerId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'host-action',
          action: 'mute',
          target_id: targetPeerId,
        })
      );
    }
  }, []);

  // Leave Meeting
  const leaveMeeting = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    if (socketRef.current) {
      socketRef.current.close();
    }
  }, []);

  useEffect(() => {
    return () => {
      leaveMeeting();
    };
  }, [leaveMeeting]);

  return {
    localStream,
    isMuted,
    isVideoOn,
    remotePeers: Array.from(remotePeers.values()),
    chatMessages,
    isConnected,
    myPeerId,
    startCall,
    toggleAudio,
    toggleVideo,
    sendChatMessage,
    kickPeer,
    mutePeer,
    leaveMeeting,
  };
}
