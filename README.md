# 🎒 School Pickup Geofencing App

A secure, modern React Native mobile application that revolutionizes school pickup operations using geofencing technology, automated notifications, and QR code authentication.

---

## 📖 Project Overview

The **School Pickup Geofencing App** is a comprehensive mobile solution designed to streamline and secure the school pickup process. Using real-time location tracking and geofencing technology, the app automatically detects when authorized parents/guardians approach the school pickup area and generates secure, time-limited QR codes for staff verification.

### 🎯 Value Proposition

#### For Parents & Guardians:
- **🚗 Hands-Free Experience**: Automatic notifications when approaching school
- **⚡ Faster Pickup**: Pre-generated QR codes eliminate wait times
- **🔒 Secure**: Encrypted, time-limited, one-time use authorization tokens
- **📱 Simple**: One-tap code generation with intuitive interface
- **🌍 Multi-School**: Support for multiple children at different schools

#### For Schools:
- **🛡️ Enhanced Security**: Verify authorized pickups instantly
- **⏱️ Reduced Congestion**: Faster processing reduces pickup line times
- **📊 Digital Records**: Automated logging of all pickup events
- **👥 Staff Efficiency**: Quick QR code scanning vs. manual ID checks
- **📍 Geo-Awareness**: Track pickup patterns and optimize procedures

#### For School Districts:
- **💰 Cost Effective**: Reduces administrative overhead
- **📈 Scalable**: Easy deployment across multiple schools
- **🔐 Compliance**: Digital audit trails for safety protocols
- **☁️ Cloud-Based**: No on-premise infrastructure required

---

## 🔄 Process Flow

### 1. **Initial Setup**
```
User Downloads App → Sign Up (Email/Google) → Add Student Info → 
Add Vehicle Details → Receive Approval → Setup Complete
```

### 2. **Daily Pickup Flow**
```
┌─────────────────────────────────────────────────────────────┐
│ 1. APPROACH SCHOOL                                          │
│    Parent drives toward school with app running             │
│    GPS continuously monitors location                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ENTER GEOFENCE                                           │
│    App detects entry into 200m radius geofence              │
│    Verifies authorization for current date/time             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. NOTIFICATION                                             │
│    Push notification: "You're approaching school"           │
│    Action button: "Show Pickup Code"                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. GENERATE QR CODE                                         │
│    User taps notification or app button                     │
│    Secure token generated with:                             │
│    - User ID, Student ID, School ID                         │
│    - Timestamp, Digital Signature                           │
│    - 15-minute expiration                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. DISPLAY CODE                                             │
│    Full-screen QR code with:                                │
│    - High contrast for easy scanning                        │
│    - Auto-brightness boost                                  │
│    - Countdown timer                                        │
│    - Student information                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. STAFF VERIFICATION                                       │
│    School staff scans QR code                               │
│    Backend validates:                                       │
│    - Token not expired                                      │
│    - Not previously used                                    │
│    - Valid signature                                        │
│    - Authorized for current time                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. APPROVAL & PICKUP                                        │
│    Staff sees: Student name, grade, vehicle info            │
│    Confirms identity match                                  │
│    Token marked as "used" in database                       │
│    Student released to parent                               │
└─────────────────────────────────────────────────────────────┘
```

### 3. **Security & Validation**
```
Token Generation → Cryptographic Signing → Time Stamping → 
Backend Registration → QR Encoding → Display → 
Scan → Backend Validation → One-Time Use Mark → Complete
```

---

## 🛠️ Tech Stack

### **Mobile Application**

#### Frontend Framework
- **React Native** - Cross-platform mobile development
- **Expo SDK 54** - Development framework and tools
- **TypeScript** - Type-safe JavaScript
- **Expo Router 6** - File-based navigation

#### Location & Geofencing
- **expo-location** - GPS tracking and geofencing
- **expo-task-manager** - Background location updates
- Real-time distance calculation (Haversine formula)
- Foreground & background monitoring support

