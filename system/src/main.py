"""Entry point for the advisory system."""

from __future__ import annotations

import uvicorn


def main():
    uvicorn.run(
        "src.api.server:app",
        host="0.0.0.0",
        port=4001,
        reload=True,
    )


if __name__ == "__main__":
    main()