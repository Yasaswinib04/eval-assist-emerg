import sys
import os
import logging
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.routers import auth, assessments, questions, students, evaluations, insights, interventions, score_entry

# Create the main app without a prefix
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["assessments"])
api_router.include_router(questions.router, prefix="/assessments", tags=["questions"])
api_router.include_router(students.router, prefix="/assessments", tags=["students"])
api_router.include_router(evaluations.router, prefix="/assessments", tags=["evaluations"])
api_router.include_router(insights.router, prefix="/assessments", tags=["insights"])
api_router.include_router(interventions.router, prefix="/assessments", tags=["interventions"])
api_router.include_router(score_entry.router, prefix="/assessments", tags=["score-entry"])

app.include_router(api_router)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        messages.append(f"{loc}: {err.get('msg', 'Invalid value')}")
    detail = "; ".join(messages)
    return JSONResponse(status_code=422, content={"detail": detail})

# Serve media files (sample answer sheets, etc.)
media_dir = os.path.join(os.path.dirname(__file__), "..", "media")
if os.path.exists(media_dir):
    app.mount("/media", StaticFiles(directory=media_dir), name="media")

# Serve frontend static assets (JS, CSS, etc.)
frontend_build = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
if os.path.exists(frontend_build):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_build, "static")), name="static")

# SPA catch-all — serve index.html for all non-API, non-static, non-media routes
index_html = os.path.join(frontend_build, "index.html") if os.path.exists(frontend_build) else None

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404)
    if full_path.startswith("media/"):
        raise HTTPException(status_code=404)
    if full_path.startswith("static/"):
        raise HTTPException(status_code=404)
    # Try serving exact file from build dir
    file_path = os.path.join(frontend_build, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    # SPA fallback
    if index_html and os.path.exists(index_html):
        return FileResponse(index_html)
    raise HTTPException(status_code=404)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.server:app", host="0.0.0.0", port=8000, reload=False)
