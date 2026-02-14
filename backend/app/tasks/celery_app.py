from celery import Celery

from app.config import settings

celery_app = Celery(
    "promptr",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timeouts
    task_soft_time_limit=settings.MAX_WORKFLOW_DURATION_SECONDS,  # 10 min soft
    task_time_limit=settings.MAX_WORKFLOW_DURATION_SECONDS + 60,  # 11 min hard

    # Reliability
    task_acks_late=True,
    worker_prefetch_multiplier=1,

    # Result expiry
    result_expires=3600,  # 1 hour

    # Task discovery
    imports=["app.tasks.workflow_tasks"],
)
