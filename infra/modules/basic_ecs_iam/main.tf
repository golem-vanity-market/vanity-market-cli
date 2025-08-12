locals {
  full_name = "${var.name_prefix_hyphenated}-${var.name}"
}

data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

# Execution role
resource "aws_iam_role" "execution" {
  name               = "${local.full_name}-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  for_each = toset([
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    "arn:aws:iam::aws:policy/AWSCloudMapRegisterInstanceAccess",
    # TODO: might not be needed
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess",
    # TODO: limit it
    "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
    # TODO: limit it, is it even needed?
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
    # TODO: limit it?
    "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess",
  ])

  role       = aws_iam_role.execution.name
  policy_arn = each.key
}

# Task role
resource "aws_iam_role" "task" {
  name               = "${local.full_name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json
}

resource "aws_iam_role_policy_attachment" "task" {
  for_each = toset([
    # TODO: limit it? Needed for `aws ecs execute-command`
    "arn:aws:iam::aws:policy/AmazonSSMManagedEC2InstanceDefaultPolicy",
  ])

  role       = aws_iam_role.task.name
  policy_arn = each.key
}
