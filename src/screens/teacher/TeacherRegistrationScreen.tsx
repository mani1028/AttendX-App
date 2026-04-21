import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchCamera, launchImageLibrary, Asset } from "react-native-image-picker";
import { Picker } from "@react-native-picker/picker";

/* ================= TYPES ================= */

type FormDataType = {
  branch_id: string;
  teacher_full_name: string;
  gender: string;
  date_of_birth: string;
  age: string;
  email_id: string;
  mobile_number: string;
  password: string;
  teacher_photograph: Asset | null;
};

const hasUri = (value: unknown): value is Asset => {
  return typeof value === 'object' && value !== null && 'uri' in value;
};

/* ================= COMPONENT ================= */

const TeacherRegistrationScreen: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState<FormDataType>({
    branch_id: "",
    teacher_full_name: "",
    gender: "",
    date_of_birth: "",
    age: "",
    email_id: "",
    mobile_number: "",
    password: "",
    teacher_photograph: null,
  });

  const [branches, setBranches] = useState<any[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const [otp, setOtp] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);

  const [schoolCode, setSchoolCode] = useState<string | null>(null);

  /* ================= LOAD SCHOOL CODE ================= */

  useEffect(() => {
    const load = async () => {
      const code = await AsyncStorage.getItem("schoolCode");
      setSchoolCode(code);
    };
    load();
  }, []);

  /* ================= LOAD BRANCHES ================= */

  useEffect(() => {
    if (!schoolCode) return;

    axios
      .get("/principal/branches", {
        headers: { "X-School-Code": schoolCode },
      })
      .then((res) => setBranches(res.data.items || []))
      .catch(() => Alert.alert("Error", "Failed to load branches"));
  }, [schoolCode]);

  /* ================= INPUT ================= */

  const handleChange = (name: keyof FormDataType, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= IMAGE ================= */

  const pickImage = () => {
    launchImageLibrary({ mediaType: "photo" }, (res) => {
      if (res.assets) {
        setPreview(res.assets[0].uri || null);
        setFormData((p) => ({
          ...p,
          teacher_photograph: res.assets![0],
        }));
      }
    });
  };

  const openCamera = () => {
    launchCamera({ mediaType: "photo" }, (res) => {
      if (res.assets) {
        setPreview(res.assets[0].uri || null);
        setFormData((p) => ({
          ...p,
          teacher_photograph: res.assets![0],
        }));
      }
    });
  };

  /* ================= OTP ================= */

  const sendOtp = async () => {
    if (!formData.email_id.includes("@")) {
      Alert.alert("Invalid Email");
      return;
    }

    try {
      await axios.post("/teacher/register/send-otp", {
        email_id: formData.email_id,
      });
      setOtpSent(true);
      Alert.alert("OTP Sent");
    } catch {
      Alert.alert("OTP Failed");
    }
  };

  const verifyOtp = async () => {
    try {
      await axios.post("/teacher/register/verify-otp", {
        email_id: formData.email_id,
        otp,
      });
      setEmailVerified(true);
      Alert.alert("Verified");
    } catch {
      Alert.alert("Invalid OTP");
    }
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    if (!emailVerified) {
      Alert.alert("Verify Email First");
      return;
    }

    const data = new FormData();

    Object.entries(formData).forEach(([k, v]) => {
      if (k === 'teacher_photograph' && hasUri(v) && v.uri) {
        data.append("teacher_photograph", {
          uri: v.uri,
          type: "image/jpeg",
          name: "photo.jpg",
        } as any);
      } else {
        data.append(k, v as string);
      }
    });

    try {
      await axios.post("/teacher/register", data);
      Alert.alert("Success", "Teacher Registered");
    } catch {
      Alert.alert("Error", "Submission failed");
    }
  };

  /* ================= UI ================= */

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Teacher Registration</Text>

      {/* STEP 1 */}
      {step === 1 && (
        <>
          <Picker
            selectedValue={formData.branch_id}
            onValueChange={(v) => handleChange("branch_id", v)}
          >
            <Picker.Item label="Select Branch" value="" />
            {branches.map((b) => (
              <Picker.Item key={b.branch_id} label={b.branch_name} value={b.branch_id} />
            ))}
          </Picker>

          <TextInput
            placeholder="Full Name"
            style={styles.input}
            onChangeText={(v) => handleChange("teacher_full_name", v)}
          />

          <TextInput
            placeholder="Email"
            style={styles.input}
            onChangeText={(v) => handleChange("email_id", v)}
          />

          <TouchableOpacity style={styles.btn} onPress={sendOtp}>
            <Text>Send OTP</Text>
          </TouchableOpacity>

          <TextInput
            placeholder="Enter OTP"
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
          />

          <TouchableOpacity style={styles.btn} onPress={verifyOtp}>
            <Text>Verify OTP</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={styles.btn} onPress={pickImage}>
              <Text>Upload</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={openCamera}>
              <Text>Camera</Text>
            </TouchableOpacity>
          </View>

          {preview && <Image source={{ uri: preview }} style={styles.image} />}
        </>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <>
          <TextInput
            placeholder="Mobile Number"
            style={styles.input}
            onChangeText={(v) => handleChange("mobile_number", v)}
          />

          <TextInput
            placeholder="Date of Birth"
            style={styles.input}
            onChangeText={(v) => handleChange("date_of_birth", v)}
          />

          <TextInput
            placeholder="Age"
            style={styles.input}
            onChangeText={(v) => handleChange("age", v)}
          />
        </>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <>
          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            onChangeText={(v) => handleChange("password", v)}
          />
        </>
      )}

      {/* NAV */}
      <View style={styles.nav}>
        {step > 1 && (
          <TouchableOpacity onPress={() => setStep(step - 1)}>
            <Text>Prev</Text>
          </TouchableOpacity>
        )}

        {step < totalSteps ? (
          <TouchableOpacity onPress={() => setStep(step + 1)}>
            <Text>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSubmit}>
            <Text>Submit</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

export default TeacherRegistrationScreen;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },

  btn: {
    backgroundColor: "#4ade80",
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },

  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  image: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginTop: 10,
  },
});