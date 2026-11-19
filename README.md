# Nepal Official Statistics Viewer

A source-first statistics viewer for official Nepali economic and financial data. The system preserves PDF provenance, stages extracted observations privately, requires curator verification, and exposes only published observations to charts, tables, and natural-language search.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and configure Supabase. The service-role key is server-only and must never be exposed to the browser.

## Architecture

Read [SYSTEM_THINKING.md](./SYSTEM_THINKING.md) for the reasoning model and [ARCHITECTURE.md](./ARCHITECTURE.md) for the technical design.

The ingestion lifecycle is:

```text
Register document → Create period → Generate manifest → Stage privately → Verify → Publish
```

## Validation

```bash
npm run lint
npm run build
```
