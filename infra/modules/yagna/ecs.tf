resource "aws_ecs_service" "yagna" {
  name            = "${var.hyphenated_prefix}-yagna"
  cluster         = var.ecs_cluster_name
  desired_count   = 1
  task_definition = aws_ecs_task_definition.yagna.arn

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 200
  enable_execute_command             = true

  force_new_deployment = true

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.yagna.name
    base              = 1
    weight            = 100
  }

  network_configuration {
    subnets         = [local.target_subnet.id]
    security_groups = [aws_security_group.yagna.id]
  }

  service_registries {
    registry_arn = aws_service_discovery_service.main.arn
  }

  timeouts {
    create = "20m"
    update = "20m"
    delete = "30m"
  }

  lifecycle {
    create_before_destroy = false
    # TODO: consider to bring back when we have CI/CD in place for YAGNA
    # ignore_changes = [
    #   # Ignore task definition changes to prevent unnecessary updates
    #   task_definition,
    # ]
  }
}

resource "aws_ecs_task_definition" "yagna" {
  family = "${var.hyphenated_prefix}-yagna"
  cpu    = 2048
  memory = 1792

  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["EC2"]

  # TODO: copy sidecars exposing metrics from openscale repo?
  container_definitions = jsonencode([{
    name      = local.ecs_container_name
    essential = true
    image     = var.image
    portMappings = [
      { hostPort = local.api_port, containerPort = local.api_port, protocol = "tcp" },
      { hostPort = local.golem_port, containerPort = local.golem_port, protocol = "udp" },
    ]
    mountPoints = [
      { sourceVolume = local.yagna_persistent_volume, containerPath = "/root/.local/share/yagna" },
    ]
    environment = [for k, v in {
      "YAGNA_API_URL"    = "http://0.0.0.0:7465"
      "YA_NET_TYPE"      = "central"
      "CENTRAL_NET_HOST" = "polygongas.org:7999"
      } : { name = k, value = v }
    ]
    secrets = [for k, v in {
      "YAGNA_APPKEY"             = aws_ssm_parameter.secret[local.api_key_secret_name].arn,
      "YAGNA_AUTOCONF_APPKEY"    = aws_ssm_parameter.secret[local.api_key_secret_name].arn,
      "YAGNA_AUTOCONF_ID_SECRET" = aws_ssm_parameter.secret[local.app_autoconf_id_secret_name].arn,
    } : { name = k, valueFrom = v }]
    healthCheck = {
      command = [
        "CMD-SHELL",
        "curl -s -o /dev/null -w '%%{http_code}' http://127.0.0.1:${local.api_port} | grep -q 401",
      ]
      interval    = 30
      retries     = 3
      startPeriod = 60
      timeout     = 5
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.yagna.name
        awslogs-region        = aws_cloudwatch_log_group.yagna.region
        awslogs-stream-prefix = "yagna"
        mode                  = "non-blocking"
      }
    }
  }])

  volume {
    configure_at_launch = false
    name                = local.yagna_persistent_volume
    host_path           = local.ec2_host_persisent_path
  }

  placement_constraints {
    type       = "memberOf"
    expression = "attribute:ecs.availability-zone==${var.vpc.availability_zone}"
  }

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }
}

resource "aws_cloudwatch_log_group" "yagna" {
  name              = "/ecs/yagna"
  retention_in_days = var.log_retention_in_days
}
