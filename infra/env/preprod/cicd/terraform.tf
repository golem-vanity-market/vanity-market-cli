terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.5"
    }
  }

  backend "s3" {
    allowed_account_ids = [
      "402998801060",
    ]
    bucket       = "vanity-market-tofu-state-preprod-cicd"
    key          = "VanityMarketBackendCICD.tfstate"
    region       = "eu-central-1"
    use_lockfile = true
  }
}

provider "aws" {
  region = local.region

  default_tags {
    tags = {
      (local.project_tag_key) = local.project_tag_value
    }
  }
}
