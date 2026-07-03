create table if not exists public.of_revenue_journeys (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  name text not null,
  description text,
  source_channel text not null,
  target_channel text not null,
  audience text not null,
  trigger_event text not null,
  conversation_flow_id uuid not null references public.of_message_scripts(id) on delete restrict,
  expected_outcome text not null,
  success_event text not null,
  failure_event text not null,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_revenue_journeys_status_check check (status in ('draft', 'active', 'paused', 'archived')),
  constraint of_revenue_journeys_creator_name_unique unique (creator_id, name)
);

alter table public.of_revenue_journeys enable row level security;

grant select, insert, update, delete on table public.of_revenue_journeys to service_role;

create index if not exists of_revenue_journeys_creator_status_idx
  on public.of_revenue_journeys (creator_id, status);

create index if not exists of_revenue_journeys_route_idx
  on public.of_revenue_journeys (creator_id, source_channel, trigger_event, status);

alter table public.of_automation_simulations
add column if not exists journey_id uuid references public.of_revenue_journeys(id) on delete set null;

create index if not exists of_automation_simulations_journey_id_idx
  on public.of_automation_simulations (journey_id);

do $$
declare
  creator_record record;
  funnel_id uuid;
begin
  for creator_record in
    select id
    from public.of_creators
    where active = true
  loop
    select id
    into funnel_id
    from public.of_message_scripts
    where creator_id = creator_record.id
      and name = 'New Subscriber Funnel'
    order by updated_at desc
    limit 1;

    if funnel_id is not null then
      insert into public.of_revenue_journeys (
        creator_id,
        name,
        description,
        source_channel,
        target_channel,
        audience,
        trigger_event,
        conversation_flow_id,
        expected_outcome,
        success_event,
        failure_event,
        status,
        metadata
      )
      values (
        creator_record.id,
        'Instagram Follower -> OnlyFans Subscriber',
        'Routes Instagram follower replies into the current New Subscriber Funnel while the dedicated IG qualification flow is still future work.',
        'instagram',
        'onlyfans',
        'instagram_followers',
        'instagram_story_reply',
        funnel_id,
        'onlyfans_subscribed',
        'subscriber_created',
        'journey_timeout',
        'active',
        jsonb_build_object(
          'seed', true,
          'seed_key', 'instagram_follower_to_onlyfans_subscriber',
          'alternate_trigger_events', jsonb_build_array('instagram_dm_received'),
          'scope_note', 'FunkMyFans-local routing shim; Hermes is intentionally out of scope.'
        )
      )
      on conflict (creator_id, name) do update
      set
        source_channel = excluded.source_channel,
        target_channel = excluded.target_channel,
        audience = excluded.audience,
        trigger_event = excluded.trigger_event,
        conversation_flow_id = excluded.conversation_flow_id,
        expected_outcome = excluded.expected_outcome,
        success_event = excluded.success_event,
        failure_event = excluded.failure_event,
        status = excluded.status,
        metadata = public.of_revenue_journeys.metadata || excluded.metadata,
        updated_at = now();
    end if;
  end loop;
end $$;
