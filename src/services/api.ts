import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ================= BASE URL ================= */

// 🔴 CHANGE THIS TO YOUR BACKEND
const API_BASE = "http://10.0.2.2:8000/api"; 
// Android emulator → 10.0.2.2
// iOS → localhost
// real device → your PC IP

/* ================= AXIOS INSTANCE ================= */

const API = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

/* ================= REQUEST INTERCEPTOR ================= */

API.interceptors.request.use(async (config) => {
  config.headers = config.headers || {};

  // Token
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // School Code
  const schoolCode =
    (await AsyncStorage.getItem("school_code")) ||
    (await AsyncStorage.getItem("schoolCode"));

  if (schoolCode) {
    config.headers["X-School-Code"] = schoolCode;
  }

  // Branch ID
  const branchId =
    (await AsyncStorage.getItem("branch_id")) ||
    (await AsyncStorage.getItem("branchId"));

  if (branchId) {
    config.headers["X-Branch-Id"] = branchId;
  }

  return config;
});

/* ================= RESPONSE ================= */

API.interceptors.response.use(
  (res) => res,
  (err) => {
    console.log("API ERROR:", err?.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default API;