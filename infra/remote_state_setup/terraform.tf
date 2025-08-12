terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.5"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
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
