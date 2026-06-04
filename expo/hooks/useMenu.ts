import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  category_id: string;
  badge?: string | null;
  weight_grams?: number | null;
  calories?: number | null;
  updated_at?: string;
}

export interface MenuCategory {
  id: string;
  label: string;
  emoji: string;
  sort_order: number;
}

export interface MenuData {
  items: MenuItem[];
  categories: MenuCategory[];
  updatedAt: string;
}

const MENU_KEY = ["menu"] as const;

async function fetchMenu(): Promise<MenuData> {
  const [itemsRes, catsRes] = await Promise.all([
    supabase.from("menu_items").select("*").order("sort_order"),
    supabase.from("menu_categories").select("*").order("sort_order"),
  ]);

  const items = (itemsRes.data as unknown as MenuItem[]) || [];
  const cats = (catsRes.data as unknown as MenuCategory[]) || [];

  const latest = items.reduce((max, i) => {
    const d = i.updated_at || "";
    return d > max ? d : max;
  }, "");

  const updatedAt = latest
    ? new Date(latest).toLocaleDateString("ru", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("ru", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  return { items, categories: cats, updatedAt };
}

/** Hook that fetches the full menu (items + categories) with React Query caching. */
export function useMenu() {
  const query = useQuery({
    queryKey: MENU_KEY,
    queryFn: fetchMenu,
    staleTime: 5 * 60 * 1000,
  });

  return {
    items: query.data?.items ?? [],
    categories: query.data?.categories ?? [],
    updatedAt: query.data?.updatedAt ?? "",
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
