// import React, { useEffect, useState } from "react";
// import {
//   StyleSheet,
//   View,
//   ActivityIndicator,
//   FlatList,
//   Text,
//   TouchableOpacity,
// } from "react-native";
// import MapView, { Marker } from "react-native-maps";
// import * as SecureStore from "expo-secure-store";
// import * as Location from "expo-location";
// import { Client } from "@stomp/stompjs";
// import SockJS from "sockjs-client";
// import { HOST, PORT } from "./API";

// export default function ServiceH3Map() {
//   const [location, setLocation] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [stompClient, setStompClient] = useState(null);
//   const [requests, setRequests] = useState([]); // Request Data
//   const carIcon = require("../assets/images/car_texi.png");
//   const [email, setEmail] = useState(null);
//   const [token, setToken] = useState(null);

//   useEffect(() => {
//     const fetchAuthData = async () => {
//       try {
//         const storedToken = await SecureStore.getItemAsync("token");
//         const storedEmail = await SecureStore.getItemAsync("email");
//         if (!storedToken || !storedEmail) {
//           console.error("❌ No token or email found");
//           return;
//         }
//         setEmail(storedEmail);
//         setToken(storedToken);
//       } catch (error) {
//         console.error("❌ Error fetching auth data:", error);
//       }
//     };

//     const getLocation = async () => {
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//           console.error("❌ Permission to access location was denied");
//           return;
//         }
//         const currentLocation = await Location.getCurrentPositionAsync({});
//         setLocation({
//           latitude: currentLocation.coords.latitude,
//           longitude: currentLocation.coords.longitude,
//         });
//       } catch (error) {
//         console.error("❌ Error getting location:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAuthData();
//     getLocation();

//     // Dummy request data
//     setRequests([
//       { id: 1, name: "John Doe", address: "123 Main St" },
//       { id: 2, name: "Alice Smith", address: "456 Oak St" },
//     ]);
//   }, []);

//   useEffect(() => {
//     if (!email || !token) return; // Ensure credentials are available

//     const socket = new SockJS(`http://${HOST}:${PORT}/ws-location`);
//     const client = new Client({
//       webSocketFactory: () => socket,
//       debug: (str) => console.log("WebSocket Debug:", str),
//       onConnect: () => {
//         console.log("✅ WebSocket Connected");
//         setStompClient(client);
//       },
//       onDisconnect: () => console.log("❌ WebSocket Disconnected"),
//       onStompError: (frame) => console.error("STOMP Error:", frame),
//     });
//     client.activate();

//     return () => {
//       if (client) {
//         client.deactivate();
//       }
//     };
//   }, [email, token]); // Only runs after email and token are available

//   const sendLocationUpdate = () => {
//     if (stompClient && stompClient.connected && location) {
//       const message = {
//         token: token,
//         location: {
//           latitude: location.latitude,
//           longitude: location.longitude,
//         },
//       };
//       stompClient.publish({
//         destination: "/app/update-location",
//         body: JSON.stringify(message),
//       });
//       console.log("📤 Sent location update:", message);
//     } else {
//       console.error("⚠️ Cannot send message: WebSocket is not connected.");
//     }
//   };

//   useEffect(() => {
//     if (stompClient && stompClient.connected) {
//       const interval = setInterval(sendLocationUpdate, 3000);
//       return () => clearInterval(interval);
//     }
//   }, [stompClient, location]);

//   useEffect(() => {
//     if (stompClient && stompClient.connected) {
//       debugger;
//       const subscription = stompClient.subscribe(
//         `/user/notification`,
//         (message) => {
//           const newMessage = JSON.parse(message.body);
//           console.log(
//             `📍 Notification /user/${email}/notification:`,
//             newMessage
//           );
//         }
//       );
//     }
//   }, [stompClient]);

//   if (loading) {
//     return (
//       <View style={styles.loader}>
//         <ActivityIndicator size="large" color="#fff" />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Navbar */}
//       <View style={styles.navbar}>
//         <Text style={styles.navTitle}>DropDown</Text>
//       </View>

//       {/* Map Section */}
//       <MapView
//         style={styles.map}
//         region={{
//           latitude: location?.latitude || 0,
//           longitude: location?.longitude || 0,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         }}
//       >
//         {location && (
//           <Marker
//             coordinate={{
//               latitude: location.latitude,
//               longitude: location.longitude,
//             }}
//             title="Your Location"
//             image={carIcon}
//           />
//         )}
//       </MapView>

