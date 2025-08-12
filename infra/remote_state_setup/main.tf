module "state_bucket" {
  source = "../modules/private_s3_bucket"

  name_prefix_hyphenated = local.project_name
  name                   = "tofu-state-${var.env}-${var.subproject}"

  versioning_enabled = true
}

data "aws_caller_identity" "current" {}
