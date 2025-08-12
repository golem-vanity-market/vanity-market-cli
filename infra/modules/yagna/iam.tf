data "aws_iam_policy_document" "allow_ec2" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type = "Service"
      identifiers = [
        "ec2.amazonaws.com",
        "ecs-tasks.amazonaws.com",
      ]
    }
  }
}

resource "aws_iam_instance_profile" "yagna" {
  name = "${var.hyphenated_prefix}-yagna-ec2"
  role = aws_iam_role.yagna.name
}

resource "aws_iam_role" "yagna" {
  name               = "${var.hyphenated_prefix}-yagna-ec2"
  assume_role_policy = data.aws_iam_policy_document.allow_ec2.json
}

resource "aws_iam_role_policy_attachment" "yagna" {
  for_each = toset([
    # TODO: limit it?
    "arn:aws:iam::aws:policy/AmazonEC2FullAccess",
    # TODO: limit it?
    "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])

  role       = aws_iam_role.yagna.name
  policy_arn = each.key
}
