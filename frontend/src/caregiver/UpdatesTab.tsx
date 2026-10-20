import { Bell } from 'lucide-react'
import type { Incident, Notification } from '../api/types'
import { notificationCopy, type Ctx } from './copy'
import { clock, dayKey, dayLabel } from './format'

interface Props {
  feed: Notification[]; ctx: Ctx; now: number; incidentFor: (n: Notification) => Incident | undefined
  isUnread: (n: Notification) => boolean; ackTargetId: string | null; ackBusy: boolean
  onOpen: (n: Notification) => void; onMarkAllRead: () => void; onAck: () => void
}

export function UpdatesTab({ feed, ctx, now, incidentFor, isUnread, ackTargetId, ackBusy, onOpen, onMarkAllRead, onAck }: Props) {
  const unread = feed.filter(isUnread).length
  // The feed is newest first, so each day's group keeps that order.
  const days: { key: string; label: string; items: Notification[] }[] = []
  for (const n of feed) {
    const key = dayKey(n.created_at)
    const group = days.at(-1)
    if (group?.key === key) group.items.push(n)
    else days.push({ key, items: [n], label: key === dayKey(now) ? 'Today' : key === dayKey(now - 864e5) ? 'Yesterday' : dayLabel(n.created_at) })
  }

  return <div className="cg-page">
    <header className="cg-page-head cg-tab-head">
      <div>
        <p className="cg-eyebrow">{unread ? `${unread} new` : 'All caught up'}</p>
        <h1 className="cg-display">Updates</h1>
      </div>
      {unread > 0 && <button type="button" className="cg-link-button" onClick={onMarkAllRead}>Mark all read</button>}
    </header>
    {feed.length ? days.map(day => <section key={day.key} className="cg-feed-day" aria-label={day.label}>
      <h2 className="cg-feed-day-label">{day.label}</h2>
      <ol className="cg-feed">
        {day.items.map(n => {
          const copy = notificationCopy(n, ctx, incidentFor(n))
          const fresh = isUnread(n)
          return <li key={n.notification_id} className={`cg-feed-item is-${copy.tone} ${fresh ? 'is-unread' : ''}`}>
            <button type="button" className="cg-feed-open" onClick={() => onOpen(n)}>
              <span className={`cg-tone-icon tone-${copy.tone}`}><copy.Icon size={18} aria-hidden="true" /></span>
              <span className="cg-feed-text">
                <span className="cg-feed-title"><strong>{copy.title}</strong>{fresh && <span className="cg-new">New</span>}</span>
                <span className="cg-feed-body">{copy.body}</span>
              </span>
              <time className="cg-num" dateTime={n.created_at}>{clock(n.created_at)}</time>
            </button>
            {n.notification_id === ackTargetId && <button type="button" className="cg-btn cg-btn-alarm cg-feed-ack" onClick={onAck} disabled={ackBusy}>
              {ackBusy ? 'Opening…' : 'Respond to alert'}
            </button>}
          </li>
        })}
      </ol>
    </section>) : <div className="cg-empty">
      <span className="cg-empty-icon"><Bell size={24} aria-hidden="true" /></span>
      <strong>No updates yet</strong>
      <p>Morning reassurance and safety alerts about {ctx.R} will appear here as they happen.</p>
    </div>}
  </div>
}
