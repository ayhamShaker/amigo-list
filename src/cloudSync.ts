import type { AppData } from './types'

const MANTLE = 'https://mantledb.sh/v2'
const MAX_BYTES = 60_000
export const SYNC_AT_KEY = 'amigo-sync-at-v1'

export type SyncEnvelope = {
  updatedAt: number
  data: AppData
}

async function nsFromCode(code: string): Promise<string> {
  const raw = `amigo-list:${code.trim().toLowerCase()}`
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `amigolist-${hex.slice(0, 28)}`
}

function trimForCloud(data: AppData): AppData {
  let payload = data
  let json = JSON.stringify(payload)
  if (json.length <= MAX_BYTES) return payload
  let chat = [...data.chat]
  while (json.length > MAX_BYTES && chat.length > 10) {
    chat = chat.slice(-Math.floor(chat.length * 0.7))
    payload = { ...data, chat }
    json = JSON.stringify(payload)
  }
  if (json.length > MAX_BYTES) {
    payload = { ...payload, chat: payload.chat.slice(-5) }
  }
  return payload
}

export function getSyncAt(): number {
  try {
    return Number(localStorage.getItem(SYNC_AT_KEY) || 0)
  } catch {
    return 0
  }
}

export function setSyncAt(n: number) {
  try {
    localStorage.setItem(SYNC_AT_KEY, String(n))
  } catch {
    /* ignore */
  }
}

export async function pullCloud(syncCode: string): Promise<SyncEnvelope | null> {
  const code = syncCode.trim()
  if (!code) return null
  const ns = await nsFromCode(code)
  const res = await fetch(`${MANTLE}/${ns}/state`, {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`sync pull ${res.status}`)
  const body = (await res.json()) as Partial<SyncEnvelope>
  if (!body || typeof body !== 'object' || !body.data || typeof body.updatedAt !== 'number') {
    return null
  }
  return { updatedAt: body.updatedAt, data: body.data as AppData }
}

export async function pushCloud(syncCode: string, data: AppData, updatedAt = Date.now()): Promise<number> {
  const code = syncCode.trim()
  if (!code) throw new Error('empty sync code')
  const ns = await nsFromCode(code)
  const envelope: SyncEnvelope = { updatedAt, data: trimForCloud(data) }
  const res = await fetch(`${MANTLE}/${ns}/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(envelope),
  })
  if (!res.ok) throw new Error(`sync push ${res.status}`)
  return updatedAt
}

/** First join / enable: pull shared copy if any, otherwise upload local. */
export async function connectCloud(
  syncCode: string,
  local: AppData,
): Promise<{ data: AppData; updatedAt: number; source: 'remote' | 'local' }> {
  const remote = await pullCloud(syncCode)
  const localAt = getSyncAt()
  if (!remote) {
    const updatedAt = await pushCloud(syncCode, local)
    return { data: local, updatedAt, source: 'local' }
  }
  if (remote.updatedAt >= localAt) {
    return { data: remote.data, updatedAt: remote.updatedAt, source: 'remote' }
  }
  const updatedAt = await pushCloud(syncCode, local)
  return { data: local, updatedAt, source: 'local' }
}

export async function cloudNamespace(syncCode: string): Promise<string | null> {
  const code = syncCode.trim()
  if (!code) return null
  return nsFromCode(code)
}

export async function cloudStateUrl(syncCode: string): Promise<string | null> {
  const ns = await cloudNamespace(syncCode)
  if (!ns) return null
  return `${MANTLE}/${ns}/state`
}
