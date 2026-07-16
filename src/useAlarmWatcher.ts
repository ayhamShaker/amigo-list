import { useEffect, useRef } from 'react'
import { useStore } from './store'

export function useAlarmWatcher() {
  const { state, fireAlarm, setRinging } = useStore()
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
        if (alarm.fired) continue
        // Key by id+time so a re-armed repeating alarm can fire again later
        const key = `${alarm.id}:${alarm.at}`
        if (notified.current.has(key)) continue
        const at = new Date(alarm.at).getTime()
        if (at <= now) {
          notified.current.add(key)

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('AMIGO', {
                body: alarm.title,
                icon: '/pwa-192.png',
                tag: alarm.id,
              })
            } catch {
              /* ignore */
            }
          }

          // Show the full-screen ringing overlay (handles sound + vibration + snooze)
          setRinging(alarm.id)
          // Re-arm repeats / retire one-shots
          fireAlarm(alarm.id)
        }
      }
    }

    tick()
    const id = window.setInterval(tick, 3000)
    return () => clearInterval(id)
  }, [state.data.alarms, fireAlarm, setRinging])
}
