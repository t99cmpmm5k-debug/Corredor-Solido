import runningSunrise from "./running-sunrise.jpeg";
import runningDay from "./running-day.jpeg";
import runningSunset from "./running-sunset.jpeg";
import runningNight from "./running-night.jpeg";

// rain/winter son temas de CLIMA, no de hora (ver comentario en
// src/theme/themes.js) — solo alcanzables a mano desde el ThemeSwitcher.
// Sin foto propia todavía (tampoco la tiene Plan) — caen a las del Hero
// de Home mientras tanto.
import runningRain from "../hero/hero-rain.jpeg";
import runningWinter from "../hero/hero-snow.jpeg";

export const RUNNING_IMAGES = {
  sunrise: runningSunrise,
  day: runningDay,
  sunset: runningSunset,
  night: runningNight,
  rain: runningRain,
  winter: runningWinter,
};
