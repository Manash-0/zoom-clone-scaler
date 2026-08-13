'use client';

import React, { useEffect, useRef } from 'react';
import { MicOff, User } from 'lucide-react';
import { getAvatarInitials } from '@/lib/utils';
import styles from './VideoTile.module.css';

interface VideoTileProps {
  stream?: MediaStream | null;
  displayName: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOn?: boolean;
  avatarColor?: string;
}

export default function VideoTile({
  stream,
  displayName,
  isLocal = false,
  isMuted = false,
  isVideoOn = true,
  avatarColor = '#0E71EB',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={styles.tileContainer}>
      {isVideoOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local video element to avoid audio feedback loop
          className={`${styles.videoElement} ${isLocal ? styles.localVideo : ''}`}
        />
      ) : (
        <div className={styles.avatarFallback}>
          <div
            className={styles.avatarCircle}
            style={{ backgroundColor: avatarColor }}
          >
            {getAvatarInitials(displayName)}
          </div>
        </div>
      )}

      <div className={styles.tileOverlay}>
        <div className={styles.nameBadge}>
          {isMuted && <MicOff size={14} className={styles.mutedIcon} />}
          <span>{displayName} {isLocal && '(You)'}</span>
        </div>
      </div>
    </div>
  );
}
