import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  BUBBLE_COLORS,
  bubblesTouchedBySwipe,
  closestBubbles,
  createFallingBubble,
  createFirstWave,
  matchingBubblesFromSwipe,
  type BubbleColor,
  type Bubble,
  type Point,
} from "@/game/engine";
import { FAMILY, NIGHT_COLORS, type FamilyKey } from "@/constants/game";

type Screen = "menu" | "game" | "help";
type RoundPhase = "ready" | "playing" | "over";
type FamilyUsage = Record<FamilyKey, boolean>;

const HIGH_SCORE_KEY = "bubble-nightmare-high-score";
const freshUsage = (): FamilyUsage => ({
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

export default function BubbleNightmareScreen() {
  const theme = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>("menu");
  const [phase, setPhase] = useState<RoundPhase>("ready");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [usedPowers, setUsedPowers] = useState<FamilyUsage>(freshUsage);
  const [feedback, setFeedback] = useState(
    "Swipe through three matching bubbles.",
  );
  const [storageError, setStorageError] = useState(false);

  const screenRef = useRef<Screen>("menu");
  const phaseRef = useRef<RoundPhase>("ready");
  const bubblesRef = useRef<Bubble[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const usedPowersRef = useRef<FamilyUsage>(freshUsage());
  const touchedIdsRef = useRef<string[]>([]);
  const previousPointRef = useRef<Point | null>(null);
  const nextBubbleIdRef = useRef(10);
  const tickRef = useRef(0);
  const slowUntilRef = useRef(0);
  const resolveSwipeRef = useRef<() => void>(() => undefined);

  const topInset =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const updateBubbles = (next: Bubble[]) => {
    bubblesRef.current = next;
    setBubbles(next);
  };

  const updatePhase = (next: RoundPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const updateScreen = (next: Screen) => {
    screenRef.current = next;
    setScreen(next);
  };

  const loseLives = (amount: number) => {
    const next = Math.max(0, livesRef.current - amount);
    livesRef.current = next;
    setLives(next);
    if (next === 0) {
      updatePhase("over");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  useEffect(() => {
    void AsyncStorage.getItem(HIGH_SCORE_KEY)
      .then((value) => {
        if (value) {
          const parsed = Number.parseInt(value, 10);
          if (Number.isFinite(parsed)) setBestScore(parsed);
        }
      })
      .catch(() => setStorageError(true));
  }, []);

  useEffect(() => {
    if (score <= bestScore) return;
    setBestScore(score);
    void AsyncStorage.setItem(HIGH_SCORE_KEY, String(score)).catch(() =>
      setStorageError(true),
    );
  }, [bestScore, score]);

  useEffect(() => {
    if (
      screen !== "game" ||
      phase !== "playing" ||
      boardSize.width <= 0 ||
      boardSize.height <= 0
    ) {
      return;
    }

    const timer = setInterval(() => {
      if (phaseRef.current !== "playing") return;

      tickRef.current += 1;
      const slowed = Date.now() < slowUntilRef.current;
      const speed = slowed ? 0.8 : 1.45 + Math.min(scoreRef.current / 500, 1.8);
      let next = bubblesRef.current.map((bubble) => ({
        ...bubble,
        y: bubble.y + speed,
      }));

      const spawnEvery = Math.max(7, 13 - Math.floor(scoreRef.current / 120));
      if (tickRef.current % spawnEvery === 0) {
        next = [
          ...next,
          createFallingBubble(
            boardSize.width,
            nextBubbleIdRef.current,
            Math.floor(scoreRef.current / 150),
          ),
        ];
        nextBubbleIdRef.current += 1;
      }

      const escaped = next.filter(
        (bubble) => bubble.y + bubble.size / 2 >= boardSize.height,
      );
      if (escaped.length > 0) {
        loseLives(escaped.length);
        setFeedback(
          escaped.length === 1
            ? "A nightmare bubble reached the family."
            : "The family lost a few more bubbles.",
        );
      }

      updateBubbles(
        next.filter((bubble) => bubble.y + bubble.size / 2 < boardSize.height),
      );
    }, 100);

    return () => clearInterval(timer);
  }, [boardSize.height, boardSize.width, phase, screen]);

  const recordSwipe = (start: Point, end: Point) => {
    const hits = bubblesTouchedBySwipe(bubblesRef.current, start, end);
    for (const id of hits) {
      if (!touchedIdsRef.current.includes(id)) touchedIdsRef.current.push(id);
    }
  };

  const resolveSwipe = () => {
    if (phaseRef.current !== "playing") return;

    const ids = [...new Set(touchedIdsRef.current)];
    touchedIdsRef.current = [];
    previousPointRef.current = null;
    const result = matchingBubblesFromSwipe(bubblesRef.current, ids);

    if (result.cursedHit) {
      updateBubbles(
        bubblesRef.current.filter(
          (bubble) => !result.poppedIds.includes(bubble.id),
        ),
      );
      loseLives(1);
      setFeedback("Cursed bubbles sting. Watch your hearts.");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    if (result.poppedIds.length === 0) {
      setFeedback(
        ids.length === 0
          ? "Swipe across the bubbles to hit them."
          : "Match at least three bubbles of one color.",
      );
      return;
    }

    const points = result.poppedIds.length * 10;
    updateBubbles(
      bubblesRef.current.filter(
        (bubble) => !result.poppedIds.includes(bubble.id),
      ),
    );
    scoreRef.current += points;
    setScore(scoreRef.current);
    setFeedback(`Nice slash. +${points} points.`);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  resolveSwipeRef.current = resolveSwipe;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => phaseRef.current === "playing",
        onMoveShouldSetPanResponder: () => phaseRef.current === "playing",
        onPanResponderGrant: (event) => {
          const point = pointFromEvent(event);
          touchedIdsRef.current = [];
          previousPointRef.current = point;
          recordSwipe(point, point);
        },
        onPanResponderMove: (event) => {
          const point = pointFromEvent(event);
          const previous = previousPointRef.current;
          if (previous) recordSwipe(previous, point);
          previousPointRef.current = point;
        },
        onPanResponderRelease: () => resolveSwipeRef.current(),
        onPanResponderTerminate: () => resolveSwipeRef.current(),
      }),
    [],
  );

  const startGame = () => {
    scoreRef.current = 0;
    livesRef.current = 3;
    tickRef.current = 0;
    nextBubbleIdRef.current = 10;
    slowUntilRef.current = 0;
    touchedIdsRef.current = [];
    usedPowersRef.current = freshUsage();
    setScore(0);
    setLives(3);
    setUsedPowers(freshUsage());
    setFeedback("Swipe through three matching bubbles.");
    updateBubbles(boardSize.width > 0 ? createFirstWave(boardSize.width) : []);
    updatePhase("playing");
    updateScreen("game");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleBoardLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoardSize((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
    if (
      width > 0 &&
      phaseRef.current === "playing" &&
      bubblesRef.current.length === 0
    ) {
      updateBubbles(createFirstWave(width));
    }
  };

  const addPointsFor = (popped: Bubble[]) => {
    if (popped.length === 0) return;
    const points = popped.length * 10;
    updateBubbles(
      bubblesRef.current.filter(
        (bubble) => !popped.some((target) => target.id === bubble.id),
      ),
    );
    scoreRef.current += points;
    setScore(scoreRef.current);
  };

  const activatePower = (key: FamilyKey) => {
    if (phaseRef.current !== "playing" || usedPowersRef.current[key]) return;
    const normalBubbles = bubblesRef.current.filter(
      (bubble) => bubble.kind === "normal",
    );
    let message = "";

    if (key === "dad") {
      const cleared = closestBubbles(bubblesRef.current, 4);
      addPointsFor(cleared);
      message = "Dad charged through the lowest bubbles.";
    } else if (key === "mom") {
      const counts = new Map<BubbleColor, number>();
      for (const bubble of normalBubbles) {
        counts.set(bubble.color, (counts.get(bubble.color) ?? 0) + 1);
      }
      const targetColor =
        [...counts.entries()].sort(
          (first, second) => second[1] - first[1],
        )[0]?.[0] ?? "ember";
      const need = Math.max(0, 3 - (counts.get(targetColor) ?? 0));
      const candidates = normalBubbles
        .filter((bubble) => bubble.color !== targetColor)
        .slice(0, Math.max(need, 1));
      const changedIds = new Set(candidates.map((bubble) => bubble.id));
      updateBubbles(
        bubblesRef.current.map((bubble) =>
          changedIds.has(bubble.id)
            ? { ...bubble, color: targetColor }
            : bubble,
        ),
      );
      message =
        candidates.length > 0
          ? "Mom stitched bubbles into a matching group."
          : "Mom strengthened the biggest matching group.";
    } else if (key === "rabbit") {
      slowUntilRef.current = Date.now() + 6000;
      message = "Rabbit slowed time for a few seconds.";
    } else {
      const target = closestBubbles(bubblesRef.current, 1)[0];
      if (target) {
        const radius = 118;
        const cluster = bubblesRef.current.filter(
          (bubble) =>
            Math.hypot(bubble.x - target.x, bubble.y - target.y) <= radius,
        );
        addPointsFor(cluster.length > 0 ? cluster : [target]);
      }
      message = "Pig blasted a bubble cluster.";
    }

    const nextUsage = { ...usedPowersRef.current, [key]: true };
    usedPowersRef.current = nextUsage;
    setUsedPowers(nextUsage);
    setFeedback(message);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const leaveGame = () => {
    updatePhase("ready");
    updateScreen("menu");
  };

  const menuHeroHeight = Math.min(300, Math.max(210, screenHeight * 0.32));

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.background,
          paddingTop: topInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <StatusBar style="light" />

      {screen === "menu" ? (
        <View style={styles.menuScreen}>
          <View style={styles.menuTitle}>
            <Text style={styles.kicker}>A SCARECROW FAMILY ARCADE GAME</Text>
            <Text style={[styles.logo, { color: theme.foreground }]}>
              BUBBLE <Text style={{ color: theme.primary }}>NIGHTMARE</Text>
            </Text>
            <Text style={styles.tagline}>
              Four scarecrows. One very bad night.
            </Text>
          </View>

          <View style={[styles.heroFrame, { height: menuHeroHeight }]}>
            <Image
              source={require("../../assets/images/family-banner.jpg")}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel="The scarecrow family together under a full moon"
            />
            <LinearGradient
              colors={["transparent", "rgba(16, 23, 19, 0.72)"]}
              style={styles.heroFade}
              pointerEvents="none"
            />
            <View style={styles.heroCaption}>
              <Text style={styles.heroCaptionTitle}>THE FAMILY IS HOME</Text>
              <Text style={styles.heroCaptionText}>
                The bubbles are not invited.
              </Text>
            </View>
          </View>

          <View style={styles.meetHeading}>
            <Text style={styles.sectionLabel}>MEET THE FAMILY</Text>
            <Text style={styles.sectionNote}>All four defend the farm</Text>
          </View>
          <View style={styles.familyRow}>
            {FAMILY.map((member) => (
              <View style={styles.menuFamilyMember} key={member.key}>
                <Image
                  source={member.portrait}
                  style={styles.menuPortrait}
                  resizeMode="cover"
                  accessibilityLabel={`${member.name} scarecrow portrait`}
                />
                <Text style={styles.menuFamilyName}>{member.name}</Text>
                {(member.key === "rabbit" || member.key === "pig") && (
                  <Text style={styles.teenTag}>TEEN</Text>
                )}
              </View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start Bubble Nightmare"
            testID="start-game"
            onPress={startGame}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="play" size={18} color={theme.primaryForeground} />
            <Text
              style={[
                styles.primaryButtonText,
                { color: theme.primaryForeground },
              ]}
            >
              START THE NIGHT
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            testID="how-to-play"
            onPress={() => updateScreen("help")}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={18}
              color={theme.foreground}
            />
            <Text style={styles.secondaryButtonText}>HOW TO PLAY</Text>
          </Pressable>

          <View style={styles.bestScoreLine}>
            <Ionicons
              name="trophy-outline"
              size={15}
              color={NIGHT_COLORS.amber}
            />
            <Text style={styles.bestScoreText}>BEST {bestScore}</Text>
            {storageError && (
              <Text style={styles.storageWarning}>Best score not saved</Text>
            )}
          </View>
        </View>
      ) : screen === "help" ? (
        <View style={styles.helpScreen}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            testID="help-back"
            onPress={() => updateScreen("menu")}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.foreground} />
          </Pressable>
          <Text style={styles.kicker}>THE RULES</Text>
          <Text style={[styles.helpTitle, { color: theme.foreground }]}>
            Keep the family safe.
          </Text>
          <Text style={styles.helpCopy}>
            Swipe through three or more bubbles of the same color to pop them.
            If bubbles reach the bottom, the family loses a heart. A swipe
            through a cursed bubble also costs a heart.
          </Text>
          <View style={styles.helpFamilyList}>
            {FAMILY.map((member) => (
              <View style={styles.helpFamilyRow} key={member.key}>
                <Image
                  source={member.portrait}
                  style={styles.helpPortrait}
                  resizeMode="cover"
                />
                <View style={styles.helpFamilyInfo}>
                  <Text style={styles.helpFamilyName}>
                    {member.name}
                    {(member.key === "rabbit" || member.key === "pig") &&
                      " · teen"}
                  </Text>
                  <Text style={styles.helpFamilyPower}>{member.power}</Text>
                </View>
                <Ionicons
                  name={
                    member.key === "dad"
                      ? "flash"
                      : member.key === "mom"
                        ? "git-merge"
                        : member.key === "rabbit"
                          ? "hourglass"
                          : "radio"
                  }
                  size={20}
                  color={NIGHT_COLORS.amber}
                />
              </View>
            ))}
          </View>
          <Text style={styles.helpFooter}>
            Tap each family portrait during a round. Every power can be used
            once.
          </Text>
          <Pressable
            accessibilityRole="button"
            testID="help-start"
            onPress={startGame}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="play" size={18} color={theme.primaryForeground} />
            <Text
              style={[
                styles.primaryButtonText,
                { color: theme.primaryForeground },
              ]}
            >
              START THE NIGHT
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.gameScreen}>
          <View style={styles.hud}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Leave game"
              testID="leave-game"
              onPress={leaveGame}
              style={({ pressed }) => [
                styles.backButton,
                styles.gameBackButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="arrow-back" size={21} color={theme.foreground} />
            </Pressable>
            <View style={styles.hudScore}>
              <Text style={styles.hudLabel}>
                WAVE {String(1 + Math.floor(score / 150)).padStart(2, "0")}
              </Text>
              <Text style={styles.hudScoreNumber}>{score}</Text>
            </View>
            <View
              style={styles.hearts}
              accessibilityLabel={`${lives} family hearts remaining`}
            >
              {[0, 1, 2].map((heart) => (
                <Ionicons
                  key={heart}
                  name={heart < lives ? "heart" : "heart-outline"}
                  size={20}
                  color={
                    heart < lives ? NIGHT_COLORS.danger : NIGHT_COLORS.border
                  }
                />
              ))}
            </View>
          </View>

          <View style={styles.instructionLine}>
            <Text style={styles.instructionText}>
              SLASH 3+ MATCHING BUBBLES · AVOID THE CURSED ONES
            </Text>
          </View>

          <LinearGradient
            colors={[NIGHT_COLORS.field, NIGHT_COLORS.deep]}
            style={styles.bubbleField}
            onLayout={handleBoardLayout}
            {...panResponder.panHandlers}
          >
            <View style={styles.fieldMoon} pointerEvents="none" />
            <View style={styles.fieldFence} pointerEvents="none" />
            {bubbles.map((bubble) => (
              <View
                key={bubble.id}
                pointerEvents="none"
                style={[
                  styles.bubble,
                  {
                    width: bubble.size,
                    height: bubble.size,
                    left: bubble.x - bubble.size / 2,
                    top: bubble.y - bubble.size / 2,
                    backgroundColor:
                      bubble.kind === "cursed"
                        ? NIGHT_COLORS.curse
                        : BUBBLE_COLORS[bubble.color],
                    borderColor:
                      bubble.kind === "cursed"
                        ? "#8d6ba0"
                        : "rgba(255, 255, 255, 0.62)",
                  },
                ]}
              >
                {bubble.kind === "cursed" ? (
                  <Ionicons name="skull" size={22} color={NIGHT_COLORS.paper} />
                ) : (
                  <View style={styles.bubbleShine} />
                )}
              </View>
            ))}

            {phase === "ready" && (
              <View style={styles.readyMessage} pointerEvents="none">
                <Text style={styles.readyMessageText}>
                  The night is waking...
                </Text>
              </View>
            )}

            {phase === "over" && (
              <View style={styles.gameOverShade}>
                <View style={styles.gameOverCard}>
                  <Text style={styles.gameOverEyebrow}>NIGHT OVER</Text>
                  <Text style={styles.gameOverTitle}>The family survived.</Text>
                  <Text style={styles.gameOverScore}>SCORE {score}</Text>
                  <Text style={styles.gameOverBest}>BEST {bestScore}</Text>
                  <Pressable
                    accessibilityRole="button"
                    testID="play-again"
                    onPress={startGame}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      { backgroundColor: theme.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="refresh"
                      size={18}
                      color={theme.primaryForeground}
                    />
                    <Text
                      style={[
                        styles.primaryButtonText,
                        { color: theme.primaryForeground },
                      ]}
                    >
                      PLAY AGAIN
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    testID="game-over-menu"
                    onPress={leaveGame}
                    style={({ pressed }) => [
                      styles.gameOverMenuButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>BACK TO HOME</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </LinearGradient>

          <View style={styles.powerArea}>
            <View style={styles.powerHeading}>
              <Text style={styles.sectionLabel}>FAMILY POWERS</Text>
              <Text numberOfLines={1} style={styles.feedbackText}>
                {feedback}
              </Text>
            </View>
            <View style={styles.powerRow}>
              {FAMILY.map((member) => {
                const used = usedPowers[member.key];
                return (
                  <Pressable
                    key={member.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${member.name}: ${member.power}${used ? ", already used" : ""}`}
                    disabled={used || phase !== "playing"}
                    testID={`power-${member.key}`}
                    onPress={() => activatePower(member.key)}
                    style={({ pressed }) => [
                      styles.powerButton,
                      used && styles.powerUsed,
                      pressed && !used && styles.pressed,
                    ]}
                  >
                    <View style={styles.powerPortraitFrame}>
                      <Image
                        source={member.portrait}
                        style={[
                          styles.powerPortrait,
                          used && styles.usedPortrait,
                        ]}
                        resizeMode="cover"
                      />
                      {used && (
                        <View style={styles.usedStamp}>
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color={NIGHT_COLORS.paper}
                          />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.powerName, used && styles.usedText]}>
                      {member.name.toUpperCase()}
                    </Text>
                    <Text style={[styles.powerRole, used && styles.usedText]}>
                      {used ? "USED" : member.role}
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
    overflow: "hidden",
  },
  menuScreen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  menuTitle: {
    marginBottom: 15,
  },
  kicker: {
    color: NIGHT_COLORS.amber,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.1,
  },
  logo: {
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "900",
    letterSpacing: -1.2,
    marginTop: 5,
  },
  tagline: {
    color: NIGHT_COLORS.muted,
    fontSize: 14,
    marginTop: 4,
  },
  heroFrame: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: NIGHT_COLORS.deep,
    borderWidth: 1,
    borderColor: NIGHT_COLORS.border,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "48%",
  },
  heroCaption: {
    position: "absolute",
    left: 17,
    right: 17,
    bottom: 15,
  },
  heroCaptionTitle: {
    color: NIGHT_COLORS.paper,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  heroCaptionText: {
    color: "#e6d8b9",
    fontSize: 12,
    marginTop: 3,
  },
  meetHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 9,
  },
  sectionLabel: {
    color: NIGHT_COLORS.paper,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  sectionNote: {
    color: NIGHT_COLORS.muted,
    fontSize: 11,
  },
  familyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  menuFamilyMember: {
    alignItems: "center",
    width: "23%",
  },
  menuPortrait: {
    width: 53,
    height: 53,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: NIGHT_COLORS.border,
    backgroundColor: NIGHT_COLORS.panel,
  },
  menuFamilyName: {
    color: NIGHT_COLORS.paper,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },
  teenTag: {
    color: NIGHT_COLORS.amber,
    fontSize: 8,
    letterSpacing: 1.1,
    fontWeight: "800",
    marginTop: 1,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 17,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 5,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  secondaryButton: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },
  secondaryButtonText: {
    color: NIGHT_COLORS.paper,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  bestScoreLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 4,
  },
  bestScoreText: {
    color: NIGHT_COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  storageWarning: {
    color: NIGHT_COLORS.danger,
    fontSize: 9,
    marginLeft: 4,
  },
  helpScreen: {
    flex: 1,
    paddingHorizontal: 23,
    paddingTop: 12,
    justifyContent: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: NIGHT_COLORS.panel,
    marginBottom: 18,
  },
  helpTitle: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "900",
    marginTop: 6,
  },
  helpCopy: {
    color: NIGHT_COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    marginBottom: 19,
  },
  helpFamilyList: {
    borderTopWidth: 1,
    borderTopColor: NIGHT_COLORS.border,
  },
  helpFamilyRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 69,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: NIGHT_COLORS.border,
  },
  helpPortrait: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: NIGHT_COLORS.panel,
  },
  helpFamilyInfo: {
    flex: 1,
  },
  helpFamilyName: {
    color: NIGHT_COLORS.paper,
    fontSize: 13,
    fontWeight: "800",
  },
  helpFamilyPower: {
    color: NIGHT_COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  helpFooter: {
    color: NIGHT_COLORS.amber,
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 17,
  },
  gameScreen: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 5,
    paddingBottom: 4,
  },
  hud: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gameBackButton: {
    marginBottom: 0,
    width: 40,
    height: 40,
  },
  hudScore: {
    alignItems: "center",
    minWidth: 90,
  },
  hudLabel: {
    color: NIGHT_COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  hudScoreNumber: {
    color: NIGHT_COLORS.paper,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
  },
  hearts: {
    flexDirection: "row",
    gap: 3,
    minWidth: 70,
    justifyContent: "flex-end",
  },
  instructionLine: {
    height: 27,
    justifyContent: "center",
  },
  instructionText: {
    color: NIGHT_COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.55,
    textAlign: "center",
  },
  bubbleField: {
    flex: 1,
    minHeight: 240,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: NIGHT_COLORS.border,
    overflow: "hidden",
  },
  fieldMoon: {
    position: "absolute",
    top: 21,
    right: 20,
    width: 53,
    height: 53,
    borderRadius: 27,
    backgroundColor: "rgba(246, 228, 181, 0.12)",
    borderColor: "rgba(246, 228, 181, 0.22)",
    borderWidth: 1,
  },
  fieldFence: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 13,
    borderTopWidth: 1,
    borderColor: "rgba(226, 198, 142, 0.24)",
    backgroundColor: "rgba(12, 20, 15, 0.26)",
  },
  bubble: {
    position: "absolute",
    borderRadius: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  bubbleShine: {
    position: "absolute",
    top: 8,
    left: 10,
    width: 13,
    height: 7,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    transform: [{ rotate: "-35deg" }],
  },
  readyMessage: {
    position: "absolute",
    alignSelf: "center",
    top: "45%",
    backgroundColor: "rgba(16, 23, 19, 0.72)",
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  readyMessageText: {
    color: NIGHT_COLORS.paper,
    fontSize: 12,
    fontWeight: "700",
  },
  powerArea: {
    paddingTop: 9,
  },
  powerHeading: {
    height: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  feedbackText: {
    flex: 1,
    color: NIGHT_COLORS.amber,
    fontSize: 9,
    textAlign: "right",
  },
  powerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  powerButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: NIGHT_COLORS.panel,
    borderWidth: 1,
    borderColor: NIGHT_COLORS.border,
  },
  powerUsed: {
    opacity: 0.48,
  },
  powerPortraitFrame: {
    position: "relative",
  },
  powerPortrait: {
    width: 49,
    height: 49,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NIGHT_COLORS.amber,
  },
  usedPortrait: {
    opacity: 0.45,
  },
  usedStamp: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NIGHT_COLORS.success,
    borderWidth: 2,
    borderColor: NIGHT_COLORS.panel,
  },
  powerName: {
    color: NIGHT_COLORS.paper,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 5,
  },
  powerRole: {
    color: NIGHT_COLORS.amber,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.45,
    marginTop: 2,
    textAlign: "center",
  },
  usedText: {
    color: NIGHT_COLORS.muted,
  },
  gameOverShade: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7, 13, 10, 0.76)",
    padding: 18,
  },
  gameOverCard: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 22,
    backgroundColor: NIGHT_COLORS.deep,
    borderColor: NIGHT_COLORS.border,
    borderWidth: 1,
  },
  gameOverEyebrow: {
    color: NIGHT_COLORS.amber,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  gameOverTitle: {
    color: NIGHT_COLORS.paper,
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 8,
  },
  gameOverScore: {
    color: NIGHT_COLORS.paper,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 12,
  },
  gameOverBest: {
    color: NIGHT_COLORS.muted,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 13,
  },
  gameOverMenuButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    paddingHorizontal: 18,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
});
