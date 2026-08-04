import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";

import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";


import "iconify-icon";

import "./styles/app.css";
import "./styles/hero.css";

import { Home } from "./pages/Home/Home.js";
import { Plan } from "./pages/Plan/Plan.js";

import { applyAutomaticTheme } from "./theme/timeTheme.js";
import { start } from "./core/router.js";

// TEMPORAL - QUITAR ANTES DE PRODUCCIÓN
import { mountThemeSwitcher } from "./dev/ThemeSwitcher.js";

applyAutomaticTheme();

start(Home);

// TEMPORAL - QUITAR ANTES DE PRODUCCIÓN
mountThemeSwitcher();

