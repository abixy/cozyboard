import React from "react";
import { View, Pressable, Animated, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

export default function PixelButton({
  children,
  onPress,
  onLongPress,
  delayLongPress = 300,
  size,
  style,
  isActive,
  anim,
}) {
  return (
    <Animated.View
      style={[
        styles.button,
        style,
        isActive && styles.active,
        {
          width: size,
          height: size,
          transform: [
            {
              scale: isActive && anim ? anim : 1,
            },
          ],
        },
      ]}
    >
      <Pressable
        android_disableSound={true}  //DISABLES Android's default button press sound!
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress && onPress();
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress && onLongPress();
        }}
        delayLongPress={delayLongPress}
        style={({ pressed }) => [
          styles.inner,
          {
            transform: [{ scale: pressed ? 0.95 : 1 }],
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#CFAF7B",
    borderWidth: 4,
    borderColor: "#6B4F2A",
    borderRadius: 2,
  },

  active: {
    backgroundColor: "#7FB069",
    borderColor: "#9BE07C",
  },

  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
