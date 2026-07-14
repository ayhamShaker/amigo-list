import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { t } from '../i18n'
import { useStore } from '../store'

export function WishlistView() {
  const { state, addWishlist, toggleWishlist, deleteWishlist } = useStore()
  const lang = state.data.settings.lang
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    addWishlist(title, note)
    setTitle('')
    setNote('')
  }

  return (
    <div className="animate-in space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{t('wishlist', lang)}</h1>
        <p className="text-sm text-[var(--color-mute)]">{t('wishlistHint', lang)}</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('placeholderWishlist', lang)}
        />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('note', lang)} />
        <button type="submit" className="btn btn-primary w-full">
          {t('addWishlist', lang)}
        </button>
      </form>

      {state.data.wishlist.length === 0 ? (
        <p className="text-center text-[var(--color-mute)]">{t('noWishlist', lang)}</p>
      ) : (
        <ul className="space-y-2">
          {state.data.wishlist.map((item) => (
            <li
              key={item.id}
              className={`row-card flex items-center gap-3 ${item.done ? 'opacity-50' : ''}`}
            >
              <div className="flex-1">
                <p className={`font-semibold ${item.done ? 'line-through' : ''}`}>{item.title}</p>
                {item.note && <p className="text-sm text-[var(--color-mute)]">{item.note}</p>}
              </div>
              {!item.done && (
                <button
                  type="button"
                  className="btn btn-primary py-1.5 text-xs"
                  onClick={() => toggleWishlist(item.id)}
                >
                  {t('markDone', lang)}
                </button>
              )}
              <button type="button" className="btn btn-ghost p-2" onClick={() => deleteWishlist(item.id)}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
