#!/bin/bash
# Deploy: Docker build → ECR push → App Runner deploy
# Usage: bash scripts/deploy.sh [tag]
#   tag: Docker image tag (default: git SHA or "latest")
set -euo pipefail
cd "$(dirname "$0")/.."

APP_NAME="namuh-mintlify"
AWS_REGION="${AWS_REGION:-us-east-1}"
IMAGE_TAG="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ECR_URI:-${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}}"
SERVICE_NAME="${APP_NAME}-prod"
PORT=3000

echo "=== Deploy: ${APP_NAME} ==="
echo "  ECR:     ${ECR_URI}"
echo "  Tag:     ${IMAGE_TAG}"
echo "  Region:  ${AWS_REGION}"
echo "  Service: ${SERVICE_NAME}"
echo ""

# 1. Build Docker image
echo "--- Building Docker image ---"
docker build \
  --platform linux/amd64 \
  -t "${APP_NAME}:${IMAGE_TAG}" \
  -t "${APP_NAME}:latest" \
  .
echo "Docker build complete ✓"

# 2. Tag for ECR
echo ""
echo "--- Tagging for ECR ---"
docker tag "${APP_NAME}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"
docker tag "${APP_NAME}:latest" "${ECR_URI}:latest"
echo "Tagged ✓"

# 3. Authenticate with ECR
echo ""
echo "--- Authenticating with ECR ---"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo "ECR login ✓"

# 4. Push to ECR
echo ""
echo "--- Pushing to ECR ---"
docker push "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:latest"
echo "ECR push complete ✓"

# 5. Build env vars JSON for App Runner
echo ""
echo "--- Preparing environment ---"
ENV_VARS='{}'

# Read allowed env vars from .env
ALLOWED_VARS=(
  DATABASE_URL
  BETTER_AUTH_SECRET
  BETTER_AUTH_URL
  AUTH_GOOGLE_ID
  AUTH_GOOGLE_SECRET
  S3_BUCKET
  AWS_REGION
  NEXT_PUBLIC_APP_URL
  ANTHROPIC_API_KEY
)

for VAR in "${ALLOWED_VARS[@]}"; do
  VALUE=$(grep "^${VAR}=" .env 2>/dev/null | cut -d= -f2- || true)
  if [ -n "$VALUE" ]; then
    ENV_VARS=$(echo "$ENV_VARS" | jq --arg k "$VAR" --arg v "$VALUE" '. + {($k): $v}')
  fi
done

# Always set NODE_ENV and APP_VERSION
ENV_VARS=$(echo "$ENV_VARS" | jq \
  --arg ver "$IMAGE_TAG" \
  '. + {"NODE_ENV": "production", "APP_VERSION": $ver}')

# 6. Deploy to App Runner
echo ""
echo "--- Deploying to App Runner ---"

# Check if service exists
SERVICE_ARN=$(aws apprunner list-services --region "$AWS_REGION" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn" \
  --output text 2>/dev/null || echo "")

if [ -n "$SERVICE_ARN" ] && [ "$SERVICE_ARN" != "None" ]; then
  echo "Updating existing service: ${SERVICE_NAME}"

  # Update service with new image
  aws apprunner update-service \
    --service-arn "$SERVICE_ARN" \
    --source-configuration "{
      \"ImageRepository\": {
        \"ImageIdentifier\": \"${ECR_URI}:${IMAGE_TAG}\",
        \"ImageRepositoryType\": \"ECR\",
        \"ImageConfiguration\": {
          \"Port\": \"${PORT}\",
          \"RuntimeEnvironmentVariables\": ${ENV_VARS}
        }
      },
      \"AutoDeploymentsEnabled\": false,
      \"AuthenticationConfiguration\": {
        \"AccessRoleArn\": \"arn:aws:iam::${ACCOUNT_ID}:role/${APP_NAME}-apprunner-ecr-role\"
      }
    }" \
    --region "$AWS_REGION" \
    --output text > /dev/null

  echo "Service update initiated ✓"
