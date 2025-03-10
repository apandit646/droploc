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
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { HOST, PORT } from "./API";
import axios from "axios";
import { Block } from "galio-framework";

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
    const interval = setInterval(sendLocationUpdate, 3000);
    return () => clearInterval(interval);
  }, [stompClient, location]);

  const handleCall = useCallback((phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          console.log(provider);
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
      <Block flex={1.5}>
        <FlatList
          data={providerLoc}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logo}
              />
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
    backgroundColor: "#1c1c1e",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#2c2c2e",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 10,
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
  },
  text: {
    color: "#fff",
    fontSize: 16,
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
