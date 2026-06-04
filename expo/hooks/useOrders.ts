import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  menu_item_id: string;
  modifiers?: { name: string; price: number }[];
  notes?: string;
}

export interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  delivery_method: string;
  delivery_address: string | null;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  comment: string | null;
  promo_code: string | null;
  created_at: string;
  estimated_minutes: number | null;
  order_items: OrderItem[];
}

export interface Reservation {
  id: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
  status: string;
  notes: string | null;
  created_at: string;
}

async function fetchOrders(userId: string): Promise<Order[]> {
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as unknown as Order[]) || [];
}

async function fetchReservations(userId: string): Promise<Reservation[]> {
  const { data } = await supabase
    .from("reservations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data as unknown as Reservation[]) || [];
}

/** Hook to fetch user's orders with React Query caching. */
export function useOrders(userId: string | undefined) {
  const ordersQuery = useQuery({
    queryKey: ["orders", userId],
    queryFn: () => fetchOrders(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  const reservationsQuery = useQuery({
    queryKey: ["reservations", userId],
    queryFn: () => fetchReservations(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  return {
    orders: ordersQuery.data ?? [],
    reservations: reservationsQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    isLoadingReservations: reservationsQuery.isLoading,
    error: ordersQuery.error,
    refetch: () => {
      ordersQuery.refetch();
      reservationsQuery.refetch();
    },
  };
}
