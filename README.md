# AttendX React Native App

**Last updated:** 2026-07-13


AttendX is a React Native CLI project with Android and iOS targets.

## Run Locally

```sh
npm install
npm start
```

In another terminal:

```sh
npm run android
```

or

```sh
npm run ios
```

For iOS pods:

```sh
cd ios
bundle install
bundle exec pod install
cd ..
```

## Full App Structure (All Tracked Files)

This list is generated from the repository tracked files (`git ls-files`) so no tracked file is missed.

```text
.bundle/config
.eslintrc.js
.gitignore
.prettierrc.js
.watchmanconfig
App.tsx
Gemfile
Gemfile.lock
README.md
__tests__/App.test.tsx
android/app/build.gradle
android/app/debug.keystore
android/app/proguard-rules.pro
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/attendx/MainActivity.kt
android/app/src/main/java/com/attendx/MainApplication.kt
android/app/src/main/res/drawable/rn_edit_text_material.xml
android/app/src/main/res/mipmap-hdpi/ic_launcher.png
android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-mdpi/ic_launcher.png
android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
android/app/src/main/res/values/strings.xml
android/app/src/main/res/values/styles.xml
android/build.gradle
android/gradle.properties
android/gradle/wrapper/gradle-wrapper.jar
android/gradle/wrapper/gradle-wrapper.properties
android/gradlew
android/gradlew.bat
android/settings.gradle
app.json
babel.config.js
index.js
ios/.xcode.env
ios/AttendX.xcodeproj/project.pbxproj
ios/AttendX.xcodeproj/xcshareddata/xcschemes/AttendX.xcscheme
ios/AttendX.xcworkspace/contents.xcworkspacedata
ios/AttendX/AppDelegate.swift
ios/AttendX/Images.xcassets/AppIcon.appiconset/Contents.json
ios/AttendX/Images.xcassets/Contents.json
ios/AttendX/Info.plist
ios/AttendX/LaunchScreen.storyboard
ios/AttendX/PrivacyInfo.xcprivacy
ios/Podfile
ios/Podfile.lock
jest.config.js
jest.setup.js
metro.config.js
package-lock.json
package.json
src/api/authService.ts
src/api/client.ts
src/api/studentService.ts
src/assets/logo.png
src/components/RoleCard.tsx
src/components/ScreenContainer.tsx
src/components/common/AppButton.tsx
src/components/common/AppCard.tsx
src/components/common/AppInput.tsx
src/components/common/AppText.tsx
src/components/common/Header.tsx
src/components/common/Loader.tsx
src/constants/colors.ts
src/constants/config.ts
src/constants/roles.ts
src/constants/routes.ts
src/constants/theme.ts
src/context/AuthContext.tsx
src/hooks/useApi.ts
src/hooks/useAuth.ts
src/navigation/AccountantStack.tsx
src/navigation/AdminStack.tsx
src/navigation/AppNavigator.tsx
src/navigation/AuthStack.tsx
src/navigation/HMStack.tsx
src/navigation/MainStack.tsx
src/navigation/MainTabs.tsx
src/navigation/PrincipalStack.tsx
src/navigation/StudentStack.tsx
src/navigation/TeacherStack.tsx
src/navigation/stacks/AccountantStack.tsx
src/navigation/stacks/AdminStack.tsx
src/navigation/stacks/HMStack.tsx
src/navigation/stacks/PrincipalStack.tsx
src/navigation/stacks/StudentStack.tsx
src/navigation/stacks/TeacherStack.tsx
src/navigation/stacks/VisitorStack.tsx
src/navigation/types.ts
src/screens/accountant/AccountantDashboardScreen.tsx
src/screens/accountant/ExpenseScreen.tsx
src/screens/accountant/FeeManagementScreen.tsx
src/screens/accountant/PaymentEntryScreen.tsx
src/screens/accountant/PayrollScreen.tsx
src/screens/accountant/ReportsScreen.tsx
src/screens/accountant/SettingsScreen.tsx
src/screens/admin/AdminDashboardScreen.tsx
src/screens/admin/NotificationManagerScreen.tsx
src/screens/admin/SchoolDetailsScreen.tsx
src/screens/admin/SettingsScreen.tsx
src/screens/auth/ForgotPasswordScreen.tsx
src/screens/auth/LoginScreen.tsx
src/screens/auth/RegisterSchoolScreen.tsx
src/screens/auth/ResetPasswordScreen.tsx
src/screens/auth/VerifyOtpScreen.tsx
src/screens/common/LoadingScreen.tsx
src/screens/common/NotificationsScreen.tsx
src/screens/common/ProfileScreen.tsx
src/screens/hm/AnnouncementsScreen.tsx
src/screens/hm/AttendanceScreen.tsx
src/screens/hm/ExamsScreen.tsx
src/screens/hm/ExpenseScreen.tsx
src/screens/hm/FeeManagementScreen.tsx
src/screens/hm/HMDashboardScreen.tsx
src/screens/hm/ReportsScreen.tsx
src/screens/hm/SettingsScreen.tsx
src/screens/hm/StudentManagementScreen.tsx
src/screens/hm/TeacherManagementScreen.tsx
src/screens/principal/BranchDetailsScreen.tsx
src/screens/principal/HMRegistrationScreen.tsx
src/screens/principal/PrincipalDashboardScreen.tsx
src/screens/student/AttendanceScreen.tsx
src/screens/student/FeeScreen.tsx
src/screens/student/HomeworkScreen.tsx
src/screens/student/LeaveScreen.tsx
src/screens/student/MarksScreen.tsx
src/screens/student/StudentAttendanceScreen.tsx
src/screens/student/StudentDashboardScreen.tsx
src/screens/student/StudentFeeScreen.tsx
src/screens/student/StudentMarksScreen.tsx
src/screens/teacher/AttendanceScreen.tsx
src/screens/teacher/HomeworkScreen.tsx
src/screens/teacher/LeaveApprovalScreen.tsx
src/screens/teacher/LeaveRequestScreen.tsx
src/screens/teacher/MarksEntryScreen.tsx
src/screens/teacher/SkinDiseaseScreen.tsx
src/screens/teacher/StudentListScreen.tsx
src/screens/teacher/TeacherDashboardScreen.tsx
src/screens/teacher/VitalScanScreen.tsx
src/screens/visitor/VisitorDashboardScreen.tsx
src/services/adminService.ts
src/services/api.ts
src/services/authService.ts
src/services/studentService.ts
src/services/teacherService.ts
src/services/visitorService.ts
src/theme/theme.ts
src/types/api.types.ts
src/types/auth.types.ts
src/types/navigation.types.ts
src/utils/helpers.ts
src/utils/roleMapper.ts
src/utils/storage.ts
src/utils/validators.ts
tsconfig.json
```

**Last backup:** 2026-07-13 17:52:36