else
  echo "Creating new App Runner service: ${SERVICE_NAME}"

  # Create IAM role for App Runner to pull from ECR (if not exists)
  ROLE_NAME="${APP_NAME}-apprunner-ecr-role"
  if ! aws iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
    echo "Creating IAM role: ${ROLE_NAME}"
    aws iam create-role \
      --role-name "$ROLE_NAME" \
      --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Principal": {"Service": "build.apprunner.amazonaws.com"},
          "Action": "sts:AssumeRole"
        }]
      }' \
      --output text > /dev/null

    aws iam attach-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-arn "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"

    echo "Waiting for role propagation..."
    sleep 10
  fi

  ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" \
    --query 'Role.Arn' --output text)

  # Create the App Runner service
  aws apprunner create-service \
    --service-name "$SERVICE_NAME" \
    --source-configuration "{
      \"ImageRepository\": {
        \"ImageIdentifier\": \"${ECR_URI}:${IMAGE_TAG}\",
        \"ImageRepositoryType\": \"ECR\",
        \"ImageConfiguration\": {
          \"Port\": \"${PORT}\",
          \"RuntimeEnvironmentVariables\": ${ENV_VARS}
        }
      },
      \"AutoDeploymentsEnabled\": false,
      \"AuthenticationConfiguration\": {
        \"AccessRoleArn\": \"${ROLE_ARN}\"
      }
    }" \
    --instance-configuration "{
      \"Cpu\": \"1024\",
      \"Memory\": \"2048\"
    }" \
    --health-check-configuration "{
      \"Protocol\": \"HTTP\",
      \"Path\": \"/api/health\",
      \"Interval\": 10,
      \"Timeout\": 5,
      \"HealthyThreshold\": 1,
      \"UnhealthyThreshold\": 5
    }" \
    --region "$AWS_REGION" \
    --output text > /dev/null

  echo "Service creation initiated ✓"
fi

# 7. Wait for deployment and get URL
echo ""
echo "--- Waiting for deployment ---"
echo "(This may take 3-5 minutes for first deploy...)"

# Poll for service status
for i in $(seq 1 60); do
  STATUS=$(aws apprunner describe-service \
    --service-arn "$(aws apprunner list-services --region "$AWS_REGION" \
      --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn" \
      --output text)" \
    --region "$AWS_REGION" \
    --query 'Service.Status' --output text 2>/dev/null || echo "UNKNOWN")

  if [ "$STATUS" = "RUNNING" ]; then
    break
  fi
  echo "  Status: ${STATUS} (attempt ${i}/60)"
  sleep 10
done

# Get the service URL
SERVICE_URL=$(aws apprunner describe-service \
  --service-arn "$(aws apprunner list-services --region "$AWS_REGION" \
    --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn" \
    --output text)" \
  --region "$AWS_REGION" \
  --query 'Service.ServiceUrl' --output text 2>/dev/null || echo "")

echo ""
echo "=== Deploy Complete ==="
if [ -n "$SERVICE_URL" ] && [ "$SERVICE_URL" != "None" ]; then
  echo "  URL:    https://${SERVICE_URL}"
  echo "  Health: https://${SERVICE_URL}/api/health"
  echo ""

  # 8. Verify health check
  echo "--- Verifying health check ---"
  HEALTH=$(curl -s "https://${SERVICE_URL}/api/health" 2>/dev/null || echo '{"status":"unreachable"}')
  echo "  Response: ${HEALTH}"

  STATUS=$(echo "$HEALTH" | jq -r '.status' 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "ok" ]; then
    echo "  Health check: PASSED ✓"
  else
    echo "  Health check: ${STATUS} (may need a moment to warm up)"
  fi
else
  echo "  Service URL not yet available — check AWS console"
fi

echo ""
echo "Done."
