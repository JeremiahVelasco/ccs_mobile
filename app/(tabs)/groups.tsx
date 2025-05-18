import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Define the Group interface for type checking
interface Group {
  id: number;
  logo: string;
  name: string;
  leader: string;
  adviser: string;
}

export default function Groups() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Group>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch groups from the API
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);

        const baseUrl =
          Platform.OS === "web"
            ? "http://127.0.0.1:8000"
            : "http://192.168.68.123:8000";

        const API_URL = `${baseUrl}/api/groups`;

        console.log("Fetching from:", API_URL);
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setGroups(data);
        setError(null);
      } catch (err) {
        setError(
          "Failed to fetch groups. Please check your connection and API endpoint."
        );
        console.error("Error fetching groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

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

  // Handle row click
  const handleRowPress = (group: Group) => {
    router.push(`/group/${group.id}`);
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
        onPress={() => handleSort("leader")}
      >
        <Text style={styles.headerText}>
          Leader{renderSortIndicator("leader")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerCell}
        onPress={() => handleSort("adviser")}
      >
        <Text style={styles.headerText}>
          Adviser{renderSortIndicator("adviser")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render a single row in the table
  const renderItem = ({ item }: { item: Group }) => (
    <TouchableOpacity style={styles.row} onPress={() => handleRowPress(item)}>
      <View style={styles.cell}>
        <Text style={styles.primaryText}>{item.name}</Text>
      </View>
      <View style={styles.cell}>
        <Text>{item.leader}</Text>
      </View>
      <View style={styles.cell}>
        <Text>{item.adviser}</Text>
      </View>
    </TouchableOpacity>
  );

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading projects...</Text>
      </View>
    );
  }

  // Main render - the repository table
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Groups</Text>

      {groups.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noProjectsText}>No groups found</Text>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          {renderHeader()}
          <FlatList
            data={sortedGroups}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
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
  statusText: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "500",
  },
  statusCompleted: {
    backgroundColor: "#e6f7e6",
    color: "#2e7d32",
  },
  statusInProgress: {
    backgroundColor: "#e3f2fd",
    color: "#0277bd",
  },
  statusPending: {
    backgroundColor: "#fff8e1",
    color: "#ff8f00",
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
  errorHelpText: {
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: "#0066cc",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  noProjectsText: {
    color: "#666",
    fontSize: 16,
  },
});
