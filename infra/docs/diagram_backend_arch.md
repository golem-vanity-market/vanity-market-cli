# Backend Infrastructure Architecture - vanity.market Preprod

```mermaid
graph TB
    subgraph "AWS Account 402998801060"
        subgraph "Region: eu-central-1"
            subgraph "VPC (10.11.0.0/16)"
                subgraph "Public Subnets"
                    ALB[Application Load Balancer<br/>backend-alb]
                    NAT[NAT Gateway<br/>1 instance]
                end
                
                subgraph "Private Subnets"
                    subgraph "ECS Cluster: main"
                        subgraph "Backend Service"
                            BACKEND[Backend ECS Task<br/>Fargate<br/>512 CPU / 1024 MB<br/>Port 3000]
                            BACKEND_ECR[ECR: backend<br/>:latest]
                        end
                        
                        subgraph "Yagna Service"
                            YAGNA[Yagna ECS Task<br/>EC2 Capacity Provider<br/>pre-rel-v0.17.1-preview.golembase.28]
                            YAGNA_ECR[ECR: yagna<br/>:tag]
                        end
                    end
                    
                    subgraph "Service Discovery"
                        SD[Service Discovery Namespace<br/>vanity-market-preprod.local]
                    end
                    
                    subgraph "Database (Disabled)"
                        POSTGRES[Aurora Postgres Serverless<br/>DISABLED - count = 0<br/>Min: 0.5 ACU, Max: 1 ACU]
                    end
                end
            end
            
            subgraph "CloudWatch"
                LOGS[Log Groups<br/>Retention: 7 days<br/>/ecs/vanity-market-preprod-backend<br/>/ecs/vanity-market-preprod-yagna]
            end
            
            subgraph "IAM"
                TASK_ROLE[ECS Task Role<br/>basic-ecs-iam]
                EXEC_ROLE[ECS Execution Role<br/>basic-ecs-iam]
            end
            
            subgraph "SSM"
                SSM_SECRETS[SSM Parameter Store<br/>Yagna Secrets]
            end
        end
        
        subgraph "S3 State Management"
            S3_STATE[S3 Bucket<br/>vanity-market-tofu-state-preprod-backend<br/>OpenTofu State Storage]
        end
    end
    
    subgraph "External"
        INTERNET[Internet]
        GOLEM[Golem Network<br/>Providers]
    end
    
    %% Connections
    INTERNET --> ALB
    ALB --> BACKEND
    BACKEND --> SD
    YAGNA --> SD
    YAGNA --> GOLEM
    BACKEND_ECR --> BACKEND
    YAGNA_ECR --> YAGNA
    BACKEND --> LOGS
    YAGNA --> LOGS
    TASK_ROLE --> BACKEND
    TASK_ROLE --> YAGNA
    EXEC_ROLE --> BACKEND
    EXEC_ROLE --> YAGNA
    YAGNA --> SSM_SECRETS
    
    %% Styling
    classDef aws fill:#ff9900,stroke:#000,stroke-width:2px,color:#fff
    classDef ecs fill:#0066cc,stroke:#000,stroke-width:2px,color:#fff
    classDef disabled fill:#ccc,stroke:#666,stroke-width:1px,color:#666
    classDef external fill:#90ee90,stroke:#000,stroke-width:2px,color:#000
    
    class ALB,NAT,LOGS,TASK_ROLE,EXEC_ROLE,SSM_SECRETS,S3_STATE aws
    class BACKEND,YAGNA,BACKEND_ECR,YAGNA_ECR,SD ecs
    class POSTGRES disabled
    class INTERNET,GOLEM external
```

## Architecture Overview

**Environment**: vanity-market-preprod  
**Region**: eu-central-1  
**VPC CIDR**: 10.11.0.0/16

### Core Components

1. **VPC & Networking**
   - Public subnets: ALB, NAT Gateway (1 instance)
   - Private subnets: ECS services, service discovery
   - Internet connectivity via NAT Gateway

2. **Container Services (ECS)**
   - **Backend**: Fargate task (512 CPU, 1024 MB) on port 3000
   - **Yagna**: EC2 capacity provider for Golem network integration
   - **Service Discovery**: Internal DNS resolution

3. **Container Registries (ECR)**
   - Backend: `:latest` tag
   - Yagna: `pre-rel-v0.17.1-preview.golembase.28` tag

4. **Load Balancing**
   - Application Load Balancer in public subnets
   - Routes traffic to backend ECS service

5. **Database**
   - Aurora Postgres Serverless (currently disabled)
   - Would provide 0.5-1 ACU capacity when enabled

6. **Monitoring & Secrets**
   - CloudWatch logs (7-day retention)
   - SSM Parameter Store for secrets
   - IAM roles for task and execution permissions

### Key Features

- **Scalability**: ECS with desired count 1 (configurable)
- **Security**: Private subnets, IAM roles, security groups
- **Monitoring**: Centralized logging to CloudWatch
- **State Management**: OpenTofu state in dedicated S3 bucket
- **Service Communication**: Internal service discovery for Yagna ↔ Backend
- **External Integration**: Yagna connects to Golem network providers

### Current Limitations

- Database is disabled (count = 0)
- Single NAT Gateway (not highly available)
- No SSL certificate on ALB
- Fixed desired count (no auto-scaling)