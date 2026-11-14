-- =====================================================================================
-- Smashing Burger VIP Loyalty Card — initial schema
-- Tables + RLS, profile bootstrap trigger, and atomic SECURITY DEFINER RPCs.
--
-- Security model:
--   * Members read their own rows through RLS (anon key + JWT).
--   * Every write that moves stamps or rewards goes through an RPC that is EXECUTE-able
--     by service_role ONLY. The Next.js API routes call them with the service-role key
--     after verifying the user's session, so a member can never call them with their own JWT.
--   * store_settings (the staff PIN) is never readable by anon/authenticated.
-- =====================================================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------------------
-- Member code sequence → "SB-0001", "SB-0002", ... (grows to 5+ digits after 9999)
-- -------------------------------------------------------------------------------------
create sequence if not exists public.member_code_seq start 1;

-- -------------------------------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  email                text,
  full_name            text not null default 'Smashing VIP',
  member_code          text not null unique,
  stamps               integer not null default 0 check (stamps between 0 and 10), -- card holds max 10
  push_opt_in          boolean not null default false,
  failed_pin_attempts  integer not null default 0 check (failed_pin_attempts >= 0),
  pin_locked_until     timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- -------------------------------------------------------------------------------------
-- claimed_receipts — global ledger; receipt_number is UNIQUE across ALL members.
-- user_id is nullable + ON DELETE SET NULL so that when a member deletes their account
-- (UU PDP erasure) the receipt number stays burned and can never be re-claimed.
-- -------------------------------------------------------------------------------------
create table if not exists public.claimed_receipts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles (id) on delete set null,
  receipt_number  text not null unique,
  receipt_date    date not null,
  total_idr       integer not null check (total_idr >= 50000),
  stamps_awarded  integer not null check (stamps_awarded between 1 and 10),
  created_at      timestamptz not null default now()
);
create index if not exists claimed_receipts_user_idx on public.claimed_receipts (user_id, created_at desc);

-- -------------------------------------------------------------------------------------
-- redemptions
-- -------------------------------------------------------------------------------------
create table if not exists public.redemptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles (id) on delete set null,
  reward_name      text not null default 'Helena Burger',
  stamps_deducted  integer not null default 10 check (stamps_deducted > 0),
  redeemed_at      timestamptz not null default now()
);
create index if not exists redemptions_user_idx on public.redemptions (user_id, redeemed_at desc);

-- -------------------------------------------------------------------------------------
-- consent_logs — append-only UU PDP audit trail (Law No. 27/2022)
-- -------------------------------------------------------------------------------------
create table if not exists public.consent_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles (id) on delete set null,
  consent_type    text not null check (consent_type in
                    ('terms_privacy', 'push_reminders', 'cookies_analytics', 'cookies_preferences')),
  granted         boolean not null default true,
  policy_version  text not null,
  user_agent      text,
  accepted_at     timestamptz not null default now()
);
create index if not exists consent_logs_user_idx on public.consent_logs (user_id, accepted_at desc);

