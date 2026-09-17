-- user_sessions: first_login / second_session Tracking für den CAC-Dashboard-Funnel.
-- Einmal manuell im Supabase SQL-Editor ausführen (propora-prod).
--
-- Bewusst eine eigene, kleine Tabelle statt einer Erweiterung von user_plans --
-- unabhängig vom Stripe-Webhook, das hier ist reines Session-Tracking.

create table if not exists public.user_sessions (
  user_id text primary key,
  first_login_at timestamptz,
  last_session_date date,
  session_count integer not null default 0
);

-- RLS auf der Tabelle selbst, nicht nur auf der Funktion -- sonst wäre sie über
-- die Auto-REST-API potenziell direkt via anon/authenticated erreichbar, je
-- nach Supabase-Default-Grants. Bewusst OHNE eigene Policies: der einzige
-- Zugriffsweg ist api/session-status.ts über den Service-Role-Key (umgeht RLS
-- by design), es gibt keinen Grund, dass anon/authenticated direkt lesen oder
-- schreiben dürfen. Folgt damit dem Muster von user_plans/pending_plans (RLS
-- aktiv, kein anon-Zugriff) statt dem von portfolio_objects (kein RLS --
-- separater, unabhängig davon zu behebender Befund, siehe Chat).
alter table public.user_sessions enable row level security;

-- Atomares Check-and-Increment -- als Postgres-Funktion statt Read-then-Write
-- im API-Handler, damit gleichzeitige Logins (mehrere Tabs/Geräte) nicht zu
-- doppelten Increments oder verlorenen Updates führen.
--
-- Rückgabe: (is_first_login, is_second_session) -- der aufrufende API-Handler
-- feuert basierend darauf die passenden dataLayer-Events.
create or replace function public.record_login_and_check_milestones(p_user_id text)
returns table (is_first_login boolean, is_second_session boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_is_first_login boolean := false;
  v_is_second_session boolean := false;
  v_row public.user_sessions;
begin
  insert into public.user_sessions (user_id, first_login_at, last_session_date, session_count)
  values (p_user_id, now(), v_today, 1)
  on conflict (user_id) do nothing;

  if found then
    -- Neue Zeile wurde gerade angelegt -> das ist first_login UND Tag 1 (session_count = 1)
    v_is_first_login := true;
    return query select v_is_first_login, v_is_second_session;
    return;
  end if;

  select * into v_row from public.user_sessions where user_id = p_user_id for update;

  if v_row.first_login_at is null then
    v_is_first_login := true;
    update public.user_sessions set first_login_at = now() where user_id = p_user_id;
  end if;

  if v_row.last_session_date is distinct from v_today then
    update public.user_sessions
      set session_count = session_count + 1, last_session_date = v_today
      where user_id = p_user_id
      returning session_count into v_row.session_count;

    if v_row.session_count = 2 then
      v_is_second_session := true;
    end if;
  end if;

  return query select v_is_first_login, v_is_second_session;
end;
$$;

-- Server-Client (Service Role) ruft die Funktion auf -- keine RLS-Policy für
-- anon/authenticated nötig, der API-Handler prüft den Clerk-Token selbst.
revoke all on function public.record_login_and_check_milestones(text) from public;
grant execute on function public.record_login_and_check_milestones(text) to service_role;
