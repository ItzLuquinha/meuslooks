-- Final integrity hardening for the existing Meu Look schema.

-- There should be only one Look do Dia per user. Keep the newest record.
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS row_number
  FROM public.outfits
  WHERE is_day_look = true
)
UPDATE public.outfits AS outfit
SET is_day_look = false
FROM ranked
WHERE outfit.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS outfits_one_day_look_per_user
  ON public.outfits (user_id)
  WHERE is_day_look = true;

-- Legacy favorites are retained as an archive, but are not part of the application model.
DO $$
BEGIN
  IF to_regclass('public.favorites_legacy_20260922') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.favorites_legacy_20260922 ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
