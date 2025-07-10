import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

type AuthContextType = {
  isAuthenticated: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Promise<HeadersInit>;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  fetchUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE_URL =
  Platform.OS === "web" ? "http://127.0.0.1:8000" : "http://192.168.2.2:8000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    // Check for existing auth token on app start
    checkAuthStatus();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authenticatedFetch("/api/user");
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      setIsAuthenticated(!!token);
      if (token) {
        await fetchUser();
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
    }
  };

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const token = await AsyncStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = await getAuthHeaders();
    console.log("Making authenticated request to:", `${BASE_URL}${url}`);
    console.log("With headers:", headers);

    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token is invalid or expired
      await logout();
      throw new Error("Session expired. Please login again.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("API Error:", {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response;
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle Laravel validation errors
        if (response.status === 422) {
          const errorMessage = Object.values(data.errors || {})
            .flat()
            .join(", ");
          throw new Error(errorMessage);
        }
        throw new Error(data.message || "Login failed");
      }

      // Store both token and user data
      await AsyncStorage.setItem("authToken", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");

      if (!token) {
        // If no token exists, just clear the state
        setIsAuthenticated(false);
        return;
      }

      // Call logout endpoint
      const response = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Clear local storage regardless of server response
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userData");
      setIsAuthenticated(false);

      if (!response.ok) {
        console.warn("Logout request failed, but local state was cleared");
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if there's an error
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userData");
      setIsAuthenticated(false);
      throw error;
    }
  };

  // Don't render anything until we've checked the auth status
  if (isAuthenticated === null) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        getAuthHeaders,
        authenticatedFetch,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