-- -------------------------------------------------------------------------------------
-- push_subscriptions
-- -------------------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- -------------------------------------------------------------------------------------
-- store_settings — singleton row (id = 1). Holds the rotating counter staff PIN.
-- -------------------------------------------------------------------------------------
create table if not exists public.store_settings (
  id                 integer primary key default 1 check (id = 1),
  current_staff_pin  text not null default '4829' check (current_staff_pin ~ '^[0-9]{4}$'),
  updated_at         timestamptz default now()
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- updated_at helper
-- -------------------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------------------------------
-- Profile bootstrap on sign-up (Google OAuth) with sequential SB-XXXX member code.
-- -------------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'Smashing VIP'
  );
  insert into public.profiles (id, email, full_name, member_code)
  values (
    new.id,
    new.email,
    left(v_name, 80),
    'SB-' || lpad(nextval('public.member_code_seq')::text, 4, '0')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.claimed_receipts    enable row level security;
alter table public.redemptions         enable row level security;
alter table public.consent_logs        enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.store_settings      enable row level security;

-- profiles: members can read their own row. No direct client UPDATE: stamps, PIN counters
-- and lockouts are only changed by the service-role RPCs.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "claimed_receipts_select_own" on public.claimed_receipts;
create policy "claimed_receipts_select_own" on public.claimed_receipts
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "redemptions_select_own" on public.redemptions;
create policy "redemptions_select_own" on public.redemptions
  for select to authenticated using (user_id = auth.uid());

-- consent_logs: members can read and append their own consent records (append-only: no update/delete policy).
drop policy if exists "consent_logs_select_own" on public.consent_logs;
create policy "consent_logs_select_own" on public.consent_logs
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "consent_logs_insert_own" on public.consent_logs;
create policy "consent_logs_insert_own" on public.consent_logs
  for insert to authenticated with check (user_id = auth.uid());

-- push_subscriptions: members manage their own device subscriptions.
drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- store_settings: RLS enabled with NO policies → invisible to anon/authenticated.

-- Belt-and-braces table privileges (RLS still applies on top).
revoke all on public.store_settings from anon, authenticated;
revoke insert, update, delete on public.profiles, public.claimed_receipts, public.redemptions from anon, authenticated;
revoke all on public.profiles, public.claimed_receipts, public.redemptions,
              public.consent_logs, public.push_subscriptions from anon;
grant select on public.profiles, public.claimed_receipts, public.redemptions to authenticated;
grant select, insert on public.consent_logs to authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;

-- =====================================================================================
-- RPC: claim_moka_receipt — atomic stamp award
--   * Locks the member's profile row (FOR UPDATE) so concurrent scans serialise.
--   * INSERT ... ON CONFLICT (receipt_number) DO NOTHING enforces one claim per receipt
--     globally, race-free, even across different members.
--   * Card cap: a member holds at most 10 stamps. At 10 the claim is rejected ('card_full') without
--     consuming the receipt; otherwise awards least(earned, 10 - current) and reports stamps_dropped.
--   * Re-validates the business rules server-side (defence in depth):
--     min Rp 50.000, 1..10 stamps (max 10 per receipt), stamps == min(floor(total/50000), 10),
--     receipt dated within 7 days (WIB) and not in the future.
-- Returns jsonb: { ok, code, message, receipt_number, previous_stamps, stamps, stamps_earned }
-- =====================================================================================
create or replace function public.claim_moka_receipt(
  p_user_id         uuid,
  p_receipt_number  text,
  p_receipt_date    date,
  p_total_idr       integer,
  p_stamps_earned   integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile        public.profiles%rowtype;
  v_receipt        text := upper(regexp_replace(coalesce(p_receipt_number, ''), '[^A-Za-z0-9-]', '', 'g'));
  v_today_wib      date := (now() at time zone 'Asia/Jakarta')::date;
  v_expected       integer;
  v_inserted_id    uuid;
  v_new_stamps     integer;
  v_awarded        integer;
begin
  if p_user_id is null or length(v_receipt) < 4 or p_receipt_date is null or p_total_idr is null then
    return jsonb_build_object('ok', false, 'code', 'bad_request', 'message', 'Missing receipt data.');
  end if;

  if p_stamps_earned is null or p_stamps_earned < 1 or p_stamps_earned > 10 then
    return jsonb_build_object('ok', false, 'code', 'bad_request',
      'message', 'A receipt can award between 1 and 10 stamps (maximum 10 stamps per receipt).');
  end if;

  if p_total_idr < 50000 then
    return jsonb_build_object('ok', false, 'code', 'below_minimum',
      'message', 'Minimum Rp 50.000 in one receipt to earn 1 stamp.', 'receipt_number', v_receipt);
  end if;

  v_expected := least(floor(p_total_idr / 50000.0)::integer, 10);
  if p_stamps_earned <> v_expected then
    return jsonb_build_object('ok', false, 'code', 'bad_request',
      'message', 'Stamp count does not match the receipt total.', 'receipt_number', v_receipt);
  end if;

  if p_receipt_date > v_today_wib + 1 then
    return jsonb_build_object('ok', false, 'code', 'future_date',
      'message', 'The receipt date is in the future.', 'receipt_number', v_receipt);
  end if;
  if p_receipt_date < v_today_wib - 7 then
    return jsonb_build_object('ok', false, 'code', 'too_old',
      'message', format('Receipt #%s is older than 7 days and can no longer earn stamps.', v_receipt),
      'receipt_number', v_receipt);
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'unauthorized', 'message', 'Member profile not found.');
  end if;

  -- Card full: reject WITHOUT consuming the receipt, so it can be scanned after redeeming.
  if v_profile.stamps >= 10 then
    return jsonb_build_object('ok', false, 'code', 'card_full',
      'message', 'Your card is full (10/10). Redeem your free Helena Burger first.',
      'receipt_number', v_receipt);
  end if;
  v_awarded := least(p_stamps_earned, 10 - v_profile.stamps);

  insert into public.claimed_receipts (user_id, receipt_number, receipt_date, total_idr, stamps_awarded)
  values (p_user_id, v_receipt, p_receipt_date, p_total_idr, v_awarded)
  on conflict (receipt_number) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    return jsonb_build_object('ok', false, 'code', 'duplicate',
      'message', format('Receipt #%s has already been claimed!', v_receipt),
      'receipt_number', v_receipt);
  end if;

  v_new_stamps := v_profile.stamps + v_awarded;
  update public.profiles set stamps = v_new_stamps where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'code', 'claimed',
    'receipt_number', v_receipt,
    'previous_stamps', v_profile.stamps,
    'stamps', v_new_stamps,
    'stamps_earned', v_awarded,
    'stamps_dropped', p_stamps_earned - v_awarded
  );
