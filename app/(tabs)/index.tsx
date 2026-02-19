/**
 * Home Screen — Itinerary List
 * Displays all 8 itineraries as cards with cover image, title, stats.
 */

import { FlatList, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Brand, DifficultyColors, Spacing } from '@/constants/theme';
import { getItineraries } from '@/src/data';
import { useVisitStore } from '@/src/stores/useVisitStore';
import type { Itinerary } from '@/src/types';

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const { t } = useTranslation();
  const color = DifficultyColors[difficulty] ?? Brand.gray400;
  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <ThemedText style={[styles.badgeText, { color }]}>
        {t(`difficulty.${difficulty}`, difficulty)}
      </ThemedText>
    </View>
  );
}

function TerrainTags({ terrain }: { terrain: string[] }) {
  const { t } = useTranslation();
  return (
    <View style={styles.terrainRow}>
      {terrain.map((ter) => (
        <View key={ter} style={styles.terrainTag}>
          <ThemedText style={styles.terrainText}>
            {t(`terrain.${ter}`, ter)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function ItineraryCard({
  itinerary,
  onPress,
  isCompleted,
}: {
  itinerary: Itinerary;
  onPress: () => void;
  isCompleted: boolean;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  const hours = Math.floor(itinerary.estimatedDurationMinutes / 60);
  const mins = itinerary.estimatedDurationMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.cardImageContainer}>
        {itinerary.coverImage ? (
          <Image
            source={{ uri: itinerary.coverImage }}
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <ThemedText style={styles.placeholderText}>
              {itinerary.title.charAt(0)}
            </ThemedText>
          </View>
        )}
        {isCompleted && (
          <View style={styles.completedOverlay}>
            <ThemedText style={styles.completedText}>{t('home.completed')}</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <ThemedText style={styles.cardTitle} numberOfLines={1}>
          {itinerary.title}
        </ThemedText>

        <View style={styles.statsRow}>
          <ThemedText style={styles.statText}>
            {itinerary.distanceKm} km
          </ThemedText>
          <ThemedText style={styles.statDivider}>·</ThemedText>
          <ThemedText style={styles.statText}>{durationStr}</ThemedText>
          <ThemedText style={styles.statDivider}>·</ThemedText>
          <ThemedText style={styles.statText}>
            {itinerary.elevationGainM}m {t('units.elev')}
          </ThemedText>
        </View>

        <View style={styles.cardBottom}>
          <DifficultyBadge difficulty={itinerary.difficulty} />
          <TerrainTags terrain={itinerary.terrain} />
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const itineraries = getItineraries();
  const isItineraryCompleted = useVisitStore((s) => s.isItineraryCompleted);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={itineraries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + Spacing.md },
        ]}
        renderItem={({ item }) => (
          <ItineraryCard
            itinerary={item}
            isCompleted={isItineraryCompleted(item.id)}
            onPress={() => router.push(`/itinerary/${item.id}`)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImageContainer: {
    height: 160,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: Brand.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: Brand.accent,
  },
  completedOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Brand.highlight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  completedText: {
    color: Brand.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statText: {
    fontSize: 13,
    color: Brand.gray500,
  },
  statDivider: {
    fontSize: 13,
    color: Brand.gray400,
    marginHorizontal: 6,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  terrainRow: {
    flexDirection: 'row',
    gap: 4,
  },
  terrainTag: {
    backgroundColor: Brand.accent + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  terrainText: {
    fontSize: 11,
    color: Brand.accent,
  },
});
