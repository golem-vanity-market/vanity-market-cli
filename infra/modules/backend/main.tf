locals {
  ecs_container_name = "backend"
}

resource "aws_ecs_service" "backend" {
  name                               = "${var.hyphenated_prefix}-backend"
  cluster                            = var.ecs_cluster_name
  desired_count                      = var.desired_count
  task_definition                    = aws_ecs_task_definition.backend.arn
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200
  enable_execute_command             = true
  launch_type                        = "FARGATE"

  network_configuration {
    subnets          = var.vpc.subnet_ids
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.backend.arn
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = local.ecs_container_name
    container_port   = var.container_port
  }

  depends_on = [aws_service_discovery_service.backend, aws_lb_listener_rule.backend]
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.hyphenated_prefix}-backend"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]

  container_definitions = jsonencode([{
    name      = local.ecs_container_name
    essential = true
    image     = var.image
    portMappings = [
      { containerPort = var.container_port, protocol = "tcp" }
    ]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = tostring(var.container_port) }
    ]
    healthCheck = {
      command = [
        "curl",
        "--fail",
        "http://localhost:${var.container_port}/health",
      ]
      interval    = 30
      retries     = 3
      startPeriod = 60
      timeout     = 5
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.backend.name
        awslogs-region        = data.aws_region.current.id
        awslogs-stream-prefix = "backend"
        mode                  = "non-blocking"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.hyphenated_prefix}-backend"
  retention_in_days = var.log_retention_in_days
}

resource "aws_lb_target_group" "backend" {
  name        = "${var.hyphenated_prefix}-backend"
  port        = var.container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc.id

  # TODO: maybe it should be higher, low value for quick target deregistration for now.
  deregistration_delay = 5

  health_check {
    path = "/health"
  }
}

resource "aws_lb_listener_rule" "backend" {
  listener_arn = var.load_balancer.listener_arn

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    host_header {
      values = [var.load_balancer.host_header]
    }
  }
}

resource "aws_service_discovery_service" "backend" {
  name = "backend"

  dns_config {
    namespace_id = var.service_discovery_namespace.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }
}

resource "aws_security_group" "backend" {
  name        = "${var.hyphenated_prefix}-backend"
  description = "Security group for backend service"
  vpc_id      = var.vpc.id

  ingress {
    from_port   = var.container_port
    to_port     = var.container_port
    protocol    = "tcp"
    cidr_blocks = [var.vpc.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.hyphenated_prefix}-backend"
  }
}

data "aws_region" "current" {}