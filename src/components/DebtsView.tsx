import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { t } from '../i18n'
import { useStore } from '../store'
import { CURRENCIES, type Debt, type DebtDirection, type Lang } from '../types'
import { formatMoney } from '../utils'

export function DebtsView() {
  const { state, addDebt, payDebt, deleteDebt } = useStore()
  const { lang, currency: defaultCurrency } = state.data.settings
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [direction, setDirection] = useState<DebtDirection>('owe')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payValue, setPayValue] = useState('')

  const open = state.data.debts.filter((d) => !d.settled)
  const iOwe = open.filter((d) => d.direction === 'owe')
  const theyOwe = open.filter((d) => d.direction === 'owed')
  const filtered = direction === 'owe' ? iOwe : theyOwe

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(amount)
    if (!person.trim() || !Number.isFinite(n) || n <= 0) return
    addDebt({ person, amount: n, currency, note, direction })
    setPerson('')
    setAmount('')
    setNote('')
  }

  const startPay = (d: Debt) => {
    setPayingId(d.id)
    setPayValue(String(d.amount))
  }

  const confirmPay = (id: string) => {
    const n = Number(payValue)
    if (!Number.isFinite(n) || n <= 0) return
    payDebt(id, n)
    setPayingId(null)
    setPayValue('')
  }

  return (
    <div className="animate-in space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{t('debts', lang)}</h1>
      </header>

      <div className="flex gap-2">
        <button
          type="button"
          className={`chip flex-1 justify-center ${direction === 'owe' ? 'on' : ''}`}
          onClick={() => setDirection('owe')}
        >
          {t('iOwe', lang)}
        </button>
        <button
          type="button"
          className={`chip flex-1 justify-center ${direction === 'owed' ? 'on' : ''}`}
          onClick={() => setDirection('owed')}
        >
          {t('theyOwe', lang)}
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder={t('person', lang)} />
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('amount', lang)}
            inputMode="decimal"
            type="number"
            step="any"
            className="flex-1"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-[5.5rem] shrink-0 basis-[5.5rem]"
            aria-label={t('currency', lang)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('note', lang)} />
        <button type="submit" className="btn btn-primary w-full">
          {t('addDebt', lang)}
        </button>
      </form>

      {filtered.length === 0 ? (
        <p className="text-center text-[var(--color-mute)]">{t('noDebts', lang)}</p>
      ) : (
        <DebtGroup
          title={direction === 'owe' ? t('iOwe', lang) : t('theyOwe', lang)}
          color={direction === 'owe' ? 'var(--color-owe)' : 'var(--color-owed)'}
          items={filtered}
          lang={lang}
          payingId={payingId}
          payValue={payValue}
          setPayValue={setPayValue}
          onStartPay={startPay}
          onConfirmPay={confirmPay}
          onCancelPay={() => setPayingId(null)}
          onDelete={deleteDebt}
          onPayAll={(d) => {
            payDebt(d.id, d.amount)
            setPayingId(null)
          }}
        />
      )}
    </div>
  )
}

function DebtGroup({
  title,
  color,
  items,
  lang,
  payingId,
  payValue,
  setPayValue,
  onStartPay,
  onConfirmPay,
  onCancelPay,
  onDelete,
  onPayAll,
}: {
  title: string
  color: string
  items: Debt[]
  lang: Lang
  payingId: string | null
  payValue: string
  setPayValue: (v: string) => void
  onStartPay: (d: Debt) => void
  onConfirmPay: (id: string) => void
  onCancelPay: () => void
  onDelete: (id: string) => void
  onPayAll: (d: Debt) => void
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold" style={{ color }}>
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((d) => (
          <li key={d.id} className="row-card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{d.person}</p>
                <p className="text-lg" style={{ color }}>
                  {formatMoney(d.amount, d.currency, lang)}
                </p>
                {d.originalAmount > d.amount && (
                  <p className="text-xs text-[var(--color-mute)]">
                    {t('remaining', lang)} · {t('ofOriginal', lang)}{' '}
                    {formatMoney(d.originalAmount, d.currency, lang)}
                  </p>
                )}
                {d.note && <p className="text-sm text-[var(--color-mute)]">{d.note}</p>}
              </div>
              <div className="flex flex-wrap gap-1">
                <button type="button" className="btn btn-primary py-1.5 text-xs" onClick={() => onStartPay(d)}>
                  {t('settlePartial', lang)}
                </button>
                <button type="button" className="btn btn-primary py-1.5 text-xs opacity-90" onClick={() => onPayAll(d)}>
                  {t('settleAll', lang)}
                </button>
                <button type="button" className="btn btn-ghost p-2" onClick={() => onDelete(d.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {payingId === d.id && (
              <div className="space-y-2 border-t border-[var(--color-line)] pt-2">
                <label className="text-xs text-[var(--color-mute)]">
                  {t('payAmount', lang)} ({d.currency})
                </label>
                <input
                  value={payValue}
                  onChange={(e) => setPayValue(e.target.value)}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  max={d.amount}
                />
                <div className="flex gap-2">
                  <button type="button" className="btn btn-primary flex-1 text-xs" onClick={() => onConfirmPay(d.id)}>
                    {t('confirmPay', lang)}
                  </button>
                  <button type="button" className="btn btn-primary flex-1 text-xs opacity-80" onClick={() => onPayAll(d)}>
                    {t('settleAll', lang)}
                  </button>
                  <button type="button" className="btn btn-ghost text-xs" onClick={onCancelPay}>
                    {t('cancel', lang)}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
