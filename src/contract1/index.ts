interface MyState {
  value: number;
}

export function reset(state: MyState) {
  const newValue = 0;
  state.set('value', 0);
  return newValue
}
export function inc(state: MyState, {x}) {
  const oldValue = state.get('value') ?? 0;
  const newValue = oldValue + x;
  state.set('value', newValue);
  return newValue
}
export function dec(state: MyState, {x}) {
  const oldValue = state.get('value') ?? 0;
  const newValue = oldValue - x;
  state.set('value', newValue);
  return newValue
}

export function read(state: MyState) {
  return state.get('value');
}