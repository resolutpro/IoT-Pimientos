# Monitor Pimientos

IoT monitoring dashboard for a pepper plantation. Ingests soil sensor data from Dragino SE01-NB devices via MQTT, stores readings in PostgreSQL, displays live stats and charts in a mobile-first web dashboard, and sends Telegram alerts when humidity or EC thresholds are exceeded.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/finca-monitor run dev` — run the web dashboard
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run seed` — seed sample sensors and 24 h of readings

## Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (set automatically by Replit DB) |
| `MQTT_BROKER_URL` | MQTT broker URL, e.g. `mqtts://broker.hivemq.com:8883` |
| `MQTT_USERNAME` | MQTT broker username (optional, leave blank if not required) |
| `MQTT_PASSWORD` | MQTT broker password (optional, leave blank if not required) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID to receive alerts |

MQTT and Telegram variables are optional at startup — the server will log a warning and skip MQTT/alerts if they are absent. Add them via the Replit Secrets panel.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (`artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- MQTT: `mqtt` package — subscribes to `finca/+/datos`, parses SE01-NB JSON payload
- Alerts: `node-telegram-bot-api` — 1 h debounce per sensor per condition
- API codegen: Orval from `lib/api-spec/openapi.yaml`
- Frontend: React + Vite + Tailwind + shadcn/ui (`artifacts/finca-monitor`)
- Charts: Recharts (dual-axis humidity + temperature line chart)

## Where things live

| Path | Purpose |
|---|---|
| `lib/db/src/schema/` | Source of truth for DB schema (sensors + readings tables) |
| `lib/api-spec/openapi.yaml` | Source of truth for API contract |
| `lib/api-client-react/src/generated/` | Auto-generated hooks — do not edit manually |
| `artifacts/api-server/src/routes/sensors.ts` | All sensor + readings REST routes |
| `artifacts/api-server/src/lib/mqtt.ts` | MQTT client and SE01-NB payload handler |
| `artifacts/api-server/src/lib/telegram.ts` | Threshold checks and Telegram alerts |
| `artifacts/finca-monitor/src/index.css` | Design tokens and color palette |
| `artifacts/finca-monitor/src/pages/` | Dashboard and SensorDetail pages |
| `artifacts/finca-monitor/src/components/` | SensorCard, AddSensorDialog, EditSensorDialog |

## Architecture decisions

- Readings endpoint uses `?range=24h|7d` query param (not path param) for REST clarity
- Telegram alerts fire at most once per hour per sensor per condition (debounce map in memory)
- MQTT client starts only when `MQTT_BROKER_URL` is set; server boots normally without it
- Dashboard polls every 30 s via React Query `refetchInterval` so cards stay current as MQTT data arrives
- Sensor status computed server-side on every summary request (no cached state)

## User preferences

- Mobile-first design (app used in field from phone)
- Inter font, emerald-600/green-700 accent palette
- High contrast for outdoor / direct-sun readability
- Language: Spanish labels throughout the UI ("Monitor Pimientos", "Estado de Sensores", etc.)
- No emojis in UI

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Run `pnpm --filter @workspace/db run push` after changing schema files
- The Express route for readings summary (`/sensors/summary`) must be declared **before** `/sensors/:id` in `routes/sensors.ts` — Express matches routes in order
