locals {
  ec2_host_persisent_path = "/root/.local/share/yagna"
  ecs_container_name      = "yagna"
  yagna_persistent_volume = "yagna-data"
  api_port                = 7465
  golem_port              = 11500
  target_subnet           = [for subnet in data.aws_subnet.subnets : subnet if subnet.availability_zone == var.vpc.availability_zone][0]

  api_key_secret_name         = "api_key"
  app_autoconf_id_secret_name = "autoconf_id"
}

data "aws_subnet" "subnets" {
  count = length(var.vpc.subnet_ids)

  id = var.vpc.subnet_ids[count.index]
}

data "aws_vpc" "vpc" {
  id = var.vpc.id
}
