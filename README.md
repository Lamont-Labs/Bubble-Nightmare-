# Bubble Nightmare

Bubble Nightmare is a one-thumb scarecrow-family arcade game. Swipe through
three or more matching bubbles, keep cursed bubbles away from the family, and
use each family member's special move once per round.

## Android download

The repository workflow builds a standalone APK on pushes to `main`
and when manually started from GitHub Actions. No development server is needed
to play the installed game.

1. Open the repository's **Releases** page.
2. Open the newest successful Android preview release.
3. Under **Assets**, download `Bubble-Nightmare.apk`.
4. Open the APK on the Android phone. If Android asks, allow installation from
   the browser or file manager used to open it.

The same APK is also saved as an Actions artifact for 30 days. That artifact is a
ZIP archive, so extract it before opening the APK.

The APK is a direct-install preview signed with a development key, not a
Play Store release. Use a private production signing key before store distribution.
