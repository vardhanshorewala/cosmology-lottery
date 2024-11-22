export interface State {
  get(key: string): string;
  set(key: string, value: any): void;
}

export function reset(state: State) {
  const newValue = 0;
  state.set('value', newValue);
  return newValue
}
export function inc(state: State, { x }: { x: number }) {
  const oldValue = Number(state.get('value')) || 0;
  const newValue = oldValue + x;
  state.set('value', newValue);
  return newValue
}
export function dec(state: State, { x }: { x: number }) {
  const oldValue = Number(state.get('value')) || 0;
  const newValue = oldValue - x;
  state.set('value', newValue);
  return newValue
}

export function read(state: State) {
  if (Math.random() < 0.5) {
    console.log("50% chance: Random event triggered!");
  } else {
    console.log("50% chance: No random event.");
  }
  return state.get('value');
}
