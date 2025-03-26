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
  ActivityIndicator,
  Image,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import * as SecureStore from "expo-secure-store";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Mail } from "lucide-react-native";
import { HOST, PORT } from "./API";

export default function LoginForm() {
  const [email, setEmail] = useState("boss@gmail.com");
  const [password, setPassword] = useState("12345678");
  const [role, setRole] = useState("ServiceProvider");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const saveData = async (key, value) =>
    await SecureStore.setItemAsync(key, value);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const formattedRole = role === "User" ? "User" : "ServiceProvider";

      const { data, status } = await axios.post(
        `http://${HOST}:${PORT}/auth/login`,
        { email, password, role: formattedRole }
      );
      if (status === 200) {
        await saveData("token", data.response.token);
        await saveData("email", email);
        await saveData("refreshToken", data.response.refreshToken);
        await saveData("id", data.response.id);
        if (role === "User") {
          router.push("/map");
        } else if (role === "ServiceProvider") {
          router.push("/service");
        }
      } else throw new Error("Unexpected response");
    } catch (error) {
      console.log(error);
      Alert.alert("Login Failed 😔", "Please try again");
    } finally {
      setLoading(false);
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidContainer}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            <View style={styles.formContainer}>
              {/* Logo */}
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />

              {/* Title */}
              <View style={styles.titleContainer}>
                <Text style={styles.title}>DropDown</Text>
                <View style={styles.subtitleUnderline} />
              </View>

              {/* Email Input */}
              <View style={styles.iconInputContainer}>
                <Mail color="#4ecdc4" size={24} style={styles.icon} />
                <TextInput
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  autoCapitalize="none"
                  placeholderTextColor="#6ecff2"
                />
              </View>

              {/* Password Input */}
              <View style={styles.iconInputContainer}>
                <Lock color="#4ecdc4" size={24} style={styles.icon} />
                <TextInput
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                  placeholderTextColor="#6ecff2"
                />
              </View>

              {/* Role Picker */}
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Select Your Role</Text>
                <Picker
                  selectedValue={role}
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

              {/* Login Button */}
              <TouchableOpacity
                style={styles.signupButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0F2027" size="large" />
                ) : (
                  <Text style={styles.signupButtonText}>Login</Text>
                )}
              </TouchableOpacity>

              {/* Signup Link */}
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.push("/")}
              >
                <Text style={styles.loginLinkText}>
                  Don't have an account?{" "}
                  <Text style={styles.loginTextBold}>Sign Up 🔐</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
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
  logo: {
    width: "50%",
    height: 100,
    alignSelf: "center",
    marginBottom: 20,
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
});
