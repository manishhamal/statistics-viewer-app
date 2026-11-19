# Architecture

## Nepal Official Statistics Viewer

This document describes the technical and operational architecture of the Statistics Viewer. It is designed around one rule:

> Public charts and search answers must be generated only from human-reviewed, evidence-backed observations.

The architecture separates source acquisition, structured extraction, human verification, publication, public querying, and natural-language interpretation.

---

## 1. High-Level Architecture

```text
                         ┌────────────────────────┐
                         │ Public reader / Curator │
                         └────────────┬───────────┘
                                      │ HTTPS
                         ┌────────────▼───────────┐
                         │ Next.js App Router      │
                         │ public + admin routes   │
                         └────────────┬───────────┘
                                      │ server calls
              ┌───────────────────────┼────────────────────────┐
              │                       │                        │
   ┌──────────▼──────────┐ ┌──────────▼──────────┐ ┌──────────▼──────────┐
   │ Public statistics    │ │ Ingestion/admin      │ │ Search pipeline      │
   │ queries + charts     │ │ services + review   │ │ candidates → plan    │
   └──────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────┘
              │                       │                        │
              └───────────────────────┼────────────────────────┘
                                      │
                         ┌────────────▼───────────┐
                         │ Supabase                │
                         │ Postgres + Auth + RLS  │
                         └────────────┬───────────┘
                                      │
                         ┌────────────▼───────────┐
                         │ Official PDF archive   │
                         │ hash-addressed files   │
                         └────────────────────────┘
```

### Main layers

1. **Presentation layer** — pages, forms, tables, charts, and search interaction.
2. **Route/API layer** — public routes, protected admin routes, and search endpoint.
3. **Domain service layer** — ingestion, staging, review, statistics, authentication, and search modules.
4. **Persistence layer** — Supabase PostgreSQL, auth sessions, policies, migrations, and catalog data.
5. **Evidence layer** — archived official PDFs identified by SHA-256 content hash.

The browser never receives a service-role database key. Privileged operations stay on the server.

---

## 2. Technology Stack

```text
Next.js 16 App Router
React 19
TypeScript
Tailwind CSS 4
Supabase PostgreSQL
Supabase Auth + SSR cookies
Zod validation
Recharts
Lucide React
Google GenAI-compatible LLM client
```

Important project scripts:

```text
npm run dev       development server
npm run lint      ESLint
npm run build     production build
npm run start     production server
```

The architecture should remain portable. Next.js, Supabase, and the model provider are implementation choices around the domain model, not the definition of the product.

---

## 3. Domain Data Model

### 3.1 Sources

A source represents an institution that publishes official material.

```text
sources
  id
  name
  short_name
  website_url
```

Examples:

```text
Nepal Rastra Bank (NRB)
National Statistics Office (NSO)
Ministry of Finance (MoF)
```

### 3.2 Documents

A document represents one official PDF or release.

```text
documents
  id
  source_id → sources.id
  title
  doc_type
  publication_date
  period_covered
  coverage_type
  calendar_system
  language
  file_hash
  file_url
  status
```

The `file_hash` is unique. The hash is calculated from downloaded bytes, not trusted from the URL or HTTP content type.

Document lifecycle examples:

```text
registered → extracting → extracted
registered → failed
```

The document lifecycle is separate from the observation lifecycle.

### 3.3 Categories

Categories organize indicators hierarchically.

```text
categories
  id
  name
  parent_id → categories.id
```

Example:

```text
Monetary
  └── Money Supply
```

### 3.4 Indicators

An indicator is a stable named measure.

```text
indicators
  id
  code                 unique application identifier
  name
  name_ne
  description
  category_id
  unit
  scale
  frequency
```

Examples:

```text
broad_money_m2
cpi_inflation_yoy
foreign_exchange_reserves_usd
```

The AI returns `code`; the server resolves it to `id`.

### 3.5 Periods

A period is a normalized time interval.

```text
periods
  id
  type
  label
  label_ad
  start_date
  end_date
```

Supported types include:

```text
month
quarter
fiscal_year
calendar_year
```

The combination of type and source label is unique. Both Nepali/BS and AD labels are stored so public users can search using either representation.

### 3.6 Observations

An observation is the atomic public fact.

```text
observations
  id
  indicator_id → indicators.id
  period_id → periods.id
  breakdown JSONB
  breakdown_key
  value NUMERIC
  unit
  scale
  is_provisional
  document_id → documents.id
  page_number
  table_ref
  status
  extraction_method
  verified_at
  reviewed_by
  reviewed_at
  rejection_reason
```

