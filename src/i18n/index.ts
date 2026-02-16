import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import it from './locales/it';
import en from './locales/en';

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: 'it', // default language
  fallbackLng: 'it',
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
