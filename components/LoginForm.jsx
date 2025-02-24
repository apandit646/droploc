import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { Picker } from "@react-native-picker/picker"; // Import Picker for role selection
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";

export default function SignupForm() {
  const [email, setEmail] = useState("anubhavpandit.jain@gmail.com");
  const [password, setPassword] = useState("Anubhav123");
  const [role, setRole] = useState("User"); // Default role is "User"
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [location, setLocation] = useState(null);
  async function saveData(key, value) {
    await SecureStore.setItemAsync(key, value);
  }

  async function getData(key) {
    return await SecureStore.getItemAsync(key);
  } // State to hold location

  // Function to get device location
  async function getDeviceLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access location was denied");
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    console.log(location.coords.latitude, location.coords.longitude); // Logs the latitude and longitude
    setLocation(location.coords); // Store location coordinates in state
  }

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    // Get location before submitting signup form
    await getDeviceLocation();

    // If location is not available, alert the user
    if (!location) {
      Alert.alert("Error", "Could not get your location. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://192.168.5.24:8080/auth/login",
        {
          email,
          password,
          role, // Include role in the request
          latitude: location.latitude, // Send latitude
          longitude: location.longitude, // Send longitude
        }
      );
      const user_data = await response.data;

      if (response.status === 200) {
        // Handle successful signup (you can navigate or show a success message here)
        saveData("token", user_data.response.token);
        getData("token").then((data) => console.log(data));
        // await SecureStore.setItemAsync("latitude", location.latitude);
        // await SecureStore.setItemAsync("longitude", location.longitude);
        router.push("/map");
      } else {
        throw new Error("Unexpected response");
      }
    } catch (error) {
      console.error("Signup Error:", error);
      Alert.alert("Error", "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={{ minHeight: height }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formContainer, { width: width * 0.9 }]}>
            <Text style={[styles.title, { fontSize: width * 0.07 }]}>
              Create Account
            </Text>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { fontSize: width * 0.04 }]}>
                Username
              </Text>
              <TextInput
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { fontSize: width * 0.04 }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { fontSize: width * 0.04 }]}>
                Password
              </Text>
              <TextInput
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[styles.input, { fontSize: width * 0.04 }]}
                autoCapitalize="none"
              />
            </View>

            {/* Role Selection Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { fontSize: width * 0.04 }]}>
                Select Role
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={role}
                  onValueChange={setRole}
                  style={styles.picker}
                >
                  <Picker.Item label="User" value="User" />
                  <Picker.Item label="ServiceProvider" value="Admin" />
                </Picker>
              </View>
            </View>

            {/* Signup Button */}
            <TouchableOpacity
              style={[styles.signupButton, { padding: height * 0.018 }]}
              onPress={handleSignup}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  style={[styles.signupButtonText, { fontSize: width * 0.045 }]}
                >
                  Sign Up
                </Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push("/")}
            >
              <Text style={[styles.loginLinkText, { fontSize: width * 0.035 }]}>
                Already have an account?{" "}
                <Text style={styles.loginTextBold}>Sign-Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  keyboardView: { flex: 1 },
  formContainer: {
    alignSelf: "center",
    backgroundColor: "white",
    borderRadius: 15,
    padding: "5%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontWeight: "bold",
    color: "#333",
    marginBottom: "5%",
    textAlign: "center",
  },
  inputContainer: { marginBottom: "4%" },
  label: { color: "#666", marginBottom: "2%", fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: "4%",
    backgroundColor: "#fafafa",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  picker: { height: 50, width: "100%" },
  signupButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    marginTop: "4%",
    alignItems: "center",
  },
  signupButtonText: { color: "white", textAlign: "center", fontWeight: "600" },
  loginLink: { marginTop: "4%", padding: "2%" },
  loginLinkText: { textAlign: "center", color: "#666" },
  loginTextBold: { color: "#007AFF", fontWeight: "600" },
});
