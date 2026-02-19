import { ScrollView, StyleSheet, View, Linking, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useLanguageStore } from '@/src/stores/useLanguageStore';

const contactData = {
  company: 'ROTOLANDO VERSO SUD s.r.l.',
  address: 'Via Perasso, 7',
  city: { it: '82100 Benevento – Italia', en: '82100 Benevento – Italy' },
  phone: '+39 0824 29499',
  phoneTel: 'tel:+390824294990',
  fax: '+39 0824 274690',
  website: 'rotolandoversosud.it',
  websiteUrl: 'https://rotolandoversosud.it',
  email: 'info@rotolandoversosud.it',
  cta: {
    it: 'Per informazioni, supporto o collaborazioni, non esitare a contattarci.',
    en: 'For information, support, or partnership inquiries, please feel free to contact us.',
  },
  labels: {
    phone: { it: 'Telefono', en: 'Phone' },
    fax: { it: 'Fax', en: 'Fax' },
    website: { it: 'Sito web', en: 'Website' },
    email: { it: 'Email', en: 'Email' },
  },
};

function ContactRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}>
        <Ionicons name={icon as never} size={20} color={Brand.accent} />
      </View>
      <View style={styles.contactInfo}>
        <ThemedText style={styles.contactLabel}>{label}</ThemedText>
        <ThemedText style={[styles.contactValue, onPress && styles.contactValueLink]}>
          {value}
        </ThemedText>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={Brand.gray400} />}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export default function ContactScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language } = useLanguageStore();
  const lang = language === 'en' ? 'en' : 'it';

  return (
    <>
      <Stack.Screen options={{ title: t('info.contact'), headerShown: true }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/contacts_images/rotolando-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        {/* Company info */}
        <View style={styles.card}>
          <View style={styles.companyHeader}>
            <Ionicons name="business-outline" size={20} color={Brand.accent} />
            <ThemedText style={styles.companyName}>{contactData.company}</ThemedText>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={Brand.gray400} />
            <ThemedText style={styles.addressText}>
              {contactData.address}{'\n'}{contactData.city[lang]}
            </ThemedText>
          </View>
        </View>

        {/* Contact items */}
        <View style={styles.card}>
          <ContactRow
            icon="call-outline"
            label={contactData.labels.phone[lang]}
            value={contactData.phone}
            onPress={() => Linking.openURL(contactData.phoneTel)}
          />
          <View style={styles.separator} />
          <ContactRow
            icon="print-outline"
            label={contactData.labels.fax[lang]}
            value={contactData.fax}
          />
          <View style={styles.separator} />
          <ContactRow
            icon="globe-outline"
            label={contactData.labels.website[lang]}
            value={contactData.website}
            onPress={() => Linking.openURL(contactData.websiteUrl)}
          />
          <View style={styles.separator} />
          <ContactRow
            icon="mail-outline"
            label={contactData.labels.email[lang]}
            value={contactData.email}
            onPress={() => Linking.openURL(`mailto:${contactData.email}`)}
          />
        </View>

        {/* CTA */}
        <ThemedText style={styles.cta}>{contactData.cta[lang]}</ThemedText>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  logoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  logo: {
    width: 200,
    height: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.gray200,
    overflow: 'hidden',
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.gray900,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.gray600,
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    fontSize: 12,
    color: Brand.gray500,
    fontWeight: '500',
  },
  contactValue: {
    fontSize: 14,
    color: Brand.gray800,
    fontWeight: '500',
  },
  contactValueLink: {
    color: Brand.accent,
  },
  separator: {
    height: 1,
    backgroundColor: Brand.gray100,
    marginLeft: Spacing.md + 36 + Spacing.md,
  },
  cta: {
    fontSize: 14,
    lineHeight: 22,
    color: Brand.gray600,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
});
