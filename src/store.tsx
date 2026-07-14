import { createContext, useContext, useEffect, useReducer, useCallback, useRef, type ReactNode } from 'react'
import { connectCloud, getSyncAt, pullCloud, pushCloud, setSyncAt } from './cloudSync'
import {
  emptyData,
  type Alarm,
  type AppData,
  type ChatMessage,
  type Debt,
  type Settings,
  type Tab,
  type Todo,
  type WishlistItem,
} from './types'

const STORAGE_KEY = 'amigo-data-v1'

type Action =
  | { type: 'HYDRATE'; data: AppData }
  | { type: 'SET_TAB'; tab: Tab }
  | { type: 'SET_CHAT_DRAFT'; draft: string }
  | { type: 'SET_LISTEN_PENDING'; pending: boolean }
  | { type: 'ADD_TODO'; todo: Todo }
  | { type: 'TOGGLE_TODO'; id: string }
  | { type: 'DELETE_TODO'; id: string }
  | { type: 'ADD_DEBT'; debt: Debt }
  | { type: 'PAY_DEBT'; id: string; amount: number }
  | { type: 'DELETE_DEBT'; id: string }
  | { type: 'ADD_WISHLIST'; item: WishlistItem }
  | { type: 'TOGGLE_WISHLIST'; id: string }
  | { type: 'DELETE_WISHLIST'; id: string }
  | { type: 'ADD_ALARM'; alarm: Alarm }
  | { type: 'FIRE_ALARM'; id: string }
  | { type: 'DELETE_ALARM'; id: string }
  | { type: 'ADD_CHAT'; message: ChatMessage }
  | { type: 'SET_SETTINGS'; settings: Partial<Settings> }
  | { type: 'APPLY_BATCH'; patch: Partial<Pick<AppData, 'todos' | 'debts' | 'wishlist' | 'alarms'>> }

interface State {
  data: AppData
  tab: Tab
  chatDraft: string
  listenPending: boolean
  ready: boolean
}

