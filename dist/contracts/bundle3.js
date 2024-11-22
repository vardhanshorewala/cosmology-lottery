// src/lottery/sdk.ts
function useStore(key, defaultValue) {
  return (state) => [
    () => state.get(key) ?? defaultValue,
    (value) => state.set(key, value)
  ];
}
function useMapping(keys, defaultValue) {
  return (state) => [
    (...args) => {
      const interleavedKey = [keys[0]];
      const pathKeys = keys.slice(1);
      for (let i = 0; i < pathKeys.length; i++) {
        interleavedKey.push(pathKeys[i], args[i]);
      }
      return state.get(interleavedKey.join("/")) ?? defaultValue;
    },
    (...args) => {
      const interleavedKey = [keys[0]];
      const pathKeys = keys.slice(1);
      const keyArgs = args.slice(0, -1);
      for (let i = 0; i < pathKeys.length; i++) {
        interleavedKey.push(pathKeys[i], keyArgs[i]);
      }
      state.set(interleavedKey.join("/"), args[args.length - 1]);
    }
  ];
}

// src/lottery/lotto.ts
import { sendCoins } from "~bank";
var pool = useStore("pool", 0);
var participantStatus = useMapping(["participantStatus"], false);
var participants = useStore("participants", []);
var winner = useStore("winner", "");
var Contract = class {
  msg;
  address;
  pool;
  setPool;
  participantStatus;
  setParticipantStatus;
  participants;
  setParticipants;
  winner;
  setWinner;
  constructor(state, { msg, address }) {
    this.msg = msg;
    this.address = address;
    [this.pool, this.setPool] = pool(state);
    [this.participantStatus, this.setParticipantStatus] = participantStatus(state);
    [this.participants, this.setParticipants] = participants(state);
    [this.winner, this.setWinner] = winner(state);
  }
  // Public methods
  getTotalPool() {
    return this.pool();
  }
  getParticipantStatus(address) {
    return this.participantStatus(address);
  }
  getParticipants() {
    return this.participants();
  }
  getWinner() {
    return this.winner();
  }
  // Add a participant to the lottery
  #addParticipant(address) {
    if (this.winner() !== "") {
      throw new Error("A winner has already been drawn.");
    }
    const currentParticipants = this.participants();
    if (currentParticipants.includes(address)) {
      throw new Error(`This address has already entered the lottery`);
    }
    currentParticipants.push(address);
    this.setParticipants(currentParticipants);
    this.setParticipantStatus(address, true);
  }
  // Pick a winner randomly from the participants
  #pickWinner() {
    const currentParticipants = this.participants();
    if (currentParticipants.length === 0) {
      throw new Error("No participants available to pick a winner.");
    }
    if (this.winner() !== "") {
      return this.winner();
    }
    const randomIndex = Math.floor(Math.random() * currentParticipants.length);
    const winnerAddress = currentParticipants[randomIndex];
    this.setWinner(winnerAddress);
    return winnerAddress;
  }
  // Deposit funds into the lottery pool
  deposit(amount) {
    const sender = this.msg.sender;
    if (amount <= 0) {
      throw new Error("Deposit amount must be greater than zero.");
    }
    sendCoins(sender, this.address, { uusdc: amount });
    this.#deposit(amount);
  }
  #deposit(amount) {
    const currentPool = this.pool();
    this.setPool(currentPool + amount);
  }
  enterLottery({ entryFee }) {
    if (entryFee < 1e4) {
      throw Error("Entry fee is too low.");
    }
    const sender = this.msg.sender;
    if (this.winner() !== "") {
      throw new Error("A winner has already been drawn.");
    }
    const currentParticipants = this.getParticipants();
    if (currentParticipants.includes(sender)) {
      const allParticipants = this.getParticipants();
      throw new Error(
        `Address ${sender} has already entered the lottery. Current participants: ${JSON.stringify(allParticipants)}.`
      );
    }
    sendCoins(sender, this.address, { uusdc: 1e4 });
    this.#addParticipant(sender);
    this.#deposit(entryFee);
    return true;
  }
  drawWinner() {
    const winnerAddress = this.#pickWinner();
    const prizeAmount = this.pool();
    if (prizeAmount === 0) {
      throw new Error("The pool is empty. No prize to distribute.");
    }
    sendCoins(this.address, winnerAddress, { uusdc: prizeAmount });
    this.setParticipants([]);
    this.setPool(0);
    return winnerAddress;
  }
};

// src/lottery/index.ts
var lottery_default = Contract;
export {
  Contract,
  lottery_default as default,
  useMapping,
  useStore
};
//# sourceMappingURL=bundle3.js.map
