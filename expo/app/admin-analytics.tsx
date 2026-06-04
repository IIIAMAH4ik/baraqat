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
import { supabase } from "@/lib/supabase";
import Colors from "@/constants/colors";
import {
  BarChart3, TrendingUp, DollarSign, ShoppingBag, Users,
  ChevronDown, ArrowUp, ArrowDown, Calendar, RefreshCw,
} from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BAR_MAX_HEIGHT = 160;

interface DailyStat {
  date: string;
  revenue: number;
  orders: number;
}

interface TopItem {
  name: string;
  count: number;
  revenue: number;
}

export default function AdminAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    avgCheck: 0,
    totalOrders: 0,
    totalCustomers: 0,
    growthPercent: 0,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const days = period === "week" ? 7 : period === "month" ? 30 : 365;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: orders } = await supabase
        .from("orders")
        .select("total, status, created_at, subtotal, delivery_method, customer_name")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      const ords = (orders as unknown as Record<string, unknown>[]) || [];
      const completed = ords.filter((o) => o.status === "completed" || o.status === "delivered");
      const totalRevenue = completed.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const avgCheck = completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0;
      const uniqueCustomers = new Set(completed.map((o) => o.customer_name)).size;

      // Calculate daily breakdown
      const dayMap: Record<string, { revenue: number; orders: number }> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toLocaleDateString("ru", { day: "numeric", month: "short" });
        dayMap[key] = { revenue: 0, orders: 0 };
      }
      for (const o of completed) {
        const d = new Date(o.created_at as string);
        const key = d.toLocaleDateString("ru", { day: "numeric", month: "short" });
        if (dayMap[key]) {
          dayMap[key].revenue += Number(o.total) || 0;
          dayMap[key].orders += 1;
        }
      }

      const stats = Object.entries(dayMap).map(([date, v]) => ({
        date,
        revenue: v.revenue,
        orders: v.orders,
      }));
      setDailyStats(stats);

      // Calculate top items
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("name, price, quantity")
        .gte("created_at", since)
        .limit(500);

      const items = (orderItems as unknown as Record<string, unknown>[]) || [];
      const itemMap: Record<string, { count: number; revenue: number }> = {};
      for (const item of items) {
        const name = item.name as string;
        if (!itemMap[name]) itemMap[name] = { count: 0, revenue: 0 };
        itemMap[name].count += Number(item.quantity) || 0;
        itemMap[name].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
      }
      const top = Object.entries(itemMap)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      setTopItems(top);

      // Previous period comparison
      const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString();
      const { data: prevOrders } = await supabase
        .from("orders")
        .select("total")
        .gte("created_at", prevSince)
        .lt("created_at", since)
        .limit(200);
      const prevOrds = (prevOrders as unknown as Record<string, unknown>[]) || [];
      const prevRevenue = prevOrds.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const growth = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;

      setSummary({
        totalRevenue,
        avgCheck,
        totalOrders: completed.length,
        totalCustomers: uniqueCustomers,
        growthPercent: growth,
      });
    } catch (err) {
      console.error("Analytics load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const maxRevenue = Math.max(1, ...dailyStats.map((d) => d.revenue));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Аналитика</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <RefreshCw size={16} color={Colors.gold} />
        </TouchableOpacity>
      </Animated.View>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {(["week", "month", "year"] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Calendar size={14} color={period === p ? Colors.gold : Colors.textMuted} />
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === "week" ? "Неделя" : p === "month" ? "Месяц" : "Год"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
          {/* SUMMARY CARDS */}
          <View style={styles.summaryGrid}>
            <SummaryCard
              icon={<DollarSign size={20} color={Colors.gold} />}
              label="Выручка"
              value={`${summary.totalRevenue.toLocaleString("ru")} ₽`}
              accent={Colors.gold}
            />
            <SummaryCard
              icon={<ShoppingBag size={20} color="#4A90D9" />}
              label="Заказов"
              value={`${summary.totalOrders}`}
              accent="#4A90D9"
            />
            <SummaryCard
              icon={<TrendingUp size={20} color={Colors.success} />}
              label="Средний чек"
              value={`${summary.avgCheck.toLocaleString("ru")} ₽`}
              accent={Colors.success}
            />
            <SummaryCard
              icon={<Users size={20} color="#C084FC" />}
              label="Клиентов"
              value={`${summary.totalCustomers}`}
              accent="#C084FC"
            />
          </View>

          {/* GROWTH */}
          <View style={styles.growthCard}>
            {summary.growthPercent >= 0 ? (
              <ArrowUp size={18} color={Colors.success} />
            ) : (
              <ArrowDown size={18} color={Colors.error} />
            )}
            <Text style={[styles.growthText, { color: summary.growthPercent >= 0 ? Colors.success : Colors.error }]}>
              {summary.growthPercent >= 0 ? "+" : ""}{summary.growthPercent}% к предыдущему периоду
            </Text>
          </View>

          {/* BAR CHART */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Выручка по дням</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.barChart}>
                {dailyStats.map((d) => (
                  <View key={d.date} style={styles.barCol}>
                    <Text style={styles.barValue}>
                      {d.revenue > 0 ? `${Math.round(d.revenue / 1000)}k` : ""}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: Math.max(2, (d.revenue / maxRevenue) * BAR_MAX_HEIGHT),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{d.date.split(" ")[0]}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* TOP ITEMS */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Популярные блюда</Text>
            {topItems.length === 0 ? (
              <Text style={styles.emptyText}>Нет данных за период</Text>
            ) : (
              topItems.map((item, i) => (
                <View key={i} style={styles.topRow}>
                  <View style={styles.topRank}>
                    <Text style={[styles.topRankText, i < 3 && { color: Colors.gold }]}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={styles.topInfo}>
                    <Text style={styles.topName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.topMeta}>{item.count} шт.</Text>
                  </View>
                  <Text style={styles.topRevenue}>{item.revenue.toLocaleString("ru")} ₽</Text>
                </View>
              ))
            )}
          </View>

          {/* DELIVERY/PICKUP SPLIT */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Способ получения</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function SummaryCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string; accent: string;
}) {
  return (
    <View style={[sumStyles.card, { borderColor: `${accent}25` }]}>
      <View style={[sumStyles.iconWrap, { backgroundColor: `${accent}15` }]}>{icon}</View>
      <Text style={sumStyles.value}>{value}</Text>
      <Text style={sumStyles.label}>{label}</Text>
    </View>
  );
}

const sumStyles = StyleSheet.create({
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
  value: { fontSize: 20, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.5, marginBottom: 3 },
  label: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.8 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface1,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border,
  },

  periodRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  periodBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
  },
  periodBtnActive: { backgroundColor: `${Colors.gold}15`, borderColor: Colors.gold },
  periodText: { fontSize: 13, color: Colors.textMuted, fontWeight: "600" as const },
  periodTextActive: { color: Colors.gold },

  scroll: { paddingHorizontal: 20, gap: 14 },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

  growthCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.surface1, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  growthText: { fontSize: 15, fontWeight: "700" as const },

  chartCard: {
    backgroundColor: Colors.surface1, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  chartTitle: { fontSize: 16, fontWeight: "700" as const, color: Colors.text, marginBottom: 16 },

  barChart: { flexDirection: "row", gap: 4, alignItems: "flex-end", paddingRight: 10 },
  barCol: { alignItems: "center", gap: 4, minWidth: 40 },
  barValue: { fontSize: 10, color: Colors.textMuted, fontWeight: "600" as const },
  barTrack: {
    width: 24, height: BAR_MAX_HEIGHT, backgroundColor: Colors.surface2,
    borderRadius: 4, justifyContent: "flex-end", overflow: "hidden",
  },
  barFill: {
    width: 24, backgroundColor: Colors.gold, borderRadius: 4,
    minHeight: 2,
  },
  barLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },

  topRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  topRank: {
    width: 24, height: 24, borderRadius: 8, backgroundColor: Colors.surface2,
    alignItems: "center", justifyContent: "center",
  },
  topRankText: { fontSize: 12, fontWeight: "700" as const, color: Colors.textSecondary },
  topInfo: { flex: 1 },
  topName: { fontSize: 14, color: Colors.text, fontWeight: "600" as const },
  topMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  topRevenue: { fontSize: 14, fontWeight: "700" as const, color: Colors.gold },

  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingVertical: 20 },
});
