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
const INITIAL_TEAM_REVIVES = 4;
const ROUNDS_TO_WIN = 2; // the first team to 2 rounds won will win the game
const MAX_ROUNDS = 7; // pigeonhole principle: if no team has 2 rounds won, all teams lose
const ROUND_TIMER_SECS = 60 * 10;
const SUDDEN_DEATH_TIMER_SECS = 60 * 2;

const TeamIdMapping: { [key: number]: string } = {
  0: "Alfa",
  1: "Bravo",
  2: "Charlie",
  3: "Delta",
  4: "Echo",
  5: "Foxtrot",
};

// Enums
type TeamMap = Map<number, Team>;
type PlayerMap = Map<number, Player>;

// Classes
class Team {
  teamId: number;
  teamName: string;
  teamScore: number;
  teamRevivesLeft: number;
  teamPlayersAlive: number;
  teamEliminated: boolean;

  constructor(teamId: number) {
    this.teamId = teamId;
    this.teamName = TeamIdMapping[teamId] ?? "Unknown";
    this.teamScore = 0;
    this.teamRevivesLeft = INITIAL_TEAM_REVIVES;
    this.teamPlayersAlive = 4;
    this.teamEliminated = false;
  }

  gameReset() {
    this.teamScore = 0;
    this.teamRevivesLeft = INITIAL_TEAM_REVIVES;
    this.teamPlayersAlive = 4;
    this.teamEliminated = false;
  }

  roundReset() {
    this.teamRevivesLeft = INITIAL_TEAM_REVIVES;
    this.teamPlayersAlive = 4;
    this.teamEliminated = false;
  }

  handleTeamElimination() {
    this.teamEliminated = true;
  }

  handleTeamRevive() {
    this.teamRevivesLeft--;
    this.teamPlayersAlive++;
  }

  handleTeamDeath() {
    this.teamPlayersAlive--;
    if (this.teamPlayersAlive == 0) {
      this.handleTeamElimination();
    }
  }

  hasTeamRevivesLeft() {
    return this.teamRevivesLeft > 0;
  }

  hasTeamPlayersAlive() {
    return this.teamPlayersAlive > 0;
  }

  isTeamEliminated() {
    return this.teamEliminated;
  }

  addRoundWin() {
    this.teamScore++;
  }

  hasWonGame() {
    return this.teamScore >= ROUNDS_TO_WIN;
  }
}

class Player {
  playerId: number;
  playerName: string;
  playerTeam: number;
  playerAlive: boolean;
  playerPinged: boolean;

  constructor(playerId: number) {
    this.playerId = playerId;
    this.playerName = "";
    this.playerTeam = -1;
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

  canBeRevived(teams: Map<number, Team>) {
    if (this.playerAlive) return false;

    const playerTeam = teams.get(this.playerTeam);
    if (!playerTeam) return false;

    return playerTeam.hasTeamRevivesLeft() && playerTeam.hasTeamPlayersAlive();
  }

  setPlayerPinged(isPinged: boolean) {
    this.playerPinged = isPinged;
  }
}

// Game state
class GameState {
  gameStarted: boolean;
  gameEnded: boolean;
  gameRound: number;
  teams: TeamMap = new Map();
  players: PlayerMap = new Map();
  roundStarted: boolean;
  roundEnded: boolean;
  roundTimerSecs: number;
  roundInSuddenDeath: boolean;

  constructor() {
    this.gameStarted = false;
    this.gameEnded = false;
    this.gameRound = -1;
    this.teams = new Map();
    this.players = new Map();
    this.roundStarted = false;
    this.roundEnded = false;
    this.roundTimerSecs = 0;
    this.roundInSuddenDeath = false;
  }

  startGame() {
    this.gameStarted = true;
    this.gameEnded = false;
  }

  endGame() {
    this.gameStarted = false;
    this.gameEnded = true;
    this.gameRound = -1;
  }

  startNewRound(roundNumber: number) {
    this.gameRound = roundNumber;
    this.roundStarted = true;
    this.roundEnded = false;
    this.roundTimerSecs = 0;
    this.roundInSuddenDeath = false;

    this.teams.forEach(team => team.roundReset());
    this.players.forEach(player => player.setPlayerPinged(false));
  }

  endRound() {
    if (!this.roundStarted) console.debug("Tried to end round when round was not started");
    this.roundStarted = false;
    this.roundEnded = true;
  }

  roundEnterSuddenDeath() {
    this.roundInSuddenDeath = true;
    this.players.forEach(player => player.setPlayerPinged(true));
  }

  getAliveTeams(): Team[] {
    return Array.from(this.teams.values()).filter(s => !s.isTeamEliminated());
  }

  getTeamById(teamId: number): Team | undefined {
    return this.teams.get(teamId);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }
}

const game = new GameState();

// Player events
export function OnPlayerJoinGame(eventPlayer: mod.Player): void {}

export function OnPlayerLeaveGame(eventNumber: number): void {}

export function OnPlayerDeployed(eventPlayer: mod.Player): void {}

export function OnPlayerDied(
  eventPlayer: mod.Player,
  eventOtherPlayer: mod.Player,
  eventDeathType: mod.DeathType,
  eventWeaponUnlock: mod.WeaponUnlock
): void {}

// Game events
export async function OnGameModeStarted() {
  game.startGame();

  let roundNumber = 0;
  while (roundNumber < MAX_ROUNDS) {
    game.startNewRound(roundNumber);
    roundNumber++;
  }
}

export function OnGameModeEnding(): void {}

export function OngoingGlobal(): void {}
