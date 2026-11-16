import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  BUBBLE_COLORS,
  LEVELS,
  blastLargestCluster,
  cellCenter,
  createLevelBoard,
  getLevel,
  isGoalComplete,
  randomColor,
  removeLowestRow,
  resolveShot,
  traceAim,
  type AimResult,
  type Bubble,
  type BubbleColor,
  type Level,
  type Point,
} from "@/game/engine";
import { FAMILY, NIGHT_COLORS, type FamilyKey } from "@/constants/game";

type Screen = "menu" | "levels" | "help" | "game";
type RunStatus = "playing" | "won" | "lost";
type Usage = Record<FamilyKey, boolean>;

interface RunState {
  level: Level;
  bubbles: Bubble[];
  currentColor: BubbleColor;
  nextColor: BubbleColor;
  currentWild: boolean;
  movesLeft: number;
  poppedCount: number;
  clearedCurses: number;
  score: number;
  usedPowers: Usage;
  status: RunStatus;
  stars: number;
}

interface Progress {
  unlocked: number;
  stars: Record<number, number>;
}

const PROGRESS_KEY = "bubble-nightmare-match-progress";
const freshUsage = (): Usage => ({
  dad: false,
  mom: false,
  rabbit: false,
  pig: false,
});

function pointFromEvent(event: GestureResponderEvent): Point {
  return {
    x: event.nativeEvent.locationX,
    y: event.nativeEvent.locationY,
  };
}

function goalLabel(level: Level): string {
  if (level.goal === "curses") return "CLEAR CURSED BUBBLES";
  if (level.goal === "clear") return "CLEAR THE BOARD";
  return "POP BUBBLES";
}

function goalValue(run: RunState): string {
  if (run.level.goal === "curses") {
    return `${run.clearedCurses} / ${run.level.target}`;
  }
  if (run.level.goal === "clear") {
    return `${run.bubbles.length} LEFT`;
  }
  return `${run.poppedCount} / ${run.level.target}`;
}

function starsForRun(run: RunState): number {
  const ratio = run.movesLeft / run.level.moves;
  if (ratio >= 0.45) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

function BubbleDot({
  color,
  diameter,
  cursed = false,
  wild = false,
}: {
  color: BubbleColor;
  diameter: number;
  cursed?: boolean;
  wild?: boolean;
}) {
  return (
    <View
      style={[
        styles.bubble,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: cursed ? NIGHT_COLORS.curse : BUBBLE_COLORS[color],
          borderColor: cursed ? NIGHT_COLORS.ember : "rgba(255,255,255,0.72)",
          borderWidth: cursed ? 2.5 : 1,
        },
      ]}
    >
      <View style={styles.bubbleShine} />
      {cursed ? (
        <Text style={styles.curseMark}>!</Text>
      ) : wild ? (
        <Ionicons name="sparkles" size={diameter * 0.42} color="#fff5df" />
      ) : null}
    </View>
  );
}

