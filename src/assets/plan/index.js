import planSunrise from "./plan-sunrise.jpeg";
import planDay from "./plan-day.jpeg";
import planSunset from "./plan-sunset.jpeg";
import planNight from "./plan-night.jpeg";

// rain/winter son temas de CLIMA, no de hora (ver comentario en
// src/theme/themes.js) — solo alcanzables a mano desde el ThemeSwitcher.
// Sin foto propia todavía (tampoco la tiene Running) — caen a las del Hero
// de Home mientras tanto.
import planRain from "../hero/hero-rain.jpeg";
import planWinter from "../hero/hero-snow.jpeg";

export const PLAN_IMAGES = {
  sunrise: planSunrise,
  day: planDay,
  sunset: planSunset,
  night: planNight,
  rain: planRain,
  winter: planWinter,
};
