function monthStartOf(date) {

    return new Date(date.getFullYear(), date.getMonth(), 1);

}

let viewedMonth = monthStartOf(new Date());
let selectedDate = null;

export function getViewedMonth() {

    return viewedMonth;

}

export function shiftViewedMonth(deltaMonths) {

    viewedMonth = monthStartOf(new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + deltaMonths, 1));
    selectedDate = null;

}

export function getSelectedDate() {

    return selectedDate;

}

export function setSelectedDate(date) {

    selectedDate = date;

}

// Carreras siempre arranca en el mes actual al entrar desde la
// navegación — mismo criterio que resetPlanView() en Plan: el mes que
// estuvieras viendo antes no persiste, para que "Carreras" sea siempre
// predecible ("qué se corrió este mes"), no una vuelta a donde lo dejaste.
export function resetCarrerasView() {

    viewedMonth = monthStartOf(new Date());
    selectedDate = null;

}
