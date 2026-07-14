import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { t } from '../i18n'
import { useStore } from '../store'

export function TodosView() {
  const { state, addTodo, toggleTodo, deleteTodo } = useStore()
  const lang = state.data.settings.lang
  const [title, setTitle] = useState('')

  const pending = state.data.todos.filter((x) => !x.done)
  const done = state.data.todos.filter((x) => x.done)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    addTodo(title)
    setTitle('')
  }

  return (
    <div className="animate-in space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{t('todos', lang)}</h1>
        <p className="text-sm text-[var(--color-mute)]">
          {pending.length} {t('pending', lang)} · {done.length} {t('done', lang)}
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('placeholderTodo', lang)}
          enterKeyHint="done"
        />
        <button type="submit" className="btn btn-primary shrink-0">
          {t('addTodo', lang)}
        </button>
      </form>

      {state.data.todos.length === 0 ? (
        <p className="text-center text-[var(--color-mute)]">{t('noTodos', lang)}</p>
      ) : (
        <ul className="space-y-2">
          {state.data.todos.map((todo) => (
            <li key={todo.id} className="row-card flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleTodo(todo.id)}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  todo.done
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[#062018]'
                    : 'border-[var(--color-line)]'
                }`}
                aria-label={t('done', lang)}
              >
                {todo.done ? '✓' : null}
              </button>
              <span className={`flex-1 ${todo.done ? 'text-[var(--color-mute)] line-through' : ''}`}>
                {todo.title}
              </span>
              <button
                type="button"
                className="btn btn-ghost p-2"
                onClick={() => deleteTodo(todo.id)}
                aria-label={t('delete', lang)}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
