import { useState } from 'react'
import { t } from '../i18n'
import { useStore } from '../store'
import { CURRENCIES, type Lang } from '../types'

export function SettingsView() {
  const { state, setSettings } = useStore()
  const s = state.data.settings
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ ...s })

  const save = () => {
    setSettings(form)
    document.documentElement.lang = form.lang
    document.documentElement.dir = form.lang === 'ar' ? 'rtl' : 'ltr'
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  const setLang = (lang: Lang) => {
    setForm((f) => ({ ...f, lang }))
    setSettings({ lang })
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }

  return (
    <div className="animate-in space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{t('settings', s.lang)}</h1>
      </header>

      <section className="space-y-2">
        <label className="text-xs text-[var(--color-mute)]">{t('language', s.lang)}</label>
        <div className="flex gap-2">
          <button type="button" className={`chip flex-1 justify-center ${form.lang === 'ar' ? 'on' : ''}`} onClick={() => setLang('ar')}>
            عربي
          </button>
          <button type="button" className={`chip flex-1 justify-center ${form.lang === 'en' ? 'on' : ''}`} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-xs text-[var(--color-mute)]">{t('userName', s.lang)}</label>
        <input value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
      </section>

      <section className="space-y-2">
        <label className="text-xs text-[var(--color-mute)]">{t('currency', s.lang)}</label>
        <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </section>

      <section className="row-card flex items-center justify-between gap-3">
        <span className="text-sm">{t('voiceReplies', s.lang)}</span>
        <button
          type="button"
          className={`chip ${form.voiceReplies ? 'on' : ''}`}
          onClick={() => {
            const voiceReplies = !form.voiceReplies
            setForm({ ...form, voiceReplies })
            setSettings({ voiceReplies })
          }}
        >
          {form.voiceReplies ? (s.lang === 'ar' ? 'تشغيل' : 'On') : s.lang === 'ar' ? 'إطفاء' : 'Off'}
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-ink-2)] p-4">
        <p className="brand text-sm text-[var(--color-accent)]">AMIGO API</p>
        <p className="text-xs text-[var(--color-mute)]">{t('apiHint', s.lang)}</p>
        <div className="space-y-2">
          <label className="text-xs text-[var(--color-mute)]">{t('apiKey', s.lang)}</label>
          <input
            type="password"
            autoComplete="off"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder="sk-…"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-[var(--color-mute)]">{t('apiBase', s.lang)}</label>
          <input
            value={form.apiBase}
            onChange={(e) => setForm({ ...form, apiBase: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-[var(--color-mute)]">{t('apiModel', s.lang)}</label>
          <input
            value={form.apiModel}
            onChange={(e) => setForm({ ...form, apiModel: e.target.value })}
            placeholder="gpt-4o-mini"
          />
        </div>
      </section>

      <p className="text-xs text-[var(--color-mute)]">{t('installHint', s.lang)}</p>

      <button type="button" className="btn btn-primary w-full" onClick={save}>
        {saved ? t('settingsSaved', s.lang) : t('save', s.lang)}
      </button>
    </div>
  )
}
