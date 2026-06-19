"""Concept Matcher using Sentence Transformers.

Maps question text to curriculum concepts via cosine similarity.
Used for automatic question tagging (chapter/concept mapping).

Model: sentence-transformers/all-MiniLM-L6-v2 (Apache 2.0, 22M params)
"""

from typing import Optional


class ConceptMatcher:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.model = None
        self._concept_cache: dict = {}

    def _ensure_model(self):
        if self.model is not None:
            return

        from sentence_transformers import SentenceTransformer

        print("Loading all-MiniLM-L6-v2 embedding model...")
        model_id = "sentence-transformers/all-MiniLM-L6-v2"
        self.model = SentenceTransformer(model_id)
        print("Concept matcher ready.")

    def _get_concept_texts(self, concepts: list[dict]) -> list[str]:
        """Build searchable text for each concept from name + keywords + description."""
        texts = []
        for c in concepts:
            parts = [c.get("name", "")]
            parts.extend(c.get("keywords", []))
            parts.append(c.get("description", ""))
            texts.append(" ".join(parts))
        return texts

    def match_question_to_concept(
        self,
        question_text: str,
        concepts: list[dict],
        top_k: int = 3,
    ) -> list[dict]:
        """Match a question to the top-k closest curriculum concepts.

        Args:
            question_text: The question text to match.
            concepts: List of concept dicts with keys name, keywords, description.
            top_k: Number of top matches to return.

        Returns:
            List of {concept, score} dicts sorted by similarity (highest first).
        """
        self._ensure_model()

        concept_texts = self._get_concept_texts(concepts)
        question_emb = self.model.encode(question_text)
        concept_embs = self.model.encode(concept_texts)

        from sklearn.metrics.pairwise import cosine_similarity
        scores = cosine_similarity([question_emb], concept_embs)[0].tolist()

        ranked = sorted(
            zip(concepts, scores), key=lambda x: x[1], reverse=True
        )
        return [
            {"concept": c, "score": round(s, 3)} for c, s in ranked[:top_k]
        ]

    def match_all_questions(
        self,
        questions: list[dict],
        concepts: list[dict],
        top_k: int = 3,
    ) -> list[dict]:
        """Match a batch of questions to concepts.

        Args:
            questions: List of dicts with key 'text'.
            concepts: List of concept dicts.
            top_k: Top matches per question.

        Returns:
            List of enriched question dicts with 'matches' field.
        """
        results = []
        for q in questions:
            matches = self.match_question_to_concept(q["text"], concepts, top_k)
            results.append({**q, "matches": matches})
        return results


concept_matcher = ConceptMatcher()
