import {
  Bell,
  CheckSquare,
  Home,
  MessageCircle,
  Settings,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { t } from '../i18n'
import { useStore } from '../store'
import type { Tab } from '../types'

const items: {
  id: Tab
  icon: typeof Home
  labelKey: 'home' | 'todos' | 'debts' | 'wishlist' | 'alarms' | 'amigo'
}[] = [
  { id: 'home', icon: Home, labelKey: 'home' },
  { id: 'todos', icon: CheckSquare, labelKey: 'todos' },
  { id: 'debts', icon: Wallet, labelKey: 'debts' },
  { id: 'wishlist', icon: Sparkles, labelKey: 'wishlist' },
  { id: 'alarms', icon: Bell, labelKey: 'alarms' },
  { id: 'amigo', icon: MessageCircle, labelKey: 'amigo' },
]

export function BottomNav() {
  const { state, setTab } = useStore()
  const lang = state.data.settings.lang

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 glass"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-1 pt-2 pb-2">
        {items.map(({ id, icon: Icon, labelKey }) => {
          const active = state.tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`nav-item flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] ${
                active ? 'active text-[var(--color-accent)]' : 'text-[var(--color-mute)]'
              }`}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                <span className="nav-dot absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 scale-0 rounded-full bg-[var(--color-accent)] opacity-0 transition" />
              </span>
              <span className="font-medium">{t(labelKey, lang)}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`nav-item flex w-10 flex-col items-center gap-0.5 py-1 text-[10px] ${
            state.tab === 'settings' ? 'active text-[var(--color-accent)]' : 'text-[var(--color-mute)]'
          }`}
          aria-label={t('settings', lang)}
        >
          <Settings size={18} strokeWidth={state.tab === 'settings' ? 2.4 : 1.8} />
        </button>
      </div>
    </nav>
  )
}
