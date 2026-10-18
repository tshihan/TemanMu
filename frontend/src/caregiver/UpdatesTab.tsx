import { Bell, ShieldCheck } from 'lucide-react'
import type { Incident, Notification } from '../api/types'
import { notificationCopy, type Ctx } from './copy'
import { when } from './format'

interface Props {
  feed: Notification[]; ctx: Ctx; now: number; incidentFor: (n: Notification) => Incident | undefined
  isUnread: (n: Notification) => boolean; ackTargetId: string | null; ackBusy: boolean
  onOpen: (n: Notification) => void; onMarkAllRead: () => void; onAck: () => void
}

export function UpdatesTab({ feed, ctx, now, incidentFor, isUnread, ackTargetId, ackBusy, onOpen, onMarkAllRead, onAck }: Props) {
  return <div className="cg-page cg-page-flat">
    <div className="cg-page-head">
      <h1 className="cg-display">Updates</h1>
      {feed.some(isUnread) && <button type="button" className="cg-link-button" onClick={onMarkAllRead}>Mark all read</button>}
    </div>
    {feed.length ? <ol className="cg-feed">
      {feed.map(n => {
        const copy = notificationCopy(n, ctx, incidentFor(n))
        const unread = isUnread(n)
        return <li key={n.notification_id} className={`cg-feed-item ${unread ? 'is-unread' : ''}`}>
          <button type="button" className="cg-feed-open" onClick={() => onOpen(n)}>
            <span className={`cg-tone-icon tone-${copy.tone}`}><copy.Icon size={18} aria-hidden="true" /></span>
            <span className="cg-feed-text">
              <span className="cg-feed-title"><strong>{copy.title}</strong>{unread && <span className="cg-new"><span aria-hidden="true" />New</span>}</span>
              <span className="cg-feed-body">{copy.body}</span>
              <time dateTime={n.created_at}>{when(n.created_at, now)}</time>
            </span>
          </button>
          {n.notification_id === ackTargetId && <button type="button" className="cg-btn cg-btn-alarm cg-feed-ack" onClick={onAck} disabled={ackBusy}>
            {!ackBusy && <ShieldCheck size={22} aria-hidden="true" />}{ackBusy ? 'Recording…' : 'I’ll Check Now'}
          </button>}
        </li>
      })}
    </ol> : <div className="cg-empty">
      <span className="cg-empty-icon"><Bell size={24} aria-hidden="true" /></span>
      <strong>No updates yet</strong>
      <p>Morning reassurance and safety alerts about {ctx.R} will appear here as they happen.</p>
    </div>}
  </div>
}
