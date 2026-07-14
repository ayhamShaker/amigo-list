import { useEffect } from 'react'
import { AlarmsView } from './components/AlarmsView'
import { AmigoView } from './components/AmigoView'
import { BottomNav } from './components/BottomNav'
import { DebtsView } from './components/DebtsView'
import { HomeView } from './components/HomeView'
import { SettingsView } from './components/SettingsView'
import { TodosView } from './components/TodosView'
import { WishlistView } from './components/WishlistView'
import { StoreProvider, useStore } from './store'
import { useAlarmWatcher } from './useAlarmWatcher'

function Shell() {
  const { state } = useStore()
  useAlarmWatcher()

  useEffect(() => {
    const lang = state.data.settings.lang
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [state.data.settings.lang])

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
      <main className="safe-bottom mx-auto w-full max-w-3xl px-4 pt-4">{view}</main>
      <BottomNav />
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
