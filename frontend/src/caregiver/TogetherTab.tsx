import { CalendarDays, Check, Heart, Info, LoaderCircle, MapPin, Sprout, Users } from 'lucide-react'
import seed from '../../../shared/seed.json'
import type { Unit } from '../api/types'
import type { Ctx } from './copy'
import { initials, weekdayTime, when } from './format'
import type { ActivityAction, useCompanion } from './useCompanion'

interface Props { unit: Unit; ctx: Ctx; now: number; companion: ReturnType<typeof useCompanion>; onToast: (text: string) => void }

export function TogetherTab({ unit, ctx, now, companion, onToast }: Props) {
  const { R } = ctx
  const { presets, messages, buddy, activity, responses, sending, sendFailed } = companion
  // The API exposes no interests, so the description reads them from the shared seed.
  const interests = seed.units.find(item => item.unit_id === unit.unit_id)?.interests || []
  const interestText = interests.length ? `: ${interests.join(' or ')}` : ''

  async function send(presetId: string) {
    if (await companion.send(presetId)) onToast(`Delivered to ${R} by voice call (simulated)`)
  }
  async function respond(action: ActivityAction) {
    if (await companion.respond(action)) onToast(action === 'invite_resident' ? `Invitation for ${R} saved` : 'Saved: you’ll join together')
  }
  const actionButton = (action: ActivityAction, idle: string, done: string) => {
    const state = responses[action]
    return <button type="button" className={`cg-btn cg-btn-outline cg-activity-action ${state === 'saved' ? 'is-saved' : ''}`}
      onClick={() => void respond(action)} disabled={state === 'saving' || state === 'saved'}>
      {state === 'saved' && <Check size={16} aria-hidden="true" />}{state === 'saving' ? 'Saving…' : state === 'saved' ? done : idle}
    </button>
  }
  const notes = [responses.invite_resident === 'saved' && `Invitation for ${R} recorded.`, responses.join_together === 'saved' && 'Your plan to join together is recorded.'].filter(Boolean)
  const respondFailed = responses.invite_resident === 'error' || responses.join_together === 'error'

  return <div className="cg-page">
    <h1 className="cg-display cg-pad">Stay close</h1>

    <section className="cg-card" aria-labelledby="cg-message-heading">
      <h2 id="cg-message-heading" className="cg-card-title">Thinking of you</h2>
      <p className="cg-card-lead">Tap one to send. It reaches {R} as a one-way voice call (simulated). {R} can’t reply.</p>
      <div className="cg-presets">
        {presets.map(preset => <button key={preset.preset_id} type="button" onClick={() => void send(preset.preset_id)} disabled={sending !== null}
          className={`cg-preset ${sending === preset.preset_id ? 'is-sending' : ''}`}>
          <Heart size={16} aria-hidden="true" /><span>“{preset.text}”</span><small>{sending === preset.preset_id ? 'Sending…' : ''}</small>
        </button>)}
      </div>
      {sendFailed && <p className="cg-inline-error" role="alert"><Info size={16} aria-hidden="true" />The message couldn’t be sent. Please try again.</p>}
      <h3 className="cg-overline">Sent</h3>
      {messages.length ? <ol className="cg-sent">
        {messages.map(message => <li key={message.message_id}>
          <span>“{message.text}”</span>
          <span className="cg-sent-meta"><Check size={14} aria-hidden="true" /><span>Delivered to {R} by voice call · Simulated · {when(message.sent_at, now)}</span></span>
        </li>)}
      </ol> : <p className="cg-card-lead">Nothing sent yet.</p>}
    </section>

    <section className="cg-card" aria-labelledby="cg-buddy-heading">
      <div className="cg-card-head">
        <h2 id="cg-buddy-heading" className="cg-card-title">Community Buddy</h2>
        {buddy.kind === 'matched' && <span className="cg-chip">Simulated match</span>}
      </div>
      {(buddy.kind === 'none' || buddy.kind === 'loading') && <>
        <p className="cg-card-lead">A local volunteer who shares one of {R}’s interests{interestText}.</p>
        <button type="button" className="cg-btn cg-btn-accent" onClick={() => void companion.requestBuddy()} disabled={buddy.kind === 'loading'}>
          <Users size={18} aria-hidden="true" />Request a Buddy
        </button>
      </>}
      {buddy.kind === 'requesting' && <div className="cg-pending" role="status"><LoaderCircle className="cg-spin" size={18} aria-hidden="true" />Finding a buddy for {R}…</div>}
      {buddy.kind === 'not_found' && <p className="cg-card-lead">No volunteer shares {R}’s interests yet. We’ll keep looking.</p>}
      {buddy.kind === 'error' && <>
        <div className="cg-warning" role="alert"><Info size={18} aria-hidden="true" /><span>We couldn’t request a buddy just now. Nothing was saved.</span></div>
        <button type="button" className="cg-btn cg-btn-outline" onClick={() => void companion.requestBuddy()}>Try again</button>
      </>}
      {buddy.kind === 'matched' && <>
        <div className="cg-buddy">
          <span className="cg-avatar">{initials(buddy.match.buddy.name)}</span>
          <span><strong>{buddy.match.buddy.name}</strong><span><Sprout size={14} aria-hidden="true" />Shares an interest in {buddy.match.shared_interest}</span></span>
        </div>
        <div className="cg-next">
          <span>Next activity together</span>
          {buddy.match.next_activity ? <>
            <strong>{buddy.match.next_activity.title}</strong>
            <span>{weekdayTime(buddy.match.next_activity.starts_at)} · {buddy.match.next_activity.location}</span>
          </> : <strong>No upcoming activity yet</strong>}
        </div>
      </>}
    </section>

    <section className="cg-card" aria-labelledby="cg-near-heading">
      <h2 id="cg-near-heading" className="cg-card-title">Happening near {R}</h2>
      {activity ? <>
        <div className="cg-activity">
          <span className="cg-activity-icon"><Sprout size={22} aria-hidden="true" /></span>
          <div>
            <strong>{activity.title}</strong>
            <span><CalendarDays size={14} aria-hidden="true" />{weekdayTime(activity.starts_at)}</span>
            <span><MapPin size={14} aria-hidden="true" />{activity.location}</span>
          </div>
        </div>
        <div className="cg-activity-actions">
          {actionButton('invite_resident', `Invite ${R}`, 'Invited')}
          {actionButton('join_together', 'Join together', 'Joining')}
        </div>
        {notes.length > 0 && <p className="cg-fineprint" role="status">{notes.join(' ')} Recorded only; nobody is contacted.</p>}
        {respondFailed && <p className="cg-inline-error" role="alert"><Info size={16} aria-hidden="true" />That couldn’t be saved. Please try again.</p>}
      </> : <p className="cg-card-lead">No activities near {R} right now.</p>}
    </section>
  </div>
}
