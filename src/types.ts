export type Lang = 'ar' | 'en'

export type Tab = 'home' | 'todos' | 'debts' | 'wishlist' | 'alarms' | 'amigo' | 'settings'

export interface Todo {
  id: string
  title: string
  done: boolean
  createdAt: string
  dueDate?: string
}

export type DebtDirection = 'owe' | 'owed'

export interface Debt {
  id: string
  person: string
  /** Remaining balance */
  amount: number
  /** Original total when created */
  originalAmount: number
  currency: string
  note: string
  direction: DebtDirection
  createdAt: string
  settled: boolean
}

export interface WishlistItem {
  id: string
  title: string
  note: string
  done: boolean
  createdAt: string
}

/** @deprecated legacy — migrated to WishlistItem */
export type Expense = WishlistItem & {
  amount?: number
  currency?: string
  dueDate?: string
}

export interface Alarm {
  id: string
  title: string
  at: string
  fired: boolean
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  at: string
}

export interface Settings {
  lang: Lang
  currency: string
  apiKey: string
  apiBase: string
  apiModel: string
  userName: string
  voiceReplies: boolean
  /** Shared secret — same on phone & laptop for one cloud dataset */
  syncCode: string
  syncEnabled: boolean
}

export interface AppData {
  todos: Todo[]
  debts: Debt[]
  wishlist: WishlistItem[]
  alarms: Alarm[]
  chat: ChatMessage[]
  settings: Settings
}

export const CURRENCIES = ['USD', 'EUR', 'SYP', 'TRY', 'AED', 'SAR', 'GBP', 'LBP'] as const

export const defaultSettings: Settings = {
  lang: 'ar',
  currency: 'USD',
  apiKey: '',
  apiBase: 'https://api.openai.com/v1',
  apiModel: 'gpt-4o-mini',
  userName: 'Ayham',
  voiceReplies: true,
  syncCode: '',
  syncEnabled: false,
}

export const emptyData = (): AppData => ({
  todos: [],
  debts: [],
  wishlist: [],
  alarms: [],
  chat: [],
  settings: { ...defaultSettings },
})
