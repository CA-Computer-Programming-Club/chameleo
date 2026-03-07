import { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import GoogleIcon from "@/assets/images/google-logo.png";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "react-native";

import { SERVER_URL } from "@/config";

WebBrowser.maybeCompleteAuthSession();

if (Platform.OS !== "web" && GoogleSignin) {
  GoogleSignin.configure({
    webClientId:
      "131708705239-02b01cemnlljld61bp6vgmmstf7c96ov.apps.googleusercontent.com",
    iosClientId:
      "131708705239-35r4k29vfeo87obi7cjsftdk9alsfs5f.apps.googleusercontent.com",
    offlineAccess: true, // Get refresh token
  });
}

// Storage keys
const USER_STORAGE_KEY = "google_user_info";

export default function LoginScreen() {
  const scheme = useColorScheme();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // Web authentication
  const [request, response, promptAsync] =
    Platform.OS === "web"
      ? Google.useIdTokenAuthRequest({
          clientId:
            "131708705239-02b01cemnlljld61bp6vgmmstf7c96ov.apps.googleusercontent.com",
        })
      : [null, null, null];

  // ===== PERSISTENCE FUNCTIONS =====
  const storeUserInfo = async (userData) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error("Error storing user info:", error);
    }
  };

  const getUserInfo = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Error getting user info:", error);
      return null;
    }
  };

  const clearUserInfo = async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await AsyncStorage.removeItem("session_token");
    } catch (error) {
      console.error("Error clearing user info:", error);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const storedUser = await getUserInfo();
        const storedSessionToken = await AsyncStorage.getItem("session_token");

        if (!storedUser || !storedSessionToken) {
          return;
        }

        // Verify with backend
        const res = await fetch(`${SERVER_URL}/me`, {
          headers: {
            Authorization: `Bearer ${storedSessionToken}`,
          },
        });

        if (res.status === 200) {
          // Token still valid; keep user logged in
          setUserInfo(storedUser);
        } else if (res.status === 401) {
          // Backend says session is invalid
          await clearUserInfo();
        } else {
          console.warn("Unexpected /me status:", res.status);
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setLoading(false);
        setInitialCheckComplete(true);
      }
    };

    checkExistingSession();
  }, []);

  // Handle web authentication response
  useEffect(() => {
    const handleWebAuth = async () => {
      if (Platform.OS === "web" && response?.type === "success") {
        const idToken = (response as any).params?.id_token;

        if (!idToken) {
          console.error("No id_token in Google web auth response:", response);
          return;
        }

        setLoading(true);
        try {
          const backendResponse = await fetch(`${SERVER_URL}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: idToken }),
          });

          if (!backendResponse.ok) {
            const text = await backendResponse.text();
            throw new Error(text || "Failed to authenticate with backend");
          }

          const { session_token, user } = await backendResponse.json();

          await AsyncStorage.setItem("session_token", session_token);
          await storeUserInfo(user);
          setUserInfo(user);
        } catch (error) {
          console.error("Web login error:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    handleWebAuth();
  }, [response]);

  // Native login
  const nativeLogin = async () => {
    if (!GoogleSignin) {
      alert("Google Sign-In requires a custom build.");
      return;
    }

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      const idToken = response?.data?.idToken;

      if (!idToken) {
        throw new Error("No ID token returned from Google Sign-In");
      }
      // Send ID token to backend to verify and get our own session token
      const backendResponse = await fetch(`${SERVER_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!backendResponse.ok) {
        const text = await backendResponse.text();
        throw new Error(text || "Failed to authenticate with backend");
      }

      const { session_token, user } = await backendResponse.json();

      // Store backend session token separately
      await AsyncStorage.setItem("session_token", session_token);

      // Also store user info for UI purposes
      await storeUserInfo(user);
      setUserInfo(user);
    } catch (error) {
      console.error("Native login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (Platform.OS !== "web" && GoogleSignin) {
        await GoogleSignin.signOut();
      }

      await clearUserInfo();
      setUserInfo(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const GoogleSignInButton = ({ onPress, disabled }) => (
    <Pressable
      style={[
        styles.googleButton,
        {
          backgroundColor: scheme === "dark" ? "#2c2c2e" : "#fff",
          borderColor:
            scheme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
        },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <ThemedView
        style={styles.buttonContent}
        lightColor="#fff"
        darkColor="#2c2c2e"
      >
        <Image source={GoogleIcon} style={styles.googleIcon} />
        <ThemedText
          lightColor="#444"
          darkColor="#eee"
          style={styles.googleButtonText}
        >
          Sign in with Google
        </ThemedText>
      </ThemedView>
    </Pressable>
  );

  const ProfileView = ({ user, onLogout }) => (
    <ThemedView
      style={[
        styles.profileContainer,
        {
          backgroundColor: scheme === "dark" ? "#2c2c2e" : "#fff",
        },
      ]}
    >
      <Image
        source={{ uri: user.photo }}
        style={styles.profileImage}
        onError={(e) =>
          console.log("Failed to load image", e.nativeEvent.error)
        }
      />
      <ThemedText style={styles.userName}>{user.name}</ThemedText>
      <ThemedText
        style={[
          styles.userEmail,
          { color: scheme === "dark" ? "#888" : "#666" },
        ]}
      >
        {user.email}
      </ThemedText>
      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
      </Pressable>
    </ThemedView>
  );

  // Loading State and show spinner during initial check
  if (loading || !initialCheckComplete) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {userInfo ? (
        <ProfileView user={userInfo} onLogout={logout} />
      ) : (
        <ThemedView style={styles.loginContainer}>
          <ThemedText type="title" style={styles.title}>
            Welcome to Chameleo!
          </ThemedText>
          <ThemedText
            lightColor="#666"
            darkColor="#ccc"
            style={styles.subtitle}
          >
            Sign in to access complete functionality
          </ThemedText>
          {Platform.OS === "web" ? (
            <GoogleSignInButton
              onPress={() => promptAsync()}
              disabled={!request}
            />
          ) : (
            <GoogleSignInButton onPress={nativeLogin} />
          )}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loginContainer: {
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: "100%",
    maxWidth: 300,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  profileContainer: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: "100%",
    maxWidth: 350,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "#13694E",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    paddingVertical: 4,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: "center",
  },
  logoutButton: {
    backgroundColor: "#dc3545",
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 120,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
});
