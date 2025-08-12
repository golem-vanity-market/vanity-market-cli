output "backend_config" {
  value = {
    "s3" = {
      bucket              = module.state_bucket.id
      key                 = local.s3_state_key
      use_lockfile        = true
      region              = local.region
      allowed_account_ids = [tostring(data.aws_caller_identity.current.account_id)]
    }
  }
}
