import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { IconSymbol } from "../../components/ui/IconSymbol";
import { useAuth } from "../../contexts/AuthContext";

// Define the Task interface for type checking
interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  assigned_to: string | string[];
  status: string;
  type: string;
  project_id: string;
  is_faculty_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateTaskForm {
  title: string;
  description: string;
  deadline: string;
  type: "documentation" | "development";
  status: string;
  assigned_to: string[];
}

export default function TasksScreen() {
  const [activeTab, setActiveTab] = useState<"documentation" | "development">(
    "documentation"
  );
  const [documentationTasks, setDocumentationTasks] = useState<Task[]>([]);
  const [developmentTasks, setDevelopmentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<CreateTaskForm>({
    title: "",
    description: "",
    deadline: "",
    type: "development",
    status: "To-do",
    assigned_to: [],
  });
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const { authenticatedFetch, user } = useAuth();
  const router = useRouter();

  // Fetch tasks from the API
  const fetchTasks = async (type: "documentation" | "development") => {
    try {
      const response = await authenticatedFetch(`/api/tasks/${type}`);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`Error fetching ${type} tasks:`, err);
      throw err;
    }
  };

  // Load tasks for both tabs
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const [docTasks, devTasks] = await Promise.all([
        fetchTasks("documentation"),
        fetchTasks("development"),
      ]);

      setDocumentationTasks(docTasks);
      setDevelopmentTasks(devTasks);
    } catch (err) {
      setError(
        "Failed to fetch tasks. Please check your connection and try again."
      );
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  // Get tasks for the active tab
  const getCurrentTasks = (): Task[] => {
    return activeTab === "documentation"
      ? documentationTasks
      : developmentTasks;
  };

  // File selection functions
  const selectFile = () => {
    Alert.alert("Select File", "Choose how you want to add a file", [
      { text: "Camera", onPress: openCamera },
      { text: "Photo Library", onPress: openImagePicker },
      { text: "Document", onPress: openDocumentPicker },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Camera permission is required to take photos."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedFile(result.assets[0]);
    }
  };

  const openImagePicker = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Photo library permission is required to select images."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedFile(result.assets[0]);
    }
  };

  const openDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.error("Error picking document:", err);
      Alert.alert("Error", "Failed to select document");
    }
  };

  // Create task function
  const createTask = async () => {
    if (!taskForm.title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", taskForm.title);
      formData.append("description", taskForm.description);
      formData.append("deadline", taskForm.deadline);
      formData.append("type", taskForm.type);
      formData.append("status", taskForm.status);

      if (taskForm.assigned_to.length > 0) {
        taskForm.assigned_to.forEach((userId, index) => {
          formData.append(`assigned_to[${index}]`, userId);
        });
      }

      if (selectedFile) {
        const fileUri = selectedFile.uri;
        const fileName =
          selectedFile.name ||
          `file_${Date.now()}.${selectedFile.type?.split("/")[1] || "jpg"}`;
        const fileType = selectedFile.type || "image/jpeg";

        formData.append("file", {
          uri: fileUri,
          type: fileType,
          name: fileName,
        } as any);
      }

      const token = await AsyncStorage.getItem("authToken");
      const baseUrl =
        Platform.OS === "web"
          ? "http://127.0.0.1:8000"
          : "http://192.168.68.106:8000";

      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert("Success", "Task created successfully");
        setCreateModalVisible(false);
        resetForm();
        loadTasks(); // Refresh the task list
      } else {
        Alert.alert("Error", result.message || "Failed to create task");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      Alert.alert("Error", "Failed to create task. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Get specific task
  const getTask = async (taskId: string) => {
    try {
      const response = await authenticatedFetch(`/api/tasks/${taskId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error fetching task:", error);
      throw error;
    }
  };

  // Update task function
  const updateTask = async (taskId: string) => {
    if (!taskForm.title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", taskForm.title);
      formData.append("description", taskForm.description);
      formData.append("deadline", taskForm.deadline);
      formData.append("type", taskForm.type);
      formData.append("status", taskForm.status);

      if (taskForm.assigned_to.length > 0) {
        taskForm.assigned_to.forEach((userId, index) => {
          formData.append(`assigned_to[${index}]`, userId);
        });
      }

      if (selectedFile) {
        const fileUri = selectedFile.uri;
        const fileName =
          selectedFile.name ||
          `file_${Date.now()}.${selectedFile.type?.split("/")[1] || "jpg"}`;
        const fileType = selectedFile.type || "image/jpeg";

        formData.append("file", {
          uri: fileUri,
          type: fileType,
          name: fileName,
        } as any);
      }

      const token = await AsyncStorage.getItem("authToken");
      const baseUrl =
        Platform.OS === "web"
          ? "http://127.0.0.1:8000"
          : "http://192.168.68.106:8000";

      const response = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert("Success", "Task updated successfully");
        resetForm();
        loadTasks(); // Refresh the task list
      } else {
        Alert.alert("Error", result.message || "Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      Alert.alert("Error", "Failed to update task. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setTaskForm({
      title: "",
      description: "",
      deadline: "",
      type: "development",
      status: "To-do",
      assigned_to: [],
    });
    setSelectedFile(null);
    setSelectedTask(null);
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setTaskForm((prev) => ({ ...prev, type: activeTab }));
    setCreateModalVisible(true);
  };

  // Open edit modal
  const openEditModal = async (task: Task) => {
    // Navigate to task detail page instead of opening modal
    router.push(`/task/${task.id}`);
  };

  // Get status style based on status value
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "to-do":
        return { backgroundColor: "#f8fafc", color: "#64748b" };
      case "in progress":
        return { backgroundColor: "#f0fdf4", color: "#22c55e" };
      case "for review":
        return { backgroundColor: "#fff3e0", color: "#f57c00" };
      case "done":
        return { backgroundColor: "#f0fdf4", color: "#22c55e" };
      default:
        return { backgroundColor: "#f8fafc", color: "#64748b" };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "to-do":
        return "circle";
      case "in progress":
        return "clock.fill";
      case "for review":
        return "eye.fill";
      case "done":
        return "checkmark.circle.fill";
      default:
        return "circle";
    }
  };

  // Render tab button
  const TabButton = ({
    tab,
    title,
    icon,
    isActive,
    onPress,
  }: {
    tab: "documentation" | "development";
    title: string;
    icon: React.ComponentProps<typeof IconSymbol>["name"];
    isActive: boolean;
    onPress: () => void;
  }) => {
    const [scaleAnim] = useState(new Animated.Value(1));

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.tabButton, isActive && styles.activeTabButton]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <IconSymbol
            name={icon}
            size={18}
            color={isActive ? "#22c55e" : "#64748b"}
          />
          <Text
            style={[
              styles.tabButtonText,
              isActive && styles.activeTabButtonText,
            ]}
          >
            {title}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render task item
  const TaskItem = ({
    item,
    index,
    onPress,
  }: {
    item: Task;
    index: number;
    onPress: (task: Task) => void;
  }) => {
    const [cardAnim] = useState(new Animated.Value(0));
    const [hoverAnim] = useState(new Animated.Value(1));

    React.useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 500,
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

    const statusStyle = getStatusStyle(item.status);

    return (
      <Animated.View
        style={[
          styles.taskCard,
          {
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
          style={styles.taskCardContent}
          onPress={() => onPress(item)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleContainer}>
              <IconSymbol
                name={getStatusIcon(item.status)}
                size={16}
                color={statusStyle.color}
              />
              <Text style={styles.taskTitle}>{item.title}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusStyle.backgroundColor },
              ]}
            >
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {item.status}
              </Text>
            </View>
          </View>

          {item.description && (
            <Text style={styles.taskDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.taskDetails}>
            <View style={styles.taskDetailItem}>
              <IconSymbol name="person.fill" size={14} color="#22c55e" />
              <Text style={styles.taskDetailLabel}>Assigned to:</Text>
              <Text style={styles.taskDetailValue}>
                {Array.isArray(item.assigned_to)
                  ? item.assigned_to.join(", ")
                  : item.assigned_to}
              </Text>
            </View>

            <View style={styles.taskDetailItem}>
              <IconSymbol name="calendar" size={14} color="#f59e0b" />
              <Text style={styles.taskDetailLabel}>Deadline:</Text>
              <Text style={styles.taskDetailValue}>
                {item.deadline
                  ? new Date(item.deadline).toLocaleDateString()
                  : "No deadline"}
              </Text>
            </View>
          </View>

          {item.type === "documentation" && item.is_faculty_approved && (
            <View style={styles.approvedBadge}>
              <IconSymbol
                name="checkmark.seal.fill"
                size={16}
                color="#22c55e"
              />
              <Text style={styles.approvedText}>Faculty Approved</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render task item
  const renderTaskItem = ({ item, index }: { item: Task; index: number }) => (
    <TaskItem item={item} index={index} onPress={openEditModal} />
  );

  // Render task form modal
  const renderTaskModal = (isEdit: boolean) => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={createModalVisible}
      onRequestClose={() => {
        setCreateModalVisible(false);
        resetForm();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <IconSymbol
                      name="plus.circle.fill"
                      size={24}
                      color="#22c55e"
                    />
                    <Text style={styles.modalTitle}>Create New Task</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setCreateModalVisible(false);
                      resetForm();
                    }}
                  >
                    <IconSymbol name="xmark" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Title *</Text>
                  <TextInput
                    style={[styles.input, styles.inputFocused]}
                    value={taskForm.title}
                    onChangeText={(text) =>
                      setTaskForm((prev) => ({ ...prev, title: text }))
                    }
                    placeholder="Enter task title"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={taskForm.description}
                    onChangeText={(text) =>
                      setTaskForm((prev) => ({ ...prev, description: text }))
                    }
                    placeholder="Enter task description"
                    placeholderTextColor="#9ca3af"
                    multiline={true}
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Deadline</Text>
                  <TextInput
                    style={styles.input}
                    value={taskForm.deadline}
                    onChangeText={(text) =>
                      setTaskForm((prev) => ({ ...prev, deadline: text }))
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.radioGroup}>
                    {["To-do", "In Progress", "For Review", "Approved"].map(
                      (status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.radioOption,
                            taskForm.status === status &&
                              styles.radioOptionSelected,
                          ]}
                          onPress={() =>
                            setTaskForm((prev) => ({ ...prev, status }))
                          }
                        >
                          <Text
                            style={[
                              styles.radioText,
                              taskForm.status === status &&
                                styles.radioTextSelected,
                            ]}
                          >
                            {status}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Attach File</Text>
                  <TouchableOpacity
                    style={styles.fileButton}
                    onPress={selectFile}
                  >
                    <IconSymbol name="paperclip" size={20} color="#22c55e" />
                    <Text style={styles.fileButtonText}>
                      {selectedFile
                        ? selectedFile.name || "File Selected"
                        : "Select File"}
                    </Text>
                  </TouchableOpacity>
                  {selectedFile && (
                    <TouchableOpacity
                      style={styles.removeFileButton}
                      onPress={() => setSelectedFile(null)}
                    >
                      <IconSymbol name="trash" size={16} color="#ef4444" />
                      <Text style={styles.removeFileText}>Remove File</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setCreateModalVisible(false);
                      resetForm();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={createTask}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <IconSymbol name="plus" size={16} color="#fff" />
                        <Text style={styles.saveButtonText}>Create</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol
        name={
          activeTab === "documentation"
            ? "doc.fill"
            : "wrench.and.screwdriver.fill"
        }
        size={64}
        color="#22c55e"
      />
      <Text style={styles.emptyStateText}>No {activeTab} tasks found</Text>
      <Text style={styles.emptyStateSubtext}>
        {activeTab === "development"
          ? "Development tasks will appear here when created"
          : "Documentation tasks will appear here when available"}
      </Text>
      {activeTab === "development" && (
        <TouchableOpacity
          style={styles.createTaskButton}
          onPress={openCreateModal}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
          <Text style={styles.createTaskButtonText}>Create First Task</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </View>
    );
  }

  // Main render
  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.headerTitleContainer}>
                  <IconSymbol name="checklist" size={28} color="#22c55e" />
                  <Text style={styles.title}>Tasks</Text>
                </View>
                {activeTab === "development" && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={openCreateModal}
                  >
                    <IconSymbol name="plus" size={18} color="#fff" />
                    <Text style={styles.addButtonText}>Add Task</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TabButton
                tab="documentation"
                title="Documentation"
                icon="doc.fill"
                isActive={activeTab === "documentation"}
                onPress={() => setActiveTab("documentation")}
              />
              <TabButton
                tab="development"
                title="Development"
                icon="wrench.and.screwdriver.fill"
                isActive={activeTab === "development"}
                onPress={() => setActiveTab("development")}
              />
            </View>

            {/* Content */}
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {error ? (
                <View style={styles.centerContainer}>
                  <View style={styles.errorContainer}>
                    <IconSymbol
                      name="exclamationmark.triangle.fill"
                      size={48}
                      color="#ef4444"
                    />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={loadTasks}
                    >
                      <IconSymbol
                        name="arrow.clockwise"
                        size={16}
                        color="#fff"
                      />
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <FlatList
                  data={getCurrentTasks()}
                  renderItem={renderTaskItem}
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
                  ListEmptyComponent={renderEmptyState}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </Animated.View>

            {/* Modals */}
            {renderTaskModal(false)}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  activeTabButtonText: {
    color: "#22c55e",
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: "#64748b",
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    fontSize: 16,
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
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  listContent: {
    padding: 20,
  },
  taskCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  taskCardContent: {
    padding: 20,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  taskTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  taskDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: "500",
  },
  taskDetails: {
    gap: 12,
  },
  taskDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  taskDetailLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  taskDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  approvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  approvedText: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },
  createTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 16,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createTaskButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#f8fafc",
    color: "#1e293b",
    fontWeight: "500",
  },
  inputFocused: {
    borderColor: "#22c55e",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  radioGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  radioOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  radioOptionSelected: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  radioText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  radioTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  fileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: "#bbf7d0",
  },
  fileButtonText: {
    fontSize: 16,
    color: "#22c55e",
    fontWeight: "600",
  },
  removeFileButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  removeFileText: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "500",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  saveButton: {
    backgroundColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
