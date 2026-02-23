import { Brand } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand.highlight,
        tabBarInactiveTintColor: Brand.white,
        tabBarStyle: {
          backgroundColor: '#0f344e',
          borderTopColor: Brand.highlight,
        },
        headerStyle: {
          backgroundColor: '#0f344e',
        },
        headerTintColor: Brand.highlight,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.itineraries'),
          headerTitle: 'TOORA',
          headerTitleStyle: { fontWeight: '700', fontSize: 20, color: Brand.highlight },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          headerTitle: t('tabs.explore'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
