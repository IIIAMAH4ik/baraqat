import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  avatar_url?: string;
  birthday?: string;
  bonus_balance?: number;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoyaltyData {
  id: string;
  user_id: string;
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  total_earned: number;
  total_spent: number;
  updated_at?: string;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  type: "earn" | "spend";
  amount: number;
  description: string;
  order_id?: string;
  created_at: string;
}

export const TIER_LABEL: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export const TIER_COLOR: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#C9A84C",
  platinum: "#E5E4E2",
};

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return (data as unknown as Profile) || null;
}

async function fetchLoyalty(userId: string): Promise<LoyaltyData | null> {
  const { data } = await supabase
    .from("loyalty_points")
    .select("*")
    .eq("user_id", userId)
    .single();
  return (data as unknown as LoyaltyData) || null;
}

async function fetchLoyaltyTransactions(
  userId: string
): Promise<LoyaltyTransaction[]> {
  const { data } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data as unknown as LoyaltyTransaction[]) || [];
}

/** Hook for profile + loyalty data with React Query caching. */
export function useProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const loyaltyQuery = useQuery({
    queryKey: ["loyalty", userId],
    queryFn: () => fetchLoyalty(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  const transactionsQuery = useQuery({
    queryKey: ["loyalty-transactions", userId],
    queryFn: () => fetchLoyaltyTransactions(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<Profile, "name" | "phone" | "birthday" | "avatar_url">>) => {
      if (!userId) return;
      await supabase
        .from("profiles")
        .upsert(
          { id: userId, ...updates, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });

  return {
    profile: profileQuery.data ?? null,
    loyalty: loyaltyQuery.data ?? null,
    transactions: transactionsQuery.data ?? [],
    isLoading: profileQuery.isLoading,
    isLoadingLoyalty: loyaltyQuery.isLoading,
    isLoadingTransactions: transactionsQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    refetch: () => {
      profileQuery.refetch();
      loyaltyQuery.refetch();
      transactionsQuery.refetch();
    },
  };
}
