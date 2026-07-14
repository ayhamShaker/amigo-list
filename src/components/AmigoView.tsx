import { Mic, MicOff, Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { askAmigo, speakText, stopSpeaking } from '../amigo'
import { t } from '../i18n'
import { useStore } from '../store'

interface SpeechResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResultLike> }) => void) | null
}

type SpeechCtor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor
    webkitSpeechRecognition?: SpeechCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function AmigoView() {
  const { state, addChat, applyBatch, payDebt, addTodo, addDebt, addWishlist, addAlarm, setTab, setChatDraft } =
    useStore()
  const lang = state.data.settings.lang
  const input = state.chatDraft
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recogRef = useRef<SpeechRecognitionLike | null>(null)
  const dataRef = useRef(state.data)
  const busyRef = useRef(false)

  const messages = state.data.chat

  useEffect(() => {
    dataRef.current = state.data
  }, [state.data])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, busy, listening])

  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }, [input])

  useEffect(() => {
    return () => {
      recogRef.current?.stop()
      stopSpeaking()
    }
  }, [])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busyRef.current) return
    setChatDraft('')
    setSpeechError('')
    addChat('user', trimmed)
    setBusy(true)
    try {
      const current = dataRef.current
      const nextData = {
        ...current,
        chat: [
          ...current.chat,
          { id: 'temp', role: 'user' as const, content: trimmed, at: new Date().toISOString() },
        ],
      }
      const result = await askAmigo(trimmed, nextData)

      // Apply via both batch + individual creates (guarantees UI updates)
      if (result.todos.length || result.debts.length || result.wishlist.length || result.alarms.length) {
        applyBatch({
          todos: result.todos,
          debts: result.debts,
          wishlist: result.wishlist,
          alarms: result.alarms,
        })
      } else {
        // Extra safety: if AI returned actions that somehow didn't map, try raw titles from actions
        for (const a of result.actions) {
          const type = String(a.type || '').toLowerCase()
          const title = String(a.title || a.text || a.task || '').trim()
          if ((type.includes('todo') || type.includes('task')) && title) addTodo(title)
          if (type.includes('wishlist') || type.includes('wish') || type.includes('expense')) {
            if (title) addWishlist(title, String(a.note || ''))
          }
          if (type.includes('alarm') || type.includes('remind')) {
            const mins = Number(a.afterMinutes) || 60
            if (title) addAlarm(title, new Date(Date.now() + mins * 60_000).toISOString())
          }
          if (type.includes('debt') && !type.includes('pay')) {
            const person = String(a.person || a.name || '').trim()
            const amount = Number(a.amount)
            if (person && amount > 0) {
              addDebt({
                person,
                amount,
                currency: String(a.currency || dataRef.current.settings.currency),
                note: String(a.note || ''),
                direction: a.direction === 'owed' ? 'owed' : 'owe',
              })
            }
          }
        }
      }
      for (const p of result.payments) {
        payDebt(p.debtId, p.amount)
      }
      addChat('assistant', result.reply)
      if (dataRef.current.settings.voiceReplies) {
        speakText(result.reply, dataRef.current.settings.lang)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'NO_API_KEY') {
        addChat('assistant', t('needApiKey', lang))
      } else {
        addChat('assistant', lang === 'ar' ? `صار خطأ: ${msg}` : `Error: ${msg}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void sendMessage(input)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  const toggleListen = () => {
    const SpeechCtor = getSpeechRecognition()
    if (!SpeechCtor) {
      setSpeechError(t('speechUnsupported', lang))
      return
    }
    if (listening) {
      recogRef.current?.stop()
      setListening(false)
      return
    }

    stopSpeaking()
    const recog = new SpeechCtor()
    recogRef.current = recog
    recog.lang = lang === 'ar' ? 'ar-SA' : 'en-US'
    recog.interimResults = true
    recog.continuous = false

    recog.onstart = () => setListening(true)
    recog.onend = () => setListening(false)
    recog.onerror = () => {
      setListening(false)
    }
    recog.onresult = (event) => {
      let finalText = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      if (interim) setChatDraft(interim)
      if (finalText.trim()) {
        setChatDraft(finalText.trim())
        void sendMessage(finalText.trim())
      }
    }
    try {
      recog.start()
    } catch {
      setSpeechError(t('speechUnsupported', lang))
    }
  }

  return (
    <div className="animate-in flex h-[calc(100dvh-8rem)] flex-col">
      <header className="mb-3 shrink-0">
        <p className="brand text-xs text-[var(--color-accent)]">AMIGO</p>
        <h1 className="text-2xl font-bold">{t('amigo', lang)}</h1>
        <p className="text-sm text-[var(--color-mute)]">{t('tagline', lang)}</p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.length === 0 && (
          <div className="row-card border-[var(--color-accent)]/25 bg-[rgba(61,220,151,0.06)]">
            <p>{t('amigoHello', lang)}</p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'ms-auto bg-[var(--color-ink-3)] border border-[var(--color-line)]'
                : 'me-auto bg-[rgba(61,220,151,0.12)] border border-[rgba(61,220,151,0.25)]'
            }`}
          >
            {m.content}
          </div>
        ))}
        {listening && (
          <p className="pulse-soft text-sm text-[var(--color-accent)]">{t('listening', lang)}</p>
        )}
        {busy && (
          <p className="pulse-soft text-sm text-[var(--color-mute)]">{t('amigoThinking', lang)}</p>
        )}
        <div ref={endRef} />
      </div>

      {speechError && <p className="mb-2 text-xs text-[var(--color-warn)]">{speechError}</p>}

      {!state.data.settings.apiKey && (
        <button
          type="button"
          className="mb-2 text-start text-xs text-[var(--color-warn)] underline"
          onClick={() => setTab('settings')}
        >
          {t('needApiKey', lang)} →
        </button>
      )}

      <form onSubmit={onSubmit} className="flex shrink-0 items-end gap-2">
        <button
          type="button"
          onClick={toggleListen}
          className={`btn shrink-0 px-3 ${
            listening
              ? 'bg-[var(--color-danger)] text-white'
              : 'bg-[var(--color-ink-3)] text-[var(--color-accent)] border border-[var(--color-line)]'
          }`}
          aria-label={listening ? t('stopListening', lang) : t('holdToTalk', lang)}
          title={listening ? t('stopListening', lang) : t('holdToTalk', lang)}
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setChatDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('chatPlaceholder', lang)}
          disabled={busy}
          rows={2}
          className="amigo-composer flex-1"
        />
        <button type="submit" className="btn btn-primary shrink-0 px-3" disabled={busy || !input.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
