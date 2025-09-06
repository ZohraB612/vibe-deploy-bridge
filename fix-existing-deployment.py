#!/usr/bin/env python3
"""
Script to fix content types in existing S3 deployment
"""
import boto3
import json
import base64

def fix_existing_deployment():
    """Fix content types for the existing deployment"""
    
    # The existing bucket name from your deployment
    bucket_name = "deployhub-demo-deployhub-app-6179d99f"
    
    try:
        # Use default AWS credentials
        s3_client = boto3.client('s3', region_name='us-east-1')
        
        print(f"Fixing content types in bucket: {bucket_name}")
        
        # List all objects in the bucket
        response = s3_client.list_objects_v2(Bucket=bucket_name)
        
        if 'Contents' not in response:
            print("No objects found in bucket")
            return
        
        print(f"Found {len(response['Contents'])} objects")
        
        for obj in response['Contents']:
            key = obj['Key']
            print(f"Processing: {key}")
            
            # Determine content type based on file extension
            file_name = key.lower()
            if file_name.endswith('.html'):
                content_type = 'text/html'
            elif file_name.endswith('.css'):
                content_type = 'text/css'
            elif file_name.endswith('.js'):
                content_type = 'application/javascript'
            elif file_name.endswith('.json'):
                content_type = 'application/json'
            elif file_name.endswith('.png'):
                content_type = 'image/png'
            elif file_name.endswith('.jpg') or file_name.endswith('.jpeg'):
                content_type = 'image/jpeg'
            elif file_name.endswith('.svg'):
                content_type = 'image/svg+xml'
            else:
                print(f"  Skipping {key} - unknown file type")
                continue
            
            # Copy object with new content type
            copy_source = {'Bucket': bucket_name, 'Key': key}
            s3_client.copy_object(
                CopySource=copy_source,
                Bucket=bucket_name,
                Key=key,
                MetadataDirective='REPLACE',
                ContentType=content_type
            )
            print(f"  ✅ Updated {key} to {content_type}")
        
        print(f"\n✅ Successfully updated content types!")
        print("🔄 CloudFront will take 15-20 minutes to reflect the changes")
        print(f"🌐 Your site should work at: https://d1wz7p01apccjo.cloudfront.net")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure you have AWS credentials configured")
        print("2. Run: aws configure")
        print("3. Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables")

if __name__ == "__main__":
    fix_existing_deployment()
