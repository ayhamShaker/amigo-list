import { Bell, CheckSquare, Home, Menu, Mic, Settings, Sparkles, Wallet, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { useStore } from '../store'
import type { Tab } from '../types'

const primary: { id: Tab; icon: typeof Home; labelKey: 'home' | 'todos' | 'debts' }[] = [
  { id: 'home', icon: Home, labelKey: 'home' },
  { id: 'todos', icon: CheckSquare, labelKey: 'todos' },
  { id: 'debts', icon: Wallet, labelKey: 'debts' },
]

const moreItems: { id: Tab; icon: typeof Home; labelKey: 'wishlist' | 'alarms' | 'settings' }[] = [
  { id: 'wishlist', icon: Sparkles, labelKey: 'wishlist' },
  { id: 'alarms', icon: Bell, labelKey: 'alarms' },
  { id: 'settings', icon: Settings, labelKey: 'settings' },
]

export function BottomNav() {
  const { state, setTab, setListenPending } = useStore()
  const lang = state.data.settings.lang
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = moreItems.some((x) => x.id === state.tab)

  useEffect(() => {
    setMoreOpen(false)
  }, [state.tab])

  const goTalk = () => {
    setListenPending(true)
    setTab('amigo')
  }

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-45" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="glass absolute inset-x-0 bottom-0 rounded-t-3xl p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{t('more', lang)}</p>
              <button type="button" className="btn btn-ghost p-2" onClick={() => setMoreOpen(false)} aria-label={t('cancel', lang)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map(({ id, icon: Icon, labelKey }) => (
                <button
                  key={id}
                  type="button"
                  className={`row-card flex flex-col items-center gap-2 py-4 ${
                    state.tab === id ? 'border-[var(--color-accent)]/40' : ''
                  }`}
                  onClick={() => {
                    setTab(id)
                    setMoreOpen(false)
                  }}
                >
                  <Icon size={22} className="text-[var(--color-accent)]" />
                  <span className="text-xs font-medium">{t(labelKey, lang)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav glass" aria-label="AMIGO">
        <div className="bottom-nav-inner">
          {primary.slice(0, 2).map(({ id, icon: Icon, labelKey }) => {
            const active = state.tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span>{t(labelKey, lang)}</span>
              </button>
            )
          })}

          <button type="button" className="nav-amigo" onClick={goTalk} aria-label={t('quickTalk', lang)}>
            <span className="nav-amigo-btn">
              <Mic size={26} strokeWidth={2.4} />
            </span>
            <span className="nav-amigo-label">{t('quickTalkShort', lang)}</span>
          </button>

          {primary.slice(2).map(({ id, icon: Icon, labelKey }) => {
            const active = state.tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span>{t(labelKey, lang)}</span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`nav-item ${moreActive || moreOpen ? 'active' : ''}`}
          >
            <Menu size={22} strokeWidth={moreActive || moreOpen ? 2.4 : 1.8} />
            <span>{t('more', lang)}</span>
          </button>
        </div>
      </nav>
    </>
  )
}
