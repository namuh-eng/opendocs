#!/bin/bash
# Pre-flight: AWS full stack setup (production tier)
# Provisions: VPC, RDS Postgres, S3, ECR
set -euo pipefail
cd "$(dirname "$0")/.."

APP_NAME="namuh-mintlify"
AWS_REGION="${AWS_REGION:-us-east-1}"
DB_NAME="namuh_mintlify"
DB_USER="mintlify_admin"
DB_INSTANCE_CLASS="${DB_INSTANCE_CLASS:-db.t3.micro}"

echo "=== Pre-flight Setup (AWS Full Stack) ==="
echo ""

# 0. Generate DB password if not set
if ! grep -q '^DB_PASSWORD=.' .env 2>/dev/null; then
  DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  echo "DB_PASSWORD=${DB_PASSWORD}" >> .env
  echo "Generated DB_PASSWORD ✓"
else
  DB_PASSWORD=$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)
  echo "DB_PASSWORD already set ✓"
fi

# 1. VPC + Networking
echo ""
echo "--- VPC + Networking ---"
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=${APP_NAME}-vpc" \
  --query 'Vpcs[0].VpcId' --output text --region "$AWS_REGION" 2>/dev/null)

if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
  VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
    --query 'Vpc.VpcId' --output text --region "$AWS_REGION")
  aws ec2 create-tags --resources "$VPC_ID" \
    --tags Key=Name,Value="${APP_NAME}-vpc" --region "$AWS_REGION"
  aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support --region "$AWS_REGION"
  aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames --region "$AWS_REGION"
  echo "Created VPC: ${VPC_ID} ✓"
else
  echo "VPC already exists: ${VPC_ID} ✓"
fi

# Subnets (need 2 AZs for RDS subnet group)
AZS=($(aws ec2 describe-availability-zones --region "$AWS_REGION" \
  --query 'AvailabilityZones[:2].ZoneName' --output text))

SUBNET_IDS=()
for i in 0 1; do
  SUBNET_ID=$(aws ec2 describe-subnets \
    --filters "Name=tag:Name,Values=${APP_NAME}-subnet-${i}" "Name=vpc-id,Values=${VPC_ID}" \
    --query 'Subnets[0].SubnetId' --output text --region "$AWS_REGION" 2>/dev/null)

  if [ "$SUBNET_ID" = "None" ] || [ -z "$SUBNET_ID" ]; then
    SUBNET_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" \
      --cidr-block "10.0.${i}.0/24" --availability-zone "${AZS[$i]}" \
      --query 'Subnet.SubnetId' --output text --region "$AWS_REGION")
    aws ec2 create-tags --resources "$SUBNET_ID" \
      --tags Key=Name,Value="${APP_NAME}-subnet-${i}" --region "$AWS_REGION"
    echo "Created subnet ${i}: ${SUBNET_ID} (${AZS[$i]}) ✓"
  else
    echo "Subnet ${i} already exists: ${SUBNET_ID} ✓"
  fi
  SUBNET_IDS+=("$SUBNET_ID")
done

# Internet Gateway (needed for public access during dev)
IGW_ID=$(aws ec2 describe-internet-gateways \
  --filters "Name=tag:Name,Values=${APP_NAME}-igw" \
  --query 'InternetGateways[0].InternetGatewayId' --output text --region "$AWS_REGION" 2>/dev/null)

if [ "$IGW_ID" = "None" ] || [ -z "$IGW_ID" ]; then
  IGW_ID=$(aws ec2 create-internet-gateway \
    --query 'InternetGateway.InternetGatewayId' --output text --region "$AWS_REGION")
  aws ec2 create-tags --resources "$IGW_ID" \
    --tags Key=Name,Value="${APP_NAME}-igw" --region "$AWS_REGION"
  aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$AWS_REGION" 2>/dev/null || true
  echo "Created and attached IGW: ${IGW_ID} ✓"
else
  echo "IGW already exists: ${IGW_ID} ✓"
fi

# Route table
RT_ID=$(aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=${VPC_ID}" "Name=association.main,Values=true" \
  --query 'RouteTables[0].RouteTableId' --output text --region "$AWS_REGION")
aws ec2 create-route --route-table-id "$RT_ID" --destination-cidr-block 0.0.0.0/0 \
  --gateway-id "$IGW_ID" --region "$AWS_REGION" 2>/dev/null || true

# Security group for RDS
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=${APP_NAME}-db-sg" "Name=vpc-id,Values=${VPC_ID}" \
  --query 'SecurityGroups[0].GroupId' --output text --region "$AWS_REGION" 2>/dev/null)

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group --group-name "${APP_NAME}-db-sg" \
    --description "RDS access for ${APP_NAME}" --vpc-id "$VPC_ID" \
    --query 'GroupId' --output text --region "$AWS_REGION")
  aws ec2 create-tags --resources "$SG_ID" \
    --tags Key=Name,Value="${APP_NAME}-db-sg" --region "$AWS_REGION"
  # Allow Postgres from anywhere (restrict in production)
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
    --protocol tcp --port 5432 --cidr 0.0.0.0/0 --region "$AWS_REGION"
  echo "Created security group: ${SG_ID} ✓"
else
  echo "Security group already exists: ${SG_ID} ✓"
fi

