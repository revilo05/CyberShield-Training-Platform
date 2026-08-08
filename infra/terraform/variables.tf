variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "pilot"
}

variable "vpc_id" { type = string }
variable "api_image" { type = string }
variable "worker_image" { type = string }
variable "ses_domain" { type = string }
variable "web_origin" { type = string }
variable "certificate_arn" { type = string }
variable "auth0_domain" { type = string }
variable "auth0_audience" { type = string }

variable "private_subnet_ids" {
  type = list(string)
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "Use at least two private subnets."
  }
}

variable "public_subnet_ids" {
  type = list(string)
  validation {
    condition     = length(var.public_subnet_ids) >= 2
    error_message = "Use at least two public subnets."
  }
}
