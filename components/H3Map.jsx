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
  const router = useRouter();
  // Use refs to store subscriptions for cleanup
  const locationSubscriptionRef = useRef(null);
  const cellAddressCheckerRef = useRef(null);

  function closeConnection() {
    stompClient.deactivate();
    console.log("Socket Disconnected ");
  }

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

            // Set loading to false once we have the initial location
            setLoading(false);
          }
        );

        // Store the subscription in the ref for cleanup
        locationSubscriptionRef.current = subscription;
      } catch (error) {
        console.error("❌ Error setting up location tracking:", error);
        setLoading(false);
      }
    };

    fetchAuthData();
    setupLocationTracking();

    // Clean up function for location subscription
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
      debug: (str) => console.log("WebSocket Debug:", str),
      onConnect: () => {
        console.log("✅ WebSocket Connected");
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
      console.log("⏳ Fetching cell address for location:", location);
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
          console.log("✅ Cell address response:", response.data);
          if (response.data !== cellAddress) {
            console.log(
              "🔄 Cell address changed from",
              cellAddress,
              "to",
              response.data
            );
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
      console.log(`🔗 Subscribing to WebSocket /location/${cellAddress}`);

      // Unsubscribe from previous subscription if exists
      const subscriptions = stompClient.subscriptions || {};
      Object.keys(subscriptions).forEach((subId) => {
        if (subscriptions[subId].destination.includes("/location/")) {
          console.log(
            `🔄 Unsubscribing from previous location channel: ${subscriptions[subId].destination}`
          );
          subscriptions[subId].unsubscribe();
        }
      });

      // Subscribe to new cell address
      const subscription = stompClient.subscribe(
        `/location/${cellAddress}`,
        (message) => {
          const newMessage = JSON.parse(message.body);
          console.log(
            `📍 Update /location/${cellAddress}:`,
            newMessage.response
          );
          setProviderLoc(() => [...newMessage.response]);
        }
      );

      return () => {
        subscription.unsubscribe();
        console.log(`🚫 Unsubscribed from /location/${cellAddress}`);
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
      console.log("📤 Sent location update:", message);
    } else {
      console.log(
        "⚠️ Cannot send location update: WebSocket not connected or missing data"
      );
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
      console.log("✅ Ride request sent successfully:", response.data);
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
  // logout
  const handleBackButton = () => {
    closeConnection();
    SecureStore.deleteItemAsync("token");
    SecureStore.deleteItemAsync("email");
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
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={styles.container}>
        {/* Navbar */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => handleBackButton()}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>DropDown</Text>
          </View>
          <TextInput
            placeholder="Enter Address"
            value={addressInput}
            onChangeText={handleChange}
            style={styles.inputAddress}
            placeholderTextColor="#6ecff2"
          />
        </View>

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
        <View style={{ flex: 1.5 }}>
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
            numColumns={2}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <View style={styles.diaplaycard}>
                  <Image
                    source={require("../assets/images/logo.png")}
                    style={styles.logo}
                  />
                  <Text style={styles.text}>{item.name}</Text>
                </View>
                <View style={styles.diaplaycard}>
                  <Text style={styles.distanceText}>📍 {item.distance} km</Text>
                  {statuses[item.id] != "in-progress" && (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => sendRideRequest(item.id)}
                    >
                      <Text style={styles.callText}>Request</Text>
                    </TouchableOpacity>
                  )}
                  {statuses[item.id] == "in-progress" && (
                    <CountdownCircleTimer
                      isPlaying={true}
                      duration={30}
                      colors={"#4ECDC4"}
                      updateInterval={1}
                      size={30}
                      strokeWidth={3}
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
                        <Text style={{ color, fontSize: 10 }}>
                          {remainingTime}
                        </Text>
                      )}
                    </CountdownCircleTimer>
                  )}
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
  },
  diaplaycard: {
    flexDirection: "column",
    margin: 20,
    alignSelf: "center",
  },
  inputAddress: {
    width: "90%",
    backgroundColor: "#333",
    color: "#fff",
    padding: 10,
    borderRadius: 5,
    marginTop: 10, // Ensures it's below the "DropDown" text
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.3)",
    alignSelf: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#1c1c1e",
  },
  header: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: StatusBar.currentHeight, // Add this line
    padding: 20,
    backgroundColor: "#2c2c2e",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  logo: {
    width: 50,
    height: 50,
    alignSelf: "center",
  },
  headerText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
  },
  map: {
    width: "100%",
    height: "60%",
  },
  listContainer: {
    padding: 10,
  },
  item: {
    flex: 1,
    margin: 5,
    backgroundColor: "#2c2c2e",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    flexDirection: "row",
  },
  text: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 10,
  },
  distanceText: {
    color: "#bbb",
    fontSize: 14,
    marginBottom: 10,
  },
  callButton: {
    backgroundColor: "#4a90e2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  callText: {
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
});
