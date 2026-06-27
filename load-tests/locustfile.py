"""
GeoInsight BD — API Gateway load test (Locust)

Simulates high-concurrency dashboard traffic:
  - JWT authentication (login or pre-seeded token)
  - KPI definition + record fetches
  - Recursive admin-unit drill-down (division → district → upazila → union)

Run (headless, 2000 users, 100 spawn/s):
  locust -f locustfile.py --host=http://localhost:4000 \\
         --users 2000 --spawn-rate 100 --run-time 5m --headless

Web UI:
  locust -f locustfile.py --host=http://localhost:4000

Environment:
  LOCUST_HOST              Base URL (overrides --host)
  LOCUST_EMAIL / PASSWORD  Service account for login-on-start
  LOCUST_ACCESS_TOKEN      Skip login when rotating tokens externally
  LOCUST_ROOT_UNIT_ID      Division UUID for drill-down entry (optional)
"""

from __future__ import annotations

import os
import random
from typing import Any

from locust import HttpUser, between, events, task


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


HOST = _env("LOCUST_HOST", "http://localhost:4000")
EMAIL = _env("LOCUST_EMAIL", "pmo@geoinsight.gov.bd")
PASSWORD = _env("LOCUST_PASSWORD", "ChangeMe123!")
ACCESS_TOKEN = _env("LOCUST_ACCESS_TOKEN")
ROOT_UNIT = _env(
    "LOCUST_ROOT_UNIT_ID",
    "11111111-1111-1111-1111-111111111101",
)


@events.init.add_listener
def on_locust_init(environment, **_kwargs) -> None:
    if environment.parsed_options and getattr(environment.parsed_options, "host", None):
        return
    environment.host = HOST


class AuthenticatedUser(HttpUser):
    """Base user with Bearer token — login once per simulated user."""

    abstract = True
    wait_time = between(0.2, 1.5)

    def on_start(self) -> None:
        self.token = ACCESS_TOKEN
        if not self.token:
            self.token = self._login()
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})

    def _login(self) -> str:
        with self.client.post(
            "/api/v1/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            name="/api/v1/auth/login",
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"Login failed: {response.status_code}")
                return ""
            body = response.json()
            token = body.get("data", {}).get("accessToken")
            if not token:
                response.failure("Missing accessToken in login response")
                return ""
            return token


class KpiDashboardUser(AuthenticatedUser):
    """Heavy KPI polling — mimics national dashboard refresh cycles."""

    weight = 3

    @task(5)
    def kpi_definitions(self) -> None:
        self.client.get("/api/v1/kpis/definitions", name="/api/v1/kpis/definitions")

    @task(8)
    def kpi_records(self) -> None:
        fiscal = random.choice(["2024", "2025", "2026"])
        limit = random.choice([25, 50, 100])
        self.client.get(
            f"/api/v1/kpis/records?fiscalYear={fiscal}&limit={limit}",
            name="/api/v1/kpis/records",
        )

    @task(2)
    def national_dashboard(self) -> None:
        self.client.get("/api/v1/dashboard/national", name="/api/v1/dashboard/national")

    @task(1)
    def auth_me(self) -> None:
        self.client.get("/api/v1/auth/me", name="/api/v1/auth/me")


class LocationDrillDownUser(AuthenticatedUser):
    """
    Recursive location drill-down — walks admin-unit trees breadth-first,
    simulating map choropleth clicks at scale.
    """

    weight = 5

    def _walk_node(self, node: dict[str, Any], depth: int = 0, max_depth: int = 4) -> None:
        unit_id = node.get("id")
        if not unit_id or depth >= max_depth:
            return

        self.client.get(
            f"/api/v1/admin-units/{unit_id}",
            name="/api/v1/admin-units/:unitId",
        )
        self.client.get(
            f"/api/v1/admin-units/{unit_id}/tree",
            name="/api/v1/admin-units/:unitId/tree",
        )

        children = node.get("children") or []
        for child in children[:3]:
            self._walk_node(child, depth + 1, max_depth)

    @task(10)
    def recursive_drill_from_root(self) -> None:
        with self.client.get(
            f"/api/v1/admin-units/{ROOT_UNIT}/tree",
            name="/api/v1/admin-units/:unitId/tree [drill]",
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"Tree fetch failed: {response.status_code}")
                return
            payload = response.json()
            root = payload.get("data")
            if not root:
                response.failure("Empty tree payload")
                return
            self._walk_node(root, depth=0, max_depth=4)

    @task(3)
    def scoped_alerts(self) -> None:
        self.client.get(
            "/api/v1/alerts?unresolvedOnly=true&limit=20",
            name="/api/v1/alerts",
        )


class MixedTrafficUser(AuthenticatedUser):
    """Blended workload — KPI + drill-down + health probes."""

    weight = 2

    @task(2)
    def health(self) -> None:
        self.client.get("/api/v1/health", name="/api/v1/health")

    @task(3)
    def kpi_burst(self) -> None:
        self.client.get("/api/v1/kpis/definitions", name="/api/v1/kpis/definitions [mixed]")
        self.client.get("/api/v1/kpis/records?limit=50", name="/api/v1/kpis/records [mixed]")

    @task(4)
    def shallow_drill(self) -> None:
        unit = random.choice([ROOT_UNIT])
        self.client.get(
            f"/api/v1/admin-units/{unit}/tree",
            name="/api/v1/admin-units/:unitId/tree [mixed]",
        )
