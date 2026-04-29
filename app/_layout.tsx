import { Stack } from 'expo-router';
import { Platform, UIManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Habilita animações no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#020617" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#020617' }, // 🔥 padrão do sistema
        }}
      >
        <Stack.Screen name="cliente/index" />
        <Stack.Screen name="merchant/index" />
        <Stack.Screen name="_ampadmin/index" />
      </Stack>
    </>
  );
}