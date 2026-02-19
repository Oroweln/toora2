import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/constants/theme';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: Brand.gray400,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: Brand.gray200,
        },
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: Brand.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.itineraries'),
          headerTitle: 'TOORA',
          headerTitleStyle: { fontWeight: '700', fontSize: 20, color: Brand.primary },
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
