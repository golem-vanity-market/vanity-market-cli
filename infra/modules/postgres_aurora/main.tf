locals {
  full_name = "${var.name_prefix_hyphenated}-${var.name}"
}

resource "aws_db_subnet_group" "postgres" {
  name       = "${local.full_name}-group"
  subnet_ids = var.vpc.subnet_ids
}

resource "aws_rds_cluster" "postgres" {
  cluster_identifier              = "${local.full_name}-postgres-cluster"
  engine                          = "aurora-postgresql"
  engine_mode                     = "provisioned"
  engine_version                  = try(var.restore_from_snapshot.engine_version, "16.8")
  snapshot_identifier             = try(var.restore_from_snapshot.snapshot_id, null)
  storage_encrypted               = true
  db_subnet_group_name            = aws_db_subnet_group.postgres.name
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.postgres.name
  vpc_security_group_ids          = [aws_security_group.postgres.id]
  skip_final_snapshot             = true
  backup_retention_period         = var.backup_retention_period_days
  # https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster#storage_type-1
  storage_type = var.use_io_optimized_storage ? "aurora-iopt1" : ""

  master_username             = "root"
  manage_master_user_password = true
  database_name               = var.database_name

  enable_http_endpoint            = true
  enabled_cloudwatch_logs_exports = ["postgresql"]
  apply_immediately               = true

  serverlessv2_scaling_configuration {
    max_capacity             = var.max_capacity
    min_capacity             = var.min_capacity
    seconds_until_auto_pause = var.seconds_auto_pause
  }

  lifecycle {
    ignore_changes = [engine_version]
  }
}

# TODO: high availability
resource "aws_rds_cluster_instance" "postgres" {
  count = 1

  identifier          = "${local.full_name}-postgres-db"
  cluster_identifier  = aws_rds_cluster.postgres.id
  instance_class      = "db.serverless"
  engine              = aws_rds_cluster.postgres.engine
  engine_version      = aws_rds_cluster.postgres.engine_version
  publicly_accessible = false
}

resource "aws_rds_cluster_parameter_group" "postgres" {
  name   = "${local.full_name}-postgres"
  family = "aurora-postgresql16"
}

resource "aws_security_group" "postgres" {
  name   = "${var.name_prefix_hyphenated}-postgres"
  vpc_id = var.vpc.id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
