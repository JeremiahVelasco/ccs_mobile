import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

interface Panelist {
  name: string;
}

interface ProjectDetails {
  id: number;
  title: string;
  logo: string | null;
  description: string | null;
  deadline: string | null;
  panelists: Panelist[];
  status: string;
  progress: number;
  final_grade: number | null;
  awards: string[];
  completion_probability: number;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  assigned_to: string | string[];
  status: string;
  type: "development" | "documentation";
  project_id: string;
  is_faculty_approved: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProjectDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [editedProject, setEditedProject] = useState<ProjectDetails | null>(
    null
  );
  const [developmentTasks, setDevelopmentTasks] = useState<Task[]>([]);
  const [documentationTasks, setDocumentationTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { authenticatedFetch } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(`/api/projects/${id}`);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        // Extract project data from the nested structure
        const projectData = {
          ...responseData.project,
          progress: Math.round(responseData.progress * 100),
          panelists: responseData.panelists,
        };
        setProject(projectData);
        setEditedProject(projectData);
        setError(null);
      } catch (err) {
        setError("Failed to fetch data. Please try again later.");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, authenticatedFetch]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setTasksLoading(true);

        // Fetch development tasks
        const devResponse = await authenticatedFetch(
          `/api/projects/${id}/development-tasks`
        );
        if (devResponse.ok) {
          const devTasks = await devResponse.json();
          setDevelopmentTasks(devTasks);
        }

