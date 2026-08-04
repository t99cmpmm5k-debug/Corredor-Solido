import { week } from "./planData";

export let selectedWorkout = week.find(
    workout => workout.status === "today"
);

export function setSelectedWorkout(workout){

    selectedWorkout = workout;

}