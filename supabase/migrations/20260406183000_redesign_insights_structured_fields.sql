alter table public.insights
  add column if not exists campaign_type text,
  add column if not exists main_message text,
  add column if not exists offer_discount_percentage numeric,
  add column if not exists offer_coupon_code text,
  add column if not exists offer_urgency text[] not null default '{}'::text[],
  add column if not exists cta_primary text,
  add column if not exists cta_analysis text,
  add column if not exists product_categories text[] not null default '{}'::text[],
  add column if not exists positioning_angle text,
  add column if not exists strategic_takeaway text,
  add column if not exists priority_level text not null default 'medium',
  add column if not exists impact_area text not null default 'conversion';

update public.insights
set
  campaign_type = coalesce(nullif(campaign_type, ''), initcap(replace(category, '_', ' '))),
  main_message = coalesce(nullif(main_message, ''), nullif(title, ''), left(what_is_happening, 180)),
  offer_urgency = coalesce(offer_urgency, '{}'::text[]),
  cta_analysis = coalesce(
    nullif(cta_analysis, ''),
    case
      when recommended_response ilike '%Measure:%' then left(recommended_response, 500)
      else left(why_it_matters, 500)
    end
  ),
  product_categories = coalesce(product_categories, '{}'::text[]),
  positioning_angle = coalesce(nullif(positioning_angle, ''), left(strategic_implication, 500)),
  strategic_takeaway = coalesce(nullif(strategic_takeaway, ''), left(strategic_implication, 500)),
  priority_level = case
    when priority_level in ('low', 'medium', 'high') then priority_level
    when priority_level = 'critical' then 'high'
    when priority_level = 'monitor' then 'low'
    when confidence is not null and confidence >= 0.86 then 'high'
    when confidence is not null and confidence >= 0.68 then 'medium'
    else 'low'
  end,
  impact_area = case
    when impact_area in ('traffic', 'conversion', 'branding') then impact_area
    when category in ('pricing', 'promotions', 'paid_ads') then 'conversion'
    when category in ('email_strategy', 'cadence_frequency') then 'traffic'
    else 'branding'
  end
where
  campaign_type is null
  or main_message is null
  or cta_analysis is null
  or positioning_angle is null
  or strategic_takeaway is null
  or priority_level not in ('low', 'medium', 'high')
  or impact_area not in ('traffic', 'conversion', 'branding');

alter table public.insights
  alter column campaign_type set not null,
  alter column main_message set not null,
  alter column cta_analysis set not null,
  alter column positioning_angle set not null,
  alter column strategic_takeaway set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'insights_priority_level_check'
  ) then
    alter table public.insights
      add constraint insights_priority_level_check
      check (priority_level in ('low', 'medium', 'high'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'insights_impact_area_check'
  ) then
    alter table public.insights
      add constraint insights_impact_area_check
      check (impact_area in ('traffic', 'conversion', 'branding'));
  end if;
end $$;

create index if not exists idx_insights_workspace_priority_created
  on public.insights (workspace_id, priority_level, created_at desc);

create index if not exists idx_insights_workspace_impact_created
  on public.insights (workspace_id, impact_area, created_at desc);

create index if not exists idx_insights_workspace_campaign_created
  on public.insights (workspace_id, campaign_type, created_at desc);

create index if not exists idx_insights_product_categories
  on public.insights using gin (product_categories);

create index if not exists idx_insights_offer_urgency
  on public.insights using gin (offer_urgency);
