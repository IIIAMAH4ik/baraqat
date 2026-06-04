import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Music, Flower2, Cake, Phone, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { apiFetch } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_TRACK_WIDTH = SCREEN_WIDTH - 48;

type Format = 'family' | 'wedding' | 'corporate';

const FORMATS: { id: Format; label: string; desc: string; emoji: string; multiplier: number }[] = [
  { id: 'family', label: 'Семейный', desc: 'Уютная встреча', emoji: '👨‍👩‍👧', multiplier: 1 },
  { id: 'wedding', label: 'Свадьба', desc: 'Особый день', emoji: '💍', multiplier: 1.35 },
  { id: 'corporate', label: 'Корпоратив', desc: 'Деловой формат', emoji: '🏢', multiplier: 1.15 },
];

const EXTRAS = [
  { id: 'music', label: 'Живая музыка', price: 15000, Icon: Music },
  { id: 'decor', label: 'Декор зала', price: 12000, Icon: Flower2 },
  { id: 'cake', label: 'Торт на заказ', price: 8000, Icon: Cake },
];

function SliderComponent({
  min, max, value, onValueChange, formatLabel,
}: {
  min: number; max: number; value: number;
  onValueChange: (v: number) => void;
  formatLabel: (v: number) => string;
}) {
  const trackWidth = SLIDER_TRACK_WIDTH;
  const thumbX = useRef(new Animated.Value(((value - min) / (max - min)) * (trackWidth - 28))).current;
  const thumbXValue = useRef(((value - min) / (max - min)) * (trackWidth - 28));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(0, Math.min(trackWidth - 28, thumbXValue.current + gs.dx));
        thumbX.setValue(newX);
        const ratio = newX / (trackWidth - 28);
        const newVal = Math.round(min + ratio * (max - min));
        onValueChange(newVal);
      },
      onPanResponderRelease: (_, gs) => {
        const newX = Math.max(0, Math.min(trackWidth - 28, thumbXValue.current + gs.dx));
        thumbXValue.current = newX;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    })
  ).current;

  useEffect(() => {
    const newX = ((value - min) / (max - min)) * (trackWidth - 28);
    thumbXValue.current = newX;
    thumbX.setValue(newX);
  }, [value, min, max]);

  const fillWidth = thumbX.interpolate({
    inputRange: [0, trackWidth - 28],
    outputRange: [14, trackWidth - 14],
    extrapolate: 'clamp',
  });

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.track}>
        <Animated.View style={[sliderStyles.fill, { width: fillWidth }]} />
        <Animated.View
          style={[sliderStyles.thumb, { transform: [{ translateX: thumbX }] }]}
          {...panResponder.panHandlers}
        >
          <View style={sliderStyles.thumbInner} />
        </Animated.View>
      </View>
      <View style={sliderStyles.labels}>
        <Text style={sliderStyles.labelText}>{formatLabel(min)}</Text>
        <Text style={sliderStyles.labelText}>{formatLabel(max)}</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { width: '100%' },
  track: {
    height: 4,
    backgroundColor: Colors.surface3,
    borderRadius: 2,
    marginVertical: 14,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 4,
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.bg,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});

