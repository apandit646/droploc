import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { HOST, PORT } from "./API";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons"; // Make sure to install expo/vector-icons
import { useRouter } from "expo-router";

const UserProfile = () => {
  const [userData, setUserData] = useState({
    email: null,
    name: null,
    phoneNo: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handlemain = () => {
    router.push("/map");
  };

  useEffect(() => {
    let isMounted = true;

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
          `http://${HOST}:${PORT}/api/v1/user/profile`,
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

        if (isMounted) {
          setUserData({
            email: storedEmail,
            name: data.response.name,
            phoneNo: data.response.phoneNo,
          });
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        if (isMounted) {
          setError("Failed to load profile. Please try again.");
          setLoading(false);
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
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
        <TouchableOpacity style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.homeButton} onPress={handlemain}>
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
        </View>
      </View>
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
  divider: {
    height: 1,
    backgroundColor: "#4a4a4a",
    width: "100%",
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: "#5D7AFF",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: "#FF5D5D",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
});

export default UserProfile;
