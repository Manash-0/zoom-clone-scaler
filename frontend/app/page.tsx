'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Plus, Calendar, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SidebarNav from '@/components/SidebarNav';
import DashboardActionButton from '@/components/DashboardActionButton';
import MeetingCard from '@/components/MeetingCard';
import ScheduleMeetingModal from '@/components/ScheduleMeetingModal';
import JoinMeetingModal from '@/components/JoinMeetingModal';
import SettingsModal from '@/components/SettingsModal';
import { api, Meeting } from '@/lib/api';
import styles from './page.module.css';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [greeting, setGreeting] = useState(getGreeting());
  const [dateStr, setDateStr] = useState(getFormattedDate());

  const loadData = async () => {
    try {
      setLoading(true);
      const [upcoming, recent] = await Promise.all([
        api.getUpcomingMeetings(),
        api.getRecentMeetings(),
      ]);
      setUpcomingMeetings(upcoming);
      setRecentMeetings(recent);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setGreeting(getGreeting());
      setDateStr(getFormattedDate());
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartInstantMeeting = async () => {
    try {
      const newMeeting = await api.createInstantMeeting(
        'Instant Meeting',
        'Quick video chat session'
      );
      router.push(`/meeting/${newMeeting.meeting_code}?name=Alex%20Johnson`);
    } catch (err) {
      console.error('Failed to start instant meeting:', err);
      alert('Could not start instant meeting. Is the backend running?');
    }
  };

  const handleStartExistingMeeting = (code: string) => {
    router.push(`/meeting/${code}?name=Alex%20Johnson`);
  };

  const handleCancelMeeting = async (id: number) => {
    if (confirm('Are you sure you want to cancel this scheduled meeting?')) {
      try {
        await api.cancelMeeting(id);
        loadData();
      } catch (err) {
        console.error('Failed to cancel meeting:', err);
      }
    }
  };

  return (
    <div className={styles.dashboardLayout}>
      <Navbar
        userName="Alex Johnson"
        avatarColor="#0E71EB"
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className={styles.mainContainer}>
        <SidebarNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'settings') {
              setIsSettingsOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
        />

        <main className={styles.contentArea}>
          <div className={styles.welcomeHeader}>
            <div>
              <h1 className={styles.welcomeTitle}>{greeting}, Alex</h1>
              <p className={styles.welcomeSubtitle}>{dateStr}</p>
            </div>
            {currentTime && (
              <div className={styles.timeWidget}>
                <Clock size={16} className={styles.timeIcon} />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          <div className={styles.actionGrid}>
            <DashboardActionButton
              label="New Meeting"
              sublabel="Start instant video call"
              icon={Video}
              variant="orange"
              onClick={handleStartInstantMeeting}
            />
            <DashboardActionButton
              label="Join Meeting"
              sublabel="Via Meeting ID or link"
              icon={Plus}
              variant="blue"
              onClick={() => setIsJoinOpen(true)}
            />
            <DashboardActionButton
              label="Schedule"
              sublabel="Plan a future meeting"
              icon={Calendar}
              variant="accent"
              onClick={() => setIsScheduleOpen(true)}
            />
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <Calendar className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Upcoming Meetings</h2>
                <span className={styles.countBadge}>
                  {upcomingMeetings.length}
                </span>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingContainer}>Loading upcoming meetings...</div>
            ) : upcomingMeetings.length > 0 ? (
              <div className={styles.meetingsGrid}>
                {upcomingMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    isUpcoming={true}
                    onStartMeeting={handleStartExistingMeeting}
                    onCancelMeeting={handleCancelMeeting}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Calendar className={styles.emptyIcon} />
                <p className={styles.emptyText}>No upcoming meetings scheduled.</p>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <Clock className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Recent Meetings</h2>
                <span className={styles.countBadge}>{recentMeetings.length}</span>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingContainer}>Loading recent meetings...</div>
            ) : recentMeetings.length > 0 ? (
              <div className={styles.meetingsGrid}>
                {recentMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    isUpcoming={false}
                    onStartMeeting={handleStartExistingMeeting}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Clock className={styles.emptyIcon} />
                <p className={styles.emptyText}>No past meeting history.</p>
              </div>
            )}
          </section>
        </main>
      </div>

      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onSuccess={loadData}
      />

      <JoinMeetingModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        defaultUserName="Alex Johnson"
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
