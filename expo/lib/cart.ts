import { supabase } from "@/lib/supabase";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  modifiers: { name: string; price: number }[];
  notes: string;
}

export interface CartState {
  items: CartItem[];
  deliveryMethod: "pickup" | "delivery";
  deliveryAddress: string;
  promoCode: string;
  comment: string;
}

export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const modifierTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0);
    return sum + (item.price + modifierTotal) * item.quantity;
  }, 0);
}

export async function submitOrder(
  cart: CartState,
  userId: string,
  customerName: string,
  customerPhone: string,
  paymentMethod: "cash" | "card" = "cash"
) {
  const subtotal = calculateSubtotal(cart.items);
  const deliveryFee = cart.deliveryMethod === "delivery" ? 200 : 0;
  const total = subtotal + deliveryFee;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      status: "pending",
      delivery_method: cart.deliveryMethod,
      delivery_address: cart.deliveryAddress || null,
      comment: cart.comment || null,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      promo_code: cart.promoCode || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      payment_method: paymentMethod,
      estimated_minutes: 30,
    })
    .select()
    .single();

  if (error || !order) throw error || new Error("Failed to create order");

  const orderItems = cart.items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    modifiers: item.modifiers,
    notes: item.notes || "",
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) throw itemsError;

  // Award loyalty points: 5% of order total
  const bonusEarned = Math.round(total * 0.05);
  if (bonusEarned > 0) {
    const { data: lp } = await supabase.from("loyalty_points").select("id,points,total_earned,total_spent,tier").eq("user_id", userId).single();
    if (lp) {
      const newPoints = (lp.points as number) + bonusEarned;
      const newEarned = (lp.total_earned as number) + bonusEarned;
      const newSpent = (lp.total_spent as number) + total;
      // Determine tier based on total spent
      let tier = "bronze";
      if (newSpent >= 100000) tier = "platinum";
      else if (newSpent >= 50000) tier = "gold";
      else if (newSpent >= 20000) tier = "silver";

      await Promise.all([
        supabase.from("loyalty_points").update({
          points: newPoints,
          total_earned: newEarned,
          total_spent: newSpent,
          tier,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId),
        supabase.from("loyalty_transactions").insert({
          user_id: userId,
          type: "earn",
          amount: bonusEarned,
          description: `Заказ #${(order.id as string).slice(-6)}`,
          order_id: order.id,
        }),
      ]);
    }
  }

  return order;
}
