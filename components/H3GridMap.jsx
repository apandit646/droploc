import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Linking,
  FlatList,
  Text,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { Block } from "galio-framework";

export default function LeafletMap() {
  const [stompClient, setStompClient] = useState(null);
  const [location, setLocation] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
  });
  const [providerLoc, setProviderLoc] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [cellAddress, setCellAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const carIcon = require("../assets/images/car_texi.png");
  const humanIcon = require("../assets/images/human.png");
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
      } finally {
        setLoading(false);
      }
    };

    fetchAuthData();
  }, []);

  useEffect(() => {
    if (!token || !email) return;

    let socket, stomp;
    let interval;
    let userSubscription;
    let locationSubscription;
    let testSubscription;

    const connectWebSocket = () => {
      socket = new SockJS("http://192.168.5.216:8080/ws-location");
      stomp = new Client({
        webSocketFactory: () => socket,
        debug: (str) => console.log(`🐞 STOMP Debug: ${str}`),
        reconnectDelay: 5000,
        onDisconnect: () => console.warn("⚠️ WebSocket Disconnected"),
      });

      stomp.onConnect = (frame) => {
        const userTopic = `/user/${email}/location-sub`;
        userSubscription = stomp.subscribe(userTopic, (message) => {
          try {
            const data = JSON.parse(message.body);
            if (data.response) {
              const newCellAddress = data.response;
              setCellAddress(newCellAddress);
              const locationTopic = `/location/${newCellAddress}`;
              if (locationSubscription) locationSubscription.unsubscribe();
              locationSubscription = stomp.subscribe(
                locationTopic,
                (providerMessage) => {
                  try {
                    const providerData = JSON.parse(providerMessage.body);
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

        testSubscription = stomp.subscribe("/test", (message) => {
          console.log("🧪 Test message received:", message.body);
        });

        stomp.subscribe("/location/*", async (message) => {
          try {
            const bodyRes = JSON.parse(message.body);
            const loc_data = bodyRes.response;
            setProviderLoc([...loc_data]);
          } catch (error) {
            console.error("❌ Error parsing location message:", error);
          }
        });
      };

      stomp.onStompError = (frame) => {
        console.error("❌ STOMP Protocol Error:", frame);
      };

      stomp.onWebSocketError = (event) => {
        console.error("❌ WebSocket Error:", event);
      };

      stomp.activate();
      setStompClient(stomp);
    };

    const sendLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("⚠️ Location permission denied");
          return;
        }

        const { coords } = await Location.getCurrentPositionAsync({});
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

        stomp.publish({
          destination: "/app/update-location",
          body: JSON.stringify(payload),
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        console.error("❌ Location update failed:", error);
      }
    };

    connectWebSocket();
    sendLocation();
    interval = setInterval(sendLocation, 30000);

    return () => {
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

  const handleCall = useCallback((phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <Text>Loading...</Text>
      </View>
    );
  }

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
        {serviceProviders.map((provider) => {
          console.log("Provider Data:", provider); // Debugging line
          return (
            <Marker
              key={provider.id}
              coordinate={{
                latitude: provider.latitude,
                longitude: provider.longitude,
              }}
              title={provider.name}
              description={provider.role}
              image={humanIcon}
            />
          );
        })}
        {providerLoc.map((provider) => (
          <Marker
            key={provider.id}
            coordinate={{
              latitude: provider.latitude,
              longitude: provider.longitude,
            }}
            title={provider.name}
            description={provider.role}
            image={carIcon}
          />
        ))}
      </MapView>
      <Block flex={1.5}>
        <FlatList
          data={providerLoc}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.text}>{item.name}</Text>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(item.phone)}
              >
                <Text style={styles.callText}>Call</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </Block>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: "#3498db",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 10,
  },
  callButton: {
    backgroundColor: "#2ecc71",
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
  },
});
