create table if not exists public.of_creator_automation_scenarios (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  scenario_key text not null check (scenario_key in ('new_subscriber', 'subscription_expiring', 'inactive_subscriber', 'ppv_promotion')),
  label text not null,
  description text,
  trigger_event_type text not null,
  linked_script_id uuid references public.of_message_scripts(id) on delete set null,
  enabled boolean not null default true,
  creator_enabled boolean not null default true,
  action_mode_override text check (action_mode_override in ('task_only', 'draft_for_approval', 'auto_send')),
  metadata jsonb not null default '{}'::jsonb,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_creator_automation_scenarios_creator_key unique (creator_id, scenario_key)
);

create trigger set_of_creator_automation_scenarios_updated_at
before update on public.of_creator_automation_scenarios
for each row execute function public.set_updated_at();

create index if not exists of_creator_automation_scenarios_creator_enabled_idx
on public.of_creator_automation_scenarios (creator_id, creator_enabled, enabled, trigger_event_type);

alter table public.of_creator_automation_scenarios enable row level security;
grant select, insert, update, delete on public.of_creator_automation_scenarios to authenticated;
grant select, insert, update, delete on public.of_creator_automation_scenarios to service_role;

create policy "agency users can manage creator automation scenarios"
on public.of_creator_automation_scenarios for all to authenticated using (true) with check (true);

with template_scripts as (
  insert into public.of_message_scripts (
    creator_id,
    name,
    description,
    trigger_event_type,
    status,
    action_mode,
    auto_send_enabled,
    requires_approval,
    cooldown_hours,
    max_sends_per_fan,
    folder_name,
    category,
    tags,
    version_number,
    builder_config
  )
  select
    creator.id,
    template.name,
    template.description,
    template.trigger_event_type,
    'inactive',
    template.action_mode,
    template.action_mode = 'auto_send',
    template.action_mode <> 'auto_send',
    template.cooldown_hours,
    template.max_sends_per_fan,
    'Starter Automations',
    template.category,
    template.tags,
    1,
    jsonb_build_object(
      'schemaVersion', 1,
      'variables', template.variables
    )
  from public.of_creators creator
  cross join (
    values
      (
        'New Subscriber Welcome',
        'Welcome new subscribers, ask an engagement question, follow up, branch on preference, and offer an upsell.',
        'subscriber_created',
        'draft_for_approval',
        24,
        1,
        'new_subscriber',
        array['starter','scenario:new_subscriber','welcome','engagement','upsell']::text[],
        jsonb_build_array(
          jsonb_build_object('key','preferred_vibe','label','Preferred vibe','defaultValue',''),
          jsonb_build_object('key','upsell_offer','label','Upsell offer','defaultValue','exclusive set'),
          jsonb_build_object('key','subscriber_name','label','Subscriber name','defaultValue','there')
        )
      ),
      (
        'Subscription Expiring Save',
        'Remind a subscriber about renewal, offer an incentive, then follow up before expiry.',
        'subscriber_expiring',
        'draft_for_approval',
        24,
        1,
        'subscription_expiring',
        array['starter','scenario:subscription_expiring','renewal','retention']::text[],
        jsonb_build_array(
          jsonb_build_object('key','renewal_offer','label','Renewal incentive','defaultValue','special unlock'),
          jsonb_build_object('key','days_until_expiry','label','Days until expiry','defaultValue','3')
        )
      ),
      (
        'Inactive Subscriber Reconnect',
        'Reconnect with an inactive subscriber, promote a comeback offer, and restart engagement.',
        'subscriber_inactive',
        'draft_for_approval',
        72,
        1,
        'inactive_subscriber',
        array['starter','scenario:inactive_subscriber','reconnect','promotion']::text[],
        jsonb_build_array(
          jsonb_build_object('key','comeback_offer','label','Comeback offer','defaultValue','limited bundle'),
          jsonb_build_object('key','last_active_days','label','Last active days','defaultValue','14')
        )
      ),
      (
        'PPV Timed Offer',
        'Launch a timed PPV offer, follow up, and branch based on purchase or no-purchase outcome.',
        'ppv_promotion',
        'draft_for_approval',
        24,
        1,
        'ppv_promotion',
        array['starter','scenario:ppv_promotion','ppv','timed_offer']::text[],
        jsonb_build_array(
          jsonb_build_object('key','ppv_offer_name','label','Offer name','defaultValue','VIP drop'),
          jsonb_build_object('key','ppv_price','label','Offer price','defaultValue','29'),
          jsonb_build_object('key','offer_window_hours','label','Offer window hours','defaultValue','24')
        )
      )
  ) as template(name, description, trigger_event_type, action_mode, cooldown_hours, max_sends_per_fan, category, tags, variables)
  where not exists (
    select 1
    from public.of_message_scripts existing
    where existing.creator_id = creator.id
      and lower(existing.name) = lower(template.name)
  )
  returning id, creator_id, name, category
),
scenario_templates as (
  select *
  from (
    values
      ('new_subscriber', 'New Subscriber', 'Start a welcome automation for new subscribers.', 'subscriber_created'),
      ('subscription_expiring', 'Subscription Expiring', 'Run a renewal-save automation before expiration.', 'subscriber_expiring'),
      ('inactive_subscriber', 'Inactive Subscriber', 'Reconnect dormant subscribers with a comeback flow.', 'subscriber_inactive'),
      ('ppv_promotion', 'PPV Promotion', 'Run a timed PPV promotional flow.', 'ppv_promotion')
  ) as item(scenario_key, label, description, trigger_event_type)
)
insert into public.of_creator_automation_scenarios (
  creator_id,
  scenario_key,
  label,
  description,
  trigger_event_type,
  linked_script_id,
  enabled,
  creator_enabled,
  metadata
)
select
  creator.id,
  scenario_templates.scenario_key,
  scenario_templates.label,
  scenario_templates.description,
  scenario_templates.trigger_event_type,
  coalesce(script.id, seeded.id),
  true,
  true,
  jsonb_build_object('starter', true)
