'use client';

import React from 'react';
import { Video, Search, Settings, User } from 'lucide-react';
import { getAvatarInitials } from '@/lib/utils';
import styles from './Navbar.module.css';

interface NavbarProps {
  userName?: string;
  avatarColor?: string;
}

export default function Navbar({
  userName = 'Alex Johnson',
  avatarColor = '#0E71EB',
}: NavbarProps) {
  return (
    <header className={styles.navbar}>
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <Video className={styles.cameraIcon} />
        </div>
        <span className={styles.logoText}>zoom</span>
      </div>

      <div className={styles.searchContainer}>
        <Search className={styles.searchIcon} size={16} />
        <input
          type="text"
          placeholder="Search meetings, contacts, or messages..."
          className={styles.searchInput}
        />
      </div>

      <div className={styles.rightSection}>
        <button className={styles.iconBtn} title="Settings">
          <Settings size={20} />
        </button>
        <div className={styles.userProfile}>
          <div
            className={styles.avatar}
            style={{ backgroundColor: avatarColor }}
          >
            {getAvatarInitials(userName)}
            <span className={styles.onlineBadge} />
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userName}</span>
            <span className={styles.userRole}>Licensed Host</span>
          </div>
        </div>
      </div>
    </header>
  );
}