//       {/* Bottom Section - Request List */}
//       <View style={styles.bottomContainer}>
//         <FlatList
//           data={requests}
//           keyExtractor={(item) => item.id.toString()}
//           renderItem={({ item }) => (
//             <View style={styles.requestItem}>
//               <Text style={styles.requestText}>{item.name}</Text>
//               <Text style={styles.addressText}>{item.address}</Text>
//               <TouchableOpacity style={styles.acceptButton}>
//                 <Text style={styles.acceptText}>Accept</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         />
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#1c1c1e",
//   },
//   navbar: {
//     height: 60,
//     backgroundColor: "#2c2c2e",
//     justifyContent: "center",
//     alignItems: "center",
//     borderBottomWidth: 1,
//     borderBottomColor: "#444",
//   },
//   navTitle: {
//     color: "#fff",
//     fontSize: 20,
//     fontWeight: "bold",
//   },
//   map: {
//     flex: 4,
//     width: "100%",
//   },
//   bottomContainer: {
//     flex: 2,
//     backgroundColor: "#2c2c2e",
//     padding: 10,
//   },
//   requestItem: {
//     backgroundColor: "#3a3a3c",
//     padding: 15,
//     marginVertical: 5,
//     borderRadius: 8,
//   },
//   requestText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "bold",
//   },
//   addressText: {
//     color: "#bbb",
//     fontSize: 14,
//   },
//   acceptButton: {
//     backgroundColor: "#4CAF50",
//     paddingVertical: 8,
//     paddingHorizontal: 20,
//     borderRadius: 5,
//     alignSelf: "flex-end",
//     marginTop: 10,
//   },
//   acceptText: {
//     color: "#fff",
//     fontSize: 14,
//     fontWeight: "bold",
//   },
//   loader: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#1c1c1e",
//   },
// });
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { HOST, PORT } from "./API";

export default function ServiceH3Map() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stompClient, setStompClient] = useState(null);
  const [requests, setRequests] = useState([]);
  const carIcon = require("../assets/images/car_texi.png");
  const [email, setEmail] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const fetchAuthData = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("token");
        const storedEmail = await SecureStore.getItemAsync("email");
        if (!storedToken || !storedEmail) {
          console.error("❌ No token or email found");
          return;
        }
        setEmail(storedEmail);
        setToken(storedToken);
      } catch (error) {
        console.error("❌ Error fetching auth data:", error);
      }
    };

    fetchAuthData();
  }, []);

  // Get the user's current location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("❌ Permission to access location was denied");
          return;
        }
        const currentLocation = await Location.getCurrentPositionAsync({});
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

    getLocation();

    // Dummy request data
    setRequests([
      { id: 1, name: "John Doe", address: "123 Main St" },
      { id: 2, name: "Alice Smith", address: "456 Oak St" },
    ]);
  }, []);

  // Initialize WebSocket connection and STOMP client
  useEffect(() => {
    if (!email || !token) return; // Ensure credentials are available

    const socket = new SockJS(`http://${HOST}:${PORT}/ws-location`);
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log("WebSocket Debug:", str),
      onConnect: () => {
        console.log("✅ WebSocket Connected");
        setStompClient(client);
      },
      onDisconnect: () => console.log("❌ WebSocket Disconnected"),
      onStompError: (frame) => console.error("STOMP Error:", frame),
    });
    client.activate();

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [email, token]);
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

  useEffect(() => {
    if (stompClient && stompClient.connected && email) {
      console.log("✅ Subscribing to /user/notification");
      const subscription = stompClient.subscribe(
        `/user/${email}/notification`,
        (message) => {
          const newMessage = JSON.parse(message.body);
          console.log(` Notification /user/${email}/notification:`, newMessage);

          setRequests((prevRequests) => [...prevRequests, newMessage]);
        }
      );

      return () => subscription.unsubscribe();
    }
  }, [stompClient, email]);

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
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>DropDown</Text>
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

      {/* Bottom Section - Request List */}
      <View style={styles.bottomContainer}>
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.requestItem}>
              <Text style={styles.requestText}>{item.name}</Text>
              <Text style={styles.addressText}>{item.address}</Text>
              <TouchableOpacity style={styles.acceptButton}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  acceptText: {
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
