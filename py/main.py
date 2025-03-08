# main.py
from fastapi import FastAPI
import ddtrace
import logging
import os
# Initialize Datadog APM tracing
ddtrace.patch_all()
tracer = ddtrace.tracer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI()

@app.get("/")
def index():
    return {
        "status": "ok",
        "message": "Welcome to Python FastAPI",
        "version": "1.0.0",
        "env_vars": {
            "DD_AGENT_HOST": os.getenv("DD_AGENT_HOST", "not-set"),
            "DD_ENV": os.getenv("DD_ENV", "not-set"),
            "DD_SERVICE": os.getenv("DD_SERVICE", "not-set"),
            "DD_TRACE_DEBUG": os.getenv("DD_TRACE_DEBUG", "not-set"),
            "DD_LOGS_INJECTION": os.getenv("DD_LOGS_INJECTION", "not-set"),
            "DD_REMOTE_CONFIGURATION_ENABLED": os.getenv("DD_REMOTE_CONFIGURATION_ENABLED", "not-set"),
            "DD_TRACE_INFERRED_PROXY_SERVICES_ENABLED": os.getenv("DD_TRACE_INFERRED_PROXY_SERVICES_ENABLED", "not-set"),
        },
        "endpoints": {
            "/": "This documentation",
            "/health": "Health check endpoint"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
