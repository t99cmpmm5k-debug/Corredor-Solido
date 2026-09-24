import "./Profile.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getWorkouts, getShoes } from "../../data/workoutStore.js";
import { getGymSessions } from "../../data/gymSessionStore.js";
import { formatKm, formatSecondsAsClock } from "../../utils/format.js";
import { buildMonthlyKmStats } from "../../utils/monthlyKm.js";
import { buildTypeSummary } from "../Running/runningSummary.js";
import { buildZ2Evolution } from "../Running/runningEvolution.js";
import { buildWeeklyProgress } from "../Running/runningWeeklyProgress.js";
import { WeeklyProgressChart } from "../Running/components/WeeklyProgressChart.js";
import { RunningShoeMileageSummary } from "../Running/Running.js";
import { getFeedback, getMyProfile, isEditOpen, getEditError, getProfileStep } from "./profileStore.js";
import { ProfileHero } from "./components/ProfileHero.js";
import { ProfileSettingsView } from "./components/ProfileSettingsView.js";

// Rediseño 2026-09-25 (ver project_profile_redesign en memoria): Perfil
// pasa de pantalla técnica/mantenimiento ("Rutinas de gimnasio: 0"...) a
// "quién soy y cómo voy" -- identidad arriba (ProfileHero.js), progreso
// humano en medio, lo técnico movido a la pantalla secundaria "Ajustes"
// (ProfileSettingsView.js, ver getProfileStep()/setProfileStep() en
// profileStore.js, mismo patrón de "step" que Running).

// Texto libre del propio usuario -- mismo criterio que ProfileHero.js.
function escapeHtml(text) {

    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}

// Cabecera de tarjeta (icono en círculo + etiqueta en mayúsculas) -- mismo
// lenguaje visual que .acwr-card-header/.running-summary-header
// (Running.css), clases propias (ver el porqué en ProfileSettingsView.css).
function ProfileCardHeader(icon, label) {

    return `

        <div class="profile-card-header">

            <span class="profile-card-header-icon">
                <iconify-icon icon="${icon}"></iconify-icon>
            </span>

            <span class="profile-card-header-label">${label}</span>

        </div>

    `;

}

function ProfileStat(icon, value, label) {

    return `

        <div class="profile-stat">

            <iconify-icon icon="${icon}"></iconify-icon>

            <span class="profile-stat-value">${value}</span>

            <span class="profile-stat-label">${label}</span>

        </div>

    `;

}

// "TU RESUMEN": 4 datos reales YA calculados en otros sitios de la app
// (nº entrenos/km totales de getWorkouts(), sesiones de gimnasio de
// getGymSessions(), zapatillas ACTIVAS de getShoes()) -- ningún contador
// técnico de los 11 que tenía la vieja DataSummaryCard (esos se quedan en
// Ajustes, ver ProfileSettingsView.js). Zapatillas activas y no el total
// (activas+retiradas): es la cifra que responde "con cuántas corro ahora
// mismo", coherente con lo que ya enseña la sección Equipamiento justo
// debajo.
function ProfileSummaryCard(workouts, shoes, gymSessionsCount) {

    const totalKm = workouts.reduce((sum, w) => sum + (w.distanceKm || 0), 0);
    const activeShoes = shoes.filter(s => s.status !== "retired").length;

    return `

        <section class="profile-card">

            ${ProfileCardHeader("solar:medal-ribbons-star-bold-duotone", "Tu resumen")}

            <div class="profile-stats-row">

                ${ProfileStat("solar:running-round-bold-duotone", workouts.length, workouts.length === 1 ? "entreno" : "entrenos")}

                ${ProfileStat("solar:map-bold-duotone", formatKm(totalKm), "km totales")}

                ${ProfileStat("solar:dumbbell-large-bold-duotone", gymSessionsCount, gymSessionsCount === 1 ? "sesión gym" : "sesiones gym")}

                ${ProfileStat("solar:running-2-bold-duotone", activeShoes, activeShoes === 1 ? "zapatilla" : "zapatillas")}

            </div>

        </section>

    `;

}

// "TU PROGRESO": datos del MES actual, reutilizando los mismos motores ya
// usados en Running -- buildMonthlyKmStats() (mismo que MonthlyKmWidget de
// Inicio), buildTypeSummary() (mismo que "TU RESUMEN" de Running, aquí
// acotado a los entrenos de este mes) y buildZ2Evolution() (mismo que
// "Evolución Z2" de Running). Nada se recalcula aparte -- si alguno de
// estos motores cambia, Perfil lo hereda automáticamente.
//
// "Mejor ritmo" reutiliza tal cual bestPaceSecPerKm de buildTypeSummary()
// -- el mismo campo que ya muestra "TU RESUMEN" de Running. Ese campo no
// tiene ningún filtro de plausibilidad (Math.min sobre avgPaceSecPerKm sin
// más, ver project_running_best_pace_no_guard en memoria, cuestión abierta
// sin tocar en este encargo) -- Perfil hereda la misma limitación conocida
// por reutilizar el mismo cálculo, no la introduce de nuevo.
function ProfileProgressCard(workouts) {

    const monthly = buildMonthlyKmStats(workouts);
    const monthWorkouts = workouts.filter(w => w.date?.startsWith(monthly.currentMonthKey));
    const monthSummary = buildTypeSummary(monthWorkouts);
    const z2 = buildZ2Evolution(workouts);

    const bestPace = monthSummary?.bestPaceSecPerKm != null ? `${formatSecondsAsClock(monthSummary.bestPaceSecPerKm)}/km` : "—";

    const z2Value = z2.available
        ? `${formatSecondsAsClock(z2.first.avgPaceSecPerKm)} → ${formatSecondsAsClock(z2.last.avgPaceSecPerKm)}`
        : "—";

    return `

        <section class="profile-card">

            ${ProfileCardHeader("solar:graph-new-up-bold-duotone", "Tu progreso")}

            <div class="profile-stats-row">

                ${ProfileStat("solar:calendar-mark-bold-duotone", `${formatKm(monthly.currentMonthKm)} km`, "este mes")}

                ${ProfileStat("solar:cup-star-bold-duotone", bestPace, "mejor ritmo")}

                ${ProfileStat("solar:running-round-bold-duotone", z2Value, "Evolución Z2")}

                ${ProfileStat("solar:checklist-minimalistic-bold-duotone", monthly.currentMonthCount, monthly.currentMonthCount === 1 ? "sesión" : "sesiones")}

            </div>

        </section>

    `;

}

