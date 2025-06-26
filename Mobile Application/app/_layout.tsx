import { UserProvider } from '../lib/UserContext';
import { RefreshProvider } from '../lib/RefreshContext';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <UserProvider>
      <RefreshProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </RefreshProvider>
    </UserProvider>
  );
}