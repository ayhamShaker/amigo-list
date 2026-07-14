import { Mic } from 'lucide-react'
import { t } from '../i18n'
import { useStore } from '../store'

/** Floating mic — one tap to Amigo listen mode without navigating the whole chat first. */
export function QuickTalkFab() {
  const { state, setTab, setListenPending } = useStore()
  const lang = state.data.settings.lang

  if (state.tab === 'amigo') return null

  return (
    <button
      type="button"
      className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-[#0c1117] shadow-lg"
      style={{
        bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        insetInlineEnd: '1rem',
      }}
      aria-label={t('quickTalk', lang)}
      title={t('quickTalk', lang)}
      onClick={() => {
        setListenPending(true)
        setTab('amigo')
      }}
    >
      <Mic size={24} strokeWidth={2.4} />
    </button>
  )
}
