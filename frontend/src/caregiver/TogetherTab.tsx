import type { ReactNode } from 'react'
import { ArrowRight, Check, Info, LoaderCircle } from 'lucide-react'
import seed from '../../../shared/seed.json'
import type { Unit } from '../api/types'
import type { Ctx } from './copy'
import { clock, initials, neighbourSentence, TZ, weekdayTime } from './format'
import { BuddyArt, NeighbourArt, OutingArt } from './TogetherArt'
import type { ActivityAction, useCompanion } from './useCompanion'

interface Props { unit: Unit; ctx: Ctx; companion: ReturnType<typeof useCompanion>; onToast: (text: string) => void }

/** One slim postcard: an art tile beside a kicker, headline and text, then whatever the card needs across the full width. */
function Postcard({ tone, art, kicker, title, text, children, labelId }: { tone: 'sun' | 'leaf' | 'sky'; art: ReactNode; kicker: string; title: string; text?: ReactNode; children?: ReactNode; labelId: string }) {
  return <article className={`cg-postcard is-${tone}`} aria-labelledby={labelId}>
    <div className="cg-postcard-art">{art}</div>
    <div className="cg-postcard-body">
      <p className="cg-postcard-kicker">{kicker}</p>
      <h2 id={labelId} className="cg-postcard-title">{title}</h2>
      {text && <p className="cg-postcard-text">{text}</p>}
    </div>
    {children}
  </article>
}

/** The matched person; the postcard headline already says their name. */
function Person({ name, lines }: { name: string; lines: string[] }) {
  return <div className="cg-person">
    <span className="cg-avatar">{initials(name)}</span>
    <span className="cg-person-text">
      <small className="cg-person-tag">Simulated match</small>
      {lines.map((line, index) => index ? <span key={line}>{line}</span> : <strong key={line}>{line}</strong>)}
    </span>
  </div>
}

