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
import { supabase } from "@/lib/supabase";
import Colors from "@/constants/colors";
import {
  Users, Plus, Search, X, Save, Phone, Mail, User, Briefcase,
} from "lucide-react-native";

interface Employee {
  id: string;
  user_id: string | null;
  position: string;
  hire_date: string;
  salary: number | null;
  is_active: boolean;
}

interface StaffProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

const POSITIONS = ["waiter", "cook", "manager", "barista", "admin"] as const;
const POSITION_LABELS: Record<string, string> = {
  waiter: "Официант", cook: "Повар", manager: "Менеджер",
  barista: "Бариста", admin: "Администратор",
};

export default function AdminStaffScreen() {
  const insets = useSafeAreaInsets();
  const [employees, setEmployees] = useState<(Employee & { profile?: StaffProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ position: "waiter", salary: "", is_active: true });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data } = await supabase.from("employees").select("*").order("position");
      const emps = (data as unknown as Employee[]) || [];

      // Fetch profiles for employees with user_id
      const enriched = await Promise.all(
        emps.map(async (emp) => {
          if (emp.user_id) {
            const { data: prof } = await supabase.from("profiles").select("id,name,email,phone,role").eq("id", emp.user_id).single();
            return { ...emp, profile: prof as unknown as StaffProfile };
          }
          return emp;
        })
      );
      setEmployees(enriched);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function toggleActive(emp: Employee) {
    await supabase.from("employees").update({ is_active: !emp.is_active }).eq("id", emp.id);
    loadData();
  }

  async function updatePosition(emp: Employee, position: string) {
    await supabase.from("employees").update({ position }).eq("id", emp.id);
    if (emp.user_id) {
      const roleMap: Record<string, string> = { waiter: "waiter", cook: "kitchen", manager: "manager", barista: "waiter", admin: "admin" };
      await supabase.from("profiles").update({ role: roleMap[position] || "waiter" }).eq("id", emp.user_id);
    }
    loadData();
  }

  const filtered = search
    ? employees.filter((e) => e.profile?.name?.toLowerCase().includes(search.toLowerCase()))
    : employees;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Персонал</Text>
        <View style={styles.stats}>
          <View style={styles.statPill}>
            <Text style={styles.statNum}>{employees.filter((e) => e.is_active).length}</Text>
            <Text style={styles.statLabel}>активных</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.searchWrap}>
        <Search size={14} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск сотрудников..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
          {filtered.map((emp) => {
            const isEditing = editingId === emp.id;
            return (
              <View key={emp.id} style={[styles.card, !emp.is_active && styles.cardInactive]}>
                <View style={styles.cardTop}>
                  <View style={styles.avatarWrap}>
                    <User size={20} color={emp.is_active ? Colors.gold : Colors.textMuted} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.name, !emp.is_active && styles.textMuted]}>
                      {emp.profile?.name || "Без профиля"}
                    </Text>
                    {emp.profile?.email && (
                      <View style={styles.contactRow}>
                        <Mail size={11} color={Colors.textMuted} />
                        <Text style={styles.contactText}>{emp.profile.email}</Text>
                      </View>
                    )}
                    {emp.profile?.phone && (
                      <View style={styles.contactRow}>
                        <Phone size={11} color={Colors.textMuted} />
                        <Text style={styles.contactText}>{emp.profile.phone}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.activeDot, { backgroundColor: emp.is_active ? Colors.success : Colors.textMuted }]}
                    onPress={() => toggleActive(emp)}
                  />
                </View>

                {/* POSITION SELECTOR */}
                <View style={styles.positionRow}>
                  {POSITIONS.map((pos) => (
                    <TouchableOpacity
                      key={pos}
                      style={[styles.posChip, emp.position === pos && styles.posChipActive]}
                      onPress={() => updatePosition(emp, pos)}
                    >
                      <Text style={[styles.posChipText, emp.position === pos && styles.posChipTextActive]}>
                        {POSITION_LABELS[pos]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.hireDate}>
                    С {new Date(emp.hire_date).toLocaleDateString("ru")}
                  </Text>
                  {emp.salary && (
                    <Text style={styles.salary}>{Number(emp.salary).toLocaleString("ru")} ₽/мес</Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 8,
  },
  title: { fontSize: 28, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.8 },
  stats: { flexDirection: "row", gap: 10 },
  statPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.surface1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  statNum: { fontSize: 16, fontWeight: "800" as const, color: Colors.gold },
  statLabel: { fontSize: 12, color: Colors.textMuted },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.surface1, borderRadius: 14,
    paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 10 },

  scroll: { paddingHorizontal: 20, gap: 10 },

  card: {
    backgroundColor: Colors.surface1, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardInactive: { opacity: 0.5 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: `${Colors.gold}15`,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${Colors.gold}30`,
  },
  cardInfo: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: "700" as const, color: Colors.text },
  textMuted: { color: Colors.textMuted },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  contactText: { fontSize: 12, color: Colors.textSecondary },
  activeDot: {
    width: 12, height: 12, borderRadius: 6, marginTop: 4,
  },

  positionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  posChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  posChipActive: { backgroundColor: `${Colors.gold}20`, borderColor: Colors.gold },
  posChipText: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" as const },
  posChipTextActive: { color: Colors.gold },

  cardFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingTop: 10,
  },
  hireDate: { fontSize: 12, color: Colors.textMuted },
  salary: { fontSize: 13, color: Colors.gold, fontWeight: "700" as const },
});
