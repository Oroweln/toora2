/**
 * Hotspot Content Screen
 * Shows rich multimedia content for an active hotspot: text, gallery, video, audio guide.
 * Content is geo-locked — only accessible within geofence radius.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Dimensions,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio, Video, ResizeMode } from 'expo-av';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing, TouchTarget } from '@/constants/theme';
import { getItinerary } from '@/src/data';
import { useRouteStore } from '@/src/stores/useRouteStore';
import { useLocationStore } from '@/src/stores/useLocationStore';
import { isContentAccessible } from '@/src/services/geofence';
import { openNativeNavigation } from '@/src/services/navigation';
import { haversineDistance } from '@/src/utils/geo';
import { formatDistance } from '@/src/services/routeGuidance';

type ContentTab = 'text' | 'gallery' | 'video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HotspotContentScreen() {
  const { hotspotId, itineraryId } = useLocalSearchParams<{
    hotspotId: string;
    itineraryId: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const itinerary = getItinerary(itineraryId!);
  const hotspot = itinerary?.hotspots.find((h) => h.id === hotspotId);

  const currentLocation = useLocationStore((s) => s.currentLocation);
  const hotspotEntryTimestamps = useRouteStore(
    (s) => s.hotspotEntryTimestamps,
  );
  const visitedHotspotIds = useRouteStore((s) => s.visitedHotspotIds);

  const [activeTab, setActiveTab] = useState<ContentTab>('text');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPosition, setAudioPosition] = useState(0);
  const audioRef = useRef<Audio.Sound | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.unloadAsync();
    };
  }, []);

  if (!itinerary || !hotspot) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Tappa non trovata.</ThemedText>
      </ThemedView>
    );
  }

  // Check geo-lock
  const isAccessible =
    !hotspot.isActive ||
    !currentLocation ||
    isContentAccessible(
      hotspot,
      currentLocation.latitude,
      currentLocation.longitude,
      currentLocation.accuracy,
      hotspotEntryTimestamps[hotspot.id],
    );

  // If not accessible, show locked state
  if (!isAccessible && currentLocation) {
    const dist = haversineDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      hotspot.latitude,
      hotspot.longitude,
    );

    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerTitle: hotspot.title }} />
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color={Brand.gray400} />
          <ThemedText style={styles.lockedTitle}>Contenuto bloccato</ThemedText>
          <ThemedText style={styles.lockedMessage}>
            Devi essere alla tappa per accedere ai contenuti.
          </ThemedText>
          <ThemedText style={styles.lockedDistance}>
            Distanza: {formatDistance(dist)}
          </ThemedText>
          <Pressable
            onPress={() =>
              openNativeNavigation(hotspot.latitude, hotspot.longitude)
            }
            style={styles.navigateButton}
          >
            <Ionicons name="navigate" size={20} color="#fff" />
            <ThemedText style={styles.navigateButtonText}>
              Naviga qui
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Inactive hotspot (waypoint)
  if (!hotspot.isActive || !hotspot.content) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerTitle: hotspot.title }} />
        <View style={styles.waypointContainer}>
          <View style={styles.waypointBadge}>
            <ThemedText style={styles.waypointBadgeText}>Tappa</ThemedText>
          </View>
          <ThemedText style={styles.waypointTitle}>{hotspot.title}</ThemedText>
          <ThemedText style={styles.waypointDesc}>
            {hotspot.shortDescription}
          </ThemedText>
          <Pressable onPress={() => router.back()} style={styles.continueButton}>
            <ThemedText style={styles.continueButtonText}>
              Prosegui verso la prossima tappa
            </ThemedText>
            <Ionicons name="arrow-forward" size={20} color={Brand.primary} />
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const content = hotspot.content;
  const hasVideo = !!content.video;
  const hasGallery = content.gallery.length > 0;
  const totalHotspots = itinerary.hotspots.length;

  const tabs: { key: ContentTab; label: string; icon: string }[] = [
    { key: 'text', label: 'Testo', icon: 'document-text-outline' },
    ...(hasGallery
      ? [{ key: 'gallery' as ContentTab, label: 'Galleria', icon: 'images-outline' }]
      : []),
    ...(hasVideo
      ? [{ key: 'video' as ContentTab, label: 'Video', icon: 'videocam-outline' }]
      : []),
  ];

  // Audio playback
  const toggleAudio = async () => {
    if (!content.audioGuide) return;

    if (audioRef.current) {
      if (isAudioPlaying) {
        await audioRef.current.pauseAsync();
        setIsAudioPlaying(false);
      } else {
        await audioRef.current.playAsync();
        setIsAudioPlaying(true);
      }
    } else {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: content.audioGuide },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setAudioPosition(status.positionMillis);
              setAudioDuration(status.durationMillis ?? 0);
              if (status.didJustFinish) {
                setIsAudioPlaying(false);
              }
            }
          },
        );
        audioRef.current = sound;
        setIsAudioPlaying(true);
      } catch (e) {
        console.warn('Failed to load audio:', e);
      }
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerTitle: hotspot.title }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + (content.audioGuide ? 80 : 20) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        {content.heroImage && (
          <Image
            source={{ uri: content.heroImage }}
            style={styles.heroImage}
            contentFit="cover"
          />
        )}

        <View style={styles.contentPadding}>
          {/* Title + Subtitle */}
          <ThemedText style={styles.title}>{hotspot.title}</ThemedText>
          <ThemedText style={styles.subtitle}>
            Tappa {hotspot.sequence} di {totalHotspots} · {itinerary.title}
          </ThemedText>

          {/* Tab Bar */}
          {tabs.length > 1 && (
            <View style={styles.tabBar}>
              {tabs.map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[
                    styles.tab,
                    activeTab === tab.key && styles.tabActive,
                  ]}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={18}
                    color={activeTab === tab.key ? Brand.primary : Brand.gray500}
                  />
                  <ThemedText
                    style={[
                      styles.tabText,
                      activeTab === tab.key && styles.tabTextActive,
                    ]}
                  >
                    {tab.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}

          {/* Text Tab */}
          {activeTab === 'text' && (
            <View style={styles.textContent}>
              <ThemedText style={styles.bodyText}>
                {hotspot.shortDescription}
              </ThemedText>
              {/* Placeholder for markdown content */}
              <ThemedText style={styles.bodyText}>
                {`Questo è il contenuto dettagliato della tappa "${hotspot.title}". `}
                {`In questa posizione potrai scoprire la storia e le curiosità di questo luogo attraverso testi, immagini e contenuti multimediali.`}
              </ThemedText>
            </View>
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && hasGallery && (
            <FlatList
              data={content.gallery}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={styles.galleryImage}
                  contentFit="cover"
                />
              )}
              style={styles.galleryList}
            />
          )}

          {/* Video Tab */}
          {activeTab === 'video' && hasVideo && (
            <View style={styles.videoContainer}>
              <Video
                source={{ uri: content.video! }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Audio Player */}
      {content.audioGuide && (
        <View
          style={[styles.audioPlayer, { paddingBottom: insets.bottom + Spacing.sm }]}
        >
          <Ionicons name="headset" size={20} color={Brand.primary} />
          <ThemedText style={styles.audioLabel}>Audio Guide</ThemedText>
          <Pressable
            onPress={toggleAudio}
            style={styles.audioPlayButton}
            hitSlop={8}
          >
            <Ionicons
              name={isAudioPlaying ? 'pause' : 'play'}
              size={24}
              color={Brand.primary}
            />
          </Pressable>
          <View style={styles.audioProgress}>
            <View style={styles.audioBar}>
              <View
                style={[
                  styles.audioBarFill,
                  {
                    width: audioDuration
                      ? `${(audioPosition / audioDuration) * 100}%`
                      : '0%',
                  },
                ]}
              />
            </View>
            <ThemedText style={styles.audioTime}>
              {formatTime(audioPosition)} / {formatTime(audioDuration)}
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  contentPadding: {
    padding: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Brand.gray500,
    marginBottom: Spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
    marginBottom: Spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Brand.primary,
  },
  tabText: {
    fontSize: 14,
    color: Brand.gray500,
  },
  tabTextActive: {
    color: Brand.primary,
    fontWeight: '600',
  },
  textContent: {
    gap: Spacing.md,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: Brand.gray700,
  },
  galleryList: {
    marginHorizontal: -Spacing.md,
  },
  galleryImage: {
    width: SCREEN_WIDTH - Spacing.md * 2,
    height: 250,
    marginHorizontal: Spacing.md,
    borderRadius: 10,
  },
  videoContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: 220,
  },
  // Locked state
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  lockedMessage: {
    fontSize: 15,
    color: Brand.gray500,
    textAlign: 'center',
  },
  lockedDistance: {
    fontSize: 16,
    fontWeight: '600',
    color: Brand.primary,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    minHeight: TouchTarget.minSize,
    marginTop: Spacing.md,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Waypoint (inactive hotspot)
  waypointContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  waypointBadge: {
    backgroundColor: Brand.gray200,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  waypointBadgeText: {
    fontSize: 13,
    color: Brand.gray600,
    fontWeight: '500',
  },
  waypointTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  waypointDesc: {
    fontSize: 15,
    color: Brand.gray500,
    textAlign: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  continueButtonText: {
    fontSize: 16,
    color: Brand.primary,
    fontWeight: '600',
  },
  // Audio Player
  audioPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Brand.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  audioLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.gray600,
  },
  audioPlayButton: {
    minWidth: TouchTarget.minSize,
    minHeight: TouchTarget.minSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioProgress: {
    flex: 1,
    gap: 2,
  },
  audioBar: {
    height: 4,
    backgroundColor: Brand.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioBarFill: {
    height: '100%',
    backgroundColor: Brand.primary,
  },
  audioTime: {
    fontSize: 11,
    color: Brand.gray500,
  },
});
