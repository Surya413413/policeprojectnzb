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

  const t = (key) => {
    const keys = key.split(".");

    let value = translations[language];

    for (const item of keys) {
      value = value?.[item];
    }

    if (value !== undefined) {
      return value;
    }

    // Fallback to English
    value = translations.en;

    for (const item of keys) {
      value = value?.[item];
    }

    return value || key;
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
