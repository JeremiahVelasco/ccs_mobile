import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
  title: string;
  logo: string | null;
  progress: number;
  status: string;
  group: string;
  panelists: string;
  final_grade: string;
  awards: string;
}

export default function Projects() {
  const router = useRouter();
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
        style={[styles.headerCell, styles.logoCell]}
        onPress={() => handleSort("title")}
      >
        <Text style={styles.headerText}>Logo</Text>
      </TouchableOpacity>
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
        onPress={() => handleSort("progress")}
      >
        <Text style={styles.headerText}>
          Progress{renderSortIndicator("progress")}
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
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/project/${item.id}`)}
    >
      <View style={[styles.cell, styles.logoCell]}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.placeholderLogo]} />
        )}
      </View>
      <View style={styles.cell}>
        <Text style={styles.primaryText}>{item.title}</Text>
      </View>
      <View style={styles.cell}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
          <Text style={styles.progressText}>{item.progress}%</Text>
        </View>
      </View>
      <View style={styles.cell}>
        <Text style={[styles.statusText, getStatusStyle(item.status)]}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Get status style based on status value
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "in progress":
        return styles.statusInProgress;
      case "for review":
        return styles.statusForReview;
      case "done":
        return styles.statusDone;
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#0066cc",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  logoCell: {
    flex: 0.5,
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
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  placeholderLogo: {
    backgroundColor: "#e0e0e0",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    height: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4caf50",
  },
  progressText: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: "#000",
    fontSize: 12,
    fontWeight: "500",
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
  statusInProgress: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
  },
  statusForReview: {
    backgroundColor: "#fff3e0",
    color: "#f57c00",
  },
  statusDone: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
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
