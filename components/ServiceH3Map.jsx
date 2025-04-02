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
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { HOST, PORT } from "./API";
import ActionSheet from "react-native-actions-sheet";
import Icon from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
const carIcon = require("../assets/images/car_texi.png");

const { width, height } = Dimensions.get("window");

export default function ServiceH3Map() {
  const router = useRouter();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stompClient, setStompClient] = useState(null);
  const [requests, setRequests] = useState([]);
  const [email, setEmail] = useState(null);
  const [token, setToken] = useState(null);
  const [id, setId] = useState(null);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const [currentMessage, setCurrentMessage] = useState(null);
  const [messageQueue, setMessgeQueue] = useState([]);
  const actionSheetRef = useRef(null);
  const stateRef = useRef(currentMessage);

  const [notif_subscription, set_notif_subscription] = useState();

  const [socket] = useState(new SockJS(`http://${HOST}:${PORT}/ws-location`));
  const [client, setClient] = useState(null);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const lottieRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sideMenuAnim = useRef(new Animated.Value(-width)).current;

  // Use ref to store location subscription for cleanup
  const locationSubscriptionRef = useRef(null);

  // stateRef.current = currentMessage;

  useEffect(() => {
    stateRef.current = currentMessage; // Update ref whenever messages change
  }, [currentMessage]);

  useEffect(() => {
    if (!socket || !token || !id) return;

    const cb = (message) => {
      const newMessage = JSON.parse(message.body);
      enqueueMessage(newMessage);
    };

    if (socket) {
      const client = new Client({
        webSocketFactory: () => socket,
        debug: (str) => console.log("WebSocket Debug:", str),
        onConnect: function () {
          console.log("✅ WebSocket Connected");
          setStompClient(client);

          if (!notif_subscription) {
            set_notif_subscription(
              client.subscribe(`/notification/${id}`, (m) => cb(m))
            );
          }
          client.subscription = subscription;
        },
        onDisconnect: () => console.log("❌ WebSocket Disconnected"),
        onStompError: (frame) => console.error("❗ STOMP Error:", frame),
      });
      client.activate();
      setClient(client);
    }

    return () => {
      if (notif_subscription) {
        notif_subscription.unsubscribe();
      }
      client?.deactivate();
    };
  }, [socket, token, id]);

  // Start pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const toggleSideMenu = () => {
    if (showSideMenu) {
      Animated.timing(sideMenuAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowSideMenu(false));
    } else {
      setShowSideMenu(true);
      Animated.timing(sideMenuAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

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

    // Setup real-time location
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

  function enqueueMessage(message) {
    // messageQueue.push(message);
    setMessgeQueue((prevQueue) => [...prevQueue, message]);
    // alert(stateRef.current);
    if (!stateRef.current) {
      setCurrentMessage(message);
      RedrawActionSheet();
    }
  }

  const RedrawActionSheet = () => {
    // check again in logic
    // actionSheetRef.current?.hide();

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
      processRequestQueue();
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
    setMessgeQueue((prevQueue) => {
      if (prevQueue.length > 1) {
        const updatedQueue = [...prevQueue];
        updatedQueue.shift();
        setCurrentMessage(updatedQueue[0]); // Update the current message
        RedrawActionSheet();
        return updatedQueue;
      } else {
        setCurrentMessage(null); // Clear the current message
        return [];
      }
    });
  };

  // const processRequestQueue = () => {
  //   if (messageQueue.length > 1) {
  //     setCurrentMessage({ ...messageQueue[1] });
  //     setMessgeQueue((q) => {
  //       const s = [...q];
  //       s.shift();
  //       return s;
  //     });
  //     RedrawActionSheet();
  //   } else {
  //     hideCurrentMessage();
  //   }
  // };

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
    });
  };

  const declineCurrentRequest = () => {
    processRequestQueue();
  };

  const handleBackButton = () => {
    closeConnection();
    SecureStore.deleteItemAsync("token");
    SecureStore.deleteItemAsync("email");
    router.push("/login");
  };

  const handleLogout = () => {
    toggleSideMenu();
    handleBackButton();
  };

  function closeConnection() {
    stompClient.deactivate();
    console.log("Socket Disconnected ");
  }

  if (loading) {
    return (
      <LinearGradient
        colors={["#0f0c29", "#302b63", "#24243e"]}
        style={styles.loader}
      >
        <ActivityIndicator size="large" color="#00d4ff" />
        <Text style={styles.loadingText}>Connecting to H3 Network...</Text>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#0f0c29", "#302b63"]}
        style={styles.background}
      />
      <View style={styles.container}>
        <StatusBar backgroundColor="#0f0c29" barStyle="light-content" />

        {/* Side Menu Overlay */}
        {showSideMenu && (
          <TouchableWithoutFeedback onPress={toggleSideMenu}>
            <View style={styles.sideMenuOverlay} />
          </TouchableWithoutFeedback>
        )}

        {/* Side Menu */}
        <Animated.View
          style={[
            styles.sideMenu,
            {
              transform: [{ translateX: sideMenuAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["#1E1E1E", "#1E1E1E"]}
            style={styles.sideMenuGradient}
          >
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <Icon name="account-circle" size={60} color="#4ECDC4" />
              <Text style={styles.profileName}>User Name</Text>
              <Text style={styles.profileEmail}>{email || "Driver"}</Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  toggleSideMenu();
                  router.push("/driver");
                }}
              >
                <Icon name="person" size={24} color="white" />
                <Text style={styles.menuItemText}>My Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                // onPress={() => {
                //   toggleSideMenu();
                //   router.push("/settings");
                // }}
              >
                <Icon name="settings" size={24} color="white" />
                <Text style={styles.menuItemText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                // onPress={() => {
                //   toggleSideMenu();
                //   router.push("/earnings");
                // }}
              >
                <Icon name="attach-money" size={24} color="white" />
                <Text style={styles.menuItemText}>Earnings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                // onPress={() => {
                //   toggleSideMenu();
                //   router.push("/history");
                // }}
              >
                <Icon name="history" size={24} color="white" />
                <Text style={styles.menuItemText}>Ride History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                // onPress={() => {
                //   toggleSideMenu();
                //   router.push("/support");
                // }}
              >
                <Icon name="help" size={24} color="white" />
                <Text style={styles.menuItemText}>Help & Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Icon name="logout" size={24} color="white" />
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
          </LinearGradient>
        </Animated.View>

        {/* Enhanced Navigation Bar */}
        <LinearGradient
          colors={["rgba(10,10,20,0.95)", "rgba(25,25,40,0.95)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            {/* Menu Button */}
            <TouchableOpacity
              onPress={toggleSideMenu}
              style={styles.menuButton}
              activeOpacity={0.7}
            >
              <Icon name="account-circle" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Center Title */}
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerSubtitle}>DropDown Driver Console</Text>
              <View style={styles.statusIndicator}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: stompClient?.connected
                        ? "#00ff9d"
                        : "#ff3b30",
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {stompClient?.connected ? "LIVE" : "OFFLINE"}
                </Text>
              </View>
            </View>

            {/* Notification Button */}
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.7}
            >
              <Icon name="notifications" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Map Section with Glass Effect */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={{
              latitude: location?.latitude || 0,
              longitude: location?.longitude || 0,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            customMapStyle={mapStyle}
          >
            {location && (
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="Your Location"
                image={carIcon}
              >
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <View style={styles.pulseCircle} />
                </Animated.View>
              </Marker>
            )}
          </MapView>
          <View style={styles.mapOverlay} />
        </View>

        {/* Futuristic Action Sheet */}
        <ActionSheet
          ref={actionSheetRef}
          containerStyle={styles.actionSheetContainer}
          gestureEnabled={true}
          indicatorStyle={styles.actionSheetIndicator}
          defaultOverlayOpacity={0.7}
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
              <LinearGradient
                colors={["#1E1E1E", "#1E1E1E"]}
                style={styles.messageGradient}
              >
                <View style={styles.notificationHeader}>
                  <Animated.View
                    style={[
                      styles.avatarContainer,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    <Icon name="account-circle" size={60} color="#4ECDC4" />
                    <View style={styles.onlineIndicator} />
                  </Animated.View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.messageTitle}>NEW RIDE REQUEST</Text>
                    <Text style={styles.timeAgo}>JUST NOW</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsContainer}>
                  <Icon
                    name="person"
                    size={20}
                    color="#00d4ff"
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailLabel}>PASSENGER:</Text>
                  <Text style={styles.detailValue}>
                    {currentMessage.requestingUser?.name || "UNKNOWN"}
                  </Text>
                </View>

                <View style={styles.detailsContainer}>
                  <Icon
                    name="location-on"
                    size={20}
                    color="#00d4ff"
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailLabel}>LOCATION:</Text>
                  <Text style={styles.detailValue}>
                    {currentMessage.destinationLocation || "NO DESTINATION"}
                  </Text>
                </View>

                <View style={styles.detailsContainer}>
                  <Icon
                    name="straighten"
                    size={20}
                    color="#00d4ff"
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailLabel}>DISTANCE:</Text>
                  <Text style={styles.detailValue}>
                    {currentMessage.distanceToPickUp?.toFixed(2) || "UNKNOWN"}{" "}
                    KM
                  </Text>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => {
                      declineCurrentRequest();
                    }}
                  >
                    <LinearGradient
                      colors={["#E0115F", "#E0115F"]}
                      style={styles.buttonGradient}
                    >
                      <Icon name="close" size={20} color="#fff" />
                      <Text style={styles.buttonText}>DECLINE</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(currentMessage)}
                  >
                    <LinearGradient
                      colors={["#00b09b", "#00b09b"]}
                      style={styles.buttonGradient}
                    >
                      <Icon name="check" size={20} color="#fff" />
                      <Text style={styles.buttonText}>ACCEPT</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          ) : (
            <View style={styles.noMessageContainer}>
              <Text style={styles.noMessageText}>NO ACTIVE REQUESTS</Text>
            </View>
          )}
        </ActionSheet>
      </View>
    </SafeAreaView>
  );
}

