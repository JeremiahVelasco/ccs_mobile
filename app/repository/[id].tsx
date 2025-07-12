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
import { IconSymbol } from "../../components/ui/IconSymbol";
import { useAuth } from "../../contexts/AuthContext";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  final_grade: string;
  awards: string;
  logo: string;
}

export default function RepositoryDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [editedProject, setEditedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { authenticatedFetch } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(`/api/repository/${id}`);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const projectData = await response.json();
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

  const handleFieldChange = (field: keyof Project, value: any) => {
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
      const response = await authenticatedFetch(`/api/repository/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editedProject.title,
          description: editedProject.description,
          status: editedProject.status,
          final_grade: editedProject.final_grade,
          awards: editedProject.awards,
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
      console.error("Error saving repository details:", err);
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "in progress":
        return styles.statusActive;
      case "completed":
      case "done":
        return styles.statusCompleted;
      case "archived":
        return styles.statusArchived;
      default:
        return styles.statusDefault;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading repository details...</Text>
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
              name="exclamationmark.triangle"
              size={48}
              color="#dc2626"
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => window.location.reload()}
            >
              <IconSymbol name="arrow.clockwise" size={16} color="#ffffff" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!project || !editedProject) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.errorContainer}>
            <IconSymbol name="folder" size={48} color="#64748b" />
            <Text style={styles.errorText}>Repository not found</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <IconSymbol name="arrow.left" size={16} color="#ffffff" />
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  style={styles.backIconButton}
                  onPress={() => router.back()}
                >
                  <IconSymbol name="arrow.left" size={20} color="#64748b" />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                  <Text style={styles.title} numberOfLines={2}>
                    {editedProject.title}
                  </Text>
                  <Text style={styles.subtitle}>Repository Details</Text>
                </View>
              </View>
              {hasChanges() && (
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    saving && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <IconSymbol name="checkmark" size={16} color="#ffffff" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.detailsContainer}>
              {editedProject.logo && (
                <View style={styles.logoContainer}>
                  <Image
                    source={{ uri: editedProject.logo }}
                    style={styles.logo}
                    defaultSource={require("../../assets/images/default-logo.webp")}
                  />
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.label}>
                  <IconSymbol name="textformat" size={16} color="#16a34a" />
                  {"  "}Title *
                </Text>
                <TextInput
                  style={styles.input}
                  value={editedProject.title}
                  onChangeText={(value) => handleFieldChange("title", value)}
                  placeholder="Enter project title"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>
                  <IconSymbol
                    name="checkmark.circle"
                    size={16}
                    color="#16a34a"
                  />
                  {"  "}Status
                </Text>
                <View
                  style={[
                    styles.statusContainer,
                    getStatusStyle(editedProject.status),
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      getStatusStyle(editedProject.status),
                    ]}
                  >
                    {editedProject.status}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>
                  <IconSymbol name="graduationcap" size={16} color="#16a34a" />
                  {"  "}Final Grade
                </Text>
                <View style={styles.gradeContainer}>
                  <Text style={styles.gradeValue}>
                    {editedProject.final_grade}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>
                  <IconSymbol name="trophy" size={16} color="#16a34a" />
                  {"  "}Awards
                </Text>
                <View style={styles.awardsContainer}>
                  <Text style={styles.awardsValue}>
                    {editedProject.awards || "No awards yet"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>
                  <IconSymbol name="doc.text" size={16} color="#16a34a" />
                  {"  "}Description *
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedProject.description}
                  onChangeText={(value) =>
                    handleFieldChange("description", value)
                  }
                  placeholder="Enter project description"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    fontSize: 16,
    color: "#1f2937",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontWeight: "500",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  statusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusActive: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },
  statusCompleted: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusArchived: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
  },
  statusDefault: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
  },
  gradeContainer: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignSelf: "flex-start",
  },
  gradeValue: {
    fontSize: 16,
    color: "#15803d",
    fontWeight: "600",
  },
  awardsContainer: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  awardsValue: {
    fontSize: 16,
    color: "#d97706",
    fontWeight: "500",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#e2e8f0",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 12,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#64748b",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
