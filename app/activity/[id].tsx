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
import { useAuth } from "../../contexts/AuthContext";

interface Activity {
  id: number;
  title: string;
  description: string;
  date: string;
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading activity details...</Text>
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

  if (!activity || !editedActivity) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Activity not found</Text>
      </View>
    );
  }

  console.log("Rendering activity details:", editedActivity);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{editedActivity.title}</Text>
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
            <View style={styles.detailRow}>
              <Text style={styles.label}>Title:</Text>
              <TextInput
                style={styles.input}
                value={editedActivity.title}
                onChangeText={(value) => handleFieldChange("title", value)}
                placeholder="Enter activity title"
              />
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>
                {formatDate(editedActivity.date)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Description:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedActivity.description}
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
});
