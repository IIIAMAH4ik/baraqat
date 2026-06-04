import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useCart, type CartItem } from "@/hooks/useCart";
import { useOrders } from "@/hooks/useOrders";
import Colors from "@/constants/colors";
import {
  ShoppingBag, Minus, Plus, Trash2, Truck, Store, CreditCard,
  Clock, RotateCcw, Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { submitOrder } from "@/lib/cart";
import { supabase } from "@/lib/supabase";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Принят", color: Colors.gold },
  preparing: { label: "Готовится", color: "#E8A040" },
  ready: { label: "Готов", color: Colors.success },
  delivering: { label: "В пути", color: "#4A90D9" },
  completed: { label: "Завершён", color: Colors.success },
  cancelled: { label: "Отменён", color: Colors.error },
};

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, deliveryMethod, deliveryAddress, promoCode, comment, removeItem, updateQuantity, clearCart, setDeliveryMethod, setDeliveryAddress, setPromoCode, setComment, itemCount, subtotal } = useCart();
  const { addItem } = useCart();
  const [activeTab, setActiveTab] = useState<"cart" | "history">("cart");
  const { orders, isLoading: loadingOrders, refetch: refetchOrders } = useOrders(user?.id);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (user && activeTab === "history") refetchOrders();
  }, [user, activeTab, refetchOrders]);

  const deliveryFee = deliveryMethod === "delivery" ? 200 : 0;
  const total = subtotal + deliveryFee;
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("cash");

  async function handlePlaceOrder() {
    if (!user || items.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    try {
      const profile = await supabase.from("profiles").select("name,phone").eq("id", user.id).single();
      await submitOrder(
        { items, deliveryMethod, deliveryAddress, promoCode, comment },
        user.id,
        (profile.data?.name as string) || user.name || "Гость",
        (profile.data?.phone as string) || "",
        paymentMethod
      );
      clearCart();
      setOrderPlaced(true);
      setTimeout(() => { setOrderPlaced(false); setActiveTab("history"); refetchOrders(); }, 3000);
    } catch (err) {
      console.error("Order failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReorder(orderItems: { menu_item_id?: string; name?: string; price?: number; quantity?: number }[]) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearCart();
    for (const item of orderItems) {
      const menuItemId = (item.menu_item_id || "") as string;
      const qty = (item.quantity as number) || 1;
      for (let i = 0; i < qty; i++) {
        addItem({
          id: menuItemId,
          name: (item.name as string) || "",
          price: (item.price as number) || 0,
          image: "",
        });
      }
    }
    setActiveTab("cart");
  }

  if (orderPlaced) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.center]}>
        <Animated.View style={[styles.successWrap, { opacity: fadeAnim }]}>
          <View style={styles.successCheck}>
            <Check size={40} color={Colors.bg} strokeWidth={3} />
          </View>
          <Text style={styles.successTitle}>Заказ оформлен!</Text>
          <Text style={styles.successSub}>Ваш заказ принят и готовится</Text>
        </Animated.View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.center]}>
        <ShoppingBag size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Войдите в аккаунт</Text>
        <Text style={styles.emptySub}>чтобы делать заказы</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === "cart" ? "Корзина" : "Заказы"}
        </Text>
      </View>

      {/* TABS */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "cart" && styles.tabActive]}
          onPress={() => setActiveTab("cart")}
        >
          <ShoppingBag size={16} color={activeTab === "cart" ? Colors.gold : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === "cart" && styles.tabTextActive]}>
            Корзина{itemCount > 0 ? ` (${itemCount})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.tabActive]}
          onPress={() => setActiveTab("history")}
        >
          <Clock size={16} color={activeTab === "history" ? Colors.gold : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>История</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "cart" ? (
        /* CART VIEW */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}>
          {items.length === 0 ? (
            <View style={styles.emptyCart}>
              <ShoppingBag size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Корзина пуста</Text>
              <Text style={styles.emptySub}>Добавьте блюда из меню</Text>
            </View>
          ) : (
            <>
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} onRemove={removeItem} onUpdateQty={updateQuantity} />
              ))}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Способ получения</Text>
                <View style={styles.deliveryRow}>
                  <TouchableOpacity
                    style={[styles.deliveryBtn, deliveryMethod === "pickup" && styles.deliveryBtnActive]}
                    onPress={() => setDeliveryMethod("pickup")}
                  >
                    <Store size={16} color={deliveryMethod === "pickup" ? Colors.gold : Colors.textSecondary} />
                    <Text style={[styles.deliveryLabel, deliveryMethod === "pickup" && styles.deliveryLabelActive]}>Самовывоз</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deliveryBtn, deliveryMethod === "delivery" && styles.deliveryBtnActive]}
                    onPress={() => setDeliveryMethod("delivery")}
                  >
                    <Truck size={16} color={deliveryMethod === "delivery" ? Colors.gold : Colors.textSecondary} />
                    <Text style={[styles.deliveryLabel, deliveryMethod === "delivery" && styles.deliveryLabelActive]}>Доставка</Text>
                  </TouchableOpacity>
                </View>
                {deliveryMethod === "delivery" && (
                  <View style={{ marginTop: 12 }}>
                    <TextInput
                      style={styles.promoInput}
                      placeholder="Введите адрес доставки"
                      placeholderTextColor={Colors.textMuted}
                      value={deliveryAddress}
                      onChangeText={setDeliveryAddress}
                    />
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Промокод</Text>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Введите промокод"
                  placeholderTextColor={Colors.textMuted}
                  value={promoCode}
                  onChangeText={setPromoCode}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Комментарий к заказу</Text>
                <TextInput
                  style={[styles.promoInput, { height: 64, textAlignVertical: "top" }]}
                  placeholder="Особые пожелания..."
                  placeholderTextColor={Colors.textMuted}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Способ оплаты</Text>
                <View style={styles.deliveryRow}>
                  <TouchableOpacity
                    style={[styles.deliveryBtn, paymentMethod === "cash" && styles.deliveryBtnActive]}
                    onPress={() => setPaymentMethod("cash")}
                  >
                    <Text style={[styles.deliveryLabel, paymentMethod === "cash" && styles.deliveryLabelActive]}>Наличные</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deliveryBtn, paymentMethod === "card" && styles.deliveryBtnActive]}
                    onPress={() => setPaymentMethod("card")}
                  >
                    <Text style={[styles.deliveryLabel, paymentMethod === "card" && styles.deliveryLabelActive]}>Карта</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.totalCard}>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>Подытог</Text><Text style={styles.totalValue}>{subtotal} ₽</Text></View>
                {deliveryMethod === "delivery" && <View style={styles.totalRow}><Text style={styles.totalLabel}>Доставка</Text><Text style={styles.totalValue}>{deliveryFee} ₽</Text></View>}
                <View style={[styles.totalRow, styles.totalRowBold]}><Text style={styles.totalLabelBold}>Итого</Text><Text style={styles.totalValueBold}>{total} ₽</Text></View>
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        /* HISTORY VIEW */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
          {loadingOrders ? (
            <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
          ) : orders.length === 0 ? (
            <View style={styles.emptyCart}>
              <Clock size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Нет заказов</Text>
              <Text style={styles.emptySub}>Ваши заказы появятся здесь</Text>
            </View>
          ) : (
            orders.map((order) => (
              <OrderCard key={order.id as string} order={order} onReorder={handleReorder} />
            ))
          )}
        </ScrollView>
      )}

      {activeTab === "cart" && items.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[styles.placeBtn, submitting && { opacity: 0.6 }]}
            onPress={handlePlaceOrder}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.bg} />
            ) : (
              <>
                <CreditCard size={18} color={Colors.bg} />
                <Text style={styles.placeBtnText}>Оформить заказ · {total} ₽</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CartItemRow({ item, onRemove, onUpdateQty }: { item: CartItem; onRemove: (id: string) => void; onUpdateQty: (id: string, qty: number) => void }) {
  return (
    <View style={cartItemStyles.card}>
      <View style={cartItemStyles.info}>
        <Text style={cartItemStyles.name}>{item.name}</Text>
        <Text style={cartItemStyles.price}>{item.price} ₽ × {item.quantity}</Text>
      </View>
      <View style={cartItemStyles.actions}>
        <TouchableOpacity style={cartItemStyles.qtyBtn} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onUpdateQty(item.id, item.quantity - 1);
        }}>
          <Minus size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={cartItemStyles.qty}>{item.quantity}</Text>
        <TouchableOpacity style={cartItemStyles.qtyBtn} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onUpdateQty(item.id, item.quantity + 1);
        }}>
          <Plus size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={cartItemStyles.removeBtn} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onRemove(item.id);
        }}>
          <Trash2 size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cartItemStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface1, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600" as const, color: Colors.text, marginBottom: 4 },
  price: { fontSize: 13, color: Colors.gold, fontWeight: "700" as const },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surface2, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  qty: { fontSize: 15, fontWeight: "700" as const, color: Colors.text, minWidth: 20, textAlign: "center" },
  removeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: `${Colors.error}15`, alignItems: "center", justifyContent: "center",
    marginLeft: 4,
  },
});

function OrderCard({ order, onReorder }: { order: Record<string, unknown>; onReorder: (items: Record<string, unknown>[]) => void }) {
  const status = STATUS_MAP[order.status as string] || { label: order.status as string, color: Colors.textSecondary };
  const items = (order.order_items as unknown as Record<string, unknown>[]) || [];
  return (
    <View style={orderStyles.card}>
      <View style={orderStyles.header}>
        <View style={[orderStyles.statusBadge, { backgroundColor: `${status.color}18`, borderColor: `${status.color}40` }]}>
          <View style={[orderStyles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[orderStyles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        <Text style={orderStyles.date}>{new Date(order.created_at as string).toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={orderStyles.itemRow}>
          <Text style={orderStyles.itemName} numberOfLines={1}>{item.quantity as number}× {item.name as string}</Text>
          <Text style={orderStyles.itemPrice}>{(item.price as number) * (item.quantity as number)} ₽</Text>
        </View>
      ))}
      <View style={orderStyles.footer}>
        <View style={orderStyles.footerLeft}>
          <Text style={orderStyles.totalLabel}>Итого</Text>
          <Text style={orderStyles.totalValue}>{order.total as number} ₽</Text>
        </View>
        <TouchableOpacity
          style={orderStyles.reorderBtn}
          onPress={() => onReorder(items)}
          activeOpacity={0.8}
        >
          <RotateCcw size={14} color={Colors.gold} />
          <Text style={orderStyles.reorderText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const orderStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface1, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" as const },
  date: { fontSize: 11, color: Colors.textMuted },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  itemName: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  itemPrice: { fontSize: 13, color: Colors.text, fontWeight: "500" as const, marginLeft: 12 },
  footer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    paddingTop: 10, marginTop: 8,
  },
  footerLeft: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  totalLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" as const },
  totalValue: { fontSize: 15, color: Colors.gold, fontWeight: "700" as const },
  reorderBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: `${Colors.gold}15`, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: `${Colors.gold}30`,
  },
  reorderText: { fontSize: 12, color: Colors.gold, fontWeight: "600" as const },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: "center", justifyContent: "center", padding: 40 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.8 },
  promoInput: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.text,
  },

  tabRow: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: `${Colors.gold}15`, borderColor: Colors.gold },
  tabText: { fontSize: 13, fontWeight: "600" as const, color: Colors.textMuted },
  tabTextActive: { color: Colors.gold },

  emptyCart: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" as const, color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textMuted },

  section: { marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" as const, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  deliveryRow: { flexDirection: "row", gap: 10 },
  deliveryBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.surface1,
    borderWidth: 1, borderColor: Colors.border,
  },
  deliveryBtnActive: { borderColor: Colors.gold, backgroundColor: `${Colors.gold}12` },
  deliveryLabel: { fontSize: 13, fontWeight: "600" as const, color: Colors.textSecondary },
  deliveryLabelActive: { color: Colors.gold },

  totalCard: {
    backgroundColor: Colors.surface1, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border, marginTop: 16, gap: 10,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalRowBold: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingTop: 10,
  },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 14, color: Colors.text, fontWeight: "600" as const },
  totalLabelBold: { fontSize: 16, color: Colors.text, fontWeight: "700" as const },
  totalValueBold: { fontSize: 18, color: Colors.gold, fontWeight: "800" as const },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: Colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  placeBtn: {
    backgroundColor: Colors.gold, borderRadius: 18, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  placeBtnText: { fontSize: 16, fontWeight: "700" as const, color: Colors.bg, letterSpacing: 0.3 },

  successWrap: { alignItems: "center", gap: 16 },
  successCheck: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.gold,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
  },
  successTitle: { fontSize: 28, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.5 },
  successSub: { fontSize: 14, color: Colors.textSecondary },
});
