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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useProfile, TIER_LABEL, TIER_COLOR } from "@/hooks/useProfile";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/lib/supabase";
import Colors from "@/constants/colors";
import {
  User, Phone, Mail, Gift, LogOut, ChevronRight,
  ShoppingBag, CalendarDays, Star, Shield, Heart, ShoppingCart,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface LoyaltyData {
  points: number;
  tier: string;
  total_earned: number;
  total_spent: number;
}

interface FavoriteItem {
  id: string;
  menu_item_id: string;
  menu_items: {
    id: string;
    name: string;
    price: number;
    image: string;
    description: string;
  };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, isSigningIn, error, signIn, signOut, clearError } = useAuth();
  const { addItem } = useCart();
  const { profile, loyalty, transactions, isLoading: profileLoading, updateProfile } = useProfile(user?.id);
  const { favorites, isLoading: favsLoading, refetch: refetchFavs } = useFavorites(user?.id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [activeSection, setActiveSection] = useState<"info" | "favorites" | "loyalty">("info");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (profile) {
      setName((profile.name as string) || "");
      setPhone((profile.phone as string) || "");
    }
  }, [profile]);

  async function saveProfile() {
    updateProfile({ name, phone });
    setEditing(false);
  }

  async function removeFavorite(menuItemId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await supabase.from("favorites").delete().eq("user_id", user!.id).eq("menu_item_id", menuItemId);
    refetchFavs();
  }

  if (isLoading || profileLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.center]}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.authWrap, { opacity: fadeAnim }]}>
          <View style={styles.authIcon}>
            <User size={48} color={Colors.gold} />
          </View>
          <Text style={styles.authTitle}>Войдите в аккаунт</Text>
          <Text style={styles.authSub}>Чтобы делать заказы, копить бонусы и отслеживать бронирования</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError} style={styles.errorDismiss}>
                <Text style={styles.errorDismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isSigningIn ? (
            <ActivityIndicator size="large" color={Colors.gold} style={{ marginVertical: 24 }} />
          ) : (
            <View style={styles.authBtns}>
              <TouchableOpacity style={styles.googleBtn} onPress={() => signIn("google")} activeOpacity={0.85}>
                <Text style={styles.googleBtnText}>G</Text>
                <Text style={styles.googleLabel}>Войти через Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.appleBtn} onPress={() => signIn("apple")} activeOpacity={0.85}>
                <Text style={styles.appleBtnIcon}></Text>
                <Text style={styles.appleLabel}>Войти через Apple</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    );
  }

  const tierLabel: Record<string, string> = TIER_LABEL;
  const tierColor: Record<string, string> = TIER_COLOR;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Профиль</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* AVATAR + NAME */}
          <View style={styles.profileHeader}>
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={32} color={Colors.gold} />
              </View>
            )}
            <View style={styles.profileInfo}>
              {editing ? (
                <>
                  <TextInput style={styles.editInput} value={name} onChangeText={setName} placeholder="Имя" placeholderTextColor={Colors.textMuted} />
                  <TextInput style={styles.editInput} value={phone} onChangeText={setPhone} placeholder="Телефон" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
                  <View style={styles.editRow}>
                    <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} activeOpacity={0.85}>
                      <Text style={styles.saveBtnText}>Сохранить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditing(false)}>
                      <Text style={styles.cancelText}>Отмена</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.profileName}>{profile?.name || user.name || "Гость"}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                  {profile?.phone ? (
                    <View style={styles.profilePhoneRow}>
                      <Phone size={12} color={Colors.gold} />
                      <Text style={styles.profilePhone}>{profile.phone as string}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>Редактировать</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* BONUS CARD */}
          <View style={styles.bonusCard}>
            <View style={styles.bonusTop}>
              <Gift size={18} color={Colors.gold} />
              <Text style={styles.bonusLabel}>Бонусный баланс</Text>
            </View>
            <Text style={styles.bonusValue}>{loyalty?.points ?? 0} баллов</Text>
            <View style={styles.bonusTier}>
              <Star size={12} color={tierColor[loyalty?.tier ?? "bronze"] || Colors.gold} />
              <Text style={[styles.bonusTierText, { color: tierColor[loyalty?.tier ?? "bronze"] || Colors.gold }]}>
                Уровень {tierLabel[loyalty?.tier ?? "bronze"] || "Bronze"}
              </Text>
            </View>
            {loyalty && (
              <View style={styles.loyaltyStats}>
                <View style={styles.loyaltyStat}>
                  <Text style={styles.loyaltyStatVal}>{loyalty.total_earned}</Text>
                  <Text style={styles.loyaltyStatLabel}>заработано</Text>
                </View>
                <View style={styles.loyaltyDivider} />
                <View style={styles.loyaltyStat}>
                  <Text style={styles.loyaltyStatVal}>{loyalty.total_spent}</Text>
                  <Text style={styles.loyaltyStatLabel}>потрачено</Text>
                </View>
              </View>
            )}
          </View>

          {/* SECTION TABS */}
          <View style={styles.sectionTabs}>
            <TouchableOpacity
              style={[styles.sectionTab, activeSection === "info" && styles.sectionTabActive]}
              onPress={() => setActiveSection("info")}
            >
              <Star size={14} color={activeSection === "info" ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.sectionTabText, activeSection === "info" && styles.sectionTabTextActive]}>Данные</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sectionTab, activeSection === "favorites" && styles.sectionTabActive]}
              onPress={() => setActiveSection("favorites")}
            >
              <Heart size={14} color={activeSection === "favorites" ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.sectionTabText, activeSection === "favorites" && styles.sectionTabTextActive]}>Избранное</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sectionTab, activeSection === "loyalty" && styles.sectionTabActive]}
              onPress={() => setActiveSection("loyalty")}
            >
              <Gift size={14} color={activeSection === "loyalty" ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.sectionTabText, activeSection === "loyalty" && styles.sectionTabTextActive]}>Бонусы</Text>
            </TouchableOpacity>
          </View>

          {/* INFO SECTION */}
          {activeSection === "info" && (
            <View style={styles.navSection}>
              <NavLink icon={<ShoppingBag size={18} color={Colors.gold} />} label="История заказов" onPress={() => router.push("/orders")} />
              <NavLink icon={<CalendarDays size={18} color={Colors.gold} />} label="Мои бронирования" onPress={() => router.push("/orders")} />
              <NavLink icon={<Heart size={18} color={Colors.gold} />} label="Избранные блюда" onPress={() => setActiveSection("favorites")} />
              <NavLink icon={<Gift size={18} color={Colors.gold} />} label="Мои промокоды" onPress={() => setActiveSection("loyalty")} />
              <NavLink icon={<Shield size={18} color={Colors.gold} />} label="Админ-панель" onPress={() => router.push("/admin")} />
            </View>
          )}

          {/* FAVORITES SECTION */}
          {activeSection === "favorites" && (
            <View style={styles.favoritesSection}>
              {favorites.length === 0 ? (
                <View style={styles.emptyFav}>
                  <Heart size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyFavTitle}>Нет избранных блюд</Text>
                  <Text style={styles.emptyFavSub}>Добавляйте блюда в избранное из меню</Text>
                </View>
              ) : (
                favorites.map((fav) => (
                  <View key={fav.id} style={styles.favCard}>
                    <Image source={{ uri: fav.menu_items.image }} style={styles.favImage} />
                    <View style={styles.favInfo}>
                      <Text style={styles.favName} numberOfLines={1}>{fav.menu_items.name}</Text>
                      <Text style={styles.favPrice}>{fav.menu_items.price} ₽</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.favCartBtn}
                      onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); addItem({ id: fav.menu_items.id, name: fav.menu_items.name, price: fav.menu_items.price, image: fav.menu_items.image }); }}
                    >
                      <ShoppingCart size={14} color={Colors.bg} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.favRemove} onPress={() => removeFavorite(fav.menu_item_id)}>
                      <Text style={styles.favRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {/* LOYALTY SECTION */}
          {activeSection === "loyalty" && <LoyaltySection transactions={transactions} />}

          {/* SIGN OUT */}
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.7}>
            <LogOut size={16} color={Colors.error} />
            <Text style={styles.signOutText}>Выйти</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function NavLink({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={navStyles.link} onPress={onPress} activeOpacity={0.7}>
      <View style={navStyles.iconWrap}>{icon}</View>
      <Text style={navStyles.label}>{label}</Text>
      <ChevronRight size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const navStyles = StyleSheet.create({
  link: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${Colors.gold}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.8 },

  // Auth
  authWrap: { flex: 1, alignItems: "center", paddingTop: 60 },
  authIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: `${Colors.gold}15`,
    alignItems: "center", justifyContent: "center",
    marginBottom: 24, borderWidth: 1, borderColor: `${Colors.gold}30`,
  },
  authTitle: { fontSize: 26, fontWeight: "800" as const, color: Colors.text, letterSpacing: -0.5, marginBottom: 10 },
  authSub: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 21, marginBottom: 32, paddingHorizontal: 20 },
  errorBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#E0525220", borderRadius: 12, padding: 14, marginBottom: 20, gap: 10,
    borderWidth: 1, borderColor: `${Colors.error}40`,
  },
  errorText: { color: Colors.error, flex: 1, fontSize: 13 },
  errorDismiss: { padding: 4 },
  errorDismissText: { color: Colors.error, fontSize: 14, fontWeight: "700" as const },
  authBtns: { width: "100%", gap: 12 },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.surface2, borderRadius: 16, paddingVertical: 16, gap: 12,
    width: "100%", borderWidth: 1, borderColor: Colors.border,
  },
  googleBtnText: { fontSize: 18, fontWeight: "700" as const, color: Colors.text },
  googleLabel: { fontSize: 15, fontWeight: "600" as const, color: Colors.text },
  appleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 16, gap: 12,
    width: "100%",
  },
  appleBtnIcon: { fontSize: 20, fontWeight: "700" as const, color: "#000000" },
  appleLabel: { fontSize: 15, fontWeight: "600" as const, color: "#000000" },

  // Profile
  profileHeader: { flexDirection: "row", gap: 16, marginBottom: 24, alignItems: "flex-start" },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: Colors.gold },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${Colors.gold}15`, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: `${Colors.gold}30`,
  },
  profileInfo: { flex: 1, justifyContent: "center", minHeight: 72 },
  profileName: { fontSize: 20, fontWeight: "700" as const, color: Colors.text, letterSpacing: -0.3, marginBottom: 2 },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  profilePhoneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  profilePhone: { fontSize: 13, color: Colors.textSecondary },
  editBtn: { alignSelf: "flex-start", marginTop: 6 },
  editBtnText: { fontSize: 13, color: Colors.gold, fontWeight: "600" as const },
  editInput: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: Colors.text, marginBottom: 8,
  },
  editRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  saveBtn: {
    backgroundColor: Colors.gold, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  saveBtnText: { fontSize: 13, fontWeight: "700" as const, color: Colors.bg },
  cancelText: { fontSize: 13, color: Colors.textMuted },

  // Bonus
  bonusCard: {
    backgroundColor: `${Colors.gold}10`, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: `${Colors.gold}25`, marginBottom: 24,
  },
  bonusTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  bonusLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" as const },
  bonusValue: { fontSize: 36, fontWeight: "800" as const, color: Colors.gold, letterSpacing: -1, marginBottom: 8 },
  bonusTier: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  bonusTierText: { fontSize: 12, fontWeight: "600" as const },
  loyaltyStats: {
    flexDirection: "row", alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${Colors.gold}25`,
    paddingTop: 12, gap: 0,
  },
  loyaltyStat: { flex: 1, alignItems: "center", gap: 2 },
  loyaltyStatVal: { fontSize: 18, fontWeight: "700" as const, color: Colors.text },
  loyaltyStatLabel: { fontSize: 10, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  loyaltyDivider: { width: 1, height: 30, backgroundColor: `${Colors.gold}25` },

  // Section tabs
  sectionTabs: { flexDirection: "row", gap: 8, marginBottom: 16 },
  sectionTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
  },
  sectionTabActive: { backgroundColor: `${Colors.gold}15`, borderColor: Colors.gold },
  sectionTabText: { fontSize: 12, fontWeight: "600" as const, color: Colors.textMuted },
  sectionTabTextActive: { color: Colors.gold },

  // Nav
  navSection: {
    backgroundColor: Colors.surface1, borderRadius: 20, paddingHorizontal: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 24,
  },

  // Favorites
  favoritesSection: { marginBottom: 24 },
  emptyFav: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyFavTitle: { fontSize: 16, fontWeight: "600" as const, color: Colors.textSecondary },
  emptyFavSub: { fontSize: 13, color: Colors.textMuted },
  favCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface1, borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  favImage: { width: 56, height: 56, borderRadius: 12 },
  favInfo: { flex: 1, marginLeft: 12 },
  favName: { fontSize: 14, fontWeight: "600" as const, color: Colors.text },
  favPrice: { fontSize: 13, color: Colors.gold, fontWeight: "700" as const, marginTop: 2 },
  favCartBtn: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: Colors.gold,
    alignItems: "center", justifyContent: "center", marginRight: 4,
  },
  favRemove: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: `${Colors.error}15`,
    alignItems: "center", justifyContent: "center",
  },
  favRemoveText: { fontSize: 14, color: Colors.error, fontWeight: "700" as const },

  // Loyalty section
  loyaltySection: { marginBottom: 24 },
  loyaltyDetailCard: {
    backgroundColor: Colors.surface1, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  loyaltyDetailTitle: { fontSize: 15, fontWeight: "700" as const, color: Colors.text, marginBottom: 16 },
  loyaltyTransaction: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  loyaltyDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success,
  },
  loyaltyTxInfo: { flex: 1 },
  loyaltyTxLabel: { fontSize: 13, color: Colors.text, fontWeight: "600" as const },
  loyaltyTxDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  loyaltyTxAmount: { fontSize: 14, fontWeight: "700" as const, color: Colors.success },

  loyaltyLoading: { alignItems: "center", paddingVertical: 30 },
  loyaltyEmpty: { alignItems: "center", paddingVertical: 30, gap: 8 },
  loyaltyEmptyText: { fontSize: 13, color: Colors.textMuted },

  // Sign out
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 14, backgroundColor: `${Colors.error}12`,
    borderWidth: 1, borderColor: `${Colors.error}25`, marginBottom: 24,
  },
  signOutText: { fontSize: 15, color: Colors.error, fontWeight: "600" as const },
});

