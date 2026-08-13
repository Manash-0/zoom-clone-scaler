'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './DashboardActionButton.module.css';

interface DashboardActionButtonProps {
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  variant?: 'orange' | 'blue' | 'accent';
  onClick: () => void;
}

export default function DashboardActionButton({
  label,
  sublabel,
  icon: Icon,
  variant = 'blue',
  onClick,
}: DashboardActionButtonProps) {
  return (
    <button
      className={`${styles.actionButton} ${styles[variant]}`}
      onClick={onClick}
    >
      <div className={styles.iconWrapper}>
        <Icon size={28} className={styles.icon} />
      </div>
      <div className={styles.textContainer}>
        <span className={styles.label}>{label}</span>
        {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
      </div>
    </button>
  );
}
