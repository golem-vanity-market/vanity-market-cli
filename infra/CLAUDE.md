# CLAUDE.md - Infrastructure Management

This document provides comprehensive guidance for managing the vanity.market infrastructure, which deploys the webapp (backend + frontend) and Yagna instances to work with the Golem network on AWS.

## Common Commands

### OpenTofu Operations

- `just tf preprod backend plan`: Plan backend infrastructure changes
- `just tf preprod backend apply`: Apply backend infrastructure changes
- `just tf preprod frontend plan`: Plan frontend infrastructure changes
- `just tf preprod frontend apply`: Apply frontend infrastructure changes
- `just fmt`: Check OpenTofu code formatting
- `just fmt_fix`: Fix OpenTofu code formatting

### Container Operations

- `just log_into_ecr preprod`: Login to ECR registry
- `just publish_yagna preprod <tag>`: Build and publish Yagna container
- `just publish_backend preprod <tag>`: Build and publish backend container

### Security & Validation

- `just tfsec`: Run security scanning on infrastructure
- `just policies`: Validate infrastructure policies

### Secret Management

- `just read_ssm_secret preprod backend <path>`: Read SSM parameter
- `just set_ssm_secret preprod backend <path> <value>`: Set SSM parameter

### Infrastructure Management

- `just safe_destroy preprod backend`: Safe destroy with automated cleanup
- `just pre_destroy_cleanup preprod backend`: Run pre-destroy cleanup only
- `just check_ecs_health preprod`: Check ECS cluster health

### Initial Setup

- `just init_remote_state preprod backend`: Initialize remote state (first time only)

## Project Architecture

### Infrastructure Overview

**Environment**: vanity-market-preprod  
**AWS Account**: 402998801060  
**Region**: eu-central-1  
**VPC CIDR**: 10.11.0.0/16

The vanity.market infrastructure consists of:

- **Backend**: Fastify Node.js API running on ECS Fargate (512 CPU/1024 MB) on port 3000
- **Frontend**: Next.js static site served via CloudFront + S3
- **Yagna**: Running on ECS with EC2 capacity provider for Golem network integration
- **Database**: Aurora Postgres Serverless (currently disabled - count = 0)
- **Shared Services**: VPC, ECR, IAM, CloudWatch, Service Discovery, SSM Parameter Store

### Architecture Details

**VPC & Networking**:

- Public subnets: Application Load Balancer, NAT Gateway (1 instance)
- Private subnets: ECS services, service discovery
- Internet connectivity via NAT Gateway

**Container Services**:

- ECS Cluster: `golem-vanity-market-preprod-main`
- Backend service: Fargate deployment
- Yagna service: EC2 capacity provider deployment
- Service Discovery: `vanity-market-preprod.local` namespace

**Container Images**:

- Backend ECR: `:latest` tag
- Yagna ECR: `pre-rel-v0.17.1-preview.golembase.28` tag

**Current Limitations**:

- Database disabled (count = 0)
- Single NAT Gateway (not highly available)
- No SSL certificate on ALB
- Fixed desired count (no auto-scaling)

### Technology Stack

- **IaC**: OpenTofu (Terraform fork)
- **Cloud**: AWS (eu-central-1)
- **Orchestration**: ECS for backend, EC2 for Yagna
- **CDN**: CloudFront for frontend delivery
- **Storage**: S3 for static assets, SQLite for backend data
- **Monitoring**: CloudWatch logs and metrics
- **Security**: IAM roles, Security Groups, VPC isolation

## Prerequisites

Ensure these tools are installed:

```bash
# Core tools
just --version                    # Command runner
tofu --version                    # OpenTofu (Terraform)
aws --version                     # AWS CLI v2
docker --version                  # Container platform
jq --version                      # JSON processor

# Security tools
tfsec --version                   # Terraform security scanner

# Node.js tools (for webapp)
node --version                    # Node.js 23+
npm --version                     # Package manager
```

## Environment Setup

### Environment Variables

Set these in `.env` file or shell:

```bash
# AWS Configuration
export AWS_REGION="eu-central-1"
export AWS_PAGER=""

# Optional: AWS credentials (or use aws configure)
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
```

### Environment Structure

Currently supports:

- **preprod**: Pre-production environment
  - `backend/`: ECS service for API
  - `frontend/`: CloudFront + S3 for static site

