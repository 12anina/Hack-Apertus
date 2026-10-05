import json
import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from backend import llm

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("api")

app = FastAPI(title="FHGR Interview Coach")


class ChatRequest(BaseModel):
    message: str = "Hallo! Stell dich bitte kurz vor."


class ChatResponse(BaseModel):
    answer: str
    request_id: str
    llm_calls: int


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "llm_calls_total": llm.total_calls()}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    request_id = llm.start_request()
    try:
        answer = await llm.chat_completion(
            [{"role": "user", "content": req.message}],
            purpose="chat_test",
        )
    except llm.LLMConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM call failed: {type(exc).__name__}: {exc}")

    calls = llm.calls_in_request()
    logger.info(json.dumps({"event": "answer", "request_id": request_id, "calls_per_answer": calls}))
    return ChatResponse(answer=answer, request_id=request_id, llm_calls=calls)
