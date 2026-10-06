# Academia Challenges

Submissions must use the Apertus model family.
For Track 2 this means that submitted solutions must be built with Apertus. Other open-weights models can be used to support development, e.g. as automatic judges during evaluation. Their role must be clearly described in the submission report.

💬 In case you have questions, join the conversation on Discord or send an email to “hello@hackapertus.ch”

## How it works
Pick from 5 academia challenges provided by Swiss academic institutions:

- **FHGR:** AI-Powered Job Interview Coach
- **OpenParlData:** Extracting Parliamentary Affairs from PDFs into One Common Structure
- **OST:** Multilingual Natural Language Inference over Swiss Official Voting Booklets
- **UZH:** Detecting Cross-Lingual Semantic Differences in Swiss Government Websites
- **ZHAW:** See It, Say It, Pick It: Vision-Language Grounding for a Real Robot Arm

The challenges incl. submission and judging criteria are described in our **Getting Started guide**:
https://hackapertus.notion.site/getting-started-guide-onlinehack

## Run it

Keep `track_2a/` as it is: don't rename it or move its files, just delete the
other track directories.

From the root of the project:

```bash
make run
```

Fill in the [Makefile](Makefile) so that it works on a clean checkout. It is
expected to run the project in a Docker container, since that is how the judges
will run it, without relying on anything already installed on your machine.

Requirements: `runtime, hardware, API keys, model weights`

### Quickstart (FHGR Interview Coach)

Requirements: Docker with Compose v2, an Apertus API key (CSCS). No GPU or local weights needed.
Apertus runs on the [CSCS LLM inference API](https://docs.cscs.ch/services/inference/api/#llm-inference-api-service)
(`https://api.inference.cscs.ch/v1`, model `swiss-ai/Apertus-v1.5-8B`).

```bash
cp .env.example .env      # then fill in LLM_NAME, LLM_BASE_URL, LLM_API_KEY
make run                  # = docker compose up --build, serves on :8000
```

Check it:

```bash
curl localhost:8000/health
curl -X POST localhost:8000/chat -H 'Content-Type: application/json' \
     -d '{"message": "Grüezi! Wer bist du?"}'
```

`/chat` returns `{"answer", "request_id", "llm_calls"}`. Without `.env` the service
still starts and `/health` works; `/chat` then returns 503.

Every LLM call is logged as one JSON line with `"event": "llm_call"`, and each answer
logs `"event": "answer"` with `calls_per_answer`:

```bash
docker compose logs backend | grep '"event": "answer"'
```

Code layout: `src/backend/main.py` (FastAPI), `src/backend/llm.py` (Apertus client + call counter).

## Data
The `data/` directory must not exceed 100 MB.


## 📦 Submission Requirements & Deliverables
❗️ Submissions are not handled on Devpost. Submit through our website only:
http://hackapertus.ch/online-hack/submissions

Requirements differ by challenge. See the description of the challenge you are entering for the exact deliverables.


## ⚖️ Judging Criteria
Judging criteria also differ by challenge. See the respective challenge description.


## Support

**Licensing requirements**
Please check our Terms & Conditions (6. What you build is open source):
https://hackapertus.ch/terms-and-conditions

## FAQ
💡 https://hackapertus.ch/faq

## Contact
💬 In case you have questions, join the conversation on Discord or send an email to “hello@hackapertus.ch”
