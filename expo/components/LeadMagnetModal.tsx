import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { X, Gift, Copy, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { apiFetch } from '@/lib/api';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function generatePromoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BAR-';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function LeadMagnetModal({ visible, onClose }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; agreed?: string }>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const promoScale = useRef(new Animated.Value(0.7)).current;
  const promoOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setSubmitted(false);
      setName('');
      setPhone('');
      setAgreed(false);
      setPromoCode('');
      setCopied(false);
      setErrors({});
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 60, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (submitted) {
      Animated.parallel([
        Animated.spring(promoScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(promoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          ])
        ).start();
      });
    }
  }, [submitted]);

  const validate = () => {
    const e: { name?: string; phone?: string; agreed?: string } = {};
    if (!name.trim()) e.name = 'Введите имя';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) e.phone = 'Введите корректный номер';
    if (!agreed) e.agreed = 'Необходимо согласие';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let finalCode = generatePromoCode();

    // Save to backend via Cloudflare Worker — use backend-generated code
    try {
      const data = await apiFetch<{ promoCode?: string }>('/api/promo/claim', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), phone }),
      });
      if (data.promoCode) finalCode = data.promoCode;
    } catch (err) {
      console.error('[LeadMagnet] Backend save failed:', err);
    }

    setPromoCode(finalCode);
    promoScale.setValue(0.7);
    promoOpacity.setValue(0);
    pulseAnim.setValue(1);
    setSubmitted(true);
  };

  const handleCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '');
    let formatted = '';
    if (digits.length > 0) formatted += '+' + digits.slice(0, 1);
    if (digits.length > 1) formatted += ' (' + digits.slice(1, 4);
    if (digits.length > 4) formatted += ') ' + digits.slice(4, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
    if (digits.length > 9) formatted += '-' + digits.slice(9, 11);
    return formatted;
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <X size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          {!submitted ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.giftRow}>
                <View style={styles.giftIconWrap}>
                  <Gift size={28} color={Colors.gold} />
                </View>
              </View>
              <Text style={styles.title}>Десерт в подарок</Text>
              <Text style={styles.subtitle}>
                Оставьте имя и телефон — получите уникальный промокод на бесплатный десерт при первом визите
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Ваше имя</Text>
                <TextInput
                  style={[styles.input, errors.name ? styles.inputError : null]}
                  placeholder="Как вас зовут?"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }}
                  autoCorrect={false}
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Телефон</Text>
                <TextInput
                  style={[styles.input, errors.phone ? styles.inputError : null]}
                  placeholder="+7 (___) ___-__-__"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={(t) => { setPhone(formatPhone(t)); setErrors((e) => ({ ...e, phone: undefined })); }}
                  keyboardType="phone-pad"
                  maxLength={18}
                />
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => { setAgreed(!agreed); setErrors((e) => ({ ...e, agreed: undefined })); }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                  {agreed && <Check size={12} color={Colors.bg} strokeWidth={3} />}
                </View>
                <Text style={styles.checkLabel}>
                  Согласен(а) на обработку персональных данных
                </Text>
              </TouchableOpacity>
              {errors.agreed ? <Text style={[styles.errorText, { marginTop: -8, marginBottom: 8 }]}>{errors.agreed}</Text> : null}

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={styles.submitText}>Получить промокод</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.successContainer}>
              <View style={styles.giftIconWrap}>
                <Gift size={32} color={Colors.gold} />
              </View>
              <Text style={styles.successTitle}>Ваш промокод готов!</Text>
              <Text style={styles.successSubtitle}>Покажите код официанту при визите</Text>

              <Animated.View style={[styles.promoBox, { transform: [{ scale: Animated.multiply(promoScale, pulseAnim) }], opacity: promoOpacity }]}>
                <Text style={styles.promoCode}>{promoCode}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
                  {copied ? <Check size={16} color={Colors.success} /> : <Copy size={16} color={Colors.gold} />}
                </TouchableOpacity>
              </Animated.View>

              {copied && <Text style={styles.copiedText}>Скопировано!</Text>}

              <Text style={styles.promoNote}>
                Действителен при первом визите. Один промокод на гостя.
              </Text>

              <TouchableOpacity style={styles.closeSuccessBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.closeSuccessText}>Отлично, буду!</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    backgroundColor: Colors.surface1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  giftIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.gold}18`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${Colors.gold}35`,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  field: {
    marginBottom: 16,
  },
  label: {
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
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 5,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
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
  checkboxActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  checkLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.bg,
    letterSpacing: 0.3,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 32,
  },
  promoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 20,
    gap: 16,
    marginBottom: 12,
  },
  promoCode: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.gold,
    letterSpacing: 4,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedText: {
    fontSize: 13,
    color: Colors.success,
    marginBottom: 8,
  },
  promoNote: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  closeSuccessBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  closeSuccessText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.bg,
    letterSpacing: 0.3,
  },
});
