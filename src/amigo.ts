import type { Alarm, AppData, Debt, Settings, Todo, WishlistItem } from './types'

export interface AmigoAction {
  type: string
  title?: string
  person?: string
  amount?: number | string
  currency?: string
  note?: string
  direction?: 'owe' | 'owed' | string
  dueDate?: string
  at?: string
  afterMinutes?: number | string
  debtId?: string
  message?: string
  text?: string
  name?: string
  task?: string
  item?: string
}

export interface AmigoResult {
  reply: string
  actions: AmigoAction[]
  todos: Todo[]
  debts: Debt[]
  wishlist: WishlistItem[]
  alarms: Alarm[]
  payments: { debtId: string; amount: number }[]
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const cleaned = v
      .replace(/[^\d.,\-]/g, '')
      .replace(/,/g, '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function normalizeType(type: string): string {
  const t = type.toLowerCase().replace(/[\s-]+/g, '_')
  const map: Record<string, string> = {
    add_todo: 'add_todo',
    todo: 'add_todo',
    task: 'add_todo',
    add_task: 'add_todo',
    create_todo: 'add_todo',
    create_task: 'add_todo',
    new_todo: 'add_todo',
    new_task: 'add_todo',
    add_debt: 'add_debt',
    debt: 'add_debt',
    create_debt: 'add_debt',
    owe: 'add_debt',
    pay_debt: 'pay_debt',
    settle_debt: 'pay_debt',
    pay: 'pay_debt',
    add_wishlist: 'add_wishlist',
    wishlist: 'add_wishlist',
    add_wish: 'add_wishlist',
    wish: 'add_wishlist',
    add_expense: 'add_wishlist',
    expense: 'add_wishlist',
    add_alarm: 'add_alarm',
    alarm: 'add_alarm',
    set_alarm: 'add_alarm',
    reminder: 'add_alarm',
    add_reminder: 'add_alarm',
    notify: 'add_alarm',
    reply: 'reply',
  }
  return map[t] || t
}

function systemPrompt(data: AppData, nowIso: string): string {
  const lang = data.settings.lang
  const pendingTodos = data.todos.filter((t) => !t.done).slice(0, 12)
  const openDebts = data.debts.filter((d) => !d.settled).slice(0, 12)
  const openWish = data.wishlist.filter((e) => !e.done).slice(0, 12)
  const activeAlarms = data.alarms.filter((a) => !a.fired).slice(0, 8)

  return `You are AMIGO, personal assistant for ${data.settings.userName}.
NOW (ISO): ${nowIso}
Language: ${lang === 'ar' ? 'Arabic Levantine' : 'English'}
Default currency: ${data.settings.currency}

Reply in the user language. Short and warm.

CRITICAL: Respond with ONLY a JSON object (no markdown). Always include real actions when the user asks to add/log something. Do not claim you did something without putting it in actions.

Schema:
{"reply":"short confirmation","actions":[...]}

Action types (use these exact type strings):
1) {"type":"add_todo","title":"..."}
2) {"type":"add_debt","person":"...","amount":123,"currency":"USD","direction":"owe"|"owed","note":"..."}
   - owe = user owes them; owed = they owe user
   - amount MUST be a JSON number (not string)
3) {"type":"pay_debt","person":"...","amount":50}  (partial OK; amount number)
4) {"type":"add_wishlist","title":"...","note":"..."}  // later items, NOT today todos
5) {"type":"add_alarm","title":"...","afterMinutes":120}  // afterMinutes MUST be JSON number
   OR {"type":"add_alarm","title":"...","at":"ISO datetime"}

Examples:
User: حط تاسك تصليح موقع carease
→ {"reply":"تم، سجلت المهمة.","actions":[{"type":"add_todo","title":"تصليح موقع carease"}]}

User: شغل منبه بعد ساعتين باسم تسلم فريق MILFAWE
→ {"reply":"المنبه بعد ساعتين جاهز.","actions":[{"type":"add_alarm","title":"تسلم فريق MILFAWE","afterMinutes":120}]}

User: أنا مديون لأحمد 350 دولار
→ {"reply":"سجّلت الدين.","actions":[{"type":"add_debt","person":"أحمد","amount":350,"currency":"USD","direction":"owe"}]}

User: ضيف wishlist شراء رامات
→ {"reply":"ضايفته للقائمة.","actions":[{"type":"add_wishlist","title":"شراء رامات"}]}

Context:
Todos: ${JSON.stringify(pendingTodos.map((t) => t.title))}
Debts: ${JSON.stringify(openDebts.map((d) => ({ id: d.id, person: d.person, amount: d.amount, currency: d.currency, direction: d.direction })))}
Wishlist: ${JSON.stringify(openWish.map((w) => w.title))}
Alarms: ${JSON.stringify(activeAlarms.map((a) => ({ title: a.title, at: a.at })))}`
}

/** Offline/heuristic intents when the model forgets to emit actions */
export function parseLocalIntents(message: string, settings: Settings): AmigoAction[] {
  const m = message.trim()
  const actions: AmigoAction[] = []
  const lower = m.toLowerCase()

  // Alarm: بعد X ساعة/دقيقة
  const alarmAfter =
    m.match(/(?:منبه|تنبيه|alarm|remind)\s*.*?(?:بعد|in)\s*(\d+)\s*(ساعة|ساعه|ساعات|ساعةً|hour|hours|دقيقة|دقايق|minutes|minute|د)/i) ||
    m.match(/(?:بعد)\s*(\d+)\s*(ساعة|ساعه|ساعات|hour|hours|دقيقة|دقايق|minutes|minute)/i)
  if (alarmAfter || /منبه|تنبيه|alarm/.test(lower)) {
    let minutes = 60
    if (alarmAfter) {
      const n = Number(alarmAfter[1])
      const unit = alarmAfter[2]
      minutes = /د|min/i.test(unit) ? n : n * 60
    }
    const titleMatch =
      m.match(/(?:باسم|اسمه|اسمها|title|named|name)\s+(.+)$/i) ||
      m.match(/منبه\s+(.+?)(?:\s+بعد|$)/i)
    const title = (titleMatch?.[1] || m.replace(/شغل|حط|منبه|تنبيه|بعد\s*\d+\s*\S+/gi, '').trim()) || 'منبه'
    if (/منبه|تنبيه|alarm|remind/.test(lower)) {
      actions.push({ type: 'add_alarm', title: title.slice(0, 80), afterMinutes: minutes })
    }
  }

  // Todo / task
  const todoMatch =
    m.match(/(?:تاسك|task|مهمة|todo|حطلي|سجل|سجلي)\s*(?:باسم|:)?\s*(.+)/i) ||
    m.match(/(?:اضف|أضف|ضيف)\s+(?:مهمة|تاسك|task)\s+(.+)/i)
  if (todoMatch?.[1] && !/دين|مديون|wishlist|امنية|أمنية|منبه/.test(todoMatch[1])) {
    actions.push({ type: 'add_todo', title: todoMatch[1].trim().slice(0, 120) })
  }

  // Wishlist
  if (/wishlist|قائمة\s*امن|أمنيات|امنية|أمنية|لاحقا|بعدين/.test(lower) || /ضيف.*(?:شراء|رام)/i.test(m)) {
    const wish =
      m.match(/(?:wishlist|أمنية|امنية|أمنيات)\s*(?:باسم|:)?\s*(.+)/i)?.[1] ||
      m.match(/(?:ضيف|أضف|اضف)\s+(.+)/i)?.[1]
    if (wish && !/تاسك|مهمة|منبه|دين/.test(wish)) {
      actions.push({ type: 'add_wishlist', title: wish.trim().slice(0, 120) })
    }
  }

  // Debt: مديون / مستحق
  const debtAmount = m.match(/(\d+(?:[.,]\d+)?)\s*(دولار|usd|\$|eur|euro|ليرة|syp|try|تركي|دولار|$)?/i)
  const person =
    m.match(/(?:ل|من|لـ)\s*([^\d\s][\u0600-\u06FFa-zA-Z]{1,30})/)?.[1] ||
    m.match(/(?:شخص|اسم)\s+([^\d\s].{1,30})/)?.[1]

  if ((/مديون|مدين|أستلف|استلف|owe/i.test(m) || /مستحق|يدين|عليّ|عليا/i.test(m)) && debtAmount) {
    const amount = num(debtAmount[1])
    if (amount != null && person) {
      let currency = settings.currency
      const curRaw = (debtAmount[2] || '').toLowerCase()
      if (/دولار|usd|\$/.test(curRaw)) currency = 'USD'
      else if (/eur|euro/.test(curRaw)) currency = 'EUR'
      else if (/syp|ليرة س|سوري/.test(curRaw)) currency = 'SYP'
      else if (/try|تركي/.test(curRaw)) currency = 'TRY'

      const direction = /مستحق|يدينني|عليهم|owed to me|they owe/i.test(m) ? 'owed' : 'owe'
      actions.push({
        type: 'add_debt',
        person: person.trim(),
        amount,
        currency,
        direction,
      })
    }
  }

  // Partial pay
  const payMatch = m.match(/(?:سدد|ادفع|دفعت|pay)\s*(?:ل|لـ)?\s*([^\d\s]{2,30})?\s*(\d+)/i)
  if (payMatch && /سدد|ادفع|دفعت|pay/i.test(m)) {
    const amount = num(payMatch[2])
    if (amount != null) {
      actions.push({ type: 'pay_debt', person: payMatch[1]?.trim(), amount })
    }
  }

  return actions
}

function actionsToEntities(
  actions: AmigoAction[],
  settings: Settings,
  data: AppData,
  now: Date,
): Pick<AmigoResult, 'todos' | 'debts' | 'wishlist' | 'alarms' | 'payments'> {
  const todos: Todo[] = []
  const debts: Debt[] = []
  const wishlist: WishlistItem[] = []
  const alarms: Alarm[] = []
  const payments: { debtId: string; amount: number }[] = []
  const createdAt = now.toISOString()

  for (const raw of actions) {
    const type = normalizeType(String(raw.type || ''))
    const title = str(raw.title || raw.text || raw.task || raw.item || raw.name || raw.message)

    if (type === 'add_todo' && title) {
      todos.push({
        id: uid(),
        title,
        done: false,
        createdAt,
        dueDate: raw.dueDate,
      })
    }

    if (type === 'add_debt') {
      const person = str(raw.person || raw.name)
      const amount = num(raw.amount)
      if (person && amount != null && amount > 0) {
        debts.push({
          id: uid(),
          person,
          amount,
          originalAmount: amount,
          currency: str(raw.currency) || settings.currency,
          note: str(raw.note),
          direction: raw.direction === 'owed' ? 'owed' : 'owe',
          createdAt,
          settled: false,
        })
      }
    }

    if (type === 'pay_debt') {
      const amount = num(raw.amount)
      if (amount != null && amount > 0) {
        let debtId = str(raw.debtId)
        const person = str(raw.person || raw.name)
        if (!debtId && person) {
          const match = data.debts.find(
            (d) => !d.settled && d.person.toLowerCase().includes(person.toLowerCase()),
          )
          debtId = match?.id || ''
        }
        if (debtId) payments.push({ debtId, amount })
      }
    }

    if (type === 'add_wishlist' && title) {
      wishlist.push({
        id: uid(),
        title,
        note: str(raw.note),
        done: false,
        createdAt,
      })
    }

    if (type === 'add_alarm' && title) {
      let at = str(raw.at) || undefined
      const after = num(raw.afterMinutes)
      if (!at && after != null) {
        at = new Date(now.getTime() + after * 60_000).toISOString()
      }
      if (at) {
        alarms.push({
          id: uid(),
          title,
          at,
          fired: false,
          createdAt,
        })
      }
    }
  }

  return { todos, debts, wishlist, alarms, payments }
}

function parseJsonPayload(text: string): { reply: string; actions: AmigoAction[] } {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fence ? fence[1].trim() : trimmed
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) {
    return { reply: trimmed, actions: [] }
  }
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
    const reply = str(parsed.reply) || trimmed
    let actions: AmigoAction[] = []
    if (Array.isArray(parsed.actions)) {
      actions = parsed.actions as AmigoAction[]
    } else if (Array.isArray(parsed.action)) {
      actions = parsed.action as AmigoAction[]
    } else if (parsed.type) {
      actions = [parsed as unknown as AmigoAction]
    }
    return { reply, actions }
  } catch {
    return { reply: trimmed, actions: [] }
  }
}

