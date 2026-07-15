/** Scriptable (iOS) home-screen widget — tasks + debts from AMIGO cloud sync. */
export function buildScriptableWidget(cloudUrl: string, appUrl = ''): string {
  const open = appUrl.trim() || 'https://'
  return `// AMIGO — ودجت المهام والديون (Scriptable)
// 1) ثبّت Scriptable من App Store
// 2) سكربت جديد → الصق كله → Run
// 3) Add Widget → Scriptable → اختار هالسكربت (Medium)

const CLOUD_URL = ${JSON.stringify(cloudUrl)}
const APP_URL = ${JSON.stringify(open)}

async function load() {
  const req = new Request(CLOUD_URL)
  req.headers = { Accept: "application/json" }
  const json = await req.loadJSON()
  return json && json.data ? json.data : null
}

function money(amount, currency) {
  return String(amount) + " " + (currency || "")
}

const data = await load()
const w = new ListWidget()
w.backgroundColor = new Color("#0c1117")
w.setPadding(14, 14, 14, 14)

const title = w.addText("AMIGO")
title.font = Font.boldSystemFont(12)
title.textColor = new Color("#3ddc97")

if (!data) {
  const err = w.addText("فعّل المزامنة أولاً بالإعدادات")
  err.textColor = Color.gray()
  err.font = Font.systemFont(12)
} else {
  const todos = (data.todos || []).filter(t => !t.done).slice(0, 4)
  const debts = (data.debts || []).filter(d => !d.settled).slice(0, 3)

  w.addSpacer(8)
  const h1 = w.addText("مهام (" + todos.length + ")")
  h1.font = Font.semiboldSystemFont(13)
  h1.textColor = Color.white()

  if (todos.length === 0) {
    const empty = w.addText("ما في مهام")
    empty.textColor = Color.gray()
    empty.font = Font.systemFont(12)
  } else {
    for (const t of todos) {
      const line = w.addText("• " + String(t.title || ""))
      line.textColor = new Color("#e8eef7")
      line.font = Font.systemFont(12)
      line.lineLimit = 1
    }
  }

  w.addSpacer(8)
  const h2 = w.addText("ديون (" + debts.length + ")")
  h2.font = Font.semiboldSystemFont(13)
  h2.textColor = Color.white()

  if (debts.length === 0) {
    const empty = w.addText("ما في ديون")
    empty.textColor = Color.gray()
    empty.font = Font.systemFont(12)
  } else {
    for (const d of debts) {
      const who = String(d.person || "")
      const dir = d.direction === "owed" ? "لي" : "علي"
      const line = w.addText("• " + who + " · " + dir + " · " + money(d.amount, d.currency))
      line.textColor = new Color("#e8eef7")
      line.font = Font.systemFont(12)
      line.lineLimit = 1
    }
  }
}

if (APP_URL && APP_URL !== "https://") {
  w.url = APP_URL
}

Script.setWidget(w)
Script.complete()
`
}