The database uses `NUMERIC` instead of floating-point storage to avoid precision surprises in official values.

Observation lifecycle:

```text
staged → verified → published
staged → rejected
published → superseded
```

The exact transition policy is enforced by server mutation code and database integrity rules.

### 3.7 Extraction runs

An extraction run records one attempt to derive candidate rows from a document.

```text
extraction_runs
  id
  document_id
  method
  started_at
  finished_at
  rows_found
  notes
```

Methods may include:

```text
manual
pdfplumber
gemini
```

### 3.8 Query log

The query log records reader questions and structured plans.

```text
query_log
  id
  question
  query_plan JSONB
  matched
  created_at
```

It can later support search-quality analysis and product decisions.

---

## 4. Database Integrity and Access

The migrations establish:

- Foreign keys between source, document, indicator, period, and observation.
- Unique document hashes for deduplication.
- Unique indicator codes.
- Unique period type/label combinations.
- Valid observation statuses.
- Review metadata.
- Public visibility rules.
- Search helper functions.

The principle is:

> Important domain rules should not exist only in the UI.

The UI can provide a friendly error, but the database and server must still protect the invariant if the UI is bypassed.

Public readers should only receive published rows. Curator mutations require an authenticated session and a server-side curator authorization check.

---

## 5. Ingestion Architecture

The ingestion system is a controlled write pipeline.

```text
Official PDF URL
      ↓
Document intake
      ↓
Hash and archive
      ↓
Document registration
      ↓
Period resolution/creation
      ↓
Extraction manifest
      ↓
Private staging
      ↓
Human review
      ↓
Publish or reject
```

### 5.1 Document intake

Main implementation:

```text
src/server/ingestion/documentIntake.ts
src/app/api/admin/ingestion/documents/route.ts
src/components/DocumentRegistrationForm.tsx
src/app/admin/ingestion/page.tsx
```

The intake service:

1. Validates the source ID.
2. Validates HTTP/HTTPS URL format.
3. Downloads with a timeout.
4. Follows redirects.
5. Checks response status.
6. Enforces the 50 MB limit.
7. Checks the `%PDF-` signature.
8. Computes SHA-256.
9. Archives to `inputs/official-reports/<hash>.pdf`.
10. Checks for an existing document with that hash.
11. Registers a new document if not duplicated.

Conceptually:

```text
same PDF bytes → same hash → same source identity
```

Registration does not extract values and does not publish data.

### 5.2 Coverage metadata

Reports can be monthly, quarterly, fiscal-year, calendar-year, mixed, or other. The document also records whether periods are AD, BS, mixed, or not applicable.

This prevents the form from assuming every report is a fiscal-year document.

### 5.3 Period creation

Main implementation:

```text
src/server/admin/createPeriod.ts
src/app/api/admin/ingestion/periods/route.ts
src/components/CreatePeriodForm.tsx
src/app/admin/ingestion/periods/page.tsx
```

A period must be created from the official report’s actual label. A monthly NRB report should not be forced into a fiscal-year placeholder.

### 5.4 Manifest generation

Main implementation:

```text
src/components/ExtractionManifestForm.tsx
src/server/ingestion/stageManifest.ts
src/app/api/admin/ingestion/stage/route.ts
src/app/admin/ingestion/extract/page.tsx
```

A manifest maps human-reviewed source rows to catalog references:

```json
{
  "document_file_hash": "...",
  "extraction_method": "manual",
  "rows": [
    {
      "indicator_code": "broad_money_m2",
      "period_label": "September 2026",
      "value": 6570000,
      "unit": "NPR",
      "scale": "millions",
      "page_number": 14,
      "table_ref": "Table 5",
      "breakdown": {}
    }
  ]
}
```

The staging service resolves the document hash, indicator code, and period label before creating observations.

### 5.5 Private staging

Every newly extracted observation starts as:

```text
status = staged
```

Staged rows are not returned by public charts, tables, or search.

---

## 6. Human Verification and Publication

Main implementation:

```text
src/app/admin/review/page.tsx
src/components/ReviewQueueTable.tsx
src/server/admin/reviewQueries.ts
src/server/admin/publish.ts
src/server/admin/reject.ts
src/actions/adminActions.ts
```

The curator reviews:

- Indicator identity.
- Period identity.
- Value transcription.
- Unit and scale.
- Provisional state.
- Document title.
- PDF page.
- Table reference.
- Source link.

