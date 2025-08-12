locals {
  cidr_subblocks     = cidrsubnets(var.cidr_block, 1, 1)
  public_cidr_block  = local.cidr_subblocks[0]
  private_cidr_block = local.cidr_subblocks[1]

  sorted_azs = sort(data.aws_availability_zones.azs.names)
}

data "aws_availability_zones" "azs" {}

resource "aws_vpc" "main" {
  cidr_block = var.cidr_block

  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.name_prefix_hyphenated}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.name_prefix_hyphenated}-igw"
  }
}

# Public
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.name_prefix_hyphenated}-public-route-table"
  }
}

resource "aws_route" "public_igw" {
  route_table_id         = aws_route_table.public.id
  gateway_id             = aws_internet_gateway.main.id
  destination_cidr_block = "0.0.0.0/0"
}

resource "aws_subnet" "public" {
  count = length(local.sorted_azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(local.public_cidr_block, var.subnet_new_bits, count.index)
  availability_zone = local.sorted_azs[count.index]

  tags = {
    Name = "${var.name_prefix_hyphenated}-public-${local.sorted_azs[count.index]}"
  }
}

resource "aws_route_table_association" "public" {
  count = length(local.sorted_azs)

  route_table_id = aws_route_table.public.id
  subnet_id      = aws_subnet.public[count.index].id
}

# Private
resource "aws_eip" "nat_gw" {
  count = var.number_of_nat_gateways

  tags = {
    Name = "${var.name_prefix_hyphenated}-eip-nat-gw-${local.sorted_azs[count.index]}"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_nat_gateway" "private" {
  count = var.number_of_nat_gateways

  allocation_id = aws_eip.nat_gw[count.index].id
  # Note that this subnet needs to be *public*.
  subnet_id = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.name_prefix_hyphenated}-nat-gw-${local.sorted_azs[count.index]}"
  }

  depends_on = [aws_eip.nat_gw]
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.name_prefix_hyphenated}-private-route-table"
  }
}

resource "aws_route" "private_nat" {
  count = var.number_of_nat_gateways

  route_table_id         = aws_route_table.private.id
  nat_gateway_id         = aws_nat_gateway.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
}

resource "aws_subnet" "private" {
  count = length(local.sorted_azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(local.private_cidr_block, var.subnet_new_bits, count.index)
  availability_zone = local.sorted_azs[count.index]

  tags = {
    Name = "${var.name_prefix_hyphenated}-private-${local.sorted_azs[count.index]}"
  }
}

resource "aws_route_table_association" "private" {
  count = length(local.sorted_azs)

  route_table_id = aws_route_table.private.id
  subnet_id      = aws_subnet.private[count.index].id
}
