'use client';

import React, { useState } from 'react';
import { Video, Search, Settings, Menu, X, Calendar, Plus } from 'lucide-react';
import { getAvatarInitials } from '@/lib/utils';
import styles from './Navbar.module.css';

interface NavbarProps {
  userName?: string;
  avatarColor?: string;
  onOpenSettings?: () => void;
}

export default function Navbar({
  userName = 'Alex Johnson',
  avatarColor = '#0E71EB',
  onOpenSettings,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={styles.navbar}>
      <div className={styles.leftSection}>
        <button
          className={styles.hamburgerBtn}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>
            <Video className={styles.cameraIcon} />
          </div>
          <span className={styles.logoText}>zoom</span>
        </div>
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
        <button
          className={styles.iconBtn}
          title="Settings"
          onClick={onOpenSettings}
        >
          <Settings size={20} />
        </button>

        <div className={styles.userProfile} onClick={onOpenSettings}>
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

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawer}>
          <div className={styles.mobileUser}>
            <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
              {getAvatarInitials(userName)}
            </div>
            <div>
              <div className={styles.userName}>{userName}</div>
              <div className={styles.userRole}>Licensed Host</div>
            </div>
          </div>
          <button
            className={styles.mobileDrawerItem}
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenSettings?.();
            }}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      )}
    </header>
  );
}
