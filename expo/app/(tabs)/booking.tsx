import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays, Clock, Users, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

Dimensions.get('window');

const TIME_SLOTS = [
  '12:00', '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00', '21:00', '22:00',
];

const WEEK_DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default function BookingScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (submitted) {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(checkAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [submitted]);

  const calDays = buildCalendarDays(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  const isPast = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < t;
  };

  const selectedDate = selectedDay ? new Date(calYear, calMonth, selectedDay) : null;

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '');
    let f = '';
    if (digits.length > 0) f += '+' + digits.slice(0, 1);
    if (digits.length > 1) f += ' (' + digits.slice(1, 4);
    if (digits.length > 4) f += ') ' + digits.slice(4, 7);
    if (digits.length > 7) f += '-' + digits.slice(7, 9);
    if (digits.length > 9) f += '-' + digits.slice(9, 11);
    return f;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedDay) e.date = 'Выберите дату';
    if (!selectedTime) e.time = 'Выберите время';
    if (!name.trim()) e.name = 'Введите имя';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) e.phone = 'Введите корректный номер';
    if (!agreed) e.agreed = 'Необходимо согласие';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSubmitting(true);
    try {
      await supabase.from('reservations').insert({
        name: name.trim(),
        phone: phone,
        guests,
        date: selectedDate ? formatDate(selectedDate) : '',
        time: selectedTime!,
        status: 'pending',
        user_id: user?.id || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch (err) {
      console.error('Booking submit error:', err);
      setErrors({ submit: 'Ошибка при отправке' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted && selectedDate) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.successWrap, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
          <Animated.View style={[styles.successCheck, {
            transform: [{ scale: checkAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.2, 1] }) }],
            opacity: checkAnim,
          }]}>
            <Check size={36} color={Colors.bg} strokeWidth={3} />
          </Animated.View>
          <Text style={styles.successTitle}>Заявка принята!</Text>
          <Text style={styles.successSub}>Мы подтвердим бронирование в ближайшее время</Text>

          <View style={styles.confirmCard}>
            <ConfirmRow icon={<CalendarDays size={16} color={Colors.gold} />} label="Дата" value={formatDate(selectedDate)} />
            <ConfirmRow icon={<Clock size={16} color={Colors.gold} />} label="Время" value={selectedTime!} />
            <ConfirmRow icon={<Users size={16} color={Colors.gold} />} label="Гостей" value={`${guests} чел.`} />
          </View>

          <TouchableOpacity
            style={styles.newBookingBtn}
            onPress={() => { setSubmitted(false); setSelectedDay(null); setSelectedTime(null); setName(''); setPhone(''); setAgreed(false); setErrors({}); }}
            activeOpacity={0.85}
          >
            <Text style={styles.newBookingText}>Новое бронирование</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
            <Animated.View style={{ opacity: headerFade }}>
              <Text style={styles.headerTitle}>Бронирование</Text>
              <Text style={styles.headerSub}>Выберите дату, время и заполните данные</Text>
            </Animated.View>

            {/* CALENDAR */}
            <View style={styles.card}>
              <View style={styles.calNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <ChevronLeft size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.calMonthLabel}>{MONTHS[calMonth]} {calYear}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                  <ChevronRight size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {WEEK_DAYS.map((d) => (
                  <Text key={d} style={styles.weekDay}>{d}</Text>
                ))}
              </View>

              <View style={styles.calGrid}>
                {calDays.map((day, i) => {
                  if (!day) return <View key={`e-${i}`} style={styles.calCell} />;
                  const past = isPast(day);
                  const selected = selectedDay === day;
                  return (
                    <TouchableOpacity
                      key={`d-${day}`}
                      style={[styles.calCell, selected && styles.calCellSelected, past && styles.calCellPast]}
                      onPress={() => { if (!past) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDay(day); setErrors(e => ({ ...e, date: '' })); } }}
                      activeOpacity={past ? 1 : 0.7}
                    >
                      <Text style={[styles.calDay, selected && styles.calDaySelected, past && styles.calDayPast]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
            </View>

            {/* TIME */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Время</Text>
              <View style={styles.timesGrid}>
                {TIME_SLOTS.map((slot) => {
                  const active = selectedTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.timeSlot, active && styles.timeSlotActive]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedTime(slot); setErrors(e => ({ ...e, time: '' })); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.timeText, active && styles.timeTextActive]}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.time ? <Text style={styles.errorText}>{errors.time}</Text> : null}
            </View>

            {/* GUESTS */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Количество гостей</Text>
              <View style={styles.guestsRow}>
                <TouchableOpacity
                  style={styles.guestBtn}
                  onPress={() => { if (guests > 1) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGuests(g => g - 1); } }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.guestBtnText}>−</Text>
                </TouchableOpacity>
                <View style={styles.guestCount}>
                  <Text style={styles.guestCountText}>{guests}</Text>
                  <Text style={styles.guestCountSub}>чел.</Text>
                </View>
                <TouchableOpacity
                  style={styles.guestBtn}
                  onPress={() => { if (guests < 50) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGuests(g => g + 1); } }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.guestBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* FORM */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Ваши данные</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Имя</Text>
                <TextInput
                  style={[styles.input, errors.name ? styles.inputError : null]}
                  placeholder="Как вас зовут?"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={(t) => { setName(t); setErrors(e => ({ ...e, name: '' })); }}
                  autoCorrect={false}
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Телефон</Text>
                <TextInput
                  style={[styles.input, errors.phone ? styles.inputError : null]}
                  placeholder="+7 (___) ___-__-__"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={(t) => { setPhone(formatPhone(t)); setErrors(e => ({ ...e, phone: '' })); }}
                  keyboardType="phone-pad"
                  maxLength={18}
                />
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => { setAgreed(!agreed); setErrors(e => ({ ...e, agreed: '' })); }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                  {agreed && <Check size={12} color={Colors.bg} strokeWidth={3} />}
                </View>
                <Text style={styles.checkLabel}>Согласен(а) на обработку персональных данных</Text>
              </TouchableOpacity>
              {errors.agreed ? <Text style={styles.errorText}>{errors.agreed}</Text> : null}
            </View>

            {errors.submit ? <Text style={styles.errorText}>{errors.submit}</Text> : null}

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} activeOpacity={0.85} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={Colors.bg} />
              ) : (
                <>
                  <CalendarDays size={18} color={Colors.bg} />
                  <Text style={styles.submitText}>Подтвердить бронирование</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

function ConfirmRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={confirmStyles.row}>
      {icon}
      <Text style={confirmStyles.label}>{label}</Text>
      <Text style={confirmStyles.value}>{value}</Text>
    </View>
  );
}

const confirmStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  value: { fontSize: 14, color: Colors.text, fontWeight: '700' as const },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  headerTitle: { fontSize: 32, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.8 },
  headerSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 4 },
  card: {
    backgroundColor: Colors.surface1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellSelected: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
  },
  calCellPast: {
    opacity: 0.3,
  },
  calDay: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  calDaySelected: {
    color: Colors.bg,
    fontWeight: '800' as const,
  },
  calDayPast: {
    color: Colors.textMuted,
  },
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.surface2,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  timeSlotActive: {
    backgroundColor: `${Colors.gold}20`,
    borderColor: Colors.gold,
  },
  timeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  timeTextActive: {
    color: Colors.gold,
  },
  guestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  guestBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  guestBtnText: {
    fontSize: 22,
    color: Colors.gold,
    fontWeight: '300' as const,
    lineHeight: 26,
  },
  guestCount: {
    alignItems: 'center',
    minWidth: 60,
  },
  guestCountText: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  guestCountSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -4,
  },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontWeight: '600' as const,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  inputError: { borderColor: Colors.error },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface2,
  },
  checkboxActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  checkLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },
  errorText: { fontSize: 12, color: Colors.error, marginTop: 6 },
  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  submitText: { fontSize: 16, fontWeight: '700' as const, color: Colors.bg, letterSpacing: 0.3 },

  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successCheck: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  successTitle: { fontSize: 28, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.5, marginBottom: 10 },
  successSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 32 },
  confirmCard: {
    width: '100%',
    backgroundColor: Colors.surface1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  newBookingBtn: {
    backgroundColor: Colors.surface2,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  newBookingText: { fontSize: 15, fontWeight: '600' as const, color: Colors.textSecondary },
});
