import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

interface Props {
  onFinish: () => void;
}

export default function VideoSplashScreen({ onFinish }: Props) {
  const player = useVideoPlayer(
    require("../assets/videos/splash-bichou.mp4"),
    (p) => {
      p.muted = true;
      p.audioMixingMode = "mixWithOthers";
      p.play();
    }
  );

  React.useEffect(() => {
    const abonnement = player.addListener("playToEnd", () => {
      onFinish();
    });
    return () => abonnement.remove();
  }, [player, onFinish]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7E1E4" },
  video: { flex: 1 },
});