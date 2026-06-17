// utils/authSession.ts - React Native version with navigation support

import AsyncStorage from "@react-native-async-storage/async-storage";
import eventEmitter from "./eventEmitter";
import { safeJsonParse } from "./storage";

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
  "roll_no",
  "parent_id",
  "teacher_id",
  "employee_id",
  "email",
  "director_email",
  "director_employee_id",
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
    return safeJsonParse(user, {}, () => {
      AsyncStorage.setItem("user", JSON.stringify({})).catch(() => {});
    });
  } catch {
    return {};
  }
};

/* ================= SET SESSION DATA ================= */

/* ================= SET SESSION DATA ================= */

export const setSessionData = async (data: any) => {
  try {
    // Collect all key-value pairs to store
    const storageOps: Array<[string, string]> = [];
    
    // Role
    const role = data.role || data.userRole;
    if (role) {
      storageOps.push(["userRole", role]);
      storageOps.push(["role", role]);
    }
    
    // Token
    const token = data.token || data.accessToken || data.access_token;
    if (token) {
      storageOps.push(["token", token]);
    }
    
    // User object
    if (data.user) {
      storageOps.push(["user", JSON.stringify(data.user)]);
      
      // Extract additional fields from user object (handle both snake_case and camelCase)
      const isClassTeacher = data.user.is_class_teacher ?? data.user.isClassTeacher;
      if (isClassTeacher !== undefined) {
        storageOps.push(["is_class_teacher", isClassTeacher ? "1" : "0"]);
      }
      
      const teacherId = data.user.teacher_id ?? data.user.teacherId;
      if (teacherId) {
        storageOps.push(["teacher_id", String(teacherId)]);
        storageOps.push(["teacherId", String(teacherId)]);
      }
      
      const employeeId = data.user.employee_id ?? data.user.employeeId ?? data.user.principal_employee_id;
      if (employeeId) {
        storageOps.push(["employee_id", String(employeeId)]);
        storageOps.push(["employeeId", String(employeeId)]);
      }

      if (data.user.principal_employee_id) {
        storageOps.push(["principal_employee_id", String(data.user.principal_employee_id)]);
      }

      const userId = data.user.user_id ?? data.user.userId ?? data.user.id;
      if (userId) {
        storageOps.push(["user_id", String(userId)]);
        storageOps.push(["userId", String(userId)]);
      }

      const branchId = data.user.branch_id ?? data.user.branchId;
      if (branchId) {
        storageOps.push(["branch_id", String(branchId)]);
        storageOps.push(["branchId", String(branchId)]);
      }

      const studentId = data.user.student_id ?? data.user.studentId;
      if (studentId) {
        storageOps.push(["student_id", String(studentId)]);
        storageOps.push(["studentId", String(studentId)]);
      }
      
      const email = data.user.email ?? data.user.principal_email;
      if (email) {
        storageOps.push(["email", email]);
      }

      if (data.user.principal_email) {
        storageOps.push(["principal_email", data.user.principal_email]);
      }

      if (data.user.principal_address) {
        storageOps.push(["principal_address", data.user.principal_address]);
        storageOps.push(["address", data.user.principal_address]);
      }

      const name = data.user.name ?? data.user.full_name ?? data.user.userName ?? data.user.user_name;
      if (name) {
        storageOps.push(["user_name", name]);
      }
    }
    
    // School code
    const schoolCode = data.school_code ?? data.schoolCode ?? data.school_id;
    if (schoolCode) {
      storageOps.push(["school_code", String(schoolCode)]);
      storageOps.push(["schoolCode", String(schoolCode)]);
    }

    const schoolName = data.school_name ?? data.schoolName;
    if (schoolName) {
      storageOps.push(["school_name", String(schoolName)]);
      storageOps.push(["schoolName", String(schoolName)]);
    }
    
    // Branch ID
    const branchId = data.branch_id ?? data.branchId;
    if (branchId) {
      storageOps.push(["branch_id", String(branchId)]);
      storageOps.push(["branchId", String(branchId)]);
    }
    
    // Branch name
    const branchName = data.branch_name ?? data.branchName;
    if (branchName) {
      storageOps.push(["branch_name", branchName]);
    }

    // Blood group
    const bloodGroup = data.user?.blood_group ?? data.user?.bloodGroup ?? data.blood_group ?? data.bloodGroup;
    if (bloodGroup) {
      storageOps.push(["blood_group", String(bloodGroup)]);
    }
    
    // Roll number
    const rollNumber = data.roll_number ?? data.rollNumber ?? data.roll_no ?? data.rollNo ?? data.user?.roll_no ?? data.user?.rollNo;
    if (rollNumber) {
      storageOps.push(["roll_no", String(rollNumber)]);
      storageOps.push(["roll_number", String(rollNumber)]);
      // Fallback student_id to roll_no if missing
      if (!storageOps.some(([k]) => k === "student_id")) {
        storageOps.push(["student_id", String(rollNumber)]);
        storageOps.push(["studentId", String(rollNumber)]);
      }
    }
    
    // Student ID (from root data, not just user)
    const studentId = data.student_id ?? data.studentId;
    if (studentId) {
      if (!storageOps.some(([k]) => k === "student_id")) {
        storageOps.push(["student_id", String(studentId)]);
        storageOps.push(["studentId", String(studentId)]);
      }
      // Fallback roll_no to student_id if missing
      if (!storageOps.some(([k]) => k === "roll_no")) {
        storageOps.push(["roll_no", String(studentId)]);
        storageOps.push(["roll_number", String(studentId)]);
      }
    }
    
    // Parent ID
    const parentId = data.parent_id ?? data.parentId;
    if (parentId) {
      storageOps.push(["parent_id", String(parentId)]);
    }
    
    // Director-specific fields
    if (data.director_email) {
      storageOps.push(["director_email", data.director_email]);
    }
    
    if (data.director_employee_id) {
      storageOps.push(["director_employee_id", data.director_employee_id]);
    }
    
    // Use multiSet for much faster parallel storage operations
    // This reduces ~20 sequential operations to ~1-2 network calls
    if (storageOps.length > 0) {
      await AsyncStorage.multiSet(storageOps);
      console.log(`[setSessionData] Stored ${storageOps.length} values using multiSet (parallel)`);
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
      key.includes("director_") ||
      key.includes("director_") ||
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