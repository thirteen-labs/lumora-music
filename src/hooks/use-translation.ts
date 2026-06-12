import { useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { translations, type TranslationKey } from '@/i18n/translations';

type TranslationParams = Record<string, string | number>;

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);

  const currentTranslations = useMemo(() => {
    return translations[language] ?? translations.en;
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => {
      let value: string | undefined;

      if (language !== 'en') {
        value = currentTranslations[key] as string | undefined;
      }

      if (value == null) {
        value = translations.en[key] as string | undefined;
      }

      if (value == null) {
        return key;
      }

      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        }
      }

      return value;
    },
    [language, currentTranslations],
  );

  return { t, language };
}
