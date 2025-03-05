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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Mail, User, MapPin } from "lucide-react-native";

export default function SignupForm() {
  const [email, setEmail] = useState("anubhavpandit.jain@gmail.com");
  const [password, setPassword] = useState("Anubhav123");
  const [role, setRole] = useState("User");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const saveData = async (key, value) =>
    await SecureStore.setItemAsync(key, value);

  const getDeviceLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Location Permission Denied 📍");
    return (await Location.getCurrentPositionAsync({})).coords;
  };

  const handleSignup = async () => {
    const { latitude, longitude } = (await getDeviceLocation()) || {};
    setLoading(true);
    try {
      const { data, status } = await axios.post(
        "http://192.168.5.216:8080/auth/login",
        { email, password, role, latitude, longitude }
      );
      if (status === 200) {
        await saveData("token", data.response.token);
        await saveData("email", email);
        router.push("/map");
      } else throw new Error("Unexpected response");
    } catch (error) {
      Alert.alert("Signup Failed 😔", "Please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#6A11CB", "#2575FC"]} style={styles.background}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flexContainer}
        >
          <ScrollView
            contentContainerStyle={{ minHeight: height }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.formContainer, { width: width * 0.9 }]}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={[styles.title, { fontSize: width * 0.07 }]}>
                DropDown
              </Text>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={styles.iconInputContainer}>
                  <Mail color="#6A11CB" size={24} style={styles.icon} />
                  <TextInput
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    style={[styles.input, { fontSize: width * 0.04 }]}
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.iconInputContainer}>
                  <Lock color="#6A11CB" size={24} style={styles.icon} />
                  <TextInput
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={[styles.input, { fontSize: width * 0.04 }]}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Role Picker */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { fontSize: width * 0.04 }]}>
                  Select Your Role 👤
                </Text>
                <View style={styles.pickerContainer}>
                  <User color="#6A11CB" size={24} style={styles.icon} />
                  <Picker
                    selectedValue={role}
                    onValueChange={setRole}
                    style={styles.picker}
                  >
                    <Picker.Item label="User 🏠" value="User" />
                    <Picker.Item label="Service Provider 💼" value="Admin" />
                  </Picker>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.signupButton, { padding: height * 0.018 }]}
                onPress={handleSignup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    style={[
                      styles.signupButtonText,
                      { fontSize: width * 0.045 },
                    ]}
                  >
                    Let's Go! 🚀
                  </Text>
                )}
              </TouchableOpacity>

              {/* Login Link */}
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.push("/")}
              >
                <Text
                  style={[styles.loginLinkText, { fontSize: width * 0.035 }]}
                >
                  Already have an account?{" "}
                  <Text style={styles.loginTextBold}>Sign In 🔐</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  flexContainer: {
    flex: 1,
  },
  logo: {
    width: "50%",
    height: 100,
    alignSelf: "center",
    marginBottom: 20,
  },
  formContainer: {
    alignSelf: "center",
    backgroundColor: "white",
    borderRadius: 20,
    padding: "5%",
    marginTop: "10%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  title: {
    fontWeight: "bold",
    color: "#333",
    marginBottom: "5%",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: "4%",
  },
  iconInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
  },
  icon: {
    marginLeft: 10,
    marginRight: 10,
  },
  label: {
    color: "#666",
    marginBottom: "2%",
    fontWeight: "500",
  },
  input: {
    flex: 1,
    padding: "4%",
    borderRadius: 12,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
  },
  picker: {
    height: 50,
    width: "90%",
  },
  signupButton: {
    backgroundColor: "#6A11CB",
    borderRadius: 12,
    marginTop: "4%",
    alignItems: "center",
    shadowColor: "#6A11CB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  signupButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "600",
  },
  loginLink: {
    marginTop: "4%",
    padding: "2%",
  },
  loginLinkText: {
    textAlign: "center",
    color: "#666",
  },
  loginTextBold: {
    color: "#6A11CB",
    fontWeight: "600",
  },
});
