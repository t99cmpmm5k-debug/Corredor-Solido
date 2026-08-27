import { describe, it, expect } from "vitest";
import { parse } from "./parser-statistics.js";

// Texto real de una captura de la pantalla Estadísticas de Garmin Connect
// (proporcionado por el usuario 2026-08-27) -- el bloque TRAINING EFFECT
// vive DENTRO de esta misma pantalla, no en una aparte. "Aeróbica"/
// "Anaeróbico" aparecen dos veces (una en "Beneficio principal Base
// (Aeróbica baja)", otra en la fila con el número real) -- caso real que
// prueba que findNumber()/U.around() coge el número, no la etiqueta.
const REAL_STATISTICS_CAPTURE = `
STAMINA                                    AYUDA
Potencial inicial          100%
Potencial final             60%
Stamina mín.                60%

TRAINING EFFECT                            AYUDA
Beneficio principal    Base (Aeróbica
                        baja)
Aeróbica                    3,6
Anaeróbico                  0,0
Carga de ejercicio          117            AYUDA

POTENCIA                                   AYUDA
Potencia media               330 W
Potencia máxima               496 W
Datos viento              Activado

DINÁMICA DE CARRERA                        AYUDA
Cadencia media de carrera    173 ppm
Cadencia máx. de carrera     183 ppm
Longitud media de zancada    0,99 m
Ratio vertical media          8,4%
Oscilación vertical media    8,3 cm
Tiempo medio cont. suelo     263 ms
`;

describe("parser-statistics — Training Effect real dentro de la pantalla Estadísticas", () => {

    it("extrae aeróbica/anaeróbico/carga reales, sin confundirlos con la etiqueta 'Beneficio principal'", () => {

        const { fields } = parse(REAL_STATISTICS_CAPTURE);

        expect(fields.training_effect_aerobic.value).toBe(3.6);
        expect(fields.training_effect_anaerobic.value).toBe(0);
        expect(fields.exercise_load.value).toBe(117);

    });

    it("también sigue extrayendo la cadencia real de la misma captura (Dinámica de carrera)", () => {

        const { fields } = parse(REAL_STATISTICS_CAPTURE);

        expect(fields.cadence_spm.value).toBe(173);
        expect(fields.max_cadence_spm.value).toBe(183);

    });

    it("sin el bloque Training Effect en el texto, los 3 campos quedan en null", () => {

        const { fields } = parse("Estadísticas\nFrecuencia cardiaca media\n140 ppm");

        expect(fields.training_effect_aerobic.value).toBeNull();
        expect(fields.training_effect_anaerobic.value).toBeNull();
        expect(fields.exercise_load.value).toBeNull();

    });

});
