from __future__ import annotations

from collections import defaultdict

from app.modules.sentiment.heatmap_schemas import HeatmapCell, SentimentHeatmapResponse
from app.modules.sentiment.service import SentimentService


class SentimentHeatmapService:
    def __init__(self, sentiment: SentimentService) -> None:
        self._sentiment = sentiment

    async def build_heatmap(self, limit: int = 100, level: str = "district") -> SentimentHeatmapResponse:
        batch = await self._sentiment.analyze_stream(limit)

        agg: dict[str, dict[str, int]] = defaultdict(
            lambda: {"Grievance": 0, "Demand": 0, "Neutral": 0},
        )

        for item in batch.items:
            key = item.district if level == "district" else f"{item.district}|{item.upazila}"
            agg[key][item.category] += 1

        cells: list[HeatmapCell] = []
        for key, counts in agg.items():
            if "|" in key:
                district, upazila = key.split("|", 1)
            else:
                district, upazila = key, None

            total = sum(counts.values())
            grievance = counts["Grievance"]
            demand = counts["Demand"]
            neutral = counts["Neutral"]
            ratio = grievance / total if total else 0.0
            score = max(0, min(100, int(ratio * 100 + (grievance - demand) * 2)))

            if ratio >= 0.45:
                trend = "rising"
            elif ratio <= 0.2:
                trend = "falling"
            else:
                trend = "stable"

            cells.append(
                HeatmapCell(
                    district=district,
                    upazila=upazila,
                    grievance_count=grievance,
                    demand_count=demand,
                    neutral_count=neutral,
                    total=total,
                    grievance_ratio=round(ratio, 3),
                    sentiment_score=score,
                    trend=trend,
                ),
            )

        cells.sort(key=lambda c: c.sentiment_score, reverse=True)

        return SentimentHeatmapResponse(
            level=level,
            total_logs=batch.total,
            grievance_total=batch.grievance_count,
            demand_total=batch.demand_count,
            cells=cells,
        )
