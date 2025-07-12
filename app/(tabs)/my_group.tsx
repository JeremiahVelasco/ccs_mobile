import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/useColorScheme";
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
import { SafeAreaView } from "react-native-safe-area-context";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Group {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  leader?: User;
  adviser?: User;
  members?: User[];
  description?: string;
  group_code?: string;
}

export default function MyGroupScreen() {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  const { authenticatedFetch, user } = useAuth();
  const colorScheme = useColorScheme();

  useEffect(() => {
    fetchGroup();
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

  const fetchGroup = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch("/api/my-group");
      const data = await response.json();

      // The backend returns an array, get the first group if it exists
      if (Array.isArray(data) && data.length > 0) {
        setGroup(data[0]);
      } else {
        setGroup(null);
      }
    } catch (err) {
      console.error("Error fetching group:", err);
      setError("Failed to load group information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await authenticatedFetch(
        "/api/my-group/students-without-group"
      );
      const data = await response.json();
      setAvailableStudents(data);
    } catch (err) {
      console.error("Error fetching available students:", err);
      Alert.alert("Error", "Failed to load available students.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGroup();
    setRefreshing(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    try {
      setSaving(true);
      const response = await authenticatedFetch("/api/my-group/create-group", {
        method: "POST",
        body: JSON.stringify({
          name: groupName.trim(),
        }),
      });

      const newGroup = await response.json();
      setGroup(newGroup);
      setShowCreateModal(false);
      setGroupName("");
      Alert.alert("Success", "Group created successfully!");
      await fetchGroup(); // Refresh to get full group data with relationships
    } catch (err) {
      console.error("Error creating group:", err);
      Alert.alert("Error", "Failed to create group. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      Alert.alert("Error", "Please enter a group code");
      return;
    }

    try {
      setSaving(true);
      const response = await authenticatedFetch("/api/my-group/join-group", {
        method: "POST",
        body: JSON.stringify({
          group_code: groupCode.trim(),
        }),
      });

      const joinedGroup = await response.json();
      setGroup(joinedGroup);
      setShowJoinModal(false);
      setGroupCode("");
      Alert.alert("Success", "Successfully joined the group!");
      await fetchGroup(); // Refresh to get full group data with relationships
    } catch (err) {
      console.error("Error joining group:", err);
      Alert.alert(
        "Error",
        "Failed to join group. Please check the group code and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!group || !groupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    try {
      setSaving(true);
      const response = await authenticatedFetch("/api/my-group/update", {
        method: "PUT",
        body: JSON.stringify({
          name: groupName.trim(),
        }),
      });

      await response.json();

      // Update the local group state
      setGroup((prev) => (prev ? { ...prev, name: groupName.trim() } : null));
      setShowEditModal(false);
      setGroupName("");
      Alert.alert("Success", "Group updated successfully!");
    } catch (err) {
      console.error("Error updating group:", err);
      Alert.alert("Error", "Failed to update group. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!group) return;

    const isLeader = group.leader?.id === user?.id;
    const hasOtherMembers = (group.members || []).length > 1;

    let message = "Are you sure you want to leave this group?";
    if (isLeader && hasOtherMembers) {
      message =
        "You are the leader of this group. Leadership will be transferred to another member. Are you sure you want to leave?";
    } else if (isLeader && !hasOtherMembers) {
      message =
        "You are the only member of this group. Leaving will delete the group. Are you sure?";
    }

    Alert.alert("Leave Group", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            await authenticatedFetch("/api/my-group/leave-group", {
              method: "POST",
            });

            setGroup(null);
            Alert.alert("Success", "You have left the group!");
          } catch (err) {
            console.error("Error leaving group:", err);
            Alert.alert("Error", "Failed to leave group. Please try again.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleAddMember = async (userId: number) => {
    try {
      setSaving(true);
      const response = await authenticatedFetch("/api/my-group/add-member", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
        }),
      });

      await response.json();
      setShowAddMemberModal(false);
      Alert.alert("Success", "Member added successfully!");
      await fetchGroup(); // Refresh to get updated group data
    } catch (err) {
      console.error("Error adding member:", err);
      Alert.alert("Error", "Failed to add member. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: number, userName: string) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${userName} from the group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await authenticatedFetch("/api/my-group/remove-member", {
                method: "POST",
                body: JSON.stringify({
                  user_id: userId,
                }),
              });

              Alert.alert("Success", "Member removed successfully!");
              await fetchGroup(); // Refresh to get updated group data
            } catch (err) {
              console.error("Error removing member:", err);
              Alert.alert(
                "Error",
                "Failed to remove member. Please try again."
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const openCreateModal = () => {
    setGroupName("");
    setShowCreateModal(true);
  };

  const openJoinModal = () => {
    setGroupCode("");
    setShowJoinModal(true);
  };

  const openEditModal = () => {
    setGroupName(group?.name || "");
    setShowEditModal(true);
  };

  const openAddMemberModal = async () => {
    setShowAddMemberModal(true);
    await fetchAvailableStudents();
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  const isLeader = group && user && group.leader?.id === user.id;

  // Member Card Component
  const MemberCard = ({
    member,
    isUserLeader,
  }: {
    member: User;
    isUserLeader: boolean;
  }) => {
    const animatedValue = new Animated.Value(0);
    const [scaleAnim] = useState(new Animated.Value(1));

    React.useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, []);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
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
      <Animated.View
        style={[
          styles.memberCard,
          {
            opacity: animatedValue,
            transform: [
              {
                scale: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <View style={styles.memberInfo}>
          <View style={styles.memberAvatar}>
            <IconSymbol name="person.fill" size={18} color="#22c55e" />
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{member?.name || "Unknown"}</Text>
            <Text style={styles.memberEmail}>{member?.email || ""}</Text>
            <View style={styles.memberRoleBadge}>
              <Text style={styles.memberRole}>
                {member?.id === group?.leader?.id ? "Leader" : "Member"}
              </Text>
            </View>
          </View>
        </View>
        {isUserLeader && member?.id !== group?.leader?.id && (
          <TouchableOpacity
            style={styles.removeMemberButton}
            onPress={() =>
              handleRemoveMember(member?.id, member?.name || "Unknown")
            }
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <IconSymbol name="trash" size={16} color="#ef4444" />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <ThemedText style={styles.loadingText}>
            Loading group information...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.errorContainer}>
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={48}
            color="#ef4444"
          />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={fetchGroup}>
            <IconSymbol name="arrow.clockwise" size={16} color="#ffffff" />
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.header}>
                <Text style={styles.pageTitle}>My Group</Text>
                <Text style={styles.pageSubtitle}>
                  {group ? "Manage your group" : "Create or join a group"}
                </Text>
              </View>

              {group ? (
                <View style={styles.groupContainer}>
                  <View style={styles.groupHeader}>
                    <View style={styles.groupTitleContainer}>
                      <View style={styles.groupIconContainer}>
                        <IconSymbol
                          name="person.3.sequence.fill"
                          size={28}
                          color="#22c55e"
                        />
                      </View>
                      <View style={styles.groupTitleContent}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        {group.group_code && (
                          <View style={styles.groupCodeContainer}>
                            <Text style={styles.groupCode}>
                              #{group.group_code}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.groupActions}>
                      {isLeader && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={openEditModal}
                        >
                          <IconSymbol name="pencil" size={16} color="#22c55e" />
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.leaveButton}
                        onPress={handleLeaveGroup}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                          <IconSymbol name="xmark" size={16} color="#ef4444" />
                        )}
                        <Text style={styles.leaveButtonText}>
                          {deleting ? "Leaving..." : "Leave"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.groupDetails}>
                    <View style={styles.detailCard}>
                      <View style={styles.detailHeader}>
                        <IconSymbol
                          name="crown.fill"
                          size={16}
                          color="#22c55e"
                        />
                        <Text style={styles.detailLabel}>Leader</Text>
                      </View>
                      <Text style={styles.detailValue}>
                        {group.leader?.name || "No leader assigned"}
                      </Text>
                    </View>
                    <View style={styles.detailCard}>
                      <View style={styles.detailHeader}>
                        <IconSymbol
                          name="graduationcap.fill"
                          size={16}
                          color="#22c55e"
                        />
                        <Text style={styles.detailLabel}>Adviser</Text>
                      </View>
                      <Text style={styles.detailValue}>
                        {group.adviser?.name || "No adviser assigned"}
                      </Text>
                    </View>
                    <View style={styles.detailCard}>
                      <View style={styles.detailHeader}>
                        <IconSymbol
                          name="text.alignleft"
                          size={16}
                          color="#22c55e"
                        />
                        <Text style={styles.detailLabel}>Description</Text>
                      </View>
                      <Text style={styles.detailValue}>
                        {group.description || "No description"}
                      </Text>
                    </View>
                  </View>

                  {/* Members Section */}
                  <View style={styles.membersSection}>
                    <View style={styles.membersSectionHeader}>
                      <View style={styles.membersSectionTitle}>
                        <IconSymbol
                          name="person.2.fill"
                          size={20}
                          color="#22c55e"
                        />
                        <Text style={styles.sectionTitle}>
                          Members ({(group.members || []).length})
                        </Text>
                      </View>
                      {isLeader && (
                        <TouchableOpacity
                          style={styles.addMemberButton}
                          onPress={openAddMemberModal}
                        >
                          <IconSymbol name="plus" size={16} color="#22c55e" />
                          <Text style={styles.addMemberButtonText}>Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.membersList}>
                      {(group.members || []).map((member) => (
                        <MemberCard
                          key={member?.id}
                          member={member}
                          isUserLeader={isLeader}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.noGroupContainer}>
                  <View style={styles.noGroupIcon}>
                    <IconSymbol
                      name="person.3.sequence.fill"
                      size={80}
                      color="#22c55e"
                    />
                  </View>
                  <Text style={styles.noGroupTitle}>No Group Yet</Text>
                  <Text style={styles.noGroupDescription}>
                    You haven&apos;t joined a group yet. Create a new group or
                    join an existing one to get started.
                  </Text>
                  <View style={styles.noGroupActions}>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={openCreateModal}
                    >
                      <IconSymbol name="plus" size={20} color="#fff" />
                      <Text style={styles.createButtonText}>Create Group</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={openJoinModal}
                    >
                      <IconSymbol
                        name="paperplane.fill"
                        size={20}
                        color="#22c55e"
                      />
                      <Text style={styles.joinButtonText}>Join Group</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <IconSymbol
                      name="plus.circle.fill"
                      size={24}
                      color="#22c55e"
                    />
                    <Text style={styles.modalTitle}>Create New Group</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowCreateModal(false)}
                    style={styles.closeButton}
                  >
                    <IconSymbol name="xmark" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Group Name</Text>
                    <TextInput
                      style={styles.input}
                      value={groupName}
                      onChangeText={setGroupName}
                      placeholder="Enter group name"
                      placeholderTextColor="#9ca3af"
                      autoFocus={true}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      saving && styles.submitButtonDisabled,
                    ]}
                    onPress={handleCreateGroup}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <IconSymbol name="plus" size={16} color="#fff" />
                        <Text style={styles.submitButtonText}>
                          Create Group
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowJoinModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <IconSymbol
                      name="paperplane.fill"
                      size={24}
                      color="#22c55e"
                    />
                    <Text style={styles.modalTitle}>Join Group</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowJoinModal(false)}
                    style={styles.closeButton}
                  >
                    <IconSymbol name="xmark" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Group Code</Text>
                    <TextInput
                      style={styles.input}
                      value={groupCode}
                      onChangeText={setGroupCode}
                      placeholder="Enter group code"
                      placeholderTextColor="#9ca3af"
                      autoFocus={true}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      saving && styles.submitButtonDisabled,
                    ]}
                    onPress={handleJoinGroup}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <IconSymbol
                          name="paperplane.fill"
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.submitButtonText}>Join Group</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <IconSymbol name="pencil" size={24} color="#22c55e" />
                    <Text style={styles.modalTitle}>Edit Group</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowEditModal(false)}
                    style={styles.closeButton}
                  >
                    <IconSymbol name="xmark" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Group Name</Text>
                    <TextInput
                      style={styles.input}
                      value={groupName}
                      onChangeText={setGroupName}
                      placeholder="Enter group name"
                      placeholderTextColor="#9ca3af"
                      autoFocus={true}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      saving && styles.submitButtonDisabled,
                    ]}
                    onPress={handleUpdateGroup}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <IconSymbol name="checkmark" size={16} color="#fff" />
                        <Text style={styles.submitButtonText}>
                          Update Group
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <IconSymbol
                      name="person.badge.plus"
                      size={24}
                      color="#22c55e"
                    />
                    <Text style={styles.modalTitle}>Add Member</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowAddMemberModal(false)}
                    style={styles.closeButton}
                  >
                    <IconSymbol name="xmark" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalForm}>
                  <Text style={styles.inputLabel}>Available Students</Text>

                  {loadingStudents ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#22c55e" />
                      <Text style={styles.loadingText}>
                        Loading students...
                      </Text>
                    </View>
                  ) : availableStudents.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <IconSymbol
                        name="person.3.fill"
                        size={48}
                        color="#9ca3af"
                      />
                      <Text style={styles.noStudentsText}>
                        No students available to add to the group.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={availableStudents}
                      keyExtractor={(item) => item.id.toString()}
                      style={styles.studentsList}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.studentItem}
                          onPress={() => handleAddMember(item.id)}
                          disabled={saving}
                        >
                          <View style={styles.studentAvatar}>
                            <IconSymbol
                              name="person.fill"
                              size={16}
                              color="#22c55e"
                            />
                          </View>
                          <View style={styles.studentInfo}>
                            <Text style={styles.studentName}>{item.name}</Text>
                            <Text style={styles.studentEmail}>
                              {item.email}
                            </Text>
                          </View>
                          {saving ? (
                            <ActivityIndicator size="small" color="#22c55e" />
                          ) : (
                            <View style={styles.addStudentButton}>
                              <IconSymbol
                                name="plus"
                                size={16}
                                color="#22c55e"
                              />
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
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
    padding: 20,
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
  },
  groupContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  groupHeader: {
    marginBottom: 28,
  },
  groupTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  groupIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  groupTitleContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  groupCodeContainer: {
    alignSelf: "flex-start",
  },
  groupCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#22c55e",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  groupActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  editButtonText: {
    color: "#22c55e",
    fontWeight: "600",
    fontSize: 15,
  },
  leaveButtonText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 15,
  },
  groupDetails: {
    gap: 16,
    marginBottom: 32,
  },
  detailCard: {
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  detailValue: {
    fontSize: 16,
    color: "#1e293b",
    lineHeight: 24,
    fontWeight: "500",
  },
  membersSection: {
    marginTop: 8,
  },
  membersSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  membersSectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  addMemberButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  addMemberButtonText: {
    color: "#22c55e",
    fontWeight: "600",
    fontSize: 15,
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 4,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  memberRoleBadge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  memberRole: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "600",
  },
  removeMemberButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  noGroupContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  noGroupIcon: {
    marginBottom: 32,
    opacity: 0.8,
  },
  noGroupTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  noGroupDescription: {
    fontSize: 17,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 26,
    paddingHorizontal: 20,
    fontWeight: "500",
  },
  noGroupActions: {
    flexDirection: "row",
    gap: 16,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "600",
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: "#22c55e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButtonText: {
    color: "#22c55e",
    fontSize: 17,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    marginTop: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 28,
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
    marginBottom: 28,
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
  closeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  modalForm: {
    gap: 24,
  },
  inputContainer: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    backgroundColor: "#f8fafc",
    color: "#1e293b",
    fontWeight: "500",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "600",
  },
  emptyStateContainer: {
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  noStudentsText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
  studentsList: {
    maxHeight: 320,
  },
  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: "#64748b",
  },
  addStudentButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
});
