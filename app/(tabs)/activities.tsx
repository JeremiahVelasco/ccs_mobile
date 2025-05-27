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

// Define the Activity interface for type checking
interface Activity {
  id: number;
  title: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

// Define the API response interface
interface ApiResponse {
  data: Activity[];
  status: string;
}

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Activity>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { authenticatedFetch } = useAuth();

  // Fetch activities from the API
  useEffect(() => {
    let isMounted = true;

    const fetchActivities = async () => {
      try {
        console.log("Starting to fetch activities...");
        setLoading(true);
        const response = await authenticatedFetch("/api/activities");
        console.log("Activities response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error("Activities error data:", errorData);
          throw new Error(
            errorData?.message || `HTTP error! Status: ${response.status}`
          );
        }

        const responseData = (await response.json()) as ApiResponse;
        console.log("Activities data received:", responseData);

        if (isMounted) {
          setActivities(responseData.data || []);
          setError(null);
        }
      } catch (err) {
        console.error("Error in fetchActivities:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch activities. Please check your connection and API endpoint."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActivities();

    return () => {
      isMounted = false;
    };
  }, [authenticatedFetch]);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
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
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  // Sort activities based on the current sort key and direction
  const sortedActivities = [...activities].sort((a, b) => {
    if (sortKey === "date") {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    }
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
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
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

  // Main render - the activities table
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Activities</Text>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noActivitiesText}>No activities found</Text>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          {renderHeader()}
          <FlatList
            data={sortedActivities}
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
  dateText: {
    fontSize: 14,
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
  noActivitiesText: {
    color: "#666",
    fontSize: 16,
  },
});
