// Times are always shown in Malaysia time, whatever the phone's own time zone is.
export const TZ = 'Asia/Kuala_Lumpur'

const ms = (time: string | number) => typeof time === 'number' ? time : new Date(time).getTime()

export const clock = (time: string | number, seconds = false) => new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hour: 'numeric', minute: '2-digit', second: seconds ? '2-digit' : undefined,
}).format(new Date(ms(time)))

export const dayKey = (time: string | number) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ms(time)))

export const isToday = (time: string | number, now = Date.now()) => dayKey(time) === dayKey(now)

/** "3:05 PM", "Yesterday, 3:05 PM" or "12 Oct, 3:05 PM". */
export function when(time: string | number, now = Date.now()): string {
  if (isToday(time, now)) return clock(time)
  if (dayKey(time) === dayKey(now - 864e5)) return `Yesterday, ${clock(time)}`
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' }).format(new Date(ms(time)))
  return `${date}, ${clock(time)}`
}

/** "0:12" for demo durations, "2 h 05 min" for real ones. */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')} min`
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const until = (deadline: string | null, now: number) => deadline ? duration((ms(deadline) - now) / 1000) : ''

/** "Saturday 9:00 AM". */
export const weekdayTime = (time: string) =>
  `${new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(new Date(time))} ${clock(time)}`

export function greeting(now: number): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date(now)))
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export const initials = (name: string) => name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
