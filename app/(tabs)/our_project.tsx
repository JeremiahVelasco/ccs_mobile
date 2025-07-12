import { IconSymbol } from "@/components/ui/IconSymbol";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Panelist {
  name: string;
}

interface Project {
  id: number;
  logo: string;
  title: string;
  description: string | null;
  deadline: string | null;
  panelists: Panelist[];
  status?: string; // In progress, For Review, Done
  progress: number; // Decimal value (0-1) for progress bar
  progressPercentage: number; // Percentage value (0-100) for display
  final_grade: number | null;
  awards: string[];
  completion_probability: number;
  created_at: string;
  updated_at: string;
  files?: any[]; // Add files field
  group_id?: number; // Add group_id field
}

export default function OurProjectScreen() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  // Create project modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDeadline, setProjectDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [userGroup, setUserGroup] = useState<any>(null);
  const [groupLoading, setGroupLoading] = useState(true);

  const { authenticatedFetch, user } = useAuth();
  const colorScheme = useColorScheme();

  useEffect(() => {
    fetchProject();
  }, [authenticatedFetch]);

  useEffect(() => {
    if (project) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [project]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch(`/api/my-project`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);

      // Properly structure the project data from backend response
      const projectData = {
        ...data.project,
        progress: (data.progress || 0) / 100, // Convert percentage to decimal for progress bar
        progressPercentage: data.progress || 0, // Keep original percentage for display
        panelists: data.panelists || [],
        files: data.files || [],
        // Handle potential JSON string fields
        awards:
          typeof data.project.awards === "string"
            ? JSON.parse(data.project.awards || "[]")
            : data.project.awards || [],
        // Ensure numeric fields have default values
        completion_probability: data.project.completion_probability || 0,
        final_grade: data.project.final_grade || null,
      };

      console.log("Structured project data:", projectData);
      setProject(projectData);
    } catch (err) {
      console.error("Error fetching project:", err);
      setError("Failed to load project information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProject();
    setRefreshing(false);
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "#6b7280";
    switch (status.toLowerCase()) {
      case "in progress":
        return "#22c55e";
      case "for review":
        return "#f59e0b";
      case "done":
        return "#22c55e";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return "circle.fill";
    switch (status.toLowerCase()) {
      case "in progress":
        return "clock.fill";
      case "for review":
        return "eye.fill";
      case "done":
        return "checkmark.circle.fill";
      default:
        return "circle.fill";
    }
  };

  const getStatusBgColor = (status?: string) => {
    if (!status) return "#f8fafc";
    switch (status.toLowerCase()) {
      case "in progress":
        return "#f0fdf4";
      case "for review":
        return "#fffbeb";
      case "done":
        return "#f0fdf4";
      default:
        return "#f8fafc";
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "No deadline set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const getRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Handle same day
      if (Math.abs(diffDays) === 0) return "Today";

      // Handle future dates
      if (diffDays > 0) {
        if (diffDays === 1) return "Tomorrow";
        if (diffDays < 7) return `In ${diffDays} days`;
        if (diffDays < 14) return "1 week from now";
        if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
        return `In ${Math.floor(diffDays / 30)} months`;
      }

      // Handle past dates
      const pastDays = Math.abs(diffDays);
      if (pastDays === 1) return "Yesterday";
      if (pastDays < 7) return `${pastDays} days ago`;
      if (pastDays < 14) return "1 week ago";
      if (pastDays < 30) return `${Math.floor(pastDays / 7)} weeks ago`;
      return `${Math.floor(pastDays / 30)} months ago`;
    } catch {
      return "";
    }
  };

  const ProgressBar = ({
    progress,
    progressPercentage,
  }: {
    progress: number;
    progressPercentage: number;
  }) => {
    const [progressAnim] = useState(new Animated.Value(0));
    const [glowAnim] = useState(new Animated.Value(0));

    useEffect(() => {
      // Animate progress width (cannot use native driver for width)
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1200,
        useNativeDriver: false,
      }).start();

      // Animate glow effect (can use native driver for opacity)
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, [progress]);

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{progressPercentage}%</Text>
      </View>
    );
  };

  const StatCard = ({
    icon,
    label,
    value,
    deadline,
    color,
    bgColor,
    index,
  }: {
    icon: React.ComponentProps<typeof IconSymbol>["name"];
    label: string;
    value: string;
    deadline: string | null;
    color: string;
    bgColor: string;
    index: number;
  }) => {
    const [cardAnim] = useState(new Animated.Value(0));
    const [hoverAnim] = useState(new Animated.Value(1));

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, [index]);

    const handlePressIn = () => {
      Animated.spring(hoverAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(hoverAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        style={[
          styles.statCard,
          {
            borderLeftColor: color,
            backgroundColor: bgColor,
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              { scale: hoverAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.statCardContent}
          activeOpacity={0.8}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={[styles.statIconContainer, { backgroundColor: color }]}>
            <IconSymbol name={icon} size={24} color="#ffffff" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statDeadline}>
              {deadline ? getRelativeTime(deadline) : ""}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={styles.loadingText}>Loading project...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.errorContainer}>
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={48}
              color="#ef4444"
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchProject}>
              <IconSymbol name="arrow.clockwise" size={16} color="#fff" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.emptyContainer}>
            <IconSymbol name="folder.fill" size={80} color="#22c55e" />
            <Text style={styles.emptyTitle}>No Project Found</Text>
            <Text style={styles.emptyDescription}>
              Your project information will appear here once it&apos;s
              available.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <IconSymbol name="arrow.clockwise" size={16} color="#22c55e" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#22c55e"]}
            tintColor="#22c55e"
          />
        }
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Our Project</Text>
            <Text style={styles.pageSubtitle}>Track your project progress</Text>
          </View>

          {/* Project Title Card */}
          <View style={styles.titleCard}>
            <View style={styles.titleHeader}>
              <View style={styles.projectIcon}>
                <IconSymbol name="folder.fill" size={36} color="#22c55e" />
              </View>
              <View style={styles.titleContent}>
                <Text style={styles.projectTitle}>{project.title}</Text>
                <View
                  style={[
                    styles.statusContainer,
                    { backgroundColor: getStatusBgColor(project.status) },
                  ]}
                >
                  <IconSymbol
                    name={getStatusIcon(project.status)}
                    size={16}
                    color={getStatusColor(project.status)}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(project.status) },
                    ]}
                  >
                    {project.status}
                  </Text>
                </View>
              </View>
            </View>
            {project.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.projectDescription}>
                  {project.description}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTitleContainer}>
                <IconSymbol name="chart.bar.fill" size={20} color="#22c55e" />
                <Text style={styles.cardTitle}>Project Progress</Text>
              </View>
              <Text style={styles.progressPercentage}>
                {project.progressPercentage}%
              </Text>
            </View>
            <ProgressBar
              progress={project.progress}
              progressPercentage={project.progressPercentage}
            />
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="calendar.badge.clock"
              label="Deadline"
              value={formatDate(project.deadline)}
              deadline={project.deadline}
              color="#f59e0b"
              bgColor="#fffbeb"
              index={0}
            />
            <StatCard
              icon="star.fill"
              label="Final Grade"
              value={
                project.final_grade
                  ? `${Math.round(project.final_grade)}%`
                  : "N/A"
              }
              deadline={null}
              color="#22c55e"
              bgColor="#f0fdf4"
              index={1}
            />
            <StatCard
              icon="chart.line.uptrend.xyaxis"
              label="Completion Probability"
              value={`${Math.round(project.completion_probability * 100)}%`}
              deadline={null}
              color="#8b5cf6"
              bgColor="#f3e8ff"
              index={2}
            />
          </View>

          {/* Panelists Card */}
          {project.panelists && project.panelists.length > 0 && (
            <View style={styles.panelistsCard}>
              <View style={styles.cardHeader}>
                <IconSymbol name="person.3.fill" size={20} color="#22c55e" />
                <Text style={styles.cardTitle}>Panelists</Text>
              </View>
              <View style={styles.panelistsList}>
                {project.panelists.map((panelist, index) => (
                  <View key={index} style={styles.panelistItem}>
                    <View style={styles.panelistAvatar}>
                      <IconSymbol
                        name="person.fill"
                        size={16}
                        color="#22c55e"
                      />
                    </View>
                    <Text style={styles.panelistName}>{panelist.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Awards Card */}
          {project.awards && project.awards.length > 0 && (
            <View style={styles.awardsCard}>
              <View style={styles.cardHeader}>
                <IconSymbol name="trophy.fill" size={20} color="#f59e0b" />
                <Text style={styles.cardTitle}>Awards</Text>
              </View>
              <View style={styles.awardsList}>
                {project.awards.map((award, index) => (
                  <View key={index} style={styles.awardItem}>
                    <IconSymbol name="medal.fill" size={16} color="#f59e0b" />
                    <Text style={styles.awardText}>{award}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 17,
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#025A2A",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  refreshButtonText: {
    color: "#025A2A",
    fontWeight: "600",
    fontSize: 16,
  },
  titleCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  titleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  projectIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  titleContent: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  descriptionContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  projectDescription: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
    fontWeight: "500",
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  progressTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  progressPercentage: {
    fontSize: 28,
    fontWeight: "800",
    color: "#22c55e",
    letterSpacing: -0.5,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  progressBackground: {
    flex: 1,
    height: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 8,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    minWidth: 50,
  },
  statsGrid: {
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  panelistsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  panelistsList: {
    gap: 16,
  },
  panelistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  panelistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  panelistName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  awardsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  awardsList: {
    gap: 12,
  },
  awardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  awardText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
  },
  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  timelineList: {
    gap: 20,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  statDeadline: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
});
