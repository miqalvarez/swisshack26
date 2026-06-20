import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    # ── Remote LLM (Azure Confidential GPU) ────────────────────────
    llm_api_base: str = "https://YOUR-ENDPOINT.openai.azure.com/"
    llm_api_key: str = ""
    llm_model_name: str = "gpt-4o"
    llm_api_version: str = "2024-08-01-preview"

    # ── SIX MCP Server ─────────────────────────────────────────────
    six_mcp_server_url: str = ""
    six_mcp_server_api_key: str = ""

    # ── Microsoft GraphRAG ─────────────────────────────────────────
    graphrag_api_url: str = "http://localhost:8001"
    graphrag_data_root: str = "./graphrag/data"

    # ── Workbench API ──────────────────────────────────────────────
    workbench_api_url: str = "http://localhost:4000"


settings = Settings()


def get_llm():
    from langchain_openai import AzureChatOpenAI

    return AzureChatOpenAI(
        azure_endpoint=settings.llm_api_base,
        api_key=settings.llm_api_key,
        azure_deployment=settings.llm_model_name,
        api_version=settings.llm_api_version,
        temperature=0.2,
        max_tokens=2048,
    )