from __future__ import annotations
import os, json, math
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field

# load local .env if present (optional dev convenience)
try:
    import importlib
    _dotenv = importlib.import_module("dotenv")
    if hasattr(_dotenv, "load_dotenv"):
        _dotenv.load_dotenv()
except Exception:
    # dotenv not installed or failed to load; that's fine for production
    pass

from models.text import get_encoder, cosine_sim
from models.analyzer import MisconceptionAnalyzer
from models.difficulty import DifficultyEstimator
import traceback
import logging

ART_DIR = os.environ.get("ARTIFACT_DIR", os.path.join(os.path.dirname(__file__), "artifacts"))

app = FastAPI(title="Misconception + IRT Backend", version="1.1.0")

# ---- load components on startup ----
encoder = get_encoder("sentence-transformers/all-MiniLM-L6-v2")
mis_analyzer = MisconceptionAnalyzer(artifacts_dir=ART_DIR, encoder=encoder)
diff_est = DifficultyEstimator(artifacts_dir=ART_DIR)


# ---------------- Schemas ----------------
class AnalyzeBody(BaseModel):
    question_text: str = Field(..., min_length=3)
    ideal_answer_text: str = Field(..., min_length=3)
    user_answer_text: str = Field(..., min_length=1)
    qid: Optional[int] = None  # if you have a known question id from your dataset


class PredictMisconceptionBody(BaseModel):
    user_answer_text: str
    qid: Optional[int] = None


class EstimateDifficultyBody(BaseModel):
    question_text: str
    qid: Optional[int] = None


class ClusterBody(BaseModel):
    texts: List[str]
    eps: Optional[float] = 0.5
    min_samples: Optional[int] = 8
    scale_before: Optional[bool] = True


# ---------------- Health ----------------
@app.get("/health")
def health():
    return {
        "ok": True,
        "artifacts": mis_analyzer.loaded,
        "difficulty_items": diff_est.n_items,
        "fsag_active": getattr(mis_analyzer.fsag, "loaded", False)
    }


# ---------------- SUPERVISED: predict misconception ----------------
@app.post("/api/predict_misconception")
def predict_misconception(b: PredictMisconceptionBody):
    """
    SUPERVISED branch:
    - Uses labeled classifier artifact to output (label, confidence, risk).
    - Representation path: SentenceTransformer (embeddings) --> FSAG (attenuation) --> Classifier.
      ^ FSAG is here to suppress spurious/low-utility embedding dimensions so the fixed classifier
        generalizes better and remains more interpretable.
    """
    try:
        pred = mis_analyzer.predict_label(b.user_answer_text, qid=b.qid)
        return pred
    except Exception as e:
        raise HTTPException(500, detail=f"Misconception prediction failed: {e}")


# ---------------- UNSUPERVISED: cluster texts ----------------
@app.post("/api/cluster_unsupervised")
def cluster_unsupervised(b: ClusterBody):
    """
    UNSUPERVISED branch:
    - Purpose: DISCOVER structure (recurring misconception themes) without labels.
    - Representation path: SentenceTransformer (embeddings) --> FSAG (attenuation) --> DBSCAN.
      ^ FSAG is shared so both branches operate in the same cleaned space, improving
        cluster coherence and interpretability.
    """
    try:
        out = mis_analyzer.cluster_unsupervised(
            texts=b.texts,
            eps=b.eps,
            min_samples=b.min_samples,
            scale_before=b.scale_before,
        )
        return out
    except Exception as e:
        raise HTTPException(500, detail=f"Unsupervised clustering failed: {e}")


# ---------------- Difficulty (IRT / proxy) ----------------
@app.post("/api/estimate_difficulty")
def estimate_difficulty(b: EstimateDifficultyBody):
    try:
        return diff_est.estimate(question_text=b.question_text, qid=b.qid)
    except Exception as e:
        raise HTTPException(500, detail=f"Difficulty estimation failed: {e}")


