# AWS S3 Deployment Guide

This guide explains how to deploy the GeoFenceSchool application to AWS S3 for static website hosting.

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **AWS CLI**: Install and configure AWS CLI
   ```bash
   # Install AWS CLI (if not installed)
   # Windows: Download from https://aws.amazon.com/cli/
   # Mac: brew install awscli
   # Linux: sudo apt-get install awscli
   
   # Configure AWS CLI
   aws configure
   ```

3. **Node.js and npm**: Ensure Node.js and npm are installed

## Deployment Methods

### Method 1: Using Deployment Scripts (Recommended)

#### For Windows (PowerShell):

```powershell
# Set environment variables (optional)
$env:AWS_S3_BUCKET = "geofenceschool-app"
$env:AWS_REGION = "us-east-1"
$env:AWS_PROFILE = "default"

# Run deployment script
.\scripts\deploy-s3.ps1 -BucketName "geofenceschool-app" -Region "us-east-1"
```

#### For Linux/Mac:

```bash
# Set environment variables (optional)
export AWS_S3_BUCKET=geofenceschool-app
export AWS_REGION=us-east-1
export AWS_PROFILE=default

# Make script executable
chmod +x scripts/deploy-s3.sh

# Run deployment script
./scripts/deploy-s3.sh
```

### Method 2: Using CloudFormation

1. **Create the S3 bucket stack**:

```bash
aws cloudformation create-stack \
  --stack-name geofenceschool-s3 \
  --template-body file://cloudformation/s3-bucket.yaml \
  --parameters ParameterKey=BucketName,ParameterValue=geofenceschool-app \
               ParameterKey=Environment,ParameterValue=production \
  --region us-east-1
```

2. **Wait for stack creation**:

```bash
aws cloudformation wait stack-create-complete \
  --stack-name geofenceschool-s3 \
  --region us-east-1
```

3. **Get the bucket name**:

```bash
aws cloudformation describe-stacks \
  --stack-name geofenceschool-s3 \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text
```

4. **Build and deploy**:

```bash
# Build the web app
npm run build:web

# Deploy to S3
aws s3 sync web-build/ s3://YOUR_BUCKET_NAME/ --delete
```

### Method 3: Manual Deployment

1. **Create S3 bucket**:

```bash
aws s3 mb s3://geofenceschool-app --region us-east-1
```

2. **Enable static website hosting**:

```bash
aws s3 website s3://geofenceschool-app \
  --index-document index.html \
  --error-document index.html
```

3. **Set bucket policy** (create `bucket-policy.json`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "s3://geofenceschool-app/*"
        }
    ]
}
```

```bash
aws s3api put-bucket-policy \
  --bucket geofenceschool-app \
  --policy file://bucket-policy.json
```

4. **Build the application**:

```bash
npm run build:web
```

5. **Upload files**:

```bash
# Upload all files with appropriate cache headers
aws s3 sync web-build/ s3://geofenceschool-app/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html"

# Upload HTML files with no cache
aws s3 sync web-build/ s3://geofenceschool-app/ \
  --delete \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html"
```

## Accessing Your Website

After deployment, your website will be available at:

```
http://YOUR_BUCKET_NAME.s3-website-REGION.amazonaws.com
```

For example:
```
http://geofenceschool-app.s3-website-us-east-1.amazonaws.com
```

## Custom Domain Setup (Optional)

To use a custom domain:

1. **Create CloudFront Distribution**:
   - Origin: Your S3 bucket website endpoint
   - Default root object: `index.html`
   - Enable HTTPS

2. **Configure Route53**:
   - Create an A record (Alias) pointing to your CloudFront distribution

3. **Update QR Code URL**:
   - Update the base URL in `services/token.service.ts` to use your custom domain

## Environment Variables

You can set these environment variables before deployment:

- `AWS_S3_BUCKET`: S3 bucket name (default: `geofenceschool-app`)
- `AWS_REGION`: AWS region (default: `us-east-1`)
- `AWS_PROFILE`: AWS CLI profile (default: `default`)

## Troubleshooting

### Issue: "Access Denied" when accessing website

**Solution**: Ensure the bucket policy allows public read access and that public access blocking is disabled.

```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket YOUR_BUCKET_NAME

# Check public access block settings
aws s3api get-public-access-block --bucket YOUR_BUCKET_NAME
```

### Issue: "NoSuchBucket" error

**Solution**: Make sure the bucket exists and you're using the correct region.

```bash
# List buckets
aws s3 ls

# Check bucket location
aws s3api get-bucket-location --bucket YOUR_BUCKET_NAME
```

### Issue: Build fails

**Solution**: Ensure all dependencies are installed:

```bash
npm install
npm run build:web
```

## CI/CD Integration

For automated deployments, you can integrate with:

- **GitHub Actions**: Use AWS actions to deploy on push
- **GitLab CI**: Add deployment stage to `.gitlab-ci.yml`
- **AWS CodePipeline**: Set up a pipeline for automated deployments

## Cost Estimation

S3 static website hosting is very cost-effective:
- **Storage**: ~$0.023 per GB/month
- **Requests**: ~$0.0004 per 1,000 GET requests
- **Data Transfer**: First 1 GB free, then ~$0.09 per GB

For a typical small application, expect costs under $1/month.

## Security Considerations

1. **HTTPS**: Use CloudFront with SSL certificate for HTTPS
2. **CORS**: Configure CORS if needed for API calls
3. **Bucket Policy**: Review and restrict bucket policy as needed
4. **Versioning**: Enable versioning for rollback capability

## Next Steps

After deployment:

1. Test the website URL
2. Update QR code generation to use the production URL
3. Configure CloudFront for better performance and HTTPS
4. Set up monitoring and alerts
5. Configure custom domain (optional)
