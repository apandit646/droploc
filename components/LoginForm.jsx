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
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";

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
    if (status !== "granted") return Alert.alert("Permission denied");
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
      Alert.alert("Signup failed, try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flexContainer}
      >
        <ScrollView
          contentContainerStyle={{ minHeight: height }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formContainer, { width: width * 0.9 }]}>
            <Text style={[styles.title, { fontSize: width * 0.07 }]}>
              Create Account
            </Text>
            {["Email", "Password"].map((field, i) => (
              <View key={i} style={styles.inputContainer}>
                <Text style={[styles.label, { fontSize: width * 0.04 }]}>
                  {field}
                </Text>
                <TextInput
                  placeholder={`Enter your ${field.toLowerCase()}`}
                  value={field === "Email" ? email : password}
                  onChangeText={field === "Email" ? setEmail : setPassword}
                  secureTextEntry={field === "Password"}
                  style={[styles.input, { fontSize: width * 0.04 }]}
                  autoCapitalize="none"
                />
              </View>
            ))}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { fontSize: width * 0.04 }]}>
                Select Role
              </Text>
              <Picker
                selectedValue={role}
                onValueChange={setRole}
                style={styles.picker}
              >
                <Picker.Item label="User" value="User" />
                <Picker.Item label="Service Provider" value="Admin" />
              </Picker>
            </View>
            <TouchableOpacity
              style={[styles.signupButton, { padding: height * 0.018 }]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  style={[styles.signupButtonText, { fontSize: width * 0.045 }]}
                >
                  Login
                </Text>
              )}
            </TouchableOpacity>
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
  flexContainer: { flex: 1 },
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
