"""LLM interface — delegates to the configured remote model.

Currently configured for Azure OpenAI (Azure Confidential GPU).
Swap the implementation in get_llm() to point to any
OpenAI-compatible endpoint.
"""

from __future__ import annotations

from src.config import settings


async def call_llm(prompt: str, system_prompt: str | None = None) -> str:
    """Call the remote LLM with a simple prompt.

    This is the single entry point all agents should use.
    When the real LLM endpoint is available, this function
    will route the call through it.

    For now, it raises NotImplementedError to make it explicit
    that no real LLM is configured yet.
    """
    if not settings.llm_api_key:
        raise NotImplementedError(
            "No LLM API key configured. Set LLM_API_KEY in .env "
            "to point to a remote OpenAI-compatible endpoint."
        )

    import httpx

    url = f"{settings.llm_api_base.rstrip('/')}/openai/deployments/{settings.llm_model_name}/chat/completions"
    headers = {
        "api-key": settings.llm_api_key,
        "Content-Type": "application/json",
    }
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 2048,
        "api-version": settings.llm_api_version,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]