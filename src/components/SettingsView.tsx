import { useRef, useState } from 'react'
import { t } from '../i18n'
import { useStore } from '../store'
import { CURRENCIES, type Lang } from '../types'

export function SettingsView() {
  const { state, setSettings, importData } = useStore()
  const s = state.data.settings
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ ...s })
  const [syncMsg, setSyncMsg] = useState('')
  const [pasteText, setPasteText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const flash = (msg: string) => {
    setSyncMsg(msg)
    window.setTimeout(() => setSyncMsg(''), 2500)
  }

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

  const runImport = (raw: unknown) => {
    if (!window.confirm(t('importConfirm', s.lang))) return
    const ok = importData(raw)
    if (!ok) {
      flash(t('importFail', s.lang))
      return
    }
    flash(t('importDone', s.lang))
    window.setTimeout(() => window.location.reload(), 400)
  }

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `amigo-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash(t('exportDone', s.lang))
  }

  const copyAll = async () => {
    const text = JSON.stringify(state.data)
    try {
      await navigator.clipboard.writeText(text)
      flash(t('copyDone', s.lang))
    } catch {
      setPasteText(text)
      flash(t('copyDone', s.lang))
    }
  }

  const onImportFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        runImport(JSON.parse(String(reader.result)))
      } catch {
        flash(t('importFail', s.lang))
      }
    }
    reader.readAsText(file)
  }

  const onPasteImport = () => {
    const trimmed = pasteText.trim()
    if (!trimmed) return
    try {
      runImport(JSON.parse(trimmed))
      setPasteText('')
    } catch {
      flash(t('importFail', s.lang))
    }
  }

  const toggleSync = () => {
    const syncCode = form.syncCode.trim()
    if (!s.syncEnabled && !syncCode) {
      flash(t('syncNeedCode', s.lang))
      return
    }
    const syncEnabled = !s.syncEnabled
    setForm((f) => ({ ...f, syncCode, syncEnabled }))
    setSettings({ syncCode, syncEnabled })
    flash(syncEnabled ? t('syncWorking', s.lang) : t('syncOff', s.lang))
  }

  return (
    <div className="animate-in space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{t('settings', s.lang)}</h1>
      </header>

      <section className="space-y-3 rounded-2xl border border-[var(--color-accent)]/35 bg-[rgba(61,220,151,0.08)] p-4">
        <p className="text-sm font-semibold">{t('syncTitle', s.lang)}</p>
        <p className="text-xs text-[var(--color-mute)]">{t('syncHint', s.lang)}</p>
        <div className="space-y-2">
          <label className="text-xs text-[var(--color-mute)]">{t('syncCode', s.lang)}</label>
          <input
            value={form.syncCode}
            onChange={(e) => setForm({ ...form, syncCode: e.target.value })}
            onBlur={() => setSettings({ syncCode: form.syncCode.trim() })}
            placeholder={t('syncCodePlaceholder', s.lang)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button
          type="button"
          className={`btn w-full ${s.syncEnabled ? 'btn-primary' : 'border border-[var(--color-line)] bg-[var(--color-ink-3)]'}`}
          onClick={toggleSync}
        >
          {s.syncEnabled ? t('syncOn', s.lang) : t('syncEnable', s.lang)}
        </button>
        {syncMsg && <p className="text-sm text-[var(--color-accent)]">{syncMsg}</p>}
      </section>

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
            onChange={(e) => {
              const apiKey = e.target.value
              setForm({ ...form, apiKey })
              setSettings({ apiKey })
            }}
            placeholder="sk-…"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-[var(--color-mute)]">{t('apiBase', s.lang)}</label>
          <input
            value={form.apiBase}
            onChange={(e) => {
              const apiBase = e.target.value
              setForm({ ...form, apiBase })
              setSettings({ apiBase })
            }}
            placeholder="https://api.openai.com/v1"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-[var(--color-mute)]">{t('apiModel', s.lang)}</label>
          <input
            value={form.apiModel}
            onChange={(e) => {
              const apiModel = e.target.value
              setForm({ ...form, apiModel })
              setSettings({ apiModel })
            }}
            placeholder="gpt-4o-mini"
          />
        </div>
      </section>

      <details className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-ink-2)] p-4">
        <summary className="cursor-pointer text-sm text-[var(--color-mute)]">
          {s.lang === 'ar' ? 'نسخة احتياطية يدوية (اختياري)' : 'Manual backup (optional)'}
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" className="btn border border-[var(--color-line)] bg-[var(--color-ink-3)]" onClick={exportFile}>
            {t('exportData', s.lang)}
          </button>
          <button type="button" className="btn border border-[var(--color-line)] bg-[var(--color-ink-3)]" onClick={copyAll}>
            {t('copyData', s.lang)}
          </button>
          <button
            type="button"
            className="btn border border-[var(--color-line)] bg-[var(--color-ink-3)]"
            onClick={() => fileRef.current?.click()}
          >
            {t('importData', s.lang)}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              onImportFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={2}
            className="amigo-composer"
            placeholder={s.lang === 'ar' ? 'الصق نسخة هنا…' : 'Paste backup here…'}
          />
          <button type="button" className="btn btn-primary" onClick={onPasteImport} disabled={!pasteText.trim()}>
            {t('pasteData', s.lang)}
          </button>
        </div>
      </details>

      <p className="text-xs text-[var(--color-mute)]">{t('installHint', s.lang)}</p>

      <button type="button" className="btn btn-primary w-full" onClick={save}>
        {saved ? t('settingsSaved', s.lang) : t('save', s.lang)}
      </button>
    </div>
  )
}
