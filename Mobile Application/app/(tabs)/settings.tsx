import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import supabase from "../../lib/supabase-client";
import { useUser } from "../../lib/UserContext";

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Login error", error.message);
    } else {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setEmail("");
      setPassword("");
      Alert.alert("Success", "Logged in successfully!");
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Signup error", error.message);
    } else {
      Alert.alert("Success", "Account created! Check your email.");
      setIsLogin(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    Alert.alert("Success", "Logged out successfully!");
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{isLogin ? "Login" : "Sign Up"}</Text>
        
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
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        
        <TouchableOpacity
          style={styles.button}
          onPress={isLogin ? handleLogin : handleSignup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? (isLogin ? "Logging in..." : "Signing up...") : (isLogin ? "Login" : "Sign Up")}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.switchButton}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      <View style={styles.userInfo}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.label}>User ID:</Text>
        <Text style={styles.userId}>{user.id}</Text>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.label}>Account created:</Text>
        <Text style={styles.userDate}>
          {new Date(user.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff", 
    padding: 16,
    justifyContent: "center"
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 32,
    textAlign: "center"
  },
  input: { 
    width: "100%", 
    maxWidth: 300, 
    borderWidth: 1, 
    borderColor: "#ccc", 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 16,
    color: "#222",
    alignSelf: "center"
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    maxWidth: 300,
    alignSelf: "center",
    width: "100%"
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16
  },
  switchButton: {
    marginTop: 16,
    alignSelf: "center"
  },
  switchText: {
    color: "#007AFF",
    textAlign: "center"
  },
  userInfo: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4
  },
  userEmail: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333"
  },
  userId: {
    fontSize: 14,
    color: "#666",
    fontFamily: "monospace"
  },
  userDate: {
    fontSize: 16,
    color: "#333"
  },
  logoutButton: {
    backgroundColor: "#e11d48",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 32,
  },
  logoutText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16
  }
});
