"""
Architectural invariants for the Helm chart.

helm lint proves the templates render; kubeconform proves the output matches the
Kubernetes schema. Neither notices a chart that is valid YAML and still wrong -
a liveness probe wired to a dependency check, a version label smuggled into an
immutable selector, a PodDisruptionBudget on a single-replica workload that
quietly blocks every node drain.

Those mistakes are cheap to make, expensive to find in production, and easy to
assert here. Each rule below states the failure it prevents.

Usage:
    python scripts/verify-chart.py                # every environment
    python scripts/verify-chart.py --env prod
"""

import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys

try:
    import yaml
except ImportError:
    sys.exit("PyYAML gerekli:  pip install pyyaml")

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHART = ROOT / "deploy/charts/velora"
OCELOT_K8S = (
    ROOT / "SellingBuddy/src/ApiGateways/WebApiGateway/Web.ApiGateway"
    "/Configurations/ocelot.k8s.json"
)

ok = 0
fail = 0


def check(name: str, condition: bool, detail: str = "") -> None:
    global ok, fail
    if condition:
        ok += 1
        print(f"  [OK]   {name} {detail}")
    else:
        fail += 1
        print(f"  [FAIL] {name} {detail}")


def helm_binary() -> str:
    found = shutil.which("helm") or shutil.which("helm.exe")
    if not found:
        sys.exit("helm bulunamadi.")
    return found


def render(env: str) -> list:
    values = CHART / f"values-{env}.yaml"
    command = [helm_binary(), "template", f"velora-{env}", str(CHART)]
    if values.exists():
        command += ["-f", str(values)]

    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"helm template basarisiz ({env}):\n{result.stderr}")

    return [d for d in yaml.safe_load_all(result.stdout) if d]


def of_kind(docs: list, kind: str) -> list:
    return [d for d in docs if d["kind"] == kind]


def container(deployment: dict) -> dict:
    return deployment["spec"]["template"]["spec"]["containers"][0]


