#!/bin/bash
set -euo pipefail

ENVIRONMENT=${1}
SUBPROJECT=${2}

echo "🧹 Starting pre-destroy cleanup for $ENVIRONMENT/$SUBPROJECT"

# Get OpenTofu outputs
OUTPUTS=$(just tf $ENVIRONMENT $SUBPROJECT output -json 2>/dev/null || echo '{}')

# Get cluster name from OpenTofu outputs
CLUSTER_NAME=$(echo "$OUTPUTS" | jq -r '.ecs_cluster_name.value // empty')

if [ -n "$CLUSTER_NAME" ]; then
    echo "📋 Found ECS cluster: $CLUSTER_NAME"
    
    # Step 1: Set all services to desired count 0
    echo "🛑 Setting all ECS services to desired count 0..."
    SERVICE_ARNS=$(aws ecs list-services --cluster "$CLUSTER_NAME" --query 'serviceArns[]' --output text 2>/dev/null || true)

    for service_arn in $SERVICE_ARNS; do
        if [ -n "$service_arn" ]; then
            SERVICE_NAME=$(basename "$service_arn")
            echo "  - Setting $SERVICE_NAME to desired count 0"
            aws ecs update-service \
                --cluster "$CLUSTER_NAME" \
                --service "$SERVICE_NAME" \
                --desired-count 0 || true
        fi
    done

    # Step 2: Wait for services to stabilize
    echo "⏳ Waiting for services to drain (max 10 minutes)..."
    if [ -n "$SERVICE_ARNS" ]; then
        timeout 600 aws ecs wait services-stable \
            --cluster "$CLUSTER_NAME" \
            --services $SERVICE_ARNS 2>/dev/null || {
            echo "⚠️  Services didn't stabilize within timeout, continuing anyway..."
        }
    fi

    # Step 3: Force container instances to DRAINING
    echo "🔧 Forcing container instances to DRAINING state..."
    CONTAINER_INSTANCES=$(aws ecs list-container-instances --cluster "$CLUSTER_NAME" --query 'containerInstanceArns[]' --output text 2>/dev/null || true)

    for instance in $CONTAINER_INSTANCES; do
        if [ -n "$instance" ]; then
            echo "  - Draining container instance: $(basename "$instance")"
            aws ecs update-container-instances-state \
                --cluster "$CLUSTER_NAME" \
                --container-instances "$instance" \
                --status DRAINING || true
        fi
    done

    # Step 4: Wait for container instances to drain
    echo "⏳ Waiting for container instances to complete draining..."
    sleep 30

    # Step 5: Check for any remaining tasks and stop them
    echo "🛑 Stopping any remaining tasks..."
    TASK_ARNS=$(aws ecs list-tasks --cluster "$CLUSTER_NAME" --query 'taskArns[]' --output text 2>/dev/null || true)

    for task_arn in $TASK_ARNS; do
        if [ -n "$task_arn" ]; then
            echo "  - Force stopping task: $(basename "$task_arn")"
            aws ecs stop-task \
                --cluster "$CLUSTER_NAME" \
                --task "$task_arn" \
                --reason "Pre-destroy cleanup" || true
        fi
    done
else
    echo "⚠️  No ECS cluster found, skipping ECS cleanup"
fi

echo "✅ Pre-destroy cleanup completed successfully!"
echo "📊 Cleanup summary for $ENVIRONMENT/$SUBPROJECT:"
echo "   - ECS services scaled down to 0"
echo "   - Container instances set to DRAINING"
echo "   - Remaining tasks forcefully stopped"
echo "🚀 You can now safely run: just tf $ENVIRONMENT $SUBPROJECT destroy"