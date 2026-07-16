import { useEffect } from 'react'
import { AlarmRing } from './components/AlarmRing'
import { AlarmsView } from './components/AlarmsView'
import { AmigoView } from './components/AmigoView'
import { BottomNav } from './components/BottomNav'
import { DebtsView } from './components/DebtsView'
import { HomeView } from './components/HomeView'
import { SettingsView } from './components/SettingsView'
import { TodosView } from './components/TodosView'
import { WishlistView } from './components/WishlistView'
import { StoreProvider, useStore } from './store'
import type { Tab } from './types'
import { useAlarmWatcher } from './useAlarmWatcher'

const TABS: Tab[] = ['home', 'todos', 'debts', 'wishlist', 'alarms', 'amigo', 'settings']

function Shell() {
  const { state, setTab, setListenPending } = useStore()
  useAlarmWatcher()

  useEffect(() => {
    const lang = state.data.settings.lang
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [state.data.settings.lang])

  useEffect(() => {
    if (!state.ready) return
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    const listen = params.get('listen')
    if (tab && (TABS as string[]).includes(tab)) {
      setTab(tab as Tab)
    } else if (state.data.settings.openOnTalk && listen !== '1') {
      // Land straight on the talk screen so the keyboard/dictation is one tap away
      setTab('amigo')
    }
    if (listen === '1') {
      setListenPending(true)
      if (!tab) setTab('amigo')
    }
    if (tab || listen) {
      window.history.replaceState({}, '', window.location.pathname || '/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ready])

  if (!state.ready) {
    return (
      <div className="app-shell flex items-center justify-center">
        <p className="brand pulse-soft text-[var(--color-accent)]">AMIGO</p>
      </div>
    )
  }

  const view = (() => {
    switch (state.tab) {
      case 'home':
        return <HomeView />
      case 'todos':
        return <TodosView />
      case 'debts':
        return <DebtsView />
      case 'wishlist':
        return <WishlistView />
      case 'alarms':
        return <AlarmsView />
      case 'amigo':
        return <AmigoView />
      case 'settings':
        return <SettingsView />
      default:
        return <HomeView />
    }
  })()

  return (
    <div className="app-shell safe-top">
      <main className="page">{view}</main>
      <BottomNav />
      <AlarmRing />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
