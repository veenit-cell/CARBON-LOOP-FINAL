# Components

`Shell.tsx` is the whole game client: HUD, mission board, completion receipt,
reward shelf, leaderboard, and the dashboard view. It renders from `lib/game.ts`
state only, so no value on screen is hardcoded.

Routes are thin: `/demo` renders `<Shell />`, `/dashboard` renders
`<Shell dashboard />`. Both read the same browser save, so progress is shared.
