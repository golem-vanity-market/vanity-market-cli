data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

resource "aws_ecs_capacity_provider" "yagna" {
  name = "${var.hyphenated_prefix}-yagna"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.yagna.arn
    managed_termination_protection = "DISABLED" # Allow termination
    managed_draining               = "ENABLED"  # Enable managed draining

    managed_scaling {
      maximum_scaling_step_size = 1
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 1
      instance_warmup_period    = 60 # Reduced from 300
    }
  }
}

resource "aws_autoscaling_group" "yagna" {
  name                      = "${var.hyphenated_prefix}-yagna"
  vpc_zone_identifier       = [local.target_subnet.id]
  target_group_arns         = []
  health_check_type         = "EC2"
  health_check_grace_period = 300

  min_size         = 1
  max_size         = 1
  desired_capacity = 1

  default_cooldown = 60 # Reduced from 300

  termination_policies = ["OldestInstance", "Default"]

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 0
      instance_warmup        = 60
    }
  }

  launch_template {
    id      = aws_launch_template.yagna.id
    version = "$Latest"
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }

  timeouts {
    delete = "15m"
  }

  lifecycle {
    create_before_destroy = false
  }
}

resource "aws_launch_template" "yagna" {
  name          = "${var.hyphenated_prefix}-yagna"
  ebs_optimized = true
  instance_type = "t3a.small"
  image_id      = data.aws_ami.amazon_linux.id

  iam_instance_profile {
    arn = aws_iam_instance_profile.yagna.arn
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.yagna.id]
    delete_on_termination       = true
  }

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name = "${var.hyphenated_prefix}-yagna"
    }
  }

  user_data = base64encode(
    join(
      "\n",
      [
        "#!/bin/bash",
        "set -euo pipefail",
        "set -x",

        "sudo yum install -y unzip",
        "curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'",
        "unzip awscliv2.zip",
        "sudo ./aws/install",

        // Wait until IAM role is attached to the instance (Omitting may cause `Unable to locate credential...` error)
        // https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html
        "timeout 60 bash -c 'until curl -s --fail http://169.254.169.254/latest/meta-data/iam/security-credentials/${aws_iam_role.yagna.name}; do sleep 1; done'",

        "aws ec2 wait volume-available --volume-ids ${aws_ebs_volume.yagna_state.id} --region ${aws_ebs_volume.yagna_state.region}",
        "aws ec2 attach-volume --volume-id ${aws_ebs_volume.yagna_state.id} --instance-id $(cat /var/lib/cloud/data/instance-id) --device /dev/sdh --region ${aws_ebs_volume.yagna_state.region}",
        "aws ec2 wait volume-in-use --volume-ids ${aws_ebs_volume.yagna_state.id} --filters 'Name=attachment.status,Values=attached' --region ${aws_ebs_volume.yagna_state.region}",
        "timeout 60 bash -c 'until test -b /dev/sdh; do sleep 1; done'",
        "sudo blkid $(readlink -f /dev/sdh) || sudo mkfs -t ext4 /dev/sdh",
        "sudo mkdir -p ${local.ec2_host_persisent_path}",
        "echo '/dev/sdh ${local.ec2_host_persisent_path} ext4 defaults 0 2' | sudo tee -a /etc/fstab",
        "sudo mount -a",
        "echo ECS_CLUSTER='${var.ecs_cluster_name}' > /etc/ecs/ecs.config",
      ]
    )
  )
}

resource "aws_ebs_volume" "yagna_state" {
  availability_zone = var.vpc.availability_zone
  size              = 10
  tags = {
    Name = "${var.hyphenated_prefix}-yagna-state"
  }
}