Approval records the reviewer and timestamp and moves the observation into the public lifecycle. Rejection records a reason rather than silently deleting the candidate.

The trust boundary is:

```text
candidate data → curator evidence check → public fact
```

A production-strength system should make publish and supersede operations atomic so two competing values cannot leave the database in an inconsistent state.

---

## 7. Public Statistics Read Path

Main implementation:

```text
src/server/stats/queries.ts
src/server/stats/chartSpec.ts
src/app/indicators/[code]/page.tsx
src/components/StatChart.tsx
src/components/IndicatorTable.tsx
```

The direct indicator path is:

```text
Route parameter: indicator code
       ↓
Find indicator by code
       ↓
Query observations by indicator ID
       ↓
Filter status = published
       ↓
Join periods and documents
       ↓
Order by period start date
       ↓
Build chart/table data
       ↓
Render values with source citations
```

The public UI does not attempt to decide whether a row looks valid. Publication status is the explicit decision boundary.

Every displayed value should be able to expose:

```text
indicator
period
value
unit
scale
document
page number
table reference
publication status
```

---

## 8. Natural-Language Search Architecture

Main implementation:

```text
src/app/api/search/route.ts
src/server/search/findCandidates.ts
src/server/search/interpretQuestion.ts
src/server/search/validatePlan.ts
src/server/search/runPlan.ts
src/server/search/answerQuery.ts
src/server/llm/llmClient.ts
src/server/llm/prompts.ts
```

### 8.1 Search flow

```text
Reader question
      ↓
Rate limit and request validation
      ↓
Candidate indicator retrieval
      ↓
LLM structured interpretation
      ↓
Plan schema validation
      ↓
Indicator code lookup
      ↓
Period label lookup
      ↓
Fixed database query
      ↓
Published observations only
      ↓
Answer, chart hint, and citations
```

### 8.2 Candidate retrieval

Candidate matching uses catalog data. It can search by:

- Indicator name.
- Indicator code.
- Description.
- Fuzzy matching helper.
- Token scoring after removing common stop words.

For example:

```text
“How did broad money supply change?”
```

can find:

```text
broad_money_m2
```

The candidate finder is not allowed to return arbitrary database records outside the intended catalog shape.

### 8.3 Structured AI plan

The model returns a constrained object:

```json
{
  "matched": true,
  "indicator_code": "broad_money_m2",
  "period_from": "September 2026",
  "period_to": "September 2026",
  "breakdown": null,
  "chart_hint": "line",
  "clarifying_question": null
}
```

If the question is ambiguous, the model can return a clarification request rather than guess.

### 8.4 Validation

The validator checks:

- The plan has the expected shape.
- The indicator code exists.
- The requested periods exist.
- `period_from` is not after `period_to`.
- The breakdown is permitted.
- The chart hint is supported.

Invalid plans stop before database execution.

### 8.5 Execution

The executor never uses model-generated SQL. It resolves stable references:

```text
indicator code → indicator.id
period label   → period.id
```

Then it runs fixed query code against published observations.

The AI can choose a label. The server decides what that label means.

---

## 9. Authentication and Authorization

