
create or replace function search_indicators(search_text text) returns setof indicators language sql stable as $$ select * from indicators where name ilike '%'||search_text||'%' or code ilike '%'||search_text||'%' or coalesce(description,'') ilike '%'||search_text||'%' limit 20 $$;