function mergeActions(primary: AmigoAction[], fallback: AmigoAction[]): AmigoAction[] {
  if (primary.length > 0) return primary
  return fallback
}

export async function askAmigo(
  userMessage: string,
  data: AppData,
): Promise<AmigoResult> {
  const { apiKey, apiBase, apiModel } = data.settings
  if (!apiKey.trim()) {
    throw new Error('NO_API_KEY')
  }

  const now = new Date()
  const base = apiBase.replace(/\/$/, '')
  const localActions = parseLocalIntents(userMessage, data.settings)

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: apiModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt(data, now.toISOString()) },
        ...data.chat.slice(-6).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ],
    }),
  })

  // Some providers reject response_format — retry without it
  let content = ''
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    if (res.status === 400 && /response_format|json_object/i.test(errText)) {
      const retry = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: apiModel,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt(data, now.toISOString()) },
            { role: 'user', content: userMessage },
          ],
        }),
      })
      if (!retry.ok) {
        const t2 = await retry.text().catch(() => '')
        throw new Error(`API ${retry.status}: ${t2.slice(0, 200)}`)
      }
      const j2 = (await retry.json()) as { choices?: { message?: { content?: string } }[] }
      content = j2.choices?.[0]?.message?.content || ''
    } else {
      throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`)
    }
  } else {
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    content = json.choices?.[0]?.message?.content || ''
  }

  const { reply, actions: aiActions } = parseJsonPayload(content)
  const actions = mergeActions(aiActions, localActions)
  const entities = actionsToEntities(actions, data.settings, data, now)

  // If model replied but produced nothing, still try local intents
  if (
    entities.todos.length +
      entities.debts.length +
      entities.wishlist.length +
      entities.alarms.length +
      entities.payments.length ===
      0 &&
    localActions.length > 0
  ) {
    return {
      reply,
      actions: localActions,
      ...actionsToEntities(localActions, data.settings, data, now),
    }
  }

  return {
    reply,
    actions,
    ...entities,
  }
}

export function speakText(text: string, lang: 'ar' | 'en') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang === 'ar' ? 'ar-SA' : 'en-US'
  u.rate = 1.05
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
