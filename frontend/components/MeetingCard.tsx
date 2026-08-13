'use client';

import React, { useState } from 'react';
import { Play, Copy, Check, Calendar, Clock, Hash, Trash2 } from 'lucide-react';
import { Meeting } from '@/lib/api';
import { formatDate, formatTimeOnly, copyToClipboard } from '@/lib/utils';
import styles from './MeetingCard.module.css';

interface MeetingCardProps {
  meeting: Meeting;
  isUpcoming?: boolean;
  onStartMeeting: (code: string) => void;
  onCancelMeeting?: (id: number) => void;
}

export default function MeetingCard({
  meeting,
  isUpcoming = true,
  onStartMeeting,
  onCancelMeeting,
}: MeetingCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareableUrl = `${origin}/meeting/${meeting.meeting_code}`;
    const success = await copyToClipboard(shareableUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{meeting.title}</h3>
          {meeting.description && (
            <p className={styles.description}>{meeting.description}</p>
          )}
        </div>
        <span
          className={`${styles.typeBadge} ${
            meeting.type === 'instant' ? styles.instant : styles.scheduled
          }`}
        >
          {meeting.type}
        </span>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <Calendar size={15} className={styles.metaIcon} />
          <span>
            {isUpcoming
              ? formatDate(meeting.scheduled_start)
              : formatDate(meeting.ended_at || meeting.created_at)}
          </span>
        </div>
        {meeting.duration_minutes && (
          <div className={styles.metaItem}>
            <Clock size={15} className={styles.metaIcon} />
            <span>{meeting.duration_minutes} mins</span>
          </div>
        )}
        <div className={styles.metaItem}>
          <Hash size={15} className={styles.metaIcon} />
          <span className={styles.codeText}>{meeting.meeting_code}</span>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copied ? (
            <>
              <Check size={16} className={styles.copyIconCheck} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>Copy Link</span>
            </>
          )}
        </button>

        <div className={styles.rightActions}>
          {isUpcoming && onCancelMeeting && (
            <button
              className={styles.cancelBtn}
              onClick={() => onCancelMeeting(meeting.id)}
              title="Cancel Meeting"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            className={styles.startBtn}
            onClick={() => onStartMeeting(meeting.meeting_code)}
          >
            <Play size={16} className={styles.playIcon} />
            <span>{isUpcoming ? 'Start' : 'Rejoin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
