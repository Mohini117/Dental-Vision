import uvicorn

from app.config import HOST, PORT


if __name__ == "__main__":
    print(
        f"Starting Dental Screening API on "
        f"{HOST}:{PORT}"
    )

    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=True,
    )
