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

// Define the Project interface for type checking
interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
}

export default function Repository() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Activity>("lastUpdated");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch projects from the API
  useEffect(() => {
    const fetchActivites = async () => {
      try {
        setLoading(true);

        const baseUrl =
          Platform.OS === "web"
            ? "http://127.0.0.1:8000"
            : "http://192.168.68.123:8000";

        const API_URL = `${baseUrl}/api/activities`;

        console.log("Fetching from:", API_URL);
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setActivities(data);
        setError(null);
      } catch (err) {
        setError(
          "Failed to fetch activities. Please check your connection and API endpoint."
        );
        console.error("Error fetching activities:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivites();
  }, []);

  const formatDate = (dateString: string): string => {
    const isoString = dateString.replace(" ", "T");
    const date = new Date(isoString);

    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };

    return date.toLocaleString("en-PH", options);
  };

  // Sort activities based on the current sort key and direction
  const sortedActivities = [...activities].sort((a, b) => {
    return sortDirection === "asc"
      ? String(a[sortKey]).localeCompare(String(b[sortKey]))
      : String(b[sortKey]).localeCompare(String(a[sortKey]));
  });

  // Handle sorting when a column header is clicked
  const handleSort = (key: keyof Activity) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Render a sort indicator arrow based on current sort state
  const renderSortIndicator = (key: keyof Activity) => {
    if (sortKey === key) {
      return sortDirection === "asc" ? " ▲" : " ▼";
    }
    return "";
  };

  // Render header for the table
  const renderHeader = () => (
    <View style={styles.headerRow}>
      <TouchableOpacity
        style={styles.headerCell}
        onPress={() => handleSort("title")}
      >
        <Text style={styles.headerText}>
          Title{renderSortIndicator("title")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerCell}
        onPress={() => handleSort("date")}
      >
        <Text style={styles.headerText}>Date{renderSortIndicator("date")}</Text>
      </TouchableOpacity>
    </View>
  );

  // Render a single row in the table
  const renderItem = ({ item }: { item: Activity }) => (
    <View style={styles.row}>
      <View style={styles.cell}>
        <Text style={styles.primaryText}>{item.title}</Text>
        <Text style={styles.secondaryText} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.primaryText}>{formatDate(item.date)}</Text>
      </View>
    </View>
  );

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  // Main render - the repository table
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Activities</Text>

      {activities.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noProjectsText}>No activities found</Text>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          {renderHeader()}
          <FlatList
            data={sortedActivities}
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
