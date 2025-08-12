output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role for backend deployment"
  value       = aws_iam_role.github_actions.arn
}
