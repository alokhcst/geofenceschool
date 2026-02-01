#!/usr/bin/env node
/**
 * AWS S3 Deployment Script
 * Deploys the Expo web build to AWS S3
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'geofenceschool-app';
const REGION = process.env.AWS_REGION || 'us-east-1';
const PROFILE = process.env.AWS_PROFILE || 'default';

console.log('🚀 Deploying to AWS S3...');
console.log(`Bucket: ${BUCKET_NAME}`);
console.log(`Region: ${REGION}`);
console.log('');

// Check if AWS CLI is installed
try {
  execSync('aws --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ AWS CLI is not installed. Please install it first.');
  console.error('   Visit: https://aws.amazon.com/cli/');
  process.exit(1);
}

// Check if web-build directory exists
const webBuildDir = path.join(process.cwd(), 'web-build');
if (!fs.existsSync(webBuildDir)) {
  console.log('📦 Building web application first...');
  try {
    execSync('npm run build:web', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed. Please fix errors and try again.');
    process.exit(1);
  }
}

// Check if bucket exists
console.log('🔍 Checking if bucket exists...');
try {
  execSync(`aws s3 ls s3://${BUCKET_NAME} --profile ${PROFILE}`, { stdio: 'ignore' });
  console.log(`✅ Bucket ${BUCKET_NAME} exists`);
} catch (error) {
  console.log(`📦 Creating S3 bucket: ${BUCKET_NAME}`);
  try {
    execSync(`aws s3 mb s3://${BUCKET_NAME} --region ${REGION} --profile ${PROFILE}`, { stdio: 'inherit' });
    
    console.log('🌐 Configuring static website hosting...');
    execSync(`aws s3 website s3://${BUCKET_NAME} --index-document index.html --error-document index.html --profile ${PROFILE}`, { stdio: 'inherit' });
    
    console.log('🔓 Setting bucket policy for public access...');
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
        }
      ]
    };
    
    const policyFile = path.join(__dirname, '..', 'tmp-bucket-policy.json');
    fs.writeFileSync(policyFile, JSON.stringify(policy, null, 2));
    
    execSync(`aws s3api put-bucket-policy --bucket ${BUCKET_NAME} --policy file://${policyFile} --profile ${PROFILE}`, { stdio: 'inherit' });
    
    fs.unlinkSync(policyFile);
    console.log('✅ Bucket created and configured');
  } catch (error) {
    console.error('❌ Failed to create bucket:', error.message);
    process.exit(1);
  }
}

// Upload files
console.log('📤 Uploading files to S3...');
try {
  // Upload static assets with long cache
  execSync(`aws s3 sync ${webBuildDir}/ s3://${BUCKET_NAME}/ --delete --cache-control "public, max-age=31536000, immutable" --exclude "*.html" --profile ${PROFILE}`, { stdio: 'inherit' });
  
  // Upload HTML files with no cache
  execSync(`aws s3 sync ${webBuildDir}/ s3://${BUCKET_NAME}/ --delete --cache-control "public, max-age=0, must-revalidate" --include "*.html" --profile ${PROFILE}`, { stdio: 'inherit' });
  
  console.log('');
  console.log('✅ Deployment completed successfully!');
  console.log('');
  console.log(`🌐 Website URL: http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com`);
  console.log('');
  console.log('💡 To use a custom domain, configure CloudFront or Route53.');
} catch (error) {
  console.error('❌ Upload failed:', error.message);
  process.exit(1);
}
