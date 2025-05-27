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

// Define the Project interface for type checking
interface Project {
  id: string;
  progress: string;
  title: string;
  group: string;
  panelists: string;
  final_grade: string;
  awards: string;
  status: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Project>("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { authenticatedFetch } = useAuth();

  // Fetch projects from the API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch("/api/projects");

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setProjects(data);
        setError(null);
      } catch (err) {
        setError(
          "Failed to fetch projects. Please check your connection and API endpoint."
        );
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [authenticatedFetch]);

  // Sort projects based on the current sort key and direction
  const sortedProjects = [...projects].sort((a, b) => {
    return sortDirection === "asc"
      ? String(a[sortKey]).localeCompare(String(b[sortKey]))
      : String(b[sortKey]).localeCompare(String(a[sortKey]));
  });

  // Handle sorting when a column header is clicked
  const handleSort = (key: keyof Project) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Render a sort indicator arrow based on current sort state
  const renderSortIndicator = (key: keyof Project) => {
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
        onPress={() => handleSort("group")}
      >
        <Text style={styles.headerText}>
          Group{renderSortIndicator("group")}
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
  const renderItem = ({ item }: { item: Project }) => (
    <View style={styles.row}>
      <View style={styles.cell}>
        <Text style={styles.primaryText}>{item.title}</Text>
        <Text style={styles.secondaryText}>Progress: {item.progress}</Text>
      </View>
      <View style={styles.cell}>
        <Text>{item.group}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={[styles.statusText, getStatusStyle(item.status)]}>
          {item.status}
        </Text>
      </View>
    </View>
  );

  // Get status style based on status value
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return styles.statusCompleted;
      case "in progress":
        return styles.statusInProgress;
      case "pending":
        return styles.statusPending;
      default:
        return {};
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading projects...</Text>
      </View>
    );
  }

  // Main render - the projects table
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Projects</Text>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noProjectsText}>No projects found</Text>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          {renderHeader()}
          <FlatList
            data={sortedProjects}
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
  noProjectsText: {
    color: "#666",
    fontSize: 16,
  },
});
