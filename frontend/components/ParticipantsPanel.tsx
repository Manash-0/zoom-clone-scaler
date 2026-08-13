'use client';

import React from 'react';
import { X, Mic, MicOff, Video, VideoOff, Shield, UserX } from 'lucide-react';
import { RemotePeer } from '@/hooks/useWebRTC';
import { getAvatarInitials } from '@/lib/utils';
import styles from './ParticipantsPanel.module.css';

interface ParticipantsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  localDisplayName: string;
  isLocalMuted: boolean;
  isLocalVideoOn: boolean;
  remotePeers: RemotePeer[];
  onMutePeer?: (peerId: string) => void;
  onKickPeer?: (peerId: string) => void;
}

export default function ParticipantsPanel({
  isOpen,
  onClose,
  localDisplayName,
  isLocalMuted,
  isLocalVideoOn,
  remotePeers,
  onMutePeer,
  onKickPeer,
}: ParticipantsPanelProps) {
  if (!isOpen) return null;

  const totalCount = remotePeers.length + 1;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Participants ({totalCount})</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className={styles.participantList}>
        {/* Local Host Participant */}
        <div className={styles.participantItem}>
          <div className={styles.leftInfo}>
            <div className={styles.avatar} style={{ backgroundColor: '#0E71EB' }}>
              {getAvatarInitials(localDisplayName)}
            </div>
            <div className={styles.nameGroup}>
              <span className={styles.displayName}>{localDisplayName} (You)</span>
              <span className={styles.roleBadge}>
                <Shield size={12} /> Host
              </span>
            </div>
          </div>

          <div className={styles.statusIcons}>
            {isLocalMuted ? (
              <MicOff size={16} className={styles.mutedIcon} />
            ) : (
              <Mic size={16} className={styles.activeIcon} />
            )}
            {!isLocalVideoOn ? (
              <VideoOff size={16} className={styles.mutedIcon} />
            ) : (
              <Video size={16} className={styles.activeIcon} />
            )}
          </div>
        </div>

        {/* Remote Participants */}
        {remotePeers.map((peer) => (
          <div key={peer.peerId} className={styles.participantItem}>
            <div className={styles.leftInfo}>
              <div className={styles.avatar} style={{ backgroundColor: '#7C3AED' }}>
                {getAvatarInitials(peer.displayName)}
              </div>
              <div className={styles.nameGroup}>
                <span className={styles.displayName}>{peer.displayName}</span>
                <span className={styles.guestBadge}>Participant</span>
              </div>
            </div>

            <div className={styles.rightActions}>
              <div className={styles.statusIcons}>
                {peer.isMuted ? (
                  <MicOff size={16} className={styles.mutedIcon} />
                ) : (
                  <Mic size={16} className={styles.activeIcon} />
                )}
                {!peer.isVideoOn ? (
                  <VideoOff size={16} className={styles.mutedIcon} />
                ) : (
                  <Video size={16} className={styles.activeIcon} />
                )}
              </div>

              {/* Host Controls */}
              <div className={styles.hostActionButtons}>
                {onMutePeer && (
                  <button
                    className={styles.hostControlBtn}
                    onClick={() => onMutePeer(peer.peerId)}
                    title="Mute Participant"
                  >
                    Mute
                  </button>
                )}
                {onKickPeer && (
                  <button
                    className={styles.kickBtn}
                    onClick={() => onKickPeer(peer.peerId)}
                    title="Remove Participant"
                  >
                    <UserX size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
