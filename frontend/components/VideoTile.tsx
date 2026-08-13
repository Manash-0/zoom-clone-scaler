'use client';

import React, { useEffect, useRef } from 'react';
import { MicOff, Monitor } from 'lucide-react';
import { getAvatarInitials } from '@/lib/utils';
import styles from './VideoTile.module.css';

interface VideoTileProps {
  stream?: MediaStream | null;
  displayName: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOn?: boolean;
  isScreenShare?: boolean;
  avatarColor?: string;
}

export default function VideoTile({
  stream,
  displayName,
  isLocal = false,
  isMuted = false,
  isVideoOn = true,
  isScreenShare = false,
  avatarColor = '#0E71EB',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideoTracks = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
  const showVideo = (isVideoOn || isScreenShare) && stream && hasVideoTracks;

  return (
    <div className={`${styles.tileContainer} ${isScreenShare ? styles.screenShareTile : ''}`}>
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal && !isScreenShare}
          className={`${styles.videoElement} ${isLocal && !isScreenShare ? styles.localVideo : ''} ${isScreenShare ? styles.screenShareVideo : ''}`}
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
          {isMuted && !isScreenShare && <MicOff size={14} className={styles.mutedIcon} />}
          {isScreenShare && <Monitor size={14} className={styles.screenIcon} />}
          <span>{displayName} {isLocal && !isScreenShare && '(You)'}</span>
          {isScreenShare && <span className={styles.screenShareLabel}>Screen</span>}
        </div>
      </div>
    </div>
  );
}
