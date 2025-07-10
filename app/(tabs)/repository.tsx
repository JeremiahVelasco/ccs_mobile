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
  description: string;
  status: string;
  final_grade: string;
  awards: string;
  logo: string; // URL to the project logo
}

export default function Repository() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Project>("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { authenticatedFetch } = useAuth();
  const router = useRouter();

  // Fetch projects from the API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch("/api/repository");

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
      <View style={styles.logoCell}>
        <Text style={styles.headerText}>Logo</Text>
      </View>
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
        onPress={() => handleSort("final_grade")}
      >
        <Text style={styles.headerText}>
          Final Grade{renderSortIndicator("final_grade")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerCell}
        onPress={() => handleSort("awards")}
      >
        <Text style={styles.headerText}>
          Awards{renderSortIndicator("awards")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render a single row in the table
  const renderItem = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/repository/${item.id}`)}
    >
      <View style={styles.logoCell}>
        <Image
          source={{ uri: item.logo }}
          style={styles.logo}
          defaultSource={require("../../assets/images/default-logo.webp")}
        />
      </View>
      <View style={styles.cell}>
        <Text style={styles.primaryText}>{item.title}</Text>
        <Text style={styles.secondaryText} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <View style={styles.cell}>
        <Text>{item.final_grade}</Text>
      </View>
      <View style={styles.cell}>
        <Text>{item.awards}</Text>
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
      <Text style={styles.title}>Repository</Text>

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
  logoCell: {
    width: 60,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
