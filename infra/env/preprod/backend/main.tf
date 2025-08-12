locals {
  yagna_ecr_name   = "yagna"
  backend_ecr_name = "backend"
}

module "vpc" {
  source = "../../../modules/vpc"

  name_prefix_hyphenated = local.hyphenated_prefix
  # TODO: check if it is sensible/free/...
  cidr_block             = "10.11.0.0/16"
  number_of_nat_gateways = 1
}

module "ecr" {
  for_each = toset([
    local.yagna_ecr_name,
    local.backend_ecr_name,
  ])

  source = "../../../modules/ecr"

  name_prefix_hyphenated = local.hyphenated_prefix
  name                   = each.key
}

module "basic_ecs_iam" {
  source = "../../../modules/basic_ecs_iam"

  name                   = "basic-ecs-iam"
  name_prefix_hyphenated = local.hyphenated_prefix
}

module "ecs_cluster" {
  source = "../../../modules/ecs_cluster"

  name                   = "main"
  name_prefix_hyphenated = local.hyphenated_prefix

  extra_capacity_providers = [module.yagna.capacity_provider_name]
}

module "service_discovery" {
  source = "../../../modules/service_discovery_namespace"

  hyphenated_prefix = local.hyphenated_prefix
  vpc_id            = module.vpc.id
}

module "yagna" {
  source = "../../../modules/yagna"

  hyphenated_prefix = local.hyphenated_prefix

  image = "${module.ecr[local.yagna_ecr_name].url}:${local.yagna_tag}"

  ecs_cluster_name            = module.ecs_cluster.name
  service_discovery_namespace = module.service_discovery.name_and_id

  task_role_arn      = module.basic_ecs_iam.task_role_arn
  execution_role_arn = module.basic_ecs_iam.execution_role_arn

  vpc = {
    id                = module.vpc.id
    availability_zone = "${local.region}a"
    subnet_ids        = module.vpc.private_subnet_ids
  }

  log_retention_in_days = 7
}

module "backend" {
  source = "../../../modules/backend"

  hyphenated_prefix = local.hyphenated_prefix

  image = "${module.ecr[local.backend_ecr_name].url}:latest"

  ecs_cluster_name            = module.ecs_cluster.name
  service_discovery_namespace = module.service_discovery.name_and_id

  task_role_arn      = module.basic_ecs_iam.task_role_arn
  execution_role_arn = module.basic_ecs_iam.execution_role_arn

  vpc = {
    id         = module.vpc.id
    subnet_ids = module.vpc.private_subnet_ids
    cidr_block = module.vpc.cidr_block
  }

  load_balancer = {
    host_header  = module.backend_alb.dns_name
    listener_arn = module.backend_alb.listener_arn
  }

  desired_count = 1
  cpu           = 512
  memory        = 1024

  log_retention_in_days = 7

  container_port = 3000
}


module "backend_alb" {
  source = "../../../modules/public_alb"

  name_prefix_hyphenated = local.hyphenated_prefix

  certificate_arn = null
  vpc = {
    id         = module.vpc.id
    subnet_ids = module.vpc.public_subnet_ids
  }
}

module "postgres" {
  # TODO: enable at some point, consider porting the code to the not-serverless RDS, which is probably cheaper.
  count = 0

  source = "../../../modules/postgres_aurora"

  name = "backend"

  name_prefix_hyphenated = local.hyphenated_prefix

  vpc = {
    id         = module.vpc.id
    subnet_ids = module.vpc.private_subnet_ids
    cidr_block = module.vpc.cidr_block
  }

  min_capacity             = 0.5
  max_capacity             = 1
  use_io_optimized_storage = false

  seconds_auto_pause           = 3600
  backup_retention_period_days = 7

  database_name = local.hyphenated_prefix
}