function LoyaltySection({ transactions }: { transactions: Array<{ id: string; type: string; amount: number; description: string; created_at: string }> }) {
  if (!transactions) {
    return (
      <View style={loStyles.wrap}>
        <View style={loStyles.card}>
          <ActivityIndicator size="small" color={Colors.gold} />
        </View>
      </View>
    );
  }

  return (
    <View style={loStyles.wrap}>
      <View style={loStyles.card}>
        <Text style={loStyles.title}>История начислений</Text>
        {transactions.length === 0 ? (
          <View style={loStyles.empty}>
            <Gift size={32} color={Colors.textMuted} />
            <Text style={loStyles.emptyText}>Пока нет операций</Text>
            <Text style={loStyles.emptySub}>Бонусы начисляются за заказы</Text>
          </View>
        ) : (
          transactions.map((tx, i) => {
            const isCredit = tx.type === "earn" || tx.amount > 0;
            return (
              <View key={tx.id} style={[loStyles.tx, i > 0 && loStyles.txBorder]}>
                <View style={[loStyles.txDot, { backgroundColor: isCredit ? Colors.success : Colors.error }]} />
                <View style={loStyles.txInfo}>
                  <Text style={loStyles.txLabel}>{tx.description || (isCredit ? "Начисление" : "Списание")}</Text>
                  <Text style={loStyles.txDate}>{new Date(tx.created_at).toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
                <Text style={[loStyles.txAmount, { color: isCredit ? Colors.success : Colors.error }]}>
                  {isCredit ? "+" : "−"}{Math.abs(tx.amount)}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const loStyles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  card: {
    backgroundColor: Colors.surface1, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  title: { fontSize: 15, fontWeight: "700" as const, color: Colors.text, marginBottom: 16 },
  empty: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, fontWeight: "600" as const },
  emptySub: { fontSize: 12, color: Colors.textMuted },
  tx: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10,
  },
  txBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  txDot: { width: 10, height: 10, borderRadius: 5 },
  txInfo: { flex: 1 },
  txLabel: { fontSize: 13, color: Colors.text, fontWeight: "600" as const },
  txDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "700" as const },
});
