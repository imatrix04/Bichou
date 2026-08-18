import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

interface Props {
  onFinish: () => void;
}

export default function VideoSplashScreen({ onFinish }: Props) {
  const player = useVideoPlayer(
    require("../assets/videos/splash-bichou.mp4"),
    (p) => {
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
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={onFinish}
    >
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7E1E4" },
  video: { flex: 1 },
});