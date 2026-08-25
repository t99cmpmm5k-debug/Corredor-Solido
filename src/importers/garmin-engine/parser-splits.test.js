import { describe, it, expect } from "vitest";
import { parse } from "./parser-splits.js";
import { detect } from "./screen-detector.js";

// Texto OCR real (confianza 90%, motor tesseract.js spa+eng) de la tabla de
// Vueltas de Garmin Connect desplazada a la derecha (columnas GAP medio/FC
// media/FC máx./Ascenso total) — captura "Puerto Lumbreras, 20 ago". Los
// números de vuelta 3 y 6 salen mal leídos ("&" y "o)") en el propio motor
// real, de ahí que parser-splits.js numere por orden en vez de fiarse de
// ese primer token — ver el comentario junto a HR_ROW.
const REAL_HR_TABLE_TEXT = [
    "Vuelta GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total",
    "",
    "min/km ppm ppm m",
    "1 5:30 140 152 16",
    "2 5:34 153 157 1",
    "& 5:38 154 158 9",
    "4 5:40 154 158 o)",
    "5 5:44 154 158 0",
    "o) 5:46 156 158 3"
].join("\n");

// Texto OCR real (confianza 91%) de la MISMA tabla pero congelada en una
// posición de scroll intermedia distinta — la cabecera de la primera
// columna sale mezclada con el final de la columna anterior ("Vuelta dio"
// en vez de "Vuelta" limpio), y esa misma basura de scroll se pega al
// número de vuelta en cada fila de forma inconsistente: unas veces sin
// espacio ("5"+"40" residual = "540"), una vez CON espacio ("7 46"), una
// vez con dos puntos ("8"+":11" = "8:11"). La versión anterior de HR_ROW
// (que consumía "un único token" antes del GAP) fallaba justo en la fila
// con espacio y la perdía entera — de ahí que ahora no se intente
// entender esa columna en absoluto, solo se busca el patrón GAP+FC+FC en
// cualquier punto de la línea.
const REAL_HR_TABLE_TEXT_SCROLL2 = [
    "Vuelta dio GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso ti]",
    "/km min/km ppm ppm",
    "440 5:40 154 158",
    "540 5:44 154 158",
    "644 5:46 156 158",
    "7 46 5:52 154 157",
    "8:11 6:00 155 157",
    "Total 40 5:41 152 158 |"
].join("\n");

// Tercera posición de scroll (más a la derecha todavía): ya no se ve GAP
// medio, en su lugar Ascenso total/Descenso total — reportada como caso
// real que fallaba (screen_type "unknown"), pero sin una imagen real
// disponible en este repo todavía para extraer su texto OCR exacto; forma
// sintética plausible siguiendo el mismo patrón de columnas contiguas
// FC media/FC máx. ya verificado en las otras dos posiciones reales,
// misma convención que SYNTHETIC_STANDARD_TABLE_TEXT más abajo. Vuelta 3
// simula el mismo tipo de dígito corrompido con basura de scroll ya visto
// en las capturas reales ("3" + resto de la columna anterior = "38").
const SYNTHETIC_HR_TABLE_NO_GAP_TEXT = [
    "Vuelta Frecuencia cardiaca media Frec. cardiaca max. Ascenso total Descenso total",
    "ppm ppm m m",
    "1 140 152 16 8",
    "2 153 157 1 3",
    "38 154 158 9 2",
    "Total 40 152 158 26 13"
].join("\n");

// Fila sintética con la forma exacta que exige STANDARD_ROW (vuelta, tiempo
// con decimales, distancia con coma, ritmo) — no hay una captura OCR real
// disponible todavía para este formato en este repo; misma convención que
// ya usa tcx.test.js para fixtures sintéticas cuando no hay una real a mano.
const SYNTHETIC_STANDARD_TABLE_TEXT = [
    "Resumen Estadísticas Vueltas Gráficos Equipo",
    "Vuelta Tiempo Distancia Ritmo medio",
    "1 5:48.3 1,00 5:48",
    "2 5:52.1 1,00 5:52",
    "3 5:41.0 1,00 5:41",
    "Total 17:21.4 3,00 5:47"
].join("\n");

