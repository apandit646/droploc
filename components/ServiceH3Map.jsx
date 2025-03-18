import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { HOST, PORT } from "./API";
import ActionSheet from "react-native-actions-sheet";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

export default function ServiceH3Map() {
  const router = useRouter();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stompClient, setStompClient] = useState(null);
  const [requests, setRequests] = useState([]);
  const carIcon = require("../assets/images/car_texi.png");
  const [email, setEmail] = useState(null);
  const [token, setToken] = useState(null);
  const [id, setId] = useState(null);
  const [currentMessage, setCurrentMessage] = useState(null);
  const messageQueue = useRef([]);
  const actionSheetRef = useRef(null);

  // Use ref to store location subscription for cleanup
  const locationSubscriptionRef = useRef(null);

  useEffect(() => {
    const fetchAuthData = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("token");
        const storedEmail = await SecureStore.getItemAsync("email");
        const storedId = await SecureStore.getItemAsync("id");
        if (!storedToken || !storedEmail) {
          console.error("❌ No token or email found");
          return;
        }
        setEmail(storedEmail);
        setToken(storedToken);
        setId(storedId);
      } catch (error) {
        console.error("❌ Error fetching auth data:", error);
      }
    };

    // Setup real-time location tracking
    const setupLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("❌ Permission to access location was denied");
          setLoading(false);
          return;
        }

        // Get initial location
        const currentLocation = await Location.getCurrentPositionAsync({});
        console.log("Setting initial location:", currentLocation);
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        // Start continuous location updates
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5, // Update if device moves by 5 meters
            timeInterval: 3000, // Update every 3 seconds
          },
          (newLocation) => {
            console.log("📍 Location updated:", newLocation.coords);
            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            });
          }
        );

        // Store the subscription in the ref for cleanup
        locationSubscriptionRef.current = subscription;
        setLoading(false);
      } catch (error) {
        console.error("❌ Error setting up location tracking:", error);
        setLoading(false);
      }
    };

    fetchAuthData();
    setupLocationTracking();

    // Dummy request data
    setRequests([
      { id: 1, name: "John Doe", address: "123 Main St" },
      { id: 2, name: "Alice Smith", address: "456 Oak St" },
    ]);

    // Clean up the location subscription on component unmount
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        console.log("🧹 Location tracking subscription removed");
      }
    };
  }, []);

  useEffect(() => {
    if (!email || !token || !id) return;

    const socket = new SockJS(`http://${HOST}:${PORT}/ws-location`);
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log("WebSocket Debug:", str),
      onConnect: () => {
        console.log("✅ WebSocket Connected");
        setStompClient(client);

        const destination = `/notification/${id}`;
        const subscription = client.subscribe(destination, (message) => {
          const newMessage = JSON.parse(message.body);
          console.log(`📬 Notification from ${destination}:`, newMessage);
          enqueueMessage(newMessage);
        });
        client.subscription = subscription;
      },
      onDisconnect: () => console.log("❌ WebSocket Disconnected"),
      onStompError: (frame) => console.error("❗ STOMP Error:", frame),
    });
    client.activate();

    return () => {
      if (client && client.subscription) {
        client.subscription.unsubscribe();
        console.log("🔄 Unsubscribed from notifications");
      }
      client.deactivate();
    };
  }, [email, token, id]);

  const enqueueMessage = (message) => {
    messageQueue.current.push(message);
    if (!currentMessage) {
      displayNextMessage();
    }
  };

  const displayNextMessage = () => {
    if (messageQueue.current.length > 0) {
      const nextMessage = messageQueue.current.shift();
      setCurrentMessage(nextMessage);
      actionSheetRef.current?.show();
      setTimeout(() => {
        actionSheetRef.current?.hide();
        setCurrentMessage(null);
        displayNextMessage();
      }, 7000);
    }
  };

  // Enhanced with useCallback for better performance
  const sendLocationUpdate = React.useCallback(() => {
    if (stompClient && stompClient.connected && location && token) {
      const message = {
        token: token,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      };
      stompClient.publish({
        destination: "/app/update-location",
        body: JSON.stringify(message),
      });
      console.log("📤 Sent location update:", message);
    } else {
      console.log("⚠️ Cannot send location update: Missing required data");
      if (!stompClient) console.log("   - StompClient not initialized");
      else if (!stompClient.connected)
        console.log("   - StompClient not connected");
      if (!location) console.log("   - Location not available");
      if (!token) console.log("   - Token not available");
    }
  }, [stompClient, location, token]);

  useEffect(() => {
    if (stompClient && stompClient.connected && location) {
      // Send immediate update when location changes
      sendLocationUpdate();

      // Setup interval for regular updates
      const interval = setInterval(sendLocationUpdate, 3000);
      return () => clearInterval(interval);
    }
  }, [stompClient, location, sendLocationUpdate]);

  const handleAcceptRequest = (message) => {
    console.log("Processing request:", message);
    actionSheetRef.current?.hide();
    setCurrentMessage(null);
    // Add your logic to process the request
    // Example: Send the request to the backend or update state
  };
  const handleBackButton = () => {
    router.push("/login");
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <StatusBar backgroundColor="#2c2c2e" barStyle="light-content" />
        {/* Navbar */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => handleBackButton()}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>DropDown</Text>
          </View>
        </View>

        {/* Map Section */}
        <MapView
          style={styles.map}
          region={{
            latitude: location?.latitude || 0,
            longitude: location?.longitude || 0,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="Your Location"
              image={carIcon}
            />
          )}
        </MapView>

        <ActionSheet ref={actionSheetRef}>
          {currentMessage ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageTitle}>New Request</Text>
              <Text style={styles.messageText}>
                {currentMessage.requestingUser?.name || "Unknown"} -{" "}
                {currentMessage.destinationLocation || "No destination"}
              </Text>
              <Text style={styles.messageText}>
                Distance:{" "}
                {currentMessage.distanceToPickUp?.toFixed(2) || "Unknown"} km
              </Text>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptRequest(currentMessage)}
              >
                <Text style={styles.buttonText}>Accept Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.messageText}>No messages</Text>
          )}
        </ActionSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#2c2c2e", // Match the header background color
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
  },
  container: {
    flex: 1,
    backgroundColor: "#1c1c1e",
  },
  navbar: {
    height: 60,
    backgroundColor: "#2c2c2e",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  navTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  map: {
    flex: 4,
    width: "100%",
  },
  bottomContainer: {
    flex: 2,
    backgroundColor: "#2c2c2e",
    padding: 10,
  },
  headerText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: StatusBar.currentHeight, // Add this line
    padding: 20,
    backgroundColor: "#2c2c2e",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  requestItem: {
    backgroundColor: "#3a3a3c",
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
  },
  requestText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  addressText: {
    color: "#bbb",
    fontSize: 14,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignSelf: "flex-end",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
  },
  messageContainer: {
    padding: 20,
    alignItems: "center",
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  messageText: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 8,
  },
});
