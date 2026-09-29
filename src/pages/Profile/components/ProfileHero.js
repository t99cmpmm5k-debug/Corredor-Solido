import "./ProfileHero.css";

// Hero de Perfil (rediseño 2026-09-25) -- identidad compacta, no la
// pantalla de ajustes/mantenimiento de antes: avatar (inicial del alias
// público sobre un círculo, no hay ningún patrón de avatar previo en la
// app del que tirar -- primero de este tipo, ver CREDITS/commit),
// alias, localidad (si la hay) y "Corredor sólido desde AAAA" (año real
// de myProfile.createdAt, nunca inventado). Mientras myProfile.status no
// es "ready" (o sin sesión) no se pinta nada de esto -- ver
// isLoggedIn()/loadMyProfile() en profileStore.js, mismo criterio que
// antes con AliasPublicoCard: nunca un valor de relleno mientras se carga.

// Texto libre del propio usuario (alias/localidad) -- siempre escapado,
// mismo criterio que el resto de la app con texto libre (ComunidadActividadView.js,
// GymDiet.js...).
function escapeHtml(text) {

    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}

// Formulario de edición, dentro del propio hero -- input SIN controlar,
// prellenado con el valor actual (a diferencia del placeholder-como-valor-
// actual de la vieja AliasPublicoCard: aquí SÍ interesa poder tocar solo
// un campo sin tener que retecelar el otro entero) y leído del DOM al
// guardar (ver handleSaveProfile en initProfileEvents.js) -- nunca wireado
// a rerender() en cada tecla (bug real ya corregido en otro sitio, ver
// feedback_controlled_input_rerender_bug).
//
// `draft` (2026-09-29): lo tecleado cuando falló el último guardado (ver
// getEditDraft() en profileStore.js) -- si existe, manda sobre los valores
// guardados para no borrar lo que el usuario acaba de escribir.
function ProfileEditForm(myProfile, editError, draft = null) {

    const values = draft ?? {
        alias: myProfile.aliasPublico ?? "",
        localidad: myProfile.localidad ?? "",
        z2Min: myProfile.z2MinBpm ?? "",
        z2Max: myProfile.z2MaxBpm ?? ""
    };

    return `

        <div class="profile-hero-edit-form">

            ${editError ? `<p class="profile-hero-edit-error">${escapeHtml(editError)}</p>` : ""}

            <label class="profile-hero-edit-label">

                Alias público

                <input type="text" class="profile-input" data-field="edit-alias" placeholder="Tu alias público" maxlength="50" value="${escapeHtml(String(values.alias))}">

            </label>

            <label class="profile-hero-edit-label">

                Localidad (opcional)

                <input type="text" class="profile-input" data-field="edit-localidad" placeholder="Tu localidad" maxlength="100" value="${escapeHtml(String(values.localidad))}">

            </label>

            <!-- Zona 2 personal (2026-09-29): la usa el % en zona del
                 Ranking de Comunidad. inputmode numeric (no type=number)
                 para el teclado numérico del iPhone sin las flechitas;
                 se valida al guardar (parseZ2Inputs, ../z2Zone.js). -->
            <div class="profile-hero-edit-label">

                Tu Zona 2 (opcional, ppm)

                <div class="profile-z2-inputs">

                    <input type="text" inputmode="numeric" class="profile-input" data-field="edit-z2-min" placeholder="Mín. (130)" maxlength="3" value="${escapeHtml(String(values.z2Min))}" aria-label="Zona 2 mínimo en ppm">

                    <span class="profile-z2-separator">–</span>

                    <input type="text" inputmode="numeric" class="profile-input" data-field="edit-z2-max" placeholder="Máx. (150)" maxlength="3" value="${escapeHtml(String(values.z2Max))}" aria-label="Zona 2 máximo en ppm">

                </div>

                <span class="profile-hero-edit-hint">Vacío = rango general 130–150 ppm. Se usa para tu % en zona del Ranking.</span>

            </div>

            <div class="profile-hero-edit-actions">

                <button class="profile-button profile-button-secondary" data-action="cancel-edit-profile">Cancelar</button>

                <button class="profile-button profile-button-primary" data-action="save-edit-profile">Guardar</button>

            </div>

        </div>

    `;

}

export function ProfileHero(myProfile, editOpen, editError, editDraft = null) {

    const ready = myProfile.status === "ready";
    const initial = ready && myProfile.aliasPublico ? myProfile.aliasPublico.trim().charAt(0).toUpperCase() : null;
    const createdYear = ready && myProfile.createdAt ? new Date(myProfile.createdAt).getFullYear() : null;

    return `

        <section class="profile-hero">

            <div class="profile-hero-identity">

                <div class="profile-hero-avatar">

                    ${initial ? initial : `<iconify-icon icon="solar:user-bold-duotone"></iconify-icon>`}

                </div>

                <div class="profile-hero-text">

                    <h1 class="profile-hero-alias">${ready ? (myProfile.aliasPublico ? escapeHtml(myProfile.aliasPublico) : "Sin alias todavía") : "Perfil"}</h1>

                    ${ready && myProfile.localidad ? `

                        <p class="profile-hero-localidad">

                            <iconify-icon icon="solar:map-point-bold-duotone"></iconify-icon>

                            ${escapeHtml(myProfile.localidad)}

                        </p>

                    ` : ""}

                    ${createdYear ? `<p class="profile-hero-since">Corredor sólido desde ${createdYear}</p>` : ""}

                </div>

            </div>

            ${ready ? `

                <button class="profile-hero-edit-toggle" data-action="toggle-edit-profile">

                    <iconify-icon icon="solar:pen-bold-duotone"></iconify-icon>

                    Editar perfil

                </button>

            ` : ""}

            ${editOpen ? ProfileEditForm(myProfile, editError, editDraft) : ""}

        </section>

    `;

}
