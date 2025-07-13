import DateTimePicker from "@react-native-community/datetimepicker";
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

// Define the Activity interface for type checking
interface Activity {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  priority: number;
  is_flexible: boolean;
  category: string;
  created_at: string;
  updated_at: string;
}

// Define the API response interface
interface ApiResponse {
  data: Activity[];
  status: string;
}

// Define the form interface
interface ActivityForm {
  title: string;
  description: string;
  start_date: Date;
  end_date: Date;
  priority: number;
  is_flexible: boolean;
  category: string;
}

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Activity>("start_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [activityForm, setActivityForm] = useState<ActivityForm>({
    title: "",
    description: "",
    start_date: new Date(),
    end_date: new Date(),
    priority: 2,
    is_flexible: false,
    category: "",
  });
  const { authenticatedFetch, user } = useAuth();
  const router = useRouter();

  // Check if user is a student using the new role structure
  const isStudent =
    user &&
    // Check in roles array
    ((user.roles &&
      user.roles.some(
        (role: string) =>
          role.toLowerCase() === "student" || role.toLowerCase() === "students"
      )) ||
      // Check in user_roles array (alternative naming)
      (user.user_roles &&
        user.user_roles.some(
          (role: string) =>
            role.toLowerCase() === "student" ||
            role.toLowerCase() === "students"
        )) ||
      // Check primary_role
      (user.primary_role &&
        (user.primary_role.toLowerCase() === "student" ||
          user.primary_role.toLowerCase() === "students")) ||
      // Check legacy role field as fallback
      (user.role &&
        (user.role.toLowerCase() === "student" ||
          user.role.toLowerCase() === "students")));

  // Fetch activities from the API
  useEffect(() => {
    let isMounted = true;

    const fetchActivities = async () => {
      try {
        console.log("Starting to fetch activities...");
        setLoading(true);
        const response = await authenticatedFetch("/api/activities");
        console.log("Activities response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error("Activities error data:", errorData);
          throw new Error(
            errorData?.message || `HTTP error! Status: ${response.status}`
          );
        }

        const responseData = (await response.json()) as ApiResponse;
        console.log("Activities data received:", responseData);

        if (isMounted) {
          setActivities(responseData.data || []);
          setError(null);
        }
      } catch (err) {
        console.error("Error in fetchActivities:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch activities. Please check your connection and API endpoint."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActivities();

    return () => {
      isMounted = false;
    };
  }, [authenticatedFetch]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await authenticatedFetch("/api/activities");
      if (response.ok) {
        const responseData = (await response.json()) as ApiResponse;
        setActivities(responseData.data || []);
        setError(null);
      }
    } catch (err) {
      console.error("Error refreshing activities:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }

      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };

      return date.toLocaleString("en-PH", options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  // Sort activities based on the current sort key and direction
  const sortedActivities = [...activities].sort((a, b) => {
    if (sortKey === "start_date") {
      const dateA = new Date(a.start_date).getTime();
      const dateB = new Date(b.start_date).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    }
    return sortDirection === "asc"
      ? String(a[sortKey]).localeCompare(String(b[sortKey]))
      : String(b[sortKey]).localeCompare(String(a[sortKey]));
  });

  // Handle sorting when a sort button is pressed
  const handleSort = (key: keyof Activity) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Render sort indicator arrow based on current sort state
  const renderSortIndicator = (key: keyof Activity) => {
    if (sortKey === key) {
      return sortDirection === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  // Get relative time for activity
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
        if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
        return `In ${Math.floor(diffDays / 30)} months`;
      }

      // Handle past dates
      const pastDays = Math.abs(diffDays);
      if (pastDays === 1) return "Yesterday";
      if (pastDays < 7) return `${pastDays} days ago`;
      if (pastDays < 30) return `${Math.floor(pastDays / 7)} weeks ago`;
      return `${Math.floor(pastDays / 30)} months ago`;
    } catch {
      return "";
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: number): string => {
    switch (priority) {
      case 1:
        return "Low";
      case 2:
        return "Medium";
      case 3:
        return "High";
      case 4:
        return "Urgent";
      default:
        return "Medium";
    }
  };

  // Get priority color
  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 1:
        return "#22c55e"; // Green
      case 2:
        return "#3b82f6"; // Blue
      case 3:
        return "#f59e0b"; // Orange
      case 4:
        return "#ef4444"; // Red
      default:
        return "#3b82f6";
    }
  };

  // Reset form
  const resetForm = () => {
    setActivityForm({
      title: "",
      description: "",
      start_date: new Date(),
      end_date: new Date(),
      priority: 2,
      is_flexible: false,
      category: "",
    });
  };

  // Create activity function
  const createActivity = async () => {
    // Validate form
    if (!activityForm.title.trim()) {
      Alert.alert("Error", "Activity title is required");
      return;
    }

    if (!activityForm.description.trim()) {
      Alert.alert("Error", "Activity description is required");
      return;
    }

    if (!activityForm.category.trim()) {
      Alert.alert("Error", "Activity category is required");
      return;
    }

    if (activityForm.start_date >= activityForm.end_date) {
      Alert.alert("Error", "End date must be after start date");
      return;
    }

    setSaving(true);
    try {
      const response = await authenticatedFetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: activityForm.title,
          description: activityForm.description,
          start_date: activityForm.start_date.toISOString(),
          end_date: activityForm.end_date.toISOString(),
          priority: activityForm.priority,
          is_flexible: activityForm.is_flexible,
          category: activityForm.category,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `HTTP error! Status: ${response.status}`
        );
      }

      const result = await response.json();
      Alert.alert("Success", "Activity created successfully");
      setCreateModalVisible(false);
      resetForm();
      onRefresh(); // Refresh the activities list
    } catch (error) {
      console.error("Error creating activity:", error);
      Alert.alert("Error", "Failed to create activity. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle date change
  const handleDateChange = (
    event: any,
    selectedDate: Date | undefined,
    type: "start" | "end"
  ) => {
    const currentDate = selectedDate || new Date();

    if (Platform.OS === "android") {
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
    }

    if (type === "start") {
      setActivityForm((prev) => ({ ...prev, start_date: currentDate }));
    } else {
      setActivityForm((prev) => ({ ...prev, end_date: currentDate }));
    }
  };

  // Format date for display
  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Activity Card Component
  const ActivityCard = ({ item, index }: { item: Activity; index: number }) => {
    const animatedValue = new Animated.Value(0);

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
          styles.activityCard,
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
          onPress={() => router.push(`/activity/${item.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.activityTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.dateContainer}>
              <Text style={styles.relativeTime}>
                {getRelativeTime(item.start_date)}
              </Text>
            </View>
          </View>

          <Text style={styles.activityDescription} numberOfLines={3}>
            {item.description}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Start:</Text>
              <Text style={styles.dateValue}>
                {formatDate(item.start_date)}
              </Text>
            </View>
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>End:</Text>
              <Text style={styles.dateValue}>{formatDate(item.end_date)}</Text>
            </View>
          </View>

          <View style={styles.cardIndicator} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render activity card
  const renderActivityCard = ({
    item,
    index,
  }: {
    item: Activity;
    index: number;
  }) => <ActivityCard item={item} index={index} />;

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
            sortKey === "start_date" && styles.sortButtonActive,
          ]}
          onPress={() => handleSort("start_date")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortKey === "start_date" && styles.sortButtonTextActive,
            ]}
          >
            Date{renderSortIndicator("start_date")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render create activity modal
  const renderCreateActivityModal = () => (
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
                    <Text style={styles.modalTitle}>Create New Activity</Text>
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
                    style={styles.input}
                    value={activityForm.title}
                    onChangeText={(text) =>
                      setActivityForm((prev) => ({ ...prev, title: text }))
                    }
                    placeholder="Enter activity title"
                    placeholderTextColor="#9ca3af"
                    maxLength={255}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={activityForm.description}
                    onChangeText={(text) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        description: text,
                      }))
                    }
                    placeholder="Enter activity description"
                    placeholderTextColor="#9ca3af"
                    multiline={true}
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Category *</Text>
                  <TextInput
                    style={styles.input}
                    value={activityForm.category}
                    onChangeText={(text) =>
                      setActivityForm((prev) => ({ ...prev, category: text }))
                    }
                    placeholder="Enter activity category"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Priority *</Text>
                  <View style={styles.priorityContainer}>
                    {[1, 2, 3, 4].map((priority) => (
                      <TouchableOpacity
                        key={priority}
                        style={[
                          styles.priorityButton,
                          activityForm.priority === priority && {
                            backgroundColor: getPriorityColor(priority),
                          },
                        ]}
                        onPress={() =>
                          setActivityForm((prev) => ({ ...prev, priority }))
                        }
                      >
                        <Text
                          style={[
                            styles.priorityButtonText,
                            activityForm.priority === priority && {
                              color: "#ffffff",
                            },
                          ]}
                        >
                          {getPriorityLabel(priority)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Start Date *</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={styles.datePickerButtonText}>
                      {formatDateForDisplay(activityForm.start_date)}
                    </Text>
                    <IconSymbol name="calendar" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>End Date *</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={styles.datePickerButtonText}>
                      {formatDateForDisplay(activityForm.end_date)}
                    </Text>
                    <IconSymbol name="calendar" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={[
                        styles.checkbox,
                        activityForm.is_flexible && styles.checkboxChecked,
                      ]}
                      onPress={() =>
                        setActivityForm((prev) => ({
                          ...prev,
                          is_flexible: !prev.is_flexible,
                        }))
                      }
                    >
                      {activityForm.is_flexible && (
                        <IconSymbol
                          name="checkmark"
                          size={14}
                          color="#ffffff"
                        />
                      )}
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>Flexible Schedule</Text>
                  </View>
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
                    onPress={createActivity}
                    disabled={saving}
                  >
                    {saving ? (
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

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={activityForm.start_date}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) =>
            handleDateChange(event, selectedDate, "start")
          }
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={activityForm.end_date}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) =>
            handleDateChange(event, selectedDate, "end")
          }
        />
      )}
    </Modal>
  );

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      </View>
    );
  }

  // Main render - the activities list
  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Activities</Text>
              <Text style={styles.subtitle}>
                {activities.length}{" "}
                {activities.length === 1 ? "activity" : "activities"}
              </Text>
            </View>

            {error ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={onRefresh}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : activities.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.noActivitiesText}>No activities found</Text>
                <Text style={styles.noActivitiesSubtext}>
                  Check back later for new activities
                </Text>
              </View>
            ) : (
              <>
                {renderSortControls()}
                <FlatList
                  data={sortedActivities}
                  renderItem={renderActivityCard}
                  keyExtractor={(item) => String(item.id)}
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

            {/* Floating Action Button - Only show for non-students */}
            {!isStudent && (
              <TouchableOpacity
                style={styles.floatingActionButton}
                onPress={() => setCreateModalVisible(true)}
              >
                <IconSymbol name="plus" size={28} color="#ffffff" />
              </TouchableOpacity>
            )}

            {/* Create Activity Modal */}
            {renderCreateActivityModal()}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sortButtonActive: {
    backgroundColor: "#025A2A",
    borderColor: "#025A2A",
  },
  sortButtonText: {
    fontSize: 14,
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
  activityCard: {
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
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  dateContainer: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  relativeTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803d",
  },
  activityDescription: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
    marginBottom: 16,
  },
  cardFooter: {
    gap: 8,
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    width: 40,
  },
  dateValue: {
    fontSize: 14,
    color: "#64748b",
    flex: 1,
  },
  cardIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#025A2A",
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
  noActivitiesText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    marginBottom: 8,
  },
  noActivitiesSubtext: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 0,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  formGroup: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  priorityContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  priorityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  datePickerButtonText: {
    fontSize: 16,
    color: "#1f2937",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  checkboxChecked: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#374151",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#22c55e",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  floatingActionButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#22c55e",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
