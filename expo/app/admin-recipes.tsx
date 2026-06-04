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
  ChefHat, Plus, Search, X, Save, Trash2, Package, Calculator,
  ChevronDown, ChevronUp,
} from "lucide-react-native";

interface Recipe {
  id: string;
  menu_item_id: string;
  instructions: string | null;
  prep_time_minutes: number | null;
  menu_items?: { name: string; price: number } | null;
  recipe_ingredients?: RecipeIngredient[];
}

interface RecipeIngredient {
  id: string;
  ingredient_id: string;
  recipe_id: string;
  quantity: number;
  unit: string;
  ingredients?: { name: string; unit: string; purchase_price: number } | null;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  purchase_price: number;
  current_stock: number;
}

interface MenuItemSimple {
  id: string;
  name: string;
  price: number;
  category_id: string;
}

export default function AdminRecipesScreen() {
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  // Form state
  const [form, setForm] = useState({
    menu_item_id: "",
    instructions: "",
    prep_time_minutes: "",
  });
  const [formIngredients, setFormIngredients] = useState<
    { ingredient_id: string; quantity: string; unit: string }[]
  >([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [recipesRes, ingRes, menuRes] = await Promise.all([
        supabase.from("recipes").select("*, recipe_ingredients(*, ingredients(*)), menu_items(name, price)").order("created_at", { ascending: false }),
        supabase.from("ingredients").select("*").order("name"),
        supabase.from("menu_items").select("id,name,price,category_id").order("name"),
      ]);
      setRecipes((recipesRes.data as unknown as Recipe[]) || []);
      setIngredients((ingRes.data as unknown as Ingredient[]) || []);
      setMenuItems((menuRes.data as unknown as MenuItemSimple[]) || []);
    } catch (err) {
      console.error("Recipe load error:", err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ menu_item_id: "", instructions: "", prep_time_minutes: "" });
    setFormIngredients([]);
    setEditingRecipe(null);
    setShowAdd(false);
  }

  function startEdit(recipe: Recipe) {
    setForm({
      menu_item_id: recipe.menu_item_id,
      instructions: recipe.instructions || "",
      prep_time_minutes: recipe.prep_time_minutes ? String(recipe.prep_time_minutes) : "",
    });
    setFormIngredients(
      (recipe.recipe_ingredients || []).map((ri) => ({
        ingredient_id: ri.ingredient_id,
        quantity: String(ri.quantity),
        unit: ri.unit,
      }))
    );
    setEditingRecipe(recipe);
    setShowAdd(true);
  }

  async function saveRecipe() {
    if (!form.menu_item_id) {
      Alert.alert("Ошибка", "Выберите блюдо");
      return;
    }

    try {
      let recipeId = editingRecipe?.id;

      if (editingRecipe) {
        await supabase.from("recipes").update({
          instructions: form.instructions || null,
          prep_time_minutes: form.prep_time_minutes ? Number(form.prep_time_minutes) : null,
          updated_at: new Date().toISOString(),
        }).eq("id", editingRecipe.id);

        // Delete old ingredients
        await supabase.from("recipe_ingredients").delete().eq("recipe_id", editingRecipe.id);
      } else {
        const { data } = await supabase.from("recipes").insert({
          menu_item_id: form.menu_item_id,
          instructions: form.instructions || null,
          prep_time_minutes: form.prep_time_minutes ? Number(form.prep_time_minutes) : null,
        }).select("id").single();
        recipeId = (data as unknown as { id: string })?.id;
      }

      // Add ingredients
      if (recipeId) {
        for (const fi of formIngredients) {
          if (!fi.ingredient_id || !fi.quantity) continue;
          await supabase.from("recipe_ingredients").insert({
            recipe_id: recipeId,
            ingredient_id: fi.ingredient_id,
            quantity: Number(fi.quantity),
            unit: fi.unit || "г",
          });
        }
      }

      resetForm();
      loadData();
    } catch (err) {
      console.error("Recipe save error:", err);
      Alert.alert("Ошибка", "Не удалось сохранить техкарту");
    }
  }

  async function deleteRecipe(id: string) {
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
    await supabase.from("recipes").delete().eq("id", id);
    loadData();
  }

  function addIngredientRow() {
    setFormIngredients([...formIngredients, { ingredient_id: "", quantity: "", unit: "г" }]);
  }

  function updateFormIngredient(idx: number, field: string, value: string) {
    const updated = [...formIngredients];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormIngredients(updated);
  }

  function removeFormIngredient(idx: number) {
    setFormIngredients(formIngredients.filter((_, i) => i !== idx));
  }

  // Calculate cost per recipe
  function calculateCost(recipe: Recipe): number {
    if (!recipe.recipe_ingredients) return 0;
    return recipe.recipe_ingredients.reduce((sum, ri) => {
      const ing = ingredients.find((i) => i.id === ri.ingredient_id);
      if (!ing) return sum;
      // Convert units for cost calculation
      const qty = ri.unit === "кг" ? ri.quantity * 1000 : ri.quantity;
      const ingPricePerGram = ing.purchase_price / (ing.unit === "кг" ? 1000 : 1);
      return sum + qty * ingPricePerGram;
    }, 0);
  }

  const filtered = search
    ? recipes.filter((r) =>
      r.menu_items?.name?.toLowerCase().includes(search.toLowerCase())
    )
    : recipes;

  const selectedMenuItem = menuItems.find((m) => m.id === form.menu_item_id);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Техкарты</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowAdd(true); }}>
          <Plus size={18} color={Colors.bg} />
          <Text style={styles.addBtnText}>Техкарта</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.searchWrap}>
        <Search size={14} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по блюду..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* ADD/EDIT FORM */}
      {showAdd && (
        <View style={styles.editCard}>
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>{editingRecipe ? "Редактировать" : "Новая техкарта"}</Text>
            <TouchableOpacity onPress={resetForm}>
              <X size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Блюдо</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuPicker}>
            {menuItems.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.menuPick, form.menu_item_id === m.id && styles.menuPickActive]}
                onPress={() => setForm((f) => ({ ...f, menu_item_id: m.id }))}
              >
                <Text style={[styles.menuPickText, form.menu_item_id === m.id && styles.menuPickTextActive]}>
                  {m.name} ({m.price} ₽)
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={styles.editInput}
            placeholder="Инструкция приготовления"
            placeholderTextColor={Colors.textMuted}
            value={form.instructions}
            onChangeText={(t) => setForm((f) => ({ ...f, instructions: t }))}
            multiline
          />
          <TextInput
            style={styles.editInput}
            placeholder="Время приготовления (мин)"
            placeholderTextColor={Colors.textMuted}
            value={form.prep_time_minutes}
            onChangeText={(t) => setForm((f) => ({ ...f, prep_time_minutes: t }))}
            keyboardType="numeric"
          />

          {/* INGREDIENTS FORM */}
          <View style={styles.ingSection}>
            <View style={styles.ingHeader}>
              <Text style={styles.ingTitle}>Ингредиенты</Text>
              <TouchableOpacity style={styles.addIngBtn} onPress={addIngredientRow}>
                <Plus size={14} color={Colors.gold} />
                <Text style={styles.addIngText}>Добавить</Text>
              </TouchableOpacity>
            </View>

            {formIngredients.map((fi, idx) => (
              <View key={idx} style={styles.ingRow}>
                <TouchableOpacity
                  style={styles.ingSelectWrap}
                  onPress={() => {
                    // Simple cycling through ingredients
                    const currIdx = ingredients.findIndex((i) => i.id === fi.ingredient_id);
                    const nextIdx = (currIdx + 1) % ingredients.length;
                    updateFormIngredient(idx, "ingredient_id", ingredients[nextIdx]?.id || "");
                    updateFormIngredient(idx, "unit", ingredients[nextIdx]?.unit || "г");
                  }}
                >
                  <Text style={styles.ingSelect} numberOfLines={1}>
                    {ingredients.find((i) => i.id === fi.ingredient_id)?.name || "Выбрать"}
                  </Text>
                  <ChevronDown size={12} color={Colors.textMuted} />
                </TouchableOpacity>
                <TextInput
                  style={styles.qtyInput}
                  placeholder="Кол-во"
                  placeholderTextColor={Colors.textMuted}
                  value={fi.quantity}
                  onChangeText={(t) => updateFormIngredient(idx, "quantity", t)}
                  keyboardType="numeric"
                />
                <Text style={styles.unitText}>{fi.unit}</Text>
                <TouchableOpacity onPress={() => removeFormIngredient(idx)}>
                  <X size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveRecipe}>
            <Save size={16} color={Colors.bg} />
            <Text style={styles.saveBtnText}>Сохранить техкарту</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
          {filtered.map((recipe) => {
            const cost = calculateCost(recipe);
            const price = recipe.menu_items?.price || 0;
            const margin = price - cost;
            const marginPercent = price > 0 ? Math.round((margin / price) * 100) : 0;
            const isExpanded = expandedId === recipe.id;

            return (
              <View key={recipe.id} style={styles.recipeCard}>
                <TouchableOpacity
                  style={styles.recipeTop}
                  onPress={() => setExpandedId(isExpanded ? null : recipe.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recipeIcon}>
                    <ChefHat size={18} color={Colors.gold} />
                  </View>
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>{recipe.menu_items?.name || "Без названия"}</Text>
                    <View style={styles.recipeMeta}>
                      <Text style={styles.recipeMetaText}>
                        Себестоимость: {cost.toFixed(0)} ₽
                      </Text>
                      <Text style={[styles.recipeMetaText, { color: margin > 0 ? Colors.success : Colors.error }]}>
                        Маржа: {marginPercent}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.recipeActions}>
                    <TouchableOpacity onPress={() => startEdit(recipe)} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteRecipe(recipe.id)} style={styles.iconBtn}>
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {isExpanded && recipe.recipe_ingredients && (
                  <View style={styles.recipeDetails}>
                    <Text style={styles.detailTitle}>Состав:</Text>
                    {recipe.recipe_ingredients.map((ri) => (
                      <View key={ri.id} style={styles.detailRow}>
                        <Package size={12} color={Colors.gold} />
                        <Text style={styles.detailName}>{ri.ingredients?.name || "Ингредиент"}</Text>
                        <Text style={styles.detailQty}>
                          {ri.quantity} {ri.unit}
                        </Text>
                      </View>
                    ))}
                    {recipe.instructions && (
                      <>
                        <Text style={[styles.detailTitle, { marginTop: 12 }]}>Инструкция:</Text>
                        <Text style={styles.instructions}>{recipe.instructions}</Text>
                      </>
                    )}
                    {recipe.prep_time_minutes && (
                      <Text style={styles.prepTime}>
                        Время приготовления: {recipe.prep_time_minutes} мин
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <ChefHat size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Техкарт пока нет</Text>
              <Text style={styles.emptySub}>Создайте первую техкарту</Text>
            </View>
          )}
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
  editHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editTitle: { fontSize: 16, fontWeight: "700" as const, color: Colors.gold },
  fieldLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" as const, marginBottom: 2 },
  menuPicker: { gap: 8, paddingVertical: 4 },
  menuPick: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  menuPickActive: { backgroundColor: `${Colors.gold}18`, borderColor: Colors.gold },
  menuPickText: { fontSize: 13, color: Colors.textSecondary },
  menuPickTextActive: { color: Colors.gold, fontWeight: "700" as const },
  editInput: {
    backgroundColor: Colors.surface2, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },

  ingSection: { gap: 8 },
  ingHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  ingTitle: { fontSize: 14, fontWeight: "700" as const, color: Colors.text },
  addIngBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addIngText: { fontSize: 12, color: Colors.gold, fontWeight: "600" as const },
  ingRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.surface2, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  ingSelectWrap: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface3, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, gap: 4,
  },
  ingSelect: { flex: 1, fontSize: 12, color: Colors.text },
  qtyInput: {
    width: 60, backgroundColor: Colors.surface3, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: Colors.text,
    textAlign: "center",
  },
  unitText: { fontSize: 12, color: Colors.textMuted, minWidth: 20 },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 13,
    marginTop: 4,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700" as const, color: Colors.bg },

  scroll: { paddingHorizontal: 20, gap: 10 },

  recipeCard: {
    backgroundColor: Colors.surface1, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  recipeTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  recipeIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: `${Colors.gold}15`, alignItems: "center", justifyContent: "center",
  },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: 15, fontWeight: "700" as const, color: Colors.text },
  recipeMeta: { flexDirection: "row", gap: 12, marginTop: 3 },
  recipeMetaText: { fontSize: 12, color: Colors.textSecondary },
  recipeActions: { flexDirection: "row", gap: 6 },
  iconBtn: { padding: 6 },
  iconBtnText: { fontSize: 18 },

  recipeDetails: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  detailTitle: { fontSize: 13, fontWeight: "700" as const, color: Colors.textSecondary, marginBottom: 8 },
  detailRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 5,
  },
  detailName: { flex: 1, fontSize: 13, color: Colors.text },
  detailQty: { fontSize: 12, color: Colors.textMuted },
  instructions: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginTop: 4 },
  prepTime: {
    fontSize: 12, color: Colors.textMuted, marginTop: 8,
    backgroundColor: Colors.surface2, alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },

  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: "600" as const, color: Colors.textSecondary },
  emptySub: { fontSize: 13, color: Colors.textMuted },
});
