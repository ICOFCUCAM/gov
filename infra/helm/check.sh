#!/usr/bin/env bash
# Lint, render and validate the CivicOS Helm chart (CI job "helm chart").
#
#   infra/helm/check.sh            # needs helm and kubeconform on PATH
#   KUBE_VERSION=1.31.0 infra/helm/check.sh
#
# For the defaults, every deployment profile (profiles/*.yaml) and every
# production-like values file (civicos/ci/*-values.yaml): `helm lint --strict`,
# `helm template`, then kubeconform against the Kubernetes schemas (strict:
# unknown fields fail). Values the chart must refuse (civicos/ci/refuse/*.yaml)
# must make `helm template` fail. KUBECONFORM_SCHEMA overrides the schema
# location (a local mirror for air-gapped runs).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
chart="$here/civicos"
kube_version="${KUBE_VERSION:-1.30.0}"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

schema_args=()
if [ -n "${KUBECONFORM_SCHEMA:-}" ]; then schema_args=(-schema-location "$KUBECONFORM_SCHEMA"); fi

check() {
  local label="$1"; shift
  echo "== $label"
  helm lint --strict "$chart" "$@"
  helm template civicos "$chart" --namespace civicos --kube-version "$kube_version" "$@" > "$out/rendered.yaml"
  kubeconform -strict -summary -kubernetes-version "$kube_version" "${schema_args[@]}" "$out/rendered.yaml"
}

check "defaults"
for f in "$here"/profiles/*.yaml "$chart"/ci/*-values.yaml; do
  check "$(basename "$f")" -f "$f"
done

for f in "$chart"/ci/refuse/*.yaml; do
  echo "== refuse $(basename "$f")"
  if helm template civicos "$chart" -f "$f" > /dev/null 2> "$out/err.txt"; then
    echo "expected the chart to refuse $(basename "$f"), but it rendered"; exit 1
  fi
  grep -m1 'Error' "$out/err.txt" || true
done

echo "chart OK"
