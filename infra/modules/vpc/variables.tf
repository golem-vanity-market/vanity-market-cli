variable "name_prefix_hyphenated" {
  type     = string
  nullable = false
}

variable "cidr_block" {
  type     = string
  nullable = false
}

variable "subnet_new_bits" {
  type     = number
  default  = 8
  nullable = false
}

variable "number_of_nat_gateways" {
  type        = number
  nullable    = false
  description = "How many NAT gateways to use. Can be either 0 or 1."
  validation {
    error_message = "If NAT GW high availability is required, the code needs to be expanded for each AZ to have a route table pointing 0.0.0.0 to its own copy of NAT GW."
    condition     = contains([0, 1], var.number_of_nat_gateways)
  }
}
