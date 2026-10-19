{{- define "civicos.labels" -}}
app.kubernetes.io/part-of: civicos
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "civicos.image" -}}
{{- printf "%s/%s:%s" .registry .repo .tag -}}
{{- end -}}

{{- /* Pull secrets for the nation's registry: names of existing secrets only. */ -}}
{{- define "civicos.imagePullSecrets" -}}
{{- with .Values.global.imagePullSecrets -}}
imagePullSecrets:
{{- range . }}
  - name: {{ . | quote }}
{{- end }}
{{- end -}}
{{- end -}}

{{- /*
One NetworkPolicy egress rule: peers (a list; empty means any destination)
and ports. Call with (dict "peers" … "ports" (list (dict "port" 53 "protocol" "UDP") …)).
*/ -}}
{{- define "civicos.egressRule" -}}
- ports:
    {{- toYaml .ports | nindent 4 }}
  {{- if .peers }}
  to:
    {{- toYaml .peers | nindent 4 }}
  {{- end }}
{{- end -}}

{{- /* Cluster DNS over UDP and TCP. */ -}}
{{- define "civicos.dnsEgress" -}}
{{- include "civicos.egressRule" (dict "peers" .Values.security.egress.dns "ports" (list (dict "port" 53 "protocol" "UDP") (dict "port" 53 "protocol" "TCP"))) }}
{{- end -}}
