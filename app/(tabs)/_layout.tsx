import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Image, Platform, TouchableOpacity, View } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user } = useAuth();

  const handleProfilePress = () => {
    router.push("/profile");
  };

  // Check if user is a student using the new role structure
  const isStudent =
    user &&
    // Check in roles array
    ((user.roles &&
      user.roles.some(
        (role: string) =>
          role.toLowerCase() === "student" || role.toLowerCase() === "students"
      )) ||
      // Check in user_roles array (alternative naming)
      (user.user_roles &&
        user.user_roles.some(
          (role: string) =>
            role.toLowerCase() === "student" ||
            role.toLowerCase() === "students"
        )) ||
      // Check primary_role
      (user.primary_role &&
        (user.primary_role.toLowerCase() === "student" ||
          user.primary_role.toLowerCase() === "students")) ||
      // Check legacy role field as fallback
      (user.role &&
        (user.role.toLowerCase() === "student" ||
          user.role.toLowerCase() === "students")));

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#22c55e", // green-500
        tabBarInactiveTintColor: "#6b7280", // gray-500
        headerShown: true,
        headerTitle: "",
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
            backgroundColor: "#025A2A",
            borderTopWidth: 1,
            borderTopColor: "#121212",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          },
          default: {
            backgroundColor: "#025A2A",
            borderTopWidth: 1,
            borderTopColor: "darkgray",
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
        }),
        headerStyle: {
          backgroundColor: "#025A2A",
          borderBottomWidth: 1,
          borderBottomColor: "#025A2A",
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: "600",
          color: "#1f2937",
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={handleProfilePress}
            style={{
              marginRight: 16,
              padding: 4,
              borderRadius: 20,
              backgroundColor: "#f3f4f6",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
            activeOpacity={0.8}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: "#22c55e",
              }}
            >
              <Image
                source={require("@/assets/images/default-avatar.png")}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                padding: 4,
                borderRadius: 12,
                backgroundColor: focused
                  ? "rgba(34, 197, 94, 0.1)"
                  : "transparent",
              }}
            >
              <IconSymbol
                size={24}
                name="house.fill"
                color={color}
                style={{
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="repository"
        options={{
          title: "Repository",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                padding: 4,
                borderRadius: 12,
                backgroundColor: focused
                  ? "rgba(34, 197, 94, 0.1)"
                  : "transparent",
              }}
            >
              <IconSymbol
                size={24}
                name="server.rack"
                color={color}
                style={{
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: "Activities",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                padding: 4,
                borderRadius: 12,
                backgroundColor: focused
                  ? "rgba(34, 197, 94, 0.1)"
                  : "transparent",
              }}
            >
              <IconSymbol
                size={24}
                name="calendar.badge.clock"
                color={color}
                style={{
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                padding: 4,
                borderRadius: 12,
                backgroundColor: focused
                  ? "rgba(34, 197, 94, 0.1)"
                  : "transparent",
              }}
            >
              <IconSymbol
                size={24}
                name="person.3.sequence.fill"
                color={color}
                style={{
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
            </View>
          ),
          href: isStudent ? null : "/groups",
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                padding: 4,
                borderRadius: 12,
                backgroundColor: focused
                  ? "rgba(34, 197, 94, 0.1)"
                  : "transparent",
              }}
            >
              <IconSymbol
                size={24}
                name="folder.fill.badge.person.crop"
                color={color}
                style={{
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
            </View>
          ),
          href: isStudent ? null : "/projects",
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                padding: 4,
                borderRadius: 12,
                backgroundColor: focused
                  ? "rgba(34, 197, 94, 0.1)"
                  : "transparent",
              }}
            >
              <IconSymbol
                size={24}
                name="checklist"
                color={color}
                style={{
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
            </View>
          ),
          href: isStudent ? "/tasks" : null,
        }}
      />
      <Tabs.Screen
        name="my_group"
        options={{
          title: "My Group",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                padding: 4,
                borderRadius: 12,
                backgroundColor: focused
                  ? "rgba(34, 197, 94, 0.1)"
                  : "transparent",
              }}
            >
              <IconSymbol
                size={24}
                name="person.3.sequence.fill"
                color={color}
                style={{
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
            </View>
          ),
          href: isStudent ? "/my_group" : null,
        }}
      />
      <Tabs.Screen
        name="our_project"
        options={{
          title: "Our Project",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                padding: 4,
                borderRadius: 12,
                backgroundColor: focused
                  ? "rgba(34, 197, 94, 0.1)"
                  : "transparent",
              }}
            >
              <IconSymbol
                size={24}
                name="folder.fill"
                color={color}
                style={{
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
            </View>
          ),
          href: isStudent ? "/our_project" : null,
        }}
      />
    </Tabs>
  );
}
