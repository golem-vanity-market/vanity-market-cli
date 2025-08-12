locals {
  region            = "eu-central-1"
  project_name      = "vanity-market"
  environment       = "preprod"
  project_tag_key   = "project"
  project_tag_value = local.project_name
  hyphenated_prefix = "${local.project_name}-${local.environment}"
}
