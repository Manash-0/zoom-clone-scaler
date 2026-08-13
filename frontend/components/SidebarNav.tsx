'use client';

import React from 'react';
import { Home, Video, Users, Calendar, Settings, ShieldCheck } from 'lucide-react';
import styles from './SidebarNav.module.css';

interface SidebarNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function SidebarNav({
  activeTab = 'home',
  onTabChange,
}: SidebarNavProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'recordings', label: 'Recordings', icon: Video },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.navGroup}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={() => onTabChange && onTabChange(item.id)}
            >
              <Icon size={20} className={styles.navIcon} />
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.bottomSection}>
        <div className={styles.proBadge}>
          <ShieldCheck size={16} className={styles.badgeIcon} />
          <span>Zoom Business Pro</span>
        </div>
      </div>
    </aside>
  );
}
