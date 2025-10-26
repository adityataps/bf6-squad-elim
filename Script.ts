/**
 * Squad Elimination
 *
 * Rules:
 * - Six teams/squads with 4 players (1 squad) each; backfilled by AI
 * - Friendly fire on, squad revives on
 * - Only 4 revives per squad; players can revive only on alive squad members
 * - Best out of seven rounds: first team to two rounds wins
 * - If no winner out of seven rounds, all teams lose
 * - 10min timer; 2min sudden death timer
 * - Sudden death: all players pinged on the map, first squad death eliminates entire squad
 * - One map per game, shuffled spawn points every round
 */

const GAME_NAME = "Squad Elim";
const VERSION = [0, 0, 0];

// Logistics
const MINIMUM_PLAYERS_TO_START = 1;
const INITIAL_SQUAD_REVIVES = 4;
const ROUNDS_TO_WIN = 2; // the first team to 2 rounds won will win the game
const MAX_ROUNDS = 7; // pigeonhole principle: if no team has 2 rounds won, all teams lose
const ROUND_BASE_TIMER_SECS = 60 * 10;
const SUDDEN_DEATH_TIMER_SECS = 60 * 2;

const SquadIdMapping: { [key: number]: string } = {
  0: "Alfa",
  1: "Bravo",
  2: "Charlie",
  3: "Delta",
  4: "Echo",
  5: "Foxtrot",
};

// Enums
type SquadMap = Map<number, Squad>;
type PlayerMap = Map<number, Player>;

// Classes
class Squad {
  squadId: number;
  squadName: string;
  squadScore: number;
  squadRevivesLeft: number;
  squadPlayersAlive: number;
  squadEliminated: boolean;

  constructor(squadId: number) {
    this.squadId = squadId;
    this.squadName = SquadIdMapping[squadId] ?? "Unknown";
    this.squadScore = 0;
    this.squadRevivesLeft = INITIAL_SQUAD_REVIVES;
    this.squadPlayersAlive = 4;
    this.squadEliminated = false;
  }

  gameReset() {
    this.squadScore = 0;
    this.squadRevivesLeft = INITIAL_SQUAD_REVIVES;
    this.squadPlayersAlive = 4;
    this.squadEliminated = false;
  }

  roundReset() {
    this.squadRevivesLeft = INITIAL_SQUAD_REVIVES;
    this.squadPlayersAlive = 4;
    this.squadEliminated = false;
  }

  handleSquadElimination() {
    this.squadEliminated = true;
  }

  handleSquadRevive() {
    this.squadRevivesLeft--;
    this.squadPlayersAlive++;
  }

  handleSquadDeath() {
    this.squadPlayersAlive--;
    if (this.squadPlayersAlive == 0) {
      this.handleSquadElimination();
    }
  }

  hasSquadRevivesLeft() {
    return this.squadRevivesLeft > 0;
  }

  hasSquadPlayersAlive() {
    return this.squadPlayersAlive > 0;
  }

  isSquadEliminated() {
    return this.squadEliminated;
  }

  addRoundWin() {
    this.squadScore++;
  }

  hasWonGame() {
    return this.squadScore >= ROUNDS_TO_WIN;
  }
}

class Player {
  playerId: number;
  playerName: string;
  playerSquad: number;
  playerAlive: boolean;
  playerPinged: boolean;

  constructor(playerId: number) {
    this.playerId = playerId;
    this.playerName = "";
    this.playerSquad = -1;
    this.playerAlive = true;
    this.playerPinged = false;
  }

  handlePlayerDeath() {
    this.playerAlive = false;
  }

  handlePlayerRevive() {
    this.playerAlive = true;
  }

  isPlayerAlive() {
    return this.playerAlive;
  }

  canBeRevived(squads: Map<number, Squad>) {
    if (this.playerAlive) return false;

    const playerSquad = squads.get(this.playerSquad);
    if (!playerSquad) return false;

    return playerSquad.hasSquadRevivesLeft() && playerSquad.hasSquadPlayersAlive();
  }

  setPlayerPinged() {
    this.playerPinged = true;
  }
}

// Game state
class GameState {
  gameStarted: boolean;
  gameEnded: boolean;
  gameRound: number;
  gameTimerSecs: number;
  squads: SquadMap = new Map();
  players: PlayerMap = new Map();

  constructor() {
    this.gameStarted = false;
    this.gameEnded = false;
    this.gameRound = -1;
    this.gameTimerSecs = 0;
    this.squads = new Map();
    this.players = new Map();
  }

  startGame() {
    this.gameStarted = true;
    this.gameEnded = false;
    this.gameRound = 0;
  }

  endGame() {
    this.gameStarted = false;
    this.gameEnded = true;
    this.gameRound = -1;
  }

  getAliveSquads(): Squad[] {
    return Array.from(this.squads.values()).filter(s => !s.isSquadEliminated());
  }

  getSquadById(squadId: number): Squad | undefined {
    return this.squads.get(squadId);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }
}

// Round state

class RoundState {
  roundStarted: boolean;
  roundEnded: boolean;
  roundNumber: number;
  roundTimerSecs: number;
  roundSquads: Map<number, Squad> = new Map();
  roundPlayers: Map<number, Player> = new Map();
  isSuddenDeath: boolean;

  constructor() {
    this.roundStarted = false;
    this.roundEnded = false;
    this.roundNumber = -1;
    this.roundTimerSecs = 0;
    this.roundSquads = new Map();
    this.roundPlayers = new Map();
    this.isSuddenDeath = false;
  }

  startNewRound(roundNumber: number) {
    if (roundNumber < 0 || roundNumber > MAX_ROUNDS)
      throw new Error(`Invalid round number: ${roundNumber}`);

    this.roundNumber = roundNumber;
    this.roundStarted = true;
    this.roundEnded = false;
    this.roundTimerSecs = 0;
    this.isSuddenDeath = false;
  }

  endRound() {
    this.roundStarted = false;
    this.roundEnded = true;
  }
}

let roundTimerSecs = 0;
let isSuddenDeath = false;
