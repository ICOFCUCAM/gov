{{- define "civicos.labels" -}}
app.kubernetes.io/part-of: civicos
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "civicos.image" -}}
{{- printf "%s/%s:%s" .registry .repo .tag -}}
{{- end -}}
