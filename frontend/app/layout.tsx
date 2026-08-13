import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zoom - Video Conferencing & Online Meetings',
  description: 'Full-Stack Zoom Clone with Real-Time WebRTC Video & Audio Conferencing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