**Note**: Production environment is not yet implemented.

## Deployment Workflows

### Initial Setup (First Time Only)

1. **Initialize remote state**:

```bash
# Format: just init_remote_state <environment> <subproject>
just init_remote_state preprod backend
```

2. **Deploy backend infrastructure**:

```bash
just tf preprod backend init
just tf preprod backend plan
just tf preprod backend apply
```

3. **Deploy frontend infrastructure**:

```bash
just tf preprod frontend init
just tf preprod frontend plan
just tf preprod frontend apply
```

### Regular Deployment Commands

#### Backend Deployment

```bash
# Plan changes
just tf preprod backend plan

# Apply changes
just tf preprod backend apply

# View current infrastructure
just tf preprod backend show
```

#### Frontend Deployment

```bash
# Plan changes
just tf preprod frontend plan

# Apply changes
just tf preprod frontend apply

# View outputs (CloudFront URL, S3 bucket)
just tf preprod frontend output
```

#### Yagna Container Management

```bash
# Login to ECR
just log_into_ecr preprod

# Build and publish Yagna container
just publish_yagna preprod pre-rel-v0.17.1-preview.golembase.28
```

### Complete Application Deployment

For full webapp deployment:

1. **Deploy infrastructure**:

```bash
# Backend infrastructure
just tf preprod backend apply

# Frontend infrastructure
just tf preprod frontend apply
```

2. **Build and deploy applications**:

```bash
# Build and publish backend container
just publish_backend preprod latest

# Build and publish Yagna container
just publish_yagna preprod pre-rel-v0.17.1-preview.golembase.28

# Build frontend static assets
cd ../webapp/frontend
npm run build

# Deploy to S3 (manual step - needs automation)
aws s3 sync out/ s3://$(just tf preprod frontend output -json | jq -r .s3_bucket.value)
```

## Security Guidelines

### Security Scanning

Run security scans before deployment:

```bash
# Scan infrastructure code
just tfsec

# Validate policies
just policies

# Fix high/critical issues before deploying
```

### Secret Management

Use SSM Parameter Store for secure secret management:

```bash
# Read secrets
just read_ssm_secret preprod backend yagna_app_key

# Set secrets
just set_ssm_secret preprod backend yagna_app_key "your-secret-value"

# View secret parameter names in infrastructure
just tf preprod backend output -json | jq .ssm_secret_parameter_names.value
```

## Operational Commands

### Infrastructure Management

```bash
# List all available commands
just

# View infrastructure state
just tf preprod backend show
just tf preprod frontend show

# Check for drift
just tf preprod backend plan
just tf preprod frontend plan

# View outputs (URLs, ARNs, etc.)
just tf preprod backend output
just tf preprod frontend output
```

### Container Operations

```bash
# ECR login
just log_into_ecr preprod

# View ECR repositories
aws ecr describe-repositories

# List container images
aws ecr list-images --repository-name golem-vanity-market-preprod-yagna
```

### Monitoring and Logs

```bash
# ECS service logs
aws logs tail /ecs/golem-vanity-market-preprod-backend --follow

# Yagna logs
aws logs tail /ecs/golem-vanity-market-preprod-yagna --follow

# CloudFront access logs
aws s3 ls s3://golem-vanity-market-preprod-cloudfront-logs/
```

### Service Management

```bash
# ECS service status
aws ecs describe-services --cluster golem-vanity-market-preprod-main --services backend

# Restart ECS service
aws ecs update-service --cluster golem-vanity-market-preprod-main --service backend --force-new-deployment

# Scale ECS service (currently fixed at 1)
aws ecs update-service --cluster golem-vanity-market-preprod-main --service backend --desired-count 2
```

## Webapp Integration

### Backend Configuration

The backend requires these environment variables from infrastructure:

```bash
# Database (PSQL)
# TBA

# Yagna integration
YAGNA_APPKEY=$(aws secretsmanager get-secret-value --secret-id yagna-app-key --query SecretString --output text)

# Service discovery (for Yagna communication)
YAGNA_API_URL=http://yagna.golem-vanity-market-preprod.local:7465
```

### Frontend Configuration

The frontend requires these outputs from infrastructure:

