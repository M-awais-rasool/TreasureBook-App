import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

import { palette } from './src/theme/palette';
import { HomeScene } from './src/screens/HomeScene';

// Hold the splash until the first frame is ready, so the book's opening
// animation is never half-finished by the time the app becomes visible.
void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.desk.deep);
    setReady(true);
  }, []);

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
      <SafeAreaProvider>
        <HomeScene />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.desk.deep,
  },
});
