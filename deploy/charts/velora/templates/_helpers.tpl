{{/*
Ortak ad ve etiket ureticileri.

Etiket setinin tamami tek bir yerde uretilir; bir etiket eklemek ya da
degistirmek dokuz servisin manifestine degil, yalnizca bu dosyaya dokunmayi
gerektirir.
*/}}

{{- define "velora.fullname" -}}
{{- printf "velora-%s" .slug -}}
{{- end -}}

{{/*
Selector etiketleri — BILINCLI OLARAK DAR.

Deployment.spec.selector degistirilemez (immutable). Buraya version gibi her
surumde degisen bir etiket girerse, her yeni surumde Deployment'i silip yeniden
yaratmak gerekir. Bu yuzden yalnizca kimligi belirleyen iki etiket vardir.
*/}}
{{- define "velora.selectorLabels" -}}
app.kubernetes.io/name: {{ .slug }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end -}}

{{- define "velora.labels" -}}
{{ include "velora.selectorLabels" . }}
app.kubernetes.io/component: {{ .svc.component | default "backend" }}
app.kubernetes.io/part-of: velora
app.kubernetes.io/version: {{ .root.Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
velora.io/tier: {{ .svc.tier | default "api" }}
velora.io/owner: {{ .root.Values.owner }}
{{- end -}}

{{/*
Imaj referansi. digest verilmisse o kullanilir: etiket insan icindir, digest
makine icin degismezdir; GitOps her zaman digest'e sabitler.
*/}}
{{- define "velora.image" -}}
{{/* Bos onek gecerli bir secimdir (yerel imajlar), bu yuzden `default` degil
     hasKey ile bakilir: "" | default "velora-" yanlislikla oneki geri getirir. */}}
{{- $prefix := "velora-" -}}
{{- if hasKey .root.Values.image "prefix" -}}{{- $prefix = .root.Values.image.prefix -}}{{- end -}}
{{- $repo := printf "%s/%s%s" .root.Values.image.registry $prefix .slug -}}
{{- if .svc.digest -}}
{{ $repo }}@{{ .svc.digest }}
{{- else -}}
{{ $repo }}:{{ .svc.tag | default .root.Chart.AppVersion }}
{{- end -}}
{{- end -}}
