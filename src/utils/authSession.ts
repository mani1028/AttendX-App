// utils/authSession.ts - React Native version with navigation support

import AsyncStorage from "@react-native-async-storage/async-storage";
import eventEmitter from "./eventEmitter";

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
  try {
    const role =
      (await AsyncStorage.getItem("userRole")) ||
      (await AsyncStorage.getItem("role")) ||
      "";
    
    return String(role).trim().toLowerCase();
  } catch (error) {
    console.error("Error getting stored role:", error);
    return "";
  }
};

/* ================= GET USER ================= */

export const getStoredUser = async (): Promise<any> => {
  try {
    const user = await AsyncStorage.getItem("user");
    return user ? JSON.parse(user) : {};
  } catch (error) {
    console.error("Error parsing stored user:", error);
    return {};
  }
};

/* ================= SET SESSION DATA ================= */

export const setSessionData = async (data: any) => {
  try {
    const role = data.role || data.userRole;
    if (role) {
      await AsyncStorage.setItem("userRole", role);
      await AsyncStorage.setItem("role", role);
    }
    
    const token = data.token || data.accessToken || data.access_token;
    if (token) {
      await AsyncStorage.setItem("token", token);
    }
    
    if (data.user) {
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      
      // Extract additional fields from user object (handle both snake_case and camelCase)
      const isClassTeacher = data.user.is_class_teacher ?? data.user.isClassTeacher;
      if (isClassTeacher !== undefined) {
        await AsyncStorage.setItem("is_class_teacher", 
          isClassTeacher ? "1" : "0"
        );
      }
      
      const teacherId = data.user.teacher_id ?? data.user.teacherId;
      if (teacherId) {
        await AsyncStorage.setItem("teacher_id", String(teacherId));
        await AsyncStorage.setItem("teacherId", String(teacherId));
      }
      
      const employeeId = data.user.employee_id ?? data.user.employeeId;
      if (employeeId) {
        await AsyncStorage.setItem("employee_id", String(employeeId));
        await AsyncStorage.setItem("employeeId", String(employeeId));
      }

      const userId = data.user.user_id ?? data.user.userId ?? data.user.id;
      if (userId) {
        await AsyncStorage.setItem("user_id", String(userId));
        await AsyncStorage.setItem("userId", String(userId));
      }

      const branchId = data.user.branch_id ?? data.user.branchId;
      if (branchId) {
        await AsyncStorage.setItem("branch_id", String(branchId));
        await AsyncStorage.setItem("branchId", String(branchId));
      }

      const studentId = data.user.student_id ?? data.user.studentId;
      if (studentId) {
        await AsyncStorage.setItem("student_id", String(studentId));
        await AsyncStorage.setItem("studentId", String(studentId));
      }
      
      const email = data.user.email;
      if (email) {
        await AsyncStorage.setItem("email", email);
      }

      const name = data.user.name ?? data.user.full_name ?? data.user.userName ?? data.user.user_name;
      if (name) {
        await AsyncStorage.setItem("user_name", name);
      }
    }
    
    const schoolCode = data.school_code ?? data.schoolCode ?? data.school_id;
    if (schoolCode) {
      await AsyncStorage.setItem("school_code", String(schoolCode));
      await AsyncStorage.setItem("schoolCode", String(schoolCode));
    }
    
    const branchId = data.branch_id ?? data.branchId;
    if (branchId) {
      await AsyncStorage.setItem("branch_id", String(branchId));
      await AsyncStorage.setItem("branchId", String(branchId));
    }
    
    const branchName = data.branch_name ?? data.branchName;
    if (branchName) {
      await AsyncStorage.setItem("branch_name", branchName);
    }
    
    const studentId = data.student_id ?? data.studentId;
    if (studentId) {
      await AsyncStorage.setItem("student_id", String(studentId));
      await AsyncStorage.setItem("studentId", String(studentId));
    }
    
    const rollNumber = data.roll_number ?? data.rollNumber;
    if (rollNumber) {
      await AsyncStorage.setItem("roll_number", String(rollNumber));
    }
    
    const parentId = data.parent_id ?? data.parentId;
    if (parentId) {
      await AsyncStorage.setItem("parent_id", String(parentId));
    }
    
    if (data.hm_email) {
      await AsyncStorage.setItem("hm_email", data.hm_email);
    }
    
    if (data.hm_employee_id) {
      await AsyncStorage.setItem("hm_employee_id", data.hm_employee_id);
    }
  } catch (error) {
    console.error("Error setting session data:", error);
  }
};

/* ================= CLASS TEACHER CHECK ================= */

export const isTeacherClassTeacher = async (): Promise<boolean> => {
  try {
    const user = await getStoredUser();

    if (typeof user?.is_class_teacher === "boolean") {
      return user.is_class_teacher;
    }

    const flag = await AsyncStorage.getItem("is_class_teacher");
    return flag === "1";
  } catch (error) {
    console.error("Error checking class teacher status:", error);
    return false;
  }
};

/* ================= ROUTE ACCESS ================= */

/**
 * Check if a teacher can access a specific route
 * Some routes are restricted to class teachers only
 * @param routeName - The route name to check access for
 * @returns true if accessible, false otherwise
 */
