import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";

// Define the Group interface for type checking
interface Group {
  id: string;
  name: string;
  group_code: string;
  status: string;
  leader_id: string;
  adviser: string;
  description: string;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Group>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { authenticatedFetch } = useAuth();
  const router = useRouter();

  // Fetch groups from the API
  useEffect(() => {
    let isMounted = true;

    const fetchGroups = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch("/api/groups");

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message || `HTTP error! Status: ${response.status}`
          );
        }

        const data = await response.json();
        if (isMounted) {
          setGroups(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch groups. Please check your connection and API endpoint."
          );
          console.error("Error fetching groups:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGroups();

    return () => {
      isMounted = false;
    };
  }, [authenticatedFetch]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await authenticatedFetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(Array.isArray(data) ? data : []);
        setError(null);
      }
    } catch (err) {
      console.error("Error refreshing groups:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Sort groups based on the current sort key and direction
  const sortedGroups = [...groups].sort((a, b) => {
    return sortDirection === "asc"
      ? String(a[sortKey]).localeCompare(String(b[sortKey]))
      : String(b[sortKey]).localeCompare(String(a[sortKey]));
  });

  // Handle sorting when a sort button is pressed
  const handleSort = (key: keyof Group) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Render a sort indicator arrow based on current sort state
  const renderSortIndicator = (key: keyof Group) => {
    if (sortKey === key) {
      return sortDirection === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  // Get status style based on status value
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
          borderColor: "#bbf7d0",
        };
      case "inactive":
        return {
          backgroundColor: "#fef2f2",
          color: "#dc2626",
          borderColor: "#fecaca",
        };
      case "pending":
        return {
          backgroundColor: "#fef3c7",
          color: "#d97706",
          borderColor: "#fde68a",
        };
      default:
        return {
          backgroundColor: "#f3f4f6",
          color: "#6b7280",
          borderColor: "#e5e7eb",
        };
    }
  };

  // Get status icon based on status
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "●";
      case "inactive":
        return "●";
      case "pending":
        return "●";
      default:
        return "●";
    }
  };

  // Group Card Component
  const GroupCard = ({ item, index }: { item: Group; index: number }) => {
    const animatedValue = new Animated.Value(0);
    const statusStyle = getStatusStyle(item.status);

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
          styles.groupCard,
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
          onPress={() => router.push(`/group/${item.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.groupName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.groupCode}>#{item.group_code}</Text>
            </View>
            <View style={[styles.statusBadge, statusStyle]}>
              <Text style={[styles.statusIcon, { color: statusStyle.color }]}>
                {getStatusIcon(item.status)}
              </Text>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {item.status}
              </Text>
            </View>
          </View>

          <Text style={styles.groupDescription} numberOfLines={3}>
            {item.description && item.description.length > 0
              ? item.description
              : "No description available"}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.advisorInfo}>
              <Text style={styles.advisorLabel}>Advisor:</Text>
              <Text style={styles.advisorName}>
                {item.adviser || "Not assigned"}
              </Text>
            </View>
          </View>

          <View style={styles.cardIndicator} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render group card
  const renderGroupCard = ({ item, index }: { item: Group; index: number }) => (
    <GroupCard item={item} index={index} />
  );

  // Render sort controls
  const renderSortControls = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      <View style={styles.sortButtons}>
        <TouchableOpacity
          style={[
            styles.sortButton,
            sortKey === "name" && styles.sortButtonActive,
          ]}
          onPress={() => handleSort("name")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortKey === "name" && styles.sortButtonTextActive,
            ]}
          >
            Name{renderSortIndicator("name")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortButton,
            sortKey === "status" && styles.sortButtonActive,
          ]}
          onPress={() => handleSort("status")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortKey === "status" && styles.sortButtonTextActive,
            ]}
          >
            Status{renderSortIndicator("status")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      </View>
    );
  }

  // Main render - the groups list
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <Text style={styles.subtitle}>
          {groups.length} {groups.length === 1 ? "group" : "groups"}
        </Text>
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noGroupsText}>No groups found</Text>
          <Text style={styles.noGroupsSubtext}>
            Groups will appear here when available
          </Text>
        </View>
      ) : (
        <>
          {renderSortControls()}
          <FlatList
            data={sortedGroups}
            renderItem={renderGroupCard}
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
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
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
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
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
  groupCard: {
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
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
    lineHeight: 24,
  },
  groupCode: {
    fontSize: 14,
    fontWeight: "600",
    color: "#22c55e",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusIcon: {
    fontSize: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  groupDescription: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  advisorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  advisorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  advisorName: {
    fontSize: 14,
    color: "#64748b",
  },
  cardIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#22c55e",
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
  noGroupsText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    marginBottom: 8,
  },
  noGroupsSubtext: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
  },
});
