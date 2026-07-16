import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import type { Lang } from './types'

export function formatMoney(amount: number, currency: string, _lang?: Lang) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return `0 ${currency}`
  // Always Latin digits + dot decimals — Arabic locale commas look like huge numbers (350,00 → 350000)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)
  return `${formatted} ${currency}`
}

export function formatWhen(iso: string, lang: Lang) {
  const d = parseISO(iso)
  const locale = lang === 'ar' ? ar : enUS
  if (isToday(d)) {
    return format(d, 'p', { locale })
  }
  return format(d, 'MMM d · p', { locale })
}

export function formatRelative(iso: string, lang: Lang) {
  return formatDistanceToNow(parseISO(iso), {
    addSuffix: true,
    locale: lang === 'ar' ? ar : enUS,
  })
}

export function datetimeLocalValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocal(value: string) {
  return new Date(value).toISOString()
}

/** iOS Safari / iPadOS — no Web Speech API, relies on keyboard dictation */
export function isIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOSDevice = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ reports as Mac but has touch
  const iPadOS = ua.includes('Macintosh') && 'ontouchend' in document
  return iOSDevice || iPadOS
}

export function hasWebSpeech() {
  if (typeof window === 'undefined') return false
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  // Web Speech recognition is effectively unusable inside iOS Safari/PWAs
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition) && !isIOS()
}

function icsDate(iso: string) {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICS(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** Build a .ics calendar event with an alarm that fires natively even when the app is closed. */
export function buildICS(alarm: { id: string; title: string; at: string; repeat?: string }) {
  const start = icsDate(alarm.at)
  const end = icsDate(new Date(new Date(alarm.at).getTime() + 5 * 60_000).toISOString())
  const stamp = icsDate(new Date().toISOString())
  const rrule =
    alarm.repeat === 'daily'
      ? '\nRRULE:FREQ=DAILY'
      : alarm.repeat === 'weekly'
        ? '\nRRULE:FREQ=WEEKLY'
        : ''
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AMIGO//Reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:amigo-${alarm.id}@amigo`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}` + rrule,
    `SUMMARY:${escapeICS(alarm.title)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(alarm.title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/** Download/open the .ics so the user can add it to the iPhone Calendar/Reminders. */
export function addAlarmToCalendar(alarm: { id: string; title: string; at: string; repeat?: string }) {
  const ics = buildICS(alarm)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${alarm.title || 'AMIGO'}.ics`.replace(/[\\/:*?"<>|]/g, '_')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