export default function BanquetScreen() {
  const insets = useSafeAreaInsets();
  const [guests, setGuests] = useState(50);
  const [perPerson, setPerPerson] = useState(2500);
  const [format, setFormat] = useState<Format>('family');
  const [extras, setExtras] = useState<string[]>([]);

  const totalAnim = useRef(new Animated.Value(0)).current;
  const totalRef = useRef(0);
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const selectedFormat = FORMATS.find((f) => f.id === format)!;
  const extrasTotal = extras.reduce((sum, id) => {
    const ex = EXTRAS.find((e) => e.id === id);
    return sum + (ex?.price ?? 0);
  }, 0);
  const total = Math.round(guests * perPerson * selectedFormat.multiplier + extrasTotal);

  useEffect(() => {
    Animated.timing(totalAnim, {
      toValue: total,
      duration: 500,
      useNativeDriver: false,
    }).start();
    totalRef.current = total;
  }, [total]);

  const [displayTotal, setDisplayTotal] = useState(total);
  useEffect(() => {
    const id = totalAnim.addListener(({ value }) => setDisplayTotal(Math.round(value)));
    return () => totalAnim.removeListener(id);
  }, []);

  const toggleExtra = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExtras((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  };

  const handleBook = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Submit banquet request to backend
    try {
      await apiFetch('/api/banquet', {
        method: 'POST',
        body: JSON.stringify({
          guests,
          format: selectedFormat.label,
          per_person: perPerson,
          extras: extras.map((id) => {
            const ex = EXTRAS.find((e) => e.id === id);
            return ex?.label || id;
          }),
          total_cost: total,
          status: 'pending',
        }),
      });
    } catch (err) {
      console.error('[Banquet] Submit error:', err);
    }

    Linking.openURL('tel:+78662551010');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <Text style={styles.headerTitle}>Банкет</Text>
        <Text style={styles.headerSub}>Рассчитайте стоимость вашего мероприятия</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}
      >
        {/* GUESTS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={18} color={Colors.gold} />
            <Text style={styles.cardTitle}>Количество гостей</Text>
            <View style={styles.valuePill}>
              <Text style={styles.valuePillText}>{guests}</Text>
            </View>
          </View>
          <SliderComponent
            min={10}
            max={300}
            value={guests}
            onValueChange={setGuests}
            formatLabel={(v) => `${v} чел.`}
          />
        </View>

        {/* FORMAT */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Формат мероприятия</Text>
          </View>
          <View style={styles.formatsRow}>
            {FORMATS.map((f) => {
              const isActive = format === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.formatBtn, isActive && styles.formatBtnActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFormat(f.id); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.formatEmoji}>{f.emoji}</Text>
                  <Text style={[styles.formatLabel, isActive && styles.formatLabelActive]}>{f.label}</Text>
                  <Text style={[styles.formatDesc, isActive && styles.formatDescActive]}>{f.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* PER PERSON */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Средний чек</Text>
            <View style={styles.valuePill}>
              <Text style={styles.valuePillText}>{perPerson.toLocaleString('ru')} ₽/чел</Text>
            </View>
          </View>
          <SliderComponent
            min={1000}
            max={5000}
            value={perPerson}
            onValueChange={setPerPerson}
            formatLabel={(v) => `${v.toLocaleString('ru')} ₽`}
          />
        </View>

        {/* EXTRAS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Дополнительные услуги</Text>
          </View>
          <View style={styles.extrasList}>
            {EXTRAS.map(({ id, label, price, Icon }) => {
              const isOn = extras.includes(id);
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.extraRow, isOn && styles.extraRowActive]}
                  onPress={() => toggleExtra(id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.extraIconWrap, isOn && styles.extraIconWrapActive]}>
                    <Icon size={16} color={isOn ? Colors.bg : Colors.textSecondary} />
                  </View>
                  <Text style={[styles.extraLabel, isOn && styles.extraLabelActive]}>{label}</Text>
                  <Text style={[styles.extraPrice, isOn && styles.extraPriceActive]}>
                    +{price.toLocaleString('ru')} ₽
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* TOTAL */}
        <View style={styles.totalCard}>
          <View style={styles.totalTop}>
            <Text style={styles.totalLabel}>Итоговая стоимость</Text>
            <Text style={styles.totalValue}>{displayTotal.toLocaleString('ru')} ₽</Text>
          </View>
          <View style={styles.totalBreakdown}>
            <View style={styles.breakRow}>
              <Text style={styles.breakLabel}>{guests} гостей × {perPerson.toLocaleString('ru')} ₽ × {selectedFormat.multiplier}</Text>
              <Text style={styles.breakValue}>{Math.round(guests * perPerson * selectedFormat.multiplier).toLocaleString('ru')} ₽</Text>
            </View>
            {extras.map((id) => {
              const ex = EXTRAS.find((e) => e.id === id)!;
              return (
                <View key={id} style={styles.breakRow}>
                  <Text style={styles.breakLabel}>{ex.label}</Text>
                  <Text style={styles.breakValue}>{ex.price.toLocaleString('ru')} ₽</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.totalNote}>
            * Итоговая цена уточняется при бронировании. Предварительный расчёт.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} activeOpacity={0.85}>
          <Phone size={18} color={Colors.bg} />
          <Text style={styles.bookBtnText}>Забронировать дату</Text>
          <ChevronRight size={18} color={Colors.bg} />
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.8,
  },
  headerSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    backgroundColor: Colors.surface1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  valuePill: {
    backgroundColor: `${Colors.gold}20`,
    borderWidth: 1,
    borderColor: `${Colors.gold}40`,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  valuePillText: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '700' as const,
  },
  formatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  formatBtn: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  formatBtnActive: {
    borderColor: Colors.gold,
    backgroundColor: `${Colors.gold}14`,
  },
  formatEmoji: {
    fontSize: 22,
  },
  formatLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.1,
  },
  formatLabelActive: {
    color: Colors.gold,
  },
  formatDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  formatDescActive: {
    color: `${Colors.gold}90`,
  },
  extrasList: {
    marginTop: 12,
    gap: 10,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  extraRowActive: {
    borderColor: Colors.gold,
    backgroundColor: `${Colors.gold}12`,
  },
  extraIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraIconWrapActive: {
    backgroundColor: Colors.gold,
  },
  extraLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  extraLabelActive: {
    color: Colors.text,
  },
  extraPrice: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  extraPriceActive: {
    color: Colors.gold,
  },
  totalCard: {
    backgroundColor: Colors.surface1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: `${Colors.gold}40`,
    marginBottom: 14,
  },
  totalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.gold,
    letterSpacing: -0.5,
  },
  totalBreakdown: {
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  breakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  breakValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  totalNote: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 14,
    lineHeight: 16,
  },
  bookBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  bookBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.bg,
    letterSpacing: 0.3,
  },
});
