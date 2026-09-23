export type Profile = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  is_blocked: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  user_id?: string | null;
  is_active?: boolean;
  created_at?: string;
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
  usage_count?: number;
  last_used?: string | null;
  created_at: string;
  clothing_categories?: Category | Category[] | null;
  image_url?: string | null;
};

export type OutfitItem = {
  clothing_item_id: string;
  clothing_items: ClothingItem;
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
  outfit_items?: OutfitItem[];
};

export type StatsItem = {
  id: string;
  name: string;
  image_path: string | null;
  category: string;
  count: number;
  last_used: string | null;
};

export type Stats = {
  totals: {
    clothing: number;
    outfits: number;
    favorite_clothing: number;
    favorite_outfits: number;
    wears: number;
    never_used: number;
  };
  most_used: StatsItem[];
  never_used: StatsItem[];
  little_used: StatsItem[];
  categories: Array<{ name: string; count: number }>;
  recent_wears: Array<{ id: string; worn_on: string; outfit_name: string }>;
};

export type HomeItem = Pick<ClothingItem, 'id' | 'name' | 'image_path'> & {
  category: string;
};

export type HomeData = {
  profile: Pick<Profile, 'id' | 'name' | 'email'>;
  message: { id: string; title: string; body: string; active: boolean } | null;
  dayLook: Outfit | null;
  saved: Outfit[];
  summary: { clothing: number; outfits: number; favorites: number; never_used: number };
  recentUsed: HomeItem[];
  waiting: HomeItem[];
};
