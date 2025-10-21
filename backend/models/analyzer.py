# models/analyzer.py
from __future__ import annotations
import os, json
import numpy as np
import pandas as pd
import joblib
from typing import Optional, Dict, Any, List, Tuple

from .text import embed, cosine_sim, clean_text, get_encoder

# Unsupervised grouping (domain-agnostic)
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler


# ---------------------------------------------------------------------
# FSAG: Feature-Selective Attenuation Gate (NUMPY, lightweight)
# ---------------------------------------------------------------------
class FSAG:
    """
    A tiny, per-feature gating block placed BETWEEN the encoder (SentenceTransformer)
    and any downstream consumer.

    Why here?
    - We want to denoise/attenuate at the REPRESENTATION level so BOTH
      (a) SUPERVISED classification and (b) UNSUPERVISED grouping
      benefit from cleaner, more discriminative features.

    This implementation is artifact-driven:
      - If artifacts 'fsag_weights.npz' exist (W1,b1,W2,b2), use them.
      - Otherwise FSAG becomes identity: h_tilde = h (no change).
    """
    def __init__(self, artifacts_dir: str):
        self.W1: Optional[np.ndarray] = None
        self.b1: Optional[np.ndarray] = None
        self.W2: Optional[np.ndarray] = None
        self.b2: Optional[np.ndarray] = None
        self.loaded = False
        self._try_load(os.path.join(artifacts_dir, "fsag_weights.npz"))

    def _try_load(self, path: str):
        if os.path.exists(path):
            try:
                data = np.load(path)
                self.W1 = data["W1"]
                self.b1 = data["b1"]
                self.W2 = data["W2"]
                self.b2 = data["b2"]
                # quick shape sanity
                assert self.W1.ndim == 2 and self.W2.ndim == 2
                assert self.b1.ndim == 1 and self.b2.ndim == 1
                assert self.W1.shape[0] == self.b1.shape[0]
                assert self.W2.shape[0] == self.b2.shape[0]
                self.loaded = True
            except Exception:
                self.W1 = self.b1 = self.W2 = self.b2 = None
                self.loaded = False
        else:
            self.loaded = False

    @staticmethod
    def _silu(x: np.ndarray) -> np.ndarray:
        return x / (1.0 + np.exp(-x))

    @staticmethod
    def _sigmoid(x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-x))

    def _apply_with_weights(self, H: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        H : (N,D) or (D,)
        returns (H_tilde, gates) with same batch shape.
        """
        single = False
        if H.ndim == 1:
            H = H.reshape(1, -1)
            single = True

        # Handle dimensionality drift by padding/truncation
        D = H.shape[1]
        d1_in = self.W1.shape[1]
        if D != d1_in:
            if D < d1_in:
                pad = np.zeros((H.shape[0], d1_in - D), dtype=H.dtype)
                H_use = np.concatenate([H, pad], axis=1)
            else:
                H_use = H[:, :d1_in]
        else:
            H_use = H

        U = self._silu(H_use @ self.W1.T + self.b1)          # (N, hidden)
        G = self._sigmoid(U @ self.W2.T + self.b2)           # (N, D_fsag)
        # match gate dimensionality to H (pad/trim)
        if G.shape[1] != D:
            if G.shape[1] < D:
                gpad = np.ones((G.shape[0], D - G.shape[1]), dtype=G.dtype)
                G = np.concatenate([G, gpad], axis=1)
            else:
                G = G[:, :D]

        H_tilde = G * H
        if single:
            return H_tilde.reshape(-1), G.reshape(-1)
        return H_tilde, G

    def transform(self, H: np.ndarray) -> np.ndarray:
        """
        Identity fallback if no weights found. Otherwise applies gating.
        """
        if not self.loaded or self.W1 is None:
            return H  # identity
        H_tilde, _ = self._apply_with_weights(H)
        return H_tilde

    def gates(self, H: np.ndarray) -> np.ndarray:
        """
        Return gate activations for inspection/plots. Identity -> ones.
        """
        if not self.loaded or self.W1 is None:
            if H.ndim == 1:
                return np.ones_like(H)
            return np.ones(H.shape, dtype=H.dtype)
        _, G = self._apply_with_weights(H)
        return G


# ---------------------------------------------------------------------
# MisconceptionAnalyzer (augmented with FSAG + Unsupervised Grouping)
# ---------------------------------------------------------------------
class MisconceptionAnalyzer:
    def __init__(self, artifacts_dir: str, encoder):
        self.encoder = encoder
        self.loaded = False
        self.label_ref = {}   # (optional) known cluster labels per qid
        self.clf = None       # SUPERVISED classifier (joblib)
        self.fsag = FSAG(artifacts_dir=artifacts_dir)  # FSAG sits BETWEEN encoder and both branches
        self._load(artifacts_dir)

    def _load(self, art: str):
        # ---- SUPERVISED classifier artifact (kept as-is; now consumes FSAG-attenuated features)
        clf_path = os.path.join(art, "misconception_clf.joblib")
        if os.path.exists(clf_path):
            self.clf = joblib.load(clf_path)

        # ---- Known labels per qid (optional)
        lbl_path = os.path.join(art, "cluster_labels.parquet")
        if os.path.exists(lbl_path):
            try:
                df = pd.read_parquet(lbl_path)
                for qid, grp in df.groupby("qid"):
                    self.label_ref[int(qid)] = sorted(set(str(x) for x in grp["label"].tolist()))
            except Exception:
                self.label_ref = {}

        self.loaded = True

    # ------------------------ Shared utilities ------------------------
    def _embed_clean(self, texts: List[str]) -> np.ndarray:
        # Sentence Transformer (feature extractor; NO MLP here)
        vecs = embed([clean_text(t) for t in texts], self.encoder)
        # FSAG transforms happen HERE, before both branches.
        vecs_tilde = self.fsag.transform(vecs)
        return vecs_tilde

    def similarity(self, a_text: str, b_text: str) -> float:
        # Similarity for UI; stays on raw encoder to reflect semantic closeness
        a_vec, b_vec = embed([clean_text(a_text), clean_text(b_text)], self.encoder)
        return float(round(cosine_sim(a_vec, b_vec), 4))

    # ------------------------ SUPERVISED branch ------------------------
    def predict_label(self, user_answer: str, qid: Optional[int] = None) -> Dict[str, Any]:
        """
        SUPERVISED classification:
        - Where: runs AFTER embeddings and FSAG (representation-level attenuation).
        - Why supervised here? We need labels to learn decision boundaries for misconception
          categories; FSAG denoises inputs so the fixed classifier generalizes better.
        """
        text = clean_text(user_answer)
        # Encoder -> FSAG (attenuation) -> classifier
        vec = self._embed_clean([text])[0]

        if self.clf is None:
            return {"label": "unknown", "confidence": 0.5, "risk": 0.4, "explanation": "No classifier artifact found."}

        # Feature-dimension adaptation for legacy artifacts
        try:
            expected_dim = None
            if hasattr(self.clf, "n_features_in_"):
                expected_dim = int(getattr(self.clf, "n_features_in_"))
            elif hasattr(self.clf, "coef_"):
                try:
                    expected_dim = int(self.clf.coef_.shape[1])
                except Exception:
                    expected_dim = None

            if expected_dim is not None and len(vec) != expected_dim:
                v = vec.astype(float); L = len(v); D = expected_dim
                if D % L == 0:
                    v = np.tile(v, D // L)
                elif D > L:
                    v = np.concatenate([v, np.zeros(D - L, dtype=v.dtype)])
                else:
                    v = v[:D]
                vec_for_pred = v
            else:
                vec_for_pred = vec

            proba = self.clf.predict_proba([vec_for_pred])[0]
            idx = int(np.argmax(proba))
            label = self.clf.classes_[idx]
            conf = float(proba[idx])
        except Exception:
            try:
                label = str(self.clf.predict([vec])[0]); conf = 0.6
            except Exception:
                return {"label": "unknown", "confidence": 0.5, "risk": 0.4, "explanation": "Classifier prediction failed."}

        # Simple risk heuristic
        risk = 0.2
        if any(k in str(label).lower() for k in ["miscon", "error", "wrong", "confuse", "noise"]):
            risk = max(0.4, 1.0 - conf + 0.4)

        # OOD vs known labels for qid
        if qid is not None and qid in self.label_ref and label not in self.label_ref[qid]:
            label = f"{label} (unseen@qid)"; risk = max(risk, 0.5)

        return {"label": str(label), "confidence": round(conf, 3), "risk": round(float(risk), 3)}

    # ------------------------ UNSUPERVISED branch ------------------------
    def cluster_unsupervised(
        self,
        texts: List[str],
        eps: float = 0.5,
        min_samples: int = 8,
        scale_before: bool = True,
    ) -> Dict[str, Any]:
        """
        UNSUPERVISED grouping:
        - Where: runs AFTER embeddings and FSAG (same attenuated space as supervised).
        - Why unsupervised here? To DISCOVER structure (recurring misconception themes)
          that labels do not yet cover; useful for teacher review, new-code creation,
          and bootstrapping pseudo-labels.
        """
        if not texts:
            return {"cluster_labels": [], "exemplars": {}, "note": "empty input"}

        # Encoder -> FSAG (attenuation) -> clustering
        H_tilde = self._embed_clean(texts)

        X = H_tilde
        if scale_before:
            X = StandardScaler().fit_transform(X)

        db = DBSCAN(eps=eps, min_samples=min_samples).fit(X)
        labels = db.labels_.tolist()

        # Simple exemplars (first member per cluster; -1 = noise)
        exemplars: Dict[int, str] = {}
        for i, lab in enumerate(labels):
            if lab == -1:
                continue
            if lab not in exemplars:
                exemplars[lab] = texts[i]

        return {
            "cluster_labels": labels,
            "exemplars": exemplars,
            "fsag_active": bool(self.fsag.loaded),
            "note": "Clustering performed on FSAG-attenuated embeddings (domain-agnostic, density-based)."
        }

    # ------------------------ Guidance (unchanged, but available) ------------------------
    def suggest_guidance(self, question: str, ideal: str, user: str, mis_label: str,
                         api_key: str | None = None, gemini_key: str | None = None) -> str:
        """
        Concise guidance string with optional external LLM calls.
        This remains unchanged from your previous version.
        """
        # --- BEGIN original guidance code (verbatim, minimal changes) ---
        import requests
        sim_ui = self.similarity(user, ideal)

        tips = []
        tips.append("Start by restating the key term from the question in one line.")
        if sim_ui < 0.65:
            tips.append("Add a precise definition and one verifying example.")
        if any(k in mis_label.lower() for k in ["epsilon","ε","dfa","nfa","regex","star","union","concat","equiv"]):
            tips.append("Address the specific confusion noted in the label; contrast the two concepts explicitly.")
        tips.append("Finish with a short check: why your answer satisfies the definition or rule.")
        fallback = " ".join(tips)

        gemini_key = gemini_key or os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            try:
                g_prompt = (
                    "You are an expert educator. Provide 4 concise, actionable suggestions to improve a student's short answer. "
                    "Return them as short sentences separated by newline characters. Do not include numbering. Keep each suggestion under 140 characters.\n\n"
                    f"Question: {question}\n"
                    f"Ideal answer: {ideal}\n"
                    f"Student answer: {user}\n"
                    f"Observed label: {mis_label}\n"
                )
                gemini_url = f"https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate?key={gemini_key}"
                resp = requests.post(
                    gemini_url,
                    json={"prompt": {"text": g_prompt}, "temperature": 0.2, "maxOutputTokens": 180},
                    timeout=8,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = None
                    try:
                        text = data.get("candidates", [])[0].get("output")
                    except Exception:
                        try:
                            text = data.get("candidates", [])[0].get("content")
                        except Exception:
                            text = None
                    if text:
                        t = text.strip()
                        if len(t) > 0:
                            return t
            except Exception:
                pass

        openai_key = api_key or os.environ.get("OPENAI_API_KEY")
        if openai_key:
            try:
                prompt = (
                    "You are an expert educator. Provide 4 concise, actionable suggestions to improve a student's short answer. "
                    "Return them as short sentences separated by newline characters.\n\n"
                    f"Question: {question}\n"
                    f"Ideal answer: {ideal}\n"
                    f"Student answer: {user}\n"
                    f"Observed label: {mis_label}\n"
                    "Do not include any special formatting or numbering. Keep each suggestion under 140 characters."
                )
                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                    json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "max_tokens": 180, "temperature": 0.2},
                    timeout=8,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = None
                    try:
                        text = data["choices"][0]["message"]["content"]
                    except Exception:
                        text = data["choices"][0].get("text")
                    if text:
                        text = text.strip()
                        if len(text) > 0:
                            return text
            except Exception:
                pass

        return fallback
        # --- END original guidance code ---