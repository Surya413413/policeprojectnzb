import { FaMoon, FaSun } from "react-icons/fa";

import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

const AppSettings = () => {
  const { language, changeLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-settings">
      {/* Language */}
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        aria-label={t("language.selectLanguage")}
      >
        <option value="en">🇬🇧 English</option>
        <option value="hi">🇮🇳 हिन्दी</option>
        <option value="te">🇮🇳 తెలుగు</option>
      </select>

      {/* Theme */}
      <button
        type="button"
        onClick={toggleTheme}
        className="theme-toggle"
        title={theme === "light" ? t("theme.darkMode") : t("theme.lightMode")}
      >
        {theme === "light" ? <FaMoon aria-hidden="true" /> : <FaSun aria-hidden="true" />}
      </button>
    </div>
  );
};

export default AppSettings;
