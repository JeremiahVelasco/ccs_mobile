import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
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
  progress: number;
  progressPercentage: number;
  status: string;
  deadline: string | null;
  final_grade: number | null;
}

export default function Projects() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
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
        // Convert progress from decimal to percentage
        const processedData = data.map((project: Project) => ({
          ...project,
          progress: project.progress || 0,
          progressPercentage: project.progress || 0,
        }));
        setProjects(processedData);
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
      const response = await authenticatedFetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        const processedData = data.map((project: Project) => ({
          ...project,
          progress: Math.round(project.progress * 100),
        }));
        setProjects(processedData);
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

  // Get status style based on status value
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "in progress":
        return {
          backgroundColor: "#dbeafe",
          color: "#1e40af",
          borderColor: "#bfdbfe",
        };
      case "for review":
        return {
          backgroundColor: "#fef3c7",
          color: "#d97706",
          borderColor: "#fde68a",
        };
      case "done":
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
          borderColor: "#bbf7d0",
        };
      default:
        return {
          backgroundColor: "#f3f4f6",
          color: "#6b7280",
          borderColor: "#e5e7eb",
        };
    }
  };

  // Get progress color based on percentage
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "#22c55e"; // green-500
    if (progress >= 60) return "#eab308"; // yellow-500
    if (progress >= 40) return "#f97316"; // orange-500
    return "#ef4444"; // red-500
  };

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "No deadline";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Project Card Component
  const ProjectCard = ({ item, index }: { item: Project; index: number }) => {
    const animatedValue = new Animated.Value(0);
    const statusStyle = getStatusStyle(item.status);
    const progressColor = getProgressColor(item.progress);

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
          onPress={() => router.push(`/project/${item.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.projectTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, statusStyle]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {item.status}
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={[styles.progressValue, { color: progressColor }]}>
                {item.progress}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${item.progress}%`,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.deadlineInfo}>
              <Text style={styles.deadlineLabel}>Deadline:</Text>
              <Text style={styles.deadlineValue}>
                {formatDate(item.deadline)}
              </Text>
            </View>
            <View style={styles.gradeInfo}>
              <Text style={styles.gradeLabel}>Grade:</Text>
              <Text style={styles.gradeValue}>
                {item.final_grade ? Math.round(item.final_grade) : "N/A"}
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
  }) => <ProjectCard item={item} index={index} />;

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
            sortKey === "progress" && styles.sortButtonActive,
          ]}
          onPress={() => handleSort("progress")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortKey === "progress" && styles.sortButtonTextActive,
            ]}
          >
            Progress{renderSortIndicator("progress")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortButton,
            sortKey === "status" && styles.sortButtonActive,
          ]}
          onPress={() => handleSort("status")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortKey === "status" && styles.sortButtonTextActive,
            ]}
          >
            Status{renderSortIndicator("status")}
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
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      </View>
    );
  }

  // Main render - the projects list
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Projects</Text>
        <Text style={styles.subtitle}>
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </Text>
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
            Projects will appear here when available
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
                colors={["#22c55e"]}
                tintColor="#22c55e"
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
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
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
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  progressValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 2,
  },
  deadlineValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  gradeInfo: {
    alignItems: "flex-end",
  },
  gradeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 2,
  },
  gradeValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  cardIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#22c55e",
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
    backgroundColor: "#22c55e",
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
