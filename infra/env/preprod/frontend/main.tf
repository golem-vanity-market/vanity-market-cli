module "cloudfront" {
  source = "../../../modules/cloudfront"

  name_prefix_hyphenated = local.hyphenated_prefix
  comment                = local.hyphenated_prefix

  # TODO: use a real one once I know what the DNS setup is going to be
  certificate = null
  basic_auth  = null
}

module "cloudfront_logs" {
  source = "../../../modules/cloudfront_logs"

  name_prefix_hyphenated      = local.hyphenated_prefix
  cloudfront_distribution_arn = module.cloudfront.arn
  log_retention_in_days       = 3

  # CloudFront logging v2 is not supported in eu-central-1.
  # TODO: do we pay for interregional transfer? Is it much? Should we move the cloudfront distribution to the same region?
  providers = {
    aws = aws.us-east-1
  }
}
