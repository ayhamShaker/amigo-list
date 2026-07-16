import { BellRing } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { t } from '../i18n'
import { useStore } from '../store'
import { formatWhen } from '../utils'

/** Full-screen overlay shown when an alarm fires: loud repeating tone, vibration, snooze & dismiss. */
export function AlarmRing() {
  const { state, snoozeAlarm, deleteAlarm, setRinging } = useStore()
  const lang = state.data.settings.lang
  const alarm = state.data.alarms.find((a) => a.id === state.ringingAlarmId)
  const ctxRef = useRef<AudioContext | null>(null)
  const beepRef = useRef<number | null>(null)
  const vibRef = useRef<number | null>(null)

  const stopNoise = () => {
    if (beepRef.current) {
      clearInterval(beepRef.current)
      beepRef.current = null
    }
    if (vibRef.current) {
      clearInterval(vibRef.current)
      vibRef.current = null
    }
    if (navigator.vibrate) navigator.vibrate(0)
    if (ctxRef.current) {
      void ctxRef.current.close().catch(() => {})
      ctxRef.current = null
    }
  }

  useEffect(() => {
    if (!alarm) {
      stopNoise()
      return
    }

    // Repeating two-tone chime
    const play = () => {
      try {
        let ctx = ctxRef.current
        if (!ctx) {
          ctx = new AudioContext()
          ctxRef.current = ctx
        }
        void ctx.resume().catch(() => {})
        const now = ctx.currentTime
        ;[880, 1175].forEach((freq, i) => {
          const o = ctx!.createOscillator()
          const g = ctx!.createGain()
          o.type = 'sine'
          o.frequency.value = freq
          o.connect(g)
          g.connect(ctx!.destination)
          const startAt = now + i * 0.28
          g.gain.setValueAtTime(0.0001, startAt)
          g.gain.exponentialRampToValueAtTime(0.22, startAt + 0.02)
          g.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.26)
          o.start(startAt)
          o.stop(startAt + 0.28)
        })
      } catch {
        /* ignore */
      }
    }

    play()
    beepRef.current = window.setInterval(play, 1500)
    if (navigator.vibrate) {
      const buzz = () => navigator.vibrate([400, 200, 400])
      buzz()
      vibRef.current = window.setInterval(buzz, 1500)
    }

    return stopNoise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarm?.id])

  if (!alarm) return null

  const snooze = (mins: number) => {
    snoozeAlarm(alarm.id, mins)
    setRinging(null)
  }
  const dismiss = () => {
    setRinging(null)
    if (alarm.repeat === 'none' || !alarm.repeat) deleteAlarm(alarm.id)
  }

  return (
    <div className="alarm-ring">
      <div className="alarm-ring-card animate-in">
        <span className="alarm-ring-icon pulse-soft">
          <BellRing size={44} />
        </span>
        <p className="alarm-ring-time">{formatWhen(alarm.at, lang)}</p>
        <h2 className="alarm-ring-title">{alarm.title}</h2>

        <div className="alarm-ring-snooze">
          <button type="button" className="chip" onClick={() => snooze(5)}>
            {t('snooze5', lang)}
          </button>
          <button type="button" className="chip" onClick={() => snooze(10)}>
            {t('snooze10', lang)}
          </button>
        </div>

        <button type="button" className="btn btn-primary w-full" onClick={dismiss}>
          {t('dismiss', lang)}
        </button>
      </div>
    </div>
  )
}
