-- Diagnose-Query, kein Fix -- bitte einmal im Supabase SQL-Editor ausführen
-- und das Ergebnis überfliegen.
--
-- Ich (Claude Code) kann pg_tables/pg_policies nicht selbst abfragen --
-- PostgREST exponiert System-Kataloge nicht, auch nicht mit dem Service-Role-
-- Key. Per Code-Analyse (alle .from("...")-Aufrufe im Repo) sind nur vier
-- Tabellen tatsächlich in Benutzung: portfolio_objects (jetzt gefixt),
-- user_plans + pending_plans (hatten schon RLS, per echtem anon-Key-Testinsert
-- verifiziert), user_sessions (neu, RLS ist Teil der Migration). Diese Query
-- deckt zusätzlich alles ab, was im Code nicht (mehr) referenziert wird, aber
-- noch in der DB existiert (z.B. verwaiste Tabellen aus alten Features).
select
  t.tablename,
  t.rowsecurity as rls_enabled,
  count(p.policyname) as policy_count
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
group by t.tablename, t.rowsecurity
order by t.rowsecurity asc, t.tablename;

-- rls_enabled = false UND die Tabelle enthält echte Nutzerdaten -> selbes
-- Muster wie beim portfolio_objects-Fix anwenden (zuerst klären, wie die
-- Tabelle angesprochen wird, dann fixen).
