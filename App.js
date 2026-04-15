import React, { useState, useEffect, useRef } from "react";

// Code from RevenueCat
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
// Code from RevenueCat

import {
  View,
  Image,
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
import {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";

import PixelButton from "./components/PixelButton";

const initialSounds = [
  {
    id: 1,
    name: "Airhorn (try Rapid Tap in Options)",
    source: require("./assets/sounds/airhorn-single.mp3"),
  },
  {
    id: 2,
    name: "Sad Trombone",
    source: require("./assets/sounds/sad-trombone.mp3"),
  },
  {
    id: 3,
    name: "Whimsy Lane",
    source: require("./assets/sounds/song-whimsy-lane.mp3"),
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
  const baseOpacity = 0.8 + Math.random() * 0.2;

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
        ]).start(() => runCycle()); // repeat forever
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

function AppContent() {
  const [isPremium, setIsPremium] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [buttons, setButtons] = useState(initialSounds);
  const [sounds, setSounds] = useState({});
  const playingIds = Object.keys(sounds).map(Number);
  const anims = useRef({});
  const [isNight, setIsNight] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [allowOverlap, setAllowOverlap] = useState(false); // rapid re-tap
  const [optionsLoaded, setOptionsLoaded] = useState(false); //guard saved options
  const nightOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Potentially needed for iOS sound initialization
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // Check for Premium in-app purchase
  useEffect(() => {
    async function initPurchases() {
      try {
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

        const apiKey =
          Platform.OS === "ios"
            ? "test_UfpLQXKlBmneAYnSKIVfBCNDBbi"
            : "test_UfpLQXKlBmneAYnSKIVfBCNDBbi";

        await Purchases.configure({ apiKey });

        // Check if user already owns premium
        const customerInfo = await Purchases.getCustomerInfo();

        const isPremiumActive = !!customerInfo.entitlements.active["premium"];

        setIsPremium(isPremiumActive);
      } catch (e) {
        console.log("RevenueCat init error:", e);
      }
    }

    initPurchases();
  }, []);

  // Listener that continually checks if app is Premium
  useEffect(() => {
    Purchases.addCustomerInfoUpdateListener((info) => {
      const isPremiumActive =
        !!info.entitlements.active["premium"];

      setIsPremium(isPremiumActive);
    });

    return () => {
      try {
        listener?.remove?.();
      } catch (e) {
        console.log("Listener cleanup error:", e);
      }
    };
  }, []);

  // USE TEMPORARILY TO CLEAR STORED SOUNDS AND LOAD DEFAULTS
  // AsyncStorage.clear();
  // USE TEMPORARILY TO CLEAR STORED SOUNDS AND LOAD DEFAULTS

  // LOGGING for TESTING!
  //console.log("isPremium:", isPremium);

  // Same for Options, persist and remember
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

      setOptionsLoaded(true); // important
    }

    loadOptions();
  }, []);
  // *Same for Options, persist and remember

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
    const { sound: newSound } = await Audio.Sound.createAsync(
      button.source || { uri: button.uri },
    );

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
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
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
    Alert.alert("Delete", "Remove this sound button?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: () => setButtons(buttons.filter((b) => b.id !== id)),
      },
    ]);
  }

  function clearAllSounds() {
    Alert.alert(
      "Clear Soundboard",
      "Are you sure you want to clear the soundboard?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            // 🔊 stop all sounds
            for (const soundArray of Object.values(sounds)) {
              for (const s of soundArray) {
                await s.stopAsync();
                await s.unloadAsync();
              }
            }

            // ✨ stop animations
            Object.values(anims.current).forEach((anim) => {
              if (anim) {
                anim.stopAnimation();
                anim.setValue(1);
              }
            });

            anims.current = {};

            // 🧹 clear state
            setSounds({});
            setButtons([]);
          },
        },
      ],
    );
  }

  async function restoreDefaultSounds() {
    Alert.alert(
      "Restore Defaults",
      "Replace your current soundboard with the default sounds?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

            // 🔊 stop all sounds
            for (const soundArray of Object.values(sounds)) {
              for (const s of soundArray) {
                await s.stopAsync();
                await s.unloadAsync();
              }
            }

            // ✨ stop animations
            Object.values(anims.current).forEach((anim) => {
              if (anim) {
                anim.stopAnimation();
                anim.setValue(1);
              }
            });

            anims.current = {};

            // 🧹 reset state
            setSounds({});
            setButtons(initialSounds);
          },
        },
      ]
    );
  }

  useEffect(() => {
    loadButtons();
  }, []);

  async function loadButtons() {
    try {
      const data = await AsyncStorage.getItem("cozyboard");

      // DEV Only used during dev to clear initial sound data
      //useEffect(() => {AsyncStorage.removeItem("cozyboard");}, []);

      if (data) {
        const parsed = JSON.parse(data);

        if (Array.isArray(parsed) && parsed.length > 0) {
          setButtons(parsed);
        } else {
          setButtons(initialSounds); // fallback if empty
        }
      } else {
        setButtons(initialSounds);
      }
    } catch (e) {
      console.log(e);
      setButtons(initialSounds); // safety fallback
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
    const userAddedCount = buttons.filter(b => b.uri).length;

    if (!isPremium && userAddedCount >= 3) {
      showUpgradePrompt();
      return;
    }
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

  function showUpgradePrompt() {
    Alert.alert(
      "Upgrade to Premium Version.",
      "You’ve reached the 3 sound limit.\nUnlock unlimited sounds for life?",
      [
        { text: "Cancel", style: "cancel" },
        { text: isPurchasing ? "Processing..." : "Upgrade", onPress: purchaseFull },
      ],
    );
  }

  async function purchaseFull() {
    if (isPurchasing) return; // prevent double taps

    setIsPurchasing(true);

    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;

      if (!current || current.availablePackages.length === 0) {
        Alert.alert("Error", "No products available.");
        setIsPurchasing(false);
        return;
      }

      const { customerInfo } =
        await Purchases.purchasePackage(pkg);

      const isPremiumActive =
        !!customerInfo.entitlements.active["premium"];

      if (isPremiumActive) {
        setIsPremium(true);
        Alert.alert("Success", "Premium unlocked!");

        // LOGGING
        console.log(customerInfo.entitlements.active);
      }
    } catch (e) {
      if (!e.userCancelled) {
        console.log("Purchase error:", e);
        Alert.alert("Error", "Purchase failed.");
      }
    } finally {
      setIsPurchasing(false); // always reset
    }
  }

  async function restorePurchases() {
    try {
      const customerInfo = await Purchases.restorePurchases();

      const isPremiumActive = !!customerInfo.entitlements.active["premium"];

      if (isPremiumActive) {
        setIsPremium(true);
        Alert.alert("Restored", "Your purchase has been restored!");
      } else {
        Alert.alert("No Purchases", "Nothing to restore.");
      }
    } catch (e) {
      console.log("Restore error:", e);
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

  const H_PADDING = 20; // 10 left + 10 right
  const buttonSize =
    (width - H_PADDING - SPACING * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const [hasEntered, setHasEntered] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  if (!hasEntered) {
    return (
      <View style={{ flex: 1 }}>
        {/* 🌿 Grass background */}
        <ImageBackground
          source={require("./assets/images/grass3.png")}
          resizeMode="repeat"
          style={StyleSheet.absoluteFillObject}
        />

        {/* 👇 Content */}
        <Pressable
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => setHasEntered(true)}
        >
          <Image
            source={require("./assets/images/cozy-sign.png")}
            style={{
              width: "90%",
              height: "50%",
              resizeMode: "contain",
            }}
          />

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ scale: pulseAnim }],
              marginTop: 20,
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.1],
                outputRange: [0.7, 1],
              }),
            }}
          >
            <Text
              style={{
                fontSize: 24,
                textAlign: "center",
              }}
            >
              Tap to Start
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        {/* 🌿 Background */}
        <ImageBackground
          source={require("./assets/images/grass3.png")}
          resizeMode="repeat"
          style={StyleSheet.absoluteFillObject}
        />

        {/* 🌙 Overlay */}
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "#0b1a2a",
            opacity: nightOpacity,
          }}
        />

        {isNight && (
          <Animated.View
            pointerEvents="none"
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: nightOpacity,
            }}
          >
            <Firefly isNight={isNight} />
            <Firefly isNight={isNight} />
            <Firefly isNight={isNight} />
            <Firefly isNight={isNight} />
            <Firefly isNight={isNight} />
            <Firefly isNight={isNight} />
          </Animated.View>
        )}

        {/* ✅ SAFE AREA WRAPS EVERYTHING INTERACTIVE */}
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={{ flex: 1 }}>
            <StatusBar
              style={isNight ? "light" : "dark"}
              translucent={true}
              backgroundColor="transparent"
            />

            <ScrollView
              contentContainerStyle={[styles.grid, { paddingTop: 10 }]}
            >
              {buttons.map((item, index) => {
                const isLastInRow = (index + 1) % NUM_COLUMNS === 0;
                const anim = anims.current[item.id];

                return (
                  <PixelButton
                    key={item.id}
                    size={buttonSize}
                    onPress={() => playSound(item)}
                    onLongPress={() => openRename(item.id)}
                    delayLongPress={800}
                    isActive={sounds[item.id]?.length > 0}
                    anim={anims.current[item.id]}
                    style={{
                      marginRight:
                        (index + 1) % NUM_COLUMNS === 0 ? 0 : SPACING,
                      marginBottom: SPACING,
                      backgroundColor: isNight
                        ? "#d4b685"
                        : index % 2 === 0
                          ? COLORS.button
                          : "#d4b685",
                    }}
                  >
                    {/* delete button */}
                    <Pressable
                      onLongPress={() => deleteButton(item.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </Pressable>

                    {/* label */}
                    <Text style={styles.text}>{item.name}</Text>
                  </PixelButton>
                );
              })}
            </ScrollView>

            {/* Bottom Buttons */}
            <View
              style={{
                position: "absolute",
                bottom: insets.bottom + 10,
                width: "100%",
                flexDirection: "row",
                justifyContent: "space-evenly",
                alignItems: "center",
              }}
            >
              
              <Pressable
                style={[styles.stopButton]}
                onPress={async () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Warning,
                  );
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
                <Image
                  source={require("./assets/images/sprite-stopsound.png")}
                  style={{
                    width: 50,
                    height: 50,
                  }}
                />
                {/* <Text style={styles.stopText}>🔇</Text> */}
              </Pressable>

              <Pressable
                style={[styles.optionButton]}
                onPress={() => setOptionsVisible(true)}
              >
                <Image
                  source={require("./assets/images/sprite-options.png")}
                  style={{
                    width: 50,
                    height: 50,
                  }}
                />
                {/* <Text style={{ color: "#fff", fontSize: 20 }}>⚙️</Text> */}
              </Pressable>

              <Pressable
                style={[styles.infoButton]}
                onPress={() => setInfoVisible(true)}
              >
                <Image
                  source={require("./assets/images/sprite-info.png")}
                  style={{
                    width: 50,
                    height: 50,
                  }}
                />
                {/* <Text style={{ color: "#fff", fontSize: 20 }}>ℹ️</Text> */}
              </Pressable>

              <Pressable
                style={[styles.nightButton]}
                onPress={() => setIsNight(!isNight)}
              >
                <Image
                  source={
                    isNight
                      ? require("./assets/images/sprite-day.png")
                      : require("./assets/images/sprite-night.png")
                  }
                  style={{
                    width: 50,
                    height: 50,
                  }}
                />
                {/* 
                <Text style={{ color: "#fff", fontSize: 20 }}>
                  {isNight ? "☀️" : "🌙"}
                </Text>
                */}
              </Pressable>

              <Pressable
                style={[styles.addButton]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  addButton();
                }}
              >
                <Image
                  source={require("./assets/images/sprite-addsound.png")}
                  style={{
                    width: 50,
                    height: 50,
                  }}
                />
                {/* <Text style={styles.addText}>＋</Text> */}
              </Pressable>
            </View>

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
                    backgroundColor: COLORS.panel,
                    padding: 20,
                    borderRadius: 12,
                    borderWidth: 3,
                    borderColor: COLORS.border,

                    shadowColor: "#000",
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 0,

                    // 👇 ANDROID shadow
                    elevation: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      marginBottom: 15,
                      textAlign: "center",
                    }}
                  >
                    RENAME SOUND
                  </Text>

                  <TextInput
                    value={renameText}
                    onChangeText={setRenameText}
                    style={{
                      borderWidth: 2,
                      borderColor: "#888",
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
                  backgroundColor: "rgba(0,0,0,0.5)",
                }}
              >
                <View
                  style={{
                    width: "80%",
                    maxHeight: "80%",
                    backgroundColor: COLORS.panel,
                    padding: 20,
                    borderRadius: 12,
                    borderWidth: 3,
                    borderColor: COLORS.border,
                    overflow: "hidden",

                    shadowColor: "#000",
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 0,

                    // 👇 ANDROID shadow
                    elevation: 6, 
                  }}
                >

                  <ScrollView
                    contentContainerStyle={{ padding: 20 }}
                    showsVerticalScrollIndicator={true}
                  >
                    {/* 🔊 Rapid Tap Toggle */}
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setAllowOverlap(!allowOverlap);
                      }}
                      style={{
                        backgroundColor: allowOverlap
                          ? COLORS.accent
                          : COLORS.button,
                        padding: 10,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: COLORS.border,
                        marginBottom: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          textAlign: "center",
                          textAlignVertical: "center",
                          includeFontPadding: false,
                        }}
                      >
                        Rapid Tap: {allowOverlap ? "ON" : "OFF"}
                      </Text>
                    </Pressable>

                    <View style={{ gap: 10, marginBottom: 15 }}>
                      <Text style={styles.tipText}>
                        Rapid Tap allows you to play sounds on top of each other
                        by pressing a button more than once... or even multiple
                        buttons!
                      </Text>

                      <Text style={styles.tipText}>
                        Use 🔇 STOP ALL SOUNDS to stop everything instantly
                      </Text>
                    </View>

                    <Pressable
                      onPress={clearAllSounds}
                      disabled={buttons.length === 0}
                      style={{
                        backgroundColor: COLORS.danger,
                        padding: 10,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: COLORS.border,
                        marginTop: 20,
                        marginBottom: 15,
                        opacity: buttons.length === 0 ? 0.5 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "#fff",
                          textAlign: "center",
                          textAlignVertical: "center",
                          includeFontPadding: false,
                        }}
                      >
                        
                        CLEAR SOUNDBOARD
                      </Text>
                    </Pressable>

                    <View style={{ gap: 10, marginBottom: 15 }}>
                      <Text style={styles.tipText}>
                        Clear Soundboard of all sound buttons. Does not delete
                        files from your device, just removes all buttons in the
                        app.
                      </Text>
                    </View>

                    <Pressable
                      onPress={restoreDefaultSounds}
                      style={{
                        backgroundColor: COLORS.utility,
                        padding: 10,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: COLORS.border,
                        marginBottom: 15,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "#fff",
                          textAlignVertical: "center",
                          includeFontPadding: false,
                        }}
                      >
                        Restore Default Sounds
                      </Text>
                    </Pressable>

                    <View style={{ gap: 10, marginBottom: 15 }}>
                      <Text style={styles.tipText}>
                        Restore the original built-in sounds.  Will remove custom sound buttons as well!
                      </Text>
                    </View>
                    
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        restorePurchases();
                      }}
                      style={{
                        backgroundColor: allowOverlap,
                        padding: 10,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: COLORS.border,
                        marginBottom: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          textAlign: "center",
                          textAlignVertical: "center",
                          includeFontPadding: false,
                        }}
                      >
                        Restore Purchase
                      </Text>
                    </Pressable>

                    <View style={{ gap: 10, marginBottom: 15 }}>
                      <Text style={styles.tipText}>
                        If you have already unlocked Premium, try to restore it now.
                      </Text>
                    </View>

                    <View style={{ alignItems: "center", marginTop: 0 }}>
                      <Pressable
                        onPress={() => setOptionsVisible(false)}
                        style={({ pressed }) => [
                          styles.modalCloseButton,
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Text style={styles.modalCloseText}>CLOSE</Text>
                      </Pressable>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Info Modal */}
            <Modal visible={infoVisible} transparent animationType="fade">
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
                    backgroundColor: COLORS.panel,
                    padding: 20,
                    borderRadius: 12,
                    borderWidth: 3,
                    borderColor: COLORS.border,

                    shadowColor: "#000",
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 0,

                    // 👇 ANDROID shadow
                    elevation: 6,
                  }}
                >
                  <View style={{ gap: 10, marginBottom: 15 }}>
                    <Text style={styles.tipText}>
                      • Long press a sound button to rename it
                    </Text>

                    <Text style={styles.tipText}>
                      • Long press the mini delete icon to remove a sound button
                      from the app (does not affect your sound file)
                    </Text>

                    <Text style={styles.tipText}>
                      • Use 🔇 to stop all sounds instantly
                    </Text>

                    <Text style={styles.tipText}>
                      • Toggle Night mode to maybe see some fireflies?
                    </Text>
                    {/* 
                    <Text style={styles.tipText}>
                      This is my first app. Hope you find it useful and fun.  Send comments and suggestions.
                    </Text>
                    */}
                    <Text style={styles.tipText}>
                      • Song "Whimsy Lane" used by permission of the author.
                    </Text>
                  </View>

                  <View style={{ alignItems: "center", marginTop: 10 }}>
                    <Pressable
                      onPress={() => setInfoVisible(false)}
                      style={({ pressed }) => [
                        styles.modalCloseButton,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={styles.modalCloseText}>CLOSE</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
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
    paddingHorizontal: 10,
    paddingBottom: 100,
  },

  // main button text
  text: {
    color: COLORS.text,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    paddingHorizontal: 4,
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
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: -5,
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  tipText: {
    fontSize: 14,
    color: COLORS.text,
  },

  stopButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.border,
    padding: 14,
  },

  optionButton: {
    padding: 4,
  },

  infoButton: {
    padding: 4,
  },

  nightButton: {
    padding: 4,
  },

  addButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.border,
    padding: 14,
  },

  modalCloseButton: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.button,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    width: 120,
  },

  modalCloseText: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
});
