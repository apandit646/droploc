import React, { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import { StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export default function LeafletMap() {
  const [stompClient, setStompClient] = useState(null);
  const [location, setLocation] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
  });
  const [providerLoc, setPricidedLoc] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [cellAddress, setCellAddress] = useState("");

  useEffect(() => {
    const fetchAuthData = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("token");
        const storedEmail = await SecureStore.getItemAsync("email");
        console.log(storedEmail, "<<<<<<", storedToken);
        if (!storedToken || !storedEmail) {
          console.error("❌ No token or email found");
          return;
        }

        console.log("✅ Token & Email Retrieved:", {
          token: storedToken,
          email: storedEmail,
        });
        setToken(storedToken);
        setEmail(storedEmail);
      } catch (error) {
        console.error("❌ Error fetching auth data:", error);
      }
    };

    fetchAuthData();
  }, []);

  useEffect(() => {
    if (!token || !email) return;

    let socket, stomp;
    let interval;
    let locationSubscription;
    let userSubscription;
    let testSubscription;

    const connectWebSocket = () => {
      console.log("🔗 Initializing WebSocket connection...");
      console.log("🌐 Connecting to:", "http://192.168.5.24:8080/ws-location");

      socket = new SockJS("http://192.168.5.24:8080/ws-location");
      stomp = new Client({
        webSocketFactory: () => socket,
        debug: (str) => console.log(`🐞 STOMP Debug: ${str}`),
        reconnectDelay: 5000,
        onDisconnect: () => console.warn("⚠️ WebSocket Disconnected"),
      });

      stomp.onConnect = (frame) => {
        console.log("✅ Successfully connected to WebSocket");
        console.log("🔌 Connection frame:", frame);

        // Subscribe to user-specific updates
        const userTopic = `/user/${email}/location-sub`;

        userSubscription = stomp.subscribe(userTopic, async (message) => {
          console.log("📨 Received user message:", {
            headers: message.headers,
            body: message.body,
          });
          try {
            const data = JSON.parse(message.body);

            console.log("📦 Parsed user message data:", data);
            if (data.response) {
              const newCellAddress = data.response;
              console.log("📍 New cell address:", newCellAddress);
              setCellAddress(newCellAddress);

              // Subscribe to service providers in new cell area
              const locationTopic = `/location/${newCellAddress}`;
              console.log("🛰 Subscribing to location topic:", locationTopic);
              if (locationSubscription) locationSubscription.unsubscribe();
              locationSubscription = stomp.subscribe(
                locationTopic,
                (providerMessage) => {
                  console.log("📨 Received location update:", {
                    headers: providerMessage.headers,
                    body: providerMessage.body,
                  });
                  try {
                    const providerData = JSON.parse(providerMessage.body);
                    console.log("👨‍⚕️ Service provider data:", providerData);
                    if (providerData.response) {
                      setServiceProviders(providerData.response);
                    }
                  } catch (error) {
                    console.error("❌ Error parsing provider message:", error);
                  }
                }
              );
            }
          } catch (error) {
            console.error("❌ Error parsing user message:", error);
          }
        });

        // Subscribe to test endpoint
        testSubscription = stomp.subscribe("/test", (message) => {
          console.log("🧪 Test message received:", message.body);
        });

        // Subscribe to all location updates
        stomp.subscribe("/location/*", async (message) => {
          console.log("🌍 General location update:", message.body);
          const bodyRes = await JSON.parse(message.body);
          const loc_data = await bodyRes.response;
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", bodyRes.response);
          await setPricidedLoc([...loc_data]);
          cosnole.log(providerLoc, "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
        });
      };

      stomp.onStompError = (frame) => {
        console.error("❌ STOMP Protocol Error:", {
          command: frame.command,
          headers: frame.headers,
          body: frame.body,
        });
      };

      stomp.onWebSocketError = (event) => {
        console.error("❌ WebSocket Error:", event);
      };

      stomp.activate();
      setStompClient(stomp);

      const sendLocation = async () => {
        try {
          console.log("📍 Requesting location permissions...");
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            console.warn("⚠️ Location permission denied");
            return;
          }

          console.log("🛰 Getting current position...");
          const { coords } = await Location.getCurrentPositionAsync({});
          console.log("📌 Current coordinates:", coords);

          setLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });

          const payload = {
            token,
            location: {
              latitude: coords.latitude,
              longitude: coords.longitude,
            },
          };

          console.log("📤 Sending location update:", payload);
          stomp.publish({
            destination: "/app/update-location",
            body: JSON.stringify(payload),
            headers: { "content-type": "application/json" },
          });
        } catch (error) {
          console.error("❌ Location update failed:", error);
        }
      };

      // Send initial location and set up periodic updates
      sendLocation();
      interval = setInterval(sendLocation, 30000);
      console.log("⏱ Started location update interval (30s)");
    };

    connectWebSocket();

    return () => {
      console.log("🧹 Cleaning up WebSocket connections...");
      clearInterval(interval);
      if (stomp) {
        if (userSubscription) userSubscription.unsubscribe();
        if (locationSubscription) locationSubscription.unsubscribe();
        if (testSubscription) testSubscription.unsubscribe();
        stomp.deactivate();
      }
      setStompClient(null);
    };
  }, [token, email]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={location} title="Your Location" />
        {serviceProviders.map((provider) => (
          <Marker
            key={provider.id}
            coordinate={{
              latitude: provider.latitude,
              longitude: provider.longitude,
            }}
            title={provider.name}
            description={provider.role}
          />
        ))}

        {providerLoc.map((provider) => (
          <Marker
            key={provider.id}
            coordinate={{
              latitude: provider.latitude,
              longitude: provider.longitude,
            }}
            title={provider.name}
            description={provider.role}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
