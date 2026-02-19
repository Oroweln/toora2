import { ScrollView, StyleSheet, View, Linking, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { privacyContent, type PolicyBlock } from '@/src/content/privacy';

function renderBlock(block: PolicyBlock, index: number) {
  switch (block.type) {
    case 'h2':
      return (
        <View key={index} style={styles.h2Row}>
          <ThemedText style={styles.h2}>{block.text}</ThemedText>
          <View style={styles.divider} />
        </View>
      );
    case 'h3':
      return (
        <ThemedText key={index} style={styles.h3}>
          {block.text}
        </ThemedText>
      );
    case 'p':
      return renderParagraph(block.text, index);
    case 'bullets':
      return (
        <View key={index} style={styles.bulletList}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <ThemedText style={styles.bulletMark}>•</ThemedText>
              <ThemedText style={styles.bulletText}>{item}</ThemedText>
            </View>
          ))}
        </View>
      );
  }
}

// Render paragraph text — make email addresses tappable
function renderParagraph(text: string, key: number) {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = emailRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const email = match[0];
    parts.push(
      <Pressable key={`email-${match.index}`} onPress={() => Linking.openURL(`mailto:${email}`)}>
        <ThemedText style={styles.link}>{email}</ThemedText>
      </Pressable>,
    );
    lastIndex = match.index + email.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <ThemedText key={key} style={styles.paragraph}>
      {parts}
    </ThemedText>
  );
}

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language } = useLanguageStore();
  const blocks = privacyContent[language === 'en' ? 'en' : 'it'];

  return (
    <>
      <Stack.Screen options={{ title: t('info.privacy'), headerShown: true }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={28} color={Brand.accent} />
          </View>
          <ThemedText style={styles.title}>Privacy Policy</ThemedText>
          <ThemedText style={styles.subtitle}>TOORA.APP</ThemedText>
        </View>

        {/* Content blocks */}
        <View style={styles.blocksContainer}>
          {blocks.map((block, i) => renderBlock(block, i))}
        </View>
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
    gap: 0,
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
    gap: Spacing.xs,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Brand.gray900,
  },
  subtitle: {
    fontSize: 14,
    color: Brand.gray500,
  },
  blocksContainer: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  h2Row: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.gray900,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.gray200,
  },
  h3: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.accent,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: Brand.gray700,
  },
  link: {
    fontSize: 14,
    lineHeight: 22,
    color: Brand.accent,
    textDecorationLine: 'underline',
  },
  bulletList: {
    gap: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  bulletMark: {
    fontSize: 14,
    color: Brand.accent,
    lineHeight: 22,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 22,
    color: Brand.gray700,
    flex: 1,
  },
});
