import AsyncStorage from "@react-native-async-storage/async-storage";
import { SERVER_URL } from "@/config";
import showAlert from "@/components/alert";

export async function authFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response | null> {
  const token = await AsyncStorage.getItem("session_token");

  if (!token) {
    console.log("[authFetch] No token in storage");
    showAlert("Session expired", "Please sign in again.");
    return null;
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  try {
    const url = `${SERVER_URL}${path}`;
    console.log("[authFetch] Request:", url, { ...options, headers });

    const res = await fetch(url, {
      ...options,
      headers,
    });

    console.log("[authFetch] Response status:", res.status);

    if (res.status === 401) {
      console.log("[authFetch] Got 401, clearing session");
      await AsyncStorage.removeItem("session_token");
      await AsyncStorage.removeItem("google_user_info");

      showAlert(
        "Session expired",
        "Your session has ended. Please sign in again.",
      );

      return null;
    }

    return res;
  } catch (err) {
    console.error("[authFetch] Network or fetch error:", err);
    showAlert("Network error", "Failed to reach the server. Please try again.");
    return null;
  }
}
