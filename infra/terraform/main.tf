# CivicOS — sovereign-portable infrastructure module (skeleton).
#
# Deliberately provider-light: the platform must run on ANY sovereign cloud
# or on-prem Kubernetes. This module declares the *contract* of what an
# environment must provide; concrete providers (a sovereign OpenStack, a
# bare-metal kubeadm cluster, or a public cloud for preview) are wired in
# per-environment under terraform/environments/<name>.
#
# Nothing here locks the sovereign to a single vendor (Companion 139).

terraform {
  required_version = ">= 1.6"
  # Backend is environment-specific (sovereign object store, not a vendor SaaS
  # state service). Configured via `terraform init -backend-config=...`.
  backend "local" {}
}

variable "environment" {
  type        = string
  description = "small-municipality | mid-city | ministry | national"
}

variable "kubeconfig" {
  type        = string
  description = "Path to the sovereign cluster kubeconfig"
}

variable "region" {
  type        = string
  description = "Sovereign region identifier"
}

variable "postgres_connection_secret" {
  type        = string
  sensitive   = true
  description = "DATABASE_URL for the sovereign managed Postgres (HA/PITR)"
}

# The module's job: namespace, secrets, and the Helm release. The database,
# object store, and message bus are sovereign-managed inputs, not created
# here (the sovereign owns its data substrate).
module "platform" {
  source      = "./modules/platform"
  environment = var.environment
  region      = var.region
  db_secret   = var.postgres_connection_secret
  helm_values = "${path.module}/../helm/profiles/${var.environment}.yaml"
}

output "namespace" {
  value = module.platform.namespace
}

output "ingress_host" {
  value = module.platform.ingress_host
}
