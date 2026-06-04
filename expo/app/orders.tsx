import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useOrders } from "@/hooks/useOrders";
import Colors from "@/constants/colors";
import {
  ArrowLeft, Clock, ShoppingBag, RotateCcw, ChevronRight,
  Truck, Store, CheckCircle, XCircle, Circle, CalendarDays, Users,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

const STATUS_STEPS = ["pending", "confirmed", "preparing", "ready", "delivering", "completed"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Принят",
  confirmed: "Подтверждён",
  preparing: "Готовится",
  ready: "Готов",
  delivering: "В пути",
  completed: "Завершён",
  cancelled: "Отменён",
};
const STATUS_COLORS: Record<string, string> = {
  pending: Colors.gold,
  confirmed: "#4A90D9",
  preparing: "#E8A040",
  ready: Colors.success,
  delivering: "#4A90D9",
  completed: Colors.success,
  cancelled: Colors.error,
};

const RES_STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
};
const RES_STATUS_COLORS: Record<string, string> = {
  pending: Colors.gold,
  confirmed: Colors.success,
  cancelled: Colors.error,
  completed: Colors.textMuted,
};

import type { Order, Reservation } from "@/hooks/useOrders";

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { clearCart, addItem } = useCart();
  const { orders, reservations, isLoading, isLoadingReservations, refetch } = useOrders(user?.id);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "reservations">("orders");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  function handleReorder(order: Order) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearCart();
    for (const item of order.order_items) {
      const qty = item.quantity || 1;
      for (let i = 0; i < qty; i++) {
        addItem({ id: item.menu_item_id || item.id, name: item.name, price: item.price, image: "" });
      }
    }
    router.back();
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.center]}>
        <Text style={styles.emptyTitle}>Необходима авторизация</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>История</Text>
      </Animated.View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "orders" && styles.tabBtnActive]}
          onPress={() => setActiveTab("orders")}
        >
          <ShoppingBag size={14} color={activeTab === "orders" ? Colors.gold : Colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === "orders" && styles.tabBtnTextActive]}>Заказы</Text>
          {orders.length > 0 && (
            <View style={styles.tabCount}>
              <Text style={styles.tabCountText}>{orders.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "reservations" && styles.tabBtnActive]}
          onPress={() => setActiveTab("reservations")}
        >
          <CalendarDays size={14} color={activeTab === "reservations" ? Colors.gold : Colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === "reservations" && styles.tabBtnTextActive]}>Бронирования</Text>
          {reservations.length > 0 && (
            <View style={styles.tabCount}>
              <Text style={styles.tabCountText}>{reservations.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === "reservations" ? (
        isLoadingReservations ? (
          <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 60 }} />
        ) : reservations.length === 0 ? (
          <View style={styles.center}>
            <CalendarDays size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Нет бронирований</Text>
            <Text style={styles.emptySub}>Ваши бронирования появятся здесь</Text>
          </View>
        ) : (
          <FlatList
            data={reservations}
            keyExtractor={(r) => r.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
            renderItem={({ item: res }) => (
              <View style={styles.resCard}>
                <View style={styles.resTop}>
                  <View style={styles.resInfo}>
                    <Text style={styles.resDate}>
                      {new Date(res.date).toLocaleDateString("ru")} в {res.time}
                    </Text>
                    <Text style={styles.resGuests}>{res.guests} гостей</Text>
                  </View>
                  <View style={[styles.resBadge, {
                    backgroundColor: `${RES_STATUS_COLORS[res.status] || Colors.textMuted}18`,
                    borderColor: `${RES_STATUS_COLORS[res.status] || Colors.textMuted}40`,
                  }]}>
                    <Text style={[styles.resBadgeText, { color: RES_STATUS_COLORS[res.status] || Colors.textMuted }]}>
                      {RES_STATUS_LABELS[res.status] || res.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.resMeta}>
                  <Users size={12} color={Colors.textMuted} />
                  <Text style={styles.resMetaName}>{res.name}</Text>
                  <Text style={styles.resMetaPhone}>{res.phone}</Text>
                </View>
                {res.notes ? <Text style={styles.resNotes}>{res.notes}</Text> : null}
              </View>
            )}
          />
        )
      ) : (
        isLoading ? (
          <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 60 }} />
        ) : orders.length === 0 ? (
          <View style={styles.center}>
            <ShoppingBag size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Нет заказов</Text>
            <Text style={styles.emptySub}>Ваши заказы появятся здесь</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(o) => o.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
            renderItem={({ item: order }) => {
              const isExpanded = expandedId === order.id;
              const statusIdx = STATUS_STEPS.indexOf(order.status);
              const isCancelled = order.status === "cancelled";

              return (
                <View style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardTop}
                    onPress={() => toggleExpand(order.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardLeft}>
                      <Text style={styles.orderId}>
                        Заказ #{(order.id as string).slice(-6).toUpperCase()}
                      </Text>
                      <View style={styles.cardMeta}>
                        <Text style={styles.orderDate}>
                          {new Date(order.created_at).toLocaleDateString("ru", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                        <View style={styles.dot} />
                        <Text style={styles.orderItemsCount}>
                          {order.order_items?.length || 0} поз.
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardRight}>
                      <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[order.status] || Colors.textMuted}18`, borderColor: `${STATUS_COLORS[order.status] || Colors.textMuted}40` }]}>
                        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[order.status] || Colors.textMuted }]} />
                        <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] || Colors.textMuted }]}>
                          {STATUS_LABELS[order.status] || order.status}
                        </Text>
                      </View>
                      <Text style={styles.orderTotal}>{order.total} ₽</Text>
                    </View>
                    <ChevronRight
                      size={16}
                      color={Colors.textMuted}
                      style={{ transform: [{ rotate: isExpanded ? "90deg" : "0deg" }] }}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <Animated.View style={styles.expanded}>
                      {!isCancelled && (
                        <View style={styles.tracker}>
                          {STATUS_STEPS.map((step, i) => {
                            const done = i <= statusIdx;
                            const current = i === statusIdx;
                            return (
                              <View key={step} style={styles.trackerStep}>
                                {done ? (
                                  <CheckCircle size={16} color={STATUS_COLORS[step]} />
                                ) : (
                                  <Circle size={16} color={Colors.textMuted} />
                                )}
                                <Text style={[styles.trackerLabel, done && { color: STATUS_COLORS[step] }, current && { fontWeight: "700" as const }]}>
                                  {STATUS_LABELS[step]}
                                </Text>
                                {i < STATUS_STEPS.length - 1 && (
                                  <View style={[styles.trackerLine, done ? { backgroundColor: STATUS_COLORS[step] } : {}]} />
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}

                      <View style={styles.itemsSection}>
                        {order.order_items?.map((item, i) => (
                          <View key={item.id || i} style={styles.itemRow}>
                            <Text style={styles.itemQty}>{item.quantity}×</Text>
                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.itemPrice}>{item.price * item.quantity} ₽</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.deliveryRow}>
                        {order.delivery_method === "delivery" ? (
                          <>
                            <Truck size={14} color={Colors.gold} />
                            <Text style={styles.deliveryText}>Доставка</Text>
                            {order.delivery_address && (
                              <Text style={styles.deliveryAddr} numberOfLines={1}>{order.delivery_address}</Text>
                            )}
                          </>
                        ) : (
                          <>
                            <Store size={14} color={Colors.gold} />
                            <Text style={styles.deliveryText}>Самовывоз</Text>
                          </>
                        )}
                      </View>

                      {order.status !== "cancelled" && (
                        <TouchableOpacity
                          style={styles.reorderBtn}
                          onPress={() => handleReorder(order)}
                          activeOpacity={0.8}
                        >
                          <RotateCcw size={14} color={Colors.gold} />
                          <Text style={styles.reorderText}>Повторить заказ</Text>
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                  )}
                </View>
              );
            }}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface1,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.5 },

  // Tabs
  tabRow: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  tabBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
  },
  tabBtnActive: { backgroundColor: `${Colors.gold}15`, borderColor: Colors.gold },
  tabBtnText: { fontSize: 13, fontWeight: "600" as const, color: Colors.textMuted },
  tabBtnTextActive: { color: Colors.gold },
  tabCount: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.gold, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5,
  },
  tabCountText: { fontSize: 10, fontWeight: "800" as const, color: Colors.bg },

  list: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },

  // Order cards
  card: {
    backgroundColor: Colors.surface1, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTop: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  cardLeft: { flex: 1 },
  orderId: { fontSize: 15, fontWeight: "700" as const, color: Colors.text, marginBottom: 4 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderDate: { fontSize: 12, color: Colors.textMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.border },
  orderItemsCount: { fontSize: 12, color: Colors.textMuted },
  cardRight: { alignItems: "flex-end", marginRight: 4 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
    marginBottom: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" as const },
  orderTotal: { fontSize: 15, fontWeight: "800" as const, color: Colors.gold },

  expanded: { marginTop: 14 },

  tracker: {
    flexDirection: "row", alignItems: "flex-start",
    paddingBottom: 16, marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  trackerStep: { flex: 1, alignItems: "center", gap: 3 },
  trackerLabel: { fontSize: 8, color: Colors.textMuted, textAlign: "center" },
  trackerLine: {
    height: 1, backgroundColor: Colors.border,
    position: "absolute", top: 7, left: "50%", width: "100%", zIndex: -1,
  },

  itemsSection: {
    backgroundColor: Colors.surface2, borderRadius: 12, padding: 12, gap: 6, marginBottom: 12,
  },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemQty: { fontSize: 13, color: Colors.textMuted, fontWeight: "600" as const, minWidth: 24 },
  itemName: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  itemPrice: { fontSize: 13, color: Colors.text, fontWeight: "600" as const },

  deliveryRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.surface2, borderRadius: 12, padding: 10, marginBottom: 10,
  },
  deliveryText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" as const },
  deliveryAddr: { flex: 1, fontSize: 12, color: Colors.textMuted },

  reorderBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: `${Colors.gold}15`, borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: `${Colors.gold}30`,
  },
  reorderText: { fontSize: 13, color: Colors.gold, fontWeight: "700" as const },

  // Reservation cards
  resCard: {
    backgroundColor: Colors.surface1, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  resTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8,
  },
  resInfo: { flex: 1 },
  resDate: { fontSize: 15, fontWeight: "700" as const, color: Colors.text },
  resGuests: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  resBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  resBadgeText: { fontSize: 11, fontWeight: "700" as const },
  resMeta: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    paddingTop: 10,
  },
  resMetaName: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" as const },
  resMetaPhone: { fontSize: 12, color: Colors.textMuted },
  resNotes: {
    fontSize: 12, color: Colors.textMuted, marginTop: 8,
    fontStyle: "italic",
  },

  emptyTitle: { fontSize: 18, fontWeight: "700" as const, color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textMuted },
  backLink: { fontSize: 14, color: Colors.gold, fontWeight: "600" as const },
});
