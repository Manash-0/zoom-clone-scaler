'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Clock,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { api, MeetingDetails } from '@/lib/api';
import { useWebRTC } from '@/hooks/useWebRTC';
import VideoTile from '@/components/VideoTile';
import ControlBar from '@/components/ControlBar';
import ParticipantsPanel from '@/components/ParticipantsPanel';
import ChatPanel from '@/components/ChatPanel';
import { copyToClipboard } from '@/lib/utils';
import styles from './page.module.css';

export default function MeetingRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const meetingCode = (params.code as string) || '';
  const urlDisplayName = searchParams.get('name') || '';

  const [hasJoined, setHasJoined] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>(urlDisplayName || 'Guest User');
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails | null>(null);
  const [participantId, setParticipantId] = useState<number | null>(null);

  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Pre-join preview state
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [previewVideoOff, setPreviewVideoOff] = useState(false);

  const {
    localStream,
    isMuted,
    isVideoOn,
    remotePeers,
    chatMessages,
    startCall,
    toggleAudio,
    toggleVideo,
    sendChatMessage,
    kickPeer,
    mutePeer,
    leaveMeeting: webRTCLeave,
  } = useWebRTC(meetingCode, displayName);

  // Load meeting details
  useEffect(() => {
    if (meetingCode) {
      api.getMeetingDetails(meetingCode)
        .then((data) => setMeetingDetails(data))
        .catch(() => {
          alert('Meeting not found or invalid meeting code.');
          router.push('/');
        });
    }
  }, [meetingCode, router]);

  // Pre-join camera preview init
  useEffect(() => {
    if (!hasJoined && typeof navigator !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setPreviewStream(stream);
        })
        .catch((err) => {
          console.warn('Pre-join preview access error:', err);
        });
    }

    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [hasJoined]);

  // Timer clock for active meeting room
  useEffect(() => {
    let interval: any = null;
    if (hasJoined) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hasJoined]);

  const handleJoinNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    // Stop pre-join preview stream
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
    }

    try {
      // Register participant in backend DB
      const p = await api.joinMeeting(meetingCode, {
        display_name: displayName.trim(),
        user_id: 1, // default host ID or guest
        is_muted: previewMuted,
        is_video_on: !previewVideoOff,
      });
      setParticipantId(p.id);
      setHasJoined(true);

      // Start WebRTC connection
      await startCall();
    } catch (err) {
      console.error('Failed to join meeting room:', err);
    }
  };

  const handleLeaveMeeting = async () => {
    webRTCLeave();
    if (participantId) {
      await api.leaveMeeting(meetingCode, participantId).catch(console.error);
    }
    router.push('/');
  };

  const handleCopyCode = async () => {
    const success = await copyToClipboard(meetingCode);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Render Pre-Join Screen if not joined yet
  if (!hasJoined) {
    return (
      <div className={styles.preJoinContainer}>
        <div className={styles.preJoinCard}>
          <div className={styles.preJoinHeader}>
            <h1 className={styles.preJoinTitle}>
              {meetingDetails?.title || 'Ready to join?'}
            </h1>
            <p className={styles.preJoinSubtitle}>
              Meeting ID: {meetingCode}
            </p>
          </div>

          <div className={styles.previewTileWrapper}>
            <VideoTile
              stream={previewStream}
              displayName={displayName || 'You'}
              isLocal={true}
              isMuted={previewMuted}
              isVideoOn={!previewVideoOff}
            />

            <div className={styles.previewControlsOverlay}>
              <button
                className={`${styles.previewToggleBtn} ${previewMuted ? styles.off : ''}`}
                onClick={() => {
                  if (previewStream) {
                    const audio = previewStream.getAudioTracks()[0];
                    if (audio) audio.enabled = !audio.enabled;
                  }
                  setPreviewMuted(!previewMuted);
                }}
                title={previewMuted ? 'Unmute' : 'Mute'}
              >
                {previewMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                className={`${styles.previewToggleBtn} ${previewVideoOff ? styles.off : ''}`}
                onClick={() => {
                  if (previewStream) {
                    const video = previewStream.getVideoTracks()[0];
                    if (video) video.enabled = !video.enabled;
                  }
                  setPreviewVideoOff(!previewVideoOff);
                }}
                title={previewVideoOff ? 'Start Video' : 'Stop Video'}
              >
                {previewVideoOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
              </button>
            </div>
          </div>

          <form onSubmit={handleJoinNow} className={styles.preJoinForm}>
            <div className={styles.inputGroup}>
              <label>Your Display Name</label>
              <input
                type="text"
                placeholder="Enter display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <button type="submit" className={styles.joinNowBtn}>
              Join Meeting
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculate dynamic grid layout class
  const totalTiles = remotePeers.length + 1; // remote + local
  const gridClass =
    totalTiles === 1
      ? styles.grid1
      : totalTiles === 2
      ? styles.grid2
      : totalTiles <= 4
      ? styles.grid4
      : styles.gridMulti;

  return (
    <div className={styles.meetingPageLayout}>
      {/* Top Header */}
      <header className={styles.roomHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.meetingTitle}>
            {meetingDetails?.title || 'Live Video Meeting'}
          </h2>
          <button className={styles.codeChip} onClick={handleCopyCode} title="Copy Meeting Code">
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
            <span>{meetingCode}</span>
          </button>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.timerWidget}>
            <Clock size={15} className={styles.timerIcon} />
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* Center Video Area & Side Panels */}
      <div className={styles.roomMainContent}>
        <div className={`${styles.gridContainer} ${gridClass}`}>
          {/* Local User Tile */}
          <VideoTile
            stream={localStream}
            displayName={displayName}
            isLocal={true}
            isMuted={isMuted}
            isVideoOn={isVideoOn}
            avatarColor="#0E71EB"
          />

          {/* Remote Participants Tiles */}
          {remotePeers.map((peer) => (
            <VideoTile
              key={peer.peerId}
              stream={peer.stream}
              displayName={peer.displayName}
              isLocal={false}
              isMuted={peer.isMuted}
              isVideoOn={peer.isVideoOn}
              avatarColor="#7C3AED"
            />
          ))}
        </div>

        {/* Side Panels */}
        <ParticipantsPanel
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          localDisplayName={displayName}
          isLocalMuted={isMuted}
          isLocalVideoOn={isVideoOn}
          remotePeers={remotePeers}
          onMutePeer={mutePeer}
          onKickPeer={kickPeer}
        />

        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={chatMessages}
          onSendMessage={sendChatMessage}
        />
      </div>

      {/* Bottom Control Bar */}
      <ControlBar
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        participantCount={totalTiles}
        isParticipantsOpen={isParticipantsOpen}
        isChatOpen={isChatOpen}
        meetingCode={meetingCode}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleParticipants={() => {
          setIsParticipantsOpen(!isParticipantsOpen);
          if (isChatOpen) setIsChatOpen(false);
        }}
        onToggleChat={() => {
          setIsChatOpen(!isChatOpen);
          if (isParticipantsOpen) setIsParticipantsOpen(false);
        }}
        onLeaveMeeting={handleLeaveMeeting}
      />
    </div>
  );
}
