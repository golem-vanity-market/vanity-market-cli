# AWS Secrets are expensive, so we use free Parameter Store instead.
# Normally, we would have some problems due to the fact that you
# cannot pin use of a particular version of SSM parameter in ECS
# task definition, but we only run a single instance of yagna,
# so we don't care.
resource "aws_ssm_parameter" "secret" {
  for_each = toset([
    local.api_key_secret_name,
    local.app_autoconf_id_secret_name,
  ])

  name  = "/${var.hyphenated_prefix}/${each.key}"
  type  = "SecureString"
  value = "FILLME"

  tier      = "Standard"
  data_type = "text"

  lifecycle {
    ignore_changes = [
      value
    ]
  }
}
