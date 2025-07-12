import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
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

interface TaskForm {
  title: string;
  description: string;
  deadline: string;
  type: "documentation" | "development";
  status: string;
  assigned_to: string[];
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const [task, setTask] = useState<Task | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>({
    title: "",
    description: "",
    deadline: "",
    type: "development",
    status: "To-do",
    assigned_to: [],
  });
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const { authenticatedFetch } = useAuth();

  // Fetch task details
  const fetchTask = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch(
        `/api/projects/${id}/view-task`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const responseData = await response.json();
      const taskData = responseData.task;

      setTask(taskData);
      setFileUrl(responseData.file_url);
      setTaskForm({
        title: taskData.title,
        description: taskData.description,
        deadline: taskData.deadline || "",
        type: taskData.type as "documentation" | "development",
        status: taskData.status,
        assigned_to: Array.isArray(taskData.assigned_to)
          ? taskData.assigned_to
          : [],
      });
    } catch (err) {
      console.error("Error fetching task:", err);
      setError("Failed to load task details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

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

  // Update task function
  const updateTask = async () => {
    if (!taskForm.title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }

    setSaving(true);
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

      const response = await fetch(`${baseUrl}/api/tasks/${id}`, {
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
        setIsEditing(false);
        fetchTask(); // Refresh task data
      } else {
        Alert.alert("Error", result.message || "Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      Alert.alert("Error", "Failed to update task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Approve task function
  const approveTask = async () => {
    Alert.alert("Approve Task", "Are you sure you want to approve this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        style: "default",
        onPress: async () => {
          setApproving(true);
          try {
            const response = await authenticatedFetch(
              `/api/projects/${id}/approve-task`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );

            const result = await response.json();

            if (response.ok) {
              Alert.alert("Success", "Task approved successfully");
              fetchTask(); // Refresh task data
            } else {
              Alert.alert("Error", result.message || "Failed to approve task");
            }
          } catch (error) {
            console.error("Error approving task:", error);
            Alert.alert("Error", "Failed to approve task. Please try again.");
          } finally {
            setApproving(false);
          }
        },
      },
    ]);
  };

  // Reject task function
  const rejectTask = async () => {
    Alert.alert("Reject Task", "Are you sure you want to reject this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          setApproving(true);
          try {
            const response = await authenticatedFetch(
              `/api/projects/${id}/reject-task`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );

            const result = await response.json();

            if (response.ok) {
              Alert.alert("Success", "Task rejected successfully");
              fetchTask(); // Refresh task data
            } else {
              Alert.alert("Error", result.message || "Failed to reject task");
            }
          } catch (error) {
            console.error("Error rejecting task:", error);
            Alert.alert("Error", "Failed to reject task. Please try again.");
          } finally {
            setApproving(false);
          }
        },
      },
    ]);
  };

  // Download file function
  const downloadFile = async () => {
    if (!fileUrl) {
      Alert.alert("Error", "No file available for download");
      return;
    }

    try {
      Alert.alert("Download File", "Open file in browser for download?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open",
          onPress: () => {
            // Use Linking to open the file URL
            Linking.openURL(fileUrl).catch(() => {
              Alert.alert("Error", "Failed to open file");
            });
          },
        },
      ]);
    } catch (error) {
      console.error("Error downloading file:", error);
      Alert.alert("Error", "Failed to download file");
    }
  };

  // Get status style based on status value
  const getStatusStyle = (status: string | undefined) => {
    if (!status) {
      return { backgroundColor: "#f8fafc", color: "#64748b" };
    }

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

  const getStatusIcon = (status: string | undefined) => {
    if (!status) {
      return "circle";
    }

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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading task...</Text>
        </View>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={48}
            color="#ef4444"
          />
          <Text style={styles.errorText}>{error || "Task not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="arrow.left" size={16} color="#fff" />
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusStyle = getStatusStyle(task.status);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <IconSymbol name="chevron.left" size={20} color="#22c55e" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Task Details</Text>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(!isEditing)}
              >
                <IconSymbol
                  name={isEditing ? "xmark" : "pencil"}
                  size={18}
                  color="#22c55e"
                />
                <Text style={styles.editButtonText}>
                  {isEditing ? "Cancel" : "Edit"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Task Status Badge */}
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusStyle.backgroundColor },
                  ]}
                >
                  <IconSymbol
                    name={getStatusIcon(task.status)}
                    size={16}
                    color={statusStyle.color}
                  />
                  <Text
                    style={[styles.statusText, { color: statusStyle.color }]}
                  >
                    {task.status}
                  </Text>
                </View>
                <Text style={styles.taskType}>{task.type}</Text>
              </View>

              {/* Task Form */}
              <View style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Title *</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={taskForm.title}
                      onChangeText={(text) =>
                        setTaskForm((prev) => ({ ...prev, title: text }))
                      }
                      placeholder="Enter task title"
                      placeholderTextColor="#9ca3af"
                    />
                  ) : (
                    <Text style={styles.displayText}>{task.title}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  {isEditing ? (
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
                  ) : (
                    <Text style={styles.displayText}>
                      {task.description || "No description"}
                    </Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Deadline</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={taskForm.deadline}
                      onChangeText={(text) =>
                        setTaskForm((prev) => ({ ...prev, deadline: text }))
                      }
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9ca3af"
                    />
                  ) : (
                    <Text style={styles.displayText}>
                      {task.deadline
                        ? new Date(task.deadline).toLocaleDateString()
                        : "No deadline"}
                    </Text>
                  )}
                </View>

                {isEditing && (
                  <>
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
                        <IconSymbol
                          name="paperclip"
                          size={20}
                          color="#22c55e"
                        />
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
                  </>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Assigned To</Text>
                  <Text style={styles.displayText}>
                    {Array.isArray(task.assigned_to)
                      ? task.assigned_to.join(", ")
                      : task.assigned_to || "Unassigned"}
                  </Text>
                </View>

                {task.type === "documentation" && task.is_faculty_approved && (
                  <View style={styles.approvedContainer}>
                    <IconSymbol
                      name="checkmark.seal.fill"
                      size={20}
                      color="#22c55e"
                    />
                    <Text style={styles.approvedText}>Faculty Approved</Text>
                  </View>
                )}

                {/* File Download Section */}
                {fileUrl && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Attached File</Text>
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={downloadFile}
                    >
                      <IconSymbol
                        name="arrow.down.circle.fill"
                        size={20}
                        color="#22c55e"
                      />
                      <Text style={styles.downloadButtonText}>
                        Download File
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Approve/Reject Buttons for For Review Tasks */}
                {task.status?.toLowerCase() === "for review" && !isEditing && (
                  <View style={styles.approvalContainer}>
                    <TouchableOpacity
                      style={[styles.approvalButton, styles.approveButton]}
                      onPress={approveTask}
                      disabled={approving}
                    >
                      {approving ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <IconSymbol
                            name="checkmark.circle.fill"
                            size={18}
                            color="#fff"
                          />
                          <Text style={styles.approvalButtonText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.approvalButton, styles.rejectButton]}
                      onPress={rejectTask}
                      disabled={approving}
                    >
                      {approving ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <IconSymbol
                            name="xmark.circle.fill"
                            size={18}
                            color="#fff"
                          />
                          <Text style={styles.approvalButtonText}>Reject</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Save Button (only shown when editing) */}
            {isEditing && (
              <View style={styles.saveContainer}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    saving && styles.saveButtonDisabled,
                  ]}
                  onPress={updateTask}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <IconSymbol name="checkmark" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    marginBottom: 16,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backButtonText: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  editButtonText: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  taskType: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    textTransform: "capitalize",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  formContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formGroup: {
    marginBottom: 24,
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
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  displayText: {
    fontSize: 16,
    color: "#1e293b",
    lineHeight: 24,
    fontWeight: "500",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  approvedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  approvedText: {
    fontSize: 16,
    color: "#22c55e",
    fontWeight: "600",
  },
  saveContainer: {
    padding: 20,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: "#bbf7d0",
  },
  downloadButtonText: {
    fontSize: 16,
    color: "#22c55e",
    fontWeight: "600",
  },
  approvalContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  approvalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  approveButton: {
    backgroundColor: "#22c55e",
  },
  rejectButton: {
    backgroundColor: "#ef4444",
  },
  approvalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
