"""
AWS-specific endpoints for DeployHub
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError
import uuid
import json
import os
import base64
from datetime import datetime

from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("/connect-aws-account")
async def connect_aws_account(request: Dict[str, Any]):
    """
    Connect AWS account and store connection details
    """
    try:
        role_arn = request.get('roleArn')
        external_id = request.get('externalId')
        user_id = request.get('userId')
        account_id = request.get('accountId')
        
        if not role_arn or not external_id or not user_id:
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: roleArn, externalId, userId"
            )
        
        logger.info(f"Connecting AWS account for user {user_id} with role {role_arn}")
        
        # Test the connection by assuming the role
        sts_client = boto3.client('sts')
        
        try:
            assume_role_params = {
                'RoleArn': role_arn,
                'RoleSessionName': 'DeployHubConnectionTest',
                'DurationSeconds': 900,  # 15 minutes
                'ExternalId': external_id
            }
            
            response = sts_client.assume_role(**assume_role_params)
            credentials = response['Credentials']
            
            # Extract account ID from the role ARN if not provided
            if not account_id:
                account_id = role_arn.split(':')[4]
            
            # Store connection details (in a real app, this would go to a database)
            connection_id = str(uuid.uuid4())
            connection_data = {
                "id": connection_id,
                "user_id": user_id,
                "account_id": account_id,
                "role_arn": role_arn,
                "external_id": external_id,
                "created_at": datetime.utcnow().isoformat(),
                "status": "active"
            }
            
            logger.info(f"Successfully connected AWS account {account_id} for user {user_id}")
            
            return {
                "success": True,
                "connection": connection_data,
                "message": "AWS account connected successfully"
            }
            
        except ClientError as e:
            logger.error(f"AWS error testing connection: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to connect to AWS account: {e.response['Error']['Message']}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting AWS account: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error connecting AWS account: {str(e)}"
        )

@router.post("/assume-role")
async def assume_role(request: Dict[str, Any]):
    """
    Assume AWS role and return temporary credentials
    """
    try:
        role_arn = request.get('roleArn')
        external_id = request.get('externalId')
        user_id = request.get('userId')
        session_name = request.get('sessionName', 'DeployHubSession')
        
        if not role_arn:
            raise HTTPException(
                status_code=400,
                detail="Missing roleArn"
            )
        
        logger.info(f"Assuming role {role_arn} for user {user_id}")
        
        # Create STS client
        sts_client = boto3.client('sts')
        
        # Assume role parameters
        assume_role_params = {
            'RoleArn': role_arn,
            'RoleSessionName': session_name,
            'DurationSeconds': 3600  # 1 hour
        }
        
        # Add external ID if provided
        if external_id:
            assume_role_params['ExternalId'] = external_id
        
        # Assume the role
        response = sts_client.assume_role(**assume_role_params)
        
        credentials = response['Credentials']
        
        return {
            "success": True,
            "credentials": {
                "accessKeyId": credentials['AccessKeyId'],
                "secretAccessKey": credentials['SecretAccessKey'],
                "sessionToken": credentials['SessionToken'],
                "expiration": credentials['Expiration'].isoformat()
            }
        }
        
    except ClientError as e:
        logger.error(f"AWS error assuming role: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AWS error: {e.response['Error']['Message']}"
        )
    except Exception as e:
        logger.error(f"Error assuming role: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error assuming role: {str(e)}"
        )

@router.post("/deploy-s3-enhanced")
async def deploy_s3_enhanced(request: Dict[str, Any]):
    """
    Deploy to S3 with CloudFront - enhanced version
    """
    try:
        project_name = request.get('projectName')
        files = request.get('files', [])
        credentials = request.get('credentials')
        region = request.get('region', 'us-east-1')
        domain = request.get('domain')
        
        if not project_name or not files or not credentials:
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: projectName, files, credentials"
            )
        
        logger.info(f"Starting S3 deployment for project: {project_name}")
        
        # Create AWS clients with provided credentials
        s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=credentials['accessKeyId'],
            aws_secret_access_key=credentials['secretAccessKey'],
            aws_session_token=credentials.get('sessionToken')
        )
        
        cloudfront_client = boto3.client(
            'cloudfront',
            region_name=region,
            aws_access_key_id=credentials['accessKeyId'],
            aws_secret_access_key=credentials['secretAccessKey'],
            aws_session_token=credentials.get('sessionToken')
        )
        
        # Generate unique bucket name
        bucket_name = f"deployhub-{project_name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:8]}"
        
        logs = []
        logs.append(f"Creating S3 bucket: {bucket_name}")
        
        # Create S3 bucket
        try:
            if region == 'us-east-1':
                s3_client.create_bucket(Bucket=bucket_name)
            else:
                s3_client.create_bucket(
                    Bucket=bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': region}
                )
            logs.append(f"✅ S3 bucket created: {bucket_name}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'BucketAlreadyExists':
                logs.append(f"⚠️ Bucket already exists, continuing...")
            else:
                raise e
        
        # Configure bucket for static website hosting
        s3_client.put_bucket_website(
            Bucket=bucket_name,
            WebsiteConfiguration={
                'IndexDocument': {'Suffix': 'index.html'},
                'ErrorDocument': {'Key': 'error.html'}
            }
        )
        logs.append("✅ Website hosting configured")
        
        # Disable Block Public Access to allow public policies
        try:
            s3_client.put_public_access_block(
                Bucket=bucket_name,
                PublicAccessBlockConfiguration={
                    'BlockPublicAcls': False,
                    'IgnorePublicAcls': False,
                    'BlockPublicPolicy': False,
                    'RestrictPublicBuckets': False
                }
            )
            logs.append("✅ Block Public Access disabled")
        except ClientError as e:
            logs.append(f"⚠️ Could not disable Block Public Access: {e.response['Error']['Message']}")
        
        # Set bucket policy for public read access
        bucket_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadGetObject",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": "s3:GetObject",
                    "Resource": f"arn:aws:s3:::{bucket_name}/*"
                }
            ]
        }
        
        s3_client.put_bucket_policy(
            Bucket=bucket_name,
            Policy=json.dumps(bucket_policy)
        )
        logs.append("✅ Public read policy applied")
        
        # Upload files
        uploaded_files = []
        for file_data in files:
            try:
                # Convert file data to bytes if it's a string (base64)
                if isinstance(file_data.get('content'), str):
                    file_content = base64.b64decode(file_data['content'])
                else:
                    file_content = file_data['content']
                
                # Determine content type - use file.type first, then fall back to file extension
                content_type = file_data.get('type')
                file_name = file_data['name'].lower()
                
                # Debug logging
                logger.info(f"File: {file_data['name']}, file.type: {file_data.get('type')}, file_name: {file_name}")
                
                # Enhanced content type detection with proper charset for text files
                if not content_type or content_type == 'application/octet-stream':
                    if file_name.endswith('.html') or file_name.endswith('.htm'):
                        content_type = 'text/html; charset=utf-8'
                    elif file_name.endswith('.css'):
                        content_type = 'text/css; charset=utf-8'
                    elif file_name.endswith('.js') or file_name.endswith('.mjs'):
                        content_type = 'application/javascript; charset=utf-8'
                    elif file_name.endswith('.json'):
                        content_type = 'application/json; charset=utf-8'
                    elif file_name.endswith('.txt'):
                        content_type = 'text/plain; charset=utf-8'
                    elif file_name.endswith('.xml'):
                        content_type = 'application/xml; charset=utf-8'
                    elif file_name.endswith('.png'):
                        content_type = 'image/png'
                    elif file_name.endswith('.jpg') or file_name.endswith('.jpeg'):
                        content_type = 'image/jpeg'
                    elif file_name.endswith('.gif'):
                        content_type = 'image/gif'
                    elif file_name.endswith('.svg'):
                        content_type = 'image/svg+xml'
                    elif file_name.endswith('.ico'):
                        content_type = 'image/x-icon'
                    elif file_name.endswith('.woff') or file_name.endswith('.woff2'):
                        content_type = 'font/woff2'
                    elif file_name.endswith('.ttf'):
                        content_type = 'font/ttf'
                    elif file_name.endswith('.eot'):
                        content_type = 'application/vnd.ms-fontobject'
                    elif file_name.endswith('.pdf'):
                        content_type = 'application/pdf'
                    elif file_name.endswith('.zip'):
                        content_type = 'application/zip'
                    else:
                        content_type = 'application/octet-stream'
                
                logger.info(f"Final content type for {file_data['name']}: {content_type}")
                
                # Upload with proper headers for web serving
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=file_data['name'],
                    Body=file_content,
                    ContentType=content_type,
                    CacheControl='public, max-age=31536000' if not file_name.endswith('.html') else 'public, max-age=0, must-revalidate',
                    ContentDisposition='inline'  # Ensure files are displayed inline, not downloaded
                )
                uploaded_files.append(file_data['name'])
                logs.append(f"✅ Uploaded {file_data['name']} with content-type: {content_type}")
            except Exception as e:
                logs.append(f"❌ Failed to upload {file_data['name']}: {str(e)}")
                logger.error(f"Upload error for {file_data['name']}: {e}")
        
        logs.append(f"✅ Uploaded {len(uploaded_files)} files")
        
        # Create CloudFront distribution
        try:
            distribution_config = {
                'CallerReference': str(uuid.uuid4()),
                'Comment': f'DeployHub distribution for {project_name}',
                'DefaultRootObject': 'index.html',
                'Origins': {
                    'Quantity': 1,
                    'Items': [{
                        'Id': f'{bucket_name}-origin',
                        'DomainName': f'{bucket_name}.s3-website-{region}.amazonaws.com',
                        'CustomOriginConfig': {
                            'HTTPPort': 80,
                            'HTTPSPort': 443,
                            'OriginProtocolPolicy': 'http-only',
                            'OriginSslProtocols': {
                                'Quantity': 1,
                                'Items': ['TLSv1.2']
                            }
                        }
                    }]
                },
                'DefaultCacheBehavior': {
                    'TargetOriginId': f'{bucket_name}-origin',
                    'ViewerProtocolPolicy': 'redirect-to-https',
                    'TrustedSigners': {
                        'Enabled': False,
                        'Quantity': 0
                    },
                    'ForwardedValues': {
                        'QueryString': False,
                        'Cookies': {'Forward': 'none'}
                    },
                    'MinTTL': 0,
                    'DefaultTTL': 86400,
                    'MaxTTL': 31536000,
                    'Compress': True,
                    'AllowedMethods': {
                        'Quantity': 7,
                        'Items': ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
                        'CachedMethods': {
                            'Quantity': 2,
                            'Items': ['GET', 'HEAD']
                        }
                    }
                },
                'CacheBehaviors': {
                    'Quantity': 2,
                    'Items': [
                        {
                            # HTML files - no cache
                            'PathPattern': '*.html',
                            'TargetOriginId': f'{bucket_name}-origin',
                            'ViewerProtocolPolicy': 'redirect-to-https',
                            'TrustedSigners': {
                                'Enabled': False,
                                'Quantity': 0
                            },
                            'ForwardedValues': {
                                'QueryString': False,
                                'Cookies': {'Forward': 'none'}
                            },
                            'MinTTL': 0,
                            'DefaultTTL': 0,
                            'MaxTTL': 0,
                            'Compress': True,
                            'AllowedMethods': {
                                'Quantity': 2,
                                'Items': ['GET', 'HEAD'],
                                'CachedMethods': {
                                    'Quantity': 2,
                                    'Items': ['GET', 'HEAD']
                                }
                            }
                        },
                        {
                            # Static assets - long cache
                            'PathPattern': '/static/*',
                            'TargetOriginId': f'{bucket_name}-origin',
                            'ViewerProtocolPolicy': 'redirect-to-https',
                            'TrustedSigners': {
                                'Enabled': False,
                                'Quantity': 0
                            },
                            'ForwardedValues': {
                                'QueryString': False,
                                'Cookies': {'Forward': 'none'}
                            },
                            'MinTTL': 31536000,
                            'DefaultTTL': 31536000,
                            'MaxTTL': 31536000,
                            'Compress': True,
                            'AllowedMethods': {
                                'Quantity': 2,
                                'Items': ['GET', 'HEAD'],
                                'CachedMethods': {
                                    'Quantity': 2,
                                    'Items': ['GET', 'HEAD']
                                }
                            }
                        }
                    ]
                },
                'Enabled': True,
                'PriceClass': 'PriceClass_100'
            }
            
            distribution_response = cloudfront_client.create_distribution(
                DistributionConfig=distribution_config
            )
            
            distribution_id = distribution_response['Distribution']['Id']
            distribution_domain = distribution_response['Distribution']['DomainName']
            
            logs.append(f"✅ CloudFront distribution created: {distribution_id}")
            logs.append(f"✅ Distribution domain: {distribution_domain}")
            
        except ClientError as e:
            logs.append(f"⚠️ CloudFront distribution creation failed: {e.response['Error']['Message']}")
            distribution_id = None
            distribution_domain = None
        
        # Generate website URL
        website_url = f"http://{bucket_name}.s3-website-{region}.amazonaws.com"
        if distribution_domain:
            website_url = f"https://{distribution_domain}"
        
        logs.append(f"✅ Deployment completed successfully!")
        logs.append(f"🌐 Website URL: {website_url}")
        
        return {
            "success": True,
            "url": website_url,
            "websiteUrl": website_url,
            "bucketName": bucket_name,
            "distributionId": distribution_id,
            "logs": logs
        }
        
    except ClientError as e:
        logger.error(f"AWS error during deployment: {e}")
        return {
            "success": False,
            "error": f"AWS error: {e.response['Error']['Message']}",
            "logs": logs if 'logs' in locals() else []
        }
    except Exception as e:
        logger.error(f"Error during deployment: {e}")
        return {
            "success": False,
            "error": f"Deployment error: {str(e)}",
            "logs": logs if 'logs' in locals() else []
        }

@router.get("/check-status/{distribution_id}")
async def check_deployment_status(distribution_id: str, credentials: str = None, region: str = 'us-east-1'):
    """
    Check CloudFront distribution status
    """
    try:
        if not credentials:
            raise HTTPException(
                status_code=400,
                detail="Missing credentials"
            )
        
        # Parse credentials
        creds = json.loads(credentials)
        
        # Create CloudFront client
        cloudfront_client = boto3.client(
            'cloudfront',
            region_name=region,
            aws_access_key_id=creds['accessKeyId'],
            aws_secret_access_key=creds['secretAccessKey'],
            aws_session_token=creds.get('sessionToken')
        )
        
        # Get distribution details
        response = cloudfront_client.get_distribution(Id=distribution_id)
        distribution = response['Distribution']
        
        return {
            "distributionId": distribution_id,
            "status": distribution['Status'],
            "domainName": distribution['DomainName'],
            "enabled": distribution['DistributionConfig']['Enabled'],
            "lastModifiedTime": distribution['LastModifiedTime'].isoformat()
        }
        
    except ClientError as e:
        logger.error(f"AWS error checking status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AWS error: {e.response['Error']['Message']}"
        )
    except Exception as e:
        logger.error(f"Error checking status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error checking status: {str(e)}"
        )

@router.post("/cleanup-resources")
async def cleanup_resources(request: Dict[str, Any]):
    """
    Clean up AWS resources (S3 bucket and CloudFront distribution)
    """
    try:
        bucket_name = request.get('bucketName')
        distribution_id = request.get('distributionId')
        credentials = request.get('credentials')
        region = request.get('region', 'us-east-1')
        
        if not credentials:
            raise HTTPException(
                status_code=400,
                detail="Missing credentials"
            )
        
        logger.info(f"Cleaning up resources: bucket={bucket_name}, distribution={distribution_id}")
        
        # Create AWS clients
        s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=credentials['accessKeyId'],
            aws_secret_access_key=credentials['secretAccessKey'],
            aws_session_token=credentials.get('sessionToken')
        )
        
        cloudfront_client = boto3.client(
            'cloudfront',
            region_name=region,
            aws_access_key_id=credentials['accessKeyId'],
            aws_secret_access_key=credentials['secretAccessKey'],
            aws_session_token=credentials.get('sessionToken')
        )
        
        results = {"deleted": [], "errors": []}
        
        # Delete CloudFront distribution if provided
        if distribution_id:
            try:
                logger.info(f"Cleaning up CloudFront distribution: {distribution_id}")
                
                # Get distribution details to check if it's enabled
                dist = cloudfront_client.get_distribution(Id=distribution_id)
                
                if dist['Distribution']['DistributionConfig']['Enabled']:
                    logger.info(f"Distribution {distribution_id} is enabled, attempting to disable...")
                    # Note: In production, you'd need to implement UpdateDistributionCommand
                    # For now, we'll try to delete it directly (this may fail if enabled)
                
                cloudfront_client.delete_distribution(Id=distribution_id, IfMatch=dist['ETag'])
                results["deleted"].append(f"CloudFront: {distribution_id}")
                logger.info(f"Successfully deleted CloudFront distribution: {distribution_id}")
            except ClientError as e:
                error_msg = f"CloudFront {distribution_id}: {e.response['Error']['Message']}"
                results["errors"].append(error_msg)
                logger.error(error_msg)
        
        # Delete S3 bucket if provided
        if bucket_name:
            try:
                logger.info(f"Cleaning up S3 bucket: {bucket_name}")
                
                # List and delete all objects in the bucket
                paginator = s3_client.get_paginator('list_objects_v2')
                pages = paginator.paginate(Bucket=bucket_name)
                
                objects_to_delete = []
                for page in pages:
                    if 'Contents' in page:
                        objects_to_delete.extend([{'Key': obj['Key']} for obj in page['Contents']])
                
                if objects_to_delete:
                    logger.info(f"Found {len(objects_to_delete)} objects to delete in bucket {bucket_name}")
                    
                    # Delete objects in batches (AWS allows up to 1000 objects per request)
                    batch_size = 1000
                    for i in range(0, len(objects_to_delete), batch_size):
                        batch = objects_to_delete[i:i + batch_size]
                        s3_client.delete_objects(
                            Bucket=bucket_name,
                            Delete={'Objects': batch}
                        )
                        logger.info(f"Deleted batch {i // batch_size + 1} of {len(objects_to_delete) // batch_size + 1}")
                
                # Delete the empty bucket
                s3_client.delete_bucket(Bucket=bucket_name)
                results["deleted"].append(f"S3: {bucket_name}")
                logger.info(f"Successfully deleted S3 bucket: {bucket_name}")
            except ClientError as e:
                error_msg = f"S3 {bucket_name}: {e.response['Error']['Message']}"
                results["errors"].append(error_msg)
                logger.error(error_msg)
        
        return {
            "success": True,
            "results": results,
            "message": "Resource cleanup completed",
            "bucketName": bucket_name,
            "distributionId": distribution_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error during cleanup: {str(e)}"
        )

@router.post("/fix-content-types")
async def fix_content_types(request: dict):
    """Fix content types for files in S3 bucket"""
    try:
        bucket_name = request.get('bucketName')
        credentials = request.get('credentials')
        region = request.get('region', 'us-east-1')
        
        if not bucket_name:
            raise HTTPException(status_code=400, detail="bucketName is required")
        
        # Use provided credentials or fallback to environment
        if credentials:
            s3_client = boto3.client(
                's3',
                region_name=region,
                aws_access_key_id=credentials['accessKeyId'],
                aws_secret_access_key=credentials['secretAccessKey'],
                aws_session_token=credentials.get('sessionToken')
            )
        else:
            # Get AWS credentials from environment or use default
            aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
            aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
            aws_session_token = os.getenv('AWS_SESSION_TOKEN')
            
            if not aws_access_key_id or not aws_secret_access_key:
                raise HTTPException(status_code=500, detail="AWS credentials not configured")
            
            s3_client = boto3.client(
                's3',
                region_name=region,
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                aws_session_token=aws_session_token
            )
        
        # List all objects in the bucket
        response = s3_client.list_objects_v2(Bucket=bucket_name)
        
        if 'Contents' not in response:
            return {"success": True, "message": "No objects found in bucket", "updated": 0}
        
        updated_count = 0
        logs = []
        
        for obj in response['Contents']:
            key = obj['Key']
            
            # Enhanced content type detection with proper charset for text files
            file_name = key.lower()
            if file_name.endswith('.html') or file_name.endswith('.htm'):
                content_type = 'text/html; charset=utf-8'
            elif file_name.endswith('.css'):
                content_type = 'text/css; charset=utf-8'
            elif file_name.endswith('.js') or file_name.endswith('.mjs'):
                content_type = 'application/javascript; charset=utf-8'
            elif file_name.endswith('.json'):
                content_type = 'application/json; charset=utf-8'
            elif file_name.endswith('.txt'):
                content_type = 'text/plain; charset=utf-8'
            elif file_name.endswith('.xml'):
                content_type = 'application/xml; charset=utf-8'
            elif file_name.endswith('.png'):
                content_type = 'image/png'
            elif file_name.endswith('.jpg') or file_name.endswith('.jpeg'):
                content_type = 'image/jpeg'
            elif file_name.endswith('.gif'):
                content_type = 'image/gif'
            elif file_name.endswith('.svg'):
                content_type = 'image/svg+xml'
            elif file_name.endswith('.ico'):
                content_type = 'image/x-icon'
            elif file_name.endswith('.woff') or file_name.endswith('.woff2'):
                content_type = 'font/woff2'
            elif file_name.endswith('.ttf'):
                content_type = 'font/ttf'
            elif file_name.endswith('.eot'):
                content_type = 'application/vnd.ms-fontobject'
            else:
                logs.append(f"Skipped {key} - unknown file type")
                continue
            
            # Copy object with new content type and headers
            copy_source = {'Bucket': bucket_name, 'Key': key}
            s3_client.copy_object(
                CopySource=copy_source,
                Bucket=bucket_name,
                Key=key,
                MetadataDirective='REPLACE',
                ContentType=content_type,
                CacheControl='public, max-age=31536000' if not file_name.endswith('.html') else 'public, max-age=0, must-revalidate',
                ContentDisposition='inline'  # Ensure files are displayed inline, not downloaded
            )
            logs.append(f"Updated {key} to {content_type}")
            updated_count += 1
        
        return {
            "success": True,
            "message": f"Successfully updated {updated_count} files",
            "updated": updated_count,
            "logs": logs
        }
        
    except Exception as e:
        logger.error(f"Error fixing content types: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fix content types: {str(e)}")

@router.post("/cleanup-project")
async def cleanup_project(request: Dict[str, Any]):
    """
    Clean up project resources (S3 bucket and CloudFront distribution)
    """
    try:
        project_name = request.get('projectName')
        bucket_name = request.get('bucketName')
        distribution_id = request.get('distributionId')
        credentials = request.get('credentials')
        region = request.get('region', 'us-east-1')
        
        if not credentials:
            raise HTTPException(
                status_code=400,
                detail="Missing credentials"
            )
        
        logger.info(f"Cleaning up project {project_name}: bucket={bucket_name}, distribution={distribution_id}")
        
        # Create AWS clients
        s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=credentials['accessKeyId'],
            aws_secret_access_key=credentials['secretAccessKey'],
            aws_session_token=credentials.get('sessionToken')
        )
        
        cloudfront_client = boto3.client(
            'cloudfront',
            region_name=region,
            aws_access_key_id=credentials['accessKeyId'],
            aws_secret_access_key=credentials['secretAccessKey'],
            aws_session_token=credentials.get('sessionToken')
        )
        
        results = {"deleted": [], "errors": []}
        
        # Delete CloudFront distribution if provided
        if distribution_id:
            try:
                logger.info(f"Cleaning up CloudFront distribution: {distribution_id}")
                
                # Get distribution details to check if it's enabled
                dist = cloudfront_client.get_distribution(Id=distribution_id)
                
                if dist['Distribution']['DistributionConfig']['Enabled']:
                    logger.info(f"Distribution {distribution_id} is enabled, attempting to disable...")
                    # Note: In production, you'd need to implement UpdateDistributionCommand
                    # For now, we'll try to delete it directly (this may fail if enabled)
                
                cloudfront_client.delete_distribution(Id=distribution_id, IfMatch=dist['ETag'])
                results["deleted"].append(f"CloudFront: {distribution_id}")
                logger.info(f"Successfully deleted CloudFront distribution: {distribution_id}")
            except ClientError as e:
                error_msg = f"CloudFront {distribution_id}: {e.response['Error']['Message']}"
                results["errors"].append(error_msg)
                logger.error(error_msg)
        
        # Delete S3 bucket if provided
        if bucket_name:
            try:
                logger.info(f"Cleaning up S3 bucket: {bucket_name}")
                
                # List and delete all objects in the bucket
                paginator = s3_client.get_paginator('list_objects_v2')
                pages = paginator.paginate(Bucket=bucket_name)
                
                objects_to_delete = []
                for page in pages:
                    if 'Contents' in page:
                        objects_to_delete.extend([{'Key': obj['Key']} for obj in page['Contents']])
                
                if objects_to_delete:
                    logger.info(f"Found {len(objects_to_delete)} objects to delete in bucket {bucket_name}")
                    
                    # Delete objects in batches (AWS allows up to 1000 objects per request)
                    batch_size = 1000
                    for i in range(0, len(objects_to_delete), batch_size):
                        batch = objects_to_delete[i:i + batch_size]
                        s3_client.delete_objects(
                            Bucket=bucket_name,
                            Delete={'Objects': batch}
                        )
                        logger.info(f"Deleted batch {i // batch_size + 1} of {len(objects_to_delete) // batch_size + 1}")
                
                # Delete the empty bucket
                s3_client.delete_bucket(Bucket=bucket_name)
                results["deleted"].append(f"S3: {bucket_name}")
                logger.info(f"Successfully deleted S3 bucket: {bucket_name}")
            except ClientError as e:
                error_msg = f"S3 {bucket_name}: {e.response['Error']['Message']}"
                results["errors"].append(error_msg)
                logger.error(error_msg)
        
        return {
            "success": True,
            "results": results,
            "message": f"Project cleanup completed for: {project_name}",
            "projectName": project_name,
            "bucketName": bucket_name,
            "distributionId": distribution_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during project cleanup: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error during project cleanup: {str(e)}"
        )
