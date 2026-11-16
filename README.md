# Bubble Nightmare

Bubble Nightmare is a scarecrow-family match-3 puzzle game. Aim and launch
bubbles into connected same-color groups, then complete each level's goal before
you run out of moves. All four family members have a special power.

## How to play

- Drag across the board to aim, then release to shoot.
- Match three or more connected bubbles of the same color.
- Bubbles no longer attached to the top fall away after a match.
- Tap **Swap** to switch the loaded bubble with the next one.
- Finish the level goal using the limited number of moves.
- Use Dad, Mom, Rabbit, and Pig's one-time powers when they can help most.

## Android download

The repository workflow builds a standalone APK on pushes to `main`
and when manually started from GitHub Actions. No development server is needed
to play the installed game.

1. Open the repository's **Releases** page.
2. Open the newest successful Android preview release.
3. Under **Assets**, download `Bubble-Nightmare.apk`.
4. Open the APK on the Android phone. If Android asks, allow installation from
   the browser or file manager used to open it.

The same APK is also saved as an Actions artifact for 30 days.

The APK is a direct-install preview signed with a development key, not a
Play Store release. Use a private production signing key before store distribution.
