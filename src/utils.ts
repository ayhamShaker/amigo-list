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
