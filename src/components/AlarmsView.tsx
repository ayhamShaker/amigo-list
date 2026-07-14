import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { t } from '../i18n'
import { useStore } from '../store'
import { datetimeLocalValue, formatRelative, formatWhen, fromDatetimeLocal } from '../utils'

export function AlarmsView() {
  const { state, addAlarm, deleteAlarm } = useStore()
  const lang = state.data.settings.lang
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState(datetimeLocalValue(new Date(Date.now() + 60 * 60_000)))

  const active = state.data.alarms.filter((a) => !a.fired)
  const fired = state.data.alarms.filter((a) => a.fired)

  const quick = (mins: number, label: string) => {
    const name = title.trim() || label
    addAlarm(name, new Date(Date.now() + mins * 60_000).toISOString())
    setTitle('')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !when) return
    addAlarm(title, fromDatetimeLocal(when))
    setTitle('')
  }

  return (
    <div className="animate-in space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{t('alarms', lang)}</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="chip" onClick={() => quick(30, t('in30m', lang))}>
          {t('in30m', lang)}
        </button>
        <button type="button" className="chip" onClick={() => quick(60, t('in1h', lang))}>
          {t('in1h', lang)}
        </button>
        <button type="button" className="chip" onClick={() => quick(120, t('in2h', lang))}>
          {t('in2h', lang)}
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('alarmTitle', lang)} />
        <label className="block text-xs text-[var(--color-mute)]">
          {t('when', lang)}
          <input
            className="mt-1"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary w-full">
          {t('addAlarm', lang)}
        </button>
      </form>

      {state.data.alarms.length === 0 ? (
        <p className="text-center text-[var(--color-mute)]">{t('noAlarms', lang)}</p>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm text-[var(--color-accent)]">{t('active', lang)}</h2>
              <ul className="space-y-2">
                {active
                  .sort((a, b) => +new Date(a.at) - +new Date(b.at))
                  .map((a) => (
                    <li key={a.id} className="row-card flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-semibold">{a.title}</p>
                        <p className="text-sm text-[var(--color-accent)]">{formatWhen(a.at, lang)}</p>
                        <p className="text-xs text-[var(--color-mute)]">{formatRelative(a.at, lang)}</p>
                      </div>
                      <button type="button" className="btn btn-ghost p-2" onClick={() => deleteAlarm(a.id)}>
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          )}
          {fired.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm text-[var(--color-mute)]">{t('fired', lang)}</h2>
              <ul className="space-y-2 opacity-60">
                {fired.map((a) => (
                  <li key={a.id} className="row-card flex items-center gap-3">
                    <div className="flex-1">
                      <p>{a.title}</p>
                      <p className="text-xs">{formatWhen(a.at, lang)}</p>
                    </div>
                    <button type="button" className="btn btn-ghost p-2" onClick={() => deleteAlarm(a.id)}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
