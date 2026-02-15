import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/src/i18n';

const STORAGE_KEY = 'app_language';

interface LanguageState {
  language: string;
  setLanguage: (lng: string) => Promise<void>;
  loadLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'it',

  setLanguage: async (lng: string) => {
    i18n.changeLanguage(lng);
    set({ language: lng });
    await AsyncStorage.setItem(STORAGE_KEY, lng);
  },

  loadLanguage: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && (stored === 'it' || stored === 'en')) {
        i18n.changeLanguage(stored);
        set({ language: stored });
      }
    } catch (e) {
      console.warn('Failed to load language preference:', e);
    }
  },
}));
