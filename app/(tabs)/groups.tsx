import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

// Define the Group interface for type checking
interface Group {
  id: string;
  name: string;
  group_code: string;
  status: string;
  leader_id: string;
  adviser: string;
  description: string;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Group>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { authenticatedFetch } = useAuth();
  const router = useRouter();

  // Fetch groups from the API
  useEffect(() => {
    let isMounted = true;

    const fetchGroups = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch("/api/groups");

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message || `HTTP error! Status: ${response.status}`
          );
        }

        const data = await response.json();
        if (isMounted) {
          setGroups(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch groups. Please check your connection and API endpoint."
          );
          console.error("Error fetching groups:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGroups();

    return () => {
      isMounted = false;
    };
  }, [authenticatedFetch]);

  // Sort groups based on the current sort key and direction
  const sortedGroups = [...groups].sort((a, b) => {
    return sortDirection === "asc"
      ? String(a[sortKey]).localeCompare(String(b[sortKey]))
      : String(b[sortKey]).localeCompare(String(a[sortKey]));
  });

  // Handle sorting when a column header is clicked
  const handleSort = (key: keyof Group) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Render a sort indicator arrow based on current sort state
  const renderSortIndicator = (key: keyof Group) => {
    if (sortKey === key) {
      return sortDirection === "asc" ? " ▲" : " ▼";
    }
    return "";
  };

  // Get status style based on status value
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return styles.statusActive;
      case "inactive":
        return styles.statusInactive;
      case "pending":
        return styles.statusPending;
      default:
        return styles.statusDefault;
    }
  };

  // Render header for the table
  const renderHeader = () => (
    <View style={styles.headerRow}>
      <TouchableOpacity
        style={styles.headerCell}
        onPress={() => handleSort("name")}
      >
        <Text style={styles.headerText}>Name{renderSortIndicator("name")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerCell}
        onPress={() => handleSort("group_code")}
      >
        <Text style={styles.headerText}>
          Group Code{renderSortIndicator("group_code")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerCell}
        onPress={() => handleSort("status")}
      >
        <Text style={styles.headerText}>
          Status{renderSortIndicator("status")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render a single row in the table
  const renderItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/group/${item.id}`)}
    >
      <View style={styles.cell}>
        <Text style={styles.primaryText}>{item.name}</Text>
        <Text style={styles.secondaryText} numberOfLines={2}>
          {item.description.length > 10
            ? item.description.substring(0, 10) + "..."
            : item.description}
        </Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.codeText}>{item.group_code}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={[styles.statusText, getStatusStyle(item.status)]}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  // Main render - the groups table
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Groups</Text>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noGroupsText}>No groups found</Text>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          {renderHeader()}
          <FlatList
            data={sortedGroups}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
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
  tableContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    padding: 12,
  },
  headerCell: {
    flex: 1,
    justifyContent: "center",
  },
  headerText: {
    fontWeight: "bold",
    color: "#555",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    padding: 12,
  },
  cell: {
    flex: 1,
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  secondaryText: {
    fontSize: 14,
    color: "#666",
  },
  codeText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  statusActive: {
    color: "#2e7d32",
  },
  statusInactive: {
    color: "#c62828",
  },
  statusPending: {
    color: "#f57c00",
  },
  statusDefault: {
    color: "#666",
  },
  listContent: {
    flexGrow: 1,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  errorText: {
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  noGroupsText: {
    color: "#666",
    fontSize: 16,
  },
});
