import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";

const { width } = Dimensions.get("window");

export default function SignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNo: "",
    password: "",
    confirmPassword: "",
    role: "User",
  });

  const [location, setLocation] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Allow location access to continue.");
        return;
      }
      let locationData = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      });
    })();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phoneNo) => /^[0-9]{10}$/.test(phoneNo);
  const validatePassword = (password) =>
    password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password);

  const handleSignup = async () => {
    const { name, email, phoneNo, password, confirmPassword, role } = formData;
    let validationErrors = {};

    if (!name) validationErrors.name = "Full Name is required";
    if (!email) validationErrors.email = "Email is required";
    else if (!validateEmail(email))
      validationErrors.email = "Invalid email format";

    if (!phoneNo) validationErrors.phoneNo = "Phone number is required";
    else if (!validatePhone(phoneNo))
      validationErrors.phoneNo = "Phone number must be 10 digits";

    if (!password) validationErrors.password = "Password is required";
    else if (!validatePassword(password))
      validationErrors.password =
        "Password must be at least 6 characters and contain letters and numbers";

    if (!confirmPassword)
      validationErrors.confirmPassword = "Confirm Password is required";
    else if (password !== confirmPassword)
      validationErrors.confirmPassword = "Passwords do not match";

    if (!location) {
      setErrors((prev) => ({
        ...prev,
        location: "Location permission required",
      }));
      Alert.alert("Location Error", "Fetching location, please try again.");
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const apiUrl = "http://192.168.5.216:8080/auth/register"; // Change to live API if needed

      const response = await axios.post(apiUrl, {
        name,
        email,
        phoneNo,
        password,
        role,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      console.log(response.data, "<<<<<<<<<<<<<<<<<<<<<");

      if (response.data.success) {
        Alert.alert("Success", "Signup successful! You can now login.");
        await SecureStore.setItemAsync("secure_token", response.data.token);
        await SecureStore.setItemAsync(
          "refresh_token",
          response.data.refreshToken
        );
        await SecureStore.setItemAsync("latitude", location.latitude);
        await SecureStore.setItemAsync("longitude", location.longitude);

        router.push("/map");
      } else {
        Alert.alert(
          "Signup Failed",
          response.data.message || "An error occurred."
        );
      }
    } catch (error) {
      console.error("Signup Error:", error);
      Alert.alert(
        "Error",
        "Could not complete signup. Please try again later."
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidContainer}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            <View style={styles.formContainer}>
              <Text style={styles.title}>Create Account</Text>

              {Object.keys(errors).map(
                (key) =>
                  errors[key] && (
                    <Text key={key} style={styles.errorText}>
                      {errors[key]}
                    </Text>
                  )
              )}

              <TextInput
                placeholder="Full Name"
                value={formData.name}
                onChangeText={(value) => handleChange("name", value)}
                style={styles.input}
              />

              <TextInput
                placeholder="Email"
                value={formData.email}
                onChangeText={(value) => handleChange("email", value)}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                placeholder="Phone Number"
                value={formData.phoneNo}
                onChangeText={(value) => handleChange("phoneNo", value)}
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.input}
              />

              <TextInput
                placeholder="Password"
                value={formData.password}
                onChangeText={(value) => handleChange("password", value)}
                secureTextEntry
                style={styles.input}
              />

              <TextInput
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(value) => handleChange("confirmPassword", value)}
                secureTextEntry
                style={styles.input}
              />

              <Picker
                selectedValue={formData.role}
                onValueChange={(value) => handleChange("role", value)}
                style={styles.picker}
              >
                <Picker.Item label="User" value="User" />
                <Picker.Item label="Service Provider" value="ServiceProvider" />
              </Picker>

              <TouchableOpacity
                style={styles.signupButton}
                onPress={handleSignup}
                activeOpacity={0.8}
              >
                <Text style={styles.signupButtonText}>Sign Up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.push("/login")}
              >
                <Text
                  style={[styles.loginLinkText, { fontSize: width * 0.035 }]}
                >
                  Already have an account?{" "}
                  <Text style={styles.loginTextBold}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    padding: 20,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  formContainer: {
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  picker: {
    height: 50,
    marginBottom: 10,
  },
  signupButton: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  signupButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    marginBottom: 5,
  },
});
