# Dockerfile
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the FastAPI app code
COPY . .

# Expose port 3000 for FastAPI
EXPOSE 3000

# Set environment variables for Datadog tracing
ENV DD_SERVICE="fastapi-app"
ENV DD_AGENT_HOST="datadog-agent"
ENV DD_ENV="production"
ENV DD_LOGS_INJECTION=true
ENV DD_REMOTE_CONFIGURATION_ENABLED=false

# Start FastAPI app with Uvicorn
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
CMD ["python", "main.py"]