# ---------------- One-shot analysis (mixed) ----------------
@app.post("/api/analyze/freeform")
def analyze_freeform(
    b: AnalyzeBody,
    x_openai_key: str | None = Header(default=None, alias="x-openai-key"),
    x_gemini_key: str | None = Header(default=None, alias="x-gemini-key"),
):
    """
    Mixed pipeline (for UI):
    - Similarity
    - SUPERVISED: misconception prediction
    - Difficulty (IRT or proxy)
    - Guidance text
    - Chart-ready payloads

    Note: The SUPERVISED call internally runs embeddings -> FSAG -> classifier.
    """
    try:
        # 1) similarities (kept raw to reflect semantic closeness)
        try:
            sim_ui_vs_ideal = mis_analyzer.similarity(b.user_answer_text, b.ideal_answer_text)
        except Exception as e:
            logging.exception("similarity user_vs_ideal failed")
            sim_ui_vs_ideal = 0.0
        try:
            sim_qi = mis_analyzer.similarity(b.question_text, b.ideal_answer_text)
        except Exception:
            logging.exception("similarity question_vs_ideal failed")
            sim_qi = 0.0

        # 2) SUPERVISED: misconception prediction (uses FSAG internally)
        try:
            mis_pred = mis_analyzer.predict_label(b.user_answer_text, qid=b.qid)
        except Exception:
            logging.exception("predict_label failed")
            mis_pred = {"label": "unknown", "confidence": 0.5, "risk": 0.4}

        # 3) difficulty
        try:
            diff = diff_est.estimate(question_text=b.question_text, qid=b.qid)
        except Exception:
            logging.exception("difficulty estimation failed")
            diff = {"difficulty_norm": 0.5, "bucket": "unknown"}

        # 4) overall answer score (blend of similarity & mis-risk)
        mis_risk = 1.0 - mis_pred.get("confidence", 0.5) if mis_pred.get("label") in ("noise","misc") else mis_pred.get("risk", 0.4)
        mis_risk = max(0.0, min(1.0, mis_risk))
        answer_score = 0.65*sim_ui_vs_ideal + 0.35*(1.0 - mis_risk)
        answer_score = float(round(answer_score, 3))

        # 5) guidance
        try:
            guidance = mis_analyzer.suggest_guidance(
                question=b.question_text,
                ideal=b.ideal_answer_text,
                user=b.user_answer_text,
                mis_label=mis_pred.get("label", "noise"),
                api_key=x_openai_key,
                gemini_key=x_gemini_key,
            )
        except Exception as e:
            logging.exception("suggest_guidance failed")
            # deterministic fallback from analyzer (shouldn't throw), but ensure fallback
            try:
                guidance = mis_analyzer.suggest_guidance(b.question_text, b.ideal_answer_text, b.user_answer_text, mis_pred.get("label", "noise"))
            except Exception:
                guidance = "Provide a concise answer, include definitions and one example."

        # 6) chart payloads
        pie = [
            {"name": "Matches Ideal", "value": round(sim_ui_vs_ideal, 3)},
            {"name": "Gaps vs Ideal", "value": round(max(0.0, 1.0 - sim_ui_vs_ideal - 0.15), 3)},
            {"name": "Misconception Risk", "value": round(min(0.4, mis_risk), 3)}
        ]
        bars = [
            {"metric": "User vs Ideal", "value": round(sim_ui_vs_ideal, 3)},
            {"metric": "Question vs Ideal", "value": round(sim_qi, 3)},
            {"metric": "Difficulty (0 easy–1 hard)", "value": round(diff["difficulty_norm"], 3)}
        ]

        return {
            "question_text": b.question_text,
            "ideal_answer_text": b.ideal_answer_text,
            "user_answer_text": b.user_answer_text,
            "similarity": {"user_vs_ideal": round(sim_ui_vs_ideal, 3), "question_vs_ideal": round(sim_qi, 3)},
            "misconception": mis_pred,
            "difficulty": diff,
            "answer_score": answer_score,
            "guidance": guidance,
            "charts": {"pie": pie, "bars": bars}
        }
    except Exception as e:
        # Log full traceback
        logging.exception("Unhandled error in analyze_freeform")
        dev_verbose = os.environ.get("DEV_VERBOSE_ERRORS", "0") in ("1", "true", "True")
        if dev_verbose:
            tb = traceback.format_exc()
            # include traceback in HTTP detail for local debugging
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}\n\n{tb}")
        else:
            raise HTTPException(status_code=500, detail="Analysis failed; check server logs for details.")
