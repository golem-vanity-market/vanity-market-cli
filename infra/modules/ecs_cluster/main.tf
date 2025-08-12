resource "aws_ecs_cluster" "main" {
  name = "${var.name_prefix_hyphenated}-${var.name}-cluster"
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = concat(["FARGATE"], var.extra_capacity_providers)

  default_capacity_provider_strategy {
    weight            = 1
    capacity_provider = "FARGATE"
    base              = 0
  }
}
