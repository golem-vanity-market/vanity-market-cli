terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.8"
    }
  }

  backend "s3" {
    allowed_account_ids = [
      "402998801060",
    ]
    bucket       = "vanity-market-tofu-state-preprod-backend"
    key          = "VanityMarket.tfstate"
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

provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
  default_tags {
    tags = {
      (local.project_tag_key) = local.project_tag_value
    }
  }
}
