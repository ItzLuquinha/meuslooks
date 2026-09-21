export type Profile = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  is_blocked: boolean;
  created_at: string;
};

export type ClothingItem = {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  subcategory: string | null;
  color: string | null;
  size: string | null;
  brand: string | null;
  occasion: string | null;
  season: string | null;
  notes: string | null;
  image_path: string | null;
  is_favorite: boolean;
  created_at: string;
  clothing_categories?: { name: string } | null;
  image_url?: string | null;
};

export type Outfit = {
  id: string;
  user_id: string;
  name: string;
  occasion: string | null;
  notes: string | null;
  is_favorite: boolean;
  is_day_look: boolean;
  created_at: string;
  outfit_items?: Array<{ clothing_item_id: string; clothing_items: ClothingItem }>;
};
