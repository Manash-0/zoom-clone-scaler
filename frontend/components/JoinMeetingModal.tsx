'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, LogIn, User } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMeetingCode } from '@/lib/utils';
import styles from './JoinMeetingModal.module.css';

interface JoinMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUserName?: string;
}

export default function JoinMeetingModal({
  isOpen,
  onClose,
  defaultUserName = 'Alex Johnson',
}: JoinMeetingModalProps) {
  const router = useRouter();
  const [meetingInput, setMeetingInput] = useState('');
  const [displayName, setDisplayName] = useState(defaultUserName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const extractMeetingCode = (input: string): string => {
    const trimmed = input.trim();
    // If full URL pasted (e.g. http://localhost:3000/meeting/123-456-789)
    if (trimmed.includes('/meeting/')) {
      const parts = trimmed.split('/meeting/');
      return parts[1].split('?')[0];
    }
    return trimmed;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes('http') || val.includes('/')) {
      setMeetingInput(val);
    } else {
      setMeetingInput(formatMeetingCode(val));
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractMeetingCode(meetingInput);
    if (!code) {
      setError('Please enter a valid Meeting ID or Personal Link Name.');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      // Validate meeting exists via backend API
      await api.getMeetingDetails(code);
      onClose();
      // Navigate to pre-join screen with display name parameter
      router.push(`/meeting/${code}?name=${encodeURIComponent(displayName.trim())}`);
    } catch (err: any) {
      setError('Invalid meeting code or meeting not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <LogIn className={styles.headerIcon} />
            <h2>Join a Meeting</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleJoin} className={styles.form}>
          <div className={styles.field}>
            <label>Meeting ID or Personal Link Name</label>
            <input
              type="text"
              placeholder="e.g. 123-456-789 or paste link"
              value={meetingInput}
              onChange={handleInputChange}
              autoFocus
              required
            />
          </div>

          <div className={styles.field}>
            <label>Your Display Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className={styles.infoBox}>
            <p>By clicking Join, you agree to our Terms of Service and Privacy Statement.</p>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Validating...' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
