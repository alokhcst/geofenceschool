# Quick Deploy to AWS S3

## Prerequisites

1. Install AWS CLI: https://aws.amazon.com/cli/
2. Configure AWS credentials: `aws configure`
3. Install dependencies: `npm install`

## Quick Start

### Option 1: Using npm script (Recommended)

```bash
# Set environment variables (optional)
export AWS_S3_BUCKET=geofenceschool-app
export AWS_REGION=us-east-1

# Deploy (builds and deploys automatically)
npm run deploy:s3
```

### Option 2: Using PowerShell (Windows)

```powershell
.\scripts\deploy-s3.ps1 -BucketName "geofenceschool-app" -Region "us-east-1"
```

### Option 3: Using Bash (Linux/Mac)

```bash
chmod +x scripts/deploy-s3.sh
./scripts/deploy-s3.sh
```

## Manual Steps

If you prefer manual deployment:

```bash
# 1. Build the web app
npm run build:web

# 2. Create S3 bucket (if doesn't exist)
aws s3 mb s3://geofenceschool-app --region us-east-1

# 3. Enable static website hosting
aws s3 website s3://geofenceschool-app \
  --index-document index.html \
  --error-document index.html

# 4. Set public access policy
aws s3api put-bucket-policy --bucket geofenceschool-app \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "s3://geofenceschool-app/*"
    }]
  }'

# 5. Upload files
aws s3 sync web-build/ s3://geofenceschool-app/ --delete
```

## Access Your Website

After deployment, access your site at:
```
http://geofenceschool-app.s3-website-us-east-1.amazonaws.com
```

## Update QR Code URLs

After deployment, update the base URL in `services/token.service.ts`:

```typescript
let baseUrl = 'https://your-actual-domain.com'; // Update this
```

For more details, see [DEPLOYMENT.md](./DEPLOYMENT.md)
