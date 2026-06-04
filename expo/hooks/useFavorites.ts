import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface FavoriteItem {
  id: string;
  user_id: string;
  menu_item_id: string;
  created_at: string;
  menu_items?: {
    id: string;
    name: string;
    price: number;
    image: string;
    description: string;
  };
}

const FAVORITES_KEY = ["favorites"] as const;

async function fetchFavorites(userId: string): Promise<FavoriteItem[]> {
  const { data } = await supabase
    .from("favorites")
    .select("*, menu_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as unknown as FavoriteItem[]) || [];
}

async function addFavorite(userId: string, menuItemId: string) {
  await supabase.from("favorites").insert({
    user_id: userId,
    menu_item_id: menuItemId,
  });
}

async function removeFavorite(userId: string, menuItemId: string) {
  await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("menu_item_id", menuItemId);
}

/** Hook for favorites CRUD with React Query caching. */
export function useFavorites(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...FAVORITES_KEY, userId],
    queryFn: () => fetchFavorites(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  const favIds = new Set((query.data ?? []).map((f) => f.menu_item_id));

  const isFav = (menuItemId: string) => favIds.has(menuItemId);

  const toggleMutation = useMutation({
    mutationFn: async ({
      menuItemId,
      isCurrentlyFav,
    }: {
      menuItemId: string;
      isCurrentlyFav: boolean;
    }) => {
      if (!userId) return;
      if (isCurrentlyFav) {
        await removeFavorite(userId, menuItemId);
      } else {
        await addFavorite(userId, menuItemId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });

  return {
    favorites: query.data ?? [],
    isLoading: query.isLoading,
    isFav,
    toggle: (menuItemId: string) =>
      toggleMutation.mutate({
        menuItemId,
        isCurrentlyFav: isFav(menuItemId),
      }),
    refetch: query.refetch,
  };
}

/** Check if a single menu item is favorited. For use in item cards. */
export function useIsFavorite(userId: string | undefined, menuItemId: string) {
  const query = useQuery({
    queryKey: ["fav-check", userId, menuItemId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("menu_item_id", menuItemId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  return query.data ?? false;
}
