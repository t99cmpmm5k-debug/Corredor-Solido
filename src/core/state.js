const state = {

    currentPage: null,

    selectedWorkout: null,

    // Selección propia del selector de día de Inicio (botón "Cambiar" en
    // SessionCard.js) -- aparte de selectedWorkout (que es de Plan) a
    // propósito, aunque los dos reutilicen el mismo PlanTimeline() para
    // pintar la semana: son dos "qué sesión estoy mirando" independientes.
    // Antes compartían selectedWorkout y tocar un día en Plan se filtraba
    // a Inicio como si fuera "la sesión de hoy" (bug real, corregido
    // 2026-08-26 -- ver MasterCard.js/SessionCard.js/initSessionCardEvents.js).
    homeSelectedWorkout: null,

    viewedWeekStart: null,

    selectedRun: null,

    selectedExercise: null,

    selectedShoe: null,

    movingSessionId: null,

    sessionDetailExpanded: false,

    weekPickerExpanded: false,

    // Mes tocado en el gráfico interactivo de MonthlyKmWidget.js (Inicio)
    // -- null cuando no se ha tocado ninguno (o se ha tocado el mismo dos
    // veces, para quitar el detalle). El mes actual no necesita esto para
    // verse, ya se muestra siempre arriba del todo del widget.
    selectedMonthKey: null

};

export function getState() {

    return state;

}

export function setState(key, value) {

    state[key] = value;

}