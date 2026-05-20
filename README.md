# One Must Fall Web

One Must Fall Web is a 1-on-1 2D fighter inspired by One Must Fall 2097 and fully playable in the browser.

## Getting Started

```bash
npm install
npm run dev
```

Then open the URL printed by Vite (default: `http://localhost:5173`).

## Controls (Quick Match — Player 1)

| Action | Keys |
|--------|------|
| Move   | Arrow keys or A / D |
| Jump   | Arrow Up, W, or Space |
| Attack | Z or J |
| Block  | Arrow Down or S (hold) |

## Main Menu

The main menu contains 4 items:

1. Single Player (Campaign)
2. Quick Match (Local Only)
3. Multiplayer (Online Only)
4. Leaderboard

## Quick Match Flow

1. Player selects **Quick Match**.
2. Player chooses a mech from **10 available mechs**.
3. Player selects an arena.
4. CPU automatically selects an opponent mech.
5. Match loads into the selected arena.

## In-Match HUD and Defense Behavior

- Top-left: player health and defense points.
- Top-right: opponent health and defense points.
- When defense points are depleted, the fighter becomes defenseless for a short period before defense can recover.
