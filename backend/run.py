import uvicorn

from app.config import settings


def main():
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.uvicorn_reload,
    )


if __name__ == "__main__":
    main()
