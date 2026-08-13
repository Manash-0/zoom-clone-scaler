'use client';

import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { ChatMessage } from '@/hooks/useWebRTC';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export default function ChatPanel({
  isOpen,
  onClose,
  messages,
  onSendMessage,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>In-Meeting Chat</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyChat}>
            <p>No messages yet. Send a message to everyone in the meeting.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.messageItem} ${
                msg.isLocal ? styles.localMessage : ''
              }`}
            >
              <div className={styles.msgHeader}>
                <span className={styles.sender}>{msg.senderName}</span>
                <span className={styles.time}>{msg.timestamp}</span>
              </div>
              <div className={styles.msgBody}>{msg.text}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className={styles.inputArea}>
        <input
          type="text"
          placeholder="Type message here..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className={styles.sendBtn} disabled={!inputText.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
