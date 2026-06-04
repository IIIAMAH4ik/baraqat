import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import Colors from "@/constants/colors";
import {
  ChefHat, Plus, Search, Save, X, ImageIcon, Trash2,
  CheckCircle, XCircle,
} from "lucide-react-native";

interface MenuItemRow {
  id: string;
  name: string;
  category_id: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  badge: string | null;
  calories: number | null;
  weight_grams: number | null;
  sort_order: number;
}

interface Category {
  id: string;
  label: string;
  emoji: string;
}

export default function AdminMenuEditor() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItemRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    price: "0",
    image: "",
    category_id: "hot",
    badge: "",
    calories: "",
    weight_grams: "",
    available: true,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        supabase.from("menu_items").select("*").order("sort_order"),
        supabase.from("menu_categories").select("id,label,emoji").order("sort_order"),
      ]);
      setItems((itemsRes.data as unknown as MenuItemRow[]) || []);
      setCategories((catsRes.data as unknown as Category[]) || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function resetForm() {
    setForm({ id: "", name: "", description: "", price: "0", image: "", category_id: "hot", badge: "", calories: "", weight_grams: "", available: true });
    setEditingItem(null);
    setShowAdd(false);
  }

  function startEdit(item: MenuItemRow) {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description,
      price: String(item.price),
      image: item.image,
      category_id: item.category_id,
      badge: item.badge || "",
      calories: item.calories ? String(item.calories) : "",
      weight_grams: item.weight_grams ? String(item.weight_grams) : "",
      available: item.available,
    });
    setEditingItem(item);
    setShowAdd(false);
  }

  async function saveItem() {
    const data = {
      name: form.name,
      description: form.description,
      price: Number(form.price) || 0,
      image: form.image,
      category_id: form.category_id,
      badge: form.badge || null,
      calories: form.calories ? Number(form.calories) : null,
      weight_grams: form.weight_grams ? Number(form.weight_grams) : null,
      available: form.available,
      updated_at: new Date().toISOString(),
    };

    if (editingItem) {
      await supabase.from("menu_items").update(data).eq("id", editingItem.id);
    } else {
      const newId = form.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20) + "-" + Date.now().toString(36);
      await supabase.from("menu_items").insert({ ...data, id: newId, sort_order: items.length + 1 });
    }
    resetForm();
    loadData();
  }

  async function toggleAvailability(item: MenuItemRow) {
    await supabase.from("menu_items").update({
      available: !item.available,
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);
    loadData();
  }

  async function deleteItem(item: MenuItemRow) {
    await supabase.from("menu_items").delete().eq("id", item.id);
    loadData();
  }

  const filtered = search
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const grouped = categories.map((cat) => ({
    ...cat,
    items: filtered.filter((i) => i.category_id === cat.id),
  })).filter((g) => g.items.length > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Управление меню</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowAdd(true); }}>
          <Plus size={18} color={Colors.bg} />
          <Text style={styles.addBtnText}>Блюдо</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* SEARCH */}
      <View style={styles.searchWrap}>
        <Search size={14} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск блюд..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* EDIT / ADD FORM */}
      {(editingItem || showAdd) && (
        <View style={styles.editCard}>
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>{editingItem ? "Редактировать" : "Новое блюдо"}</Text>
            <TouchableOpacity onPress={resetForm}>
              <X size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TextInput style={styles.editInput} placeholder="Название" placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
          <TextInput style={styles.editInput} placeholder="Описание" placeholderTextColor={Colors.textMuted} value={form.description} onChangeText={(t) => setForm((f) => ({ ...f, description: t }))} multiline />
          <View style={styles.editRow}>
            <TextInput style={[styles.editInput, { flex: 1 }]} placeholder="Цена" placeholderTextColor={Colors.textMuted} value={form.price} onChangeText={(t) => setForm((f) => ({ ...f, price: t }))} keyboardType="numeric" />
            <TextInput style={[styles.editInput, { flex: 1 }]} placeholder="URL фото" placeholderTextColor={Colors.textMuted} value={form.image} onChangeText={(t) => setForm((f) => ({ ...f, image: t }))} />
          </View>
          <View style={styles.editRow}>
            <TextInput style={[styles.editInput, { flex: 1 }]} placeholder="Калории" placeholderTextColor={Colors.textMuted} value={form.calories} onChangeText={(t) => setForm((f) => ({ ...f, calories: t }))} keyboardType="numeric" />
            <TextInput style={[styles.editInput, { flex: 1 }]} placeholder="Вес (г)" placeholderTextColor={Colors.textMuted} value={form.weight_grams} onChangeText={(t) => setForm((f) => ({ ...f, weight_grams: t }))} keyboardType="numeric" />
          </View>
          <TextInput style={styles.editInput} placeholder="Бейдж (Хит/Новинка/Премиум)" placeholderTextColor={Colors.textMuted} value={form.badge} onChangeText={(t) => setForm((f) => ({ ...f, badge: t }))} />

          {/* CATEGORY PICKER */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catPicker}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catPick, form.category_id === cat.id && styles.catPickActive]}
                onPress={() => setForm((f) => ({ ...f, category_id: cat.id }))}
              >
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text style={[styles.catPickLabel, form.category_id === cat.id && styles.catPickLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* AVAILABILITY TOGGLE */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>В наличии</Text>
            <Switch
              value={form.available}
              onValueChange={(v) => setForm((f) => ({ ...f, available: v }))}
              trackColor={{ false: Colors.surface3, true: `${Colors.gold}40` }}
              thumbColor={form.available ? Colors.gold : Colors.textMuted}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
            <Save size={16} color={Colors.bg} />
            <Text style={styles.saveBtnText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
          {grouped.map((group) => (
            <View key={group.id} style={styles.groupSection}>
              <Text style={styles.groupTitle}>{group.emoji} {group.label}</Text>
              {group.items.map((item) => (
                <View key={item.id} style={[styles.itemCard, !item.available && styles.itemCardOff]}>
                  <View style={styles.itemMain}>
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, !item.available && styles.textOff]}>{item.name}</Text>
                      <Text style={styles.itemPrice}>{item.price} ₽</Text>
                      {item.badge && <Text style={styles.itemBadge}>{item.badge}</Text>}
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(item)}>
                        <Text style={styles.actionBtnText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => toggleAvailability(item)}>
                        {item.available ? (
                          <CheckCircle size={18} color={Colors.success} />
                        ) : (
                          <XCircle size={18} color={Colors.textMuted} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deleteItem(item)}>
                        <Trash2 size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))}
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
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.gold, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
  },
  addBtnText: { fontSize: 13, fontWeight: "700" as const, color: Colors.bg },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.surface1, borderRadius: 14,
    paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 10 },

  editCard: {
    marginHorizontal: 20, backgroundColor: Colors.surface1,
    borderRadius: 20, padding: 18, gap: 10, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.gold,
  },
  editHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4,
  },
  editTitle: { fontSize: 16, fontWeight: "700" as const, color: Colors.gold },
  editInput: {
    backgroundColor: Colors.surface2, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  editRow: { flexDirection: "row", gap: 8 },
  catPicker: { gap: 8, paddingVertical: 4 },
  catPick: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  catPickActive: { backgroundColor: `${Colors.gold}20`, borderColor: Colors.gold },
  catEmoji: { fontSize: 14 },
  catPickLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" as const },
  catPickLabelActive: { color: Colors.gold, fontWeight: "700" as const },
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 14, color: Colors.text, fontWeight: "600" as const },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 13,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700" as const, color: Colors.bg },

  scroll: { paddingHorizontal: 20, gap: 20 },
  groupSection: { gap: 8 },
  groupTitle: { fontSize: 16, fontWeight: "700" as const, color: Colors.text, marginBottom: 4 },

  itemCard: {
    backgroundColor: Colors.surface1, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  itemCardOff: { opacity: 0.5 },
  itemMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemImage: { width: 56, height: 56, borderRadius: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "700" as const, color: Colors.text },
  textOff: { color: Colors.textMuted },
  itemPrice: { fontSize: 13, color: Colors.gold, fontWeight: "700" as const, marginTop: 2 },
  itemBadge: {
    fontSize: 10, color: Colors.gold, fontWeight: "600" as const,
    backgroundColor: `${Colors.gold}20`, alignSelf: "flex-start",
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 4,
  },
  itemActions: { flexDirection: "row", gap: 6 },
  actionBtn: { padding: 6 },
  actionBtnText: { fontSize: 18 },
  deleteBtn: { marginLeft: 4 },
});
