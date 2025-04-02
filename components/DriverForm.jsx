import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { HOST, PORT } from "./API";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const DriverForm = () => {
  const [userData, setUserData] = useState({
    email: null,
    name: null,
    phoneNo: null,
    vehicleType: null,
    vehicleNo: null,
    vehicleModel: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableVehicleInfo, setEditableVehicleInfo] = useState({
    vehicleType: "",
    vehicleNo: "",
    vehicleModel: "",
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const router = useRouter();
  const isMountedRef = useRef(true);

  const handleMain = () => {
    router.push("/service");
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const storedToken = await SecureStore.getItemAsync("token");
      const storedEmail = await SecureStore.getItemAsync("email");

      if (!storedToken) {
        setError("No token found, please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `http://${HOST}:${PORT}/api/v1/service-provider/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();

      if (isMountedRef.current) {
        setUserData({
          email: storedEmail,
          name: data.response.name,
          phoneNo: data.response.phoneNo,
          vehicleType: data.response.vehicleType,
          vehicleNo: data.response.vehicleNo,
          vehicleModel: data.response.vehicleModel,
        });
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      if (isMountedRef.current) {
        setError("Failed to load profile. Please try again.");
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchUserData();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleEditVehicleInfo = () => {
    setEditableVehicleInfo({
      vehicleType: userData.vehicleType || "",
      vehicleNo: userData.vehicleNo || "",
      vehicleModel: userData.vehicleModel || "",
    });
    setIsEditing(true);
  };

  const handleUpdateVehicleInfo = async () => {
    try {
      setUpdateLoading(true);

      const storedToken = await SecureStore.getItemAsync("token");

      if (!storedToken) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please log in again."
        );
        setUpdateLoading(false);
        return;
      }

      const response = await fetch(
        `http://${HOST}:${PORT}/api/v1/service-provider/vehicle-info`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${storedToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vehicleType: editableVehicleInfo.vehicleType,
            vehicleNo: editableVehicleInfo.vehicleNo,
            vehicleModel: editableVehicleInfo.vehicleModel,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update vehicle information");
      }

      // Update local state with the new vehicle info
      setUserData({
        ...userData,
        vehicleType: editableVehicleInfo.vehicleType,
        vehicleNo: editableVehicleInfo.vehicleNo,
        vehicleModel: editableVehicleInfo.vehicleModel,
      });

      // Close the edit modal
      setIsEditing(false);
      setUpdateLoading(false);

      // Show success message
      Alert.alert("Success", "Vehicle information updated successfully");

      // Refresh user data to ensure everything is updated
      fetchUserData();
    } catch (error) {
      console.error("Error updating vehicle information:", error);
      setUpdateLoading(false);
      Alert.alert(
        "Error",
        "Failed to update vehicle information. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5D7AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#FF5D5D" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            fetchUserData();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.homeButton} onPress={handleMain}>
        <Ionicons name="home" size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(userData.name)}</Text>
          </View>
        </View>

        <Text style={styles.name}>{userData.name || "Add your name"}</Text>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons
              name="mail"
              size={22}
              color="#5D7AFF"
              style={styles.infoIcon}
            />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoText}>
                {userData.email || "Not available"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Ionicons
              name="call"
              size={22}
              color="#5D7AFF"
              style={styles.infoIcon}
            />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoText}>
                {userData.phoneNo || "Add phone number"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditVehicleInfo}
            >
              <Ionicons name="pencil" size={18} color="white" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {userData.vehicleType ? (
            <View style={styles.infoItem}>
              <Ionicons
                name="car"
                size={22}
                color="#5D7AFF"
                style={styles.infoIcon}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Vehicle Type</Text>
                <Text style={styles.infoText}>{userData.vehicleType}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.infoItem}>
              <Ionicons
                name="car"
                size={22}
                color="#999"
                style={styles.infoIcon}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Vehicle Type</Text>
                <Text style={styles.infoTextEmpty}>Not specified</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {userData.vehicleModel ? (
            <View style={styles.infoItem}>
              <Ionicons
                name="information-circle"
                size={22}
                color="#5D7AFF"
                style={styles.infoIcon}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Vehicle Model</Text>
                <Text style={styles.infoText}>{userData.vehicleModel}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.infoItem}>
              <Ionicons
                name="information-circle"
                size={22}
                color="#999"
                style={styles.infoIcon}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Vehicle Model</Text>
                <Text style={styles.infoTextEmpty}>Not specified</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {userData.vehicleNo ? (
            <View style={styles.infoItem}>
              <Ionicons
                name="card"
                size={22}
                color="#5D7AFF"
                style={styles.infoIcon}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Vehicle Number</Text>
                <Text style={styles.infoText}>{userData.vehicleNo}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.infoItem}>
              <Ionicons
                name="card"
                size={22}
                color="#999"
                style={styles.infoIcon}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Vehicle Number</Text>
                <Text style={styles.infoTextEmpty}>Not specified</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Edit Vehicle Information Modal */}
      <Modal
        visible={isEditing}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Vehicle Information</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsEditing(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Vehicle Type</Text>
              <TextInput
                style={styles.input}
                value={editableVehicleInfo.vehicleType}
                onChangeText={(text) =>
                  setEditableVehicleInfo({
                    ...editableVehicleInfo,
                    vehicleType: text,
                  })
                }
                placeholder="e.g., Car, Bike, Van"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Vehicle Model</Text>
              <TextInput
                style={styles.input}
                value={editableVehicleInfo.vehicleModel}
                onChangeText={(text) =>
                  setEditableVehicleInfo({
                    ...editableVehicleInfo,
                    vehicleModel: text,
                  })
                }
                placeholder="e.g., Toyota Camry, Honda Accord"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Vehicle Number</Text>
              <TextInput
                style={styles.input}
                value={editableVehicleInfo.vehicleNo}
                onChangeText={(text) =>
                  setEditableVehicleInfo({
                    ...editableVehicleInfo,
                    vehicleNo: text,
                  })
                }
                placeholder="e.g., ABC123"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateVehicleInfo}
              disabled={updateLoading}
            >
              {updateLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(51, 51, 51, 0.8)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  homeText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#333",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
  },
  loadingText: {
    marginTop: 15,
    color: "#fff",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 20,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#5D7AFF",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  profileCard: {
    margin: 20,
    marginTop: 100,
    backgroundColor: "#333",
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#5D7AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#5D7AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  infoSection: {
    width: "100%",
    backgroundColor: "#262626",
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5D7AFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  editButtonText: {
    color: "#fff",
    marginLeft: 5,
    fontSize: 14,
    fontWeight: "bold",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoIcon: {
    marginRight: 15,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  infoText: {
    fontSize: 16,
    color: "#fff",
  },
  infoTextEmpty: {
    fontSize: 16,
    color: "#777",
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: "#4a4a4a",
    width: "100%",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#333",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    padding: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#262626",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#4a4a4a",
  },
  saveButton: {
    backgroundColor: "#5D7AFF",
    borderRadius: 8,
    padding: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default DriverForm;
