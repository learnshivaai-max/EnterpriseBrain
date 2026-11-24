FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
ENV PYTHONDONTWRITEBYTECODE=1 ENTERPRISEBRAIN_DB=/data/scenarios.sqlite3
RUN adduser --system --uid 10001 brain && mkdir /data && chown brain /data
USER brain
EXPOSE 8000
CMD ["python","-m","uvicorn","backend.main:app","--host","0.0.0.0","--port","8000"]
