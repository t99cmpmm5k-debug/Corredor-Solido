import gymMorning from "./gym-hero-morning.jpg";
import gymDay from "./gym-hero-day.jpg";
import gymEvening from "./gym-hero-evening.jpg";
import gymNight from "./gym-hero-night.jpg";
import gymNutrition from "./gym-hero-nutrition.jpg";

// rain/winter son temas de CLIMA, no de hora (ver comentario en
// src/theme/themes.js) — solo alcanzables a mano desde el ThemeSwitcher.
// Sin foto propia todavía (tampoco la tiene Plan/Running) — caen a las del
// Hero de Home mientras tanto, mismo criterio que assets/plan e
// assets/running.
import gymRain from "../hero/hero-rain.jpeg";
import gymWinter from "../hero/hero-snow.jpeg";

// Rutinas y Composición corporal: foto por tema (hora).
export const GYM_IMAGES = {
  sunrise: gymMorning,
  day: gymDay,
  sunset: gymEvening,
  night: gymNight,
  rain: gymRain,
  winter: gymWinter,
};

// Nutrición: una foto fija de un plato de comida, a cualquier hora (ver
// src/assets/CREDITS.md).
export const GYM_NUTRITION_IMAGE = gymNutrition;
