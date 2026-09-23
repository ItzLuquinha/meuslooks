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
