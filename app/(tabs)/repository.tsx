import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";

// Define the Project interface for type checking
interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  final_grade: number;
  awards: string;
  logo: string; // URL to the project logo
}

export default function Repository() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
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

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await authenticatedFetch("/api/repository");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        setError(null);
      }
    } catch (err) {
      console.error("Error refreshing projects:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Sort projects based on the current sort key and direction
  const sortedProjects = [...projects].sort((a, b) => {
    return sortDirection === "asc"
      ? String(a[sortKey]).localeCompare(String(b[sortKey]))
      : String(b[sortKey]).localeCompare(String(a[sortKey]));
  });

  // Handle sorting when a sort button is pressed
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
      return sortDirection === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  // Get grade color based on score
  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "#22c55e"; // green-500
    if (grade >= 80) return "#84cc16"; // lime-500
    if (grade >= 70) return "#f59e0b"; // yellow-600
    if (grade >= 60) return "#f97316"; // orange-500
    return "#ef4444"; // red-500
  };

  // Get status style based on status value
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "done":
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
          borderColor: "#bbf7d0",
        };
      case "for review":
        return {
          backgroundColor: "#dbeafe",
          color: "#1e40af",
          borderColor: "#bfdbfe",
        };
      case "in progress":
        return {
          backgroundColor: "#f3f4f6",
          color: "#6b7280",
          borderColor: "#e5e7eb",
        };
      default:
        return {
          backgroundColor: "#fef3c7",
          color: "#d97706",
          borderColor: "#fde68a",
        };
    }
  };

  // Repository Card Component
  const RepositoryCard = ({
    item,
    index,
  }: {
    item: Project;
    index: number;
  }) => {
    const animatedValue = new Animated.Value(0);
    const statusStyle = getStatusStyle(item.status);
    const gradeColor = getGradeColor(item.final_grade);

    React.useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.projectCard,
          {
            opacity: animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => router.push(`/repository/${item.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: item.logo }}
                style={styles.logo}
                defaultSource={require("../../assets/images/default-logo.webp")}
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.projectTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.projectDescription} numberOfLines={3}>
                {item.description}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, statusStyle]}>
                <Text style={[styles.statusText, { color: statusStyle.color }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.gradeSection}>
              <Text style={styles.gradeLabel}>Final Grade</Text>
              <Text style={[styles.gradeValue, { color: gradeColor }]}>
                {Math.round(item.final_grade)}
              </Text>
            </View>
            <View style={styles.awardsSection}>
              <Text style={styles.awardsLabel}>Awards</Text>
              <Text style={styles.awardsValue} numberOfLines={1}>
                {item.awards || "No awards"}
              </Text>
            </View>
          </View>

          <View style={styles.cardIndicator} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render project card
  const renderProjectCard = ({
    item,
    index,
  }: {
    item: Project;
    index: number;
  }) => <RepositoryCard item={item} index={index} />;

  // Render sort controls
  const renderSortControls = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      <View style={styles.sortButtons}>
        <TouchableOpacity
          style={[
            styles.sortButton,
            sortKey === "title" && styles.sortButtonActive,
          ]}
          onPress={() => handleSort("title")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortKey === "title" && styles.sortButtonTextActive,
            ]}
          >
            Title{renderSortIndicator("title")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortButton,
            sortKey === "final_grade" && styles.sortButtonActive,
          ]}
          onPress={() => handleSort("final_grade")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortKey === "final_grade" && styles.sortButtonTextActive,
            ]}
          >
            Grade{renderSortIndicator("final_grade")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortButton,
            sortKey === "awards" && styles.sortButtonActive,
          ]}
          onPress={() => handleSort("awards")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortKey === "awards" && styles.sortButtonTextActive,
            ]}
          >
            Awards{renderSortIndicator("awards")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading repository...</Text>
        </View>
      </View>
    );
  }

  // Main render - the repository list
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Repository</Text>
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noProjectsText}>No projects found</Text>
          <Text style={styles.noProjectsSubtext}>
            Completed projects will appear here
          </Text>
        </View>
      ) : (
        <>
          {renderSortControls()}
          <FlatList
            data={sortedProjects}
            renderItem={renderProjectCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#6366f1"]}
                tintColor="#6366f1"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sortLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  sortButtons: {
    flexDirection: "row",
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sortButtonActive: {
    backgroundColor: "#025A2A",
    borderColor: "#025A2A",
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
  },
  sortButtonTextActive: {
    color: "#ffffff",
  },
  listContent: {
    padding: 20,
    paddingTop: 16,
  },
  projectCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    padding: 20,
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  logoContainer: {
    marginRight: 16,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f1f5f9",
  },
  titleContainer: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 24,
  },
  projectDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  cardBody: {
    marginBottom: 16,
  },
  statusContainer: {
    alignItems: "flex-start",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gradeSection: {
    flex: 1,
  },
  gradeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  gradeValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  awardsSection: {
    flex: 1,
    alignItems: "flex-end",
  },
  awardsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  awardsValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    textAlign: "right",
  },
  cardIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#025A2A",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  errorText: {
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  noProjectsText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    marginBottom: 8,
  },
  noProjectsSubtext: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
  },
});
