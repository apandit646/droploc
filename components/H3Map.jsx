import React, { useEffect, useState, useCallback } from "react";
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
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { HOST, PORT } from "./API";
import axios from "axios";
import { CountdownCircleTimer } from "react-native-countdown-circle-timer";

export default function LeafletMap() {
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

    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("❌ Permission to access location was denied");
          return;
        }
        const currentLocation = await Location.getCurrentPositionAsync({});
        console.log("Setting location ", currentLocation);
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (error) {
        console.error("❌ Error getting location:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthData();
    getLocation();
  }, []);

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

  useEffect(() => {
    if (location) {
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
          console.log(response.data);
          setCellAddress(response.data);
        })
        .catch((error) => {
          console.error("get cell address", error);
        });
    }
  }, [location]);

  useEffect(() => {
    if (stompClient && cellAddress) {
      console.log(`🔗 Subscribing to WebSocket /location/${cellAddress}`);

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

      // return () => {
      //   subscription.unsubscribe();
      //   console.log(`🚫 Unsubscribed /location/${cellAddress}`);
      // };
    }
  }, [stompClient, cellAddress]);

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
        }, // Sending providerId in the request body
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("✅ Ride request sent successfully:", response.data);
      alert("Ride request sent successfully!");
    } catch (error) {
      console.error(
        "❌ Error sending ride request:",
        error.response?.data || error
      );
      alert("Failed to send ride request.");
    }
  };

  const sendLocationUpdate = () => {
    if (stompClient && stompClient.connected && location) {
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
      console.error("⚠️ Cannot send message: WebSocket is not connected.");
    }
  };

  useEffect(() => {
    if (stompClient && stompClient.connected) {
      const interval = setInterval(sendLocationUpdate, 3000);
      return () => clearInterval(interval);
    }
  }, [stompClient, location]);

  const handleChange = (value) => {
    setAddressInput(value);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={styles.header}>
        <Text style={styles.headerText}>DropDown</Text>
        <TextInput
          placeholder="Enter Address"
          value={addressInput}
          onChangeText={handleChange} // Corrected event handler
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
        <Marker coordinate={location} title="Your Location" image={humanIcon} />

        {providerLoc.map((provider, index) => {
          return (
            <Marker
              key={provider.id || index} // Unique key fix
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
                      // if we decide to perform some task call method here
                      return { shouldRepeat: false, delay: 2 };
                    }}
                  >
                    {({ remainingTime, color }) => (
                      <Text style={{ color, fontSize: 10 }}>
                        {" "}
                        {/* Reduce font size */}
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
  );
}

const styles = StyleSheet.create({
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
