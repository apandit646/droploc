import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Linking,
  Animated,
  Dimensions,
  Image,
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
const carIcon = require("../assets/images/car_texi.png");

const { width } = Dimensions.get("window");

export default function ServiceH3Map() {
  const router = useRouter();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stompClient, setStompClient] = useState(null);
  const [requests, setRequests] = useState([]);
  const [email, setEmail] = useState(null);
  const [token, setToken] = useState(null);
  const [id, setId] = useState(null);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [messageQueue, setMessgeQueue] = useState([]);
  const actionSheetRef = useRef(null);

  const [notif_subscription, set_notif_subscription] = useState();

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const lottieRef = useRef(null);

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
    if (!token || !id) return;

    const socket = new SockJS(`http://${HOST}:${PORT}/ws-location`);
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log("WebSocket Debug:", str),
      onConnect: () => {
        console.log("✅ WebSocket Connected");
        setStompClient(client);

        if (!notif_subscription) {
          set_notif_subscription(
            client.subscribe(`/notification/${id}`, (message) => {
              const newMessage = JSON.parse(message.body);
              // alert(currentMessage);
              enqueueMessage(newMessage);
            })
          );
        }

        client.subscription = subscription;
      },
      onDisconnect: () => console.log("❌ WebSocket Disconnected"),
      onStompError: (frame) => console.error("❗ STOMP Error:", frame),
    });
    client.activate();

    return () => {
      if (notif_subscription) {
        notif_subscription.unsubscribe();
      }
      client.deactivate();
    };
  }, [token, id]);

  const enqueueMessage = (message) => {
    messageQueue.push(message);
    if (!currentMessage) {
      setCurrentMessage(message);
      RedrawActionSheet();
    }
  };

  const RedrawActionSheet = () => {
    actionSheetRef.current?.hide();

    setTimeout(() => {
      // Show ActionSheet with animations
      actionSheetRef.current?.show();
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);
    setTimeout(() => {
      hideCurrentMessage();
    }, 7000);
  };
  const hideCurrentMessage = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      actionSheetRef.current?.hide();
    });
  };

  const processRequestQueue = () => {
    if (messageQueue.length > 1) {
      setCurrentMessage({ ...messageQueue[1] });
      setMessgeQueue((q) => {
        const s = [...q];
        s.shift();
        return s;
      });
      RedrawActionSheet();
    } else {
      hideCurrentMessage();
      // setCurrentMessage(null);
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

  const handleCall = useCallback((phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  }, []);

  const handleAcceptRequest = (message) => {
    console.log("Processing request:", message);
    const phone_no = message.requestingUser.phoneNo;
    handleCall(phone_no);

    // Hide with animations
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      actionSheetRef.current?.hide();
      // setCurrentMessage(null);
    });
  };

  const declineCurrentRequest = () => {
    // setCurrentMessage(null);
    processRequestQueue();
    // displayNextMessage();
  };

  const handleBackButton = () => {
    closeConnection();
    SecureStore.deleteItemAsync("token");
    SecureStore.deleteItemAsync("email");
    router.push("/login");
  };

  function closeConnection() {
    stompClient.deactivate();
    console.log("Socket Disconnected ");
  }

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

        <ActionSheet
          ref={actionSheetRef}
          containerStyle={styles.actionSheetContainer}
          gestureEnabled={true}
          indicatorStyle={styles.actionSheetIndicator}
        >
          {currentMessage ? (
            <Animated.View
              style={[
                styles.messageContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              <View style={styles.notificationHeader}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{
                      uri:
                        currentMessage.requestingUser?.avatar ||
                        "https://via.placeholder.com/60",
                    }}
                    style={styles.avatar}
                    defaultSource={require("../assets/images/human.png")}
                  />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.messageTitle}>New Ride Request</Text>
                  <Text style={styles.timeAgo}>Just now</Text>
                </View>
              </View>

              {/* We would need to import Lottie */}
              {/* <LottieView
                ref={lottieRef}
                source={require('../assets/animations/notification.json')}
                style={styles.lottieAnimation}
                autoPlay={false}
                loop={false}
              /> */}

              <View style={styles.divider} />

              <View style={styles.detailsContainer}>
                <Icon
                  name="person"
                  size={20}
                  color="#4A6572"
                  style={styles.detailIcon}
                />
                <Text style={styles.detailLabel}>Passenger:</Text>
                <Text style={styles.detailValue}>
                  {currentMessage.requestingUser?.name || "Unknown"}
                </Text>
              </View>

              <View style={styles.detailsContainer}>
                <Icon
                  name="location-on"
                  size={20}
                  color="#4A6572"
                  style={styles.detailIcon}
                />
                <Text style={styles.detailLabel}>Destination:</Text>
                <Text style={styles.detailValue}>
                  {currentMessage.destinationLocation || "No destination"}
                </Text>
              </View>

              <View style={styles.detailsContainer}>
                <Icon
                  name="straighten"
                  size={20}
                  color="#4A6572"
                  style={styles.detailIcon}
                />
                <Text style={styles.detailLabel}>Distance:</Text>
                <Text style={styles.detailValue}>
                  {currentMessage.distanceToPickUp?.toFixed(2) || "Unknown"} km
                </Text>
              </View>

              <View style={styles.detailsContainer}>
                <Icon
                  name="attach-money"
                  size={20}
                  color="#4A6572"
                  style={styles.detailIcon}
                />
                <Text style={styles.detailLabel}>Fare:</Text>
                <Text style={styles.detailValue}>
                  ${currentMessage.estimatedFare?.toFixed(2) || "TBD"}
                </Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => {
                    declineCurrentRequest();
                  }}
                >
                  <Icon name="close" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptRequest(currentMessage)}
                >
                  <Icon name="check" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
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
    backgroundColor: "#2c2c2e",
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
  map: {
    flex: 4,
    width: "100%",
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
    paddingTop: StatusBar.currentHeight,
    padding: 20,
    backgroundColor: "#2c2c2e",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
  },
  // New or improved styles
  actionSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#f8f9fa",
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  actionSheetIndicator: {
    width: 60,
    height: 6,
    backgroundColor: "#d1d1d6",
    borderRadius: 3,
    marginTop: 8,
  },
  messageContainer: {
    padding: 20,
    width: "100%",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e1e4e8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  headerTextContainer: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  timeAgo: {
    fontSize: 14,
    color: "#8e8e93",
  },
  lottieAnimation: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 15,
    width: "100%",
  },
  detailsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4A6572",
    width: 90,
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  declineButton: {
    backgroundColor: "#ff3b30",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ff3b30",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
  },
  messageText: {
    fontSize: 16,
    color: "#8e8e93",
    textAlign: "center",
    padding: 30,
  },
});
