import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface GroupDetails {
  id: number;
  name: string;
  group_code: string;
  leader_id: number;
  description: string | null;
  adviser: number;
  status: string;
  created_at: string;
  updated_at: string;
  logo: string | null;
  leader: User;
  adviser_user: User;
  members: User[];
}

export default function GroupDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [editedGroup, setEditedGroup] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { authenticatedFetch } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(`/api/groups/${id}`);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const groupData = await response.json();
        setGroup(groupData);
        setEditedGroup(groupData);
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

  const handleFieldChange = (field: keyof GroupDetails, value: any) => {
    if (editedGroup) {
      setEditedGroup({
        ...editedGroup,
        [field]: value,
      });
    }
  };

  const hasChanges = () => {
    if (!group || !editedGroup) return false;
    return JSON.stringify(group) !== JSON.stringify(editedGroup);
  };

  const handleSave = async () => {
    if (!editedGroup) return;

    try {
      setSaving(true);
      const response = await authenticatedFetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editedGroup.name,
          description: editedGroup.description,
          status: editedGroup.status,
          leader_id: editedGroup.leader_id,
          adviser: editedGroup.adviser,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const updatedData = await response.json();
      setGroup(updatedData);
      setEditedGroup(updatedData);
      setError(null);
    } catch (err) {
      setError("Failed to save changes. Please try again later.");
      console.error("Error saving group details:", err);
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return styles.statusActive;
      case "inactive":
        return styles.statusInactive;
      case "pending":
        return styles.statusPending;
      default:
        return {};
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading group details...</Text>
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

  if (!group || !editedGroup) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{editedGroup.name}</Text>
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
            {editedGroup.logo && (
              <View style={styles.logoContainer}>
                <Image
                  source={{ uri: editedGroup.logo }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.label}>Name:</Text>
              <TextInput
                style={styles.input}
                value={editedGroup.name}
                onChangeText={(value) => handleFieldChange("name", value)}
                placeholder="Enter group name"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Group Code:</Text>
              <Text style={styles.value}>{editedGroup.group_code}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Adviser:</Text>
              <Text style={styles.value}>
                {editedGroup.adviser_user?.name || "No adviser assigned"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Leader:</Text>
              <Text style={styles.value}>
                {editedGroup.leader?.name || "No leader assigned"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Members:</Text>
              <Text style={styles.value}>
                {editedGroup.members.map((member) => member.name).join(", ")}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Status:</Text>
              <Text style={[styles.value, getStatusStyle(editedGroup.status)]}>
                {editedGroup.status}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Description:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedGroup.description || ""}
                onChangeText={(value) =>
                  handleFieldChange("description", value)
                }
                placeholder="Enter description"
                multiline
                numberOfLines={4}
                returnKeyType="done"
                blurOnSubmit={true}
              />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  statusInput: {
    textTransform: "capitalize",
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
  statusText: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  statusPending: {
    backgroundColor: "#fff8e1",
    color: "#ff8f00",
  },
  statusActive: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  statusInactive: {
    backgroundColor: "#ffebee",
    color: "#c62828",
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
});
