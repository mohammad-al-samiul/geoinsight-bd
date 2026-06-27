from fastapi import APIRouter, Request

from app.infrastructure.messaging.publisher import RabbitPublisher
from app.modules.risk.schemas import ConflictInput, GeopoliticalRiskResponse
from app.modules.risk.service import GeopoliticalRiskEngine

router = APIRouter(prefix="/risk", tags=["Geopolitical Risk"])

_engine = GeopoliticalRiskEngine()


@router.post("/score", response_model=GeopoliticalRiskResponse)
async def compute_risk_score(
    body: ConflictInput,
    req: Request,
    publish: bool = False,
) -> GeopoliticalRiskResponse:
    result = _engine.score(body)

    if publish:
        publisher: RabbitPublisher = req.app.state.publisher
        await publisher.publish(
            routing_key="ai.risk",
            payload={
                "type": "risk_score",
                "overall_risk_score": result.overall_risk_score,
                "risk_band": result.risk_band,
                "region": body.region,
            },
        )

    return result
