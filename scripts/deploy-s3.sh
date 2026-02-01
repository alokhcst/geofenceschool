#!/bin/bash
# Deploy script for AWS S3

set -e

# Configuration
BUCKET_NAME="${AWS_S3_BUCKET:-geofenceschool-app}"
REGION="${AWS_REGION:-us-east-1}"
PROFILE="${AWS_PROFILE:-default}"

echo "🚀 Deploying to AWS S3..."
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if bucket exists, create if not
if ! aws s3 ls "s3://$BUCKET_NAME" --profile "$PROFILE" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "✅ Bucket $BUCKET_NAME already exists"
else
    echo "📦 Creating S3 bucket: $BUCKET_NAME"
    aws s3 mb "s3://$BUCKET_NAME" --region "$REGION" --profile "$PROFILE"
    
    # Enable static website hosting
    echo "🌐 Configuring static website hosting..."
    aws s3 website "s3://$BUCKET_NAME" \
        --index-document index.html \
        --error-document index.html \
        --profile "$PROFILE"
    
    # Set bucket policy for public read access
    echo "🔓 Setting bucket policy for public access..."
    cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
    
    aws s3api put-bucket-policy \
        --bucket "$BUCKET_NAME" \
        --policy file:///tmp/bucket-policy.json \
        --profile "$PROFILE"
    
    rm /tmp/bucket-policy.json
fi

# Build the web app
echo "🔨 Building web application..."
npm run build:web

# Upload files to S3
echo "📤 Uploading files to S3..."
aws s3 sync web-build/ "s3://$BUCKET_NAME/" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --profile "$PROFILE"

# Upload HTML files with no cache
aws s3 sync web-build/ "s3://$BUCKET_NAME/" \
    --delete \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" \
    --profile "$PROFILE"

# Get website URL
WEBSITE_URL=$(aws s3api get-bucket-website --bucket "$BUCKET_NAME" --profile "$PROFILE" --query 'WebsiteConfiguration.IndexDocument.Suffix' --output text 2>/dev/null || echo "index.html")
WEBSITE_ENDPOINT="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Website URL: $WEBSITE_ENDPOINT"
echo ""
echo "💡 To use a custom domain, configure CloudFront or Route53."
