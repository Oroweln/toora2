/**
 * Route Complete Screen
 * Shown after completing all active hotspots on a route.
 */

import { StyleSheet, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing, TouchTarget } from '@/constants/theme';
import { getItinerary } from '@/src/data';
import { useRouteStore } from '@/src/stores/useRouteStore';
import { useVisitStore } from '@/src/stores/useVisitStore';

export default function RouteCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const itinerary = getItinerary(id!);
  const { visitedHotspotIds, startedAt, exitRoute } = useRouteStore();
  const markItineraryCompleted = useVisitStore((s) => s.markItineraryCompleted);
  const setActiveRoute = useVisitStore((s) => s.setActiveRoute);

  if (!itinerary) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('complete.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  // Calculate stats
  const elapsedMs = startedAt ? Date.now() - startedAt : 0;
  const elapsedMinutes = Math.round(elapsedMs / 60000);
  const hours = Math.floor(elapsedMinutes / 60);
  const mins = elapsedMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const visitedCount = visitedHotspotIds.size;
  const totalCount = itinerary.hotspots.length;
  const activeCount = itinerary.hotspots.filter((h) => h.isActive).length;

  const handleGoHome = async () => {
    await markItineraryCompleted(itinerary.id);
    await setActiveRoute(null);
    exitRoute();
    router.replace('/');
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      {/* Success Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="trophy" size={64} color={Brand.accent} />
        </View>
      </View>

      {/* Congratulations */}
      <ThemedText style={styles.title}>{t('complete.congratulations')}</ThemedText>
      <ThemedText style={styles.subtitle}>
        {t('complete.routeCompleted')}
      </ThemedText>
      <ThemedText style={styles.routeName}>{itinerary.title}</ThemedText>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="time-outline" size={24} color={Brand.primary} />
          <ThemedText style={styles.statValue}>{timeStr}</ThemedText>
          <ThemedText style={styles.statLabel}>{t('complete.timeSpent')}</ThemedText>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="location-outline" size={24} color={Brand.accent} />
          <ThemedText style={styles.statValue}>
            {visitedCount}/{totalCount}
          </ThemedText>
          <ThemedText style={styles.statLabel}>{t('complete.stopsVisited')}</ThemedText>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="resize-outline" size={24} color={Brand.success} />
          <ThemedText style={styles.statValue}>
            {itinerary.distanceKm} km
          </ThemedText>
          <ThemedText style={styles.statLabel}>{t('complete.distance')}</ThemedText>
        </View>
      </View>

      {/* Message */}
      <ThemedText style={styles.message}>
        {t('complete.summary', { count: activeCount })}
      </ThemedText>

      {/* Back to Home */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          onPress={handleGoHome}
          style={({ pressed }) => [
            styles.homeButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="home-outline" size={22} color="#fff" />
          <ThemedText style={styles.homeButtonText}>
            {t('complete.goHome')}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Brand.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: Brand.gray500,
  },
  routeName: {
    fontSize: 20,
    fontWeight: '600',
    color: Brand.primary,
    marginBottom: Spacing.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: Brand.gray50,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: Brand.gray500,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: Brand.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  bottomArea: {
    width: '100%',
    marginTop: 'auto',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Brand.primary,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    minHeight: TouchTarget.minSize,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