#### Authentication
- **AWS Amplify** - AWS services integration
- **amazon-cognito-identity-js** - User authentication
- **@aws-amplify/react-native** - Native integration
- Google OAuth via Cognito federated identities

#### Notifications
- **expo-notifications** - Push notifications
- **Expo Push Service** - Notification delivery
- Custom notification handlers
- Action buttons and categories

#### QR Code System
- **react-native-qrcode-svg** - QR code generation
- **react-native-svg** - SVG rendering
- **expo-camera** - QR code scanning (scanner app)
- **expo-brightness** - Screen brightness control
- **base-64** - Base64 encoding/decoding

#### State & Storage
- **@react-native-async-storage/async-storage** - Local persistence
- React Hooks (useState, useEffect) - State management
- Service layer architecture - Business logic separation

#### UI/UX
- **React Navigation** - Navigation system
- **expo-haptics** - Haptic feedback
- Material Design principles
- Responsive layouts

### **Backend Infrastructure (AWS)**

#### Authentication & Authorization
- **AWS Cognito User Pools** - User management
- **AWS Cognito Identity Pools** - Federated identities
- Google OAuth 2.0 integration
- JWT token-based authentication

#### API Layer
- **Amazon API Gateway** - REST API endpoints
- Cognito authorizer integration
- CORS configuration
- Rate limiting & throttling

#### Serverless Functions
- **AWS Lambda** (Node.js 18.x) - Business logic
  - Token generation function
  - Token validation function
  - Schedule verification function
  - User profile management
  - Geofence configuration

#### Database
- **Amazon DynamoDB** - NoSQL database
  - Users table (profile data)
  - Students table (student info)
  - Schools table (school details & geofences)
  - Schedules table (pickup schedules)
  - Tokens table (with TTL for auto-expiration)
- On-demand capacity mode
- Global secondary indexes

#### Push Notifications
- **Amazon SNS** - Push notification service
- Platform applications (APNS & FCM)
- Topic-based notifications
- Integration with Expo Push Service

#### Security & Secrets
- **AWS Secrets Manager** - Secure credential storage
- **AWS IAM** - Role-based access control
- Encryption at rest and in transit
- Token cryptographic signing

#### Monitoring & Logging
- **Amazon CloudWatch** - Centralized logging
- CloudWatch Dashboards - Metrics visualization
- CloudWatch Alarms - Alert system
- X-Ray tracing (optional)

#### Storage (Optional)
- **Amazon S3** - Profile pictures, school assets
- CloudFront CDN for content delivery

### **Development & Deployment**

#### Development Tools
- **Expo CLI** - Development server
- **Expo Go** - Testing on devices
- **EAS Build** - Production builds
- **EAS Submit** - App store submission

#### Code Quality
- **ESLint** - Code linting
- **TypeScript** - Type checking
- **Prettier** - Code formatting (optional)

#### Version Control & CI/CD
- **Git** - Source control
- **GitHub Actions** / **AWS CodePipeline** - CI/CD
- **AWS CloudFormation** / **AWS CDK** - Infrastructure as Code

#### API Client
- **Axios** - HTTP client
- Request/response interceptors
- Token refresh logic
- Error handling

---

## 📁 Project Structure