export function TogetherTab({ unit, ctx, companion, onToast }: Props) {
  const { R } = ctx
  const { buddy, activity, responses, neighbours } = companion
  // The API exposes no interests, so the copy reads them from the shared seed.
  const interests: string[] = seed.units.find(item => item.unit_id === unit.unit_id)?.interests || []

  async function respond(action: ActivityAction) {
    if (await companion.respond(action)) onToast(action === 'invite_resident' ? `Invitation for ${R} saved` : 'Saved: you’ll join too')
  }
  const actionButton = (action: ActivityAction, idle: string, done: string, primary = false) => {
    const state = responses[action]
    return <button type="button" className={`cg-pill ${state === 'saved' ? 'is-saved' : primary ? 'cg-pill-ink' : ''}`}
      onClick={() => void respond(action)} disabled={state === 'saving' || state === 'saved'}>
      {state === 'saved' && <Check size={15} aria-hidden="true" />}{state === 'saving' ? 'Saving…' : state === 'saved' ? done : idle}
    </button>
  }
  async function consent(open: boolean) {
    if (await companion.setNeighbourConsent(open)) onToast(open ? `Saved: ${R} agrees to be introduced` : `${R}’s routine is no longer shared`)
  }
  async function introduce() {
    if (await companion.requestIntroduction()) onToast('Introduction requested')
  }
  const planSaved = responses.invite_resident === 'saved' || responses.join_together === 'saved'
  const respondFailed = responses.invite_resident === 'error' || responses.join_together === 'error'
  const neighbourState = neighbours.kind === 'ready' || neighbours.kind === 'saving' ? neighbours.state : null
  const neighbourSaving = neighbours.kind === 'saving'
  const neighbourMatch = neighbourState?.opted_in ? neighbourState.match : null

  return <div className="cg-page cg-together">
    <header className="cg-intro">
      <p className="cg-eyebrow">Together</p>
      <h1 className="cg-display">A wider <em>circle.</em></h1>
      <p className="cg-lede">Three small ways to keep {R} connected, close to home.</p>
    </header>

    <Postcard tone="sun" art={<OutingArt />} labelId="cg-outing-title" kicker={activity ? `01 · ${longDate(activity.starts_at)}` : '01 · Something to do'}
      title={activity ? activity.title : `Nothing planned near ${R} this week`}
      text={activity ? `${clock(activity.starts_at)} at ${activity.location}. Invite ${R}, or go along together.` : 'New community activities appear here as they’re announced.'}>
      {activity && <>
        <div className="cg-postcard-actions">
          {actionButton('invite_resident', `Invite ${R}`, 'Invited', true)}
          {actionButton('join_together', 'I’ll join too', 'You’re joining')}
        </div>
        {planSaved && <p className="cg-postcard-note" role="status">Saved to your plan. TemanMu doesn’t contact anyone for you.</p>}
        {respondFailed && <p className="cg-inline-error" role="alert"><Info size={16} aria-hidden="true" />That couldn’t be saved. Please try again.</p>}
      </>}
    </Postcard>

    <Postcard tone="leaf" art={<BuddyArt />} labelId="cg-buddy-title" kicker="02 · A buddy"
      title={buddy.kind === 'matched' ? `Meet ${buddy.match.buddy.name}` : interests.length ? `Someone who loves ${interests[0]} too` : `Someone who shares ${R}’s interests`}
      text={buddy.kind === 'matched' ? undefined : `A local volunteer matched on what ${R} enjoys${interests.length > 1 ? `: ${interests.join(' or ')}` : ''}.`}>
      {buddy.kind === 'matched' ? <Person name={buddy.match.buddy.name} lines={[
        `Also enjoys ${buddy.match.shared_interest}`,
        ...(buddy.match.next_activity ? [`Next together: ${buddy.match.next_activity.title}, ${weekdayTime(buddy.match.next_activity.starts_at)}`] : []),
      ]} /> : <>
        {(buddy.kind === 'none' || buddy.kind === 'loading') && <div className="cg-postcard-actions">
          <button type="button" className="cg-pill cg-pill-ink" onClick={() => void companion.requestBuddy()} disabled={buddy.kind === 'loading'}>
            Find a buddy<ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>}
        {buddy.kind === 'requesting' && <p className="cg-pending" role="status"><LoaderCircle className="cg-spin" size={16} aria-hidden="true" />Looking for someone nearby…</p>}
        {buddy.kind === 'not_found' && <p className="cg-postcard-note">No volunteer shares {R}’s interests yet. We’ll keep looking.</p>}
        {buddy.kind === 'error' && <div className="cg-postcard-error" role="alert">
          <span><Info size={16} aria-hidden="true" />Couldn’t request a buddy. Nothing was saved.</span>
          <button type="button" className="cg-pill" onClick={() => void companion.requestBuddy()}>Retry</button>
        </div>}
      </>}
    </Postcard>

    <Postcard tone="sky" art={<NeighbourArt />} labelId="cg-neighbour-title" kicker="03 · A neighbour"
      title={neighbourMatch ? `Meet ${neighbourMatch.name}` : 'A neighbour who keeps the same routine'}
      text={neighbourMatch ? undefined : `Some neighbours keep the same hours as ${R}. With ${R}’s OK, we’ll suggest one to meet.`}>
      {neighbours.kind === 'loading' && <p className="cg-pending" role="status"><LoaderCircle className="cg-spin" size={16} aria-hidden="true" />Loading…</p>}
      {neighbours.kind === 'error' && <div className="cg-postcard-error" role="alert">
        <span><Info size={16} aria-hidden="true" />Couldn’t load neighbours.</span>
        <button type="button" className="cg-pill" onClick={() => void companion.reloadNeighbours()}>Retry</button>
      </div>}
      {neighbourMatch && <>
        <Person name={neighbourMatch.name} lines={[
          `Floor ${neighbourMatch.floor} · ${neighbourSentence(neighbourMatch.labels)}`,
          ...(neighbourMatch.meeting_activity ? [`Could meet at ${neighbourMatch.meeting_activity.title}, ${weekdayTime(neighbourMatch.meeting_activity.starts_at)}`] : []),
        ]} />
        {neighbourState?.introduction_requested_at
          ? <p className="cg-postcard-done" role="status"><Check size={15} aria-hidden="true" />Requested at {clock(neighbourState.introduction_requested_at)}. The community coordinator will introduce them in person.</p>
          : <div className="cg-postcard-actions">
            <button type="button" className="cg-pill cg-pill-ink" onClick={() => void introduce()} disabled={neighbourSaving}>
              {neighbourSaving ? 'Saving…' : 'Ask for an introduction'}{!neighbourSaving && <ArrowRight size={15} aria-hidden="true" />}
            </button>
          </div>}
      </>}
      {neighbourState?.opted_in && !neighbourMatch && <p className="cg-postcard-note">No neighbour keeps {R}’s hours yet. We’ll keep looking.</p>}
      {neighbourState && !neighbourState.opted_in && <div className="cg-postcard-actions">
        <button type="button" className="cg-pill cg-pill-ink" onClick={() => void consent(true)} disabled={neighbourSaving}>
          {neighbourSaving ? 'Saving…' : 'Open to meeting neighbours'}{!neighbourSaving && <ArrowRight size={15} aria-hidden="true" />}
        </button>
      </div>}
      {neighbourState?.opted_in && !neighbourMatch && <div className="cg-postcard-actions">
        <button type="button" className="cg-pill" onClick={() => void consent(false)} disabled={neighbourSaving}>Stop sharing {R}’s routine</button>
      </div>}
    </Postcard>
  </div>
}

/** "Saturday 24 Oct". */
const longDate = (time: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(time)).replace(',', '')
