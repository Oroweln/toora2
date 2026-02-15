/**
 * Explore Screen — Map overview of all routes in the Benevento area.
 */

import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { getItineraries } from '@/src/data';
import { Ionicons } from '@expo/vector-icons';

export default function ExploreScreen() {
  const itineraries = getItineraries();
  const totalHotspots = itineraries.reduce(
    (sum, it) => sum + it.hotspots.length,
    0,
  );
  const totalKm = itineraries.reduce((sum, it) => sum + it.distanceKm, 0);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Campania Interna</ThemedText>
        <ThemedText style={styles.subtitle}>
          Itinerari cicloturistici nel cuore del Sannio
        </ThemedText>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Ionicons name="bicycle" size={28} color={Brand.primary} />
          <ThemedText style={styles.statNumber}>{itineraries.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Itinerari</ThemedText>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="location" size={28} color={Brand.accent} />
          <ThemedText style={styles.statNumber}>{totalHotspots}</ThemedText>
          <ThemedText style={styles.statLabel}>Tappe</ThemedText>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="map" size={28} color={Brand.success} />
          <ThemedText style={styles.statNumber}>
            {Math.round(totalKm)}
          </ThemedText>
          <ThemedText style={styles.statLabel}>km totali</ThemedText>
        </View>
      </View>

      <View style={styles.infoSection}>
        <ThemedText style={styles.infoTitle}>Come funziona</ThemedText>
        <View style={styles.infoItem}>
          <Ionicons name="navigate-circle-outline" size={24} color={Brand.primary} />
          <ThemedText style={styles.infoText}>
            Scegli un itinerario e raggiungi il punto di partenza
          </ThemedText>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="bicycle-outline" size={24} color={Brand.primary} />
          <ThemedText style={styles.infoText}>
            Segui il percorso sulla mappa — funziona offline
          </ThemedText>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="headset-outline" size={24} color={Brand.primary} />
          <ThemedText style={styles.infoText}>
            I contenuti si sbloccano automaticamente alle tappe
          </ThemedText>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="camera-outline" size={24} color={Brand.primary} />
          <ThemedText style={styles.infoText}>
            Scopri testi, immagini, audio e video sui luoghi
          </ThemedText>
        </View>
      </View>

      <View style={styles.offlineNotice}>
        <Ionicons name="wifi-outline" size={20} color={Brand.gray500} />
        <ThemedText style={styles.offlineText}>
          L'app funziona completamente offline. Serve solo il segnale GPS.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: Brand.primary + '10',
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Brand.primary,
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
  },
  offlineText: {
    fontSize: 13,
    color: Brand.gray500,
    flex: 1,
  },
});
