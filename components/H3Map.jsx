import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Linking,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  SafeAreaView,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { HOST, PORT } from "./API";
import axios from "axios";
import { CountdownCircleTimer } from "react-native-countdown-circle-timer";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function H3Map() {
  const carIcon = require("../assets/images/car_texi.png");
  const humanIcon = require("../assets/images/human.png");

  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [providerLoc, setProviderLoc] = useState([]);
  const [location, setLocation] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const [cellAddress, setCellAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addressInput, setAddressInput] = useState("");
  const [statuses, setStatues] = useState({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: "User Name",
    email: "user@example.com",
  });
  const router = useRouter();

  const slideAnim = useRef(new Animated.Value(-300)).current;
  const windowHeight = Dimensions.get("window").height;

  // Use refs to store subscriptions for cleanup
  const locationSubscriptionRef = useRef(null);
  const cellAddressCheckerRef = useRef(null);

  function closeConnection() {
    stompClient.deactivate();
    console.log("Socket Disconnected ");
  }

  useEffect(() => {
    if (showDropdown) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showDropdown]);

  useEffect(() => {
    const fetchAuthData = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("token");
        const storedEmail = await SecureStore.getItemAsync("email");
        if (!storedToken || !storedEmail) {
          console.error("❌ No token or email found");
          return;
        }
        setToken(storedToken);
        setEmail(storedEmail);
        setUserProfile((prev) => ({ ...prev, email: storedEmail }));
      } catch (error) {
        console.error("❌ Error fetching auth data:", error);
      }
    };

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
        // console.log("Setting initial location:", currentLocation);
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        // Start continuous location updates
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (newLocation) => {
            // console.log("📍 Location updated:", newLocation.coords);
            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            });
            setLoading(false);
          }
        );

        locationSubscriptionRef.current = subscription;
      } catch (error) {
        console.error("❌ Error setting up location tracking:", error);
        setLoading(false);
      }
    };

    fetchAuthData();
    setupLocationTracking();

    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
      if (cellAddressCheckerRef.current) {
        clearInterval(cellAddressCheckerRef.current);
      }
    };
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    const socket = new SockJS(`http://${HOST}:${PORT}/ws-location`);
    const client = new Client({
      webSocketFactory: () => socket,
      // debug: (str) => console.log("WebSocket Debug:", str),
      onConnect: () => {
        // console.log("✅ WebSocket Connected");
        setStompClient(client);
      },
      onDisconnect: () => console.log("❌ WebSocket Disconnected"),
    });

    client.activate();

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, []);

  // Fetch cell address when location changes
  useEffect(() => {
    if (location && token) {
      // console.log("⏳ Fetching cell address for location:", location);
      axios
        .get(
          `http://${HOST}:${PORT}/api/v1/util?lat=${location.latitude}&lon=${location.longitude}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((response) => {
          // console.log("✅ Cell address response:", response.data);
          if (response.data !== cellAddress) {
            // console.log(
            //   "🔄 Cell address changed from",
            //   cellAddress,
            //   "to",
            //   response.data
            // );
            setCellAddress(response.data);
          }
        })
        .catch((error) => {
          console.error("❌ Error getting cell address:", error);
        });
    }
  }, [location, token]);

  // Subscribe to WebSocket updates for the current cell
  useEffect(() => {
    if (stompClient && stompClient.connected && cellAddress) {
      // console.log(`🔗 Subscribing to WebSocket /location/${cellAddress}`);

      // Unsubscribe from previous subscription if exists
      const subscriptions = stompClient.subscriptions || {};
      Object.keys(subscriptions).forEach((subId) => {
        if (subscriptions[subId].destination.includes("/location/")) {
          // console.log(
          //   `🔄 Unsubscribing from previous location channel: ${subscriptions[subId].destination}`
          // );
          subscriptions[subId].unsubscribe();
        }
      });

      // Subscribe to new cell address
      const subscription = stompClient.subscribe(
        `/location/${cellAddress}`,
        (message) => {
          const newMessage = JSON.parse(message.body);
          // console.log(
          //   `📍 Update /location/${cellAddress}:`,
          //   newMessage.response
          // );
          setProviderLoc(() => [...newMessage.response]);
        }
      );

      return () => {
        subscription.unsubscribe();
        // console.log(`🚫 Unsubscribed from /location/${cellAddress}`);
      };
    }
  }, [stompClient, cellAddress]);

  // Send location updates to the server
  const sendLocationUpdate = useCallback(() => {
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
      // console.log("📤 Sent location update:", message);
    } else {
      // console.log(
      //   "⚠️ Cannot send location update: WebSocket not connected or missing data"
      // );
    }
  }, [stompClient, location, token]);

  // Send location updates on an interval
  useEffect(() => {
    if (stompClient && stompClient.connected && location) {
      // Send initial update
      sendLocationUpdate();

      // Setup interval for regular updates
      const interval = setInterval(sendLocationUpdate, 3000);
      return () => clearInterval(interval);
    }
  }, [stompClient, location, sendLocationUpdate]);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (angle) => (angle * Math.PI) / 180;
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2); // Distance in km
  };

  const sendRideRequest = async (providerId) => {
    if (!token) {
      console.error("❌ No token found, authentication required.");
      return;
    }
    if (addressInput === "" || addressInput === null) {
      console.error("❌ No Address found.");
      return;
    }

    try {
      setStatues((d) => {
        const r = { ...d };
        r[providerId] = "in-progress";
        return r;
      });
      const response = await axios.post(
        `http://${HOST}:${PORT}/api/v1/ride`,
        {
          serviceProviderId: providerId,
          destinationLocation: addressInput,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      // console.log("✅ Ride request sent successfully:", response.data);
    } catch (error) {
      console.error(
        "❌ Error sending ride request:",
        error.response?.data || error
      );
      alert("Failed to send ride request.");
    }
  };

  const handleChange = (value) => {
    setAddressInput(value);
  };

  const handleBackButton = () => {
    closeConnection();
    SecureStore.deleteItemAsync("token");
    SecureStore.deleteItemAsync("email");
    router.push("/login");
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleProfileAction = (action) => {
    setShowDropdown(false);
    if (action === "logout") {
      handleBackButton();
    } else if (action === "settings") {
      // Navigate to settings
      // console.log("Settings clicked");
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={["#121212", "#1E1E1E"]} style={styles.loader}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Finding your location...</Text>
      </LinearGradient>
    );
  }

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <LinearGradient colors={["#121212", "#1E1E1E"]} style={styles.container}>
        {/* Navbar */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={toggleDropdown}
              style={styles.profileButton}
            >
              <Icon name="account-circle" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>DropDown</Text>
            <TouchableOpacity onPress={() => handleBackButton()}>
              <Icon name="notifications" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Icon
              name="search"
              size={20}
              color="#6ecff2"
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Where to?"
              value={addressInput}
              onChangeText={handleChange}
              style={styles.inputAddress}
              placeholderTextColor="#6ecff2"
            />
          </View>
        </View>

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
              coordinate={location}
              title="Your Location"
              image={humanIcon}
            />
          )}

          {providerLoc.map((provider, index) => {
            return (
              <Marker
                key={provider.id || index}
                coordinate={{
                  latitude: provider.latitude,
                  longitude: provider.longitude,
                }}
                title={provider.name}
                image={carIcon}
              />
            );
          })}
        </MapView>

        <View style={styles.driversContainer}>
          <Text style={styles.driversTitle}>Available Drivers</Text>
          <FlatList
            data={providerLoc.map((provider) => ({
              ...provider,
              distance: location
                ? getDistance(
                    location.latitude,
                    location.longitude,
                    provider.latitude,
                    provider.longitude
                  )
                : "Calculating...",
            }))}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <LinearGradient
                colors={["#2A2A2A", "#1E1E1E"]}
                style={styles.item}
              >
                <View style={styles.driverInfo}>
                  <Image
                    source={require("../assets/images/logo.png")}
                    style={styles.logo}
                  />
                  <Text style={styles.driverName}>{item.name}</Text>
                  <Text style={styles.distanceText}>
                    📍 {item.distance} km away
                  </Text>
                </View>

                <View style={styles.actionContainer}>
                  {statuses[item.id] != "in-progress" && (
                    <TouchableOpacity
                      style={styles.requestButton}
                      onPress={() => sendRideRequest(item.id)}
                    >
                      <Text style={styles.requestText}>Request</Text>
                    </TouchableOpacity>
                  )}
                  {statuses[item.id] == "in-progress" && (
                    <View style={styles.timerContainer}>
                      <CountdownCircleTimer
                        isPlaying={true}
                        duration={10}
                        colors={"#4ECDC4"}
                        updateInterval={1}
                        size={40}
                        strokeWidth={4}
                        onComplete={() => {
                          setStatues((d) => {
                            const r = { ...d };
                            r[item.id] = "";
                            return r;
                          });
                          // if we decide to perform some task call method here
                          return { shouldRepeat: false, delay: 2 };
                        }}
                      >
                        {({ remainingTime, color }) => (
                          <Text style={{ color, fontSize: 12 }}>
                            {remainingTime}
                          </Text>
                        )}
                      </CountdownCircleTimer>
                      <Text style={styles.timerText}>Waiting...</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            )}
          />
        </View>

        {/* Profile Dropdown */}
        <Modal
          transparent={true}
          visible={showDropdown}
          onRequestClose={() => setShowDropdown(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowDropdown(false)}
          >
            <Animated.View
              style={[
                styles.dropdownContainer,
                { transform: [{ translateX: slideAnim }] },
              ]}
            >
              <View style={styles.profileHeader}>
                <Icon name="account-circle" size={60} color="#4ECDC4" />
                <Text style={styles.profileName}>{userProfile.name}</Text>
                <Text style={styles.profileEmail}>{userProfile.email}</Text>
              </View>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  toggleDropdown();
                  router.push("/user");
                }}
              >
                <Icon name="person" size={24} color="white" />
                <Text style={styles.dropdownItemText}>My Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleProfileAction("settings")}
              >
                <Icon name="settings" size={24} color="#fff" />
                <Text style={styles.dropdownItemText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                // onPress={() => {
                //   toggleSideMenu();
                //   router.push("/support");
                // }}
              >
                <Icon name="help" size={24} color="white" />
                <Text style={styles.dropdownItemText}>Help & Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                // onPress={() => {
                //   toggleSideMenu();
                //   router.push("/history");
                // }}
              >
                <Icon name="history" size={24} color="white" />
                <Text style={styles.dropdownItemText}>Ride History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleProfileAction("logout")}
              >
                <Icon name="logout" size={24} color="#fff" />
                <Text style={styles.dropdownItemText}>Logout</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </LinearGradient>
    </>
  );
}

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
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 20,
    fontSize: 16,
  },
  header: {
    paddingTop: StatusBar.currentHeight + 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  profileButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  inputAddress: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  map: {
    width: "100%",
    height: "55%",
  },
  driversContainer: {
    padding: 15,
    backgroundColor: "transparent",
  },
  driversTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  listContainer: {
    paddingBottom: 10,
  },
  item: {
    width: 180,
    borderRadius: 15,
    padding: 15,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  driverInfo: {
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  driverName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  distanceText: {
    color: "#bbb",
    fontSize: 12,
  },
  actionContainer: {
    alignItems: "center",
  },
  requestButton: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    width: "100%",
    alignItems: "center",
  },
  requestText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  timerContainer: {
    alignItems: "center",
  },
  timerText: {
    color: "#fff",
    fontSize: 10,
    marginTop: 5,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
  },
  dropdownContainer: {
    width: "70%",
    height: "100%",
    backgroundColor: "#1E1E1E",
    paddingTop: 50,
  },
  profileHeader: {
    alignItems: "center",
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    marginBottom: 20,
    paddingHorizontal: 20,
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
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 15,
  },
});
