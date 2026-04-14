import React, { useState, useEffect, useRef } from "react";
import * as Font from "expo-font";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Animated,
  Modal,
  TextInput,
  ScrollView,
  useWindowDimensions,
  ImageBackground,
} from "react-native";
import { Audio } from "expo-av";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

const initialSounds = [
  {
    id: 1,
    name: "Sound 1",
    uri: "https://www.soundjay.com/free-music_c2026/barn-beat-01.mp3",
  },
  {
    id: 2,
    name: "Sound 2",
    uri: "https://www.soundjay.com/free-music_c2026/midnight-ride-01a.mp3",
  },
];

const COLORS = {
  background: "#E8DCC3",
  panel: "#D4C2A8",
  button: "#CFAF7B",
  border: "#6B4F2A",
  text: "#2F2A1F",
  accent: "#7FB069",
  danger: "#B85C5C",
  utility: "#414147",
};

const Firefly = ({ isNight }) => {
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const baseOpacity = 0.4 + Math.random() * 0.2;

  const startX = useRef(Math.random() * 400).current;
  const startY = useRef(Math.random() * 800).current;

  useEffect(() => {
    position.setValue({ x: startX, y: startY });

    const runCycle = () => {
      const delay = Math.random() * 5000; // 👈 random wait before appearing

      setTimeout(() => {
        const newX = Math.random() * 400;
        const newY = Math.random() * 800;

        Animated.sequence([
          // 🌟 fade in
          Animated.timing(opacity, {
            toValue: baseOpacity,
            duration: 1500,
            useNativeDriver: true,
          }),

          // 🐛 move + glow
          Animated.parallel([
            Animated.timing(position, {
              toValue: { x: newX, y: newY },
              duration: 8000 + Math.random() * 4000,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(opacity, {
                toValue: 0.4,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 0.6,
                duration: 2000,
                useNativeDriver: true,
              }),
            ]),
          ]),

          // 🌫️ fade out
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]).start(() => runCycle()); // 🔁 repeat forever
      }, delay);
    };

    runCycle();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Math.random() > 0.5 ? "#fff6a9" : "#ffe97a",
        shadowColor: "#fff6a9",
        shadowOpacity: isNight ? 0.4 : 0.15,
        shadowRadius: 3,
        opacity,
        transform: [{ translateX: position.x }, { translateY: position.y }],
      }}
    />
  );
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [buttons, setButtons] = useState(initialSounds);
  const [sounds, setSounds] = useState({});
  const playingIds = Object.keys(sounds).map(Number);
  const anims = useRef({});
  const [isNight, setIsNight] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [tipsVisible, setTipsVisible] = useState(false);
  const [allowOverlap, setAllowOverlap] = useState(false); // rapid re-tap
  const [optionsLoaded, setOptionsLoaded] = useState(false); //guard saved options
  const nightOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!optionsLoaded) return;

    AsyncStorage.setItem("OPTIONS", JSON.stringify({ allowOverlap }));
  }, [allowOverlap, optionsLoaded]);

  useEffect(() => {
    async function loadOptions() {
      const data = await AsyncStorage.getItem("OPTIONS");
      if (data) {
        const parsed = JSON.parse(data);
        setAllowOverlap(parsed.allowOverlap ?? false);
      }

      setOptionsLoaded(true); // 👈 important
    }

    loadOptions();
  }, []);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        Pixel: require("./assets/fonts/PressStart2P-Regular.ttf"),
      });
      setFontsLoaded(true);
    }

    loadFonts();
  }, []);

  // Animation change to Night and Day
  useEffect(() => {
    Animated.timing(nightOpacity, {
      toValue: isNight ? 0.65 : 0,
      duration: 800,
      delay: isNight ? 200 : 0,
      useNativeDriver: true,
    }).start();
  }, [isNight]);

  async function playSound(button) {
    // STOP case
    // Stop if allowOverlap is NOT selected
    if (!allowOverlap && playingIds.includes(button.id)) {
      const soundArray = sounds[button.id] || [];

      for (const s of soundArray) {
        await s.stopAsync();
        await s.unloadAsync();
      }

      const anim = anims.current[button.id];
      if (anim) {
        anim.stopAnimation();
        anim.setValue(1);
        delete anims.current[button.id];
      }

      setSounds((prev) => {
        const copy = { ...prev };
        delete copy[button.id];
        return copy;
      });

      return;
    }

    // BLOCK rapid re-trigger if disabled
    if (!allowOverlap && playingIds.includes(button.id)) return;

    // START case
    const { sound: newSound } = await Audio.Sound.createAsync({
      uri: button.uri,
    });

    // ANIMATION
    if (anims.current[button.id]) {
      anims.current[button.id].stopAnimation();
    }

    const anim = new Animated.Value(1);
    anims.current[button.id] = anim;

    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    setSounds((prev) => ({
      ...prev,
      [button.id]: [...(prev[button.id] || []), newSound],
    }));

    await newSound.playAsync();

    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        newSound.unloadAsync();

        setSounds((prev) => {
          const copy = { ...prev };

          if (copy[button.id]) {
            const remaining = copy[button.id].filter((s) => s !== newSound);

            if (remaining.length > 0) {
              copy[button.id] = remaining;
            } else {
              delete copy[button.id];

              // stop animation ONLY when last sound ends
              const anim = anims.current[button.id];
              if (anim) {
                anim.stopAnimation();
                anim.setValue(1);
                delete anims.current[button.id];
              }
            }
          }

          return copy;
        });
      }
    });
  }

  useEffect(() => {
    return () => {
      Object.values(sounds).forEach((arr) => {
        arr.forEach((s) => s.unloadAsync());
      });
    };
  }, []);

  function deleteButton(id) {
    Alert.alert("Delete", "Remove this sound?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: () => setButtons(buttons.filter((b) => b.id !== id)),
      },
    ]);
  }

  useEffect(() => {
    loadButtons();
  }, []);

  async function loadButtons() {
    try {
      const data = await AsyncStorage.getItem("cozyboard");
      if (data) {
        const parsed = JSON.parse(data);

        // Ensure every item has an id
        const cleaned = parsed.map((item, index) => ({
          id: item.id ?? Date.now() + index,
          name: item.name,
          uri: item.uri,
        }));

        setButtons(cleaned);
      }
    } catch (e) {
      console.log(e);
    }
  }

  useEffect(() => {
    saveButtons();
  }, [buttons]);

  async function saveButtons() {
    try {
      await AsyncStorage.setItem("cozyboard", JSON.stringify(buttons));
    } catch (e) {
      console.log(e);
    }
  }

  async function addButton() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      // 👇 remove extension
      const cleanName = file.name
        ? file.name
            .replace(/\.[^/.]+$/, "") // remove extension
            .replace(/[_-]/g, " ") // replace _ and -
        : `Sound ${buttons.length + 1}`;

      const newButton = {
        id: Date.now(),
        name: cleanName,
        uri: file.uri,
      };

      setButtons([...buttons, newButton]);
    } catch (err) {
      console.log(err);
    }
  }

  const [renameVisible, setRenameVisible] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  function openRename(id) {
    const current = buttons.find((b) => b.id === id);
    setSelectedId(id);
    setRenameText(current?.name || "");
    setRenameVisible(true);
  }

  function saveRename() {
    if (!renameText) return;

    setButtons((prev) =>
      prev.map((b) => (b.id === selectedId ? { ...b, name: renameText } : b)),
    );

    setRenameVisible(false);
  }

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const NUM_COLUMNS = isLandscape ? 5 : 3;
  const SPACING = isLandscape ? 6 : 10;

  const buttonSize = (width - SPACING * (NUM_COLUMNS - 1) - 20) / NUM_COLUMNS;

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ fontFamily: "Pixel", fontSize: 12 }}>loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <ImageBackground
        source={require("./assets/images/grass3.png")}
        resizeMode="repeat"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
      />

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: "#0b1a2a",
          opacity: nightOpacity,
        }}
      />

      {isNight && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            opacity: nightOpacity,
          }}
        >
          <Firefly isNight={isNight} />
          <Firefly isNight={isNight} />
          <Firefly isNight={isNight} />
          <Firefly isNight={isNight} />
        </Animated.View>
      )}

      {/* 👇 This is the UI */}
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <StatusBar style={isNight ? "light" : "dark"} />

        <Pressable
          style={styles.optionButton}
          onPress={() => setOptionsVisible(true)}
        >
          <Text style={{ color: "#fff", fontSize: 12 }}>⚙️</Text>
        </Pressable>

        <Pressable
          style={[
            styles.optionButton,
            { left: 185 }, // adjust position as needed
          ]}
          onPress={() => setTipsVisible(true)}
        >
          <Text style={{ color: "#fff", fontSize: 12 }}>tips</Text>
        </Pressable>

        <Pressable
          style={styles.nightButton}
          onPress={() => setIsNight(!isNight)}
        >
          <Text style={{ color: "#fff", fontSize: 12 }}>
            {isNight ? "☀️" : "🌙"}
          </Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.grid}>
          {buttons.map((item, index) => {
            const isLastInRow = (index + 1) % NUM_COLUMNS === 0;
            const anim = anims.current[item.id];

            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.button,
                  {
                    width: buttonSize,
                    height: buttonSize,
                    marginBottom: SPACING,
                    marginRight: isLastInRow ? 0 : SPACING,
                    backgroundColor: isNight
                      ? "#5a4a32"
                      : index % 2 === 0
                        ? COLORS.button
                        : "#d4b685",
                  },
                  sounds[item.id]?.length > 0 && styles.active,
                  {
                    transform: [
                      {
                        scale: sounds[item.id]?.length > 0 && anim ? anim : 1,
                      },
                    ],
                  },
                ]}
              >
                <Pressable
                  onLongPress={() => deleteButton(item.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>

                <Pressable
                  onPress={() => playSound(item)}
                  onLongPress={() => openRename(item.id)}
                  delayLongPress={800}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: pressed ? 0.7 : 1,
                      transform: [{ scale: pressed ? 0.9 : 1 }],
                    },
                  ]}
                >
                  <Text style={styles.text}>{item.name}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>

        <Pressable style={styles.addButton} onPress={addButton}>
          <Text style={styles.addText}>＋</Text>
        </Pressable>

        <Pressable
          style={styles.stopButton}
          onPress={async () => {
            // 🔊 stop sounds
            for (const soundArray of Object.values(sounds)) {
              for (const s of soundArray) {
                await s.stopAsync();
                await s.unloadAsync();
              }
            }

            // ✨ stop ALL animations
            Object.values(anims.current).forEach((anim) => {
              if (anim) {
                anim.stopAnimation();
                anim.setValue(1); // reset scale
              }
            });

            anims.current = {}; // clear them

            // 🧹 reset state
            setSounds({});
          }}
        >
          <Text style={styles.stopText}>🔇</Text>
        </Pressable>

        {/* Rename Sound Modal */}
        <Modal visible={renameVisible} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <View
              style={{
                width: "80%",
                backgroundColor: "#fff",
                padding: 20,
                borderRadius: 10,
              }}
            >
              <Text style={{ marginBottom: 10 }}>Rename Sound</Text>

              <TextInput
                value={renameText}
                onChangeText={setRenameText}
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  padding: 10,
                  marginBottom: 15,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Pressable onPress={() => setRenameVisible(false)}>
                  <Text>Cancel</Text>
                </Pressable>

                <Pressable onPress={saveRename}>
                  <Text style={{ fontWeight: "bold" }}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Options Modal */}
        <Modal visible={optionsVisible} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.4)",
            }}
          >
            <View
              style={{
                width: "80%",
                backgroundColor: COLORS.panel,
                padding: 20,
                borderRadius: 12,
                borderWidth: 3,
                borderColor: COLORS.border,

                shadowColor: "#000",
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 0,
              }}
            >
              <Text
                style={{
                  fontFamily: "Pixel",
                  fontSize: 12,
                  marginBottom: 15,
                  textAlign: "center",
                }}
              >
                ⚙️ SETTINGS ⚙️
              </Text>

              {/* 🔊 Rapid Tap Toggle */}
              <Pressable
                onPress={() => setAllowOverlap(!allowOverlap)}
                style={{
                  backgroundColor: allowOverlap ? COLORS.accent : COLORS.button,
                  padding: 10,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: COLORS.border,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Pixel",
                    fontSize: 10,
                    textAlign: "center",
                    textAlignVertical: "center",
                    includeFontPadding: false,
                  }}
                >
                  Rapid Tap: {allowOverlap ? "ON" : "OFF"}
                </Text>
              </Pressable>

              <Text
                style={{
                  fontSize: 12,
                  marginBottom: 15,
                  textAlign: "left",
                }}
              >
                Rapid Tap allows you to play sounds on top of each other by
                pressing more than once. Use the STOP ALL SOUNDS button to halt
                playing.
              </Text>

              <Pressable onPress={() => setOptionsVisible(false)}>
                <Text style={{ textAlign: "right", fontWeight: "bold" }}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Tips Modal */}
        <Modal visible={tipsVisible} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          >
            <View
              style={{
                width: '80%',
                backgroundColor: COLORS.panel,
                padding: 20,
                borderRadius: 12,
                borderWidth: 3,
                borderColor: COLORS.border,

                shadowColor: '#000',
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 0,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Pixel',
                  fontSize: 12,
                  marginBottom: 15,
                  textAlign: 'center',
                }}
              >
                💡 TIPS 💡
              </Text>

              <View style={{ gap: 10, marginBottom: 15 }}>
                <Text style={styles.tipText}>
                  • Long press to rename a sound button
                </Text>

                <Text style={styles.tipText}>
                  • Long press a mini delete button to remove a sound from the app (not your device)
                </Text>

                <Text style={styles.tipText}>
                  • Use 🔇 to stop all sounds instantly
                </Text>

                <Text style={styles.tipText}>
                  • Toggle Night mode to see some fireflies
                </Text>
              </View>

              <Pressable onPress={() => setTipsVisible(false)}>
                <Text style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    paddingBottom: 100, // 👈 add this
  },

  button: {
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.border,
    backgroundColor: COLORS.button,
    justifyContent: "center",
    alignItems: "center",

    // 👇 subtle pixel "pressed" feel
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
  },

  active: {
    backgroundColor: COLORS.accent,
  },

  text: {
    fontFamily: "Pixel",
    color: COLORS.text,
    textAlign: "center",
    fontSize: 10, // 👈 pixel fonts need smaller size
    paddingHorizontal: 4,
  },

  addButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.border,
    padding: 14,
  },

  addText: {
    fontFamily: "Pixel",
    color: "#000",
    fontSize: 30,
    fontWeight: "bold",
  },

  stopButton: {
    position: "absolute",
    bottom: 30,
    left: 30,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.border,
    padding: 14,
  },

  stopText: {
    fontFamily: "Pixel",
    color: "#000",
    fontSize: 32,
    fontWeight: "bold",
  },

  deleteButton: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 10,

    width: 22,
    height: 22,
    borderRadius: 4,

    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: COLORS.border,

    justifyContent: "center",
    alignItems: "center",
  },

  deleteText: {
    fontFamily: "Pixel",
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: -5,
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  tipText: {
    fontFamily: 'Pixel',
    fontSize: 10,
    color: COLORS.text,
  },

  optionButton: {
    position: "absolute",
    bottom: 30,
    left: 120,
    zIndex: 300,
    padding: 10,
    backgroundColor: COLORS.utility,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.border,
  },

  nightButton: {
    position: "absolute",
    bottom: 30,
    right: 120,
    zIndex: 200,
    padding: 10,
    backgroundColor: COLORS.utility,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.border,
  },
});