end;
$$;

-- =====================================================================================
-- RPC: redeem_helena_burger — atomic, PIN-gated reward redemption
--   * Locks the profile row; enforces 5 wrong attempts → 15-minute lockout.
--   * Never RAISEs on a wrong PIN (a raise would roll back the attempt counter);
--     always returns jsonb so the counter persists.
--   * Deducts exactly 10 stamps (the card holds max 10, so it returns to 0/10).
-- Returns jsonb: { ok, code, message, attempts_remaining, locked_until, redemption_id,
--                  redeemed_at, stamps, member_code, full_name, reward_name }
-- =====================================================================================
create or replace function public.redeem_helena_burger(
  p_user_id    uuid,
  p_input_pin  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile        public.profiles%rowtype;
  v_pin            text;
  v_attempts       integer;
  v_locked_until   timestamptz;
  v_redemption_id  uuid;
  v_redeemed_at    timestamptz;
  v_max_attempts   constant integer := 5;
  v_lockout        constant interval := interval '15 minutes';
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'unauthorized', 'message', 'Not signed in.');
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'unauthorized', 'message', 'Member profile not found.');
  end if;

  if v_profile.pin_locked_until is not null and v_profile.pin_locked_until > now() then
    return jsonb_build_object('ok', false, 'code', 'locked',
      'message', 'Too many wrong PINs. Try again in 15 minutes.',
      'locked_until', v_profile.pin_locked_until);
  end if;

  if coalesce(p_input_pin, '') !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'code', 'bad_request', 'message', 'Enter the 4-digit staff PIN.');
  end if;

  if v_profile.stamps < 10 then
    return jsonb_build_object('ok', false, 'code', 'insufficient_stamps',
      'message', 'You need 10 stamps to redeem a free Helena Burger.');
  end if;

  select current_staff_pin into v_pin from public.store_settings where id = 1;

  if v_pin is null or p_input_pin <> v_pin then
    v_attempts := v_profile.failed_pin_attempts + 1;
    if v_attempts >= v_max_attempts then
      v_locked_until := now() + v_lockout;
      update public.profiles
         set failed_pin_attempts = 0, pin_locked_until = v_locked_until
       where id = p_user_id;
      return jsonb_build_object('ok', false, 'code', 'locked',
        'message', 'Too many wrong PINs. Try again in 15 minutes.',
        'locked_until', v_locked_until);
    end if;
    update public.profiles
       set failed_pin_attempts = v_attempts, pin_locked_until = null
     where id = p_user_id;
    return jsonb_build_object('ok', false, 'code', 'invalid_pin',
      'message', 'Wrong staff PIN.',
      'attempts_remaining', v_max_attempts - v_attempts);
  end if;

  update public.profiles
     set stamps = stamps - 10, failed_pin_attempts = 0, pin_locked_until = null
   where id = p_user_id;

  insert into public.redemptions (user_id, reward_name, stamps_deducted)
  values (p_user_id, 'Helena Burger', 10)
  returning id, redeemed_at into v_redemption_id, v_redeemed_at;

  return jsonb_build_object(
    'ok', true,
    'code', 'redeemed',
    'redemption_id', v_redemption_id,
    'redeemed_at', v_redeemed_at,
    'stamps', v_profile.stamps - 10,
    'member_code', v_profile.member_code,
    'full_name', v_profile.full_name,
    'reward_name', 'Helena Burger'
  );
end;
$$;

-- =====================================================================================
-- RPC: rotate_staff_pin — called by the daily cron (service_role). Returns the new PIN.
-- =====================================================================================
create or replace function public.rotate_staff_pin()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_new text;
begin
  select current_staff_pin into v_old from public.store_settings where id = 1 for update;
  loop
    v_new := lpad((floor(random() * 10000))::integer::text, 4, '0');
    exit when v_new is distinct from v_old;
  end loop;
  insert into public.store_settings (id, current_staff_pin, updated_at)
  values (1, v_new, now())
  on conflict (id) do update set current_staff_pin = excluded.current_staff_pin, updated_at = now();
  return v_new;
end;
$$;

-- Lock down EXECUTE: service_role only.
revoke all on function public.claim_moka_receipt(uuid, text, date, integer, integer) from public, anon, authenticated;
revoke all on function public.redeem_helena_burger(uuid, text) from public, anon, authenticated;
revoke all on function public.rotate_staff_pin() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.claim_moka_receipt(uuid, text, date, integer, integer) to service_role;
grant execute on function public.redeem_helena_burger(uuid, text) to service_role;
grant execute on function public.rotate_staff_pin() to service_role;