from public.of_creators creator
cross join scenario_templates
left join public.of_message_scripts script
  on script.creator_id = creator.id
 and lower(script.category) = lower(scenario_templates.scenario_key)
left join template_scripts seeded
  on seeded.creator_id = creator.id
 and lower(seeded.category) = lower(scenario_templates.scenario_key)
on conflict (creator_id, scenario_key) do nothing;

with script_rows as (
  select id, creator_id, name
  from public.of_message_scripts
  where name in (
    'New Subscriber Welcome',
    'Subscription Expiring Save',
    'Inactive Subscriber Reconnect',
    'PPV Timed Offer'
  )
),
step_rows as (
  select *
  from (
    values
      ('New Subscriber Welcome', 'intro', 0, 'message', 'Hey {{subscriber_name}}, thanks for subscribing. I''m so glad you''re here.', 0, null, null, jsonb_build_object('kind','send_message','label','Welcome message','nodeKey','intro')),
      ('New Subscriber Welcome', 'engagement', 1, 'question', 'What kind of vibe are you most excited for right now: playful, flirty, or VIP?', 0, null, null, jsonb_build_object('kind','ask_question','label','Engagement question','nodeKey','engagement')),
      ('New Subscriber Welcome', 'followup', 2, 'message', 'I''ve got you. I can tailor the experience once I know what you''re into.', 1440, null, null, jsonb_build_object('kind','send_message','label','Follow-up','nodeKey','followup')),
      ('New Subscriber Welcome', 'branch', 3, 'branch', null, null, null, null, jsonb_build_object('kind','branch','label','Personalised branch','nodeKey','branch','branchRules',jsonb_build_array(
        jsonb_build_object('id','playful','label','Playful','condition',jsonb_build_object('source','variable','key','last_reply_text','operator','contains','value','playful'),'nextStepId','upsell'),
        jsonb_build_object('id','flirty','label','Flirty','condition',jsonb_build_object('source','variable','key','last_reply_text','operator','contains','value','flirty'),'nextStepId','upsell'),
        jsonb_build_object('id','vip','label','VIP','condition',jsonb_build_object('source','variable','key','last_reply_text','operator','contains','value','vip'),'nextStepId','upsell')
      ))),
      ('New Subscriber Welcome', 'upsell', 4, 'message', 'Perfect. I can line up an {{upsell_offer}} if you want a little extra tonight.', 0, null, null, jsonb_build_object('kind','send_message','label','Upsell','nodeKey','upsell')),
      ('New Subscriber Welcome', 'end', 5, 'end', null, null, null, null, jsonb_build_object('kind','end_conversation','label','Finish','nodeKey','end')),

      ('Subscription Expiring Save', 'reminder', 0, 'message', 'Your subscription is nearly up. I''d love to keep you close for what''s coming next.', 0, null, null, jsonb_build_object('kind','send_message','label','Reminder','nodeKey','reminder')),
      ('Subscription Expiring Save', 'incentive', 1, 'message', 'If you renew in the next {{days_until_expiry}} days, I can unlock a {{renewal_offer}} just for you.', 0, null, null, jsonb_build_object('kind','send_message','label','Incentive','nodeKey','incentive')),
      ('Subscription Expiring Save', 'followup', 2, 'message', 'Quick follow-up in case you missed it. I''d hate for you to lose your place here.', 1440, null, null, jsonb_build_object('kind','send_message','label','Follow-up','nodeKey','followup')),
      ('Subscription Expiring Save', 'end', 3, 'end', null, null, null, null, jsonb_build_object('kind','end_conversation','label','Finish','nodeKey','end')),

      ('Inactive Subscriber Reconnect', 'reconnect', 0, 'message', 'It''s been a minute and I wanted to check in. I''ve got something new I think you''d enjoy.', 0, null, null, jsonb_build_object('kind','send_message','label','Reconnect message','nodeKey','reconnect')),
      ('Inactive Subscriber Reconnect', 'promo', 1, 'message', 'If you''re up for it, I can bring you back with a {{comeback_offer}}.', 0, null, null, jsonb_build_object('kind','send_message','label','Promotional offer','nodeKey','promo')),
      ('Inactive Subscriber Reconnect', 'restart', 2, 'question', 'Want me to restart with something soft, spicy, or premium?', 1440, null, null, jsonb_build_object('kind','ask_question','label','Restart engagement','nodeKey','restart')),
      ('Inactive Subscriber Reconnect', 'end', 3, 'end', null, null, null, null, jsonb_build_object('kind','end_conversation','label','Finish','nodeKey','end')),

      ('PPV Timed Offer', 'offer', 0, 'message', 'I''m opening a timed {{ppv_offer_name}} for the next {{offer_window_hours}} hours at {{ppv_price}}.', 0, null, null, jsonb_build_object('kind','send_message','label','Timed offer','nodeKey','offer')),
      ('PPV Timed Offer', 'wait', 1, 'wait', null, 1440, null, null, jsonb_build_object('kind','wait','label','Wait for purchase window','nodeKey','wait')),
      ('PPV Timed Offer', 'followup', 2, 'message', 'Last call on the {{ppv_offer_name}} before I close it out.', 0, null, null, jsonb_build_object('kind','send_message','label','Follow-up','nodeKey','followup')),
      ('PPV Timed Offer', 'branch', 3, 'branch', null, null, null, null, jsonb_build_object('kind','branch','label','Purchase branch','nodeKey','branch','branchRules',jsonb_build_array(
        jsonb_build_object('id','purchased','label','Purchased','condition',jsonb_build_object('source','event','key','payload.purchase_status','operator','equals','value','purchased'),'nextStepId','purchase'),
        jsonb_build_object('id','no_purchase','label','No purchase','condition',jsonb_build_object('source','event','key','payload.purchase_status','operator','equals','value','not_purchased'),'nextStepId','no_purchase')
      ))),
      ('PPV Timed Offer', 'purchase', 4, 'message', 'You got it. I''m sending the {{ppv_offer_name}} through now.', 0, null, null, jsonb_build_object('kind','send_message','label','Purchase branch','nodeKey','purchase')),
      ('PPV Timed Offer', 'no_purchase', 5, 'message', 'No pressure. I can keep you posted when the next offer drops.', 0, null, null, jsonb_build_object('kind','send_message','label','No-purchase branch','nodeKey','no_purchase')),
      ('PPV Timed Offer', 'end', 6, 'end', null, null, null, null, jsonb_build_object('kind','end_conversation','label','Finish','nodeKey','end'))
  ) as item(script_name, step_key, step_order, step_type, message_body, delay_minutes, condition_key, condition_value, metadata)
),
seeded as (
  insert into public.of_message_script_steps (
    script_id,
    step_order,
    step_type,
    message_body,
    delay_minutes,
    condition_key,
    condition_value,
    metadata
  )
  select
    script_rows.id,
    step_rows.step_order,
    step_rows.step_type,
    step_rows.message_body,
    step_rows.delay_minutes,
    step_rows.condition_key,
    step_rows.condition_value,
    step_rows.metadata
  from script_rows
  join step_rows on step_rows.script_name = script_rows.name
  where not exists (
    select 1
    from public.of_message_script_steps existing
    where existing.script_id = script_rows.id
  )
  returning script_id
)
select count(*) from seeded;
