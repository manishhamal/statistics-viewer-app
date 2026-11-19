# System Thinking

## Nepal Official Statistics Viewer

This document explains the reasoning behind the Nepal Official Statistics Viewer before discussing implementation. The project is not merely a dashboard, chart application, or chatbot. It is a **trustworthy public statistics system** that converts official publications into structured, reviewable, and citable facts.

The central promise is:

> Make official Nepali economic and financial statistics easier to find while preserving the evidence, meaning, and human verification behind every published number.

---

## 1. Start With the Real-World Problem

Official statistics are often available in long PDF publications from institutions such as Nepal Rastra Bank, the National Statistics Office, and the Ministry of Finance. A reader may want a simple answer:

> “How did broad money supply change recently?”

But producing a trustworthy answer requires more than displaying a number. The system must know:

- Which institution published the number.
- Which document contained it.
- Which period it represents.
- Which unit and scale were used.
- Which page or table proves it.
- Whether the value was provisional.
- Whether a human checked the transcription.
- Whether the value is currently approved for public use.

The problem is therefore a chain-of-trust problem:

```text
Official publication
    ↓
Structured interpretation
    ↓
Evidence-backed observation
    ↓
Human verification
    ↓
Publicly searchable fact
```

If any link is lost, the final chart may look correct while being impossible to audit.

---

## 2. The Most Important Mental Model

The system treats a statistical value as an **observation**, not as an isolated number.

```text
Observation = indicator + period + value + unit/scale
              + breakdown + source document + page/table evidence
              + extraction method + review status
```

For example:

```text
Indicator:       Broad Money Supply (M2)
Period:          September 2026
Value:           6,570,000
Unit:            NPR
Scale:           millions
Document:        Current Macroeconomic and Financial Situation of Nepal
Page:            14
Table:           Table 5
Status:          published
```

This design gives every value a context and a proof path.

The core principle is:

> A number is not trustworthy because it is stored in a database. It is trustworthy because the system can explain where it came from, how it was interpreted, who reviewed it, and why it is public.

---

## 3. Separate Meaning From Mechanism

A system architect first defines the domain meaning, then chooses technical mechanisms.

### Domain meanings

- **Source:** who publishes the information.
- **Document:** one official report or release.
- **Indicator:** what is being measured.
- **Period:** when it was measured.
- **Observation:** the measured value.
- **Evidence:** the document location proving the value.
- **Curator:** the human responsible for verification.
- **Publication status:** whether the value is private, approved, rejected, or replaced.

### Technical mechanisms

- Next.js provides the web application and route structure.
- Supabase PostgreSQL stores catalog data, observations, and audit fields.
- Supabase Auth manages curator sessions.
- Server modules enforce application rules.
- Zod validates request and AI plan shapes.
- Recharts renders charts.
- The LLM translates reader language into a constrained query plan.

The domain model should remain understandable even if the framework, database provider, or AI model changes.

---

## 4. System Actors

### Public reader

The reader browses indicators, views charts and tables, opens sources, and asks natural-language questions. The reader receives only published observations.

### Curator

The curator registers source documents, creates missing periods, prepares extraction manifests, reviews staged observations, and approves or rejects candidates. The curator is the human trust gate.

### Official publisher

The official publisher supplies the authoritative PDF or release. The project cites the publisher but is not itself an official government website.

### AI interpreter

The AI helps map a question to known indicators and periods. It does not create values, publish observations, or write arbitrary database queries.

### Database and application

The database preserves the catalog, facts, evidence, states, and review history. The application coordinates actions while keeping privileged access on the server.

---

## 5. Trust Boundaries

A trust boundary is a point where the system must validate, authenticate, or enforce a policy before allowing information to cross.

Important boundaries are:

```text
External PDF → document intake
Reader question → AI plan
AI plan → validated server query
Curator browser → protected mutation route
Staged observation → human publication decision
Published database → public chart/search response
```

Each boundary has a different responsibility:

- Intake checks that the download is a real PDF and preserves its hash.
- The search validator checks that indicator and period references exist.
- Authentication checks that protected actions belong to a curator session.
- Human review checks that the extracted value agrees with the source.
- Public queries filter by publication state.

The architecture is strongest when the same important policy is enforced in more than one layer: server code, database rules, and tests.

---

## 6. Why the AI Must Not Be the Source of Truth

The AI is useful for language interpretation, but it can be wrong, ambiguous, or manipulated. The safe role is:

```text
Reader language → structured plan
```

The unsafe role would be:

```text
Reader language → invented number
```

Therefore the project follows these rules:

- The AI receives candidate indicators instead of unrestricted database power.
- The AI returns structured JSON.
- Zod validates the plan shape.
- The selected indicator code is checked against the catalog.
- Requested periods are checked against the period catalog.
- Fixed server code executes the database query.
- Only published observations are returned.
- The AI cannot publish or mutate statistical data.

The AI is a **translator**, not an authority.

---

## 7. The Ingestion and Publication Philosophy

The system deliberately separates these steps:

```text
Register document
    ↓
Create or select period
    ↓
Prepare extraction manifest
    ↓
Stage observations privately
    ↓
Verify evidence manually
    ↓
Approve or reject
    ↓
Publish
```

Each step has a different meaning.

### Registration is not extraction

A registered PDF only says that the system has accepted an official document as a source candidate. It does not mean values have been read from the document.

### Extraction is not publication

A staged observation is a candidate. It is not visible to the public because it has not yet passed human review.

### Rejection is not deletion

A rejected record preserves the fact that a candidate was examined and rejected. This is useful for auditability and future correction.

### Publication is a state transition

Publication is the explicit decision that an observation is ready for public use.

---

## 8. Calendar and Period Thinking

Nepal statistics can use multiple calendars and frequencies. A report may be monthly, quarterly, fiscal-year, calendar-year, or mixed. It may use AD, BS, or both.

The system therefore treats periods as catalog objects rather than loose strings.

```text
Period
  type: month / quarter / fiscal_year / calendar_year
  label: source or Nepali label
  label_ad: Gregorian equivalent
  start_date
  end_date
```

This allows the search system to understand that two labels may represent the same interval:

```text
2083 Shrawan ↔ July/August 2026
```

The correct period must be created from the official report’s wording. It must not be guessed from a URL or copied from an unrelated placeholder.

---

## 9. How to Think About Data Quality

Data quality is not one check. It is a sequence of checks.

### Source quality

Is the PDF from the official publisher? Is the URL valid? Is the downloaded file actually a PDF?

### Structural quality

Does the document have a known source, title, publication date, coverage type, and calendar system?

### Semantic quality

Does the extracted row refer to the correct indicator and period? Is the unit and scale correct?

### Evidence quality

Can a curator locate the number at the stated page and table reference?

### Lifecycle quality

Has the observation passed from staged to a reviewed public state?

### Query quality

Does the public query return only the correct published observations and preserve citations?

A system should make these checks visible rather than hiding them inside one large function.

---

## 10. How to Think Like an Architect

### Identify the atomic fact

Ask: “What is the smallest record that must be independently understandable?” Here, it is one observation with its evidence.

### Separate write paths from read paths

The write path is controlled and complex because it creates trust. The read path is simple because it consumes already-approved facts.

```text
Write path: create, validate, review, publish
Read path:  filter published, format, cite
```

### Make lifecycle states explicit

Prefer meaningful states such as:

```text
registered, staged, verified, published, rejected, superseded
```

over a vague boolean such as `is_public`.

### Preserve evidence at the point of use

A chart value should be able to link to the document and page that support it. Provenance should not be an afterthought.

### Design for correction

Official reports can be revised. The system must allow a new observation to supersede an old one without destroying the historical record.

### Use stable identities

Indicator codes, document hashes, and period IDs give the system stable references even when labels or URLs change.

### Make ambiguity explicit

If a question could mean several indicators, ask for clarification. Guessing is worse than asking a short question.

### Treat failure as a normal state

Network errors, invalid PDFs, duplicate documents, missing periods, conflicting values, and ambiguous queries should have designed outcomes.

---

## 11. Development Method Used in This Project

The project was developed in this order:

1. Define the public trust promise.
2. Identify actors and responsibilities.
3. Model the catalog and observation domain.
4. Add database constraints and status rules.
5. Build public read queries.
6. Build authenticated curator boundaries.
7. Build document registration.
8. Build period creation.
9. Build manifest staging.
10. Build human review and publication.
11. Build natural-language search on top of published data.
12. Apply a consistent public-service visual system.
13. Plan lint, build, smoke, and production tests.

This order matters. It prevents the UI from becoming the architecture.

---

## 12. The Full Mental Model

```text
The PDF is evidence.
The document is the registered source container.
The period provides time meaning.
The indicator provides measurement meaning.
The observation is the atomic fact.
The curator creates trust through verification.
The status controls public visibility.
The AI translates questions but never supplies facts.
The public UI reads only published observations.
```

When you are unsure how to add a feature, return to this model and ask:

- What domain fact is being added?
- Which actor owns the action?
- Which trust boundary does it cross?
- Which lifecycle state changes?
- What evidence must be preserved?
- What should the public be allowed to see?