```bash
# API endpoint
NEXT_PUBLIC_API_URL=$(just tf preprod backend output -json | jq -r .alb_dns_name.value)

# CloudFront distribution
CLOUDFRONT_URL=$(just tf preprod frontend output -json | jq -r .cloudfront_url.value)
```

### Deployment Integration

```bash
# Get backend container registry
ECR_BACKEND=$(just tf preprod backend output -json | jq -r .ecr_url.value.backend)

# Get frontend S3 bucket
S3_FRONTEND=$(just tf preprod frontend output -json | jq -r .s3_bucket.value)

# Example deployment commands
docker tag backend:latest $ECR_BACKEND:latest
docker push $ECR_BACKEND:latest

aws s3 sync webapp/frontend/out/ s3://$S3_FRONTEND/
```

## Yagna/Golem Network

### Yagna Infrastructure

- **Container**: Custom Docker image based on Ubuntu 24.04
- **Deployment**: ECS task on dedicated EC2 capacity provider
- **Networking**: Private subnet with service discovery
- **Storage**: EBS volume for Yagna data persistence
- **Security**: Dedicated security group, IAM role for ECS integration

### Yagna Configuration

```bash
# View Yagna service status
aws ecs describe-services --cluster golem-vanity-market-preprod-main --services yagna

# Check Yagna logs
aws logs tail /ecs/golem-vanity-market-preprod-yagna --follow

# Access Yagna API (from backend)
curl http://yagna.golem-vanity-market-preprod.local:7465/me
```

### Yagna Container Updates

```bash
# Build new Yagna version
just publish_yagna preprod v0.17.2-new-version

# Update ECS service
aws ecs update-service --cluster golem-vanity-market-preprod-main --service yagna --force-new-deployment
```

## Database and Storage

### SQLite Database (Backend)

- **Location**: EFS mount or container local storage
- **Backup**: Manual snapshots (needs automation)
- **Schema**: Managed by Drizzle ORM in webapp/backend

```bash
# Access backend container for DB operations
aws ecs execute-command --cluster golem-vanity-market-preprod-main --task <task-id> --interactive --command /bin/bash

# Inside container
sqlite3 /data/db.sqlite
.tables
.schema users
```

### S3 Storage

```bash
# Frontend assets bucket
aws s3 ls s3://golem-vanity-market-preprod-frontend/

# CloudFront logs bucket
aws s3 ls s3://golem-vanity-market-preprod-cloudfront-logs/

# Sync frontend assets
aws s3 sync webapp/frontend/out/ s3://golem-vanity-market-preprod-frontend/
```

## Cost Optimization

### Current Cost Estimate

- **Monthly**: TBA
- **Main costs**: EC2 instances, ECS tasks, CloudFront, data transfer

### Optimization Opportunities

1. **Auto-scaling**: Implement ECS auto-scaling policies
2. **Spot instances**: Use EC2 Spot for non-critical workloads
3. **Reserved instances**: For stable production workloads
4. **S3 lifecycle**: Archive old logs to cheaper storage tiers

```bash
# View current costs
aws ce get-cost-and-usage --time-period Start=2024-07-01,End=2024-07-31 --granularity MONTHLY --metrics BlendedCost
```

## Troubleshooting

### Common Issues

#### 1. ECS Service Won't Start

```bash
# Check service events
aws ecs describe-services --cluster golem-vanity-market-preprod-main --services backend

# Check task definition
aws ecs describe-task-definition --task-definition golem-vanity-market-preprod-backend

# Check logs
aws logs tail /ecs/golem-vanity-market-preprod-backend --follow
```

#### 2. OpenTofu Apply Fails

```bash
# Check for state lock
just tf preprod backend force-unlock <lock-id>

# Refresh state
just tf preprod backend refresh

# Import existing resources if needed
just tf preprod backend import aws_instance.yagna i-1234567890abcdef0

# Format code issues
just fmt_fix
```

#### 3. Container Build Issues

```bash
# Check ECR login
just log_into_ecr preprod

# Test local container build
cd docker/yagna
docker build . --build-arg YAGNA_TAG=v0.17.1

# Check ECR repository
aws ecr describe-repositories --repository-names golem-vanity-market-preprod-yagna
```

#### 4. Yagna Communication Issues