        // Fetch documentation tasks
        const docResponse = await authenticatedFetch(
          `/api/projects/${id}/documentation-tasks`
        );
        if (docResponse.ok) {
          const docTasks = await docResponse.json();
          setDocumentationTasks(docTasks);
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setTasksLoading(false);
      }
    };

    if (id) {
      fetchTasks();
    }
  }, [id, authenticatedFetch]);

  const handleFieldChange = (field: keyof ProjectDetails, value: any) => {
    if (editedProject) {
      setEditedProject({
        ...editedProject,
        [field]: value,
      });
    }
  };

  const hasChanges = () => {
    if (!project || !editedProject) return false;
    return JSON.stringify(project) !== JSON.stringify(editedProject);
  };

  const handleSave = async () => {
    if (!editedProject) return;

    try {
      setSaving(true);
      const response = await authenticatedFetch(`/api/projects/${id}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editedProject.title,
          description: editedProject.description,
          status: editedProject.status,
          progress: editedProject.progress,
          final_grade: editedProject.final_grade,
          awards: editedProject.awards,
          completion_probability: editedProject.completion_probability,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const updatedData = await response.json();
      setProject(updatedData);
      setEditedProject(updatedData);
      setError(null);
    } catch (err) {
      setError("Failed to save changes. Please try again later.");
      console.error("Error saving project details:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleTaskPress = (taskId: string) => {
    router.push(`/task/${taskId}`);
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "in progress":
        return styles.statusInProgress;
      case "for review":
        return styles.statusForReview;
      case "done":
      case "approved":
        return styles.statusDone;
      case "to-do":
        return styles.statusTodo;
      default:
        return {};
    }
  };

  const getTaskStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "to-do":
        return { backgroundColor: "#f8fafc", color: "#64748b" };
      case "in progress":
        return { backgroundColor: "#dbeafe", color: "#1d4ed8" };
      case "for review":
        return { backgroundColor: "#fff3e0", color: "#f57c00" };
      case "done":
      case "approved":
        return { backgroundColor: "#e8f5e9", color: "#2e7d32" };
      default:
        return { backgroundColor: "#f8fafc", color: "#64748b" };
    }
  };

  const renderTaskItem = (task: Task) => {
    const statusStyle = getTaskStatusStyle(task.status);

    return (
      <TouchableOpacity
        key={task.id}
        style={styles.taskItem}
        onPress={() => handleTaskPress(task.id)}
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View
            style={[
              styles.taskStatus,
              { backgroundColor: statusStyle.backgroundColor },
            ]}
          >
            <Text style={[styles.taskStatusText, { color: statusStyle.color }]}>
              {task.status}
            </Text>
          </View>
        </View>
        {task.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        <View style={styles.taskMeta}>
          {task.deadline && (
            <Text style={styles.taskDeadline}>
              Due: {new Date(task.deadline).toLocaleDateString()}
            </Text>
          )}
          {task.is_faculty_approved && (
            <Text style={styles.approvedBadge}>✓ Faculty Approved</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading project details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!project || !editedProject) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{editedProject.title}</Text>
            {hasChanges() && (
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.detailsContainer}>
            {editedProject.logo && (
              <View style={styles.logoContainer}>
                <Image
                  source={{ uri: editedProject.logo }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.label}>Title:</Text>
              <TextInput
                style={styles.input}
                value={editedProject.title}
                onChangeText={(value) => handleFieldChange("title", value)}
                placeholder="Enter project title"
              />
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Status:</Text>
              <Text
                style={[styles.value, getStatusStyle(editedProject.status)]}
              >
                {editedProject.status}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Progress:</Text>
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${editedProject.progress}%` },
                  ]}
                />
                <Text style={styles.progressText}>
                  {editedProject.progress}%
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Final Grade:</Text>
              <Text style={styles.value}>
                {editedProject.final_grade
                  ? Math.round(editedProject.final_grade)
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Completion Probability:</Text>
              <Text style={styles.value}>
                {editedProject.completion_probability}%
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Awards:</Text>
              <View style={styles.awardsContainer}>
                {editedProject.awards && editedProject.awards.length > 0 ? (
                  editedProject.awards.map((award, index) => (
                    <Text key={`award-${index}`} style={styles.awardText}>
                      • {award}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.awardText}>No awards yet</Text>
                )}
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Panelists:</Text>
              <View style={styles.panelistsContainer}>
                {editedProject.panelists &&
                editedProject.panelists.length > 0 ? (
                  editedProject.panelists.map((panelist, index) => (
                    <Text key={`panelist-${index}`} style={styles.panelistText}>
                      • {panelist.name}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.panelistText}>No panelists assigned</Text>
                )}
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Description:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedProject.description || ""}
                onChangeText={(value) =>
                  handleFieldChange("description", value)
                }
                placeholder="Enter description"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Tasks Section */}
          <View style={styles.tasksContainer}>
            <Text style={styles.sectionTitle}>Tasks</Text>

            {tasksLoading ? (
              <View style={styles.tasksLoadingContainer}>
                <ActivityIndicator size="small" color="#0066cc" />
                <Text style={styles.tasksLoadingText}>Loading tasks...</Text>
              </View>
            ) : (
              <>
                {/* Development Tasks */}
                {developmentTasks.length > 0 && (
                  <View style={styles.taskTypeContainer}>
                    <Text style={styles.taskTypeTitle}>Development Tasks</Text>
                    <View style={styles.tasksList}>
                      {developmentTasks.map(renderTaskItem)}
                    </View>
                  </View>
                )}

                {/* Documentation Tasks */}
                {documentationTasks.length > 0 && (
                  <View style={styles.taskTypeContainer}>
                    <Text style={styles.taskTypeTitle}>
                      Documentation Tasks
                    </Text>
                    <View style={styles.tasksList}>
                      {documentationTasks.map(renderTaskItem)}
                    </View>
                  </View>
                )}

                {/* No Tasks Message */}
                {developmentTasks.length === 0 &&
                  documentationTasks.length === 0 && (
                    <View style={styles.noTasksContainer}>
                      <Text style={styles.noTasksText}>
                        No tasks found for this project
                      </Text>
                    </View>
                  )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  detailsContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: "#333",
  },
  input: {
    fontSize: 16,
    color: "#333",
    padding: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 16,
    textAlign: "center",
  },
  statusInProgress: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    padding: 4,
    borderRadius: 4,
  },
  statusForReview: {
    backgroundColor: "#fff3e0",
    color: "#f57c00",
    padding: 4,
    borderRadius: 4,
  },
  statusDone: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    padding: 4,
    borderRadius: 4,
  },
  statusTodo: {
    backgroundColor: "#f8fafc",
    color: "#64748b",
    padding: 4,
    borderRadius: 4,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  saveButton: {
    backgroundColor: "#0066cc",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 16,
  },
  saveButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    height: 20,
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
    fontWeight: "500",
  },
  awardsContainer: {
    marginTop: 4,
  },
  awardText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  panelistsContainer: {
    marginTop: 4,
  },
  panelistText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  // Tasks Section Styles
  tasksContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  tasksLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  tasksLoadingText: {
    marginLeft: 8,
    color: "#666",
  },
  taskTypeContainer: {
    marginBottom: 20,
  },
  taskTypeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#444",
    marginBottom: 12,
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  taskStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  taskStatusText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  taskDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskDeadline: {
    fontSize: 12,
    color: "#888",
  },
  approvedBadge: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "500",
  },
  noTasksContainer: {
    alignItems: "center",
    padding: 20,
  },
  noTasksText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
  },
});
