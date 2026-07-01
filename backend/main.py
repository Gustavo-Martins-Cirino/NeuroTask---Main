from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import tasks, time_blocks, users
from core.config import settings


app = FastAPI(title=settings.project_name, version=settings.version)

allowed_origins = [
    "http://localhost:3000",
]

# CORS habilitado para integrar com o frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(time_blocks.router, prefix="/api/v1")


@app.get("/")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "api": settings.project_name,
        "version": settings.version,
    }