export const canAccessTeacherPath = async (routeName: string): Promise<boolean> => {
  const classTeacherOnlyRoutes = new Set([
    "Enroll",
    "Manage", 
    "LeaveApproval",
    "/teacher-dashboard/enroll",
    "/teacher-dashboard/manage",
    "/teacher-dashboard/leave-approval",
  ]);

  if (!classTeacherOnlyRoutes.has(routeName)) {
    return true;
  }

  return await isTeacherClassTeacher();
};

/**
 * Legacy version for web compatibility (kept for any remaining web code)
 * @deprecated Use canAccessTeacherPath instead
 */
export const canAccessTeacherPathLegacy = async (pathname: string): Promise<boolean> => {
  const classTeacherOnlyRoutes = new Set([
    "/teacher-dashboard/enroll",
    "/teacher-dashboard/manage",
    "/teacher-dashboard/leave-approval",
  ]);

  if (!classTeacherOnlyRoutes.has(pathname)) {
    return true;
  }

  return await isTeacherClassTeacher();
};

/* ================= CHECK AUTH STATUS ================= */

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem("token");
    const role = await getStoredRole();
    return !!(token && role);
  } catch (error) {
    console.error("Error checking auth status:", error);
    return false;
  }
};

/* ================= GET CURRENT BRANCH ================= */

export const getCurrentBranch = async (): Promise<{
  branch_id: string | null;
  branch_name: string | null;
  school_code: string | null;
}> => {
  try {
    const branch_id = await AsyncStorage.getItem("branch_id");
    const branch_name = await AsyncStorage.getItem("branch_name");
    const school_code = await AsyncStorage.getItem("school_code");
    
    return {
      branch_id,
      branch_name,
      school_code,
    };
  } catch (error) {
    console.error("Error getting current branch:", error);
    return {
      branch_id: null,
      branch_name: null,
      school_code: null,
    };
  }
};

/* ================= UPDATE USER DATA ================= */

export const updateUserData = async (updates: Record<string, any>): Promise<void> => {
  try {
    const currentUser = await getStoredUser();
    const updatedUser = { ...currentUser, ...updates };
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    
    // Update specific fields if they exist
    if (updates.is_class_teacher !== undefined) {
      await AsyncStorage.setItem("is_class_teacher", updates.is_class_teacher ? "1" : "0");
    }
    
    if (updates.email) {
      await AsyncStorage.setItem("email", updates.email);
    }
  } catch (error) {
    console.error("Error updating user data:", error);
  }
};

/* ================= LOGOUT ================= */

export const performLogout = async (navigation?: any) => {
  try {
    // 1. Clear explicit session keys
    await Promise.all(
      SESSION_KEYS.map((key) => AsyncStorage.removeItem(key))
    );

    // 2. Clear all cache keys related to user data across all roles
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToClear = allKeys.filter(key =>
      // Auth/Session keys
      key.includes("token") || 
      key.includes("session") || 
      key.includes("user") ||
      key === "is_class_teacher" ||
      key === "schoolCode" ||
      key === "branchId" ||
      key === "school_code" ||
      key === "branch_id" ||
      key === "employee_id" ||
      key === "student_id" ||
      key === "teacher_id" ||
      // Feature-specific caches (all versions to be safe)
      key.includes("_cache") ||
      key.includes("_state") ||
      key.includes("_prediction") ||
      key.includes("_image") ||
      key.includes("hm_") ||
      key.includes("principal_") ||
      key.includes("teacher_") ||
      key.includes("student_") ||
      key.includes("admin_")
    );
    
    // Explicitly KEEP app settings and login preferences (like school code if we want it to persist for next login)
    // But for a "clean" logout, we remove most everything except fundamental app settings
    const filteredKeys = keysToClear.filter(key =>
      key !== 'app_settings' &&
      key !== 'selected_country'
    );

    if (filteredKeys.length > 0) {
      await AsyncStorage.multiRemove(filteredKeys);
    }

    // Reset API state
    const { setAuthToken } = require('../services/api');
    setAuthToken(null);

    // Emit logout event for any listeners
    eventEmitter.emit('app-logout');

    // Reset navigation stack if navigation object is provided
    if (navigation && navigation.reset) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  } catch (err) {
    console.log("Logout error:", err);
  }
};

/* ================= CLEAR ALL STORAGE ================= */

export const clearAllStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
    console.log("All storage cleared successfully");
  } catch (error) {
    console.error("Error clearing storage:", error);
  }
};

/* ================= GET TOKEN ================= */

export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem("token");
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

/* ================= GET USER ROLE DETAILS ================= */

export const getUserRoleDetails = async (): Promise<{
  role: string;
  isClassTeacher: boolean;
  userId: string | null;
  email: string | null;
}> => {
  try {
    const role = await getStoredRole();
    const isClassTeacher = await isTeacherClassTeacher();
    const userId = await AsyncStorage.getItem("user_id");
    const email = await AsyncStorage.getItem("email");
    
    return {
      role,
      isClassTeacher,
      userId,
      email,
    };
  } catch (error) {
    console.error("Error getting user role details:", error);
    return {
      role: "",
      isClassTeacher: false,
      userId: null,
      email: null,
    };
  }
};