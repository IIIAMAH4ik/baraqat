import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Phone, MessageCircle, MapPin, Clock, ChevronRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import LeadMagnetModal from '@/components/LeadMagnetModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PROMOS = [
  {
    id: '1',
    title: 'Бизнес-ланч',
    desc: 'Суп + горячее + напиток за 490 ₽',
    tag: 'Ежедневно 12:00–15:00',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
  },
  {
    id: '2',
    title: 'Романтический вечер',
    desc: 'Ужин на двоих + бутылка вина в подарок',
    tag: 'По пятницам и субботам',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  },
  {
    id: '3',
    title: 'Детское меню',
    desc: 'Специальное меню для гостей до 10 лет',
    tag: 'Каждый день',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
  },
];

function PromoCard({ item, index }: { item: typeof PROMOS[0]; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 100 + index * 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 100 + index * 120, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.promoCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Image source={{ uri: item.image }} style={styles.promoImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.promoGradient}
      />
      <View style={styles.promoContent}>
        <View style={styles.promoTagWrap}>
          <Text style={styles.promoTag}>{item.tag}</Text>
        </View>
        <Text style={styles.promoTitle}>{item.title}</Text>
        <Text style={styles.promoDesc}>{item.desc}</Text>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [leadVisible, setLeadVisible] = useState(false);

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(40)).current;
  const tickerX = useRef(new Animated.Value(0)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerSlide = useRef(new Animated.Value(20)).current;

  const TICKER_TEXT = '  ул. Балкарская, 10, Нальчик   •   Пн–Вс  10:00–23:00   •   Тел: +7 (866) 255-10-10   •   ';
  const TICKER_WIDTH = TICKER_TEXT.length * 8.5;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.timing(tickerX, { toValue: -TICKER_WIDTH, duration: 18000, useNativeDriver: true })
    ).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(bannerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(bannerSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 1200);
  }, []);

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('tel:+78662551010');
  };

  const handleWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('https://wa.me/78662551010');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* HERO */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80' }}
            style={styles.heroBg}
          />
          <LinearGradient
            colors={['rgba(10,10,10,0.25)', 'rgba(10,10,10,0.55)', Colors.bg]}
            style={styles.heroGradient}
          />
          <Animated.View style={[styles.heroContent, { opacity: heroOpacity, transform: [{ translateY: heroSlide }] }]}>
            <View style={styles.logoRow}>
              <View style={styles.logoDivider} />
              <Text style={styles.logoText}>БАРАКЯТ</Text>
              <View style={styles.logoDivider} />
            </View>
            <Text style={styles.heroSlogan}>Вкус, который остаётся</Text>
            <Text style={styles.heroSub}>{'Кафе в центре Нальчика'}</Text>
          </Animated.View>
        </View>

        {/* TICKER */}
        <View style={styles.tickerContainer}>
          <Animated.View style={[styles.tickerRow, { transform: [{ translateX: tickerX }] }]}>
            {[0, 1, 2].map((i) => (
              <Text key={i} style={styles.tickerText}>{TICKER_TEXT}</Text>
            ))}
          </Animated.View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCall} activeOpacity={0.8}>
            <Phone size={18} color={Colors.bg} />
            <Text style={styles.actionText}>Позвонить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={handleWhatsApp} activeOpacity={0.8}>
            <MessageCircle size={18} color={Colors.gold} />
            <Text style={[styles.actionText, styles.actionTextOutline]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* LEAD MAGNET BANNER */}
        <Animated.View style={{ opacity: bannerOpacity, transform: [{ translateY: bannerSlide }] }}>
          <TouchableOpacity
            style={styles.leadBanner}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLeadVisible(true); }}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[`${Colors.gold}25`, `${Colors.goldDim}18`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.leadGradient}
            />
            <View style={styles.leadLeft}>
              <View style={styles.leadIconWrap}>
                <Sparkles size={22} color={Colors.gold} />
              </View>
              <View style={styles.leadTexts}>
                <Text style={styles.leadTitle}>Десерт в подарок</Text>
                <Text style={styles.leadSubtitle}>при первом визите — получить промокод</Text>
              </View>
            </View>
            <ChevronRight size={18} color={Colors.gold} />
          </TouchableOpacity>
        </Animated.View>

        {/* INFO STRIP */}
        <View style={styles.infoStrip}>
          <View style={styles.infoItem}>
            <MapPin size={14} color={Colors.gold} />
            <Text style={styles.infoText}>ул. Балкарская, 10</Text>
          </View>
          <View style={styles.infoDot} />
          <View style={styles.infoItem}>
            <Clock size={14} color={Colors.gold} />
            <Text style={styles.infoText}>10:00 – 23:00</Text>
          </View>
        </View>

        {/* PROMOS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Актуальные акции</Text>
            <View style={styles.sectionLine} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promosScroll}
          >
            {PROMOS.map((item, i) => <PromoCard key={item.id} item={item} index={i} />)}
          </ScrollView>
        </View>

        {/* ABOUT */}
        <View style={styles.section}>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutQuote}>{`"`}</Text>
            <Text style={styles.aboutText}>
              Кафе «Баракят» — это место, где традиции кавказского гостеприимства встречаются с современной кухней. Мы готовим из свежих локальных продуктов и создаём атмосферу тепла для каждого гостя.
            </Text>
            <View style={styles.aboutDivider} />
            <Text style={styles.aboutNote}>г. Нальчик, Кабардино-Балкария</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <LeadMagnetModal visible={leadVisible} onClose={() => setLeadVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flexGrow: 1,
  },
  heroWrap: {
    height: SCREEN_HEIGHT * 0.52,
    overflow: 'hidden',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 36,
    left: 28,
    right: 28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  logoDivider: {
    flex: 1,
    height: 1,
    backgroundColor: `${Colors.gold}55`,
  },
  logoText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 6,
  },
  heroSlogan: {
    fontSize: 38,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 15,
    color: `${Colors.text}99`,
    letterSpacing: 0.3,
  },
  tickerContainer: {
    height: 36,
    backgroundColor: Colors.surface1,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    justifyContent: 'center',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
  },
  tickerText: {
    fontSize: 12,
    color: Colors.gold,
    letterSpacing: 0.5,
    fontWeight: '500' as const,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.bg,
    letterSpacing: 0.2,
  },
  actionTextOutline: {
    color: Colors.gold,
  },
  leadBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${Colors.gold}40`,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  leadGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  leadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  leadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${Colors.gold}35`,
  },
  leadTexts: {
    flex: 1,
  },
  leadTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  leadSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  section: {
    paddingTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 18,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  promosScroll: {
    paddingHorizontal: 20,
    gap: 14,
  },
  promoCard: {
    width: SCREEN_WIDTH * 0.68,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.surface1,
  },
  promoImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  promoGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  promoContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  promoTagWrap: {
    backgroundColor: `${Colors.gold}30`,
    borderWidth: 1,
    borderColor: `${Colors.gold}50`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  promoTag: {
    fontSize: 10,
    color: Colors.gold,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  promoDesc: {
    fontSize: 12,
    color: `${Colors.text}CC`,
    lineHeight: 17,
  },
  aboutCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface1,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aboutQuote: {
    fontSize: 48,
    color: Colors.gold,
    fontWeight: '800' as const,
    lineHeight: 40,
    marginBottom: 8,
    opacity: 0.6,
  },
  aboutText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  aboutDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  aboutNote: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
