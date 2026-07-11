from fastapi import APIRouter

from app.modules.weather.schemas import WeatherFetchResponse
from app.modules.weather.service import weather_service

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/fetch", response_model=WeatherFetchResponse)
async def fetch_weather() -> WeatherFetchResponse:
    """Fetch live weather observations + disaster alerts for Bangladesh."""
    return await weather_service.fetch_all()
