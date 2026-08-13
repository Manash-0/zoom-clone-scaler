'use client';

import React, { useState } from 'react';
import {
  X,
  Video,
  Mic,
  Monitor,
  Shield,
  Sliders,
  Check,
  Volume2,
} from 'lucide-react';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'general' | 'video' | 'audio' | 'share' | 'security';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('video');
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [hdVideo, setHdVideo] = useState(true);
  const [suppressNoise, setSuppressNoise] = useState('auto');
  const [autoJoinAudio, setAutoJoinAudio] = useState(true);
  const [muteOnJoin, setMuteOnJoin] = useState(false);
  const [turnOffVideoOnJoin, setTurnOffVideoOnJoin] = useState(false);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3>Settings</h3>
          </div>
          <nav className={styles.navList}>
            <button
              className={`${styles.navItem} ${activeTab === 'general' ? styles.active : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <Sliders size={18} />
              <span>General</span>
            </button>
            <button
              className={`${styles.navItem} ${activeTab === 'video' ? styles.active : ''}`}
              onClick={() => setActiveTab('video')}
            >
              <Video size={18} />
              <span>Video</span>
            </button>
            <button
              className={`${styles.navItem} ${activeTab === 'audio' ? styles.active : ''}`}
              onClick={() => setActiveTab('audio')}
            >
              <Mic size={18} />
              <span>Audio</span>
            </button>
            <button
              className={`${styles.navItem} ${activeTab === 'share' ? styles.active : ''}`}
              onClick={() => setActiveTab('share')}
            >
              <Monitor size={18} />
              <span>Share Screen</span>
            </button>
            <button
              className={`${styles.navItem} ${activeTab === 'security' ? styles.active : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Shield size={18} />
              <span>Security</span>
            </button>
          </nav>
        </div>

        {/* Body Pane */}
        <div className={styles.mainPane}>
          <div className={styles.paneHeader}>
            <h2>
              {activeTab === 'general' && 'General Settings'}
              {activeTab === 'video' && 'Video Settings'}
              {activeTab === 'audio' && 'Audio Settings'}
              {activeTab === 'share' && 'Share Screen Settings'}
              {activeTab === 'security' && 'Security & Host Controls'}
            </h2>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className={styles.paneBody}>
            {activeTab === 'general' && (
              <div className={styles.settingsSection}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={hardwareAcceleration}
                    onChange={(e) => setHardwareAcceleration(e.target.checked)}
                  />
                  <span>Use hardware acceleration when available</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={autoJoinAudio}
                    onChange={(e) => setAutoJoinAudio(e.target.checked)}
                  />
                  <span>Automatically join computer audio when joining meeting</span>
                </label>
                <div className={styles.settingItem}>
                  <span className={styles.itemTitle}>Theme Appearance</span>
                  <div className={styles.themeOptions}>
                    <button className={`${styles.themePill} ${styles.themeActive}`}>Dark (Zoom Default)</button>
                    <button className={styles.themePill}>Light</button>
                    <button className={styles.themePill}>System</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'video' && (
              <div className={styles.settingsSection}>
                <div className={styles.previewBox}>
                  <div className={styles.previewPlaceholder}>
                    <Video size={36} />
                    <span>Camera Preview Active</span>
                  </div>
                </div>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={hdVideo}
                    onChange={(e) => setHdVideo(e.target.checked)}
                  />
                  <span>Enable HD 720p/1080p Video</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={mirrorVideo}
                    onChange={(e) => setMirrorVideo(e.target.checked)}
                  />
                  <span>Mirror my video</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={turnOffVideoOnJoin}
                    onChange={(e) => setTurnOffVideoOnJoin(e.target.checked)}
                  />
                  <span>Turn off my video when joining meeting</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked />
                  <span>Always display participant names on their video</span>
                </label>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className={styles.settingsSection}>
                <div className={styles.settingItem}>
                  <span className={styles.itemTitle}>Speaker & Volume</span>
                  <div className={styles.audioTestRow}>
                    <button className={styles.secondaryBtn}>
                      <Volume2 size={16} /> Test Speaker
                    </button>
                    <input type="range" min="0" max="100" defaultValue="80" className={styles.slider} />
                  </div>
                </div>

                <div className={styles.settingItem}>
                  <span className={styles.itemTitle}>Suppress Background Noise</span>
                  <select
                    className={styles.selectInput}
                    value={suppressNoise}
                    onChange={(e) => setSuppressNoise(e.target.value)}
                  >
                    <option value="auto">Auto (Recommended)</option>
                    <option value="low">Low (Faint background sounds)</option>
                    <option value="medium">Medium (Computer fan, pen taps)</option>
                    <option value="high">High (Typing, dog barking)</option>
                  </select>
                </div>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={muteOnJoin}
                    onChange={(e) => setMuteOnJoin(e.target.checked)}
                  />
                  <span>Mute microphone when joining meeting</span>
                </label>
              </div>
            )}

            {activeTab === 'share' && (
              <div className={styles.settingsSection}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked />
                  <span>Enter full screen when a participant shares screen</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked />
                  <span>Side-by-side mode during screen share</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked />
                  <span>Optimize screen share for video clip (smoother FPS)</span>
                </label>
              </div>
            )}

            {activeTab === 'security' && (
              <div className={styles.settingsSection}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={waitingRoomEnabled}
                    onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
                  />
                  <span>Enable Waiting Room for incoming guests</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked />
                  <span>Allow participants to share screen</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked />
                  <span>Allow participants to chat in meeting</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked />
                  <span>Allow participants to unmute themselves</span>
                </label>
              </div>
            )}
          </div>

          <div className={styles.paneFooter}>
            <button className={styles.doneBtn} onClick={onClose}>
              <Check size={16} /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
