-- Data-integrity cleanup for existing Meu Look projects.

-- 1) Preserve legacy favorites while removing the application's dependency on the old table.
DO $$
BEGIN
  IF to_regclass('public.favorites') IS NOT NULL THEN
    UPDATE public.clothing_items AS item
    SET is_favorite = TRUE
    FROM public.favorites AS favorite
    WHERE favorite.clothing_item_id = item.id
      AND favorite.user_id = item.user_id;

    UPDATE public.outfits AS outfit
    SET is_favorite = TRUE
    FROM public.favorites AS favorite
    WHERE favorite.outfit_id = outfit.id
      AND favorite.user_id = outfit.user_id;

    IF to_regclass('public.favorites_legacy_20260922') IS NULL THEN
      ALTER TABLE public.favorites RENAME TO favorites_legacy_20260922;
    END IF;
  END IF;
END $$;

-- 2) Consolidate duplicate global category names that may have been created by older schema re-runs.
WITH duplicates AS (
  SELECT id,
         first_value(id) OVER (PARTITION BY lower(trim(name)) ORDER BY id) AS keeper_id
  FROM public.clothing_categories
  WHERE user_id IS NULL
)
UPDATE public.clothing_items AS item
SET category_id = duplicates.keeper_id
FROM duplicates
WHERE item.category_id = duplicates.id
  AND duplicates.id <> duplicates.keeper_id;

WITH duplicates AS (
  SELECT id,
         row_number() OVER (PARTITION BY lower(trim(name)) ORDER BY id) AS row_number
  FROM public.clothing_categories
  WHERE user_id IS NULL
)
DELETE FROM public.clothing_categories AS category
USING duplicates
WHERE category.id = duplicates.id
  AND duplicates.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS clothing_categories_global_name_unique
  ON public.clothing_categories (lower(trim(name)))
  WHERE user_id IS NULL;
