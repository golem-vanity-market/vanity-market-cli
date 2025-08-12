# Infrastructure

This directory contains OpenTofu infrastructure code and deployment scripts for the vanity.market project.

## Prerequisites

- [just](https://github.com/casey/just) - Command runner
- [OpenTofu](https://opentofu.org/) - Infrastructure as Code tool
- [AWS CLI](https://aws.amazon.com/cli/) - AWS command line interface
- [Docker](https://docker.com/) - Container platform
- [jq](https://stedolan.github.io/jq/) - JSON processor
- [tfsec](https://github.com/aquasecurity/tfsec) - Terraform security scanner

## Common Commands

### List all available commands

```bash
just
```

### OpenTofu Operations

#### Initialize remote state (first time setup)

```bash
just init_remote_state <environment_name> <subproject_name>
```

#### Run OpenTofu commands

```bash
# General pattern
just tf <env> <subproject> <tofu_args>

# Examples
just tf preprod backend plan
just tf preprod backend apply
just tf preprod frontend init
just tf preprod frontend output
```

#### Format OpenTofu code

```bash
# Check formatting
just fmt

# Fix formatting
just fmt_fix
```

### Security Operations

#### Run security scanning

```bash
just tfsec
```

#### Policy validation

```bash
just policies
```

### Destroy Operations

#### Safely destroy backend infrastructure

```bash
# Recommended: Use safe destroy which runs pre-cleanup automatically
just safe_destroy preprod backend
```

#### Manual destroy (if safe_destroy is unavailable)

```bash
# Step 1: Run pre-destroy cleanup to avoid getting stuck
just pre_destroy_cleanup preprod backend

# Step 2: Run standard destroy
just tf preprod backend destroy
```

#### Check ECS cluster health before operations

```bash
just check_ecs_health preprod
```

### Docker Operations

#### Login to ECR

```bash
just log_into_ecr <env>
```

#### Build and publish containers

```bash
# Publish Yagna container
just publish_yagna <env> <yagna_tag>

# Publish backend container
just publish_backend <env> <tag>
```

### Secret Management

#### Read SSM secrets

```bash
just read_ssm_secret <env> <module> <secret_tf_output_path>
```

#### Set SSM secrets

```bash
just set_ssm_secret <env> <module> <secret_tf_output_path> <secret_value>
```

## Project Structure

- `env/` - Environment-specific configurations
- `modules/` - Reusable Terraform modules
- `docker/` - Docker build configurations
- `remote_state_setup/` - Initial remote state setup

## Environment Variables

Set these in `.env` file or environment:

- `AWS_REGION` - AWS region (defaults to eu-central-1)


### Performance of OpenTofu with Otel

TBA - how to measure
