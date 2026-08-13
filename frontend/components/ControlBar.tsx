'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  MessageSquare,
  UserPlus,
  PhoneOff,
  Check,
  Copy,
} from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import styles from './ControlBar.module.css';

interface ControlBarProps {
  isMuted: boolean;
  isVideoOn: boolean;
  participantCount: number;
  isParticipantsOpen: boolean;
  isChatOpen: boolean;
  meetingCode: string;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onLeaveMeeting: () => void;
}

export default function ControlBar({
  isMuted,
  isVideoOn,
  participantCount,
  isParticipantsOpen,
  isChatOpen,
  meetingCode,
  onToggleAudio,
  onToggleVideo,
  onToggleParticipants,
  onToggleChat,
  onLeaveMeeting,
}: ControlBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareableUrl = `${origin}/meeting/${meetingCode}`;
    const success = await copyToClipboard(shareableUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <footer className={styles.controlBar}>
      <div className={styles.leftGroup}>
        <button
          className={`${styles.controlBtn} ${isMuted ? styles.danger : ''}`}
          onClick={onToggleAudio}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          <span className={styles.btnLabel}>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          className={`${styles.controlBtn} ${!isVideoOn ? styles.danger : ''}`}
          onClick={onToggleVideo}
          title={isVideoOn ? 'Stop Video' : 'Start Video'}
        >
          {!isVideoOn ? <VideoOff size={20} /> : <Video size={20} />}
          <span className={styles.btnLabel}>
            {!isVideoOn ? 'Start Video' : 'Stop Video'}
          </span>
        </button>
      </div>

      <div className={styles.centerGroup}>
        <button
          className={`${styles.controlBtn} ${
            isParticipantsOpen ? styles.active : ''
          }`}
          onClick={onToggleParticipants}
          title="Participants"
        >
          <div className={styles.iconWithBadge}>
            <Users size={20} />
            <span className={styles.badge}>{participantCount}</span>
          </div>
          <span className={styles.btnLabel}>Participants</span>
        </button>

        <button
          className={`${styles.controlBtn} ${isChatOpen ? styles.active : ''}`}
          onClick={onToggleChat}
          title="In-meeting Chat"
        >
          <MessageSquare size={20} />
          <span className={styles.btnLabel}>Chat</span>
        </button>

        <button className={styles.controlBtn} onClick={handleCopyLink} title="Invite">
          {copied ? <Check size={20} className={styles.successIcon} /> : <UserPlus size={20} />}
          <span className={styles.btnLabel}>{copied ? 'Copied Link' : 'Invite'}</span>
        </button>
      </div>

      <div className={styles.rightGroup}>
        <button className={styles.leaveBtn} onClick={onLeaveMeeting}>
          <PhoneOff size={18} />
          <span>Leave</span>
        </button>
      </div>
    </footer>
  );
}
