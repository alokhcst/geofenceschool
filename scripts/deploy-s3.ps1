# PowerShell script for AWS S3 deployment

param(
    [string]$BucketName = "geofenceschool-app",
    [string]$Region = "us-east-1",
    [string]$Profile = "default"
)

Write-Host "🚀 Deploying to AWS S3..." -ForegroundColor Green
Write-Host "Bucket: $BucketName" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan

# Check if AWS CLI is installed
try {
    $null = Get-Command aws -ErrorAction Stop
} catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Check if bucket exists, create if not
$bucketExists = aws s3 ls "s3://$BucketName" --profile $Profile 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "📦 Creating S3 bucket: $BucketName" -ForegroundColor Yellow
    aws s3 mb "s3://$BucketName" --region $Region --profile $Profile
    
    # Enable static website hosting
    Write-Host "🌐 Configuring static website hosting..." -ForegroundColor Yellow
    aws s3 website "s3://$BucketName" `
        --index-document index.html `
        --error-document index.html `
        --profile $Profile
    
    # Set bucket policy for public read access
    Write-Host "🔓 Setting bucket policy for public access..." -ForegroundColor Yellow
    $policy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Sid = "PublicReadGetObject"
                Effect = "Allow"
                Principal = "*"
                Action = "s3:GetObject"
                Resource = "arn:aws:s3:::$BucketName/*"
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $policy | Out-File -FilePath "$env:TEMP\bucket-policy.json" -Encoding utf8
    aws s3api put-bucket-policy `
        --bucket $BucketName `
        --policy "file://$env:TEMP\bucket-policy.json" `
        --profile $Profile
    
    Remove-Item "$env:TEMP\bucket-policy.json"
} else {
    Write-Host "✅ Bucket $BucketName already exists" -ForegroundColor Green
}

# Build the web app
Write-Host "🔨 Building web application..." -ForegroundColor Yellow
npm run build:web

# Upload files to S3
Write-Host "📤 Uploading files to S3..." -ForegroundColor Yellow
aws s3 sync web-build/ "s3://$BucketName/" `
    --delete `
    --cache-control "public, max-age=31536000, immutable" `
    --exclude "*.html" `
    --profile $Profile

# Upload HTML files with no cache
aws s3 sync web-build/ "s3://$BucketName/" `
    --delete `
    --cache-control "public, max-age=0, must-revalidate" `
    --include "*.html" `
    --profile $Profile

# Get website URL
$websiteEndpoint = "http://$BucketName.s3-website-$Region.amazonaws.com"

Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "🌐 Website URL: $websiteEndpoint" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 To use a custom domain, configure CloudFront or Route53." -ForegroundColor Yellow
