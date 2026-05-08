# Firebase Cloud Messaging (FCM) Setup Guide for AttendX

## Overview
This guide explains how to set up Firebase Cloud Messaging so that notifications appear on users' lock screens and home screens, even when the AttendX app is closed.

---

## Part 1: Firebase Console Setup (One-Time)

### Step 1: Create or Select Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Cloud Messaging API

### Step 2: Generate Server Key (Backend Needs This)
1. In Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file securely on your backend server
4. Backend will use this to authenticate when sending messages

---

## Part 2: Android Setup

### Step 1: Generate `google-services.json`
1. In Firebase Console → Project Settings → Your Apps
2. Select/Create Android app with package name: `com.visys.attendx`
3. Download `google-services.json`
4. **Place in**: `android/app/google-services.json`
5. **IMPORTANT**: Add to `.gitignore` (never commit to repo)

### Step 2: Enable Google Services Plugin
Already configured in `android/build.gradle`:
```gradle
classpath("com.google.gms:google-services:4.4.2")
```

The plugin is already applied in `android/app/build.gradle` (just verify):
```gradle
apply plugin: "com.google.gms.google-services"
```

### Step 3: Verify AndroidManifest.xml
```xml
<!-- Already present in android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Step 4: Rebuild Android
```bash
# Clean rebuild
cd android
./gradlew clean
./gradlew build
cd ..

# Run on device
npm run android
```

---

## Part 3: iOS Setup

### Step 1: Generate `GoogleService-Info.plist`
1. In Firebase Console → Project Settings → Your Apps
2. Select/Create iOS app with bundle ID: `com.visys.attendx`
3. Download `GoogleService-Info.plist`
4. In Xcode → Drag into project root (check "Copy items if needed")
5. Ensure it's added to AttendX target

### Step 2: Enable Push Capabilities
1. Xcode → AttendX target → Signing & Capabilities
2. Click "+ Capability"
3. Add "Push Notifications"
4. Add "Background Modes" → Check "Remote notifications"

### Step 3: Upload APNs Certificate
1. Apple Developer Portal → Certificates
2. Create APNs certificate
3. Download and upload to Firebase Console

### Step 4: Rebuild iOS
```bash
cd ios
pod install
cd ..

npm run ios
```

---

## Part 4: Backend Integration

### Sending Notifications via Firebase Admin SDK

Your FastAPI backend should use Firebase Admin SDK to send messages:

#### Python Example (FastAPI)
```python
import firebase_admin
from firebase_admin import credentials, messaging

# Initialize (do once at startup)
cred = credentials.Certificate("path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred)

async def send_notification_to_user(user_fcm_token: str, title: str, body: str):
    """Send a notification to a specific user device"""
    
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        webpush=messaging.WebpushConfig(
            data={
                "title": title,
                "body": body,
                "notificationId": "123",
                "click_action": "FLUTTER_NOTIFICATION_CLICK",
            }
        ),
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                title=title,
                body=body,
                sound="default",
                click_action="FLUTTER_NOTIFICATION_CLICK",
            ),
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    alert=messaging.ApsAlert(title=title, body=body),
                    sound="default",
                    badge=1,
                    content_available=True,
                    mutable_content=True,
                    custom_data={
                        "title": title,
                        "body": body,
                        "notificationId": "123",
                    }
                )
            )
        ),
    )
    
    try:
        response = messaging.send_multicast(message, tokens=[user_fcm_token])
        print(f"Message sent successfully: {response.succesful}")
        return True
    except Exception as e:
        print(f"Failed to send message: {e}")
        return False
