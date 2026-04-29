#!/bin/bash
# Deploy: Docker build -> ECR push -> ECS Fargate service update
# Usage: bash scripts/deploy.sh [tag]
#   tag: Docker image tag (default: git SHA or "latest")
set -euo pipefail
cd "$(dirname "$0")/.."

APP_NAME="opendocs"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECS_CLUSTER="${ECS_CLUSTER:-opendocs}"
ECS_SERVICE="${ECS_SERVICE:-opendocs}"
CONTAINER_NAME="${CONTAINER_NAME:-opendocs}"
IMAGE_TAG="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ECR_URI:-${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}}"


echo "=== Deploy: ${APP_NAME} ==="
echo "  ECR:      ${ECR_URI}"
echo "  Tag:      ${IMAGE_TAG}"
echo "  Region:   ${AWS_REGION}"
echo "  Cluster:  ${ECS_CLUSTER}"
echo "  Service:  ${ECS_SERVICE}"
echo ""

# 1. Build Docker image
echo "--- Building Docker image ---"
PUBLIC_URL="${NEXT_PUBLIC_APP_URL:-https://opendocs.namuh.co}"
docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_APP_URL="${PUBLIC_URL}" \
  -t "${APP_NAME}:${IMAGE_TAG}" \
  -t "${APP_NAME}:latest" \
  .
echo "Docker build complete ✓"

# 2. Ensure ECR repository exists
echo ""
echo "--- Ensuring ECR repository ---"
aws ecr describe-repositories \
  --repository-names "${APP_NAME}" \
  --region "${AWS_REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository \
    --repository-name "${APP_NAME}" \
    --region "${AWS_REGION}" \
    --image-scanning-configuration scanOnPush=true \
    --output text >/dev/null
echo "ECR repository ready ✓"

# 3. Tag for ECR
echo ""
echo "--- Tagging for ECR ---"
docker tag "${APP_NAME}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"
docker tag "${APP_NAME}:latest" "${ECR_URI}:latest"
echo "Tagged ✓"

# 4. Authenticate with ECR
echo ""
echo "--- Authenticating with ECR ---"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo "ECR login ✓"

# 5. Push to ECR
echo ""
echo "--- Pushing to ECR ---"
docker push "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:latest"
echo "ECR push complete ✓"

# 6. Register a new ECS task definition revision with the new image
echo ""
echo "--- Registering ECS task definition revision ---"
CURRENT_TASK_DEF=$(aws ecs describe-services \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}" \
  --region "${AWS_REGION}" \
  --query 'services[0].taskDefinition' \
  --output text)

if [ -z "${CURRENT_TASK_DEF}" ] || [ "${CURRENT_TASK_DEF}" = "None" ]; then
  echo "No active task definition found for ${ECS_CLUSTER}/${ECS_SERVICE}" >&2
  exit 1
fi

TASK_DEF_JSON=$(aws ecs describe-task-definition \
  --task-definition "${CURRENT_TASK_DEF}" \
  --region "${AWS_REGION}" \
  --query 'taskDefinition')

NEW_TASK_DEF=$(echo "${TASK_DEF_JSON}" | jq \
  --arg image "${ECR_URI}:${IMAGE_TAG}" \
  --arg container "${CONTAINER_NAME}" \
  --arg version "${IMAGE_TAG}" \
  'del(
      .taskDefinitionArn,
      .revision,
      .status,
      .requiresAttributes,
      .compatibilities,
      .registeredAt,
      .registeredBy
    )
    | .containerDefinitions = (.containerDefinitions | map(
        if .name == $container then
          .image = $image
          | .environment = ((.environment // [])
              | map(if .name == "APP_VERSION" then .value = $version else . end))
        else . end
      ))')

NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
  --region "${AWS_REGION}" \
  --cli-input-json "${NEW_TASK_DEF}" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)
echo "Registered ${NEW_TASK_DEF_ARN} ✓"

# 7. Update ECS service
echo ""
echo "--- Updating ECS service ---"
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --task-definition "${NEW_TASK_DEF_ARN}" \
  --force-new-deployment \
  --region "${AWS_REGION}" \
  --output text >/dev/null
echo "Service update initiated ✓"

# 8. Wait for stability
echo ""
echo "--- Waiting for ECS service stability ---"
aws ecs wait services-stable \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}" \
  --region "${AWS_REGION}"
echo "Service stable ✓"

# 9. Verify health check
echo ""
echo "--- Verifying production health ---"
HEALTH_URL="${HEALTH_URL:-https://opendocs.namuh.co/api/health}"
HEALTH=$(curl -fsS "${HEALTH_URL}")
echo "${HEALTH}" | jq .
STATUS=$(echo "${HEALTH}" | jq -r '.status')
VERSION=$(echo "${HEALTH}" | jq -r '.version')
if [ "${STATUS}" != "ok" ]; then
  echo "Health check failed: ${STATUS}" >&2
  exit 1
fi
if [ "${VERSION}" != "${IMAGE_TAG}" ]; then
  echo "Warning: health version is ${VERSION}, expected ${IMAGE_TAG}. The ALB may still be draining old tasks." >&2
fi

echo ""
echo "=== Deploy Complete ==="
echo "  URL:    https://opendocs.namuh.co"
echo "  Health: ${HEALTH_URL}"
