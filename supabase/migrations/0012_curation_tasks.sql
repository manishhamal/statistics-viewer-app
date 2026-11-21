-- 0012: curation tasks.
--
-- * sources.publications_url – the page on the publisher's site that lists its reports.
--   "Find document" reads it to suggest PDF links for a task.
-- * curation_tasks – work the owner assigns to a curator.
--     kind 'document' : find → register → enter values → review → published.
--                       The steps after "find" are worked out from the linked document
--                       and its observations, so they never drift out of sync.
--     kind 'note'     : a plain to-do (e.g. "recheck the Magh inflation figure"),
--                       finished with a result note.
--
-- RLS is enabled with NO policies: the public (anon) key cannot read or write tasks;
-- only the server (service role) can. Safe to run more than once.

begin;

alter table sources add column if not exists publications_url text;

create table if not exists curation_tasks (
  id             uuid primary key default uuid_generate_v4(),
  kind           text not null default 'document' check (kind in ('document', 'note')),
  title          text not null,
  notes          text,
  source_id      uuid references sources(id) on delete set null,
  period_hint    text,
  search_link    text,   -- a page the owner suggests searching (not itself a PDF)
  doc_link       text,   -- the chosen PDF
  assignee_id    uuid references auth.users(id) on delete set null,
  document_id    uuid references documents(id) on delete set null,
  status         text not null default 'open' check (status in ('open', 'blocked', 'done', 'cancelled')),
  blocked_reason text,
  result_note    text,
  due_date       date,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index if not exists curation_tasks_assignee_idx on curation_tasks(assignee_id, status);
create index if not exists curation_tasks_document_idx on curation_tasks(document_id);
alter table curation_tasks enable row level security;

-- Starting search pages, tested November 2026. Only filled where none is set yet;
-- owners can change them on /admin/tasks/manage.
--   NRB: the Research Department's sitemaps list every report (each link redirects to its PDF).
--   MoF: the Economic Survey list, plus the newest pages of the site's news sitemap.
update sources set publications_url = E'https://www.nrb.org.np/red-sitemap3.xml\nhttps://www.nrb.org.np/red-sitemap2.xml\nhttps://www.nrb.org.np/red-sitemap1.xml'
  where short_name = 'NRB' and publications_url is null;
update sources set publications_url = E'https://mof.gov.np/category/economic-survey/\nhttps://mof.gov.np/sitemap-news.xml\nhttps://mof.gov.np/sitemap-news.xml?p=2\nhttps://mof.gov.np/sitemap-news.xml?p=3'
  where short_name = 'MoF' and publications_url is null;

commit;
