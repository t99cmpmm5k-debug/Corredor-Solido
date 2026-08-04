import { THEMES, DEFAULT_THEME } from "./themes.js";

const STORAGE_KEY = "corredor-solido-theme";

class ThemeManager {

    constructor() {

        this.currentTheme = DEFAULT_THEME;

        this.load();

    }

    // ==========================
    // GETTERS
    // ==========================

    getTheme() {

        return THEMES[this.currentTheme];

    }

    getThemeId() {

        return this.currentTheme;

    }

    isDark() {

        return this.getTheme().isDark;

    }

    // ==========================
    // CAMBIO DE TEMA
    // ==========================

    setTheme(themeId) {

        if (!THEMES[themeId]) {

            console.warn(`Theme "${themeId}" no existe.`);

            return;

        }

        if (themeId === this.currentTheme) {

            return;

        }

        this.currentTheme = themeId;

        localStorage.setItem(STORAGE_KEY, themeId);

        this.apply();

        this.notify();

    }

    refresh() {

        this.apply();

        this.notify();

    }

    // ==========================
    // LOCAL STORAGE
    // ==========================

    load() {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved && THEMES[saved]) {

            this.currentTheme = saved;

        }

        this.apply();

        this.notify();

    }

    // ==========================
    // EVENTOS
    // ==========================

    notify() {

        window.dispatchEvent(

            new CustomEvent("themeChanged", {

                detail: this.getTheme()

            })

        );

    }

    onChange(callback) {

        const listener = (event) => callback(event.detail);

        window.addEventListener("themeChanged", listener);

        return () => {

            window.removeEventListener("themeChanged", listener);

        };

    }

    // ==========================
    // CSS VARIABLES
    // ==========================

    apply() {

        const theme = this.getTheme();

        const root = document.documentElement;

        // ========= COLORES =========

        root.style.setProperty("--color-primary", theme.colors.primary);
        root.style.setProperty("--color-secondary", theme.colors.secondary);
        root.style.setProperty("--color-accent", theme.colors.accent);
        root.style.setProperty("--color-glow", theme.colors.glow);
        root.style.setProperty("--color-background", theme.colors.background);

        // ========= HERO OVERLAY =========

        root.style.setProperty("--hero-overlay-top", theme.overlay.top);
        root.style.setProperty("--hero-overlay-middle", theme.overlay.middle);
        root.style.setProperty("--hero-overlay-bottom", theme.overlay.bottom);

        // ========= TARJETAS =========

        root.style.setProperty("--card-background", theme.card.background);
        root.style.setProperty("--card-border", theme.card.border);
        root.style.setProperty("--card-shadow", theme.card.shadow);

        // ========= BOTONES =========

        root.style.setProperty("--button-background", theme.button.background);
        root.style.setProperty("--button-text", theme.button.text);

        // ========= NAVEGACIÓN =========

        root.style.setProperty("--navigation-background", theme.navigation.background);
        root.style.setProperty("--navigation-active", theme.navigation.active);
        root.style.setProperty("--navigation-inactive", theme.navigation.inactive);

        // ========= TEXTO =========

        root.style.setProperty("--text-primary", theme.text.primary);
        root.style.setProperty("--text-secondary", theme.text.secondary);

        // ========= DATASET =========

        root.dataset.theme = theme.id;

    }

}

export const themeManager = new ThemeManager();

/**
 * Compatibilidad con el main.js actual
 */
export function applyTheme() {

    themeManager.refresh();

}