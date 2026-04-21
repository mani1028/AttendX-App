import AsyncStorage from "@react-native-async-storage/async-storage";

/* ================= CONSTANTS ================= */

const SESSION_KEYS = [
  "userRole",
  "role",
  "token",
  "school_code",
  "schoolCode",
  "user_name",
  "user_id",
  "branch_id",
  "branchId",
  "student_id",
  "roll_number",
  "parent_id",
  "teacher_id",
  "employee_id",
  "email",
  "hm_email",
  "hm_employee_id",
  "is_class_teacher",
  "branch_name",
  "user",
];

/* ================= HELPERS ================= */

export const sanitizeSchoolCode = (value: any): string =>
  String(value || "").trim().toUpperCase();

/* ================= GET ROLE ================= */

export const getStoredRole = async (): Promise<string> => {
  const role =
    (await AsyncStorage.getItem("userRole")) ||
    (await AsyncStorage.getItem("role")) ||
    "";

  return String(role).trim().toLowerCase();
};

/* ================= GET USER ================= */

export const getStoredUser = async (): Promise<any> => {
  try {
    const user = await AsyncStorage.getItem("user");
    return JSON.parse(user || "{}");
  } catch {
    return {};
  }
};

/* ================= CLASS TEACHER CHECK ================= */

export const isTeacherClassTeacher = async (): Promise<boolean> => {
  const user = await getStoredUser();

  if (typeof user?.is_class_teacher === "boolean") {
    return user.is_class_teacher;
  }

  const flag = await AsyncStorage.getItem("is_class_teacher");
  return flag === "1";
};

/* ================= ROUTE ACCESS ================= */

export const canAccessTeacherPath = async (
  pathname: string
): Promise<boolean> => {
  const classTeacherOnlyRoutes = new Set([
    "/teacher-dashboard/enroll",
    "/teacher-dashboard/manage",
    "/teacher-dashboard/leave-approval",
  ]);

  if (!classTeacherOnlyRoutes.has(pathname)) return true;

  return await isTeacherClassTeacher();
};

/* ================= LOGOUT ================= */

export const performLogout = async (navigation: any) => {
  try {
    await Promise.all(
      SESSION_KEYS.map((key) => AsyncStorage.removeItem(key))
    );

    // Reset navigation stack (important)
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  } catch (err) {
    console.log("Logout error:", err);
  }
};