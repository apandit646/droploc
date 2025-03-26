import React, { useState, useCallback } from "react";
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
  ActivityIndicator,
  Image,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { LinearGradient } from "expo-linear-gradient";
import { User, Mail, PhoneCall, Lock, Check } from "lucide-react-native";
import { HOST, PORT } from "./API";

export default function SignupForm() {
  const router = useRouter();
  const [role, setRole] = useState("User");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNo: "",
    password: "",
    confirmPassword: "",
    role: role,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveData = async (key, value) =>
    await SecureStore.setItemAsync(key, value);

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      const apiUrl = `http://${HOST}:${PORT}/auth/register`;

      const { name, email, phoneNo, password, role } = formData;

      const formattedRole = role === "User" ? "User" : "ServiceProvider";

      const { data, status } = await axios.post(apiUrl, {
        name,
        email,
        phoneNo,
        password,
        role: formattedRole,
      });

      if (status === 200) {
        await saveData("token", data.response.token);
        await saveData("refreshToken", data.response.refreshToken);
        await saveData("email", email);
        await saveData("id", data.response.id);
        if (role === "User") {
          router.push("/map");
        } else if (role === "ServiceProvider") {
          router.push("/service");
        }
      } else {
        Alert.alert(
          "❌ Signup Failed",
          response.data.message || "An error occurred."
        );
      }
    } catch (error) {
      console.error("Signup Error:", error);
      Alert.alert("🚨 Error", "Could not complete signup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <LinearGradient
        colors={["#0F2027", "#203A43", "#2C5364"]}
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea}>
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
                  <Image
                    source={require("../assets/images/logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  {/* Futuristic Holographic Title */}
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>DropDown</Text>
                    <View style={styles.subtitleUnderline} />
                  </View>

                  {/* Input Fields with Icons */}
                  <View style={styles.inputGroup}>
                    <View style={styles.iconInputContainer}>
                      <User color="#4ecdc4" size={24} style={styles.icon} />
                      <TextInput
                        placeholder="Full Name"
                        value={formData.name}
                        onChangeText={(value) => handleChange("name", value)}
                        style={styles.input}
                        placeholderTextColor="#6ecff2"
                      />
                    </View>

                    <View style={styles.iconInputContainer}>
                      <Mail color="#4ecdc4" size={24} style={styles.icon} />
                      <TextInput
                        placeholder="Email"
                        value={formData.email}
                        onChangeText={(value) => handleChange("email", value)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                        placeholderTextColor="#6ecff2"
                      />
                    </View>

                    <View style={styles.iconInputContainer}>
                      <PhoneCall
                        color="#4ecdc4"
                        size={24}
                        style={styles.icon}
                      />
                      <TextInput
                        placeholder="Phone Number"
                        value={formData.phoneNo}
                        onChangeText={(value) => handleChange("phoneNo", value)}
                        keyboardType="phone-pad"
                        maxLength={10}
                        style={styles.input}
                        placeholderTextColor="#6ecff2"
                      />
                    </View>

                    <View style={styles.iconInputContainer}>
                      <Lock color="#4ecdc4" size={24} style={styles.icon} />
                      <TextInput
                        placeholder="Password"
                        value={formData.password}
                        onChangeText={(value) =>
                          handleChange("password", value)
                        }
                        secureTextEntry
                        style={styles.input}
                        placeholderTextColor="#6ecff2"
                      />
                    </View>

                    <View style={styles.iconInputContainer}>
                      <Check color="#4ecdc4" size={24} style={styles.icon} />
                      <TextInput
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChangeText={(value) =>
                          handleChange("confirmPassword", value)
                        }
                        secureTextEntry
                        style={styles.input}
                        placeholderTextColor="#6ecff2"
                      />
                    </View>

                    {/* Role Picker */}
                    <View style={styles.pickerContainer}>
                      <Text style={styles.pickerLabel}>Select Your Role</Text>
                      <Picker
                        selectedValue={formData.role}
                        onValueChange={(itemValue) => {
                          console.log("Role changed to:", itemValue);
                          setRole(itemValue);
                        }}
                        style={styles.picker}
                        dropdownIconColor="#4ecdc4"
                      >
                        <Picker.Item label="User" value="User" color="black" />
                        <Picker.Item
                          label="Driver"
                          value="ServiceProvider"
                          color="black"
                        />
                      </Picker>
                    </View>
                  </View>

                  {/* Signup Button */}
                  <TouchableOpacity
                    style={styles.signupButton}
                    onPress={handleSignup}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#0F2027" size="large" />
                    ) : (
                      <Text style={styles.signupButtonText}>Sign Up</Text>
                    )}
                  </TouchableOpacity>

                  {/* Login Link */}
                  <TouchableOpacity
                    style={styles.loginLink}
                    onPress={() => router.push("/login")}
                  >
                    <Text style={styles.loginLinkText}>
                      Already have an account?{" "}
                      <Text style={styles.loginTextBold}>Login 🔐</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
    // This will fill the entire screen including status bar area on iOS
    ...(Platform.OS === "ios"
      ? { paddingTop: 0 }
      : { paddingTop: StatusBar.currentHeight }),
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  formContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4ecdc4",
    textAlign: "center",
  },
  subtitleUnderline: {
    height: 2,
    width: 100,
    backgroundColor: "#4ecdc4",
    marginTop: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  iconInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.3)",
  },
  icon: {
    marginLeft: 10,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#6ecff2",
    padding: 10,
  },
  pickerContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.3)",
    marginBottom: 10,
  },
  pickerLabel: {
    color: "#4ecdc4",
    textAlign: "center",
    padding: 10,
  },
  picker: {
    color: "#6ecff2",
  },
  signupButton: {
    backgroundColor: "#4ecdc4",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  signupButtonText: {
    color: "#0F2027",
    fontSize: 18,
    fontWeight: "bold",
  },
  loginLink: {
    alignItems: "center",
  },
  loginLinkText: {
    color: "#6ecff2",
  },
  loginTextBold: {
    fontWeight: "bold",
    color: "#4ecdc4",
  },
  logo: {
    width: "50%",
    height: 100,
    alignSelf: "center",
    marginBottom: 20,
  },
});
