import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, MessageCircle, MapPin, Clock, Instagram, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

const WORK_HOURS = [
  { day: 'Понедельник', hours: '10:00 – 23:00' },
  { day: 'Вторник', hours: '10:00 – 23:00' },
  { day: 'Среда', hours: '10:00 – 23:00' },
  { day: 'Четверг', hours: '10:00 – 23:00' },
  { day: 'Пятница', hours: '10:00 – 00:00' },
  { day: 'Суббота', hours: '10:00 – 00:00' },
  { day: 'Воскресенье', hours: '11:00 – 23:00' },
];

const todayIndex = new Date().getDay();
const adjustedToday = todayIndex === 0 ? 6 : todayIndex - 1;



export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardsSlide = useRef(new Animated.Value(30)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardsOpacity, { toValue: 1, duration: 700, delay: 150, useNativeDriver: true }),
      Animated.timing(cardsSlide, { toValue: 0, duration: 700, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('tel:+78662551010');
  };

  const handleWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('https://wa.me/78662551010');
  };

  const handleInstagram = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('https://instagram.com/barakat_nalchik');
  };

  const handleMap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const addr = encodeURIComponent('Нальчик, ул. Балкарская, 10');
    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://?q=${addr}`);
    } else {
      Linking.openURL(`https://yandex.ru/maps/?text=${addr}`);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}
      >
        <Animated.View style={{ opacity: headerFade }}>
          <Text style={styles.headerTitle}>Контакты</Text>
          <Text style={styles.headerSub}>Мы всегда рады видеть вас</Text>
        </Animated.View>

        <Animated.View style={{ opacity: cardsOpacity, transform: [{ translateY: cardsSlide }] }}>
          {/* ACTION BUTTONS */}
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleCall} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: `${Colors.gold}18` }]}>
                <Phone size={22} color={Colors.gold} />
              </View>
              <Text style={styles.actionLabel}>Позвонить</Text>
              <Text style={styles.actionValue}>+7 (866) 255-10-10</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleWhatsApp} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: '#25D36618' }]}>
                <MessageCircle size={22} color="#25D366" />
              </View>
              <Text style={styles.actionLabel}>WhatsApp</Text>
              <Text style={styles.actionValue}>Написать нам</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleInstagram} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: '#E1306C18' }]}>
                <Instagram size={22} color="#E1306C" />
              </View>
              <Text style={styles.actionLabel}>Instagram</Text>
              <Text style={styles.actionValue}>@barakat_nalchik</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleMap} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: `${Colors.gold}18` }]}>
                <MapPin size={22} color={Colors.gold} />
              </View>
              <Text style={styles.actionLabel}>Адрес</Text>
              <Text style={styles.actionValue}>ул. Балкарская, 10</Text>
            </TouchableOpacity>
          </View>

          {/* MAP */}
          <View style={styles.mapCard}>
            <View style={styles.mapHeader}>
              <MapPin size={16} color={Colors.gold} />
              <Text style={styles.mapTitle}>Нальчик, ул. Балкарская, 10</Text>
              <TouchableOpacity onPress={handleMap} style={styles.mapExtBtn}>
                <ExternalLink size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.mapPlaceholder} onPress={handleMap} activeOpacity={0.8}>
              <View style={styles.mapPinWrap}>
                <MapPin size={28} color={Colors.bg} />
              </View>
              <Text style={styles.mapPlaceholderText}>Открыть на Яндекс.Картах</Text>
              <Text style={styles.mapPlaceholderSub}>г. Нальчик, ул. Балкарская, 10</Text>
            </TouchableOpacity>
          </View>

          {/* HOURS */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Clock size={16} color={Colors.gold} />
              <Text style={styles.cardTitle}>Режим работы</Text>
            </View>
            <View style={styles.hoursList}>
              {WORK_HOURS.map((item, i) => {
                const isToday = i === adjustedToday;
                return (
                  <View key={item.day} style={[styles.hoursRow, isToday && styles.hoursRowToday]}>
                    <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>{item.day}</Text>
                    <Text style={[styles.hoursTime, isToday && styles.hoursTimeToday]}>{item.hours}</Text>
                    {isToday && <View style={styles.todayDot} />}
                  </View>
                );
              })}
            </View>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.footerDivRow}>
              <View style={styles.footerDiv} />
              <Text style={styles.footerLogo}>БАРАКЯТ</Text>
              <View style={styles.footerDiv} />
            </View>
            <Text style={styles.footerSlogan}>Вкус, который остаётся</Text>
            <Text style={styles.footerAddress}>г. Нальчик, Кабардино-Балкарская Республика</Text>
            <Text style={styles.footerCopy}>© 2026 Кафе «Баракят». Все права защищены.</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
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
    marginBottom: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  actionCard: {
    width: '47%',
    backgroundColor: Colors.surface1,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600' as const,
  },
  actionValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  mapCard: {
    backgroundColor: Colors.surface1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  mapTitle: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600' as const,
    flex: 1,
  },
  mapExtBtn: {
    padding: 4,
  },
  mapPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface2,
  },
  mapPinWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  mapPlaceholderText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '700' as const,
  },
  mapPlaceholderSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.surface1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  hoursList: {
    gap: 2,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    position: 'relative',
  },
  hoursRowToday: {
    backgroundColor: `${Colors.gold}12`,
  },
  hoursDay: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  hoursDayToday: {
    color: Colors.gold,
    fontWeight: '700' as const,
  },
  hoursTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  hoursTimeToday: {
    color: Colors.text,
    fontWeight: '700' as const,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  footerDivRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '70%',
    marginBottom: 6,
  },
  footerDiv: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: `${Colors.gold}40`,
  },
  footerLogo: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 5,
  },
  footerSlogan: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  footerAddress: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  footerCopy: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
  },
});
