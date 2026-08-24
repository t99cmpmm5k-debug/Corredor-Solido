// Base de datos de ejercicios (offline) -- adaptada de free-exercise-db
// (github.com/yuhonas/free-exercise-db, dominio publico), reducida a los
// campos que usa el buscador de Gimnasio: nombre (traducido EN->ES en una
// primera pasada revisada y aprobada por el usuario), grupo muscular
// primario (pecho/espalda/pierna/hombro/brazo/core), equipo y nivel.
// Estatica -- no se consulta en vivo, coherente con que la app es una PWA
// offline. No confundir con customExerciseStore.js (ejercicios que el
// propio usuario anade a mano, en IndexedDB, store separado).
export const EXERCISE_DATABASE = [
    {
        "id": "3_4_Sit-Up",
        "name": "Abdominal (3 4)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "90_90_Hamstring",
        "name": "Isquiotibial 90/90",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Ab_Crunch_Machine",
        "name": "Encogimiento abdominal en máquina",
        "muscleGroup": "Core",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Ab_Roller",
        "name": "Rueda abdominal",
        "muscleGroup": "Core",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Adductor",
        "name": "Aductor (máquina)",
        "muscleGroup": "Pierna",
        "equipment": "Rodillo",
        "level": "Intermedio"
    },
    {
        "id": "Adductor_Groin",
        "name": "Aductor / ingle",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Intermedio"
    },
    {
        "id": "Advanced_Kettlebell_Windmill",
        "name": "Molino con pesa rusa (advanced)",
        "muscleGroup": "Core",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Air_Bike",
        "name": "Bicicleta de aire",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "All_Fours_Quad_Stretch",
        "name": "Estiramiento de cuádriceps a cuatro patas",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Alternate_Hammer_Curl",
        "name": "Curl martillo alterno",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Alternate_Heel_Touchers",
        "name": "Toques de talón alternos",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Alternate_Incline_Dumbbell_Curl",
        "name": "Curl alterno inclinado con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Alternate_Leg_Diagonal_Bound",
        "name": "Salto diagonal alterno",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Alternating_Cable_Shoulder_Press",
        "name": "Press de hombro alterno en polea",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Alternating_Deltoid_Raise",
        "name": "Elevación de deltoides alterna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Alternating_Floor_Press",
        "name": "Press alterno en el suelo",
        "muscleGroup": "Pecho",
        "equipment": "Pesas rusas",
        "level": "Principiante"
    },
    {
        "id": "Alternating_Hang_Clean",
        "name": "Cargada colgante alterna",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Alternating_Kettlebell_Press",
        "name": "Press alterno con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Alternating_Kettlebell_Row",
        "name": "Remo alterno con pesa rusa",
        "muscleGroup": "Espalda",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Alternating_Renegade_Row",
        "name": "Remo alterno (renegade)",
        "muscleGroup": "Espalda",
        "equipment": "Pesas rusas",
        "level": "Experto"
    },
    {
        "id": "Ankle_Circles",
        "name": "Círculo (ankle)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Ankle_On_The_Knee",
        "name": "Tobillo sobre la rodilla",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Anterior_Tibialis-SMR",
        "name": "Auto-liberación miofascial del tibial anterior",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Anti-Gravity_Press",
        "name": "Press (anti gravity)",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Arm_Circles",
        "name": "Círculo (arm)",
        "muscleGroup": "Hombro",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Arnold_Dumbbell_Press",
        "name": "Press con mancuerna (arnold)",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Around_The_Worlds",
        "name": "Círculos con mancuerna (Around the World)",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Atlas_Stone_Trainer",
        "name": "Entrenador de piedra Atlas",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Atlas_Stones",
        "name": "Piedras Atlas",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Experto"
    },
    {
        "id": "Axle_Deadlift",
        "name": "Peso muerto (axle)",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Back_Flyes_-_With_Bands",
        "name": "Apertura de espalda con banda elástica",
        "muscleGroup": "Hombro",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Backward_Drag",
        "name": "Arrastre hacia atrás",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Backward_Medicine_Ball_Throw",
        "name": "Lanzamiento con balón medicinal (backward)",
        "muscleGroup": "Hombro",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Balance_Board",
        "name": "Tabla de equilibrio",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Ball_Leg_Curl",
        "name": "Curl femoral (ball)",
        "muscleGroup": "Pierna",
        "equipment": "Fitball",
        "level": "Principiante"
    },
    {
        "id": "Band_Assisted_Pull-Up",
        "name": "Dominada asistida con banda elástica",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Band_Good_Morning",
        "name": "Buenos días con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Band_Good_Morning_Pull_Through",
        "name": "Buenos días con banda elástica (pull through)",
        "muscleGroup": "Pierna",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Band_Hip_Adductions",
        "name": "Aducción de cadera con banda",
        "muscleGroup": "Pierna",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Band_Pull_Apart",
        "name": "Apertura de banda elástica",
        "muscleGroup": "Hombro",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Band_Skull_Crusher",
        "name": "Press francés con banda elástica",
        "muscleGroup": "Brazo",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Ab_Rollout",
        "name": "Rollout abdominal con barra",
        "muscleGroup": "Core",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Ab_Rollout_-_On_Knees",
        "name": "Rollout abdominal de rodilla con barra",
        "muscleGroup": "Core",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Barbell_Bench_Press_-_Medium_Grip",
        "name": "Press de banca agarre medio con barra",
        "muscleGroup": "Pecho",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Curl",
        "name": "Curl con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Curls_Lying_Against_An_Incline",
        "name": "Curl tumbado inclinado con barra (against)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Deadlift",
        "name": "Peso muerto con barra",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Full_Squat",
        "name": "Sentadilla completa con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Glute_Bridge",
        "name": "Puente de glúteo con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Guillotine_Bench_Press",
        "name": "Press de banca con barra (guillotine)",
        "muscleGroup": "Pecho",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Hack_Squat",
        "name": "Sentadilla hack con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Hip_Thrust",
        "name": "Empuje de cadera con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Incline_Bench_Press_-_Medium_Grip",
        "name": "Press de banca inclinado agarre medio con barra",
        "muscleGroup": "Pecho",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Incline_Shoulder_Raise",
        "name": "Elevación de hombro inclinada con barra",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Lunge",
        "name": "Zancada con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Rear_Delt_Row",
        "name": "Remo de deltoide posterior con barra",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Rollout_from_Bench",
        "name": "Rollout abdominal en banco con barra",
        "muscleGroup": "Core",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Seated_Calf_Raise",
        "name": "Elevación de talones sentada con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Shoulder_Press",
        "name": "Press de hombro con barra",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Shrug",
        "name": "Encogimiento de hombros con barra",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Shrug_Behind_The_Back",
        "name": "Encogimiento de hombros de espalda con barra (behind)",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Side_Bend",
        "name": "Flexión lateral de tronco con barra",
        "muscleGroup": "Core",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Side_Split_Squat",
        "name": "Sentadilla búlgara lateral con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Squat",
        "name": "Sentadilla con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Barbell_Squat_To_A_Bench",
        "name": "Sentadilla en banco con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Barbell_Step_Ups",
        "name": "Subida al cajón con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Barbell_Walking_Lunge",
        "name": "Zancada caminando con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Battling_Ropes",
        "name": "Cuerdas de batalla",
        "muscleGroup": "Hombro",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Bear_Crawl_Sled_Drags",
        "name": "Arrastre de trineo a gatas (oso)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Behind_Head_Chest_Stretch",
        "name": "Estiramiento de pecho (behind head)",
        "muscleGroup": "Pecho",
        "equipment": "Otro",
        "level": "Experto"
    },
    {
        "id": "Bench_Dips",
        "name": "Fondo en banco",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Bench_Jump",
        "name": "Salto en banco",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Bench_Press_-_Powerlifting",
        "name": "Press de banca (powerlifting)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Bench_Press_-_With_Bands",
        "name": "Press de banca con banda elástica",
        "muscleGroup": "Pecho",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Bench_Press_with_Chains",
        "name": "Press de banca con cadenas",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Bench_Sprint",
        "name": "Sprint en banco",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Bent-Arm_Barbell_Pullover",
        "name": "Pullover flexionado con barra (arm)",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Bent-Arm_Dumbbell_Pullover",
        "name": "Pullover flexionado con mancuerna (arm)",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Bent-Knee_Hip_Raise",
        "name": "Elevación de rodilla de cadera flexionada",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Bent_Over_Barbell_Row",
        "name": "Remo inclinado con barra",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench",
        "name": "Elevación de deltoide posterior inclinada en banco con mancuerna (head)",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Bent_Over_Low-Pulley_Side_Lateral",
        "name": "Elevación lateral inclinada en polea baja",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Bent_Over_One-Arm_Long_Bar_Row",
        "name": "Remo inclinado a una mano largo con barra",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Bent_Over_Two-Arm_Long_Bar_Row",
        "name": "Remo inclinado a dos manos largo con barra",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Bent_Over_Two-Dumbbell_Row",
        "name": "Remo inclinado con mancuerna (two)",
        "muscleGroup": "Espalda",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Bent_Over_Two-Dumbbell_Row_With_Palms_In",
        "name": "Remo inclinado con mancuerna (two palms)",
        "muscleGroup": "Espalda",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Bent_Press",
        "name": "Press flexionado",
        "muscleGroup": "Core",
        "equipment": "Pesas rusas",
        "level": "Experto"
    },
    {
        "id": "Bicycling",
        "name": "Ciclismo",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Bicycling_Stationary",
        "name": "Ciclismo estático",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Board_Press",
        "name": "Press (board)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Body-Up",
        "name": "Body-up",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Body_Tricep_Press",
        "name": "Press de tríceps (body)",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Bodyweight_Flyes",
        "name": "Apertura con peso corporal",
        "muscleGroup": "Pecho",
        "equipment": "Barra Z",
        "level": "Intermedio"
    },
    {
        "id": "Bodyweight_Mid_Row",
        "name": "Remo con peso corporal (mid)",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Bodyweight_Squat",
        "name": "Sentadilla con peso corporal",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Bodyweight_Walking_Lunge",
        "name": "Zancada caminando con peso corporal",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Bosu_Ball_Cable_Crunch_With_Side_Bends",
        "name": "Encogimiento abdominal lateral en polea (bosu ball bends)",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Bottoms-Up_Clean_From_The_Hang_Position",
        "name": "Cargada colgada (bottoms up position)",
        "muscleGroup": "Brazo",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Bottoms_Up",
        "name": "Pesa rusa bottoms-up",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Box_Jump_Multiple_Response",
        "name": "Salto al cajón (multiple response)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Box_Skip",
        "name": "Salto al cajón (skipping)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Box_Squat",
        "name": "Sentadilla al cajón",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Box_Squat_with_Bands",
        "name": "Sentadilla al cajón con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Box_Squat_with_Chains",
        "name": "Sentadilla al cajón con cadenas",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Brachialis-SMR",
        "name": "Auto-liberación miofascial del braquial",
        "muscleGroup": "Brazo",
        "equipment": "Rodillo",
        "level": "Intermedio"
    },
    {
        "id": "Bradford_Rocky_Presses",
        "name": "Press (bradford rocky)",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Butt-Ups",
        "name": "Elevación de glúteo (Butt-up)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Butt_Lift_Bridge",
        "name": "Puente (butt lift)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Butterfly",
        "name": "Mariposa (máquina contractora)",
        "muscleGroup": "Pecho",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Cable_Chest_Press",
        "name": "Press de pecho en polea",
        "muscleGroup": "Pecho",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Crossover",
        "name": "Cruce en polea en polea",
        "muscleGroup": "Pecho",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Crunch",
        "name": "Encogimiento abdominal en polea",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Deadlifts",
        "name": "Peso muerto en polea",
        "muscleGroup": "Pierna",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Hammer_Curls_-_Rope_Attachment",
        "name": "Curl martillo con accesorio en polea con cuerda",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Hip_Adduction",
        "name": "Aducción de cadera en polea",
        "muscleGroup": "Pierna",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Incline_Pushdown",
        "name": "Extensión en polea inclinada en polea",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Incline_Triceps_Extension",
        "name": "Extensión de tríceps inclinada en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Internal_Rotation",
        "name": "Rotación interna en polea",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Iron_Cross",
        "name": "Cruz de hierro en polea",
        "muscleGroup": "Pecho",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Judo_Flip",
        "name": "Judo flip en polea",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Lying_Triceps_Extension",
        "name": "Extensión de tríceps tumbada en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_One_Arm_Tricep_Extension",
        "name": "Extensión de tríceps a una mano en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Preacher_Curl",
        "name": "Curl en banco Scott en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Rear_Delt_Fly",
        "name": "Apertura de deltoide posterior en polea",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Reverse_Crunch",
        "name": "Encogimiento abdominal inverso en polea",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Rope_Overhead_Triceps_Extension",
        "name": "Extensión de tríceps por encima de la cabeza en polea con cuerda",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Rope_Rear-Delt_Rows",
        "name": "Remo de deltoide posterior en polea con cuerda",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Russian_Twists",
        "name": "Giro ruso en polea",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Seated_Crunch",
        "name": "Encogimiento abdominal sentado en polea",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Seated_Lateral_Raise",
        "name": "Elevación lateral sentada en polea",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Shoulder_Press",
        "name": "Press de hombro en polea",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Shrugs",
        "name": "Encogimiento de hombros en polea",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Cable_Wrist_Curl",
        "name": "Curl de muñeca en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Calf-Machine_Shoulder_Shrug",
        "name": "Encogimiento de hombros de gemelo de hombro en máquina",
        "muscleGroup": "Espalda",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Calf_Press",
        "name": "Press de gemelo",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Calf_Press_On_The_Leg_Press_Machine",
        "name": "Prensa de piernas de gemelo en máquina (press)",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Calf_Raise_On_A_Dumbbell",
        "name": "Elevación de talones con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Calf_Raises_-_With_Bands",
        "name": "Elevación de talones con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Calf_Stretch_Elbows_Against_Wall",
        "name": "Estiramiento de gemelo contra la pared (elbows)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Calf_Stretch_Hands_Against_Wall",
        "name": "Estiramiento de gemelo contra la pared (hands)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Calves-SMR",
        "name": "Auto-liberación miofascial de gemelos",
        "muscleGroup": "Pierna",
        "equipment": "Rodillo",
        "level": "Intermedio"
    },
    {
        "id": "Car_Deadlift",
        "name": "Peso muerto (car)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Car_Drivers",
        "name": "Volante con disco (Car Drivers)",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Carioca_Quick_Step",
        "name": "Paso cruzado rápido (carioca)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Cat_Stretch",
        "name": "Estiramiento (cat)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Catch_and_Overhead_Throw",
        "name": "Lanzamiento por encima de la cabeza (catch)",
        "muscleGroup": "Espalda",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Chain_Handle_Extension",
        "name": "Extensión (chain handle)",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Chain_Press",
        "name": "Press (chain)",
        "muscleGroup": "Pecho",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Chair_Leg_Extended_Stretch",
        "name": "Estiramiento en silla (leg extended)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Chair_Lower_Back_Stretch",
        "name": "Estiramiento de espalda en silla (lower)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Chair_Squat",
        "name": "Sentadilla en silla",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Chair_Upper_Body_Stretch",
        "name": "Estiramiento en silla (upper body)",
        "muscleGroup": "Hombro",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Chest_And_Front_Of_Shoulder_Stretch",
        "name": "Estiramiento de pecho de hombro frontal",
        "muscleGroup": "Pecho",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Chest_Push_from_3_point_stance",
        "name": "Empuje de pecho desde posición de 3 apoyos",
        "muscleGroup": "Pecho",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Chest_Push_multiple_response",
        "name": "Empuje de pecho (repeticiones múltiples)",
        "muscleGroup": "Pecho",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Chest_Push_single_response",
        "name": "Empuje de pecho (repetición única)",
        "muscleGroup": "Pecho",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Chest_Push_with_Run_Release",
        "name": "Empuje de pecho con salida corriendo",
        "muscleGroup": "Pecho",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Chest_Stretch_on_Stability_Ball",
        "name": "Estiramiento de pecho con fitball",
        "muscleGroup": "Pecho",
        "equipment": "Fitball",
        "level": "Principiante"
    },
    {
        "id": "Childs_Pose",
        "name": "Postura del niño",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Chin-Up",
        "name": "Dominada supina",
        "muscleGroup": "Espalda",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Chin_To_Chest_Stretch",
        "name": "Estiramiento de pecho (chin)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Circus_Bell",
        "name": "Campana de circo",
        "muscleGroup": "Hombro",
        "equipment": "Otro",
        "level": "Experto"
    },
    {
        "id": "Clean",
        "name": "Cargada",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Clean_Deadlift",
        "name": "Peso muerto (clean)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Clean_Pull",
        "name": "Cargada (pull)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Clean_Shrug",
        "name": "Encogimiento de hombros (clean)",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Clean_and_Jerk",
        "name": "Cargada y envión",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Clean_and_Press",
        "name": "Cargada y press",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Clean_from_Blocks",
        "name": "Cargada desde bloques",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Clock_Push-Up",
        "name": "Flexión (clock)",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Close-Grip_Barbell_Bench_Press",
        "name": "Press de banca agarre cerrado con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Close-Grip_Dumbbell_Press",
        "name": "Press agarre cerrado con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Close-Grip_EZ-Bar_Curl_with_Band",
        "name": "Curl agarre cerrado con barra Z con banda elástica",
        "muscleGroup": "Brazo",
        "equipment": "Barra Z",
        "level": "Principiante"
    },
    {
        "id": "Close-Grip_EZ-Bar_Press",
        "name": "Press agarre cerrado con barra Z",
        "muscleGroup": "Brazo",
        "equipment": "Barra Z",
        "level": "Principiante"
    },
    {
        "id": "Close-Grip_EZ_Bar_Curl",
        "name": "Curl agarre cerrado con barra Z",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Close-Grip_Front_Lat_Pulldown",
        "name": "Jalón al pecho agarre cerrado frontal",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Close-Grip_Push-Up_off_of_a_Dumbbell",
        "name": "Flexión agarre cerrado con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Close-Grip_Standing_Barbell_Curl",
        "name": "Curl agarre cerrado de pie con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Cocoons",
        "name": "Capullo (core)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Conans_Wheel",
        "name": "Rueda de Conan",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Concentration_Curls",
        "name": "Curl concentrado",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Cross-Body_Crunch",
        "name": "Encogimiento abdominal cruzado",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Cross_Body_Hammer_Curl",
        "name": "Curl martillo cruzado",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Cross_Over_-_With_Bands",
        "name": "Cruce con bandas elásticas",
        "muscleGroup": "Pecho",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Crossover_Reverse_Lunge",
        "name": "Zancada inversa (crossover)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Intermedio"
    },
    {
        "id": "Crucifix",
        "name": "Crucifijo",
        "muscleGroup": "Hombro",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Crunch_-_Hands_Overhead",
        "name": "Encogimiento abdominal por encima de la cabeza (hands)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Crunch_-_Legs_On_Exercise_Ball",
        "name": "Encogimiento abdominal (legs ball)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Crunches",
        "name": "Encogimiento abdominal",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Cuban_Press",
        "name": "Press (cuban)",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dancers_Stretch",
        "name": "Estiramiento (dancer's)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Dead_Bug",
        "name": "Dead bug",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Deadlift_with_Bands",
        "name": "Peso muerto con banda elástica",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Deadlift_with_Chains",
        "name": "Peso muerto con cadenas",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Decline_Barbell_Bench_Press",
        "name": "Press de banca declinado con barra",
        "muscleGroup": "Pecho",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Decline_Close-Grip_Bench_To_Skull_Crusher",
        "name": "Press francés declinado agarre cerrado en banco",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Decline_Crunch",
        "name": "Encogimiento abdominal declinado",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Decline_Dumbbell_Bench_Press",
        "name": "Press de banca declinado con mancuerna",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Decline_Dumbbell_Flyes",
        "name": "Apertura declinada con mancuerna",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Decline_Dumbbell_Triceps_Extension",
        "name": "Extensión de tríceps declinada con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Decline_EZ_Bar_Triceps_Extension",
        "name": "Extensión de tríceps declinada con barra Z",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Decline_Oblique_Crunch",
        "name": "Encogimiento abdominal de oblicuos declinado",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Decline_Push-Up",
        "name": "Flexión declinada",
        "muscleGroup": "Pecho",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Decline_Reverse_Crunch",
        "name": "Encogimiento abdominal declinado inverso",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Decline_Smith_Press",
        "name": "Press declinado en máquina Smith",
        "muscleGroup": "Pecho",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Deficit_Deadlift",
        "name": "Peso muerto con déficit",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Depth_Jump_Leap",
        "name": "Salto en profundidad (leap)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Dip_Machine",
        "name": "Fondo en máquina",
        "muscleGroup": "Brazo",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Dips_-_Chest_Version",
        "name": "Fondo de pecho (version)",
        "muscleGroup": "Pecho",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Dips_-_Triceps_Version",
        "name": "Fondo de tríceps (version)",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Donkey_Calf_Raises",
        "name": "Elevación de talones (donkey)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Double_Kettlebell_Alternating_Hang_Clean",
        "name": "Cargada colgante doble alterna con pesa rusa",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Double_Kettlebell_Jerk",
        "name": "Envión doble con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Double_Kettlebell_Push_Press",
        "name": "Push press doble con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Double_Kettlebell_Snatch",
        "name": "Arrancada doble con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Experto"
    },
    {
        "id": "Double_Kettlebell_Windmill",
        "name": "Molino doble con pesa rusa",
        "muscleGroup": "Core",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Double_Leg_Butt_Kick",
        "name": "Patada doble (leg butt)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Downward_Facing_Balance",
        "name": "Equilibrio boca abajo",
        "muscleGroup": "Pierna",
        "equipment": "Fitball",
        "level": "Intermedio"
    },
    {
        "id": "Drag_Curl",
        "name": "Curl drag",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Drop_Push",
        "name": "Empuje con caída (Drop push)",
        "muscleGroup": "Pecho",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Alternate_Bicep_Curl",
        "name": "Curl de bíceps alterno con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Bench_Press",
        "name": "Press de banca con mancuerna",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Bench_Press_with_Neutral_Grip",
        "name": "Press de banca con mancuerna (neutral grip)",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Bicep_Curl",
        "name": "Curl de bíceps con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Clean",
        "name": "Cargada con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Floor_Press",
        "name": "Press en el suelo con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Flyes",
        "name": "Apertura con mancuerna",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Incline_Row",
        "name": "Remo inclinado con mancuerna",
        "muscleGroup": "Espalda",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Incline_Shoulder_Raise",
        "name": "Elevación de hombro inclinada con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Lunges",
        "name": "Zancada con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Lying_One-Arm_Rear_Lateral_Raise",
        "name": "Elevación lateral tumbada a una mano posterior con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Lying_Pronation",
        "name": "Pronación tumbado con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Lying_Rear_Lateral_Raise",
        "name": "Elevación lateral tumbada posterior con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Lying_Supination",
        "name": "Supinación tumbado con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_One-Arm_Shoulder_Press",
        "name": "Press de hombro a una mano con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_One-Arm_Triceps_Extension",
        "name": "Extensión de tríceps a una mano con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_One-Arm_Upright_Row",
        "name": "Remo al mentón a una mano con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Prone_Incline_Curl",
        "name": "Curl en prono inclinado con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Raise",
        "name": "Elevación con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Rear_Lunge",
        "name": "Zancada posterior con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Scaption",
        "name": "Scaption con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Seated_Box_Jump",
        "name": "Salto sentado al cajón con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Seated_One-Leg_Calf_Raise",
        "name": "Elevación de talones sentada a una pierna con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Shoulder_Press",
        "name": "Press de hombro con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Shrug",
        "name": "Encogimiento de hombros con mancuerna",
        "muscleGroup": "Espalda",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Side_Bend",
        "name": "Flexión lateral de tronco con mancuerna",
        "muscleGroup": "Core",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Squat",
        "name": "Sentadilla con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dumbbell_Squat_To_A_Bench",
        "name": "Sentadilla en banco con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Step_Ups",
        "name": "Subida al cajón con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Dumbbell_Tricep_Extension_-Pronated_Grip",
        "name": "Extensión de tríceps con mancuerna (pronated grip)",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Dynamic_Back_Stretch",
        "name": "Estiramiento de espalda dinámico",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Dynamic_Chest_Stretch",
        "name": "Estiramiento de pecho dinámico",
        "muscleGroup": "Pecho",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "EZ-Bar_Curl",
        "name": "Curl con barra Z",
        "muscleGroup": "Brazo",
        "equipment": "Barra Z",
        "level": "Principiante"
    },
    {
        "id": "EZ-Bar_Skullcrusher",
        "name": "Press francés con barra Z",
        "muscleGroup": "Brazo",
        "equipment": "Barra Z",
        "level": "Principiante"
    },
    {
        "id": "Elbow_Circles",
        "name": "Círculo (elbow)",
        "muscleGroup": "Hombro",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Elbow_to_Knee",
        "name": "Codo a rodilla",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Elbows_Back",
        "name": "Codos atrás",
        "muscleGroup": "Pecho",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Elevated_Back_Lunge",
        "name": "Zancada de espalda elevada",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Elevated_Cable_Rows",
        "name": "Remo elevado en polea",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Elliptical_Trainer",
        "name": "Elíptica",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Exercise_Ball_Crunch",
        "name": "Encogimiento abdominal (ball)",
        "muscleGroup": "Core",
        "equipment": "Fitball",
        "level": "Principiante"
    },
    {
        "id": "Exercise_Ball_Pull-In",
        "name": "Recogida de piernas con fitball",
        "muscleGroup": "Core",
        "equipment": "Fitball",
        "level": "Principiante"
    },
    {
        "id": "Extended_Range_One-Arm_Kettlebell_Floor_Press",
        "name": "Press a una mano en el suelo con pesa rusa (extended range)",
        "muscleGroup": "Pecho",
        "equipment": "Pesas rusas",
        "level": "Principiante"
    },
    {
        "id": "External_Rotation",
        "name": "Rotación externa",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "External_Rotation_with_Band",
        "name": "Rotación externa con banda elástica",
        "muscleGroup": "Hombro",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "External_Rotation_with_Cable",
        "name": "Rotación externa en polea",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Face_Pull",
        "name": "Jalón facial",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Farmers_Walk",
        "name": "Paseo (farmer's)",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Fast_Skipping",
        "name": "Skipping rápido",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Finger_Curls",
        "name": "Curl (finger)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Flat_Bench_Cable_Flyes",
        "name": "Apertura plana en banco en polea",
        "muscleGroup": "Pecho",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Flat_Bench_Leg_Pull-In",
        "name": "Recogida de piernas en banco plano",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Flat_Bench_Lying_Leg_Raise",
        "name": "Elevación de piernas plana en banco tumbada",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Flexor_Incline_Dumbbell_Curls",
        "name": "Curl inclinado con mancuerna (flexor)",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Floor_Glute-Ham_Raise",
        "name": "Elevación de glúteo de isquiotibial en el suelo",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Intermedio"
    },
    {
        "id": "Floor_Press",
        "name": "Press en el suelo",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Floor_Press_with_Chains",
        "name": "Press en el suelo con cadenas",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Flutter_Kicks",
        "name": "Patada (flutter)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Foot-SMR",
        "name": "Auto-liberación miofascial del pie",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Forward_Drag_with_Press",
        "name": "Press (forward drag)",
        "muscleGroup": "Pecho",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Frankenstein_Squat",
        "name": "Sentadilla (frankenstein)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Freehand_Jump_Squat",
        "name": "Sentadilla (freehand jump)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Frog_Hops",
        "name": "Salto (frog)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Intermedio"
    },
    {
        "id": "Frog_Sit-Ups",
        "name": "Abdominal (frog)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Front_Barbell_Squat",
        "name": "Sentadilla frontal con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Front_Barbell_Squat_To_A_Bench",
        "name": "Sentadilla frontal en banco con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Front_Box_Jump",
        "name": "Salto frontal al cajón",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Front_Cable_Raise",
        "name": "Elevación frontal en polea",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Front_Cone_Hops_or_hurdle_hops",
        "name": "Salto frontal (cone or hurdle hops)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Front_Dumbbell_Raise",
        "name": "Elevación frontal con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Front_Incline_Dumbbell_Raise",
        "name": "Elevación frontal inclinada con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Front_Leg_Raises",
        "name": "Elevación de piernas frontal",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Front_Plate_Raise",
        "name": "Elevación frontal con disco",
        "muscleGroup": "Hombro",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Front_Raise_And_Pullover",
        "name": "Elevación frontal (pullover)",
        "muscleGroup": "Pecho",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Front_Squat_Clean_Grip",
        "name": "Sentadilla frontal (clean grip)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Front_Squats_With_Two_Kettlebells",
        "name": "Sentadilla frontal con pesa rusa (two)",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Front_Two-Dumbbell_Raise",
        "name": "Elevación frontal con mancuerna (two)",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Full_Range-Of-Motion_Lat_Pulldown",
        "name": "Jalón al pecho completo (range motion)",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Gironda_Sternum_Chins",
        "name": "Dominadas Gironda al esternón",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Glute_Ham_Raise",
        "name": "Elevación de glúteo de isquiotibial",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Glute_Kickback",
        "name": "Patada de tríceps de glúteo",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Goblet_Squat",
        "name": "Sentadilla copa",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Principiante"
    },
    {
        "id": "Good_Morning",
        "name": "Buenos días",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Good_Morning_off_Pins",
        "name": "Buenos días (pins)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Gorilla_Chin_Crunch",
        "name": "Encogimiento abdominal (gorilla chin)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Groin_and_Back_Stretch",
        "name": "Estiramiento de ingle de espalda",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Intermedio"
    },
    {
        "id": "Groiners",
        "name": "Groiners",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Hack_Squat",
        "name": "Sentadilla hack",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Hammer_Curls",
        "name": "Curl martillo",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Hammer_Grip_Incline_DB_Bench_Press",
        "name": "Press de banca inclinado (hammer grip db)",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Hamstring-SMR",
        "name": "Auto-liberación miofascial isquiotibial",
        "muscleGroup": "Pierna",
        "equipment": "Rodillo",
        "level": "Principiante"
    },
    {
        "id": "Hamstring_Stretch",
        "name": "Estiramiento de isquiotibial",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Handstand_Push-Ups",
        "name": "Flexión (handstand)",
        "muscleGroup": "Hombro",
        "equipment": "Peso corporal",
        "level": "Experto"
    },
    {
        "id": "Hang_Clean",
        "name": "Cargada colgante",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Hang_Clean_-_Below_the_Knees",
        "name": "Cargada colgante de rodilla (below)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Hang_Snatch",
        "name": "Arrancada colgada",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Hang_Snatch_-_Below_Knees",
        "name": "Arrancada de rodilla colgada (below)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Hanging_Bar_Good_Morning",
        "name": "Buenos días colgado con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Hanging_Leg_Raise",
        "name": "Elevación de piernas colgada",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Experto"
    },
    {
        "id": "Hanging_Pike",
        "name": "Pike colgado",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Experto"
    },
    {
        "id": "Heaving_Snatch_Balance",
        "name": "Arrancada de equilibrio (heaving)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Heavy_Bag_Thrust",
        "name": "Empuje de saco pesado",
        "muscleGroup": "Pecho",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "High_Cable_Curls",
        "name": "Curl alto en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Hip_Circles_prone",
        "name": "Círculo de cadera en prono",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Hip_Extension_with_Bands",
        "name": "Extensión de cadera con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Hip_Flexion_with_Band",
        "name": "Flexión de cadera con banda",
        "muscleGroup": "Pierna",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Hip_Lift_with_Band",
        "name": "Elevación de cadera con banda",
        "muscleGroup": "Pierna",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Hug_A_Ball",
        "name": "Abrazo de balón",
        "muscleGroup": "Espalda",
        "equipment": "Fitball",
        "level": "Principiante"
    },
    {
        "id": "Hug_Knees_To_Chest",
        "name": "Rodillas al pecho",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Hurdle_Hops",
        "name": "Salto (hurdle)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Hyperextensions_Back_Extensions",
        "name": "Extensión de espalda (hyperextensions)",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Hyperextensions_With_No_Hyperextension_Bench",
        "name": "Hiperextensión en banco (no hyperextension)",
        "muscleGroup": "Espalda",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "IT_Band_and_Glute_Stretch",
        "name": "Estiramiento de glúteo con banda elástica (it)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Iliotibial_Tract-SMR",
        "name": "Auto-liberación miofascial de la cintilla iliotibial",
        "muscleGroup": "Pierna",
        "equipment": "Rodillo",
        "level": "Intermedio"
    },
    {
        "id": "Inchworm",
        "name": "Inchworm (oruga)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Incline_Barbell_Triceps_Extension",
        "name": "Extensión de tríceps inclinada con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Incline_Bench_Pull",
        "name": "Remo en banco inclinado",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Incline_Cable_Chest_Press",
        "name": "Press de pecho inclinado en polea",
        "muscleGroup": "Pecho",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Incline_Cable_Flye",
        "name": "Apertura inclinada en polea",
        "muscleGroup": "Pecho",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Incline_Dumbbell_Bench_With_Palms_Facing_In",
        "name": "Press inclinado con mancuernas, palmas enfrentadas",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Incline_Dumbbell_Curl",
        "name": "Curl inclinado con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Incline_Dumbbell_Flyes",
        "name": "Apertura inclinada con mancuerna",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Incline_Dumbbell_Flyes_-_With_A_Twist",
        "name": "Apertura inclinada con mancuerna (twist)",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Incline_Dumbbell_Press",
        "name": "Press inclinado con mancuerna",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Incline_Hammer_Curls",
        "name": "Curl martillo inclinado",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Incline_Inner_Biceps_Curl",
        "name": "Curl de bíceps inclinado interno",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Incline_Push-Up",
        "name": "Flexión inclinada",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Incline_Push-Up_Close-Grip",
        "name": "Flexión inclinada agarre cerrado",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Incline_Push-Up_Depth_Jump",
        "name": "Flexión inclinada en profundidad (jump)",
        "muscleGroup": "Pecho",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Incline_Push-Up_Medium",
        "name": "Flexión inclinada (medium)",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Incline_Push-Up_Reverse_Grip",
        "name": "Flexión inclinada agarre inversa",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Incline_Push-Up_Wide",
        "name": "Flexión inclinada ancha",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Intermediate_Groin_Stretch",
        "name": "Estiramiento de ingle (intermediate)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Intermediate_Hip_Flexor_and_Quad_Stretch",
        "name": "Estiramiento de cadera de cuádriceps (intermediate flexor)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Internal_Rotation_with_Band",
        "name": "Rotación interna con banda elástica",
        "muscleGroup": "Hombro",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Inverted_Row",
        "name": "Remo (inverted)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Inverted_Row_with_Straps",
        "name": "Remo (inverted straps)",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Iron_Cross",
        "name": "Cruz de hierro",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Iron_Crosses_stretch",
        "name": "Estiramiento cruzado (iron)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Intermedio"
    },
    {
        "id": "Isometric_Chest_Squeezes",
        "name": "Contracción isométrica de pecho",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Isometric_Neck_Exercise_-_Front_And_Back",
        "name": "Ejercicio isométrico de cuello (adelante-atrás)",
        "muscleGroup": "Espalda",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Isometric_Neck_Exercise_-_Sides",
        "name": "Ejercicio isométrico de cuello (lateral)",
        "muscleGroup": "Espalda",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Isometric_Wipers",
        "name": "Limpiaparabrisas isométrico",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "JM_Press",
        "name": "Press (jm)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Jackknife_Sit-Up",
        "name": "Abdominal (jackknife)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Janda_Sit-Up",
        "name": "Abdominal (janda)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Jefferson_Squats",
        "name": "Sentadilla (jefferson)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Jerk_Balance",
        "name": "Envión de equilibrio",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Jerk_Dip_Squat",
        "name": "Sentadilla (jerk dip)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Jogging_Treadmill",
        "name": "Trote en cinta",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Keg_Load",
        "name": "Carga de barril",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Arnold_Press",
        "name": "Press Arnold con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Dead_Clean",
        "name": "Cargada con pesa rusa (dead)",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Figure_8",
        "name": "Figura en 8 con pesa rusa",
        "muscleGroup": "Core",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Hang_Clean",
        "name": "Cargada colgante con pesa rusa",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_One-Legged_Deadlift",
        "name": "Peso muerto a una pierna con pesa rusa",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Pass_Between_The_Legs",
        "name": "Paso entre piernas con pesa rusa",
        "muscleGroup": "Core",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Pirate_Ships",
        "name": "Pirate ships con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Principiante"
    },
    {
        "id": "Kettlebell_Pistol_Squat",
        "name": "Sentadilla con pesa rusa (pistol)",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Experto"
    },
    {
        "id": "Kettlebell_Seated_Press",
        "name": "Press sentado con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Seesaw_Press",
        "name": "Press con pesa rusa (seesaw)",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Sumo_High_Pull",
        "name": "Tirón alto sumo con pesa rusa",
        "muscleGroup": "Espalda",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Thruster",
        "name": "Thruster con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Turkish_Get-Up_Lunge_style",
        "name": "Incorporación turca con pesa rusa (lunge style)",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Turkish_Get-Up_Squat_style",
        "name": "Incorporación turca con pesa rusa (squat style)",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kettlebell_Windmill",
        "name": "Molino con pesa rusa",
        "muscleGroup": "Core",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Kipping_Muscle_Up",
        "name": "Muscle up con kipping",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Knee_Across_The_Body",
        "name": "Rodilla cruzada al cuerpo",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Knee_Circles",
        "name": "Círculo de rodilla",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Knee_Hip_Raise_On_Parallel_Bars",
        "name": "Elevación de rodilla de cadera con barra (parallel)",
        "muscleGroup": "Core",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Knee_Tuck_Jump",
        "name": "Salto de rodilla (tuck)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Kneeling_Arm_Drill",
        "name": "Ejercicio de brazos de rodillas",
        "muscleGroup": "Hombro",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Kneeling_Cable_Crunch_With_Alternating_Oblique_Twists",
        "name": "Encogimiento abdominal de oblicuos de rodillas alterno en polea (twists)",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Kneeling_Cable_Triceps_Extension",
        "name": "Extensión de tríceps de rodillas en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Kneeling_Forearm_Stretch",
        "name": "Estiramiento de antebrazo de rodillas",
        "muscleGroup": "Brazo",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Kneeling_High_Pulley_Row",
        "name": "Remo de rodillas alto (pulley)",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Kneeling_Hip_Flexor",
        "name": "Flexor de cadera de rodillas",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Kneeling_Jump_Squat",
        "name": "Sentadilla de rodillas (jump)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Kneeling_Single-Arm_High_Pulley_Row",
        "name": "Remo de rodillas a una mano alto (pulley)",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Kneeling_Squat",
        "name": "Sentadilla de rodillas",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Landmine_180s",
        "name": "Landmine (180's)",
        "muscleGroup": "Core",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Landmine_Linear_Jammer",
        "name": "Landmine (linear jammer)",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Lateral_Bound",
        "name": "Salto lateral",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Lateral_Box_Jump",
        "name": "Salto al cajón (lateral)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Lateral_Cone_Hops",
        "name": "Salto (lateral cone)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Lateral_Raise_-_With_Bands",
        "name": "Elevación lateral con banda elástica",
        "muscleGroup": "Hombro",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Latissimus_Dorsi-SMR",
        "name": "Auto-liberación miofascial del dorsal ancho",
        "muscleGroup": "Espalda",
        "equipment": "Rodillo",
        "level": "Principiante"
    },
    {
        "id": "Leg-Over_Floor_Press",
        "name": "Press en el suelo (leg over)",
        "muscleGroup": "Pecho",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Leg-Up_Hamstring_Stretch",
        "name": "Estiramiento de isquiotibial (leg up)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Leg_Extensions",
        "name": "Extensión de piernas",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Leg_Lift",
        "name": "Elevación de piernas",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Leg_Press",
        "name": "Prensa de piernas",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Leg_Pull-In",
        "name": "Recogida de piernas",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Leverage_Chest_Press",
        "name": "Press de pecho en máquina de palanca",
        "muscleGroup": "Pecho",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Leverage_Deadlift",
        "name": "Peso muerto en máquina de palanca",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Leverage_Decline_Chest_Press",
        "name": "Press de pecho declinado en máquina de palanca",
        "muscleGroup": "Pecho",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Leverage_High_Row",
        "name": "Remo alto en máquina de palanca",
        "muscleGroup": "Espalda",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Leverage_Incline_Chest_Press",
        "name": "Press de pecho inclinado en máquina de palanca",
        "muscleGroup": "Pecho",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Leverage_Iso_Row",
        "name": "Remo en máquina de palanca (iso)",
        "muscleGroup": "Espalda",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Leverage_Shoulder_Press",
        "name": "Press de hombro en máquina de palanca",
        "muscleGroup": "Hombro",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Leverage_Shrug",
        "name": "Encogimiento de hombros en máquina de palanca",
        "muscleGroup": "Espalda",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Linear_3-Part_Start_Technique",
        "name": "Técnica de salida lineal en 3 fases",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Linear_Acceleration_Wall_Drill",
        "name": "Ejercicio de aceleración lineal en pared",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Linear_Depth_Jump",
        "name": "Salto en profundidad (linear)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Log_Lift",
        "name": "Levantamiento de tronco (Log lift)",
        "muscleGroup": "Hombro",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "London_Bridges",
        "name": "Puente (london)",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Looking_At_Ceiling",
        "name": "Mirar al techo (cuello)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Low_Cable_Crossover",
        "name": "Cruce en polea bajo en polea",
        "muscleGroup": "Pecho",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Low_Cable_Triceps_Extension",
        "name": "Extensión de tríceps baja en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Low_Pulley_Row_To_Neck",
        "name": "Remo de cuello bajo (pulley)",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Lower_Back-SMR",
        "name": "Auto-liberación miofascial lumbar",
        "muscleGroup": "Espalda",
        "equipment": "Rodillo",
        "level": "Principiante"
    },
    {
        "id": "Lower_Back_Curl",
        "name": "Curl de espalda (lower)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Lunge_Pass_Through",
        "name": "Zancada (pass through)",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Lunge_Sprint",
        "name": "Zancada (sprint)",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Bent_Leg_Groin",
        "name": "Ingle tumbado con piernas flexionadas",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Experto"
    },
    {
        "id": "Lying_Cable_Curl",
        "name": "Curl tumbado en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Cambered_Barbell_Row",
        "name": "Remo tumbado con barra (cambered)",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Lying_Close-Grip_Bar_Curl_On_High_Pulley",
        "name": "Curl tumbado agarre cerrado alto con barra (pulley)",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Lying_Close-Grip_Barbell_Triceps_Extension_Behind_The_Head",
        "name": "Extensión de tríceps tumbada agarre cerrado con barra (behind head)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Close-Grip_Barbell_Triceps_Press_To_Chin",
        "name": "Press de tríceps tumbado agarre cerrado con barra (chin)",
        "muscleGroup": "Brazo",
        "equipment": "Barra Z",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Crossover",
        "name": "Cruce en polea tumbado",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Experto"
    },
    {
        "id": "Lying_Dumbbell_Tricep_Extension",
        "name": "Extensión de tríceps tumbada con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Face_Down_Plate_Neck_Resistance",
        "name": "Resistencia de cuello boca abajo con disco",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Face_Up_Plate_Neck_Resistance",
        "name": "Resistencia de cuello boca arriba con disco",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Glute",
        "name": "Glúteo tumbado",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Experto"
    },
    {
        "id": "Lying_Hamstring",
        "name": "Isquiotibial tumbado",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Experto"
    },
    {
        "id": "Lying_High_Bench_Barbell_Curl",
        "name": "Curl tumbado alto en banco con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Leg_Curls",
        "name": "Curl femoral tumbado",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Lying_Machine_Squat",
        "name": "Sentadilla tumbada en máquina",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Lying_One-Arm_Lateral_Raise",
        "name": "Elevación lateral tumbada a una mano",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Prone_Quadriceps",
        "name": "Cuádriceps tumbado boca abajo",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Experto"
    },
    {
        "id": "Lying_Rear_Delt_Raise",
        "name": "Elevación de deltoide posterior tumbada",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Supine_Dumbbell_Curl",
        "name": "Curl tumbado en supino con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Lying_T-Bar_Row",
        "name": "Remo tumbado con barra (t)",
        "muscleGroup": "Espalda",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Lying_Triceps_Press",
        "name": "Press de tríceps tumbado",
        "muscleGroup": "Brazo",
        "equipment": "Barra Z",
        "level": "Intermedio"
    },
    {
        "id": "Machine_Bench_Press",
        "name": "Press de banca en máquina",
        "muscleGroup": "Pecho",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Machine_Bicep_Curl",
        "name": "Curl de bíceps en máquina",
        "muscleGroup": "Brazo",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Machine_Preacher_Curls",
        "name": "Curl en banco Scott en máquina",
        "muscleGroup": "Brazo",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Machine_Shoulder_Military_Press",
        "name": "Press militar de hombro en máquina",
        "muscleGroup": "Hombro",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Machine_Triceps_Extension",
        "name": "Extensión de tríceps en máquina",
        "muscleGroup": "Brazo",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Medicine_Ball_Chest_Pass",
        "name": "Pase de pecho con balón medicinal",
        "muscleGroup": "Pecho",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Medicine_Ball_Full_Twist",
        "name": "Giro completo con balón medicinal",
        "muscleGroup": "Core",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Medicine_Ball_Scoop_Throw",
        "name": "Lanzamiento con balón medicinal (scoop)",
        "muscleGroup": "Hombro",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Middle_Back_Shrug",
        "name": "Encogimiento de hombros de espalda (middle)",
        "muscleGroup": "Espalda",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Middle_Back_Stretch",
        "name": "Estiramiento de espalda (middle)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Mixed_Grip_Chin",
        "name": "Dominada con agarre mixto",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Experto"
    },
    {
        "id": "Monster_Walk",
        "name": "Paseo (monster)",
        "muscleGroup": "Pierna",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Mountain_Climbers",
        "name": "Escaladores (Mountain climbers)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Moving_Claw_Series",
        "name": "Serie de garra en movimiento",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Muscle_Snatch",
        "name": "Arrancada (muscle)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Muscle_Up",
        "name": "Muscle up",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Narrow_Stance_Hack_Squats",
        "name": "Sentadilla hack estrecha (stance)",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Narrow_Stance_Leg_Press",
        "name": "Prensa de piernas estrecha (stance)",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Narrow_Stance_Squats",
        "name": "Sentadilla estrecha (stance)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Natural_Glute_Ham_Raise",
        "name": "Elevación de glúteo de isquiotibial (natural)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Neck-SMR",
        "name": "Auto-liberación miofascial del cuello",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Neck_Press",
        "name": "Press de cuello",
        "muscleGroup": "Pecho",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Oblique_Crunches",
        "name": "Encogimiento abdominal de oblicuos",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Oblique_Crunches_-_On_The_Floor",
        "name": "Encogimiento abdominal de oblicuos en el suelo",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Olympic_Squat",
        "name": "Sentadilla (olympic)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "On-Your-Back_Quad_Stretch",
        "name": "Estiramiento de espalda de cuádriceps",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "On_Your_Side_Quad_Stretch",
        "name": "Estiramiento de cuádriceps lateral",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "One-Arm_Dumbbell_Row",
        "name": "Remo a una mano con mancuerna",
        "muscleGroup": "Espalda",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "One-Arm_Flat_Bench_Dumbbell_Flye",
        "name": "Apertura a una mano plana en banco con mancuerna",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "One-Arm_High-Pulley_Cable_Side_Bends",
        "name": "Flexión lateral de tronco en polea alta a una mano",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "One-Arm_Incline_Lateral_Raise",
        "name": "Elevación lateral a una mano inclinada",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "One-Arm_Kettlebell_Clean",
        "name": "Cargada a una mano con pesa rusa",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Kettlebell_Clean_and_Jerk",
        "name": "Cargada y envión a una mano con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Kettlebell_Floor_Press",
        "name": "Press a una mano en el suelo con pesa rusa",
        "muscleGroup": "Pecho",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Kettlebell_Jerk",
        "name": "Envión a una mano con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Kettlebell_Military_Press_To_The_Side",
        "name": "Press militar a una mano lateral con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Kettlebell_Para_Press",
        "name": "Press a una mano con pesa rusa (para)",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Kettlebell_Push_Press",
        "name": "Push press a una mano con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Kettlebell_Row",
        "name": "Remo a una mano con pesa rusa",
        "muscleGroup": "Espalda",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Kettlebell_Snatch",
        "name": "Arrancada a una mano con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Experto"
    },
    {
        "id": "One-Arm_Kettlebell_Split_Jerk",
        "name": "Envión a una mano en zancada con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Kettlebell_Split_Snatch",
        "name": "Arrancada a una mano en zancada con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Experto"
    },
    {
        "id": "One-Arm_Kettlebell_Swings",
        "name": "Balanceo a una mano con pesa rusa",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Long_Bar_Row",
        "name": "Remo a una mano largo con barra",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "One-Arm_Medicine_Ball_Slam",
        "name": "Lanzamiento con balón a una mano con balón medicinal",
        "muscleGroup": "Core",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "One-Arm_Open_Palm_Kettlebell_Clean",
        "name": "Cargada a una mano con pesa rusa (open palm)",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "One-Arm_Overhead_Kettlebell_Squats",
        "name": "Sentadilla a una mano por encima de la cabeza con pesa rusa",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Experto"
    },
    {
        "id": "One-Arm_Side_Deadlift",
        "name": "Peso muerto a una mano lateral",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "One-Arm_Side_Laterals",
        "name": "Elevación lateral a una mano",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "One-Legged_Cable_Kickback",
        "name": "Patada de tríceps a una pierna en polea",
        "muscleGroup": "Pierna",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "One_Arm_Against_Wall",
        "name": "Un brazo contra la pared",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "One_Arm_Chin-Up",
        "name": "Dominada supina a una mano",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Experto"
    },
    {
        "id": "One_Arm_Dumbbell_Bench_Press",
        "name": "Press de banca a una mano con mancuerna",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "One_Arm_Dumbbell_Preacher_Curl",
        "name": "Curl en banco Scott a una mano con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "One_Arm_Floor_Press",
        "name": "Press a una mano en el suelo",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "One_Arm_Lat_Pulldown",
        "name": "Jalón al pecho a una mano",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "One_Arm_Pronated_Dumbbell_Triceps_Extension",
        "name": "Extensión de tríceps a una mano con mancuerna (pronated)",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "One_Arm_Supinated_Dumbbell_Triceps_Extension",
        "name": "Extensión de tríceps a una mano con mancuerna (supinated)",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "One_Half_Locust",
        "name": "Media langosta (yoga)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "One_Handed_Hang",
        "name": "Colgado con una mano",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "One_Knee_To_Chest",
        "name": "Una rodilla al pecho",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "One_Leg_Barbell_Squat",
        "name": "Sentadilla a una pierna con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Open_Palm_Kettlebell_Clean",
        "name": "Cargada con pesa rusa (open palm)",
        "muscleGroup": "Pierna",
        "equipment": "Pesas rusas",
        "level": "Experto"
    },
    {
        "id": "Otis-Up",
        "name": "Otis-up",
        "muscleGroup": "Core",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Overhead_Cable_Curl",
        "name": "Curl por encima de la cabeza en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Overhead_Lat",
        "name": "Dorsal por encima de la cabeza",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Experto"
    },
    {
        "id": "Overhead_Slam",
        "name": "Lanzamiento con balón por encima de la cabeza",
        "muscleGroup": "Espalda",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Overhead_Squat",
        "name": "Sentadilla por encima de la cabeza",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Overhead_Stretch",
        "name": "Estiramiento por encima de la cabeza",
        "muscleGroup": "Core",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Overhead_Triceps",
        "name": "Tríceps por encima de la cabeza",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Experto"
    },
    {
        "id": "Pallof_Press",
        "name": "Press (pallof)",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Pallof_Press_With_Rotation",
        "name": "Press (pallof rotation)",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench",
        "name": "Curl de muñeca palmas abajo en banco con mancuerna (over)",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Palms-Down_Wrist_Curl_Over_A_Bench",
        "name": "Curl de muñeca palmas abajo en banco (over)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Palms-Up_Barbell_Wrist_Curl_Over_A_Bench",
        "name": "Curl de muñeca palmas arriba en banco con barra (over)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench",
        "name": "Curl de muñeca palmas arriba en banco con mancuerna (over)",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Parallel_Bar_Dip",
        "name": "Fondo con barra (parallel)",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Pelvic_Tilt_Into_Bridge",
        "name": "Puente (pelvic tilt into)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Intermedio"
    },
    {
        "id": "Peroneals-SMR",
        "name": "Auto-liberación miofascial de peroneos",
        "muscleGroup": "Pierna",
        "equipment": "Rodillo",
        "level": "Intermedio"
    },
    {
        "id": "Peroneals_Stretch",
        "name": "Estiramiento (peroneals)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Physioball_Hip_Bridge",
        "name": "Puente de cadera (physioball)",
        "muscleGroup": "Pierna",
        "equipment": "Fitball",
        "level": "Principiante"
    },
    {
        "id": "Pin_Presses",
        "name": "Press (pin)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Piriformis-SMR",
        "name": "Auto-liberación miofascial del piriforme",
        "muscleGroup": "Pierna",
        "equipment": "Rodillo",
        "level": "Intermedio"
    },
    {
        "id": "Plank",
        "name": "Plancha",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Plate_Pinch",
        "name": "Pinza de disco",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Plate_Twist",
        "name": "Giro con disco",
        "muscleGroup": "Core",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Platform_Hamstring_Slides",
        "name": "Deslizamiento de isquiotibiales en plataforma",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Plie_Dumbbell_Squat",
        "name": "Sentadilla con mancuerna (plie)",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Plyo_Kettlebell_Pushups",
        "name": "Flexiones pliométricas con pesa rusa",
        "muscleGroup": "Pecho",
        "equipment": "Pesas rusas",
        "level": "Experto"
    },
    {
        "id": "Plyo_Push-up",
        "name": "Flexión (plyo)",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Posterior_Tibialis_Stretch",
        "name": "Estiramiento (posterior tibialis)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Power_Clean",
        "name": "Cargada de potencia",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Power_Clean_from_Blocks",
        "name": "Cargada de potencia desde bloques",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Power_Jerk",
        "name": "Envión de potencia",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Power_Partials",
        "name": "Parciales de potencia",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Power_Snatch",
        "name": "Arrancada de potencia",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Power_Snatch_from_Blocks",
        "name": "Arrancada de potencia desde bloques",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Power_Stairs",
        "name": "Escaleras de potencia",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Preacher_Curl",
        "name": "Curl en banco Scott",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Preacher_Hammer_Dumbbell_Curl",
        "name": "Curl con mancuerna (preacher hammer)",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Press_Sit-Up",
        "name": "Abdominal (press)",
        "muscleGroup": "Core",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Prone_Manual_Hamstring",
        "name": "Isquiotibial manual boca abajo",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Prowler_Sprint",
        "name": "Sprint (prowler)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Pull_Through",
        "name": "Pull through (jalón entre piernas)",
        "muscleGroup": "Pierna",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Pullups",
        "name": "Dominadas",
        "muscleGroup": "Espalda",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Push-Up_Wide",
        "name": "Flexión ancha",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Push-Ups_-_Close_Triceps_Position",
        "name": "Flexión de tríceps (close position)",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Push-Ups_With_Feet_Elevated",
        "name": "Flexión elevada (feet)",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Push-Ups_With_Feet_On_An_Exercise_Ball",
        "name": "Flexión (feet ball)",
        "muscleGroup": "Pecho",
        "equipment": "Fitball",
        "level": "Intermedio"
    },
    {
        "id": "Push_Press",
        "name": "Push press",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Push_Press_-_Behind_the_Neck",
        "name": "Push press de cuello (behind)",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Push_Up_to_Side_Plank",
        "name": "Flexión lateral (plank)",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Pushups",
        "name": "Flexiones",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Pushups_Close_and_Wide_Hand_Positions",
        "name": "Flexiones (agarre cerrado y ancho)",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Pyramid",
        "name": "Pirámide (core)",
        "muscleGroup": "Espalda",
        "equipment": "Fitball",
        "level": "Principiante"
    },
    {
        "id": "Quad_Stretch",
        "name": "Estiramiento de cuádriceps",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Quadriceps-SMR",
        "name": "Auto-liberación miofascial de cuádriceps",
        "muscleGroup": "Pierna",
        "equipment": "Rodillo",
        "level": "Intermedio"
    },
    {
        "id": "Quick_Leap",
        "name": "Salto rápido",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Rack_Delivery",
        "name": "Entrega en rack",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Rack_Pull_with_Bands",
        "name": "Rack pull con bandas",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Rack_Pulls",
        "name": "Rack pulls",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Rear_Leg_Raises",
        "name": "Elevación de piernas posterior",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Recumbent_Bike",
        "name": "Bicicleta reclinada",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Return_Push_from_Stance",
        "name": "Empuje de retorno desde posición",
        "muscleGroup": "Hombro",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Reverse_Band_Bench_Press",
        "name": "Press de banca inverso con banda elástica",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Reverse_Band_Box_Squat",
        "name": "Sentadilla al cajón inversa con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Reverse_Band_Deadlift",
        "name": "Peso muerto inverso con banda elástica",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Reverse_Band_Power_Squat",
        "name": "Sentadilla inversa de potencia con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Reverse_Band_Sumo_Deadlift",
        "name": "Peso muerto sumo inverso con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Reverse_Barbell_Curl",
        "name": "Curl inverso con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Reverse_Barbell_Preacher_Curls",
        "name": "Curl en banco Scott inverso con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra Z",
        "level": "Intermedio"
    },
    {
        "id": "Reverse_Cable_Curl",
        "name": "Curl inverso en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Reverse_Crunch",
        "name": "Encogimiento abdominal inverso",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Reverse_Flyes",
        "name": "Apertura inversa",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Reverse_Flyes_With_External_Rotation",
        "name": "Apertura inversa rotación externa",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Reverse_Grip_Bent-Over_Rows",
        "name": "Remo inclinado agarre inverso",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Reverse_Grip_Triceps_Pushdown",
        "name": "Extensión de tríceps en polea agarre inversa",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Reverse_Hyperextension",
        "name": "Hiperextensión inversa",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Reverse_Machine_Flyes",
        "name": "Apertura inversa en máquina",
        "muscleGroup": "Hombro",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Reverse_Plate_Curls",
        "name": "Curl inverso con disco",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Reverse_Triceps_Bench_Press",
        "name": "Press de banca de tríceps inverso",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Rhomboids-SMR",
        "name": "Auto-liberación miofascial de romboides",
        "muscleGroup": "Espalda",
        "equipment": "Rodillo",
        "level": "Intermedio"
    },
    {
        "id": "Rickshaw_Carry",
        "name": "Transporte con rickshaw",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Rickshaw_Deadlift",
        "name": "Peso muerto (rickshaw)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Ring_Dips",
        "name": "Fondo (ring)",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Rocket_Jump",
        "name": "Salto (rocket)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Rocking_Standing_Calf_Raise",
        "name": "Elevación de talones de pie (rocking)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Rocky_Pull-Ups_Pulldowns",
        "name": "Dominada (rocky pulldowns)",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Romanian_Deadlift",
        "name": "Peso muerto rumano",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Romanian_Deadlift_from_Deficit",
        "name": "Peso muerto rumano con déficit",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Rope_Climb",
        "name": "Escalada de cuerda",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Rope_Crunch",
        "name": "Encogimiento abdominal con cuerda",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Rope_Jumping",
        "name": "Salto a la comba",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Rope_Straight-Arm_Pulldown",
        "name": "Jalón recto con cuerda (arm)",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Round_The_World_Shoulder_Stretch",
        "name": "Estiramiento de hombro (round world)",
        "muscleGroup": "Hombro",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Rowing_Stationary",
        "name": "Remo estático",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Runners_Stretch",
        "name": "Estiramiento (runner's)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Running_Treadmill",
        "name": "Carrera en cinta",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Russian_Twist",
        "name": "Giro ruso",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Sandbag_Load",
        "name": "Carga de saco de arena",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Scapular_Pull-Up",
        "name": "Dominada (scapular)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Scissor_Kick",
        "name": "Patada (scissor)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Scissors_Jump",
        "name": "Salto (scissors)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Seated_Band_Hamstring_Curl",
        "name": "Curl de isquiotibial sentado con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Seated_Barbell_Military_Press",
        "name": "Press militar sentado con barra",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Seated_Barbell_Twist",
        "name": "Giro sentado con barra",
        "muscleGroup": "Core",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Seated_Bent-Over_One-Arm_Dumbbell_Triceps_Extension",
        "name": "Extensión de tríceps sentada inclinada a una mano con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Seated_Bent-Over_Rear_Delt_Raise",
        "name": "Elevación de deltoide posterior sentada inclinada",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Seated_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension",
        "name": "Extensión de tríceps sentada inclinada a dos manos con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Seated_Biceps",
        "name": "Bíceps sentado",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Experto"
    },
    {
        "id": "Seated_Cable_Rows",
        "name": "Remo sentado en polea",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Seated_Cable_Shoulder_Press",
        "name": "Press de hombro sentado en polea",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Seated_Calf_Raise",
        "name": "Elevación de talones sentada",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Seated_Calf_Stretch",
        "name": "Estiramiento de gemelo sentado",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Seated_Close-Grip_Concentration_Barbell_Curl",
        "name": "Curl sentado agarre cerrado con barra (concentration)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Seated_Dumbbell_Curl",
        "name": "Curl sentado con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Seated_Dumbbell_Inner_Biceps_Curl",
        "name": "Curl de bíceps sentado interno con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Seated_Dumbbell_Palms-Down_Wrist_Curl",
        "name": "Curl de muñeca sentado palmas abajo con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Seated_Dumbbell_Palms-Up_Wrist_Curl",
        "name": "Curl de muñeca sentado palmas arriba con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Seated_Dumbbell_Press",
        "name": "Press sentado con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Seated_Flat_Bench_Leg_Pull-In",
        "name": "Recogida de piernas sentado en banco plano",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Seated_Floor_Hamstring_Stretch",
        "name": "Estiramiento de isquiotibial sentado en el suelo",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Seated_Front_Deltoid",
        "name": "Deltoides frontal sentado",
        "muscleGroup": "Hombro",
        "equipment": "Peso corporal",
        "level": "Experto"
    },
    {
        "id": "Seated_Glute",
        "name": "Glúteo sentado",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Experto"
    },
    {
        "id": "Seated_Good_Mornings",
        "name": "Buenos días sentado",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Seated_Hamstring",
        "name": "Isquiotibial sentado",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Experto"
    },
    {
        "id": "Seated_Hamstring_and_Calf_Stretch",
        "name": "Estiramiento de isquiotibial de gemelo sentado",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Seated_Head_Harness_Neck_Resistance",
        "name": "Resistencia de cuello sentado con arnés",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Seated_Leg_Curl",
        "name": "Curl femoral sentado",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Seated_Leg_Tucks",
        "name": "Recogida de piernas sentado",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Seated_One-Arm_Dumbbell_Palms-Down_Wrist_Curl",
        "name": "Curl de muñeca sentado a una mano palmas abajo con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Seated_One-Arm_Dumbbell_Palms-Up_Wrist_Curl",
        "name": "Curl de muñeca sentado a una mano palmas arriba con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Seated_One-arm_Cable_Pulley_Rows",
        "name": "Remo sentado a una mano en polea (pulley)",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Seated_Overhead_Stretch",
        "name": "Estiramiento sentado por encima de la cabeza",
        "muscleGroup": "Core",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Seated_Palm-Up_Barbell_Wrist_Curl",
        "name": "Curl de muñeca sentado con barra (palm up)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Seated_Palms-Down_Barbell_Wrist_Curl",
        "name": "Curl de muñeca sentado palmas abajo con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Seated_Side_Lateral_Raise",
        "name": "Elevación lateral sentada lateral",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Seated_Triceps_Press",
        "name": "Press de tríceps sentado",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Seated_Two-Arm_Palms-Up_Low-Pulley_Wrist_Curl",
        "name": "Curl de muñeca sentado a dos manos palmas arriba bajo (pulley)",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "See-Saw_Press_Alternating_Side_Press",
        "name": "Press alterno lateral (see saw press)",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Shotgun_Row",
        "name": "Remo (shotgun)",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Shoulder_Circles",
        "name": "Círculos de hombro",
        "muscleGroup": "Hombro",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Shoulder_Press_-_With_Bands",
        "name": "Press de hombro con banda elástica",
        "muscleGroup": "Hombro",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Shoulder_Raise",
        "name": "Elevación de hombro",
        "muscleGroup": "Hombro",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Shoulder_Stretch",
        "name": "Estiramiento de hombro",
        "muscleGroup": "Hombro",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Side-Lying_Floor_Stretch",
        "name": "Estiramiento lateral tumbado en el suelo",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Side_Bridge",
        "name": "Puente lateral",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Side_Hop-Sprint",
        "name": "Sprint lateral (hop)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Side_Jackknife",
        "name": "Navaja lateral",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Side_Lateral_Raise",
        "name": "Elevación lateral",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Side_Laterals_to_Front_Raise",
        "name": "Elevación frontal lateral (laterals)",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Side_Leg_Raises",
        "name": "Elevación de piernas lateral",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Side_Lying_Groin_Stretch",
        "name": "Estiramiento de ingle lateral tumbado",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Side_Neck_Stretch",
        "name": "Estiramiento de cuello lateral",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Side_Standing_Long_Jump",
        "name": "Salto lateral de pie largo",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Side_To_Side_Chins",
        "name": "Dominadas de lado a lado",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Side_Wrist_Pull",
        "name": "Tirón de muñeca lateral",
        "muscleGroup": "Hombro",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Side_to_Side_Box_Shuffle",
        "name": "Desplazamiento lateral sobre cajón",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Single-Arm_Cable_Crossover",
        "name": "Cruce en polea a una mano en polea",
        "muscleGroup": "Pecho",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Single-Arm_Linear_Jammer",
        "name": "Jammer lineal a un brazo",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Single-Arm_Push-Up",
        "name": "Flexión a una mano",
        "muscleGroup": "Pecho",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Single-Cone_Sprint_Drill",
        "name": "Sprint (single cone drill)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Single-Leg_High_Box_Squat",
        "name": "Sentadilla al cajón a una pierna alta",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Single-Leg_Hop_Progression",
        "name": "Salto a una pierna (progression)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Single-Leg_Lateral_Hop",
        "name": "Salto a una pierna (lateral)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Single-Leg_Leg_Extension",
        "name": "Extensión de piernas a una pierna",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Single-Leg_Stride_Jump",
        "name": "Salto a una pierna (stride)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Single_Dumbbell_Raise",
        "name": "Elevación con mancuerna (single)",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Single_Leg_Butt_Kick",
        "name": "Patada a una pierna (butt)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Single_Leg_Glute_Bridge",
        "name": "Puente de glúteo a una pierna",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Single_Leg_Push-off",
        "name": "Impulso a una pierna",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Sit-Up",
        "name": "Abdominal",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Sit_Squats",
        "name": "Sentadilla (sit)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Skating",
        "name": "Patinaje",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Sled_Drag_-_Harness",
        "name": "Arrastre de trineo con arnés",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Sled_Overhead_Backward_Walk",
        "name": "Paseo por encima de la cabeza en trineo (backward)",
        "muscleGroup": "Hombro",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Sled_Overhead_Triceps_Extension",
        "name": "Extensión de tríceps por encima de la cabeza en trineo",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Sled_Push",
        "name": "Empuje de trineo",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Sled_Reverse_Flye",
        "name": "Apertura inversa en trineo",
        "muscleGroup": "Hombro",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Sled_Row",
        "name": "Remo en trineo",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Sledgehammer_Swings",
        "name": "Balanceo (sledgehammer)",
        "muscleGroup": "Core",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Smith_Incline_Shoulder_Raise",
        "name": "Elevación de hombro inclinada en máquina Smith",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Behind_the_Back_Shrug",
        "name": "Encogimiento de hombros de espalda en máquina Smith (behind)",
        "muscleGroup": "Espalda",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Bench_Press",
        "name": "Press de banca en máquina Smith",
        "muscleGroup": "Pecho",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Bent_Over_Row",
        "name": "Remo inclinado en máquina Smith",
        "muscleGroup": "Espalda",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Calf_Raise",
        "name": "Elevación de talones en máquina Smith",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Close-Grip_Bench_Press",
        "name": "Press de banca agarre cerrado en máquina Smith",
        "muscleGroup": "Brazo",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Decline_Press",
        "name": "Press declinado en máquina Smith",
        "muscleGroup": "Pecho",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Hang_Power_Clean",
        "name": "Cargada de potencia colgada en máquina Smith",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Smith_Machine_Hip_Raise",
        "name": "Elevación de cadera en máquina Smith",
        "muscleGroup": "Core",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Incline_Bench_Press",
        "name": "Press de banca inclinado en máquina Smith",
        "muscleGroup": "Pecho",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Leg_Press",
        "name": "Prensa de piernas en máquina Smith",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Smith_Machine_One-Arm_Upright_Row",
        "name": "Remo al mentón a una mano en máquina Smith",
        "muscleGroup": "Hombro",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Overhead_Shoulder_Press",
        "name": "Press de hombro por encima de la cabeza en máquina Smith",
        "muscleGroup": "Hombro",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Pistol_Squat",
        "name": "Sentadilla en máquina Smith (pistol)",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Smith_Machine_Reverse_Calf_Raises",
        "name": "Elevación de talones inversa en máquina Smith",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Squat",
        "name": "Sentadilla en máquina Smith",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Stiff-Legged_Deadlift",
        "name": "Peso muerto con una pierna en máquina Smith (stiff)",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Machine_Upright_Row",
        "name": "Remo al mentón en máquina Smith",
        "muscleGroup": "Espalda",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Smith_Single-Leg_Split_Squat",
        "name": "Sentadilla búlgara a una pierna en máquina Smith",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Snatch",
        "name": "Arrancada",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Snatch_Balance",
        "name": "Arrancada de equilibrio",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Snatch_Deadlift",
        "name": "Peso muerto (snatch)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Snatch_Pull",
        "name": "Arrancada (pull)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Snatch_Shrug",
        "name": "Encogimiento de hombros (snatch)",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Snatch_from_Blocks",
        "name": "Arrancada desde bloques",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Speed_Band_Overhead_Triceps",
        "name": "Tríceps por encima de la cabeza con banda de velocidad",
        "muscleGroup": "Brazo",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Speed_Box_Squat",
        "name": "Sentadilla al cajón (speed)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Speed_Squats",
        "name": "Sentadilla (speed)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Spell_Caster",
        "name": "Spell caster",
        "muscleGroup": "Core",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Spider_Crawl",
        "name": "Desplazamiento araña",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Spider_Curl",
        "name": "Curl araña",
        "muscleGroup": "Brazo",
        "equipment": "Barra Z",
        "level": "Principiante"
    },
    {
        "id": "Spinal_Stretch",
        "name": "Estiramiento (spinal)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Split_Clean",
        "name": "Cargada en zancada",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Split_Jerk",
        "name": "Envión en zancada",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Split_Jump",
        "name": "Salto en zancada",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Split_Snatch",
        "name": "Arrancada en zancada",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Split_Squat_with_Dumbbells",
        "name": "Sentadilla búlgara con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Split_Squats",
        "name": "Sentadilla búlgara",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Intermedio"
    },
    {
        "id": "Squat_Jerk",
        "name": "Sentadilla (jerk)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Squat_with_Bands",
        "name": "Sentadilla con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Squat_with_Chains",
        "name": "Sentadilla con cadenas",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Squat_with_Plate_Movers",
        "name": "Sentadilla con disco (movers)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Squats_-_With_Bands",
        "name": "Sentadilla con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Stairmaster",
        "name": "Escaladora (Stairmaster)",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Standing_Alternating_Dumbbell_Press",
        "name": "Press de pie alterno con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Standing_Barbell_Calf_Raise",
        "name": "Elevación de talones de pie con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Standing_Barbell_Press_Behind_Neck",
        "name": "Press de cuello de pie con barra (behind)",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Standing_Bent-Over_One-Arm_Dumbbell_Triceps_Extension",
        "name": "Extensión de tríceps de pie inclinada a una mano con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Standing_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension",
        "name": "Extensión de tríceps de pie inclinada a dos manos con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Standing_Biceps_Cable_Curl",
        "name": "Curl de bíceps de pie en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Standing_Biceps_Stretch",
        "name": "Estiramiento de bíceps de pie",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Standing_Bradford_Press",
        "name": "Press de pie (bradford)",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Standing_Cable_Chest_Press",
        "name": "Press de pecho de pie en polea",
        "muscleGroup": "Pecho",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Standing_Cable_Lift",
        "name": "Elevación en polea de pie",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Standing_Cable_Wood_Chop",
        "name": "Wood chop en polea de pie",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Standing_Calf_Raises",
        "name": "Elevación de talones de pie",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Standing_Concentration_Curl",
        "name": "Curl concentrado de pie",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Standing_Dumbbell_Calf_Raise",
        "name": "Elevación de talones de pie con mancuerna",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Standing_Dumbbell_Press",
        "name": "Press de pie con mancuerna",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Standing_Dumbbell_Reverse_Curl",
        "name": "Curl inverso de pie con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Standing_Dumbbell_Straight-Arm_Front_Delt_Raise_Above_Head",
        "name": "Elevación de deltoide posterior de pie recta frontal con mancuerna (arm above head)",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Standing_Dumbbell_Triceps_Extension",
        "name": "Extensión de tríceps de pie con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Standing_Dumbbell_Upright_Row",
        "name": "Remo al mentón de pie con mancuerna",
        "muscleGroup": "Espalda",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Standing_Elevated_Quad_Stretch",
        "name": "Estiramiento de cuádriceps de pie elevado",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Standing_Front_Barbell_Raise_Over_Head",
        "name": "Elevación de pie frontal con barra (over head)",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Standing_Gastrocnemius_Calf_Stretch",
        "name": "Estiramiento de gemelo de pie (gastrocnemius)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Standing_Hamstring_and_Calf_Stretch",
        "name": "Estiramiento de isquiotibial de gemelo de pie",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Standing_Hip_Circles",
        "name": "Círculo de cadera de pie",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Standing_Hip_Flexors",
        "name": "Flexores de cadera de pie",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Standing_Inner-Biceps_Curl",
        "name": "Curl de bíceps de pie interno",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Standing_Lateral_Stretch",
        "name": "Estiramiento de pie (lateral)",
        "muscleGroup": "Core",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Standing_Leg_Curl",
        "name": "Curl femoral de pie",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Standing_Long_Jump",
        "name": "Salto de pie largo",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Standing_Low-Pulley_Deltoid_Raise",
        "name": "Elevación de deltoides de pie baja (pulley)",
        "muscleGroup": "Hombro",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Standing_Low-Pulley_One-Arm_Triceps_Extension",
        "name": "Extensión de tríceps de pie baja a una mano (pulley)",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Standing_Military_Press",
        "name": "Press militar de pie",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Standing_Olympic_Plate_Hand_Squeeze",
        "name": "Apriete de disco olímpico de pie",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Standing_One-Arm_Cable_Curl",
        "name": "Curl de pie a una mano en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Standing_One-Arm_Dumbbell_Curl_Over_Incline_Bench",
        "name": "Curl de pie a una mano inclinado en banco con mancuerna (over)",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Standing_One-Arm_Dumbbell_Triceps_Extension",
        "name": "Extensión de tríceps de pie a una mano con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Standing_Overhead_Barbell_Triceps_Extension",
        "name": "Extensión de tríceps de pie por encima de la cabeza con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Standing_Palm-In_One-Arm_Dumbbell_Press",
        "name": "Press de pie a una mano con mancuerna (palm)",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Standing_Palms-In_Dumbbell_Press",
        "name": "Press de pie con mancuerna (palms)",
        "muscleGroup": "Hombro",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Standing_Palms-Up_Barbell_Behind_The_Back_Wrist_Curl",
        "name": "Curl de muñeca de espalda de pie palmas arriba con barra (behind)",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Standing_Pelvic_Tilt",
        "name": "Báscula pélvica de pie",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Standing_Rope_Crunch",
        "name": "Encogimiento abdominal de pie con cuerda",
        "muscleGroup": "Core",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Standing_Soleus_And_Achilles_Stretch",
        "name": "Estiramiento de pie (soleus achilles)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Standing_Toe_Touches",
        "name": "Toque de puntas de pie",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Standing_Towel_Triceps_Extension",
        "name": "Extensión de tríceps de pie (towel)",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Standing_Two-Arm_Overhead_Throw",
        "name": "Lanzamiento de pie a dos manos por encima de la cabeza",
        "muscleGroup": "Hombro",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Star_Jump",
        "name": "Salto (star)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Step-up_with_Knee_Raise",
        "name": "Subida al cajón de rodilla (raise)",
        "muscleGroup": "Pierna",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Step_Mill",
        "name": "Escalera mecánica (Step mill)",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Intermedio"
    },
    {
        "id": "Stiff-Legged_Barbell_Deadlift",
        "name": "Peso muerto con una pierna con barra (stiff)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Stiff-Legged_Dumbbell_Deadlift",
        "name": "Peso muerto con una pierna con mancuerna (stiff)",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Stiff_Leg_Barbell_Good_Morning",
        "name": "Buenos días piernas rígidas con barra",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Stomach_Vacuum",
        "name": "Vacío abdominal",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Straight-Arm_Dumbbell_Pullover",
        "name": "Pullover recto con mancuerna (arm)",
        "muscleGroup": "Pecho",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Straight-Arm_Pulldown",
        "name": "Jalón recto (arm)",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Straight_Bar_Bench_Mid_Rows",
        "name": "Remo recto en banco con barra (mid)",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Straight_Raises_on_Incline_Bench",
        "name": "Elevación recta inclinada en banco",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Stride_Jump_Crossover",
        "name": "Cruce en polea (stride jump)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Sumo_Deadlift",
        "name": "Peso muerto sumo",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Sumo_Deadlift_with_Bands",
        "name": "Peso muerto sumo con banda elástica",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Sumo_Deadlift_with_Chains",
        "name": "Peso muerto sumo con cadenas",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Superman",
        "name": "Superman",
        "muscleGroup": "Espalda",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Supine_Chest_Throw",
        "name": "Lanzamiento de pecho en supino",
        "muscleGroup": "Brazo",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Supine_One-Arm_Overhead_Throw",
        "name": "Lanzamiento en supino a una mano por encima de la cabeza",
        "muscleGroup": "Core",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Supine_Two-Arm_Overhead_Throw",
        "name": "Lanzamiento en supino a dos manos por encima de la cabeza",
        "muscleGroup": "Core",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Suspended_Fallout",
        "name": "Fallout en suspensión (rueda/TRX)",
        "muscleGroup": "Core",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Suspended_Push-Up",
        "name": "Flexión en suspensión",
        "muscleGroup": "Pecho",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Suspended_Reverse_Crunch",
        "name": "Encogimiento abdominal en suspensión inverso",
        "muscleGroup": "Core",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Suspended_Row",
        "name": "Remo en suspensión",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Suspended_Split_Squat",
        "name": "Sentadilla búlgara en suspensión",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Svend_Press",
        "name": "Press (svend)",
        "muscleGroup": "Pecho",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "T-Bar_Row_with_Handle",
        "name": "Remo con barra (t handle)",
        "muscleGroup": "Espalda",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Tate_Press",
        "name": "Press (tate)",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "The_Straddle",
        "name": "El straddle (apertura de piernas)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Thigh_Abductor",
        "name": "Abductor de cadera (máquina)",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Thigh_Adductor",
        "name": "Aductor de cadera (máquina)",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Tire_Flip",
        "name": "Volteo de neumático",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Toe_Touchers",
        "name": "Toques de puntas de pie",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Torso_Rotation",
        "name": "Rotación (torso)",
        "muscleGroup": "Core",
        "equipment": "Fitball",
        "level": "Principiante"
    },
    {
        "id": "Trail_Running_Walking",
        "name": "Carrera / marcha por montaña",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Trap_Bar_Deadlift",
        "name": "Peso muerto con barra hexagonal",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Tricep_Dumbbell_Kickback",
        "name": "Patada de tríceps de tríceps con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Tricep_Side_Stretch",
        "name": "Estiramiento de tríceps lateral",
        "muscleGroup": "Brazo",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Triceps_Overhead_Extension_with_Rope",
        "name": "Extensión de tríceps por encima de la cabeza con cuerda",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Triceps_Pushdown",
        "name": "Extensión de tríceps en polea",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Triceps_Pushdown_-_Rope_Attachment",
        "name": "Extensión de tríceps en polea con accesorio con cuerda",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Triceps_Pushdown_-_V-Bar_Attachment",
        "name": "Extensión de tríceps en polea con accesorio con barra (v)",
        "muscleGroup": "Brazo",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Triceps_Stretch",
        "name": "Estiramiento de tríceps",
        "muscleGroup": "Brazo",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Tuck_Crunch",
        "name": "Encogimiento abdominal (tuck)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Two-Arm_Dumbbell_Preacher_Curl",
        "name": "Curl en banco Scott a dos manos con mancuerna",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Two-Arm_Kettlebell_Clean",
        "name": "Cargada a dos manos con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Two-Arm_Kettlebell_Jerk",
        "name": "Envión a dos manos con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Two-Arm_Kettlebell_Military_Press",
        "name": "Press militar a dos manos con pesa rusa",
        "muscleGroup": "Hombro",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Two-Arm_Kettlebell_Row",
        "name": "Remo a dos manos con pesa rusa",
        "muscleGroup": "Espalda",
        "equipment": "Pesas rusas",
        "level": "Intermedio"
    },
    {
        "id": "Underhand_Cable_Pulldowns",
        "name": "Jalón agarre supino en polea",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Upper_Back-Leg_Grab",
        "name": "Agarre de pierna espalda alta",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Upper_Back_Stretch",
        "name": "Estiramiento de espalda (upper)",
        "muscleGroup": "Espalda",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "Upright_Barbell_Row",
        "name": "Remo con barra (upright)",
        "muscleGroup": "Hombro",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Upright_Cable_Row",
        "name": "Remo en polea (upright)",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Upright_Row_-_With_Bands",
        "name": "Remo al mentón con banda elástica",
        "muscleGroup": "Espalda",
        "equipment": "Bandas",
        "level": "Principiante"
    },
    {
        "id": "Upward_Stretch",
        "name": "Estiramiento (upward)",
        "muscleGroup": "Hombro",
        "equipment": null,
        "level": "Principiante"
    },
    {
        "id": "V-Bar_Pulldown",
        "name": "Jalón con barra (v)",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "V-Bar_Pullup",
        "name": "Dominada con barra en V",
        "muscleGroup": "Espalda",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Vertical_Swing",
        "name": "Balanceo (vertical)",
        "muscleGroup": "Pierna",
        "equipment": "Mancuerna",
        "level": "Principiante"
    },
    {
        "id": "Walking_Treadmill",
        "name": "Caminar en cinta",
        "muscleGroup": "Pierna",
        "equipment": "Máquina",
        "level": "Principiante"
    },
    {
        "id": "Weighted_Ball_Hyperextension",
        "name": "Hiperextensión con lastre (ball)",
        "muscleGroup": "Espalda",
        "equipment": "Fitball",
        "level": "Intermedio"
    },
    {
        "id": "Weighted_Ball_Side_Bend",
        "name": "Flexión lateral de tronco con balón lastrado",
        "muscleGroup": "Core",
        "equipment": "Fitball",
        "level": "Intermedio"
    },
    {
        "id": "Weighted_Bench_Dip",
        "name": "Fondo con lastre en banco",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Weighted_Crunches",
        "name": "Encogimiento abdominal con lastre",
        "muscleGroup": "Core",
        "equipment": "Balón medicinal",
        "level": "Principiante"
    },
    {
        "id": "Weighted_Jump_Squat",
        "name": "Sentadilla con lastre (jump)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Weighted_Pull_Ups",
        "name": "Dominada con lastre",
        "muscleGroup": "Espalda",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Weighted_Sissy_Squat",
        "name": "Sentadilla con lastre (sissy)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Weighted_Sit-Ups_-_With_Bands",
        "name": "Abdominal con lastre con banda elástica",
        "muscleGroup": "Core",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Weighted_Squat",
        "name": "Sentadilla con lastre",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Wide-Grip_Barbell_Bench_Press",
        "name": "Press de banca agarre ancho con barra",
        "muscleGroup": "Pecho",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Wide-Grip_Decline_Barbell_Bench_Press",
        "name": "Press de banca agarre ancho declinado con barra",
        "muscleGroup": "Pecho",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Wide-Grip_Decline_Barbell_Pullover",
        "name": "Pullover agarre ancho declinado con barra",
        "muscleGroup": "Pecho",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Wide-Grip_Lat_Pulldown",
        "name": "Jalón al pecho agarre ancho",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Principiante"
    },
    {
        "id": "Wide-Grip_Pulldown_Behind_The_Neck",
        "name": "Jalón de cuello agarre ancho (behind)",
        "muscleGroup": "Espalda",
        "equipment": "Polea",
        "level": "Intermedio"
    },
    {
        "id": "Wide-Grip_Rear_Pull-Up",
        "name": "Dominada agarre ancha posterior",
        "muscleGroup": "Espalda",
        "equipment": "Peso corporal",
        "level": "Intermedio"
    },
    {
        "id": "Wide-Grip_Standing_Barbell_Curl",
        "name": "Curl agarre ancho de pie con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Wide_Stance_Barbell_Squat",
        "name": "Sentadilla postura ancha con barra",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Wide_Stance_Stiff_Legs",
        "name": "Peso muerto piernas rígidas postura ancha",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Intermedio"
    },
    {
        "id": "Wind_Sprints",
        "name": "Sprint (wind)",
        "muscleGroup": "Core",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Windmills",
        "name": "Molino",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Intermedio"
    },
    {
        "id": "Worlds_Greatest_Stretch",
        "name": "Estiramiento (world's greatest)",
        "muscleGroup": "Pierna",
        "equipment": null,
        "level": "Intermedio"
    },
    {
        "id": "Wrist_Circles",
        "name": "Círculo de muñeca",
        "muscleGroup": "Brazo",
        "equipment": "Peso corporal",
        "level": "Principiante"
    },
    {
        "id": "Wrist_Roller",
        "name": "Rodillo de muñeca",
        "muscleGroup": "Brazo",
        "equipment": "Otro",
        "level": "Principiante"
    },
    {
        "id": "Wrist_Rotations_with_Straight_Bar",
        "name": "Rotación de muñeca recta con barra",
        "muscleGroup": "Brazo",
        "equipment": "Barra",
        "level": "Principiante"
    },
    {
        "id": "Yoke_Walk",
        "name": "Paseo (yoke)",
        "muscleGroup": "Pierna",
        "equipment": "Otro",
        "level": "Intermedio"
    },
    {
        "id": "Zercher_Squats",
        "name": "Sentadilla (zercher)",
        "muscleGroup": "Pierna",
        "equipment": "Barra",
        "level": "Experto"
    },
    {
        "id": "Zottman_Curl",
        "name": "Curl Zottman",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    },
    {
        "id": "Zottman_Preacher_Curl",
        "name": "Curl en banco Scott (zottman)",
        "muscleGroup": "Brazo",
        "equipment": "Mancuerna",
        "level": "Intermedio"
    }
];
