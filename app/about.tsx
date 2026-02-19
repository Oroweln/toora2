import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { landingContent } from '@/src/content/landing';

export default function AboutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language } = useLanguageStore();
  const content = landingContent[language === 'en' ? 'en' : 'it'];

  return (
    <>
      <Stack.Screen options={{ title: t('info.about'), headerShown: true }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <ThemedText style={styles.heroTitle}>{content.title}</ThemedText>
          <ThemedText style={styles.heroTagline}>{content.tagline}</ThemedText>
        </View>

        {/* Intro */}
        <View style={styles.section}>
          <ThemedText style={styles.body}>{content.intro}</ThemedText>
        </View>

        {/* Sections */}
        {content.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            {section.heading && (
              <ThemedText style={styles.sectionHeading}>{section.heading}</ThemedText>
            )}
            {section.paragraphs.map((p, j) => (
              <ThemedText key={j} style={styles.body}>
                {p}
              </ThemedText>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <View style={styles.bulletList}>
                {section.bullets.map((bullet, k) => (
                  <View key={k} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <ThemedText style={styles.body}>
                      <ThemedText style={styles.bulletLabel}>{bullet.label}: </ThemedText>
                      {bullet.text}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* CTA */}
        <View style={styles.ctaBox}>
          <ThemedText style={styles.ctaText}>{content.cta}</ThemedText>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    gap: 0,
  },
  hero: {
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  heroTagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.accent,
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: Brand.gray700,
  },
  bulletList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Brand.highlight,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletLabel: {
    fontWeight: '700',
    color: Brand.gray800,
  },
  ctaBox: {
    margin: Spacing.lg,
    marginTop: Spacing.xl,
    backgroundColor: Brand.accent + '12',
    borderLeftWidth: 4,
    borderLeftColor: Brand.accent,
    borderRadius: 8,
    padding: Spacing.md,
  },
  ctaText: {
    fontSize: 15,
    lineHeight: 24,
    color: Brand.gray700,
    fontStyle: 'italic',
  },
});
