// src/contract1/index.ts
function reset(state) {
  const newValue = 0;
  state.set("value", newValue);
  return newValue;
}
function inc(state, { x }) {
  const oldValue = Number(state.get("value")) || 0;
  const newValue = oldValue + x;
  state.set("value", newValue);
  return newValue;
}
function dec(state, { x }) {
  const oldValue = Number(state.get("value")) || 0;
  const newValue = oldValue - x;
  state.set("value", newValue);
  return newValue;
}
function read(state) {
  if (Math.random() < 0.5) {
    console.log("50% chance: Random event triggered!");
  } else {
    console.log("50% chance: No random event.");
  }
  return state.get("value");
}
export {
  dec,
  inc,
  read,
  reset
};
//# sourceMappingURL=bundle1.js.map