```
geofenceschool/
├── app/                          # Application screens
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── index.tsx            # Home screen with dashboard
│   │   └── explore.tsx          # Additional features
│   ├── auth/                     # Authentication flows
│   │   ├── login.tsx            # Login screen
│   │   ├── signup.tsx           # Registration screen
│   │   └── profile-setup.tsx    # Profile completion
│   ├── index.tsx                # Auth check & routing
│   ├── pickup.tsx               # QR code generation
│   └── _layout.tsx              # Root navigation
│
├── services/                     # Business logic layer
│   ├── auth.service.ts          # Authentication service
│   ├── geofencing.service.ts    # Geofencing logic
│   ├── notification.service.ts  # Notification handling
│   ├── token.service.ts         # Token generation/validation
│   └── api.service.ts           # Backend API client
│
├── components/                   # Reusable UI components
│   ├── qr-code-display.tsx      # QR code viewer
│   ├── user-menu.tsx            # User dropdown menu
│   └── ... (themed components)
│
├── config/                       # Configuration
│   └── aws-config.ts            # AWS & app configuration
│
├── types/                        # TypeScript definitions
│   └── base-64.d.ts             # Type declarations
│
├── aws/                          # Backend infrastructure
│   └── README.md                # AWS setup guide
│
├── assets/                       # Static assets
│   ├── images/                  # App icons & images
│   └── sounds/                  # Notification sounds
│
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
├── tsconfig.json                # TypeScript config
├── README.md                     # This file
├── SETUP.md                      # Setup instructions
├── PROJECT_SUMMARY.md            # Complete project summary
└── requirements.md               # Detailed requirements
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Physical device with Expo Go app (recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd geofenceschool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on your device**
   - **Expo Go**: Scan the QR code with Expo Go app
   - **Android**: Press `a` in terminal
   - **iOS**: Press `i` in terminal (Mac only)

### Quick Test (Mock Mode)

The app runs in mock mode by default (no AWS required):

1. Launch the app
2. Login with any credentials (e.g., test@test.com / password)
3. Complete profile setup with student info
4. Test location monitoring and QR code generation

---

## 🎨 Key Features

✅ **Authentication** - Email/password & Google OAuth  
✅ **Geofencing** - Real-time location monitoring  
✅ **Auto-Notifications** - Alerts when approaching school  
✅ **QR Codes** - Secure, time-limited pickup authorization  
✅ **Background Monitoring** - Works when app is closed  
✅ **Multi-School Support** - Multiple children at different schools  
✅ **User Profile** - Student & vehicle information management  
✅ **Mock Mode** - Test without AWS backend  
✅ **Security** - Encrypted tokens with expiration  
✅ **Modern UI** - Intuitive, accessible design

---

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide with troubleshooting
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Detailed project overview
- **[aws/README.md](./aws/README.md)** - AWS infrastructure setup
- **[requirements.md](./requirements.md)** - Original requirements document

---

## 🔧 Configuration

### School Locations

Edit `config/aws-config.ts` to configure school geofences:

```typescript
export const SCHOOLS = [
  {
    id: 'school-1',
    name: 'Your School Name',
    address: 'School Address',
    geofence: {
      latitude: 37.7749,   // School GPS coordinates
      longitude: -122.4194,
      radius: 200,         // Geofence radius in meters
    },
    pickupTimes: [
      { start: '14:30', end: '15:30', label: 'Regular Pickup' },
    ],
  },
];
```

### AWS Backend

To enable production mode:

1. Set up AWS infrastructure (see `aws/README.md`)
2. Update `config/aws-config.ts` with AWS credentials
3. Set `USE_MOCK_MODE = false`

---

## 🏗️ Building for Production

### Android
```bash
npx eas build --platform android
```

### iOS
```bash
npx eas build --platform ios
```

---

## 💰 Cost Estimation

For **500 active users**:
- AWS Cognito: ~$30/month
- DynamoDB: ~$25/month
- Lambda: ~$15/month
- API Gateway: ~$10/month
- SNS: ~$5/month
- Miscellaneous: ~$15/month

**Total: ~$100/month**

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 📞 Support

For questions or issues:
- Check [SETUP.md](./SETUP.md) troubleshooting section
- Review [AWS setup guide](./aws/README.md)
- Open an issue on GitHub

---

## 🎯 Roadmap

- [ ] Scanner app for school staff
- [ ] Schedule management interface
- [ ] Analytics dashboard for schools
- [ ] Multi-language support
- [ ] Apple Watch companion app
- [ ] Emergency pickup workflows
- [ ] Parent-to-parent delegation

---

**Built with ❤️ using React Native, Expo, and AWS**
