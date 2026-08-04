import { parseISODate, formatISODate, isToday } from "../utils/date.js";

export const weeklyGoal = 25; // TODO: objetivo a definir

// Lunes real de la semana que representa el plan de abajo.
// Actualizar cada semana — de aquí se derivan las fechas de cada sesión.
export const weekStartDate = "2026-08-03";

export const weekEndDate = formatISODate(
    (() => {
        const start = parseISODate(weekStartDate);
        return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    })()
);

export const week = [

{
    day:"LUN",
    type:"easy",
    title:"Rodaje Z2",
    subtitle:"45 min",
    status:"completed",

    heroType:"z2",
    volume:8,
    load:38, // TODO: revisar cargas

    metrics:[
        { icon:"clock-3", label:"Duración", value:"45", unit:"min" },
        { icon:"heart", label:"Zona", value:"Z2" },
        { icon:"gauge", label:"Ritmo", value:"5:30", unit:"/km" }
    ],

    description:"Rodaje suave para mejorar tu base aeróbica en zona 2.",

    details:[
        ["Duración","45 min"],
        ["Zona","Z2"],
        ["Objetivo","Aeróbico"],
        ["Ritmo","5:30/km"]
    ]
},

{
    day:"MAR",
    type:"gym",
    title:"Fuerza",
    subtitle:"Gimnasio",
    status:"pending",

    heroType:"strength",
    volume:0,
    load:52, // TODO: revisar cargas

    metrics:[
        { icon:"dumbbell", label:"Ejercicios", value:"4" },
        { icon:"repeat", label:"Series", value:"3" },
        { icon:"clock-3", label:"Core", value:"10", unit:"min" }
    ],

    description:"Entrenamiento de fuerza orientado al corredor.",

    details:[
        ["Pierna","4 ejercicios"],
        ["Core","10 min"],
        ["Series","3"],
        ["Descanso","90 s"]
    ]
},

{
    day:"MIÉ",
    type:"easy",
    title:"Rodaje Z2",
    subtitle:"8 km",
    status:"pending",

    heroType:"z2",
    volume:8,
    load:41, // TODO: revisar cargas

    metrics:[
        { icon:"map-pinned", label:"Distancia", value:"8", unit:"km" },
        { icon:"heart", label:"Zona", value:"Z2" },
        { icon:"activity", label:"Cadencia", value:"170" }
    ],

    description:"Rodaje continuo manteniendo pulsaciones estables.",

    details:[
        ["Distancia","8 km"],
        ["Zona","Z2"],
        ["Objetivo","Base"],
        ["Cadencia","170"]
    ]
},

{
    day:"JUE",
    type:"series",
    title:"Series",
    subtitle:"5 × 800 m",
    status:"pending",

    heroType:"intervals",
    volume:10, // TODO: ajustar según calentamiento real
    load:82, // TODO: revisar cargas

    // TODO: valores a confirmar
    metrics:[
        { icon:"repeat", label:"Series", value:"5", unit:"× 800 m" },
        { icon:"gauge", label:"Ritmo objetivo", value:"4:20", unit:"/km" },
        { icon:"flame", label:"Calentamiento", value:"15", unit:"min" }
    ],

    description:"Mejora tu velocidad y resistencia con repeticiones controladas a ritmo objetivo.",

    details:[
        ["Calentamiento","15 min"],
        ["Serie principal","5 × 800"],
        ["Recuperación","400 m"],
        ["Ritmo","4:20/km"]
    ]
},

{
    day:"VIE",
    type:"rest",
    title:"Descanso",
    subtitle:"Activo",
    status:"pending",

    heroType:"recovery",
    volume:0,
    load:20, // TODO: revisar cargas

    metrics:[
        { icon:"activity", label:"Movilidad", value:"20", unit:"min" },
        { icon:"footprints", label:"Paseo", value:"30", unit:"min" },
        { icon:"heart", label:"Objetivo", value:"Recuperar" }
    ],

    description:"Recuperación activa para asimilar la carga semanal.",

    details:[
        ["Movilidad","20 min"],
        ["Paseo","30 min"],
        ["Foam Roller","Sí"],
        ["Objetivo","Recuperar"]
    ]
},

{
    day:"SÁB",
    type:"long",
    title:"Tirada larga",
    subtitle:"12 km",
    status:"pending",

    heroType:"longRun",
    volume:12,
    load:96, // TODO: revisar cargas

    metrics:[
        { icon:"map-pinned", label:"Distancia", value:"12", unit:"km" },
        { icon:"heart", label:"Zona", value:"Z2" },
        { icon:"flag", label:"Objetivo", value:"Fondo" }
    ],

    description:"Rodaje largo para aumentar resistencia.",

    details:[
        ["Distancia","12 km"],
        ["Zona","Z2"],
        ["Avituallamiento","Agua"],
        ["Objetivo","Fondo"]
    ]
},

{
    day:"DOM",
    type:"free",
    title:"Libre",
    subtitle:"",
    status:"pending",

    heroType:"free",
    volume:0,
    load:0, // TODO: revisar cargas

    metrics:[
        { icon:"coffee", label:"Actividad", value:"Libre" },
        { icon:"heart", label:"Objetivo", value:"Descanso" },
        { icon:"map-pinned", label:"Distancia", value:"0", unit:"km" }
    ],

    description:"Día libre.",

    details:[
        ["Actividad","Libre"],
        ["Objetivo","Descanso"]
    ]
}

];

// Fecha real de cada sesión = weekStartDate + su posición en la semana (LUN=0...DOM=6)
week.forEach((session, index) => {

    const start = parseISODate(weekStartDate);
    const sessionDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);

    session.date = formatISODate(sessionDate);

});

export function getTodayWorkout() {

    return week.find(session => isToday(session.date)) || week[0];

}

export function getVolume() {

    const completed = week
        .filter(session => session.status === "completed")
        .reduce((sum, session) => sum + session.volume, 0);

    return { completed, goal: weeklyGoal };

}

// A diferencia del volumen (un objetivo que te propones), la carga es
// una consecuencia de lo que el plan programa — el total no es un
// objetivo declarado, es la suma de lo planificado esta semana.
export function getLoad() {

    const completed = week
        .filter(session => session.status === "completed")
        .reduce((sum, session) => sum + session.load, 0);

    const total = week.reduce((sum, session) => sum + session.load, 0);

    return { completed, total };

}