def verify(env: str) -> None:
    print(f"\n{env.upper()}")
    docs = render(env)
    deployments = of_kind(docs, "Deployment")
    services = {s["metadata"]["name"] for s in of_kind(docs, "Service")}

    check("her servis bir Deployment uretiyor", len(deployments) == 9, f"({len(deployments)})")

    # Ocelot her rotayi kube-dns ile cozer: Host alani Service adiyla harfi
    # harfine ayni olmali. Tutmazsa gateway kumede her istege 404 doner.
    routes = json.loads(re.sub(r"^\s*//.*?$", "", OCELOT_K8S.read_text(encoding="utf-8"), flags=re.M))
    hosts = {r["DownstreamHostAndPorts"][0]["Host"] for r in routes["Routes"]}
    check("ocelot.k8s.json host'lari Service adlariyla eslesiyor", hosts <= services, f"({sorted(hosts)})")

    # Bu kontrol once ocelot portunu containerPort ile karsilastiriyordu ve bu
    # YANLIS kuraldi: gateway pod'a degil Service'e baglanir. Ikisi ayrildiginda
    # (Service 80, ocelot 8080) test geciyor ama her istek 502 donuyordu.
    # Dogru kural, gateway'in gittigi portun Service'in dinledigi port olmasi.
    service_ports = {
        p["port"]
        for s in of_kind(docs, "Service")
        for p in s["spec"]["ports"]
    }
    ocelot_ports = {r["DownstreamHostAndPorts"][0]["Port"] for r in routes["Routes"]}
    check(
        "ocelot downstream portu Service portuyla ayni",
        ocelot_ports <= service_ports,
        f"(ocelot={sorted(ocelot_ports)} service={sorted(service_ports)})",
    )

    # ADR-08: liveness disa bagimli olursa gecici bir DB yavaslamasi tum
    # replikalari ayni anda restart ettirir ve kesintiyi kume capina yayar.
    #
    # Kural "yol tam olarak /health/live olsun" degil, "liveness bagimlilik
    # yoklamasin". Bu yuzden yasak olan sey acikca listelenir: readiness'in
    # bagimlilik yoklayan ucu liveness'a baglanmamalidir. Statik dosya sunan
    # on yuzler nginx'in tek /healthz ucunu kullanir ve bu da kurala uyar,
    # cunku o uc hicbir dis sisteme dokunmaz.
    DEPENDENCY_PROBES = {"/health/ready", "/health/startup"}

    live = {container(d)["livenessProbe"]["httpGet"]["path"] for d in deployments}
    check(
        "liveness bagimlilik yoklamiyor",
        not (live & DEPENDENCY_PROBES),
        str(sorted(live)),
    )

    # Liveness ve readiness ayni ucu paylasiyorsa, bagimlilik dusunce pod
    # havuzdan cikmakla kalmaz, oldurulur de. Statik on yuzlerde bu kabul
    # edilebilir (bagimlilik yok); bagimliligi olan servislerde degil.
    for d in deployments:
        name = d["metadata"]["name"]
        c = container(d)
        same = c["livenessProbe"]["httpGet"]["path"] == c["readinessProbe"]["httpGet"]["path"]
        is_frontend = d["metadata"]["labels"]["app.kubernetes.io/component"] == "frontend"
        if same and not is_frontend:
            check(f"liveness != readiness: {name}", False)

    check(
        "bagimliligi olan servislerde liveness != readiness",
        all(
            container(d)["livenessProbe"]["httpGet"]["path"]
            != container(d)["readinessProbe"]["httpGet"]["path"]
            for d in deployments
            if d["metadata"]["labels"]["app.kubernetes.io/component"] != "frontend"
        ),
    )

    # ADR-06: CFS quota .NET'in GC sicramalarini throttle eder, p99'u bozar.
    check(
        "hicbir kapta CPU limiti yok",
        all("cpu" not in container(d)["resources"].get("limits", {}) for d in deployments),
    )
    check(
        "her kapta bellek limiti var",
        all("memory" in container(d)["resources"].get("limits", {}) for d in deployments),
    )

    # Deployment.spec.selector degistirilemez; version girerse her surumde
    # Deployment'i silip yeniden yaratmak gerekir.
    check(
        "selector yalnizca name+instance",
        all(
            set(d["spec"]["selector"]["matchLabels"])
            == {"app.kubernetes.io/name", "app.kubernetes.io/instance"}
            for d in deployments
        ),
    )

    check(
        "dagitimda kapasite dusmuyor (maxUnavailable=0)",
        all(d["spec"]["strategy"]["rollingUpdate"]["maxUnavailable"] == 0 for d in deployments),
    )

    # Tek replikali is yukune PDB yazmak node drain'ini kalici bloklar.
    pdbs = {p["metadata"]["name"] for p in of_kind(docs, "PodDisruptionBudget")}
    single = {
        "velora-" + d["metadata"]["name"].removeprefix("velora-")
        for d in deployments
        if d["spec"].get("replicas") == 1
    }
    check("tek replikali is yukunde PDB yok", not (pdbs & single), str(sorted(pdbs & single)))

    # Pod Security "restricted" seviyesinin gerektirdikleri.
    check(
        "tum pod'lar root disi",
        all(d["spec"]["template"]["spec"]["securityContext"]["runAsNonRoot"] for d in deployments),
    )
    check(
        "kok dosya sistemi salt-okunur",
        all(container(d)["securityContext"]["readOnlyRootFilesystem"] for d in deployments),
    )
    check(
        "tum yetenekler dusuruldu",
        all(container(d)["securityContext"]["capabilities"]["drop"] == ["ALL"] for d in deployments),
    )
    check(
        "ServiceAccount token'i mount edilmiyor",
        all(d["spec"]["template"]["spec"]["automountServiceAccountToken"] is False for d in deployments),
    )

    # Kumede kesif Kubernetes'in isi; goc dagitimdan once Job ile uygulanir.
    config = of_kind(docs, "ConfigMap")[0]["data"]
    check("Consul kumede kapali", config["ConsulConfig__Enabled"] == "false")
    check("acilista migration kapali", config["Database__MigrateOnStartup"] == "false")
    check("gateway k8s rota tablosunu kullaniyor", config["Ocelot__ConfigFile"].endswith("ocelot.k8s.json"))

    # Kuyruk tuketicilerinin HTTP yuzeyi yok; Service uretmek yaniltici olur.
    check("payment/notification icin Service yok", not ({"payment", "notification"} & services))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", help="yalnizca bu ortami dogrula")
    args = parser.parse_args()

    for env in ([args.env] if args.env else ["dev", "staging", "prod"]):
        verify(env)

    print(f"\nSONUC: {ok} gecti, {fail} basarisiz")
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