// Futuristic map styling
const mapStyle = [
  {
    elementType: "geometry",
    stylers: [
      {
        color: "#212121",
      },
    ],
  },
  {
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#212121",
      },
    ],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [
      {
        color: "#2c2c2c",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#8a8a8a",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#373737",
      },
    ],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [
      {
        color: "#373737",
      },
    ],
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [
      {
        color: "#373737",
      },
    ],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#000000",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#3d3d3d",
      },
    ],
  },
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  mapContainer: {
    flex: 1,
    width: "100%",
    position: "relative",
  },
  map: {
    flex: 1,
    width: "100%",
  },
  mapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,12,41,0.3)",
    pointerEvents: "none",
  },
  sideMenuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  sideMenu: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.75,
    zIndex: 20,
    shadowColor: "#00d4ff",
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  sideMenuGradient: {
    flex: 1,
    paddingTop: StatusBar.currentHeight + 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#00d4ff",
    marginBottom: 15,
  },
  profileName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  profileEmail: {
    color: "#bbb",
    fontSize: 14,
    marginTop: 5,
    paddingBottom: 15,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
  },
  menuItems: {
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  menuItemText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 15,
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: 20,
  },
  logoutText: {
    color: "white",
    fontSize: 16,
    marginLeft: 15,
    fontWeight: "500",
  },
  header: {
    paddingTop: StatusBar.currentHeight + 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,212,255,0.15)",
    shadowColor: "#00d4ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 15,
  },
  headerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "sans-serif-condensed",
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  statusBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 5,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 15,
  },
  statusBarText: {
    color: "rgba(0,212,255,0.7)",
    fontSize: 12,
    marginLeft: 3,
    fontFamily: "monospace",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  // Pulsing marker effect
  pulseCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,212,255,0.3)",
    position: "absolute",
    top: -5,
    left: -5,
  },
  // Action Sheet Styles
  actionSheetContainer: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: "transparent",
    paddingBottom: 30,
    overflow: "hidden",
  },
  actionSheetIndicator: {
    width: 60,
    height: 6,
    backgroundColor: "#00d4ff",
    borderRadius: 3,
    marginTop: 8,
  },
  messageContainer: {
    padding: 0,
    width: "100%",
    borderRadius: 25,
    overflow: "hidden",
  },
  messageGradient: {
    padding: 25,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    justifyContent: "space-between",
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00d4ff",
    position: "relative",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: "#00ff9d",
    borderWidth: 2,
    borderColor: "#1a1a2e",
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00d4ff",
    marginBottom: 5,
    letterSpacing: 1,
  },
  timeAgo: {
    fontSize: 12,
    color: "#8ec3b9",
    letterSpacing: 1,
  },
  priorityBadge: {
    backgroundColor: "#ff3b30",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  detailsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#8ec3b9",
    width: 110,
    letterSpacing: 1,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
  },
  acceptButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 25,
    overflow: "hidden",
  },
  declineButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 25,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
    letterSpacing: 1,
  },
  noMessageContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,12,41,0.9)",
  },
  noMessageText: {
    fontSize: 16,
    color: "#8ec3b9",
    letterSpacing: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 20,
    letterSpacing: 1,
  },
});
