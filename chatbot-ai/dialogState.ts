// Simple dialog state management for a single-page session.
export type DialogState = "idle" | "onboarding" | "search" | "free";

let state: DialogState = "idle";

export function getState(): DialogState {
	return state;
}

export function setState(next: DialogState) {
	state = next;
}

export function resetState() {
	state = "idle";
}

export default {
	getState,
	setState,
	resetState,
};
