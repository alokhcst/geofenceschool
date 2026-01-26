# School Pickup Geofencing App - Setup Guide

## 🎉 Welcome!

Thank you for building the School Pickup Geofencing App! This guide will help you get started quickly.

## 📋 Table of Contents

1. [Quick Start (Development Mode)](#quick-start)
2. [Testing the App](#testing-the-app)
3. [Configuring Real School Locations](#configuring-schools)
4. [AWS Backend Setup](#aws-backend-setup)
5. [Building for Production](#building-for-production)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start (Development Mode)

The app is configured to run in **MOCK MODE** by default, so you can test it without AWS infrastructure.

### 1. Install Dependencies

Already done! If you need to reinstall:

```bash
npm install
```

### 2. Start the Development Server

```bash
npx expo start
```

### 3. Run on Your Device

**Option A: Using Expo Go (Easiest)**
1. Install [Expo Go](https://expo.dev/client) from the App Store (iOS) or Play Store (Android)
2. Scan the QR code displayed in your terminal
3. The app will load on your device

**Option B: Using Android Emulator**
1. Start Android Studio and launch an emulator
2. Press `a` in the terminal running Expo

**Option C: Using iOS Simulator (Mac only)**
1. Press `i` in the terminal running Expo

---

## 🧪 Testing the App

### Mock Mode Features

In mock mode, you can test all features without AWS:

1. **Login**: Use any email/password
2. **Add Student**: Add mock student information
3. **Location Monitoring**: Works with your actual GPS location
4. **Generate QR Code**: Creates a test QR code
5. **Geofencing**: Monitors real location but uses mock school coordinates

### Test Flow

1. **Launch app** → Auto-redirects to login
2. **Sign in** with any credentials (mock@example.com / password123)
3. **Complete profile** → Add student info
4. **Home screen** → Start location monitoring
5. **Check location** → Test if near "school" (uses mock coordinates)
6. **Generate pickup code** → Tap "Show Pickup Code"
7. **View QR code** → Full screen QR with 15-minute timer

---

## 📍 Configuring Real School Locations

To use actual school locations:

### 1. Get School Coordinates

Find the latitude/longitude for your school:
- Use [Google Maps](https://maps.google.com)
- Right-click on the school location
- Click "What's here?"
- Copy the coordinates (e.g., 37.7749, -122.4194)

### 2. Update Configuration

Edit `config/aws-config.ts`:

```typescript
export const SCHOOLS = [
  {
    id: 'school-1',
    name: 'Your School Name',
    address: '123 Main St, City, State',
    geofence: {
      latitude: 37.7749,  // ← Your school's latitude
      longitude: -122.4194, // ← Your school's longitude
      radius: 200, // Geofence radius in meters (200m = ~650 feet)
    },
    pickupTimes: [
      { start: '14:30', end: '15:30', label: 'Regular Pickup' },
      { start: '12:00', end: '12:30', label: 'Early Dismissal' },
    ],
  },
  // Add more schools here
];
```

### 3. Restart the App

```bash
# Press Ctrl+C to stop, then restart
npx expo start
```

---

## ☁️ AWS Backend Setup

To enable full functionality with real authentication and data persistence:

### 1. Set Up AWS Account

1. Create an [AWS Account](https://aws.amazon.com)
2. Install [AWS CLI](https://aws.amazon.com/cli/)
3. Configure AWS credentials:
   ```bash
   aws configure
   ```

### 2. Follow AWS Setup Guide

Refer to the detailed guide: [aws/README.md](./aws/README.md)

Key steps:
- ✅ Create Cognito User Pool
- ✅ Configure Google OAuth
- ✅ Create DynamoDB tables
- ✅ Deploy Lambda functions
- ✅ Set up API Gateway
- ✅ Configure SNS for notifications

### 3. Update App Configuration

After AWS setup, update `config/aws-config.ts`:

```typescript
// Change this to false to use real AWS
export const USE_MOCK_MODE = false;

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_XXXXXXXXX', // From Cognito
      userPoolClientId: 'XXXXXXXXXX', // From Cognito
      identityPoolId: 'us-east-1:XXXXX', // From Cognito
      // ... (other config)
    },
  },
  API: {
    REST: {
      GeofenceAPI: {
        endpoint: 'https://XXXXX.execute-api.us-east-1.amazonaws.com/prod',
        region: 'us-east-1',
      },
    },
  },
};
```

---

## 📱 Building for Production

### Android Build

```bash
# Build APK for Android
npx expo build:android

# Or create production build with EAS
npx eas build --platform android
```

### iOS Build (Mac only)

```bash
# Build for iOS
npx expo build:ios

# Or create production build with EAS
npx eas build --platform ios
```

### Configure app.json for Production

Update `app.json`:

```json
{
  "expo": {
    "name": "School Pickup",
    "version": "1.0.0",
    "android": {
      "package": "com.yourcompany.geofenceschool",
      "versionCode": 1
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.geofenceschool",
      "buildNumber": "1.0.0"
    }
  }
}
```

---

## 🐛 Troubleshooting

### Location Permission Error

**Error**: `Not authorized to use location services`

**Solution**:
1. Grant location permissions when prompted
2. Android: Settings → Apps → School Pickup → Permissions → Location → Allow all the time
3. iOS: Settings → School Pickup → Location → Always

### App Not Loading / 500 Error

**Solution**:
```bash
# Clear cache and restart
npx expo start --clear
```

### QR Code Not Displaying

**Check**:
- `expo-brightness` is installed
- `react-native-qrcode-svg` is installed
- Device has camera permissions

### Geofencing Not Working

**Check**:
1. Location permissions granted
2. GPS enabled on device
3. Test outdoors (GPS works better outside)
4. Verify school coordinates in config

### Push Notifications Not Working

**Check**:
1. Notification permissions granted
2. Using physical device (not emulator)
3. Expo push token registered
4. Check console for token

### Cannot Connect to API

**Check**:
1. API endpoint URL is correct in `config/aws-config.ts`
2. API Gateway is deployed
3. Cognito authorizer is configured
4. Check network connection

---

## 📚 Additional Resources

- **Expo Documentation**: https://docs.expo.dev
- **React Native**: https://reactnative.dev
- **AWS Documentation**: https://docs.aws.amazon.com
- **Geofencing Guide**: https://docs.expo.dev/versions/latest/sdk/location/

---

## 🎯 Next Steps

1. ✅ Test the app in mock mode
2. ✅ Configure your real school locations
3. ✅ Set up AWS backend (optional for now)
4. ✅ Test geofencing at actual school location
5. ✅ Build and deploy to app stores

---

## 💡 Tips

- **Start Simple**: Use mock mode first to test functionality
- **Test Outdoors**: GPS accuracy is better outside buildings
- **Adjust Radius**: Start with 200m radius and adjust based on pickup area size
- **Battery**: Background location monitoring uses battery - inform users
- **Privacy**: Be transparent about location tracking in your privacy policy

---

## 📞 Support

For questions or issues:
- Check [Troubleshooting](#troubleshooting) section
- Review AWS setup guide: [aws/README.md](./aws/README.md)
- Expo forums: https://forums.expo.dev
- AWS forums: https://forums.aws.amazon.com

---

## 🎊 You're All Set!

Your School Pickup Geofencing App is ready to use! Start with mock mode, test the features, then configure AWS backend when ready for production.

**Happy coding! 🚀**

