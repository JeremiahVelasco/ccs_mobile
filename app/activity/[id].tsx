import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

interface Activity {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  priority: number;
  is_flexible: boolean;
  category: string;
}

interface ApiResponse {
  data: Activity;
  status: string;
}

export default function ActivityDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [editedActivity, setEditedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { authenticatedFetch } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching activity with ID:", id);
        setLoading(true);
        const response = await authenticatedFetch(`/api/activities/${id}`);
        console.log("Activity response status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = (await response.json()) as ApiResponse;
        console.log("Activity data received:", responseData);

        if (responseData.data) {
          setActivity(responseData.data);
          setEditedActivity(responseData.data);
          setError(null);
        } else {
          throw new Error("No activity data received");
        }
      } catch (err) {
        console.error("Error fetching activity data:", err);
        setError("Failed to fetch data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, authenticatedFetch]);

  const handleFieldChange = (field: keyof Activity, value: any) => {
    if (editedActivity) {
      setEditedActivity({
        ...editedActivity,
        [field]: value,
      });
    }
  };

  const hasChanges = () => {
    if (!activity || !editedActivity) return false;
    return JSON.stringify(activity) !== JSON.stringify(editedActivity);
  };

  const handleSave = async () => {
    if (!editedActivity) return;

    try {
      setSaving(true);
      const response = await authenticatedFetch(`/api/activities/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editedActivity.title,
          description: editedActivity.description,
          date: editedActivity.date,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const responseData = (await response.json()) as ApiResponse;
      if (responseData.data) {
        setActivity(responseData.data);
        setEditedActivity(responseData.data);
        setError(null);
      } else {
        throw new Error("No activity data received after update");
      }
    } catch (err) {
      setError("Failed to save changes. Please try again later.");
      console.error("Error saving activity details:", err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "";

    try {
      console.log("Formatting date:", dateString);
      const date = new Date(dateString);
      console.log("Parsed date:", date);

      if (isNaN(date.getTime())) {
        console.log("Invalid date detected");
        return dateString;
      }

      const formattedDate = date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      console.log("Formatted date:", formattedDate);
      return formattedDate;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading activity details...</Text>
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

  if (!activity || !editedActivity) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.errorContainer}>
            <IconSymbol name="doc.text" size={48} color="#64748b" />
            <Text style={styles.errorText}>Activity not found</Text>
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

  console.log("Rendering activity details:", editedActivity);

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
                    {editedActivity.title}
                  </Text>
                  <Text style={styles.subtitle}>Activity Details</Text>
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
              <View style={styles.detailRow}>
                <Text style={styles.label}>
                  <IconSymbol name="textformat" size={16} color="#16a34a" />
                  {"  "}Title *
                </Text>
                <TextInput
                  style={styles.input}
                  value={editedActivity.title}
                  onChangeText={(value) => handleFieldChange("title", value)}
                  placeholder="Enter activity title"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>
                  <IconSymbol name="calendar" size={16} color="#16a34a" />
                  {"  "}Start Date
                </Text>
                <View style={styles.dateContainer}>
                  <Text style={styles.dateValue}>
                    {formatDate(editedActivity.start_date)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>
                  <IconSymbol name="calendar" size={16} color="#16a34a" />
                  {"  "}End Date
                </Text>
                <View style={styles.dateContainer}>
                  <Text style={styles.dateValue}>
                    {formatDate(editedActivity.end_date)}
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
                  value={editedActivity.description}
                  onChangeText={(value) =>
                    handleFieldChange("description", value)
                  }
                  placeholder="Enter activity description"
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
  dateContainer: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  dateValue: {
    fontSize: 16,
    color: "#15803d",
    fontWeight: "500",
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
