/**
 * ==========================================================
 * Corredor Sólido
 * Theme System v2
 * ==========================================================
 */

export const THEMES = {

    sunrise: {

        id: "sunrise",
        name: "Amanecer",
        greeting: "Buenos días",
        hero: "hero-sunrise",
        isDark: true,

        colors: {
            primary: "#FF9F43",
            secondary: "#FFC371",
            accent: "#FFE3B3",
            glow: "#FFB86B",
            background: "#07111D"
        },

    overlay: {
    top: "rgba(35,15,0,.18)",
    middle: "rgba(255,170,80,.18)",
    bottom: "rgba(60,30,8,.45)"
},

        card: {
            background: "#12263D",
            border: "#274C74",
            shadow: "rgba(255,159,67,.18)"
        },

        button: {
            background: "#FF9F43",
            text: "#FFFFFF"
        },

        navigation: {
            background: "#091321",
            active: "#FF9F43",
            inactive: "#9AA4B2"
        },

        text: {
            primary: "#FFFFFF",
            secondary: "#B4C7D9"
        }

    },

    day: {

    id: "day",
    name: "Día",
    greeting: "Buenos días",
    hero: "hero-day",
    isDark: true,

    colors: {
        primary: "#1EA7FF",
        secondary: "#6CCFFF",
        accent: "#BEEBFF",
        glow: "#4CC4FF",
        background: "#07111D"
    },

overlay: {
    top: "rgba(0,0,0,.22)",
    middle: "rgba(30,90,170,.16)",
    bottom: "rgba(8,24,50,.42)"
},
    card: {
        background: "#12263D",
        border: "#274C74",
        shadow: "rgba(30,167,255,.15)"
    },

    button: {
        background: "#1EA7FF",
        text: "#FFFFFF"
    },

    navigation: {
        background: "#091321",
        active: "#1EA7FF",
        inactive: "#9AA4B2"
    },

    text: {
        primary: "#FFFFFF",
        secondary: "#B4C7D9"
    }



    },

    sunset: {

        id: "sunset",
        name: "Atardecer",
        greeting: "Buenas tardes",
        hero: "hero-sunset",
        isDark: true,

        colors: {
            primary: "#FF7A3D",
            secondary: "#FFA05E",
            accent: "#FFD0B2",
            glow: "#FF9259",
            background: "#07111D"
        },

        overlay: {
    top: "rgba(40,12,0,.20)",
    middle: "rgba(255,120,40,.22)",
    bottom: "rgba(45,15,0,.55)"
},
        card: {
            background: "#12263D",
            border: "#274C74",
            shadow: "rgba(255,122,61,.16)"
        },

        button: {
            background: "#FF7A3D",
            text: "#FFFFFF"
        },

        navigation: {
            background: "#091321",
            active: "#FF7A3D",
            inactive: "#9AA4B2"
        },

        text: {
            primary: "#FFFFFF",
            secondary: "#B4C7D9"
        }

    },

    night: {

        id: "night",
        name: "Noche",
        greeting: "Buenas noches",
        hero: "hero-night",
        isDark: true,

        colors: {
            primary: "#29B6FF",
            secondary: "#67D6FF",
            accent: "#9AE7FF",
            glow: "#38C4FF",
            background: "#07111D"
        },

       overlay: {
    top: "rgba(0,0,0,.08)",
    middle: "rgba(0,0,0,.22)",
    bottom: "rgba(5,10,22,.88)"
},

        card: {
            background: "#12263D",
            border: "#274C74",
            shadow: "rgba(41,182,255,.18)"
        },

        button: {
            background: "#29B6FF",
            text: "#FFFFFF"
        },

        navigation: {
            background: "#091321",
            active: "#29B6FF",
            inactive: "#64748B"
        },

        text: {
            primary: "#FFFFFF",
            secondary: "#B4C7D9"
        }

    },

    // Tema de CLIMA, no de hora. Fuera de la rotación automática de
    // applyAutomaticTheme() (getAutomaticTheme() solo elige entre
    // sunrise/day/sunset/night) porque hoy no hay ninguna fuente
    // meteorológica conectada — sería inalcanzable en la práctica.
    // Solo seleccionable a mano (ThemeSwitcher). Volverá a la rotación
    // cuando se conecte una API del tiempo.
    rain: {

        id: "rain",
        name: "Lluvia",
        greeting: "Buenos días",
        hero: "hero-rain",
        isDark: true,

        colors: {
            primary: "#6BB9FF",
            secondary: "#9DD7FF",
            accent: "#CFEAFF",
            glow: "#8CCEFF",
            background: "#0A1523"
        },

        overlay: {
    top: "rgba(20,25,35,.18)",
    middle: "rgba(18,40,60,.30)",
    bottom: "rgba(5,15,28,.88)"
},

        card: {
            background: "#15293E",
            border: "#365D87",
            shadow: "rgba(107,185,255,.18)"
        },

        button: {
            background: "#4EA8FF",
            text: "#FFFFFF"
        },

        navigation: {
            background: "#0D1725",
            active: "#6BB9FF",
            inactive: "#64748B"
        },

        text: {
            primary: "#FFFFFF",
            secondary: "#B8C8D8"
        }

    },

    // Tema de CLIMA, no de hora — mismo motivo que "rain": fuera de la
    // rotación automática hasta que haya una fuente meteorológica real.
    winter: {

        id: "winter",
        name: "Invierno",
        greeting: "Buenos días",
        hero: "hero-snow",
        isDark: true,

        colors: {
            primary: "#77C8FF",
            secondary: "#A8E2FF",
            accent: "#E3F7FF",
            glow: "#A8E2FF",
            background: "#07111D"
        },

       overlay: {
    top: "rgba(35,45,60,.14)",
    middle: "rgba(170,210,240,.12)",
    bottom: "rgba(70,95,120,.35)"
},
        card: {
            background: "#12263D",
            border: "#274C74",
            shadow: "rgba(119,200,255,.16)"
        },

        button: {
            background: "#77C8FF",
            text: "#FFFFFF"
        },

        navigation: {
            background: "#091321",
            active: "#77C8FF",
            inactive: "#9AA4B2"
        },

        text: {
            primary: "#FFFFFF",
            secondary: "#B4C7D9"
        }

    }

};

export const DEFAULT_THEME = "night";