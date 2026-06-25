ARG PYTHON_IMAGE=python:3.12-slim
FROM ${PYTHON_IMAGE}
ARG PIP_INDEX_URL=https://pypi.org/simple

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --timeout 120 --retries 5 -i ${PIP_INDEX_URL} -r /app/backend/requirements.txt

COPY backend /app/backend

EXPOSE 8000

CMD ["sh", "-c", "alembic -c backend/alembic.ini upgrade head && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"]