describe("screen-detector — tabla de Vueltas con FC (vista desplazada)", () => {

    it("identifica la tabla desplazada como 'splits' aunque no aparezca la palabra 'vueltas'", () => {

        expect(detect(REAL_HR_TABLE_TEXT).type).toBe("splits");

    });

    it("sigue identificando la vista estándar como 'splits'", () => {

        expect(detect(SYNTHETIC_STANDARD_TABLE_TEXT).type).toBe("splits");

    });

});

describe("parser-splits — vista estándar (Vuelta/Tiempo/Distancia/Ritmo)", () => {

    it("lee lap, distancia y ritmo de las 3 vueltas reales, descarta 'Total'", () => {

        const { extras } = parse(SYNTHETIC_STANDARD_TABLE_TEXT);

        expect(extras.laps).toEqual([
            { lap: 1, distance_km: 1, pace_min_km: "5:48" },
            { lap: 2, distance_km: 1, pace_min_km: "5:52" },
            { lap: 3, distance_km: 1, pace_min_km: "5:41" }
        ]);

    });

});

describe("parser-splits — vista con FC (GAP medio/FC media/FC máx.)", () => {

    it("extrae FC media y máxima de las 6 vueltas reales, incluso con el número de vuelta mal leído", () => {

        const { extras } = parse(REAL_HR_TABLE_TEXT);

        expect(extras.laps).toEqual([
            { avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152, lap: 1, numberingIsRelative: true },
            { avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157, lap: 2, numberingIsRelative: true },
            { avg_heart_rate_bpm: 154, max_heart_rate_bpm: 158, lap: 3, numberingIsRelative: true },
            { avg_heart_rate_bpm: 154, max_heart_rate_bpm: 158, lap: 4, numberingIsRelative: true },
            { avg_heart_rate_bpm: 154, max_heart_rate_bpm: 158, lap: 5, numberingIsRelative: true },
            { avg_heart_rate_bpm: 156, max_heart_rate_bpm: 158, lap: 6, numberingIsRelative: true }
        ]);

    });

    it("no aporta distancia ni ritmo — esta vista no los tiene", () => {

        const { extras } = parse(REAL_HR_TABLE_TEXT);

        expect(extras.laps.every(l => l.distance_km === undefined && l.pace_min_km === undefined)).toBe(true);

    });

    it("extrae las 5 vueltas reales de una captura congelada en otra posición de scroll, incluida la fila con espacio en la basura de columna ('7 46')", () => {

        const { extras } = parse(REAL_HR_TABLE_TEXT_SCROLL2);

        expect(extras.laps).toEqual([
            { avg_heart_rate_bpm: 154, max_heart_rate_bpm: 158, lap: 1, numberingIsRelative: true },
            { avg_heart_rate_bpm: 154, max_heart_rate_bpm: 158, lap: 2, numberingIsRelative: true },
            { avg_heart_rate_bpm: 156, max_heart_rate_bpm: 158, lap: 3, numberingIsRelative: true },
            { avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157, lap: 4, numberingIsRelative: true },
            { avg_heart_rate_bpm: 155, max_heart_rate_bpm: 157, lap: 5, numberingIsRelative: true }
        ]);

    });

    it("identifica esta segunda posición de scroll como 'splits' pese a la cabecera mezclada", () => {

        expect(detect(REAL_HR_TABLE_TEXT_SCROLL2).type).toBe("splits");

    });

});

describe("parser-splits — vista con FC sin GAP medio (Ascenso/Descenso en su lugar)", () => {

    it("identifica esta tercera posición de scroll como 'splits' sin exigir GAP medio", () => {

        expect(detect(SYNTHETIC_HR_TABLE_NO_GAP_TEXT).type).toBe("splits");

    });

    it("extrae FC media y máxima aunque no haya columna de ritmo (GAP medio) delante", () => {

        const { extras } = parse(SYNTHETIC_HR_TABLE_NO_GAP_TEXT);

        expect(extras.laps).toEqual([
            { avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152, lap: 1, numberingIsRelative: true },
            { avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157, lap: 2, numberingIsRelative: true },
            { avg_heart_rate_bpm: 154, max_heart_rate_bpm: 158, lap: 3, numberingIsRelative: true }
        ]);

    });

});

describe("parser-splits — sin ninguna fila reconocible", () => {

    it("no rompe y devuelve una lista de vueltas vacía", () => {

        const { extras } = parse("Resumen\nAñadir notas\n5 km en 25:00");

        expect(extras.laps).toEqual([]);

    });

});
