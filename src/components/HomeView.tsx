import { ArrowUpRight, Bell, CheckSquare, Sparkles, Wallet } from 'lucide-react'
import { t } from '../i18n'
import { useStore } from '../store'
import { formatRelative, formatWhen } from '../utils'

export function HomeView() {
  const { state, setTab } = useStore()
  const { lang, userName } = state.data.settings
  const pendingTodos = state.data.todos.filter((x) => !x.done)
  const openDebts = state.data.debts.filter((x) => !x.settled)
  const openWish = state.data.wishlist.filter((x) => !x.done)
  const nextAlarm = state.data.alarms
    .filter((a) => !a.fired)
    .sort((a, b) => +new Date(a.at) - +new Date(b.at))[0]

  const hasAnything =
    pendingTodos.length + openDebts.length + openWish.length + (nextAlarm ? 1 : 0) > 0

  return (
    <div className="animate-in space-y-6">
      <header className="pt-2">
        <p className="brand text-sm text-[var(--color-accent)]">AMIGO</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {lang === 'ar' ? `أهلاً ${userName}` : `Hey ${userName}`}
        </h1>
        <p className="mt-1 text-[var(--color-mute)]">{t('tagline', lang)}</p>
      </header>

      {!hasAnything ? (
        <div className="row-card text-center">
          <p className="text-[var(--color-mute)]">{t('nothingPending', lang)}</p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => setTab('amigo')}>
            AMIGO
          </button>
        </div>
      ) : (
        <div className="row-card border-[var(--color-accent)]/20 bg-[rgba(61,220,151,0.06)]">
          <p className="text-sm font-medium text-[var(--color-accent)]">{t('remindYou', lang)}</p>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-mute)]">
          {t('overview', lang)}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat
            icon={CheckSquare}
            label={t('todos', lang)}
            value={`${pendingTodos.length} ${t('left', lang)}`}
            onClick={() => setTab('todos')}
          />
          <Stat
            icon={Wallet}
            label={t('debts', lang)}
            value={String(openDebts.length)}
            onClick={() => setTab('debts')}
          />
          <Stat
            icon={Sparkles}
            label={t('wishlist', lang)}
            value={String(openWish.length)}
            onClick={() => setTab('wishlist')}
          />
          <Stat
            icon={Bell}
            label={t('nextAlarm', lang)}
            value={
              nextAlarm
                ? `${nextAlarm.title} · ${formatRelative(nextAlarm.at, lang)}`
                : '—'
            }
            onClick={() => setTab('alarms')}
          />
        </div>
      </section>

      {pendingTodos.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-mute)]">
              {t('todos', lang)}
            </h2>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-[var(--color-accent)]"
              onClick={() => setTab('todos')}
            >
              {t('today', lang)} <ArrowUpRight size={14} />
            </button>
          </div>
          <ul className="space-y-2">
            {pendingTodos.slice(0, 5).map((todo) => (
              <li key={todo.id} className="row-card flex items-center gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-warn)]" />
                <span className="flex-1">{todo.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nextAlarm && (
        <section className="row-card">
          <p className="text-xs text-[var(--color-mute)]">{t('nextAlarm', lang)}</p>
          <p className="mt-1 text-lg font-semibold">{nextAlarm.title}</p>
          <p className="text-sm text-[var(--color-accent)]">{formatWhen(nextAlarm.at, lang)}</p>
        </section>
      )}

      <p className="text-center text-xs text-[var(--color-mute)] opacity-70">{t('installHint', lang)}</p>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof CheckSquare
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="row-card text-start transition hover:border-[var(--color-accent)]/40">
      <Icon size={16} className="text-[var(--color-accent)]" />
      <p className="mt-2 text-xs text-[var(--color-mute)]">{label}</p>
      <p className="mt-0.5 line-clamp-2 text-sm font-semibold">{value}</p>
    </button>
  )
}
