import raceRu01Skyline from "./race-ru-01-skyline.jpg";
import raceRu02Seafront from "./race-ru-02-seafront.jpg";
import raceRu03Archway from "./race-ru-03-archway.jpg";
import raceRu04Alley from "./race-ru-04-alley.jpg";
import raceFallbackGradient from "./race-fallback-gradient.jpg";
import raceHeroHeader from "./race-hero-header.jpg";

// 4 fotos de silueta de corredor para carreras de asfalto (type "RU") —
// a cuál le toca a cada carrera lo decide getRaceImage() en
// src/utils/raceImage.js de forma determinista (mismo hash siempre),
// no aquí.
export const RACE_RU_IMAGES = [raceRu01Skyline, raceRu02Seafront, raceRu03Archway, raceRu04Alley];

// Cualquier carrera que no sea de asfalto (type distinto de "RU", o sin
// type) cae directamente aquí, sin pasar por el hash.
export const RACE_FALLBACK_IMAGE = raceFallbackGradient;

// Cabecera fija de la pantalla de Carreras (arco de salida) — no varía
// por carrera.
export const RACE_HERO_IMAGE = raceHeroHeader;