```

### Endpoint to Send Notifications

```python
@app.post("/api/notifications/send")
async def send_notification(
    school_code: str = Header(...),
    recipient_user_id: str,
    title: str,
    body: str,
    data: dict = None,
):
    """Send a notification to a specific user"""
    
    # 1. Get user's FCM token from database
    user = await db.get_user(recipient_user_id, school_code)
    if not user or not user.fcm_token:
        return {"error": "User or FCM token not found"}
    
    # 2. Send via Firebase
    success = await send_notification_to_user(
        user.fcm_token,
        title,
        body,
        data
    )
    
    # 3. Store notification in database
    if success:
        await db.create_notification(
            school_code=school_code,
            user_id=recipient_user_id,
            title=title,
            body=body,
            data=data,
        )
    
    return {"success": success}
```

### Store Device Tokens in Database

When user logs in, send their FCM token:

```python
# Frontend (already done in App.tsx)
const fcmToken = await notificationService.getFcmToken();
// Send to backend during login or profile update

# Backend: Save token
@app.post("/api/auth/register-device")
async def register_device_token(
    user_id: str,
    fcm_token: str,
    school_code: str = Header(...),
):
    """Save user's FCM token for push notifications"""
    await db.save_fcm_token(school_code, user_id, fcm_token)
    return {"success": True}
```

---

## Part 5: Testing Push Notifications

### Option 1: Firebase Console (Easiest)
1. Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Fill title, body
4. Select "Single device"
5. Paste the FCM token from AsyncStorage (logged in console)
6. Click Send

### Option 2: Send from Backend
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Content-Type: application/json" \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -d '{
    "to": "DEVICE_TOKEN_HERE",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test message",
      "sound": "default",
      "click_action": "FLUTTER_NOTIFICATION_CLICK"
    }
  }'
```

---

## Part 6: Troubleshooting

### Notification Not Appearing

| Symptom | Cause | Fix |
|---------|-------|-----|
| No notification on lock screen | APP_NOT_CONFIGURED or wrong priority | Verify google-services.json in correct location |
| Notification only shows when app open | Background handler not registered | Check index.js for setBackgroundMessageHandler |
| Permission denied error | User denied notification permission | App will ask again if permissions denied |
| Token undefined or empty | FCM not initialized | Rebuild after adding google-services.json |
| On Xiaomi/Samsung only: No notifications | Battery optimization killing app | Ask user to disable battery optimization in settings |

### Checking Device Token

1. Run app on device
2. Open console/logs
3. Look for: `[FCM] Device token: exzxzx...`
4. Use that token to send test notifications

### Verify Firebase Initialization

In Android Logcat, look for:
```
I/FA: App measurement initialized, version: 50900
I/Fabric: Firebase Analytics initialization complete
```

---

## Part 7: Important Notes

### Security
- Never commit `google-services.json` or `GoogleService-Info.plist` to repo
- Never hardcode Server Keys in frontend
- Always send messages from backend with Server Key authentication

### Data Privacy
- FCM tokens are device-specific, not tied to user account
- If user logs out, generate new token on next login
- Store tokens with user+device+school scope

### Battery Impact
- FCM messages are optimized for battery
- Local polling fallback still active (checks every 10 seconds)
- Disable polling once backend sends push messages reliably

### Compliance
- Users must be able to opt-out of notifications
- Honor system notification settings (Do Not Disturb, etc.)
- Test with actual user devices to verify behavior

---

## Rollout Checklist

- [ ] Firebase project created and configured
- [ ] `google-services.json` generated and placed in `android/app/`
- [ ] `GoogleService-Info.plist` generated and added to Xcode
- [ ] APNs certificate uploaded to Firebase (iOS)
- [ ] Backend updated to send Firebase messages
- [ ] Backend endpoint to register FCM tokens implemented
- [ ] Test notification sent successfully
- [ ] Notification appears on lock screen when app is closed
- [ ] User can tap notification to open app
- [ ] Battery optimization disabled on test devices
- [ ] Verified with both Android and iOS devices

---

## Reference Documentation

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase Docs](https://rnfirebase.io/messaging/usage)
- [Notifee Documentation](https://notifee.app/)
- [Android Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)