export default function MatchingGameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>("menu");
  const [run, setRun] = useState<RunState | null>(null);
  const runRef = useRef<RunState | null>(null);
  const [highestLevel, setHighestLevel] = useState(1);
  const [starsByLevel, setStarsByLevel] = useState<Record<number, number>>({});
  const progressRef = useRef<Progress>({ unlocked: 1, stars: {} });
  const [storageError, setStorageError] = useState(false);
  const [feedback, setFeedback] = useState("Aim, match three, and clear the curse.");
  const [aim, setAim] = useState<AimResult | null>(null);

  runRef.current = run;
  const topInset =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;
  const boardWidth = Math.max(280, screenWidth - 36);
  const boardHeight = Math.min(450, Math.max(320, (screenHeight - topInset - bottomInset) * 0.49));
  const bubbleDiameter = Math.min(44, boardWidth / 8);

  const publishRun = (next: RunState) => {
    runRef.current = next;
    setRun(next);
  };

  const saveProgress = (levelId: number, stars: number) => {
    const old = progressRef.current;
    const next: Progress = {
      unlocked: Math.max(old.unlocked, Math.min(LEVELS.length, levelId + 1)),
      stars: { ...old.stars, [levelId]: Math.max(old.stars[levelId] ?? 0, stars) },
    };
    progressRef.current = next;
    setHighestLevel(next.unlocked);
    setStarsByLevel(next.stars);
    void AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next)).catch(() =>
      setStorageError(true),
    );
  };

  useEffect(() => {
    void AsyncStorage.getItem(PROGRESS_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed = JSON.parse(saved) as Partial<Progress>;
        const unlocked = Math.max(
          1,
          Math.min(LEVELS.length, Number(parsed.unlocked) || 1),
        );
        const stars =
          parsed.stars && typeof parsed.stars === "object"
            ? parsed.stars
            : {};
        const next = { unlocked, stars };
        progressRef.current = next;
        setHighestLevel(unlocked);
        setStarsByLevel(stars);
      })
      .catch(() => setStorageError(true));
  }, []);

  const startLevel = (levelId: number) => {
    const level = getLevel(levelId);
    const next: RunState = {
      level,
      bubbles: createLevelBoard(level.id),
      currentColor: randomColor(level.colors),
      nextColor: randomColor(level.colors),
      currentWild: false,
      movesLeft: level.moves,
      poppedCount: 0,
      clearedCurses: 0,
      score: 0,
      usedPowers: freshUsage(),
      status: "playing",
      stars: 0,
    };
    publishRun(next);
    setFeedback("Drag to aim, then release to launch.");
    setAim(null);
    setScreen("game");
  };

  const resolveProgress = (candidate: RunState) => {
    if (
      isGoalComplete(
        candidate.level,
        candidate.bubbles,
        candidate.poppedCount,
        candidate.clearedCurses,
      )
    ) {
      const stars = starsForRun(candidate);
      const won = { ...candidate, status: "won" as const, stars };
      publishRun(won);
      saveProgress(candidate.level.id, stars);
      setFeedback("The family made it through the nightmare.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (candidate.movesLeft <= 0) {
      publishRun({ ...candidate, status: "lost" });
      setFeedback("Out of moves. Give the family another try.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    publishRun(candidate);
  };

  const fireAt = (target: Point) => {
    const current = runRef.current;
    if (!current || current.status !== "playing") return;
    const shot = traceAim(
      current.bubbles,
      boardWidth,
      boardHeight,
      bubbleDiameter,
      target,
    );
    if (!shot.landing) {
      setFeedback("Aim for an open spot around the bubble cluster.");
      return;
    }

    const result = resolveShot(
      current.bubbles,
      current.currentColor,
      shot.landing,
      current.currentWild,
    );
    if (result.bubbles === current.bubbles) {
      setFeedback("That spot is blocked. Aim for another gap.");
      return;
    }
    const next: RunState = {
      ...current,
      bubbles: result.bubbles,
      currentColor: current.nextColor,
      nextColor: randomColor(current.level.colors),
      currentWild: false,
      movesLeft: current.movesLeft - 1,
      poppedCount: current.poppedCount + result.removed.length,
      clearedCurses: current.clearedCurses + result.clearedCurses,
      score: current.score + result.removed.length * 10,
    };
    setAim(null);
    setFeedback(
      result.matched
        ? `${result.removed.length} bubbles popped.`
        : "No match—every shot counts.",
    );
    if (result.matched) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    resolveProgress(next);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          runRef.current?.status === "playing",
        onMoveShouldSetPanResponder: () =>
          runRef.current?.status === "playing",
        onPanResponderGrant: (event) => {
          const nextAim = traceAim(
            runRef.current?.bubbles ?? [],
            boardWidth,
            boardHeight,
            bubbleDiameter,
            pointFromEvent(event),
          );
          setAim(nextAim);
        },
        onPanResponderMove: (event) => {
          const nextAim = traceAim(
            runRef.current?.bubbles ?? [],
            boardWidth,
            boardHeight,
            bubbleDiameter,
            pointFromEvent(event),
          );
          setAim(nextAim);
        },
        onPanResponderRelease: (event) => {
          const target = pointFromEvent(event);
          fireAt(target);
          setAim(null);
        },
        onPanResponderTerminate: () => {
          setAim(null);
        },
      }),
    [boardHeight, boardWidth, bubbleDiameter],
  );

  const usePower = (key: FamilyKey) => {
    const current = runRef.current;
    if (!current || current.status !== "playing" || current.usedPowers[key]) {
      return;
    }
    const usedPowers = { ...current.usedPowers, [key]: true };

    if (key === "mom") {
      publishRun({ ...current, currentWild: true, usedPowers });
      setFeedback("Mom made the next bubble wild.");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }
    if (key === "rabbit") {
      publishRun({ ...current, movesLeft: current.movesLeft + 3, usedPowers });
      setFeedback("Rabbit found three more moves.");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    const result =
      key === "dad"
        ? removeLowestRow(current.bubbles)
        : blastLargestCluster(current.bubbles);
    if (!result.matched) {
      publishRun({ ...current, usedPowers });
      setFeedback("There are no bubbles for that power yet.");
      return;
    }

    const next: RunState = {
      ...current,
      bubbles: result.bubbles,
      usedPowers,
      poppedCount: current.poppedCount + result.removed.length,
      clearedCurses: current.clearedCurses + result.clearedCurses,
      score: current.score + result.removed.length * 10,
    };
    setFeedback(
      key === "dad"
        ? "Dad cleared the lowest row."
        : "Pig blasted the largest cluster.",
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resolveProgress(next);
  };

  const swapBubbles = () => {
    const current = runRef.current;
    if (!current || current.status !== "playing" || current.currentWild) return;
    publishRun({
      ...current,
      currentColor: current.nextColor,
      nextColor: current.currentColor,
    });
    void Haptics.selectionAsync();
  };

  const linePoints =
    aim?.path.filter((_, index) => index % 4 === 0).slice(1, 24) ?? [];

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: topInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <StatusBar style="light" />

      {screen === "menu" && (
        <View style={styles.menu}>
          <View style={styles.brandRow}>
            <Ionicons name="moon" size={16} color={colors.primary} />
            <Text style={[styles.brand, { color: colors.mutedForeground }]}>
              A FAMILY MATCH-3 NIGHTMARE
            </Text>
          </View>
          <ImageBackground
            source={require("../assets/images/family-banner.jpg")}
            style={styles.heroImage}
            imageStyle={styles.heroImageRadius}
          >
            <LinearGradient
              colors={["transparent", "rgba(16,23,19,0.2)", colors.background]}
              style={styles.heroShade}
            />
            <View style={styles.heroTitleBlock}>
              <Text style={styles.heroOverline}>THE HARVEST MOON IS UP</Text>
              <Text style={styles.heroTitle}>BUBBLE</Text>
              <Text style={styles.heroTitleAccent}>NIGHTMARE</Text>
            </View>
          </ImageBackground>

          <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>
            Match the bubbles. Keep the family safe.
          </Text>

          <View style={styles.familyStrip}>
            {FAMILY.map((member) => (
              <View key={member.key} style={styles.familyItem}>
                <Image source={member.portrait} style={styles.familyPortrait} />
                <Text style={[styles.familyName, { color: colors.foreground }]}>
                  {member.name}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.menuActions}>
            <Pressable
              onPress={() => setScreen("levels")}
              style={styles.primaryButton}
              testID="play-button"
            >
              <LinearGradient
                colors={[colors.primary, NIGHT_COLORS.ember]}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>PLAY LEVEL {highestLevel}</Text>
                <Ionicons name="arrow-forward" size={20} color="#1c1510" />
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => setScreen("levels")}
              style={[
                styles.secondaryButton,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
              testID="levels-button"
            >
              <Ionicons name="grid-outline" size={18} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                LEVELS
              </Text>
              <View style={styles.menuStars}>
                {Array.from({ length: 3 }, (_, index) => (
                  <Ionicons
                    key={index}
                    name="star"
                    size={14}
                    color={index < (starsByLevel[highestLevel] ?? 0) ? colors.primary : colors.border}
                  />
                ))}
              </View>
            </Pressable>
            <Pressable onPress={() => setScreen("help")} style={styles.helpLink}>
              <Text style={[styles.helpLinkText, { color: colors.mutedForeground }]}>
                HOW TO PLAY
              </Text>
            </Pressable>
          </View>
          {storageError && (
            <Text style={styles.storageWarning}>
              Progress may not save on this device.
            </Text>
          )}
        </View>
      )}

      {screen === "levels" && (
        <View style={styles.contentScreen}>
          <View style={styles.screenHeader}>
            <Pressable
              onPress={() => setScreen("menu")}
              style={styles.backButton}
              accessibilityLabel="Back to menu"
              testID="levels-back"
            >
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </Pressable>
            <View>
              <Text style={[styles.screenEyebrow, { color: colors.primary }]}>
                THE NIGHT GROWS DARKER
              </Text>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>
                Choose a level
              </Text>
            </View>
          </View>
          <View style={styles.levelList}>
            {LEVELS.map((level) => {
              const locked = level.id > highestLevel;
              const earned = starsByLevel[level.id] ?? 0;
              return (
                <Pressable
                  key={level.id}
                  disabled={locked}
                  onPress={() => startLevel(level.id)}
                  style={[
                    styles.levelCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: locked ? colors.border : NIGHT_COLORS.border,
                      opacity: locked ? 0.48 : 1,
                    },
                  ]}
                  testID={`level-${level.id}`}
                >
                  <View style={styles.levelNumber}>
                    {locked ? (
                      <Ionicons name="lock-closed" size={18} color={colors.mutedForeground} />
                    ) : (
                      <Text style={[styles.levelNumberText, { color: colors.primary }]}>
                        {String(level.id).padStart(2, "0")}
                      </Text>
                    )}
                  </View>
                  <View style={styles.levelText}>
                    <Text style={[styles.levelName, { color: colors.foreground }]}>
                      {level.name}
                    </Text>
                    <Text style={[styles.levelGoal, { color: colors.mutedForeground }]}>
                      {goalLabel(level)} · {level.moves} MOVES
                    </Text>
                  </View>
                  <View style={styles.levelStars}>
                    {[0, 1, 2].map((index) => (
                      <Ionicons
                        key={index}
                        name="star"
                        size={15}
                        color={index < earned ? colors.primary : colors.border}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.levelFooter}>
            <Text style={[styles.levelFooterText, { color: colors.mutedForeground }]}>
              Complete a level to unlock the next one.
            </Text>
          </View>
        </View>
      )}

      {screen === "help" && (
        <View style={styles.contentScreen}>
          <View style={styles.screenHeader}>
            <Pressable
              onPress={() => setScreen("menu")}
              style={styles.backButton}
              accessibilityLabel="Back to menu"
              testID="help-back"
            >
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </Pressable>
            <View>
              <Text style={[styles.screenEyebrow, { color: colors.primary }]}>
                THE FAMILY'S FIELD GUIDE
              </Text>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>
                How to play
              </Text>
            </View>
          </View>
          <View style={[styles.helpCard, { backgroundColor: colors.card }]}>
            <View style={styles.helpStep}>
              <View style={styles.helpIcon}>
                <Ionicons name="navigate" size={20} color={colors.primary} />
              </View>
              <View style={styles.helpCopy}>
                <Text style={[styles.helpTitle, { color: colors.foreground }]}>
                  Aim and launch
                </Text>
                <Text style={[styles.helpBody, { color: colors.mutedForeground }]}>
                  Drag across the board and release to send your bubble flying.
                  Bounce shots off the sides to reach tricky gaps.
                </Text>
              </View>
            </View>
            <View style={styles.helpStep}>
              <View style={styles.helpIcon}>
                <Ionicons name="ellipse" size={20} color={colors.primary} />
              </View>
              <View style={styles.helpCopy}>
                <Text style={[styles.helpTitle, { color: colors.foreground }]}>
                  Match three or more
                </Text>
                <Text style={[styles.helpBody, { color: colors.mutedForeground }]}>
                  Match same-color bubbles. Bubbles left hanging after a match
                  fall away too. Tap the next bubble to swap it into the launcher.
                </Text>
              </View>
            </View>
            <View style={styles.helpStep}>
              <View style={styles.helpIcon}>
                <Ionicons name="flag" size={20} color={colors.primary} />
              </View>
              <View style={styles.helpCopy}>
                <Text style={[styles.helpTitle, { color: colors.foreground }]}>
                  Finish the goal in time
                </Text>
                <Text style={[styles.helpBody, { color: colors.mutedForeground }]}>
                  Each level has a goal and limited moves. Save the family powers
                  for a difficult board.
                </Text>
              </View>
            </View>
          </View>
          <Text style={[styles.familyPowerHeading, { color: colors.primary }]}>
            FOUR SCARECROWS. FOUR POWERS.
          </Text>
          <View style={styles.helpFamilyList}>
            {FAMILY.map((member) => (
              <View key={member.key} style={styles.helpFamily}>
                <Image source={member.portrait} style={styles.helpPortrait} />
                <View style={styles.helpFamilyCopy}>
                  <Text style={[styles.helpFamilyName, { color: colors.foreground }]}>
                    {member.name}
                  </Text>
                  <Text style={[styles.helpFamilyPower, { color: colors.mutedForeground }]}>
                    {member.power}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {screen === "game" && run && (
        <View style={styles.gameScreen}>
          <View style={styles.gameHeader}>
            <Pressable
              onPress={() => setScreen("levels")}
              style={styles.backButton}
              accessibilityLabel="Return to levels"
              testID="game-back"
            >
              <Ionicons name="chevron-back" size={23} color={colors.foreground} />
            </Pressable>
            <View style={styles.gameHeading}>
              <Text style={[styles.screenEyebrow, { color: colors.primary }]}>
                LEVEL {String(run.level.id).padStart(2, "0")}
              </Text>
              <Text style={[styles.gameLevelName, { color: colors.foreground }]}>
                {run.level.name}
              </Text>
            </View>
            <View style={[styles.movesBadge, { backgroundColor: colors.card }]}>
              <Text style={[styles.movesNumber, { color: colors.primary }]}>
                {run.movesLeft}
              </Text>
              <Text style={[styles.movesLabel, { color: colors.mutedForeground }]}>
                MOVES
              </Text>
            </View>
          </View>

          <View style={[styles.objectiveCard, { backgroundColor: colors.card }]}>
            <View style={styles.objectiveCopy}>
              <Text style={[styles.objectiveLabel, { color: colors.mutedForeground }]}>
                {goalLabel(run.level)}
              </Text>
              <Text style={[styles.objectiveValue, { color: colors.foreground }]}>
                {goalValue(run)}
              </Text>
            </View>
            <View style={styles.objectiveScore}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.objectiveScoreText, { color: colors.foreground }]}>
                {run.score}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.board,
              {
                width: boardWidth,
                height: boardHeight,
                backgroundColor: NIGHT_COLORS.deep,
                borderColor: colors.border,
              },
            ]}
            {...panResponder.panHandlers}
            testID="bubble-board"
          >
            <View pointerEvents="none" style={styles.boardGlow} />
            {run.bubbles.map((bubble) => {
              const center = cellCenter(bubble, boardWidth, bubbleDiameter);
              return (
                <View
                  key={bubble.id}
                  pointerEvents="none"
                  style={[
                    styles.boardBubble,
                    {
                      left: center.x - bubbleDiameter / 2,
                      top: center.y - bubbleDiameter / 2,
                    },
                  ]}
                >
                  <BubbleDot
                    color={bubble.color}
                    diameter={bubbleDiameter}
                    cursed={bubble.kind === "cursed"}
                  />
                </View>
              );
            })}
            {aim &&
              linePoints.map((point, index) => (
                <View
                  key={`aim-${index}`}
                  pointerEvents="none"
                  style={[
                    styles.aimDot,
                    {
                      left: point.x - 2.5,
                      top: point.y - 2.5,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              ))}
            {aim?.landing && (
              <View
                pointerEvents="none"
                style={[
                  styles.landingMark,
                  {
                    left:
                      cellCenter(aim.landing, boardWidth, bubbleDiameter).x -
                      bubbleDiameter / 2,
                    top:
                      cellCenter(aim.landing, boardWidth, bubbleDiameter).y -
                      bubbleDiameter / 2,
                    width: bubbleDiameter,
                    height: bubbleDiameter,
                    borderRadius: bubbleDiameter / 2,
                    borderColor: colors.primary,
                  },
                ]}
              />
            )}
            <View
              pointerEvents="none"
              style={[
                styles.launcherStem,
                {
                  left: boardWidth / 2 - 5,
                  top: boardHeight - bubbleDiameter * 0.98,
                  backgroundColor: colors.border,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.launcherBase,
                {
                  left: boardWidth / 2 - bubbleDiameter * 0.95,
                  top: boardHeight - bubbleDiameter * 0.62,
                  width: bubbleDiameter * 1.9,
                  height: bubbleDiameter * 0.45,
                  backgroundColor: NIGHT_COLORS.panel,
                  borderColor: colors.border,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.currentBubble,
                {
                  left: boardWidth / 2 - bubbleDiameter / 2,
                  top: boardHeight - bubbleDiameter * 1.55,
                },
              ]}
            >
              <BubbleDot
                color={run.currentColor}
                diameter={bubbleDiameter}
                wild={run.currentWild}
              />
            </View>
            {run.status !== "playing" && (
              <View style={styles.resultOverlay}>
                <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.resultEyebrow, { color: colors.primary }]}>
                    {run.status === "won" ? "THE NIGHT IS QUIET" : "THE FAMILY NEEDS YOU"}
                  </Text>
                  <Text style={[styles.resultTitle, { color: colors.foreground }]}>
                    {run.status === "won" ? "Level cleared" : "Out of moves"}
                  </Text>
                  {run.status === "won" ? (
                    <>
                      <View style={styles.resultStars}>
                        {[0, 1, 2].map((index) => (
                          <Ionicons
                            key={index}
                            name="star"
                            size={29}
                            color={index < run.stars ? colors.primary : colors.border}
                          />
                        ))}
                      </View>
                      <Pressable
                        onPress={() =>
                          run.level.id < LEVELS.length
                            ? startLevel(run.level.id + 1)
                            : setScreen("levels")
                        }
                        style={styles.resultButton}
                        testID="next-level-button"
                      >
                        <Text style={styles.resultButtonText}>
                          {run.level.id < LEVELS.length ? "NEXT LEVEL" : "LEVELS"}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#1c1510" />
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => startLevel(run.level.id)}
                      style={styles.resultButton}
                      testID="retry-button"
                    >
                      <Text style={styles.resultButtonText}>TRY AGAIN</Text>
                      <Ionicons name="refresh" size={18} color="#1c1510" />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => setScreen("levels")}
                    style={styles.resultLink}
                  >
                    <Text style={[styles.helpLinkText, { color: colors.mutedForeground }]}>
                      BACK TO LEVELS
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          <Text
            style={[styles.feedback, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {feedback}
          </Text>

          <View style={styles.shotControls}>
            <View style={styles.nextBubble}>
              <Text style={[styles.nextLabel, { color: colors.mutedForeground }]}>
                NEXT
              </Text>
              <BubbleDot
                color={run.nextColor}
                diameter={Math.min(34, bubbleDiameter * 0.8)}
              />
            </View>
            <Text style={[styles.aimHint, { color: colors.mutedForeground }]}>
              DRAG TO AIM{"\n"}RELEASE TO SHOOT
            </Text>
            <Pressable
              onPress={swapBubbles}
              disabled={run.status !== "playing" || run.currentWild}
              style={[
                styles.swapButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  opacity: run.currentWild ? 0.5 : 1,
                },
              ]}
              testID="swap-bubbles"
            >
              <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
              <Text style={[styles.swapText, { color: colors.foreground }]}>SWAP</Text>
            </Pressable>
          </View>

          <View style={styles.powersBlock}>
            <Text style={[styles.powerHeading, { color: colors.primary }]}>
              THE SCARECROW FAMILY
            </Text>
            <View style={styles.powerRow}>
              {FAMILY.map((member) => {
                const used = run.usedPowers[member.key];
                return (
                  <Pressable
                    key={member.key}
                    onPress={() => usePower(member.key)}
                    disabled={used || run.status !== "playing"}
                    style={[styles.powerButton, { opacity: used ? 0.38 : 1 }]}
                    accessibilityLabel={`${member.name}: ${member.power}${used ? ", used" : ""}`}
                    testID={`power-${member.key}`}
                  >
                    <View
                      style={[
                        styles.powerPortraitFrame,
                        { borderColor: used ? colors.border : colors.primary },
                      ]}
                    >
                      <Image source={member.portrait} style={styles.powerPortrait} />
                      {used && (
                        <View style={styles.usedOverlay}>
                          <Ionicons name="checkmark" size={17} color={colors.foreground} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.powerName, { color: colors.foreground }]}>
                      {member.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 18,
  },
  menu: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 12,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 10,
  },
  brand: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2.2,
  },
  heroImage: {
    height: "41%",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroImageRadius: {
    borderRadius: 22,
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
  },
  heroTitleBlock: {
    padding: 18,
  },
  heroOverline: {
    color: "#f5b86a",
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 5,
  },
  heroTitle: {
    color: "#fff2db",
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    letterSpacing: 1.2,
    lineHeight: 36,
  },
  heroTitleAccent: {
    color: "#f59a49",
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    letterSpacing: 1.2,
    lineHeight: 36,
  },
  menuSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  familyStrip: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 13,
  },
  familyItem: {
    alignItems: "center",
    gap: 5,
  },
  familyPortrait: {
    borderColor: "#59644a",
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    width: 52,
  },
  familyName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  menuActions: {
    gap: 10,
    marginTop: 19,
  },
  primaryButton: {
    borderRadius: 15,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    alignItems: "center",
    flexDirection: "row",
    height: 54,
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "#1c1510",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 1.2,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    height: 48,
    justifyContent: "center",
    gap: 10,
  },
  secondaryButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.1,
  },
  menuStars: {
    flexDirection: "row",
    gap: 1,
    marginLeft: 3,
  },
  helpLink: {
    alignSelf: "center",
    padding: 7,
  },
  helpLinkText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.4,
  },
  storageWarning: {
    color: "#e99b89",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
  contentScreen: {
    flex: 1,
    paddingTop: 8,
  },
  screenHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  backButton: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 30,
  },
  screenEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.8,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 23,
    marginTop: 3,
  },
  levelList: {
    gap: 10,
  },
  levelCard: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 70,
    paddingHorizontal: 13,
  },
  levelNumber: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
  },
  levelNumberText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  levelText: {
    flex: 1,
    paddingLeft: 8,
  },
  levelName: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  levelGoal: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 0.7,
    marginTop: 5,
  },
  levelStars: {
    flexDirection: "row",
    gap: 1,
    marginLeft: 4,
  },
  levelFooter: {
    alignItems: "center",
    marginTop: 18,
  },
  levelFooterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  helpCard: {
    borderRadius: 18,
    gap: 18,
    padding: 16,
  },
  helpStep: {
    flexDirection: "row",
    gap: 12,
  },
  helpIcon: {
    alignItems: "center",
    backgroundColor: "rgba(245,154,73,0.12)",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  helpCopy: {
    flex: 1,
    paddingTop: 1,
  },
  helpTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  helpBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  familyPowerHeading: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 9,
    marginTop: 22,
  },
  helpFamilyList: {
    gap: 9,
  },
  helpFamily: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  helpPortrait: {
    borderRadius: 19,
    height: 38,
    width: 38,
  },
  helpFamilyCopy: {
    gap: 2,
  },
  helpFamilyName: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  helpFamilyPower: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  gameScreen: {
    flex: 1,
    alignItems: "center",
    paddingTop: 4,
  },
  gameHeader: {
    alignItems: "center",
    flexDirection: "row",
    width: "100%",
  },
  gameHeading: {
    flex: 1,
  },
  gameLevelName: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    marginTop: 2,
  },
  movesBadge: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  movesNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
  },
  movesLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  objectiveCard: {
    alignItems: "center",
    borderRadius: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
    marginTop: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
    width: "100%",
  },
  objectiveCopy: {
    gap: 3,
  },
  objectiveLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1,
  },
  objectiveValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  objectiveScore: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  objectiveScoreText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  board: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  boardGlow: {
    backgroundColor: "rgba(245,154,73,0.035)",
    borderRadius: 180,
    height: 250,
    left: "20%",
    position: "absolute",
    top: "43%",
    width: 250,
  },
  boardBubble: {
    position: "absolute",
  },
  bubble: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleShine: {
    backgroundColor: "rgba(255,255,255,0.42)",
    borderRadius: 6,
    height: 6,
    left: 7,
    position: "absolute",
    top: 6,
    transform: [{ rotate: "-35deg" }],
    width: 11,
  },
  curseMark: {
    color: "#ffe6c5",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  aimDot: {
    borderRadius: 3,
    height: 5,
    position: "absolute",
    width: 5,
  },
  landingMark: {
    borderStyle: "dashed",
    borderWidth: 2,
    position: "absolute",
  },
  launcherStem: {
    borderRadius: 5,
    height: 34,
    position: "absolute",
    width: 10,
  },
  launcherBase: {
    borderRadius: 12,
    borderWidth: 1,
    position: "absolute",
  },
  currentBubble: {
    position: "absolute",
  },
  resultOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "rgba(8,12,9,0.74)",
    justifyContent: "center",
    padding: 18,
  },
  resultCard: {
    alignItems: "center",
    borderColor: NIGHT_COLORS.border,
    borderRadius: 19,
    borderWidth: 1,
    maxWidth: 300,
    paddingHorizontal: 20,
    paddingVertical: 21,
    width: "100%",
  },
  resultEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
  },
  resultTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 23,
    marginTop: 5,
    textAlign: "center",
  },
  resultStars: {
    flexDirection: "row",
    gap: 9,
    marginVertical: 13,
  },
  resultButton: {
    alignItems: "center",
    backgroundColor: NIGHT_COLORS.amber,
    borderRadius: 12,
    flexDirection: "row",
    gap: 9,
    height: 44,
    justifyContent: "center",
    marginTop: 13,
    width: "100%",
  },
  resultButtonText: {
    color: "#1c1510",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  resultLink: {
    marginTop: 13,
    padding: 5,
  },
  feedback: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    height: 22,
    paddingTop: 5,
    textAlign: "center",
    width: "100%",
  },
  shotControls: {
    alignItems: "center",
    flexDirection: "row",
    height: 52,
    justifyContent: "space-between",
    width: "100%",
  },
  nextBubble: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    width: 88,
  },
  nextLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1,
  },
  aimHint: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    letterSpacing: 0.8,
    lineHeight: 13,
    textAlign: "center",
  },
  swapButton: {
    alignItems: "center",
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    height: 36,
    justifyContent: "center",
    width: 82,
  },
  swapText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  powersBlock: {
    borderTopColor: NIGHT_COLORS.border,
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 7,
    width: "100%",
  },
  powerHeading: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.4,
    textAlign: "center",
  },
  powerRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 7,
  },
  powerButton: {
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  powerPortraitFrame: {
    borderRadius: 23,
    borderWidth: 2,
    height: 46,
    overflow: "hidden",
    width: 46,
  },
  powerPortrait: {
    height: "100%",
    width: "100%",
  },
  usedOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "rgba(14,19,16,0.67)",
    justifyContent: "center",
  },
  powerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
});
