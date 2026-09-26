import { createContext, useContext, useEffect, useState } from "react";

import en from "../translations/en";
import hi from "../translations/hi";
import te from "../translations/te";

const LanguageContext = createContext();

const translations = {
  en,
  hi,
  te,
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("policesetu-language") || "en";
  });

  useEffect(() => {
    localStorage.setItem("policesetu-language", language);
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
    }
  };

  const getTranslation = (translationSet, key) => {
    const keys = key.split(".");
    let value = translationSet;

    for (const item of keys) {
      value = value?.[item];
    }

    return value;
  };

  const t = (key) => {
    const currentValue = getTranslation(translations[language], key);

    if (currentValue !== undefined) {
      return currentValue;
    }

    // Fallback to English if a translated key is missing.
    const englishValue = getTranslation(translations.en, key);

    return englishValue !== undefined ? englishValue : key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  return useContext(LanguageContext);
};
