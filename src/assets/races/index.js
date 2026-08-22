import raceRu01Skyline from "./race-ru-01-skyline.jpg";
import raceRu02Seafront from "./race-ru-02-seafront.jpg";
import raceRu03Archway from "./race-ru-03-archway.jpg";
import raceRu04Alley from "./race-ru-04-alley.jpg";
import raceTrail01Dawn from "./race-trail-01-dawn.jpg";
import raceTrail02Ridge from "./race-trail-02-ridge.jpg";
import raceTrail03Forest from "./race-trail-03-forest.jpg";
import raceTrail04Night from "./race-trail-04-night.jpg";
import raceFallbackGradient from "./race-fallback-gradient.jpg";

import raceHeroDawn from "./race-hero-dawn.jpg";
import raceHeroDay from "./race-hero-day.jpg";
import raceHeroDusk from "./race-hero-dusk.jpg";
import raceHeroNight from "./race-hero-header.jpg";

// rain/winter son temas de CLIMA, no de hora (ver comentario en
// src/theme/themes.js) — sin foto propia todavía (tampoco la tienen Plan
// ni Running), caen a las del Hero de Home mientras tanto. Mismo criterio
// que src/assets/running/index.js.
import raceHeroRain from "../hero/hero-rain.jpeg";
import raceHeroWinter from "../hero/hero-snow.jpeg";

// 4 fotos de silueta de corredor para carreras de asfalto (type "RU") —
// a cuál le toca a cada carrera lo decide getRaceImage() en
// src/utils/raceImage.js de forma determinista (mismo hash siempre),
// no aquí.
export const RACE_RU_IMAGES = [raceRu01Skyline, raceRu02Seafront, raceRu03Archway, raceRu04Alley];

// Mismo reparto por hash que RACE_RU_IMAGES, pero para carreras de trail
// (type "TRS") — 4 fotos propias, no las de asfalto reutilizadas.
export const RACE_TRAIL_IMAGES = [raceTrail01Dawn, raceTrail02Ridge, raceTrail03Forest, raceTrail04Night];

// Cualquier carrera que no sea de asfalto (type distinto de "RU", o sin
// type) cae directamente aquí, sin pasar por el hash.
export const RACE_FALLBACK_IMAGE = raceFallbackGradient;

// Cabecera de la pantalla de Carreras (arco de salida) — una foto por
// franja horaria, mismo mapa/mecanismo que RUNNING_IMAGES
// (src/assets/running/index.js): themeManager.getTheme().id decide cuál.
export const RACE_HERO_IMAGES = {
    sunrise: raceHeroDawn,
    day: raceHeroDay,
    sunset: raceHeroDusk,
    night: raceHeroNight,
    rain: raceHeroRain,
    winter: raceHeroWinter
};
