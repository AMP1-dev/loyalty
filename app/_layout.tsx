import { Stack } from 'expo-router';
import { Platform, UIManager } from 'react-native';

// Habilita animações no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#0F172A' }, // 🔥 padrão do sistema
      }}
    >
      <Stack.Screen name="cliente/index" />
      <Stack.Screen name="merchant/index" />
    </Stack>
  );
}