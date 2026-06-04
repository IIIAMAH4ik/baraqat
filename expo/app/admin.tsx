import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Colors from "@/constants/colors";
import {
  BarChart3, TrendingUp, Users, DollarSign, ShoppingBag,
  Package, ChefHat, Clock, ArrowUp, ArrowDown, RefreshCw,
  ClipboardList, Settings, Truck, Tag, UtensilsCrossed,
  ChevronRight, Activity, Shield,
} from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AnalyticsStats {
  todayRevenue: number;
  todayOrders: number;
  todayAvgCheck: number;
  pendingOrders: number;
  activeOrders: number;
  totalCustomers: number;
  monthlyRevenue: number;
  growth: number;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [stats, setStats] = useState<AnalyticsStats>({
    todayRevenue: 0, todayOrders: 0, todayAvgCheck: 0,
    pendingOrders: 0, activeOrders: 0, totalCustomers: 0,
    monthlyRevenue: 0, growth: 0,
  });
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"dashboard" | "orders">("dashboard");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ordersRes, profilesRes] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("id"),
      ]);
      const ords = (ordersRes.data as unknown as Record<string, unknown>[]) || [];
      setOrders(ords);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const todayOrds = ords.filter((o) => (o.created_at as string) >= today);
      const monthOrds = ords.filter((o) => (o.created_at as string) >= monthStart);

      const todayRev = todayOrds.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const monthRev = monthOrds.reduce((s, o) => s + (Number(o.total) || 0), 0);

      setStats({
        todayRevenue: todayRev,
        todayOrders: todayOrds.length,
        todayAvgCheck: todayOrds.length > 0 ? Math.round(todayRev / todayOrds.length) : 0,
        pendingOrders: ords.filter((o) => o.status === "pending").length,
        activeOrders: ords.filter((o) => ["pending", "preparing", "ready", "delivering"].includes(o.status as string)).length,
        totalCustomers: (profilesRes.data as unknown[])?.length || 0,
        monthlyRevenue: monthRev,
        growth: 12,
      });
    } catch (err) {
      console.error("Admin load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    await supabase.from("orders").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", orderId);
    loadData();
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.center]}>
        <Text style={styles.emptyText}>Необходима авторизация</Text>
      </View>
    );
  }

  const adminRoles = ["admin", "manager", "cashier", "kitchen", "warehouse"];
  const isAdmin = user.role ? adminRoles.includes(user.role) : false;
  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.center]}>
        <Shield size={48} color={Colors.textMuted} />
        <Text style={styles.emptyText}>Нет доступа</Text>
        <Text style={styles.emptySub}>Только для администраторов</Text>
      </View>
    );
  }

  const statusSteps = ["pending", "preparing", "ready", "delivering", "completed"];
  const statusLabels: Record<string, string> = {
    pending: "Принят", preparing: "Готовится", ready: "Готов",
    delivering: "В пути", completed: "Завершён", cancelled: "Отменён",
  };
  const statusColors: Record<string, string> = {
    pending: Colors.gold, preparing: "#E8A040", ready: Colors.success,
    delivering: "#4A90D9", completed: Colors.success, cancelled: Colors.error,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.headerTitle}>Админ-панель</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <RefreshCw size={16} color={Colors.gold} />
        </TouchableOpacity>
      </Animated.View>

      {/* SECTION TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabs}>
        {[
          { id: "dashboard", label: "Дашборд", icon: BarChart3 },
          { id: "orders", label: "Заказы", icon: ClipboardList },
        ].map((s) => {
          const isActive = activeSection === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.sectionTab, isActive && styles.sectionTabActive]}
              onPress={() => setActiveSection(s.id as typeof activeSection)}
            >
              <s.icon size={14} color={isActive ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.sectionTabText, isActive && styles.sectionTabTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
          {activeSection === "dashboard" && (
            <>
              {/* STAT CARDS */}
              <View style={styles.statsGrid}>
                <StatCard
                  icon={<DollarSign size={20} color={Colors.gold} />}
                  label="Выручка сегодня"
                  value={`${stats.todayRevenue.toLocaleString("ru")} ₽`}
                  accent={Colors.gold}
                />
                <StatCard
                  icon={<ShoppingBag size={20} color="#4A90D9" />}
                  label="Заказов сегодня"
                  value={`${stats.todayOrders}`}
                  accent="#4A90D9"
                />
                <StatCard
                  icon={<TrendingUp size={20} color={Colors.success} />}
                  label="Средний чек"
                  value={`${stats.todayAvgCheck.toLocaleString("ru")} ₽`}
                  accent={Colors.success}
                />
                <StatCard
                  icon={<Users size={20} color="#E8A040" />}
                  label="Клиентов"
                  value={`${stats.totalCustomers}`}
                  accent="#E8A040"
                />
                <StatCard
                  icon={<ClipboardList size={20} color="#E05252" />}
                  label="Активных заказов"
                  value={`${stats.activeOrders}`}
                  accent="#E05252"
                />
                <StatCard
                  icon={<DollarSign size={20} color="#C084FC" />}
                  label="За месяц"
                  value={`${stats.monthlyRevenue.toLocaleString("ru")} ₽`}
                  accent="#C084FC"
                />
              </View>

              {/* GROWTH */}
              <View style={styles.growthCard}>
                <ArrowUp size={16} color={Colors.success} />
                <Text style={styles.growthText}>+{stats.growth}% к прошлому месяцу</Text>
              </View>

              {/* ADMIN NAV LINKS */}
              <Text style={styles.navSectionTitle}>Управление</Text>
              <View style={styles.adminNavGrid}>
                <AdminNavCard
                  icon={<UtensilsCrossed size={22} color={Colors.gold} />}
                  label="Меню"
                  desc="Блюда, категории, фото"
                  onPress={() => router.push("/admin-menu")}
                />
                <AdminNavCard
                  icon={<Package size={22} color="#4A90D9" />}
                  label="Склад"
                  desc="Ингредиенты, остатки"
                  onPress={() => router.push("/admin-inventory")}
                />
                <AdminNavCard
                  icon={<Tag size={22} color={Colors.success} />}
                  label="Промо"
                  desc="Промокоды, акции"
                  onPress={() => router.push("/admin-promos")}
                />
                <AdminNavCard
                  icon={<Users size={22} color="#E8A040" />}
                  label="Персонал"
                  desc="Сотрудники, роли"
                  onPress={() => router.push("/admin-staff")}
                />
                <AdminNavCard
                  icon={<Activity size={22} color="#C084FC" />}
                  label="Аналитика"
                  desc="Графики и отчёты"
                  onPress={() => router.push("/admin-analytics")}
                />
                <AdminNavCard
                  icon={<ChefHat size={22} color="#E8A040" />}
                  label="Техкарты"
                  desc="Рецепты и состав"
                  onPress={() => router.push("/admin-recipes")}
                />
              </View>

              {/* PENDING ORDERS SUMMARY */}
              {stats.pendingOrders > 0 && (
                <View style={styles.pendingAlert}>
                  <Clock size={16} color={Colors.gold} />
                  <Text style={styles.pendingText}>
                    {stats.pendingOrders} новых заказов ожидают обработки
                  </Text>
                  <TouchableOpacity onPress={() => setActiveSection("orders")}>
                    <ChevronRight size={16} color={Colors.gold} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {activeSection === "orders" && (
            <>
              {orders.map((order) => {
                const status = order.status as string;
                const currentIdx = statusSteps.indexOf(status);
                const items = (order.order_items as unknown as Record<string, unknown>[]) || [];
                return (
                  <View key={order.id as string} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View>
                        <Text style={styles.orderCustomer}>{order.customer_name as string}</Text>
                        <Text style={styles.orderPhone}>{order.customer_phone as string}</Text>
                      </View>
                      <View style={[styles.orderStatusBadge, { backgroundColor: `${statusColors[status]}18`, borderColor: `${statusColors[status]}40` }]}>
                        <Text style={[styles.orderStatusText, { color: statusColors[status] }]}>{statusLabels[status] || status}</Text>
                      </View>
                    </View>

                    {items.map((item, i) => (
                      <Text key={i} style={styles.orderItem}>{item.quantity as number}× {item.name as string}</Text>
                    ))}

                    <View style={styles.orderBottom}>
                      <Text style={styles.orderTotal}>{order.total as number} ₽</Text>
                      <Text style={styles.orderDelivery}>{order.delivery_method === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз"}</Text>
                    </View>

                    {/* STATUS CONTROLS */}
                    {status !== "completed" && status !== "cancelled" && (
                      <View style={styles.statusControls}>
                        {currentIdx < statusSteps.length - 1 && (
                          <TouchableOpacity
                            style={styles.statusBtn}
                            onPress={() => updateOrderStatus(order.id as string, statusSteps[currentIdx + 1])}
                          >
                            <Clock size={14} color={Colors.success} />
                            <Text style={styles.statusBtnText}>
                              → {statusLabels[statusSteps[currentIdx + 1]]}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.statusBtn, styles.statusCancelBtn]}
                          onPress={() => updateOrderStatus(order.id as string, "cancelled")}
                        >
                          <Text style={styles.statusCancelText}>Отменить</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <View style={[statStyles.card, { borderColor: `${accent}25` }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: `${accent}15` }]}>{icon}</View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    width: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: Colors.surface1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  value: { fontSize: 22, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.5, marginBottom: 3 },
  label: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  scroll: { padding: 20, gap: 14 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.8 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface1,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border,
  },

  sectionTabs: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  sectionTab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
  },
  sectionTabActive: { backgroundColor: `${Colors.gold}15`, borderColor: Colors.gold },
  sectionTabText: { fontSize: 12, fontWeight: "600" as const, color: Colors.textMuted },
  sectionTabTextActive: { color: Colors.gold },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

  growthCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: `${Colors.success}15`, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: `${Colors.success}25`,
  },
  growthText: { fontSize: 14, color: Colors.success, fontWeight: "600" as const },

  // Order cards
  orderCard: {
    backgroundColor: Colors.surface1, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  orderCustomer: { fontSize: 16, fontWeight: "700" as const, color: Colors.text },
  orderPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  orderStatusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  orderStatusText: { fontSize: 11, fontWeight: "700" as const },
  orderItem: { fontSize: 13, color: Colors.textSecondary, paddingVertical: 2 },
  orderBottom: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    paddingTop: 10, marginTop: 10,
  },
  orderTotal: { fontSize: 16, fontWeight: "700" as const, color: Colors.gold },
  orderDelivery: { fontSize: 12, color: Colors.textMuted },
  statusControls: {
    flexDirection: "row", gap: 8, marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    paddingTop: 12,
  },
  statusBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  statusBtnText: { fontSize: 12, fontWeight: "600" as const, color: Colors.success },
  statusCancelBtn: { borderColor: `${Colors.error}30`, backgroundColor: `${Colors.error}10` },
  statusCancelText: { fontSize: 12, fontWeight: "600" as const, color: Colors.error },

  emptyText: { fontSize: 18, fontWeight: "700" as const, color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textMuted },

  navSectionTitle: {
    fontSize: 15, fontWeight: "700" as const, color: Colors.textSecondary,
    letterSpacing: 0.3, marginBottom: 12, marginTop: 8,
  },
  adminNavGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

  pendingAlert: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: `${Colors.gold}12`, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: `${Colors.gold}25`, marginTop: 8,
  },
  pendingText: { flex: 1, fontSize: 13, color: Colors.gold, fontWeight: "600" as const },
});

function AdminNavCard({ icon, label, desc, onPress }: { icon: React.ReactNode; label: string; desc: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={navCardStyles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={navCardStyles.iconWrap}>{icon}</View>
      <Text style={navCardStyles.label}>{label}</Text>
      <Text style={navCardStyles.desc}>{desc}</Text>
      <ChevronRight size={12} color={Colors.textMuted} style={{ position: "absolute", right: 14, top: 14 }} />
    </TouchableOpacity>
  );
}

const navCardStyles = StyleSheet.create({
  card: {
    width: (Dimensions.get("window").width - 56) / 2,
    backgroundColor: Colors.surface1, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    position: "relative" as const,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: `${Colors.gold}10`,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  label: { fontSize: 14, fontWeight: "700" as const, color: Colors.text, marginBottom: 2 },
  desc: { fontSize: 11, color: Colors.textMuted, lineHeight: 15 },
});
