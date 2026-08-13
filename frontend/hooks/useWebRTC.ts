'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface RemotePeer {
  peerId: string;
  displayName: string;
  stream?: MediaStream;
  isMuted?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: string;
  isLocal?: boolean;
}

/* ── Free TURN + STUN configuration ── */
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Free Open Relay TURN servers (no signup required)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC(meetingCode: string, displayName: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Use refs for values accessed inside callbacks to avoid stale closures
  const myPeerIdRef = useRef<string>('');
  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef(false);
  const isVideoOnRef = useRef(true);
  const isScreenSharingRef = useRef(false);
  const displayNameRef = useRef(displayName);
  // Track pending ICE candidates for peers whose connections are being set up
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Keep refs in sync with state
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isVideoOnRef.current = isVideoOn; }, [isVideoOn]);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

  // ── Initialize Local Media Stream ──
  const initLocalStream = useCallback(async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        console.warn('Camera/Mic API not available. Falling back to avatar mode.');
        const stream = new MediaStream();
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsVideoOn(false);
        return stream;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn('Failed to access camera/mic:', err);
      const stream = new MediaStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoOn(false);
      return stream;
    }
  }, []);

  // ── Remove a peer ──
  const removePeer = useCallback((peerId: string) => {
    if (peerConnectionsRef.current.has(peerId)) {
      const pc = peerConnectionsRef.current.get(peerId);
      pc?.close();
      peerConnectionsRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);
    setRemotePeers((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  // ── Create RTCPeerConnection for a remote peer ──
  const createPeerConnection = useCallback((targetPeerId: string, peerDisplayName: string) => {
    if (peerConnectionsRef.current.has(targetPeerId)) {
      return peerConnectionsRef.current.get(targetPeerId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

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

    // Handle ICE Candidate — use ref to always read current peerId
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'ice-candidate',
            target_id: targetPeerId,
            sender_id: myPeerIdRef.current,
            candidate: event.candidate.toJSON(),
          })
        );
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state for ${targetPeerId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        // Try ICE restart before giving up
        if (pc.iceConnectionState === 'failed') {
          try {
            pc.restartIce();
          } catch {
            removePeer(targetPeerId);
          }
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${targetPeerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removePeer(targetPeerId);
      }
    };

    peerConnectionsRef.current.set(targetPeerId, pc);

    // Flush any pending ICE candidates that arrived before the connection was ready
    const pending = pendingCandidatesRef.current.get(targetPeerId);
    if (pending && pending.length > 0) {
      pending.forEach((candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      });
      pendingCandidatesRef.current.delete(targetPeerId);
    }

    return pc;
  }, [removePeer]);

  // ── Create offer and send to a peer ──
  const createAndSendOffer = useCallback(async (pc: RTCPeerConnection, targetPeerId: string) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'offer',
            target_id: targetPeerId,
            sender_id: myPeerIdRef.current,
            display_name: displayNameRef.current,
            sdp: pc.localDescription,
          })
        );
      }
    } catch (err) {
      console.error('Failed to create offer:', err);
    }
  }, []);

  // ── Connect WebSocket ──
  const connectWebSocket = useCallback(() => {
    const generatedId = `peer-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    myPeerIdRef.current = generatedId;

    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000') + `/ws/meetings/${meetingCode}`;
    console.log('[WebRTC] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('[WebRTC] WebSocket connected, joining room');
      ws.send(
        JSON.stringify({
          type: 'join',
          peer_id: generatedId,
          display_name: displayNameRef.current,
          is_muted: isMutedRef.current,
          is_video_on: isVideoOnRef.current,
        })
      );
    };

    ws.onmessage = async (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (data.type) {
        case 'room-joined': {
          console.log('[WebRTC] Room joined, existing peers:', data.existing_peers?.length || 0);
          const existingPeers: Array<{ peer_id: string; display_name: string }> = data.existing_peers || [];

          // FIX: Create peer connections AND send offers to all existing peers
          for (const p of existingPeers) {
            setRemotePeers((prev) => {
              const next = new Map(prev);
              next.set(p.peer_id, { peerId: p.peer_id, displayName: p.display_name });
              return next;
            });

            const pc = createPeerConnection(p.peer_id, p.display_name);
            await createAndSendOffer(pc, p.peer_id);
          }
          break;
        }

        case 'peer-joined': {
          const newPeerId = data.peer_id;
          const peerName = data.display_name;
          console.log('[WebRTC] Peer joined:', peerName, newPeerId);

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

          // Create connection and send offer to the new peer
          const pc = createPeerConnection(newPeerId, peerName);
          await createAndSendOffer(pc, newPeerId);
          break;
        }

        case 'offer': {
          const senderId = data.sender_id;
          const senderName = data.display_name || 'Peer';
          console.log('[WebRTC] Received offer from:', senderId);

          const pc = createPeerConnection(senderId, senderName);

          // Only set remote description if we haven't already
          if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
            // Handle glare: if we also sent an offer, the peer with the "higher" ID wins
            if (pc.signalingState === 'have-local-offer') {
              if (myPeerIdRef.current > senderId) {
                // We win the glare — ignore their offer, they'll accept our offer
                console.log('[WebRTC] Glare detected, we win. Ignoring their offer.');
                break;
              }
              // They win — rollback our offer and accept theirs
              console.log('[WebRTC] Glare detected, they win. Rolling back.');
              await pc.setLocalDescription({ type: 'rollback' });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            ws.send(
              JSON.stringify({
                type: 'answer',
                target_id: senderId,
                sender_id: myPeerIdRef.current,
                sdp: pc.localDescription,
              })
            );
          }
          break;
        }

        case 'answer': {
          const senderId = data.sender_id;
          console.log('[WebRTC] Received answer from:', senderId);
          const pc = peerConnectionsRef.current.get(senderId);
          if (pc && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          }
          break;
        }

        case 'ice-candidate': {
          const senderId = data.sender_id;
          const pc = peerConnectionsRef.current.get(senderId);
          if (pc && data.candidate) {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
            } else {
              // Queue candidates until remote description is set
              if (!pendingCandidatesRef.current.has(senderId)) {
                pendingCandidatesRef.current.set(senderId, []);
              }
              pendingCandidatesRef.current.get(senderId)!.push(data.candidate);
            }
          } else if (!pc && data.candidate) {
            // Peer connection not created yet — queue the candidate
            if (!pendingCandidatesRef.current.has(senderId)) {
              pendingCandidatesRef.current.set(senderId, []);
            }
            pendingCandidatesRef.current.get(senderId)!.push(data.candidate);
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
                isScreenSharing: data.is_screen_sharing,
              });
            }
            return next;
          });
          break;
        }

        case 'chat-message': {
          // Don't add our own messages again — we already added them locally
          if (data.sender_id === myPeerIdRef.current) break;

          setChatMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              senderName: data.sender_name,
              text: data.text,
              timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isLocal: false,
            },
          ]);
          break;
        }

        case 'peer-left': {
          console.log('[WebRTC] Peer left:', data.peer_id);
          removePeer(data.peer_id);
          break;
        }

        case 'host-action': {
          if (data.action === 'kick' && data.target_id === myPeerIdRef.current) {
            alert('You have been removed from the meeting by the host.');
            window.location.href = '/';
          } else if (data.action === 'mute' && data.target_id === myPeerIdRef.current) {
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
      console.log('[WebRTC] WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('[WebRTC] WebSocket error:', err);
    };

    // Keep-alive ping every 30s to prevent Render free tier from killing the connection
    const keepAlive = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(keepAlive);
  }, [meetingCode, createPeerConnection, createAndSendOffer, removePeer]);

  // ── Start Call ──
  const startCall = useCallback(async () => {
    await initLocalStream();
    connectWebSocket();
  }, [initLocalStream, connectWebSocket]);

  // ── Toggle Audio ──
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMutedState = !audioTrack.enabled;
        setIsMuted(newMutedState);

        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'media-state',
              sender_id: myPeerIdRef.current,
              is_muted: newMutedState,
              is_video_on: isVideoOnRef.current,
              is_screen_sharing: isScreenSharingRef.current,
            })
          );
        }
      }
    }
  }, []);

  // ── Toggle Video ──
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoState = videoTrack.enabled;
        setIsVideoOn(newVideoState);

        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'media-state',
              sender_id: myPeerIdRef.current,
              is_muted: isMutedRef.current,
              is_video_on: newVideoState,
              is_screen_sharing: isScreenSharingRef.current,
            })
          );
        }
      }
    }
  }, []);

  // ── Start Screen Share ──
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false,
      });

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];

      // Replace video track on all peer connections with screen share track
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Broadcast screen share state
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'media-state',
            sender_id: myPeerIdRef.current,
            is_muted: isMutedRef.current,
            is_video_on: isVideoOnRef.current,
            is_screen_sharing: true,
          })
        );
      }

      // Handle user stopping screen share via browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
    }
  }, []);

  // ── Stop Screen Share ──
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);

    // Replace screen track back with camera video track on all peer connections
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (cameraTrack) {
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(cameraTrack);
        }
      });
    }

    // Broadcast screen share stopped
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'media-state',
          sender_id: myPeerIdRef.current,
          is_muted: isMutedRef.current,
          is_video_on: isVideoOnRef.current,
          is_screen_sharing: false,
        })
      );
    }
  }, []);

  // ── Send Chat Message ──
  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim() || !socketRef.current) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = {
      type: 'chat-message',
      sender_id: myPeerIdRef.current,
      sender_name: displayNameRef.current,
      text: text.trim(),
      timestamp,
    };
    socketRef.current.send(JSON.stringify(msg));

    // FIX: Add message to local state immediately so the sender sees it
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        senderName: displayNameRef.current,
        text: text.trim(),
        timestamp,
        isLocal: true,
      },
    ]);
  }, []);

  // ── Host Actions ──
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

  // ── Leave Meeting ──
  const leaveMeeting = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

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
    screenStream,
    isMuted,
    isVideoOn,
    isScreenSharing,
    remotePeers: Array.from(remotePeers.values()),
    chatMessages,
    isConnected,
    myPeerId: myPeerIdRef.current,
    startCall,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    kickPeer,
    mutePeer,
    leaveMeeting,
  };
}
