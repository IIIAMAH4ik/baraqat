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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import Colors from "@/constants/colors";
import {
  Tag, Plus, Search, X, Save, Gift, Percent, Copy, Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface PromoCode {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function AdminPromosScreen() {
  const insets = useSafeAreaInsets();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "discount",
    value: "10",
    min_order: "500",
    max_uses: "50",
    expires_in_days: "30",
  });
  const [copied, setCopied] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false }).limit(50);
      setPromos((data as unknown as PromoCode[]) || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function resetForm() {
    setForm({ code: "", type: "discount", value: "10", min_order: "500", max_uses: "50", expires_in_days: "30" });
    setShowAdd(false);
  }

  async function createPromo() {
    const code = form.code || generateCode();
    const expiresAt = new Date(Date.now() + Number(form.expires_in_days) * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("promo_codes").insert({
      code,
      type: form.type,
      value: Number(form.value),
      min_order: Number(form.min_order),
      max_uses: Number(form.max_uses),
      used_count: 0,
      is_active: true,
      expires_at: expiresAt,
    });
    resetForm();
    loadData();
  }

  async function toggleActive(promo: PromoCode) {
    await supabase.from("promo_codes").update({ is_active: !promo.is_active }).eq("id", promo.id);
    loadData();
  }

  function copyCode(code: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const activePromos = promos.filter((p) => p.is_active);
  const expiredPromos = promos.filter((p) => !p.is_active);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Промо-акции</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Plus size={18} color={Colors.bg} />
          <Text style={styles.addBtnText}>Промокод</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* CREATE FORM */}
      {showAdd && (
        <View style={styles.editCard}>
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>Новый промокод</Text>
            <TouchableOpacity onPress={resetForm}>
              <X size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, form.type === "discount" && styles.typeBtnActive]}
              onPress={() => setForm((f) => ({ ...f, type: "discount" }))}
            >
              <Percent size={14} color={form.type === "discount" ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.typeLabel, form.type === "discount" && styles.typeLabelActive]}>Скидка %</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, form.type === "gift" && styles.typeBtnActive]}
              onPress={() => setForm((f) => ({ ...f, type: "gift" }))}
            >
              <Gift size={14} color={form.type === "gift" ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.typeLabel, form.type === "gift" && styles.typeLabelActive]}>Подарок</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.editInput}
            placeholder="Код (оставьте пустым для автогенерации)"
            placeholderTextColor={Colors.textMuted}
            value={form.code}
            onChangeText={(t) => setForm((f) => ({ ...f, code: t.toUpperCase() }))}
            autoCapitalize="characters"
          />
          <View style={styles.editRow}>
            <TextInput style={[styles.editInput, { flex: 1 }]} placeholder="Значение" placeholderTextColor={Colors.textMuted} value={form.value} onChangeText={(t) => setForm((f) => ({ ...f, value: t }))} keyboardType="numeric" />
            <TextInput style={[styles.editInput, { flex: 1 }]} placeholder="Мин. заказ" placeholderTextColor={Colors.textMuted} value={form.min_order} onChangeText={(t) => setForm((f) => ({ ...f, min_order: t }))} keyboardType="numeric" />
          </View>
          <View style={styles.editRow}>
            <TextInput style={[styles.editInput, { flex: 1 }]} placeholder="Макс. использований" placeholderTextColor={Colors.textMuted} value={form.max_uses} onChangeText={(t) => setForm((f) => ({ ...f, max_uses: t }))} keyboardType="numeric" />
            <TextInput style={[styles.editInput, { flex: 1 }]} placeholder="Дней действия" placeholderTextColor={Colors.textMuted} value={form.expires_in_days} onChangeText={(t) => setForm((f) => ({ ...f, expires_in_days: t }))} keyboardType="numeric" />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={createPromo}>
            <Save size={16} color={Colors.bg} />
            <Text style={styles.saveBtnText}>Создать промокод</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
          {/* ACTIVE */}
          <Text style={styles.sectionTitle}>Активные ({activePromos.length})</Text>
          {activePromos.map((promo) => (
            <PromoCard key={promo.id} promo={promo} onToggle={toggleActive} onCopy={copyCode} copied={copied} />
          ))}

          {/* EXPIRED */}
          {expiredPromos.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Неактивные ({expiredPromos.length})</Text>
              {expiredPromos.map((promo) => (
                <PromoCard key={promo.id} promo={promo} onToggle={toggleActive} onCopy={copyCode} copied={copied} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function PromoCard({ promo, onToggle, onCopy, copied }: {
  promo: PromoCode;
  onToggle: (p: PromoCode) => void;
  onCopy: (code: string) => void;
  copied: string | null;
}) {
  const isGift = promo.type === "gift";
  return (
    <View style={promoStyles.card}>
      <View style={promoStyles.top}>
        <View style={[promoStyles.iconWrap, { backgroundColor: isGift ? `${Colors.gold}18` : `${Colors.success}18` }]}>
          {isGift ? <Gift size={18} color={Colors.gold} /> : <Percent size={18} color={Colors.success} />}
        </View>
        <View style={promoStyles.info}>
          <Text style={promoStyles.code}>{promo.code}</Text>
          <Text style={promoStyles.desc}>
            {isGift ? "Десерт в подарок" : `Скидка ${promo.value}%`}
            {promo.min_order > 0 ? ` · от ${promo.min_order} ₽` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onCopy(promo.code)}>
          {copied === promo.code ? (
            <Check size={18} color={Colors.success} />
          ) : (
            <Copy size={16} color={Colors.textMuted} />
          )}
        </TouchableOpacity>
      </View>

      <View style={promoStyles.stats}>
        <Text style={promoStyles.stat}>{promo.used_count}/{promo.max_uses} исп.</Text>
        {promo.expires_at && (
          <Text style={promoStyles.stat}>
            До {new Date(promo.expires_at).toLocaleDateString("ru")}
          </Text>
        )}
        <TouchableOpacity onPress={() => onToggle(promo)}>
          <Text style={[promoStyles.toggleText, { color: promo.is_active ? Colors.error : Colors.success }]}>
            {promo.is_active ? "Отключить" : "Включить"}
          </Text>
        </TouchableOpacity>
      </View>

      {promo.customer_name && (
        <View style={promoStyles.customerRow}>
          <Text style={promoStyles.customerText}>{promo.customer_name}</Text>
          <Text style={promoStyles.customerText}>{promo.customer_phone}</Text>
        </View>
      )}
    </View>
  );
}

const promoStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface1, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  info: { flex: 1 },
  code: { fontSize: 16, fontWeight: "800" as const, color: Colors.text, letterSpacing: 1 },
  desc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  stats: {
    flexDirection: "row", alignItems: "center", gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingTop: 10,
  },
  stat: { fontSize: 11, color: Colors.textMuted },
  toggleText: { fontSize: 12, fontWeight: "600" as const },
  customerRow: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    paddingTop: 8, marginTop: 8,
  },
  customerText: { fontSize: 11, color: Colors.textMuted },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.8 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.gold, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
  },
  addBtnText: { fontSize: 13, fontWeight: "700" as const, color: Colors.bg },

  editCard: {
    marginHorizontal: 20, backgroundColor: Colors.surface1,
    borderRadius: 20, padding: 18, gap: 10, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.gold,
  },
  editHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editTitle: { fontSize: 16, fontWeight: "700" as const, color: Colors.gold },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeBtnActive: { backgroundColor: `${Colors.gold}18`, borderColor: Colors.gold },
  typeLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: "600" as const },
  typeLabelActive: { color: Colors.gold },
  editInput: {
    backgroundColor: Colors.surface2, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  editRow: { flexDirection: "row", gap: 8 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 13,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700" as const, color: Colors.bg },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700" as const, color: Colors.textSecondary, marginBottom: 10, letterSpacing: 0.3 },
});
