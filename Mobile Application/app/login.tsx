import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import supabase from "../lib/supabase-client";
import { useUser } from "../lib/UserContext";

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)");
    }
  }, [user]);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Login error", error.message);
    }
    // user zostanie ustawiony automatycznie przez context
  };

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Signup error", error.message);
    } else {
      Alert.alert("Sukces", "Konto utworzone! Sprawdź maila.");
      setIsLogin(true);
    }
  };

  if (user) return null; // nie pokazuj loginu, jeśli zalogowany

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isLogin ? "Logowanie" : "Rejestracja"}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Hasło"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        title={loading ? (isLogin ? "Logowanie..." : "Rejestracja...") : (isLogin ? "Zaloguj" : "Zarejestruj")}
        onPress={isLogin ? handleLogin : handleSignup}
        disabled={loading}
      />
      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 16 }}>
        <Text style={{ color: "#007AFF" }}>
          {isLogin ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
  input: { 
    width: "100%", 
    maxWidth: 300, 
    borderWidth: 1, 
    borderColor: "#ccc", 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 16,
    color: "#222" // Dodaj ten kolor!
  },
});