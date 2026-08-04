/**
 * ==========================================================
 * Hero Data
 * Corredor Sólido
 * ==========================================================
 */

export const heroData = {

    recovery: {

        title: [
            "Recupera",
            "más fuerte"
        ],

        coachTitle: "Recuperación activa",

        coachMessages: [
            "Hoy no se trata de correr más.",
            "Se trata de llegar mejor al siguiente entrenamiento."
        ]

    },

    z2: {

        title: [
            "Construye",
            "tu base"
        ],

        coachTitle: "Rodaje en Zona 2",

        coachMessages: [
            "Corre con paciencia.",
            "Cada kilómetro en Z2 te hace un corredor más sólido."
        ]

    },

    tempo: {

        title: [
            "Mantén",
            "el ritmo"
        ],

        coachTitle: "Entrenamiento Tempo",

        coachMessages: [
            "Controla el esfuerzo.",
            "La constancia es más importante que la velocidad."
        ]

    },

    intervals: {

        title: [
            "Hoy toca",
            "VOLAR"
        ],

        coachTitle: "Entrenamiento de series",

        coachMessages: [
            "Cada repetición cuenta.",
            "La calidad vale más que la cantidad."
        ]

    },

    longRun: {

        title: [
            "Resistencia",
            "mental"
        ],

        coachTitle: "Tirada larga",

        coachMessages: [
            "Empieza despacio.",
            "Las grandes carreras se construyen kilómetro a kilómetro."
        ]

    },

    race: {

        title: [
            "Es",
            "tu día"
        ],

        coachTitle: "Día de competición",

        coachMessages: [
            "Confía en todo lo que has entrenado.",
            "Disfruta de cada metro."
        ]

    },

    // TODO: copy pendiente de revisar
    strength: {

        title: [
            "Construye",
            "fuerza"
        ],

        coachTitle: "Entrenamiento de fuerza",

        coachMessages: [
            "La fuerza también te hace más rápido.",
            "Cuida la técnica antes que la carga."
        ]

    },

    // TODO: copy pendiente de revisar
    free: {

        title: [
            "Día",
            "libre"
        ],

        coachTitle: "Día libre",

        coachMessages: [
            "Descansar también es entrenar.",
            "Disfruta del día sin presión."
        ]

    },

    generic: {

        title: [
            "A entrenar",
            "hoy toca"
        ],

        coachTitle: "Tu entrenamiento",

        coachMessages: [
            "Sigue tu plan y confía en el proceso.",
            "Cada sesión suma."
        ]

    }

};

/**
 * ==========================================================
 * Devuelve el contenido del Hero
 * ==========================================================
 */

export function getHeroData(type) {

    return heroData[type] ?? heroData.generic;

}