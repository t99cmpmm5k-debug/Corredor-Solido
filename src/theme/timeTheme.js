import { themeManager } from "./themeManager.js";

/**
 * ==========================================================
 * Devuelve el tema según la hora del día
 * ==========================================================
 */

export function getAutomaticTheme(date = new Date()) {

    const hour = date.getHours();

    if (hour >= 6 && hour < 9) {
        return "sunrise";
    }

    if (hour >= 9 && hour < 18) {
        return "day";
    }

    if (hour >= 18 && hour < 21) {
        return "sunset";
    }

    return "night";

}

/**
 * ==========================================================
 * Aplica automáticamente el tema correspondiente
 * ==========================================================
 */

export function applyAutomaticTheme() {

    // Si ya hubo una elección manual (ThemeSwitcher), respétala —
    // si no, sigue el reloj como siempre.
    if (themeManager.hasManualTheme()) {

        return;

    }

    const theme = getAutomaticTheme();

    themeManager.setAutomaticTheme(theme);

}

/**
 * ==========================================================
 * Devuelve el tema actual
 * ==========================================================
 */

export function getCurrentTheme() {

    return themeManager.getTheme();

}

/**
 * ==========================================================
 * Devuelve el ID del tema actual
 * ==========================================================
 */

export function getCurrentThemeId() {

    return themeManager.getThemeId();

}

/**
 * ==========================================================
 * Indica si el tema actual es oscuro
 * ==========================================================
 */

export function isDarkTime() {

    return themeManager.isDark();

}