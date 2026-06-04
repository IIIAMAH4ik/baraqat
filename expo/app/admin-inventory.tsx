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
  Package, Search, Plus, Minus, Edit, Trash2, AlertTriangle,
  ArrowUpCircle, ArrowDownCircle, RefreshCw, X,
} from "lucide-react-native";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  category: string;
  supplier_id: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

export default function AdminInventoryScreen() {
  const insets = useSafeAreaInsets();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("0");
  const [editPrice, setEditPrice] = useState("0");
  const [showAdd, setShowAdd] = useState(false);
  const [newIng, setNewIng] = useState({ name: "", unit: "kg", min_stock: "0", purchase_price: "0", category: "other" });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ingRes, supRes] = await Promise.all([
        supabase.from("ingredients").select("*").order("name"),
        supabase.from("suppliers").select("id,name").order("name"),
      ]);
      setIngredients((ingRes.data as unknown as Ingredient[]) || []);
      setSuppliers((supRes.data as unknown as Supplier[]) || []);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addStock(id: string, qty: number) {
    const ing = ingredients.find((i) => i.id === id);
    if (!ing) return;
    const newStock = ing.current_stock + qty;
    await supabase.from("ingredients").update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("inventory_transactions").insert({
      ingredient_id: id,
      type: "in",
      quantity: qty,
      note: "Ручное пополнение",
    });
    loadData();
  }

  async function removeStock(id: string, qty: number) {
    const ing = ingredients.find((i) => i.id === id);
    if (!ing) return;
    const newStock = Math.max(0, ing.current_stock - qty);
    await supabase.from("ingredients").update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("inventory_transactions").insert({
      ingredient_id: id,
      type: "out",
      quantity: qty,
      note: "Ручное списание",
    });
    loadData();
  }

  async function createIngredient() {
    if (!newIng.name.trim()) return;
    await supabase.from("ingredients").insert({
      name: newIng.name,
      unit: newIng.unit,
      min_stock: Number(newIng.min_stock) || 0,
      purchase_price: Number(newIng.purchase_price) || 0,
      current_stock: 0,
      category: newIng.category,
    });
    setNewIng({ name: "", unit: "kg", min_stock: "0", purchase_price: "0", category: "other" });
    setShowAdd(false);
    loadData();
  }

  const filtered = search
    ? ingredients.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : ingredients;

  const lowStock = ingredients.filter((i) => i.current_stock <= i.min_stock);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Складской учёт</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <RefreshCw size={16} color={Colors.gold} />
        </TouchableOpacity>
      </Animated.View>

      {/* LOW STOCK ALERT */}
      {lowStock.length > 0 && (
        <View style={styles.alertBanner}>
          <AlertTriangle size={16} color={Colors.error} />
          <Text style={styles.alertText}>
            {lowStock.length} ингредиентов на минимуме
          </Text>
        </View>
      )}

      {/* SEARCH + ADD */}
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Search size={14} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск ингредиентов..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(!showAdd)}>
          <Plus size={16} color={Colors.bg} />
        </TouchableOpacity>
      </View>

      {/* ADD FORM */}
      {showAdd && (
        <View style={styles.addForm}>
          <TextInput style={styles.addInput} placeholder="Название" placeholderTextColor={Colors.textMuted} value={newIng.name} onChangeText={(t) => setNewIng((p) => ({ ...p, name: t }))} />
          <View style={styles.addRow}>
            <TextInput style={[styles.addInput, { flex: 1 }]} placeholder="Мин. запас" placeholderTextColor={Colors.textMuted} value={newIng.min_stock} onChangeText={(t) => setNewIng((p) => ({ ...p, min_stock: t }))} keyboardType="numeric" />
            <TextInput style={[styles.addInput, { flex: 1 }]} placeholder="Цена закупки" placeholderTextColor={Colors.textMuted} value={newIng.purchase_price} onChangeText={(t) => setNewIng((p) => ({ ...p, purchase_price: t }))} keyboardType="numeric" />
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={createIngredient}>
            <Text style={styles.createBtnText}>Добавить ингредиент</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
          {filtered.map((ing) => {
            const isLow = ing.current_stock <= ing.min_stock;
            const isEditing = editingId === ing.id;
            return (
              <View key={ing.id} style={[styles.ingCard, isLow && styles.ingCardLow]}>
                <View style={styles.ingHeader}>
                  <View style={styles.ingInfo}>
                    <Text style={styles.ingName}>{ing.name}</Text>
                    <Text style={styles.ingUnit}>{ing.unit}</Text>
                  </View>
                  <View style={[styles.stockBadge, isLow && styles.stockBadgeLow]}>
                    <Text style={[styles.stockBadgeText, isLow && styles.stockBadgeTextLow]}>
                      {ing.current_stock} {ing.unit}
                    </Text>
                  </View>
                </View>

                {/* PROGRESS BAR */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, {
                    width: `${Math.min(100, (ing.current_stock / Math.max(ing.min_stock * 2, 1)) * 100)}%`,
                    backgroundColor: isLow ? Colors.error : Colors.gold,
                  }]} />
                </View>

                {isLow && <Text style={styles.lowText}>Ниже минимума ({ing.min_stock} {ing.unit})</Text>}

                {isEditing ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.editInput}
                      value={editQty}
                      onChangeText={setEditQty}
                      keyboardType="numeric"
                      placeholder="Кол-во"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TouchableOpacity
                      style={styles.editAction}
                      onPress={() => { addStock(ing.id, Number(editQty) || 0); setEditingId(null); }}
                    >
                      <ArrowUpCircle size={20} color={Colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editAction}
                      onPress={() => { removeStock(ing.id, Number(editQty) || 0); setEditingId(null); }}
                    >
                      <ArrowDownCircle size={20} color={Colors.error} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editAction} onPress={() => setEditingId(null)}>
                      <X size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.ingActions}>
                    <TouchableOpacity
                      style={styles.quickBtn}
                      onPress={() => { setEditingId(ing.id); setEditQty("1"); }}
                    >
                      <Edit size={14} color={Colors.gold} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickBtn, styles.quickBtnIn]}
                      onPress={() => addStock(ing.id, 1)}
                    >
                      <Plus size={14} color={Colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickBtn, styles.quickBtnOut]}
                      onPress={() => removeStock(ing.id, 1)}
                    >
                      <Minus size={14} color={Colors.error} />
                    </TouchableOpacity>
                    <Text style={styles.purchasePrice}>{ing.purchase_price} ₽/{ing.unit}</Text>
                  </View>
                )}
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.8 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface1,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border,
  },

  alertBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: `${Colors.error}15`, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: `${Colors.error}25`,
  },
  alertText: { fontSize: 13, color: Colors.error, fontWeight: "600" as const, flex: 1 },

  toolbar: {
    flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 12,
  },
  searchWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.surface1, borderRadius: 14,
    paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 10 },
  addBtn: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.gold,
    alignItems: "center", justifyContent: "center",
  },

  addForm: {
    marginHorizontal: 20, backgroundColor: Colors.surface1,
    borderRadius: 16, padding: 16, gap: 10, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  addInput: {
    backgroundColor: Colors.surface2, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  addRow: { flexDirection: "row", gap: 8 },
  createBtn: {
    backgroundColor: Colors.gold, borderRadius: 12, paddingVertical: 12, alignItems: "center",
  },
  createBtnText: { fontSize: 14, fontWeight: "700" as const, color: Colors.bg },

  scroll: { paddingHorizontal: 20, gap: 10 },

  ingCard: {
    backgroundColor: Colors.surface1, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  ingCardLow: { borderColor: `${Colors.error}40`, backgroundColor: `${Colors.error}05` },
  ingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  ingInfo: { flex: 1 },
  ingName: { fontSize: 15, fontWeight: "700" as const, color: Colors.text },
  ingUnit: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  stockBadge: {
    backgroundColor: `${Colors.gold}18`, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: `${Colors.gold}30`,
  },
  stockBadgeLow: { backgroundColor: `${Colors.error}18`, borderColor: `${Colors.error}30` },
  stockBadgeText: { fontSize: 14, fontWeight: "700" as const, color: Colors.gold },
  stockBadgeTextLow: { color: Colors.error },

  progressTrack: {
    height: 3, backgroundColor: Colors.surface3, borderRadius: 2, marginBottom: 8,
  },
  progressFill: { height: 3, borderRadius: 2 },
  lowText: { fontSize: 11, color: Colors.error, marginBottom: 8 },

  ingActions: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingTop: 10,
  },
  quickBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.surface2,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border,
  },
  quickBtnIn: { borderColor: `${Colors.success}40` },
  quickBtnOut: { borderColor: `${Colors.error}40` },
  purchasePrice: {
    fontSize: 12, color: Colors.textMuted, marginLeft: "auto",
  },

  editRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10 },
  editInput: {
    flex: 1, backgroundColor: Colors.surface2, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  editAction: { padding: 6 },
});
