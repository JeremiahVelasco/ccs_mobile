import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface GroupDetails {
  id: number;
  name: string;
  group_code: string;
  leader_id: number;
  description: string | null;
  adviser: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  logo: string | null;
}

// Add status style mapping
const getStatusStyle = (status: string) => {
  const statusMap: Record<string, any> = {
    pending: styles.statusPending,
    active: styles.statusActive,
    inactive: styles.statusInactive,
  };
  return statusMap[status.toLowerCase()] || styles.statusPending;
};

export default function GroupDetails() {
  const { id } = useLocalSearchParams();
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        setLoading(true);
        const baseUrl = "http://192.168.68.123:8000";

        const apiUrl = `${baseUrl}/api/groups/${id}`;
        console.log("Device platform:", Platform.OS);
        console.log("Fetching group details for ID:", id);
        console.log("Request URL:", apiUrl);

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Response:", errorText);
          throw new Error(
            `HTTP error! Status: ${response.status}. ${errorText}`
          );
        }

        const data = await response.json();
        console.log("API Response:", JSON.stringify(data, null, 2));

        if (!data || !data.id) {
          throw new Error("Invalid group data received");
        }

        setGroup(data);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(`Failed to fetch group details: ${errorMessage}`);
        console.error("Error fetching group details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchGroupDetails();
    } else {
      setError("No group ID provided");
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading group details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{group.name}</Text>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Group Code:</Text>
            <Text style={styles.value}>{group.group_code}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Status:</Text>
            <Text
              style={[
                styles.value,
                styles.statusText,
                getStatusStyle(group.status),
              ]}
            >
              {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Leader ID:</Text>
            <Text style={styles.value}>{group.leader_id}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Adviser:</Text>
            <Text style={styles.value}>{group.adviser || "Not assigned"}</Text>
          </View>

          {group.description && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Description:</Text>
              <Text style={styles.value}>{group.description}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.label}>Created:</Text>
            <Text style={styles.value}>
              {new Date(group.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  detailsContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  value: {
    flex: 2,
    fontSize: 16,
    color: "#333",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 16,
    textAlign: "center",
  },
  statusText: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  statusPending: {
    backgroundColor: "#fff8e1",
    color: "#ff8f00",
  },
  statusActive: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  statusInactive: {
    backgroundColor: "#ffebee",
    color: "#c62828",
  },
});
