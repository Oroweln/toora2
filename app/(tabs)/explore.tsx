/**
 * Explore Screen — Map overview of all routes in the Benevento area.
 */

import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { getItineraries } from '@/src/data';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '@/src/stores/useLanguageStore';

export default function ExploreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const itineraries = getItineraries();
  const totalHotspots = itineraries.reduce(
    (sum, it) => sum + it.hotspots.length,
    0,
  );
  const totalKm = itineraries.reduce((sum, it) => sum + it.distanceKm, 0);
  const { language, setLanguage } = useLanguageStore();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.lg }]}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>{t('explore.title')}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {t('explore.subtitle')}
          </ThemedText>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="bicycle" size={28} color={Brand.accent} />
            <ThemedText style={styles.statNumber}>{itineraries.length}</ThemedText>
            <ThemedText style={styles.statLabel}>{t('explore.itineraries')}</ThemedText>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="location" size={28} color={Brand.accent} />
            <ThemedText style={styles.statNumber}>{totalHotspots}</ThemedText>
            <ThemedText style={styles.statLabel}>{t('explore.hotspots')}</ThemedText>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="map" size={28} color={Brand.accent} />
            <ThemedText style={styles.statNumber}>
              {Math.round(totalKm)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>{t('explore.totalKm')}</ThemedText>
          </View>
        </View>

        <View style={styles.infoSection}>
          <ThemedText style={styles.infoTitle}>{t('explore.howItWorks')}</ThemedText>
          <View style={styles.infoItem}>
            <Ionicons name="navigate-circle-outline" size={24} color={Brand.accent} />
            <ThemedText style={styles.infoText}>
              {t('explore.step1')}
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="bicycle-outline" size={24} color={Brand.accent} />
            <ThemedText style={styles.infoText}>
              {t('explore.step2')}
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="headset-outline" size={24} color={Brand.accent} />
            <ThemedText style={styles.infoText}>
              {t('explore.step3')}
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="camera-outline" size={24} color={Brand.accent} />
            <ThemedText style={styles.infoText}>
              {t('explore.step4')}
            </ThemedText>
          </View>
        </View>

        <View style={styles.offlineNotice}>
          <Ionicons name="wifi-outline" size={20} color={Brand.gray500} />
          <ThemedText style={styles.offlineText}>
            {t('explore.offlineNotice')}
          </ThemedText>
        </View>

        {/* Language Selector */}
        <View style={styles.languageSection}>
          <ThemedText style={styles.languageTitle}>{t('language.title')}</ThemedText>
          <View style={styles.languageRow}>
            <Pressable
              onPress={() => setLanguage('it')}
              style={[
                styles.languageButton,
                language === 'it' && styles.languageButtonActive,
              ]}
            >
              <ThemedText
                style={[
                  styles.languageButtonText,
                  language === 'it' && styles.languageButtonTextActive,
                ]}
              >
                {t('language.italian')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setLanguage('en')}
              style={[
                styles.languageButton,
                language === 'en' && styles.languageButtonActive,
              ]}
            >
              <ThemedText
                style={[
                  styles.languageButtonText,
                  language === 'en' && styles.languageButtonTextActive,
                ]}
              >
                {t('language.english')}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Info & Legal */}
        <View style={styles.navSection}>
          <ThemedText style={styles.navSectionTitle}>{t('info.sectionTitle')}</ThemedText>
          <View style={styles.navCard}>
            <Pressable
              style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
              onPress={() => router.push('/about')}
            >
              <View style={styles.navIcon}>
                <Ionicons name="information-circle-outline" size={20} color={Brand.accent} />
              </View>
              <ThemedText style={styles.navLabel}>{t('info.about')}</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={Brand.gray400} />
            </Pressable>
            <View style={styles.navDivider} />
            <Pressable
              style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
              onPress={() => router.push('/contact')}
            >
              <View style={styles.navIcon}>
                <Ionicons name="mail-outline" size={20} color={Brand.accent} />
              </View>
              <ThemedText style={styles.navLabel}>{t('info.contact')}</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={Brand.gray400} />
            </Pressable>
            <View style={styles.navDivider} />
            <Pressable
              style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
              onPress={() => router.push('/privacy')}
            >
              <View style={styles.navIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={Brand.accent} />
              </View>
              <ThemedText style={styles.navLabel}>{t('info.privacy')}</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={Brand.gray400} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: Brand.gray500,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Brand.accent + '15',
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Brand.accent,
  },
  statLabel: {
    fontSize: 12,
    color: Brand.gray500,
  },
  infoSection: {
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    color: Brand.gray600,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Brand.gray100,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  offlineText: {
    fontSize: 13,
    color: Brand.gray500,
    flex: 1,
  },
  languageSection: {
    marginBottom: Spacing.lg,
  },
  languageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  languageRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  languageButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Brand.gray300,
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: Brand.accent + '18',
    borderColor: Brand.accent,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Brand.gray600,
  },
  languageButtonTextActive: {
    color: Brand.accent,
    fontWeight: '700',
  },
  navSection: {
    marginBottom: Spacing.md,
  },
  navSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  navCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.gray200,
    backgroundColor: Brand.gray50,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  navRowPressed: {
    backgroundColor: Brand.gray100,
  },
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  navDivider: {
    height: 1,
    backgroundColor: Brand.gray200,
    marginLeft: Spacing.md + 32 + Spacing.sm,
  },
});
