'use client'

import { useTrades } from '@/lib/trades-context'
import styles from './nachrichten.module.css'

export default function NachrichtenPage() {
  const { getConversations, unreadCount } = useTrades()
  const conversations = getConversations()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nachrichten</h1>
        {unreadCount > 0 && (
          <span className="badge badge-primary">{unreadCount} neu</span>
        )}
      </div>

      {conversations.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">💬</span>
          <span className="empty-state-title">Noch keine Nachrichten</span>
          <span className="empty-state-text">
            Wenn du einen Tausch anfragst oder jemand dich kontaktiert, erscheinen hier deine Unterhaltungen.
          </span>
        </div>
      ) : (
        <div className={styles.conversationList}>
          {conversations.map(conv => (
            <div key={conv.partnerId} className={styles.conversationCard}>
              <div className={styles.convAvatar}>
                {conv.partnerId.charAt(5).toUpperCase()}
              </div>
              <div className={styles.convContent}>
                <div className={styles.convTop}>
                  <span className={styles.convName}>{conv.partnerId}</span>
                  <span className={styles.convTime}>
                    {new Date(conv.lastMessage.createdAt).toLocaleDateString('de-DE', { 
                      day: '2-digit', month: '2-digit' 
                    })}
                  </span>
                </div>
                <p className={styles.convPreview}>{conv.lastMessage.content}</p>
              </div>
              {conv.unread > 0 && (
                <span className="badge badge-primary">{conv.unread}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