// "EQUIPAMIENTO": el mismo bloque de Kilometraje de zapatillas de Running,
// sin duplicarlo (ver RunningShoeMileageSummary(), exportada en
// Running.js) -- action propio ("profile-open-shoes") para que el tap
// abra Running de verdad (initProfileEvents.js: navigate(Running) +
// openShoes()) en vez de disparar también el wiring genérico de
// initRunningEvents.js, que engancha CUALQUIER "[data-action='open-shoes']"
// del documento sin distinguir de qué página viene.
function ProfileEquipmentSection(shoes) {

    const summary = RunningShoeMileageSummary(shoes, { action: "profile-open-shoes" });

    return `

        <section class="profile-card">

            ${ProfileCardHeader("solar:running-2-bold-duotone", "Equipamiento")}

            ${summary || `

                <p class="profile-empty-hint">Todavía no tienes ninguna zapatilla registrada.</p>

            `}

        </section>

    `;

}

// "COMUNIDAD": alias público -- mismo mecanismo de edición que el hero
// (el botón "Editar" de aquí abre el MISMO formulario de ProfileHero.js
// en vez de un segundo input/botón "Guardar" propio -- una sola forma de
// tocar el alias, no dos que puedan desincronizarse entre sí).
// data-action distinto del toggle del hero
// (edit-profile-from-community, no toggle-edit-profile): este SIEMPRE
// abre (nunca cierra si ya estaba abierto) y lleva el scroll hasta el
// hero, porque el formulario vive ahí arriba, lejos de donde está este
// botón (ver initProfileEvents.js) -- un toggle simple podría cerrarlo
// sin que se hubiera llegado a ver.
// Visibilidad Público/Privado:
// PLACEHOLDER VISUAL SIN NINGUNA LÓGICA REAL -- Comunidad se decidió
// completamente abierta (todos los usuarios se ven entre sí, sin
// amistades); un toggle de privacidad real necesitaría cambios de
// backend (filtrar /api/community/entrenos) que no están decididos. El
// propio texto de la tarjeta lo deja explícito, no solo esta nota.
function ProfileCommunitySection(myProfile) {

    const ready = myProfile.status === "ready";
    const aliasLabel = ready && myProfile.aliasPublico ? escapeHtml(myProfile.aliasPublico) : "Todavía no has puesto uno";

    return `

        <section class="profile-card">

            ${ProfileCardHeader("solar:users-group-rounded-bold-duotone", "Comunidad")}

            <div class="profile-community-row">

                <div class="profile-community-row-text">

                    <span class="profile-community-row-label">Alias público</span>

                    <span class="profile-community-row-value">${aliasLabel}</span>

                </div>

                ${ready ? `<button class="profile-link-button" data-action="edit-profile-from-community">Editar</button>` : ""}

            </div>

            <p class="profile-card-hint">Así te verán los demás usuarios en Comunidad -- si no lo pones, de momento se usa la parte de tu email antes de la @.</p>

            <div class="profile-community-row">

                <div class="profile-community-row-text">

                    <span class="profile-community-row-label">Visibilidad</span>

                </div>

                <div class="profile-visibility-toggle" title="Próximamente -- todavía sin funcionalidad real">

                    <span class="profile-visibility-option is-active">Público</span>

                    <span class="profile-visibility-option is-disabled">Privado</span>

                </div>

            </div>

            <p class="profile-card-hint">El selector de privacidad es un adelanto visual -- Comunidad sigue siendo abierta para todos, sin control por usuario todavía.</p>

        </section>

    `;

}

function ProfileSettingsEntry() {

    return `

        <button class="profile-settings-entry" data-action="open-profile-settings">

            <span>

                <iconify-icon icon="solar:settings-bold-duotone"></iconify-icon>

                Ajustes y datos

            </span>

            <iconify-icon icon="solar:alt-arrow-right-bold-duotone"></iconify-icon>

        </button>

    `;

}

function ProfileIdleView() {

    const workouts = getWorkouts();
    const shoes = getShoes();
    const myProfile = getMyProfile();

    return `

        <div class="profile-content">

            ${ProfileHero(myProfile, isEditOpen(), getEditError())}

            ${ProfileSummaryCard(workouts, shoes, getGymSessions().length)}

            ${ProfileProgressCard(workouts)}

            ${WeeklyProgressChart(buildWeeklyProgress(workouts))}

            ${ProfileEquipmentSection(shoes)}

            ${ProfileCommunitySection(myProfile)}

            ${ProfileSettingsEntry()}

        </div>

    `;

}

export function Profile() {

    const content = getProfileStep() === "settings"
        ? ProfileSettingsView(getFeedback())
        : ProfileIdleView();

    return `

        <div class="profile">

            ${content}

            ${BottomNavigation()}

        </div>

    `;

}
