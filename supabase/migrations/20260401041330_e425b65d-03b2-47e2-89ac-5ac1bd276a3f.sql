-- Meta Ads tables
CREATE TABLE public.meta_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  competitor_id uuid REFERENCES public.competitors(id) ON DELETE SET NULL,
  meta_ad_id text,
  page_id text,
  page_name text,
  ad_snapshot_url text,
  ad_creative_bodies text[] DEFAULT '{}',
  ad_creative_link_titles text[] DEFAULT '{}',
  ad_creative_link_descriptions text[] DEFAULT '{}',
  ad_creative_link_captions text[] DEFAULT '{}',
  cta_type text,
  ad_delivery_start_time timestamp with time zone,
  ad_delivery_stop_time timestamp with time zone,
  is_active boolean DEFAULT true,
  platforms text[] DEFAULT '{}',
  publisher_platforms text[] DEFAULT '{}',
  estimated_audience_size jsonb DEFAULT '{}',
  spend_range jsonb DEFAULT '{}',
  impressions_range jsonb DEFAULT '{}',
  currency text,
  languages text[] DEFAULT '{}',
  media_type text,
  media_url text,
  thumbnail_url text,
  first_seen_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  raw_data jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, meta_ad_id)
);

ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view meta ads" ON public.meta_ads
  FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert meta ads" ON public.meta_ads
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update meta ads" ON public.meta_ads
  FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete meta ads" ON public.meta_ads
  FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.meta_ad_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meta_ad_id uuid NOT NULL REFERENCES public.meta_ads(id) ON DELETE CASCADE,
  message_angle text,
  offer_angle text,
  promo_language text,
  urgency_style text,
  audience_clues text[] DEFAULT '{}',
  funnel_intent text,
  creative_pattern text,
  product_category text,
  strategy_takeaways text[] DEFAULT '{}',
  confidence_scores jsonb DEFAULT '{}',
  overall_confidence numeric,
  model_used text,
  raw_analysis jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_ad_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ad analyses" ON public.meta_ad_analyses
  FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert ad analyses" ON public.meta_ad_analyses
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

ALTER TABLE public.competitors ADD COLUMN IF NOT EXISTS meta_page_ids text[] DEFAULT '{}';