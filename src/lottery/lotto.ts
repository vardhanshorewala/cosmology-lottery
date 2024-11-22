import { getBalance, sendCoins } from '~bank';
import { useMapping, useStore } from './sdk';
import { MappingStore, Msg, State, Store } from './type';

// State variables
const pool: Store<number> = useStore('pool', 0);
const participantStatus: MappingStore<[string], boolean> = useMapping(['participantStatus'], false);
const participants: Store<string[]> = useStore('participants', []);
const winner: Store<string> = useStore('winner', '');

export class Contract {
  msg: Msg;
  address: string;
  pool: () => number;
  setPool: (value: number) => void;
  participantStatus: (address: string) => boolean;
  setParticipantStatus: (address: string, value: boolean) => void;
  participants: () => string[];
  setParticipants: (value: string[]) => void;
  winner: () => string;
  setWinner: (value: string) => void;

  constructor(state: State, { msg, address }: { msg: Msg; address: string }) {
    this.msg = msg;
    this.address = address;

    [this.pool, this.setPool] = pool(state);
    [this.participantStatus, this.setParticipantStatus] = participantStatus(state);
    [this.participants, this.setParticipants] = participants(state);
    [this.winner, this.setWinner] = winner(state);
  }

  // Public methods
  getTotalPool(): number {
    return this.pool();
  }

  getParticipantStatus(address: string): boolean {
    return this.participantStatus(address);
  }

  getParticipants(): string[] {
    return this.participants();
  }

  getWinner(): string {
    return this.winner();
  }

  // Add a participant to the lottery
  #addParticipant(address: string) {
    if (this.winner() !== '') {
      throw new Error('A winner has already been drawn.');
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
  #pickWinner(): string {
    const currentParticipants = this.participants();
    if (currentParticipants.length === 0) {
      throw new Error('No participants available to pick a winner.');
    }

    if (this.winner() !== '') {
      return this.winner();
    }
    
    const randomIndex = Math.floor(Math.random() * currentParticipants.length);
    const winnerAddress = currentParticipants[randomIndex];
    this.setWinner(winnerAddress);
    return winnerAddress;
  }

  // Deposit funds into the lottery pool
  deposit(amount: number) {
    const sender = this.msg.sender;
    if (amount <= 0) {
      throw new Error('Deposit amount must be greater than zero.');
    }
    sendCoins(sender, this.address, { uusdc: amount });
    this.#deposit(amount);
  }

  #deposit(amount: number) {
    const currentPool = this.pool();
    this.setPool(currentPool + amount);
  }

  enterLottery({entryFee}: {entryFee: number}): Boolean {
    if (entryFee < 10000) {
      throw Error('Entry fee is too low.');
    }

    const sender = this.msg.sender;

    if (this.winner() !== '') {
      throw new Error('A winner has already been drawn.');
    }

    const currentParticipants = this.getParticipants();

    if (currentParticipants.includes(sender)) {
        const allParticipants = this.getParticipants();
        throw new Error(
        `Address ${sender} has already entered the lottery. Current participants: ${JSON.stringify(allParticipants)}.`
        );
    }   

    sendCoins(sender, this.address, { uusdc: entryFee });
    this.#addParticipant(sender);
    this.#deposit(entryFee);

    return true;
  }

  drawWinner(): string {
    const winnerAddress = this.#pickWinner();
    const prizeAmount = this.pool();


    if (prizeAmount === 0) {
      throw new Error('The pool is empty. No prize to distribute.');
    }

    sendCoins(this.address, winnerAddress, { uusdc: prizeAmount });

    this.setParticipants([]);
    this.setPool(0);

    return winnerAddress;
  }
}
