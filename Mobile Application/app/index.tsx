import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useUser } from '../lib/UserContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    // Wait a bit for the auth state to be determined
    const timer = setTimeout(() => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user]);

  // Show loading while determining auth state
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
