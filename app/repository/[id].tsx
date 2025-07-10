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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading repository details...</Text>
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
                  defaultSource={require("../../assets/images/default-logo.webp")}
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
              <Text style={styles.value}>{editedProject.status}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Final Grade:</Text>
              <Text style={styles.value}>{editedProject.final_grade}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Awards:</Text>
              <Text style={styles.value}>{editedProject.awards}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Description:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedProject.description}
                onChangeText={(value) =>
                  handleFieldChange("description", value)
                }
                placeholder="Enter description"
                multiline
                numberOfLines={4}
              />
            </View>
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
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
});