function migrate(raw: unknown): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object') return base
  const parsed = raw as Record<string, unknown>
  const settings = {
    ...base.settings,
    ...((parsed.settings as Partial<Settings>) || {}),
  }
  settings.syncCode = String(settings.syncCode || '')
  settings.syncEnabled = Boolean(settings.syncEnabled)

  const debtsRaw = Array.isArray(parsed.debts) ? parsed.debts : []
  const debts: Debt[] = debtsRaw.map((d) => {
    const debt = d as Partial<Debt> & { amount?: number }
    const amount = Number(debt.amount) || 0
    return {
      id: String(debt.id || `${Date.now()}`),
      person: String(debt.person || ''),
      amount,
      originalAmount: Number(debt.originalAmount) || amount,
      currency: String(debt.currency || settings.currency),
      note: String(debt.note || ''),
      direction: debt.direction === 'owed' ? 'owed' : 'owe',
      createdAt: String(debt.createdAt || new Date().toISOString()),
      settled: Boolean(debt.settled),
    }
  })

  let wishlist: WishlistItem[] = []
  if (Array.isArray(parsed.wishlist)) {
    wishlist = (parsed.wishlist as WishlistItem[]).map((w) => ({
      id: w.id,
      title: w.title,
      note: w.note || '',
      done: Boolean(w.done),
      createdAt: w.createdAt || new Date().toISOString(),
    }))
  } else if (Array.isArray(parsed.expenses)) {
    wishlist = (parsed.expenses as Array<Record<string, unknown>>).map((e) => ({
      id: String(e.id || `${Date.now()}`),
      title: String(e.title || ''),
      note: String(e.note || ''),
      done: Boolean(e.done),
      createdAt: String(e.createdAt || new Date().toISOString()),
    }))
  }

  return {
    todos: Array.isArray(parsed.todos) ? (parsed.todos as Todo[]) : [],
    debts,
    wishlist,
    alarms: Array.isArray(parsed.alarms) ? (parsed.alarms as Alarm[]) : [],
    chat: Array.isArray(parsed.chat) ? (parsed.chat as ChatMessage[]) : [],
    settings,
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, data: action.data, ready: true }
    case 'SET_TAB':
      return { ...state, tab: action.tab }
    case 'SET_CHAT_DRAFT':
      return { ...state, chatDraft: action.draft }
    case 'SET_LISTEN_PENDING':
      return { ...state, listenPending: action.pending }
    case 'ADD_TODO':
      return { ...state, data: { ...state.data, todos: [action.todo, ...state.data.todos] } }
    case 'TOGGLE_TODO':
      return {
        ...state,
        data: {
          ...state.data,
          todos: state.data.todos.map((t) =>
            t.id === action.id ? { ...t, done: !t.done } : t,
          ),
        },
      }
    case 'DELETE_TODO':
      return {
        ...state,
        data: { ...state.data, todos: state.data.todos.filter((t) => t.id !== action.id) },
      }
    case 'ADD_DEBT':
      return { ...state, data: { ...state.data, debts: [action.debt, ...state.data.debts] } }
    case 'PAY_DEBT':
      return {
        ...state,
        data: {
          ...state.data,
          debts: state.data.debts.map((d) => {
            if (d.id !== action.id) return d
            const paid = Math.min(Math.max(0, action.amount), d.amount)
            const remaining = Math.round((d.amount - paid) * 100) / 100
            if (remaining <= 0) return { ...d, amount: 0, settled: true }
            return { ...d, amount: remaining }
          }),
        },
      }
    case 'DELETE_DEBT':
      return {
        ...state,
        data: { ...state.data, debts: state.data.debts.filter((d) => d.id !== action.id) },
      }
    case 'ADD_WISHLIST':
      return {
        ...state,
        data: { ...state.data, wishlist: [action.item, ...state.data.wishlist] },
      }
    case 'TOGGLE_WISHLIST':
      return {
        ...state,
        data: {
          ...state.data,
          wishlist: state.data.wishlist.map((w) =>
            w.id === action.id ? { ...w, done: !w.done } : w,
          ),
        },
      }
    case 'DELETE_WISHLIST':
      return {
        ...state,
        data: {
          ...state.data,
          wishlist: state.data.wishlist.filter((w) => w.id !== action.id),
        },
      }
    case 'ADD_ALARM':
      return {
        ...state,
        data: { ...state.data, alarms: [action.alarm, ...state.data.alarms] },
      }
    case 'FIRE_ALARM':
      return {
        ...state,
        data: {
          ...state.data,
          alarms: state.data.alarms.map((a) =>
            a.id === action.id ? { ...a, fired: true } : a,
          ),
        },
      }
    case 'DELETE_ALARM':
      return {
        ...state,
        data: {
          ...state.data,
          alarms: state.data.alarms.filter((a) => a.id !== action.id),
        },
      }
    case 'ADD_CHAT':
      return {
        ...state,
        data: { ...state.data, chat: [...state.data.chat, action.message] },
      }
    case 'SET_SETTINGS':
      return {
        ...state,
        data: {
          ...state.data,
          settings: { ...state.data.settings, ...action.settings },
        },
      }
    case 'APPLY_BATCH': {
      const next = { ...state.data }
      if (action.patch.todos?.length) next.todos = [...action.patch.todos, ...next.todos]
      if (action.patch.debts?.length) next.debts = [...action.patch.debts, ...next.debts]
      if (action.patch.wishlist?.length) next.wishlist = [...action.patch.wishlist, ...next.wishlist]
      if (action.patch.alarms?.length) next.alarms = [...action.patch.alarms, ...next.alarms]
      return { ...state, data: next }
    }
    default:
      return state
  }
}

