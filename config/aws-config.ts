// AWS Amplify Configuration
// TODO: Replace these values with your actual AWS resources after deployment

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'YOUR_USER_POOL_ID', // e.g., 'us-east-1_xxxxx'
      userPoolClientId: 'YOUR_USER_POOL_CLIENT_ID', // e.g., '1234567890abcdefghijklmnop'
      identityPoolId: 'YOUR_IDENTITY_POOL_ID', // e.g., 'us-east-1:xxxxx-xxxx-xxxx-xxxx-xxxxx'
      loginWith: {
        oauth: {
          domain: 'YOUR_COGNITO_DOMAIN', // e.g., 'your-domain.auth.us-east-1.amazoncognito.com'
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: ['geofenceschool://'],
          redirectSignOut: ['geofenceschool://'],
          responseType: 'code',
        },
      },
    },
  },
  API: {
    REST: {
      GeofenceAPI: {
        endpoint: 'YOUR_API_GATEWAY_ENDPOINT', // e.g., 'https://xxxxx.execute-api.us-east-1.amazonaws.com/prod'
        region: 'us-east-1',
      },
    },
  },
};

// Development/Mock Mode - Set to true for local development without AWS
export const USE_MOCK_MODE = true;

// School Configuration (can be fetched from API later)
export const SCHOOLS = [
  {
    id: 'school-1',
    name: 'Mashburn Elementary',
    address: '3777 Samples Rd, Cumming, GA 30041',
    geofence: {
      latitude: 34.168494, // Replace with actual coordinates
      longitude: -84.106414,
      radius: 200, // meters
    },
    pickupTimes: [
      { start: '14:30', end: '15:30', label: 'Regular Pickup' },
      { start: '12:00', end: '12:30', label: 'Early Dismissal' },
    ],
  },
];