Main implementation:

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/middleware.ts
src/server/auth/session.ts
src/middleware.ts
src/app/admin/login/page.tsx
```

### Browser session

The login page uses the browser Supabase client for email/password sign-in. SSR cookies allow server routes and middleware to observe the session.

### Middleware

Middleware refreshes the Supabase session and protects:

```text
/admin/review
/admin/ingestion
/api/admin/ingestion/*
```

### Defense in depth

Protection exists in multiple places:

1. Middleware redirects unauthenticated users.
2. Protected pages perform server-side user checks.
3. API routes check the curator session.
4. Server actions check the curator session before mutation.
5. Privileged database access is server-only.

An authenticated user should eventually be distinguished from an authorized curator through an explicit role or curator table.

---

## 10. File and Module Responsibilities

```text
src/app/                     route-level pages and API handlers
src/components/              reusable interactive UI
src/server/db/               database clients and shared types
src/server/stats/            public statistics queries and chart data
src/server/ingestion/        document and manifest pipeline
src/server/admin/            review, publish, reject, and period services
src/server/auth/             session and curator guards
src/server/search/           search orchestration
src/server/llm/              model calls and structured prompts
src/actions/                 server actions for admin mutations
supabase/migrations/         database schema, constraints, policies, helpers
supabase/seed.sql             demonstration catalog and observations
inputs/manifests/            manually prepared extraction manifests
inputs/official-reports/     local archived PDFs, excluded from source control
.stitch/DESIGN.md             public-service visual design system
```

The module boundaries mirror domain responsibilities. A future maintainer should be able to change the ingestion pipeline without rewriting chart rendering.

---

## 11. Security Model

### Service-role separation

The service-role Supabase client is allowed only in server modules. It must never be bundled into browser JavaScript.

Correct:

```text
Browser → protected route/server action → privileged server client
```

Incorrect:

```text
Browser → service-role key → database
```

### Input validation

Validate at route boundaries before calling domain services:

- URL protocol.
- Source ID.
- Dates.
- Coverage type.
- Calendar system.
- Manifest row shape.
- Numeric values.
- Page numbers.
- Rejection reasons.
- Search question size and shape.

### Data visibility

The most important public rule is:

```text
Public queries return only status = published.
```

This rule must be reinforced through database access rules, server query code, and tests.

---

## 12. Failure and Recovery Design

### Invalid PDF

If the response is not a real PDF, the intake stage fails before registration. No document and no observation should be created.

### Duplicate PDF

If the content hash already exists, the intake service returns the existing document identity rather than creating a second copy.

### Missing period

The curator creates the exact period before generating the manifest. The system should never silently map a monthly report into a fiscal-year period.

### Unknown indicator

The manifest fails rather than creating an observation with an unrecognized indicator.

### Ambiguous search

The user receives a clarification question instead of an arbitrary result.

### Conflicting observation

A different value for the same indicator, period, and breakdown should be treated as a review conflict. Future production work should make this a first-class state.

### Revised official report

A new document and observation should be registered. The old value remains auditable and can become `superseded` after the new value is verified.

### Partial extraction

Extraction runs should eventually record whether they completed, failed, or produced partial results, including rows found, rows staged, rows skipped, and conflicts.

---

## 13. Production Hardening Roadmap

The project is a strong prototype architecture. Before production, prioritize:

1. Complete lint, TypeScript, build, and browser smoke tests.
2. Move PDF archives from local disk to durable object storage.
3. Add explicit curator roles rather than treating every authenticated user as a curator.
4. Add atomic publish/supersede transactions.
5. Add a separate observation review-history table.
6. Add conflict detection for duplicate indicator-period-breakdown combinations.
7. Add extraction-run state and retry handling.
8. Add automated tests for every lifecycle transition.
9. Add stronger audit logging for admin actions.
10. Add backups and migration procedures for the database and archived documents.
11. Add rate limits and abuse monitoring to the search endpoint.
12. Add observability for ingestion failures, search misses, and public query latency.

---

## 14. Architecture Decision Rules

When adding a feature, ask these questions in order:

### What domain object changes?

Is it a source, document, indicator, period, observation, extraction run, review, or query?

### What state transition occurs?

Does the feature register, stage, verify, publish, reject, or supersede something?

### Who is allowed to perform it?

Public reader, authenticated user, curator, or system worker?

### What evidence must be retained?

Document hash, page, table, URL, reviewer, timestamp, or model plan?

### What should the public see?

Usually only published observations and their citations.

### Where should the rule be enforced?

Route validation, domain service, database constraint, row-level security, and tests as appropriate.

### How does failure recover?

Can the operation be retried safely? Is it idempotent? Does it leave partial records?

---

## 15. End-to-End Example

Question:

```text
Show broad money supply for September 2026.
```

Execution:

1. The search box sends the question to `/api/search`.
2. The API validates the request and applies rate limiting.
3. Candidate search finds `broad_money_m2`.
4. The model returns the indicator code and period labels.
5. The validator confirms the indicator exists.
6. The validator confirms September 2026 exists in the periods catalog.
7. The executor resolves the indicator and period IDs.
8. The executor queries observations where:

```text
indicator_id = broad_money_m2.id
period_id = September_2026.id
status = published
```

9. The response includes the value, unit, period, source document, page, and chart hint.
10. The UI renders a readable answer with the evidence path.

At no point does the model invent a value or choose an arbitrary database ID.

---

## 16. Final Architecture Summary

```text
Official sources provide documents.
Documents are downloaded, hashed, and registered.
Periods and indicators give extracted values meaning.
Manifests turn document rows into staged observations.
Curators verify evidence and control publication.
The database preserves facts, states, and provenance.
Public queries read only published observations.
The AI translates questions into constrained plans.
Fixed server code retrieves the actual values.
Charts, tables, and answers expose the evidence chain.
```

That is the architecture of the Nepal Official Statistics Viewer.