interface StoreCtx {
  state: State
  setTab: (tab: Tab) => void
  setChatDraft: (draft: string) => void
  setListenPending: (pending: boolean) => void
  addTodo: (title: string, dueDate?: string) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  addDebt: (input: Omit<Debt, 'id' | 'createdAt' | 'settled' | 'originalAmount'> & { originalAmount?: number }) => void
  payDebt: (id: string, amount: number) => void
  deleteDebt: (id: string) => void
  addWishlist: (title: string, note?: string) => void
  toggleWishlist: (id: string) => void
  deleteWishlist: (id: string) => void
  addAlarm: (title: string, at: string) => void
  fireAlarm: (id: string) => void
  deleteAlarm: (id: string) => void
  addChat: (role: ChatMessage['role'], content: string) => void
  setSettings: (s: Partial<Settings>) => void
  applyBatch: (patch: Partial<Pick<AppData, 'todos' | 'debts' | 'wishlist' | 'alarms'>>) => void
  importData: (raw: unknown) => boolean
  uid: () => string
}

const Ctx = createContext<StoreCtx | null>(null)

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    data: emptyData(),
    tab: 'home' as Tab,
    chatDraft: '',
    listenPending: false,
    ready: false,
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      dispatch({ type: 'HYDRATE', data: raw ? migrate(JSON.parse(raw)) : emptyData() })
    } catch {
      dispatch({ type: 'HYDRATE', data: emptyData() })
    }
  }, [])

  useEffect(() => {
    if (!state.ready) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data))
  }, [state.data, state.ready])

  const applyingRemoteRef = useRef(false)
  const skipPushRef = useRef(false)
  const syncBootstrappedRef = useRef(false)
  const dataRef = useRef(state.data)
  dataRef.current = state.data

  // Cloud sync: connect + poll
  useEffect(() => {
    if (!state.ready) return
    const { syncEnabled, syncCode } = state.data.settings
    const code = syncCode.trim()
    if (!syncEnabled || !code) {
      syncBootstrappedRef.current = false
      return
    }

    let cancelled = false
    syncBootstrappedRef.current = false

    const applyRemote = (data: AppData, updatedAt: number) => {
      applyingRemoteRef.current = true
      skipPushRef.current = true
      dispatch({ type: 'HYDRATE', data: migrate(data) })
      setSyncAt(updatedAt)
      queueMicrotask(() => {
        applyingRemoteRef.current = false
      })
    }

    ;(async () => {
      try {
        const result = await connectCloud(code, dataRef.current)
        if (cancelled) return
        if (result.source === 'remote') {
          applyRemote(migrate(result.data), result.updatedAt)
        } else {
          setSyncAt(result.updatedAt)
        }
        syncBootstrappedRef.current = true
      } catch {
        syncBootstrappedRef.current = true
      }
    })()

    const poll = window.setInterval(() => {
      void (async () => {
        if (cancelled || applyingRemoteRef.current || !syncBootstrappedRef.current) return
        try {
          const remote = await pullCloud(code)
          if (!remote || cancelled) return
          if (remote.updatedAt > getSyncAt()) {
            applyRemote(migrate(remote.data), remote.updatedAt)
          }
        } catch {
          /* ignore */
        }
      })()
    }, 4000)

    const onFocus = () => {
      void (async () => {
        if (!syncBootstrappedRef.current) return
        try {
          const remote = await pullCloud(code)
          if (!remote || cancelled) return
          if (remote.updatedAt > getSyncAt()) {
            applyRemote(migrate(remote.data), remote.updatedAt)
          }
        } catch {
          /* ignore */
        }
      })()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      cancelled = true
      syncBootstrappedRef.current = false
      window.clearInterval(poll)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [state.ready, state.data.settings.syncEnabled, state.data.settings.syncCode])

  // Cloud sync: push local edits
  useEffect(() => {
    if (!state.ready) return
    const { syncEnabled, syncCode } = state.data.settings
    const code = syncCode.trim()
    if (!syncEnabled || !code) return
    if (!syncBootstrappedRef.current) return
    if (skipPushRef.current) {
      skipPushRef.current = false
      return
    }
    if (applyingRemoteRef.current) return

    const timer = window.setTimeout(() => {
      if (!syncBootstrappedRef.current || applyingRemoteRef.current) return
      void pushCloud(code, dataRef.current)
        .then((at) => setSyncAt(at))
        .catch(() => {
          /* ignore */
        })
    }, 900)

    return () => window.clearTimeout(timer)
  }, [state.ready, state.data])

  const setTab = useCallback((tab: Tab) => dispatch({ type: 'SET_TAB', tab }), [])
  const setChatDraft = useCallback((draft: string) => dispatch({ type: 'SET_CHAT_DRAFT', draft }), [])
  const setListenPending = useCallback(
    (pending: boolean) => dispatch({ type: 'SET_LISTEN_PENDING', pending }),
    [],
  )
  const addTodo = useCallback((title: string, dueDate?: string) => {
    dispatch({
      type: 'ADD_TODO',
      todo: {
        id: uid(),
        title: title.trim(),
        done: false,
        createdAt: new Date().toISOString(),
        dueDate,
      },
    })
  }, [])
  const toggleTodo = useCallback((id: string) => dispatch({ type: 'TOGGLE_TODO', id }), [])
  const deleteTodo = useCallback((id: string) => dispatch({ type: 'DELETE_TODO', id }), [])
  const addDebt = useCallback(
    (input: Omit<Debt, 'id' | 'createdAt' | 'settled' | 'originalAmount'> & { originalAmount?: number }) => {
      const amount = input.amount
      dispatch({
        type: 'ADD_DEBT',
        debt: {
          ...input,
          amount,
          originalAmount: input.originalAmount ?? amount,
          id: uid(),
          createdAt: new Date().toISOString(),
          settled: false,
        },
      })
    },
    [],
  )
  const payDebt = useCallback((id: string, amount: number) => dispatch({ type: 'PAY_DEBT', id, amount }), [])
  const deleteDebt = useCallback((id: string) => dispatch({ type: 'DELETE_DEBT', id }), [])
  const addWishlist = useCallback((title: string, note = '') => {
    dispatch({
      type: 'ADD_WISHLIST',
      item: {
        id: uid(),
        title: title.trim(),
        note: note.trim(),
        done: false,
        createdAt: new Date().toISOString(),
      },
    })
  }, [])
  const toggleWishlist = useCallback((id: string) => dispatch({ type: 'TOGGLE_WISHLIST', id }), [])
  const deleteWishlist = useCallback((id: string) => dispatch({ type: 'DELETE_WISHLIST', id }), [])
  const addAlarm = useCallback((title: string, at: string) => {
    dispatch({
      type: 'ADD_ALARM',
      alarm: {
        id: uid(),
        title: title.trim(),
        at,
        fired: false,
        createdAt: new Date().toISOString(),
      },
    })
  }, [])
  const fireAlarm = useCallback((id: string) => dispatch({ type: 'FIRE_ALARM', id }), [])
  const deleteAlarm = useCallback((id: string) => dispatch({ type: 'DELETE_ALARM', id }), [])
  const addChat = useCallback((role: ChatMessage['role'], content: string) => {
    dispatch({
      type: 'ADD_CHAT',
      message: {
        id: uid(),
        role,
        content,
        at: new Date().toISOString(),
      },
    })
  }, [])
  const setSettings = useCallback((settings: Partial<Settings>) => dispatch({ type: 'SET_SETTINGS', settings }), [])
  const applyBatch = useCallback(
    (patch: Partial<Pick<AppData, 'todos' | 'debts' | 'wishlist' | 'alarms'>>) =>
      dispatch({ type: 'APPLY_BATCH', patch }),
    [],
  )
  const importData = useCallback((raw: unknown) => {
    try {
      if (!raw || typeof raw !== 'object') return false
      const o = raw as Record<string, unknown>
      if (!('settings' in o || 'todos' in o || 'debts' in o || 'wishlist' in o || 'alarms' in o || 'chat' in o)) {
        return false
      }
      const data = migrate(raw)
      dispatch({ type: 'HYDRATE', data })
      return true
    } catch {
      return false
    }
  }, [])

  const value: StoreCtx = {
    state,
    setTab,
    setChatDraft,
    setListenPending,
    addTodo,
    toggleTodo,
    deleteTodo,
    addDebt,
    payDebt,
    deleteDebt,
    addWishlist,
    toggleWishlist,
    deleteWishlist,
    addAlarm,
    fireAlarm,
    deleteAlarm,
    addChat,
    setSettings,
    applyBatch,
    importData,
    uid,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
