# AWS Backend Infrastructure Setup

This document provides instructions for setting up the AWS backend infrastructure for the School Pickup Geofencing App.

## Overview

The backend consists of:
- **AWS Cognito**: User authentication and authorization
- **AWS Lambda**: Serverless functions for business logic
- **Amazon API Gateway**: REST API endpoints
- **Amazon DynamoDB**: NoSQL database for user data, schedules, and tokens
- **Amazon SNS**: Push notifications

## Prerequisites

- AWS Account
- AWS CLI installed and configured
- Node.js 18+ installed
- Basic knowledge of AWS services

## Step 1: Set Up AWS Cognito

### Create User Pool

1. Go to AWS Cognito Console
2. Click "Create user pool"
3. Configure sign-in options:
   - Select "Email" as sign-in option
   - Enable "Email" for verification
4. Configure password policy (use defaults or customize)
5. Enable MFA (optional but recommended)
6. Configure user account recovery
7. Create the user pool

### Configure Google OAuth

1. In your Cognito User Pool, go to "App integration"
2. Under "Federated identity providers", add Google
3. Enter your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://YOUR_COGNITO_DOMAIN.auth.REGION.amazoncognito.com/oauth2/idpresponse`
4. Map attributes:
   - email → email
   - name → name

### Create App Client

1. In User Pool settings, go to "App clients"
2. Create a new app client
3. Configure:
   - Name: "geofenceschool-mobile"
   - Enable OAuth flows: Authorization code grant, Implicit grant
   - OAuth scopes: email, openid, profile
   - Callback URLs: `geofenceschool://`
   - Sign out URLs: `geofenceschool://`
4. Save the App Client ID

### Create Identity Pool

1. Go to Cognito Identity Pools
2. Create new identity pool
3. Enable "Authenticated identities"
4. Link to your User Pool
5. Configure IAM roles for authenticated users
6. Save the Identity Pool ID

### Update App Configuration

Update `config/aws-config.ts` with your Cognito details:

```typescript
userPoolId: 'us-east-1_XXXXXXXXX',
userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
identityPoolId: 'us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
```

## Step 2: Create DynamoDB Tables

### Users Table

```bash
aws dynamodb create-table \
  --table-name GeoFenceSchool-Users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Students Table

```bash
aws dynamodb create-table \
  --table-name GeoFenceSchool-Students \
  --attribute-definitions \
    AttributeName=studentId,AttributeType=S \
    AttributeName=schoolId,AttributeType=S \
  --key-schema \
    AttributeName=studentId,KeyType=HASH \
  --global-secondary-indexes \
    IndexName=SchoolIndex,KeySchema=[{AttributeName=schoolId,KeyType=HASH}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST
```

### Schools Table

```bash
aws dynamodb create-table \
  --table-name GeoFenceSchool-Schools \
  --attribute-definitions \
    AttributeName=schoolId,AttributeType=S \
  --key-schema \
    AttributeName=schoolId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Schedules Table

```bash
aws dynamodb create-table \
  --table-name GeoFenceSchool-Schedules \
  --attribute-definitions \
    AttributeName=scheduleId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=date,AttributeType=S \
  --key-schema \
    AttributeName=scheduleId,KeyType=HASH \
    AttributeName=date,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=UserIndex,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=date,KeyType=RANGE}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST
```

### Tokens Table (with TTL)

```bash
aws dynamodb create-table \
  --table-name GeoFenceSchool-Tokens \
  --attribute-definitions \
    AttributeName=tokenId,AttributeType=S \
  --key-schema \
    AttributeName=tokenId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Enable TTL
aws dynamodb update-time-to-live \
  --table-name GeoFenceSchool-Tokens \
  --time-to-live-specification Enabled=true,AttributeName=expiresAt
```

## Step 3: Create Lambda Functions

Create a `lambda` directory and add these functions:

### Token Generation Function

Create `lambda/generate-token/index.js`:

```javascript
const AWS = require('aws-sdk');
const crypto = require('crypto');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { userId, studentId, schoolId } = JSON.parse(event.body);
  
  // Verify authorization
  const isAuthorized = await checkAuthorization(userId, studentId, schoolId);
  
  if (!isAuthorized) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Not authorized for pickup' })
    };
  }
  
  // Generate token
  const tokenId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  
  const token = {
    tokenId,
    userId,
    studentId,
    schoolId,
    generatedAt: now.toISOString(),
    expiresAt: Math.floor(expiresAt.getTime() / 1000),
    isUsed: false
  };
  
  // Save to DynamoDB
  await dynamodb.put({
    TableName: 'GeoFenceSchool-Tokens',
    Item: token
  }).promise();
  
  return {
    statusCode: 200,
    body: JSON.stringify(token)
  };
};

async function checkAuthorization(userId, studentId, schoolId) {
  // Check schedule in DynamoDB
  // Verify user is authorized for current day/time
  return true; // Simplified for example
}
```

### Token Validation Function

Create `lambda/validate-token/index.js`:

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { tokenId } = JSON.parse(event.body);
  
  // Get token from DynamoDB
  const result = await dynamodb.get({
    TableName: 'GeoFenceSchool-Tokens',
    Key: { tokenId }
  }).promise();
  
  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ valid: false, error: 'Token not found' })
    };
  }
  
  const token = result.Item;
  const now = Date.now() / 1000;
  
  // Check if expired or already used
  if (token.expiresAt < now || token.isUsed) {
    return {
      statusCode: 400,
      body: JSON.stringify({ valid: false, error: 'Token expired or used' })
    };
  }
  
  // Mark as used
  await dynamodb.update({
    TableName: 'GeoFenceSchool-Tokens',
    Key: { tokenId },
    UpdateExpression: 'SET isUsed = :true, scannedAt = :now',
    ExpressionAttributeValues: {
      ':true': true,
      ':now': new Date().toISOString()
    }
  }).promise();
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      valid: true,
      studentId: token.studentId,
      userId: token.userId
    })
  };
};
```

### Deploy Lambda Functions

```bash
# Package and deploy each function
cd lambda/generate-token
zip -r function.zip .
aws lambda create-function \
  --function-name geofence-generate-token \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip

