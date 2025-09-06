#!/usr/bin/env python3
"""
Script to fix content types of existing files in S3 bucket
"""
import boto3
import sys
import os

def fix_content_types(bucket_name, region='us-east-1'):
    """Fix content types for files in S3 bucket"""
    
    # Use the same credentials as the deployment
    try:
        # Try to assume the DeployHub role
        sts_client = boto3.client('sts')
        role_arn = "arn:aws:iam::599248138183:role/DeployHubRole"
        external_id = "deployhub-external-id-2024"
        
        response = sts_client.assume_role(
            RoleArn=role_arn,
            RoleSessionName='FixContentTypesSession',
            ExternalId=external_id
        )
        credentials = response['Credentials']
        
        s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken']
        )
        print("✅ Successfully assumed DeployHub role")
        
    except Exception as e:
        print(f"❌ Failed to assume role: {e}")
        print("Trying with default credentials...")
        s3_client = boto3.client('s3', region_name=region)
    
    try:
        # List all objects in the bucket
        response = s3_client.list_objects_v2(Bucket=bucket_name)
        
        if 'Contents' not in response:
            print(f"No objects found in bucket {bucket_name}")
            return
        
        print(f"Found {len(response['Contents'])} objects in bucket {bucket_name}")
        
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
        
        print(f"\n✅ Successfully updated content types for all files in {bucket_name}")
        print("🔄 CloudFront will take 15-20 minutes to reflect the changes")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fix-content-types.py <bucket-name>")
        sys.exit(1)
    
    bucket_name = sys.argv[1]
    fix_content_types(bucket_name)