```bash
# Test service discovery
dig yagna.golem-vanity-market-preprod.local

# Check security groups
aws ec2 describe-security-groups --group-names golem-vanity-market-preprod-yagna

# Test connectivity from backend
aws ecs execute-command --cluster golem-vanity-market-preprod-main --task <backend-task-id> --interactive --command "curl -v http://yagna.golem-vanity-market-preprod.local:7465/me"
```

### Debugging Commands

```bash
# Infrastructure state
just tf preprod backend state list
just tf preprod frontend state list

# Service status
aws ecs list-services --cluster golem-vanity-market-preprod-main
aws ecs list-tasks --cluster golem-vanity-market-preprod-main

# Network connectivity
aws ec2 describe-vpc-endpoints
aws ec2 describe-route-tables

# Logs aggregation
aws logs filter-log-events --log-group-name /ecs/golem-vanity-market-preprod-backend --start-time $(date -d '1 hour ago' +%s)000
```

## Production Readiness

### Current Status: NOT PRODUCTION READY

**Production Readiness Score: NA**

### Required Before Production

1. **Security**: Fix all critical security issues
2. **High Availability**: Multi-AZ deployment
3. **Monitoring**: Comprehensive alerting
4. **Backup**: Automated backup strategy
5. **CI/CD**: Proper deployment pipeline
6. **Testing**: Infrastructure testing

### Production Environment Setup

```bash
# TODO: Create production environment
mkdir -p env/prod/{backend,frontend}

# TODO: Implement proper secret management
# TODO: Set up monitoring and alerting
# TODO: Configure automated backups
# TODO: Implement disaster recovery procedures
```

## Emergency Procedures

### Service Outage Response

1. **Identify affected services**:

```bash
aws ecs describe-services --cluster golem-vanity-market-preprod-main
```

2. **Check recent deployments**:

```bash
aws ecs describe-services --cluster golem-vanity-market-preprod-main --services backend --query 'services[0].deployments'
```

3. **Rollback if needed**:

```bash
# Revert to previous task definition
aws ecs update-service --cluster golem-vanity-market-preprod-main --service backend --task-definition golem-vanity-market-preprod-backend:PREVIOUS
```

### Data Recovery

```bash
# EBS snapshot recovery
aws ec2 describe-snapshots --owner-ids self --filters "Name=tag:Name,Values=yagna-data"

# Database backup (manual)
aws ecs execute-command --cluster golem-vanity-market-preprod-main --task <task-id> --interactive --command "sqlite3 /data/db.sqlite .dump > /tmp/backup.sql"
```

## Development Integration

### Local Development with Infrastructure

```bash
# Port forward to ECS service
aws ssm start-session --target <ecs-instance-id> --document-name AWS-StartPortForwardingSession --parameters '{"portNumber":["3000"],"localPortNumber":["3000"]}'

# Local development against cloud Yagna
export YAGNA_API_URL=http://yagna.golem-vanity-market-preprod.local:7465
cd ../webapp/backend
npm run dev
```

### Infrastructure Testing

```bash
# Test infrastructure with terratest (TODO)
# Test deployment with staging environment (TODO)
```

## Key Information for Claude

### Environment Details

- **Environment**: preprod (production not implemented)
- **Region**: eu-central-1 (fixed in configuration)
- **State**: S3 remote state with DynamoDB locking
- **Database**: Currently disabled (count = 0)

### Important Workflows

- Always run `just fmt` before committing OpenTofu code
- Always run `just tfsec` before applying infrastructure changes
- Use `just publish_backend preprod <tag>` instead of manual Docker commands
- Backend communicates with Yagna via service discovery at `yagna.vanity-market-preprod.local:7465`

### Current Limitations

- Not production ready (score 2/10)
- Single NAT Gateway (availability risk)
- No SSL on ALB
- Manual secret management
- No auto-scaling configured

### Code Standards

- Use OpenTofu (not Terraform)
- All commands go through `just` wrapper
- Format code with `just fmt_fix`
- Validate security with `just tfsec`

## Additional Resources

- **Project Management**: `../CLAUDE.md` (root project docs)
- **Webapp Docs**: `../webapp/CLAUDE.md`
- **Architecture Diagram**: `docs/diagram_backend_arch.md`
- **JIRA Board**: https://unoperate.atlassian.net/jira/software/projects/GOL/boards/82
- **AWS Console**: https://eu-central-1.console.aws.amazon.com/
