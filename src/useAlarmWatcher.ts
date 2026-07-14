import { useEffect, useRef } from 'react'
import { useStore } from './store'

export function useAlarmWatcher() {
  const { state, fireAlarm } = useStore()
  const notified = useRef(new Set<string>())

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      for (const alarm of state.data.alarms) {
        if (alarm.fired || notified.current.has(alarm.id)) continue
        const at = new Date(alarm.at).getTime()
        if (at <= now) {
          notified.current.add(alarm.id)
          fireAlarm(alarm.id)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('AMIGO', {
              body: alarm.title,
              icon: '/pwa-192.png',
              tag: alarm.id,
            })
          }
          try {
            const ctx = new AudioContext()
            const o = ctx.createOscillator()
            const g = ctx.createGain()
            o.connect(g)
            g.connect(ctx.destination)
            o.frequency.value = 880
            g.gain.value = 0.08
            o.start()
            o.stop(ctx.currentTime + 0.25)
          } catch {
            /* ignore */
          }
        }
      }
    }

    tick()
    const id = window.setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [state.data.alarms, fireAlarm])
}
