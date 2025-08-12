data "tls_certificate" "github_oidc" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github_oidc" {
  # The URL of the OIDC identity provider
  url = "https://token.actions.githubusercontent.com"

  # The audience value for the provider
  client_id_list = ["sts.amazonaws.com"]

  # The SHA1 fingerprint of the server's root CA certificate
  # We get this dynamically from the tls_certificate data source
  thumbprint_list = [data.tls_certificate.github_oidc.certificates[0].sha1_fingerprint]
}


# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "${local.hyphenated_prefix}-github-actions-backend-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_oidc.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = [
              "repo:${local.github_repository}:*"
            ]
          }
        }
      }
    ]
  })

  tags = {
    Name = "${local.hyphenated_prefix}-github-actions-backend-deploy"
  }
}

# ECR permissions policy
resource "aws_iam_policy" "github_actions_ecr" {
  name = "${local.hyphenated_prefix}-github-actions-ecr"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:DescribeRepositories",
          "ecr:DescribeImages",
          "ecr:BatchDeleteImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = "arn:aws:ecr:${local.region}:${data.aws_caller_identity.current.account_id}:repository/${local.hyphenated_prefix}-*"
      }
    ]
  })

  tags = {
    Name = "${local.hyphenated_prefix}-github-actions-ecr"
  }
}

# ECS permissions policy
resource "aws_iam_policy" "github_actions_ecs" {
  name = "${local.hyphenated_prefix}-github-actions-ecs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeClusters",
          "ecs:RegisterTaskDefinition"
        ]
        Resource = [
          "arn:aws:ecs:${local.region}:${data.aws_caller_identity.current.account_id}:cluster/${local.hyphenated_prefix}-*",
          "arn:aws:ecs:${local.region}:${data.aws_caller_identity.current.account_id}:service/${local.hyphenated_prefix}-*/*",
          "arn:aws:ecs:${local.region}:${data.aws_caller_identity.current.account_id}:task-definition/${local.hyphenated_prefix}-*:*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeTaskDefinition"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.hyphenated_prefix}-*-execution-role",
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.hyphenated_prefix}-*-task-role"
        ]
      }
    ]
  })

  tags = {
    Name = "${local.hyphenated_prefix}-github-actions-ecs"
  }
}

# Attach policies to the role
resource "aws_iam_role_policy_attachment" "github_actions_ecr" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions_ecr.arn
}

resource "aws_iam_role_policy_attachment" "github_actions_ecs" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions_ecs.arn
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}
