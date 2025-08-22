// CloudFormation templates for AWS resources

export const staticWebsiteTemplate = (bucketName: string, domainName?: string) => {
  const template = {
    AWSTemplateFormatVersion: "2010-09-09",
    Description: "Static website hosting with S3 and CloudFront",
    Parameters: {
      BucketName: {
        Type: "String",
        Default: bucketName,
        Description: "Name of the S3 bucket"
      }
    },
    Resources: {
      S3Bucket: {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: { Ref: "BucketName" },
          WebsiteConfiguration: {
            IndexDocument: "index.html",
            ErrorDocument: "404.html"
          },
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            BlockPublicPolicy: false,
            IgnorePublicAcls: false,
            RestrictPublicBuckets: false
          }
        }
      },
      S3BucketPolicy: {
        Type: "AWS::S3::BucketPolicy",
        Properties: {
          Bucket: { Ref: "S3Bucket" },
          PolicyDocument: {
            Statement: [
              {
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: {
                  "Fn::Sub": "${S3Bucket}/*"
                }
              }
            ]
          }
        }
      },
      CloudFrontDistribution: {
        Type: "AWS::CloudFront::Distribution",
        Properties: {
          DistributionConfig: {
            Origins: [
              {
                Id: "S3Origin",
                DomainName: {
                  "Fn::GetAtt": ["S3Bucket", "RegionalDomainName"]
                },
                CustomOriginConfig: {
                  HTTPPort: 80,
                  HTTPSPort: 443,
                  OriginProtocolPolicy: "http-only"
                }
              }
            ],
            Enabled: true,
            DefaultRootObject: "index.html",
            DefaultCacheBehavior: {
              TargetOriginId: "S3Origin",
              ViewerProtocolPolicy: "redirect-to-https",
              AllowedMethods: ["GET", "HEAD"],
              CachedMethods: ["GET", "HEAD"],
              ForwardedValues: {
                QueryString: false,
                Cookies: { Forward: "none" }
              },
              MinTTL: 0,
              DefaultTTL: 86400,
              MaxTTL: 31536000
            },
            PriceClass: "PriceClass_100",
            ViewerCertificate: {
              CloudFrontDefaultCertificate: true
            }
          }
        }
      }
    },
    Outputs: {
      BucketWebsiteURL: {
        Description: "URL of the S3 bucket website",
        Value: {
          "Fn::GetAtt": ["S3Bucket", "WebsiteURL"]
        }
      },
      CloudFrontURL: {
        Description: "URL of the CloudFront distribution",
        Value: {
          "Fn::Sub": "https://${CloudFrontDistribution.DomainName}"
        }
      }
    }
  };

  // Add Route53 record if custom domain is provided
  if (domainName) {
    template.Resources = {
      ...template.Resources,
      // Note: In a real implementation, you'd need to handle SSL certificates
      // and proper domain validation
    };
  }

  return template;
};

export const getDNSInstructions = (domainName: string, cloudFrontDomain: string) => {
  return {
    records: [
      {
        type: "CNAME",
        name: domainName.startsWith("www.") ? domainName : `www.${domainName}`,
        value: cloudFrontDomain,
        ttl: 300
      },
      {
        type: "A",
        name: domainName.replace("www.", ""),
        value: "Use your DNS provider's alias/ANAME record to point to CloudFront",
        ttl: 300
      }
    ],
    instructions: [
      "1. Log in to your domain registrar or DNS provider",
      "2. Navigate to DNS management for your domain",
      "3. Add the DNS records shown above",
      "4. Wait for DNS propagation (usually 5-15 minutes)",
      "5. Your site will be accessible at your custom domain"
    ]
  };
};