# Repeat for other functions
```

## Step 4: Set Up API Gateway

1. Go to API Gateway Console
2. Create new REST API
3. Create resources and methods:

### Endpoints

- `POST /auth/login` → Lambda: auth-login
- `POST /token/generate` → Lambda: generate-token
- `POST /token/validate` → Lambda: validate-token
- `GET /user/profile` → Lambda: get-user-profile
- `GET /schools` → Lambda: get-schools

4. Enable CORS for all methods
5. Create Cognito Authorizer
6. Attach authorizer to protected endpoints
7. Deploy API to stage (e.g., "prod")

### Update App Configuration

Update `config/aws-config.ts`:

```typescript
endpoint: 'https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/prod'
```

## Step 5: Configure SNS for Push Notifications

1. Go to SNS Console
2. Create platform applications:
   - Android: Create application with FCM credentials
   - iOS: Create application with APNs certificates
3. Note the ARNs

### Configure Expo Push Notifications

The app uses Expo's push notification service. To integrate with SNS:

1. Create Lambda function to handle Expo push tokens
2. Register tokens in DynamoDB
3. Send notifications via Expo Push API

## Step 6: Set Up CloudWatch Monitoring

1. Enable CloudWatch Logs for Lambda functions
2. Create dashboards for monitoring:
   - API Gateway requests
   - Lambda invocations and errors
   - DynamoDB read/write capacity
3. Set up alarms for:
   - High error rates
   - Throttling
   - Latency spikes

## Step 7: Security Configuration

### Secrets Manager

Store sensitive data in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name geofence/token-signing-key \
  --secret-string "your-secret-key"
```

### IAM Roles

Create appropriate IAM roles with least privilege:

- Lambda execution role with DynamoDB, SNS, Secrets Manager access
- Cognito authenticated role with limited S3, API Gateway access

## Step 8: Testing

1. Test authentication flow
2. Test token generation and validation
3. Verify geofence detection
4. Test push notifications
5. Load testing with multiple concurrent users

## Cost Optimization

- Use DynamoDB on-demand pricing for variable workloads
- Set appropriate Lambda memory allocation
- Enable API Gateway caching
- Use CloudWatch Logs retention policies

## Monitoring & Maintenance

- Review CloudWatch dashboards weekly
- Check error logs regularly
- Update Lambda runtimes as needed
- Conduct security audits quarterly

## Support

For issues or questions, refer to:
- AWS Documentation: https://docs.aws.amazon.com
- Expo Documentation: https://docs.expo.dev
- Project Repository: [Your GitHub URL]