# 2. RDS Postgres
echo ""
echo "--- RDS Postgres ---"
DB_STATUS=$(aws rds describe-db-instances --db-instance-identifier "${APP_NAME}-db" \
  --query 'DBInstances[0].DBInstanceStatus' --output text --region "$AWS_REGION" 2>/dev/null || echo "not-found")

if [ "$DB_STATUS" = "not-found" ]; then
  # Create DB subnet group
  aws rds create-db-subnet-group --db-subnet-group-name "${APP_NAME}-subnet-group" \
    --db-subnet-group-description "Subnets for ${APP_NAME} RDS" \
    --subnet-ids "${SUBNET_IDS[@]}" --region "$AWS_REGION" 2>/dev/null || true

  aws rds create-db-instance \
    --db-instance-identifier "${APP_NAME}-db" \
    --db-instance-class "$DB_INSTANCE_CLASS" \
    --engine postgres \
    --engine-version 16 \
    --master-username "$DB_USER" \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --db-name "$DB_NAME" \
    --vpc-security-group-ids "$SG_ID" \
    --db-subnet-group-name "${APP_NAME}-subnet-group" \
    --publicly-accessible \
    --backup-retention-period 7 \
    --no-multi-az \
    --storage-type gp3 \
    --region "$AWS_REGION" \
    --output text > /dev/null

  echo "Creating RDS instance (this takes 5-10 minutes)..."
  aws rds wait db-instance-available \
    --db-instance-identifier "${APP_NAME}-db" --region "$AWS_REGION"
  echo "RDS instance ready ✓"
else
  echo "RDS instance already exists (status: ${DB_STATUS}) ✓"
  if [ "$DB_STATUS" != "available" ]; then
    echo "Waiting for RDS to become available..."
    aws rds wait db-instance-available \
      --db-instance-identifier "${APP_NAME}-db" --region "$AWS_REGION"
  fi
fi

# Get RDS endpoint and write DATABASE_URL
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "${APP_NAME}-db" \
  --query 'DBInstances[0].Endpoint.Address' --output text --region "$AWS_REGION")
RDS_PORT=$(aws rds describe-db-instances \
  --db-instance-identifier "${APP_NAME}-db" \
  --query 'DBInstances[0].Endpoint.Port' --output text --region "$AWS_REGION")

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}?sslmode=no-verify"

# Update DATABASE_URL in .env
if grep -q '^DATABASE_URL=' .env 2>/dev/null; then
  sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env && rm -f .env.bak
else
  echo "DATABASE_URL=${DATABASE_URL}" >> .env
fi
grep -q '^DB_SSL=' .env || echo "DB_SSL=true" >> .env
echo "DATABASE_URL written to .env ✓"

# 3. Better Auth secret
echo ""
echo "--- Better Auth ---"
if ! grep -q '^BETTER_AUTH_SECRET=.' .env 2>/dev/null; then
  SECRET=$(openssl rand -base64 32)
  echo "BETTER_AUTH_SECRET=${SECRET}" >> .env
  echo "Generated BETTER_AUTH_SECRET ✓"
else
  echo "BETTER_AUTH_SECRET already set ✓"
fi
if ! grep -q '^BETTER_AUTH_URL=.' .env 2>/dev/null; then
  echo "BETTER_AUTH_URL=http://localhost:3015" >> .env
  echo "Set BETTER_AUTH_URL=http://localhost:3015 ✓"
else
  echo "BETTER_AUTH_URL already set ✓"
fi

# 4. S3 bucket
echo ""
echo "--- S3 Storage ---"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="${APP_NAME}-assets-${ACCOUNT_ID}"
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "S3 bucket already exists: ${BUCKET_NAME} ✓"
else
  if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" --output text > /dev/null
  else
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION" --output text > /dev/null
  fi
  echo "Created S3 bucket: ${BUCKET_NAME} ✓"
fi

aws s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3015"],
    "MaxAgeSeconds": 3600
  }]
}'
echo "S3 CORS configured ✓"

grep -q '^S3_BUCKET=' .env || echo "S3_BUCKET=${BUCKET_NAME}" >> .env
grep -q '^AWS_REGION=' .env || echo "AWS_REGION=${AWS_REGION}" >> .env

# 5. ECR repository
echo ""
echo "--- ECR Repository ---"
if aws ecr describe-repositories --repository-names "$APP_NAME" --region "$AWS_REGION" > /dev/null 2>&1; then
  echo "ECR repo already exists: ${APP_NAME} ✓"
else
  aws ecr create-repository \
    --repository-name "$APP_NAME" \
    --region "$AWS_REGION" \
    --image-scanning-configuration scanOnPush=true \
    --output text > /dev/null
  echo "Created ECR repo: ${APP_NAME} ✓"
fi

ECR_URI=$(aws ecr describe-repositories --repository-names "$APP_NAME" --region "$AWS_REGION" \
  --query 'repositories[0].repositoryUri' --output text)
grep -q '^ECR_URI=' .env || echo "ECR_URI=${ECR_URI}" >> .env

# 6. Push Drizzle schema
echo ""
echo "--- Database Schema ---"
npm run db:push 2>&1 || echo "WARNING: db:push failed — schema may need to be created after build"

echo ""
echo "=== Pre-flight Complete ==="
echo "  Database:  RDS Postgres (${RDS_ENDPOINT})"
echo "  Storage:   S3 (${BUCKET_NAME})"
echo "  Registry:  ECR (${ECR_URI})"
echo "  Auth:      Better Auth (Google OAuth)"
echo ""
echo "Ready for the build loop."
