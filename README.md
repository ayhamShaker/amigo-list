# AMIGO

Personal assistant PWA — todos, debts, expenses, alarms + AI chat.

## Run

```bash
npm install
npm run dev
```

Open the local URL, then on iPhone: Safari → Share → **Add to Home Screen**.

## AMIGO AI

In Settings, paste an OpenAI-compatible API key:

- Base URL: `https://api.openai.com/v1` (or OpenRouter etc.)
- Model: e.g. `gpt-4o-mini`

Examples:

- `شغل منبه بعد ساعتين باسم تسلم فريق MILFAWE`
- `حطلي TASK تصليح موقع carease`
- `أنا مديون لسامر 50 دولار`

Data stays in your browser (`localStorage`). Single-user by design.
