import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, CheckCircle, XCircle, Heart, UtensilsCrossed } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useMenu, type MenuItem, type MenuCategory } from '@/hooks/useMenu';
import { useFavorites } from '@/hooks/useFavorites';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

function MenuItemCard({ item, index, isFav, onToggleFav }: { item: MenuItem; index: number; isFav: boolean; onToggleFav: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const addedAnim = useRef(new Animated.Value(0)).current;
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, [index]);

  const handleAdd = () => {
    if (!item.available) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem({ id: item.id, name: item.name, price: item.price, image: item.image || '' });
    setAdded(true);
    Animated.sequence([
      Animated.timing(addedAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(addedAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setAdded(false));
  };

  const handleToggleFav = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleFav();
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, tension: 200, friction: 20 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 20 }).start();
  };

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardInner}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: item.image }} style={styles.cardImage} />
          {!item.available && <View style={styles.cardImageOverlay} />}
          {item.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardName, !item.available && styles.textUnavailable]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardPrice}>{item.price} ₽</Text>
          </View>
          <Text style={[styles.cardDesc, !item.available && styles.textUnavailable]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.cardFooter}>
            {item.available ? (
              <View style={styles.cardFooterRow}>
                <View style={styles.availRow}>
                  <CheckCircle size={12} color={Colors.success} />
                  <Text style={styles.availText}>В наличии</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.favBtn} onPress={handleToggleFav} activeOpacity={0.7}>
                    <Heart size={16} color={isFav ? Colors.error : Colors.textMuted} fill={isFav ? Colors.error : 'none'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addToCartBtn} onPress={handleAdd} activeOpacity={0.8}>
                    <Animated.Text style={[
                      styles.addToCartText,
                      added && { opacity: addedAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
                    ]}>
                      +
                    </Animated.Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.availRow}>
                <XCircle size={12} color={Colors.textMuted} />
                <Text style={styles.unavailText}>Нет в наличии</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { items: menuItems, categories, updatedAt: menuUpdatedAt, isLoading: loading } = useMenu();
  const { user } = useAuth();
  const { isFav, toggle } = useFavorites(user?.id);
  const [activeCategory, setActiveCategory] = useState('');
  const categoryFade = useRef(new Animated.Value(1)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !categories.find(c => c.id === activeCategory)) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  const handleCategoryChange = (id: string) => {
    if (id === activeCategory) return;
    Animated.sequence([
      Animated.timing(categoryFade, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setActiveCategory(id);
      Animated.timing(categoryFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const filtered = menuItems.filter((i) => i.category_id === activeCategory);
  const currentCategory = categories.find((c) => c.id === activeCategory);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Меню</Text>
          {menuUpdatedAt ? (
            <View style={styles.updatedRow}>
              <Clock size={11} color={Colors.textMuted} />
              <Text style={styles.updatedText}>Обновлено {menuUpdatedAt}</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
        style={styles.categoriesBar}
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catBtn, isActive && styles.catBtnActive]}
              onPress={() => handleCategoryChange(cat.id)}
              activeOpacity={0.75}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 60 }} />
      ) : menuItems.length === 0 ? (
        <View style={styles.emptyState}>
          <UtensilsCrossed size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Меню пока пустое</Text>
          <Text style={styles.emptySub}>Администратор скоро добавит блюда</Text>
        </View>
      ) : (
        <Animated.ScrollView
          key={activeCategory}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
          style={{ opacity: categoryFade }}
        >
          <View style={styles.categoryHeading}>
            <Text style={styles.categoryEmoji}>{currentCategory?.emoji}</Text>
            <Text style={styles.categoryTitle}>{currentCategory?.label}</Text>
            <Text style={styles.categoryCount}>{filtered.length} позиций</Text>
          </View>

          {filtered.map((item, index) => (
            <MenuItemCard key={item.id} item={item} index={index} isFav={isFav(item.id)} onToggleFav={() => toggle(item.id)} />
          ))}
        </Animated.ScrollView>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.8,
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  updatedText: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  categoriesBar: {
    maxHeight: 54,
    marginTop: 16,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catBtnActive: {
    backgroundColor: `${Colors.gold}20`,
    borderColor: Colors.gold,
  },
  catEmoji: {
    fontSize: 14,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  catLabelActive: {
    color: Colors.gold,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  categoryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  categoryCount: {
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface1,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
  },
  cardImageWrap: {
    width: 110,
    height: 110,
    position: 'relative',
  },
  cardImage: {
    width: 110,
    height: 110,
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.55)',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.gold,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.bg,
    letterSpacing: 0.3,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 4,
    flex: 1,
  },
  textUnavailable: {
    opacity: 0.4,
  },
  cardFooter: {
    marginTop: 8,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '600' as const,
  },
  unavailText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  favBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addToCartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.bg,
    lineHeight: 20,
  },
  emptyState: { alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textMuted },
});
