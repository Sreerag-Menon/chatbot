from typing import Any, Dict, List
import hashlib
import os

import pdfplumber
from chromadb import PersistentClient
from chromadb.config import Settings
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma


# ---------- config ----------
VECTOR_DIR = os.getenv("VECTOR_DIR", "db")
COLLECTION = os.getenv("VECTOR_COLLECTION", "default")

embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")


def _vs() -> Chroma:
    return Chroma(
        collection_name=COLLECTION,
        persist_directory=VECTOR_DIR,
        embedding_function=embedding_model,
        client_settings=Settings(persist_directory=VECTOR_DIR),
    )


def _stable_id(doc: Document) -> str:
    raw = f"{doc.metadata.get('url','')}\n{doc.page_content}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


# ---------- index ----------
def index_text(text: str, metadata: Dict[str, Any] | None = None) -> int:
    metadata = metadata or {}
    splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120)
    docs = splitter.create_documents([text], metadatas=[metadata])
    if not docs:
        return 0
    ids = [_stable_id(d) for d in docs]
    vs = _vs()
    vs.add_documents(docs, ids=ids)
    return len(docs)


def index_documents(docs: List[Document]) -> int:
    if not docs:
        return 0
    splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120)
    chunks = splitter.split_documents(docs)
    ids = [_stable_id(d) for d in chunks]
    vs = _vs()
    vs.add_documents(chunks, ids=ids)
    return len(chunks)


# ---------- retrieval (verbose logs + MMR) ----------
def retrieve_context(query: str, k: int = 3) -> List[Document]:
    print(f"[RAG] Query: {query}")

    vs = _vs()

    def _preview(text: str, limit: int = 180) -> str:
        text_one_line = (text or "").replace("\n", " ").replace("\r", " ")
        return text_one_line[:limit] + ("..." if len(text_one_line) > limit else "")

    try:
        fetch_k = max(20, k * 5)
        print(f"[RAG] Fetching candidates: fetch_k={fetch_k}, k={k}")

        # First pass (with scores if available)
        candidates = []
        try:
            candidates = vs.similarity_search_with_relevance_scores(query, k=fetch_k)
        except Exception as e:
            print(f"[RAG][WARN] with_scores unavailable, fallback: {e}")
            sim_docs = vs.similarity_search(query, k=fetch_k)
            candidates = [(d, None) for d in sim_docs]

        top_to_log = min(10, len(candidates))
        print(f"[RAG] Top {top_to_log} candidates (pre-MMR):")
        for idx in range(top_to_log):
            item = candidates[idx]
            doc, score = (item if isinstance(item, tuple) else (item, None))
            meta = doc.metadata or {}
            print(
                f"[RAG][CAND {idx+1}] score={None if score is None else round(score, 3)} "
                f"source={meta.get('source')} url={meta.get('url')} title={meta.get('title')} "
                f"len={len(doc.page_content)} preview={_preview(doc.page_content)}"
            )

        retriever = vs.as_retriever(
            search_type="mmr",
            search_kwargs={"k": k, "fetch_k": fetch_k, "lambda_mult": 0.5},
        )
        results = retriever.invoke(query)

        # approximate score mapping (prefix)
        content_prefix_to_score = {}
        for item in candidates:
            doc, score = (item if isinstance(item, tuple) else (item, None))
            content_prefix_to_score[doc.page_content[:200]] = score

        print(f"[RAG] Selected {len(results)} docs via MMR:")
        for i, d in enumerate(results, start=1):
            meta = d.metadata or {}
            approx_score = content_prefix_to_score.get(d.page_content[:200])
            print(
                f"[RAG][TOP {i}] score={None if approx_score is None else round(approx_score, 3)} "
                f"source={meta.get('source')} url={meta.get('url')} title={meta.get('title')} "
                f"len={len(d.page_content)} preview={_preview(d.page_content)}"
            )
        return results
    except Exception as e:
        print(f"[ERROR] Retrieval error: {e}")
        return []


# ---------- pdf ----------
def extract_text_from_pdf(file_path: str) -> str:
    try:
        with pdfplumber.open(file_path) as pdf:
            return "\n".join((page.extract_text() or "") for page in pdf.pages)
    except Exception as e:
        print(f"[ERROR] Failed to extract text from PDF: {e}")
        return ""


# ---------- stats ----------
def get_knowledge_base_stats() -> Dict[str, Any]:
    try:
        vs = _vs()
        total = vs._collection.count()
        sources: dict[str, int] = {}
        if total > 0:
            out = vs.get()
            for md in out.get("metadatas", []):
                if not md:
                    continue
                src = md.get("source") or md.get("url") or "unknown"
                sources[src] = sources.get(src, 0) + 1
        return {"total_documents": total, "sources": sources, "vector_db_path": VECTOR_DIR}
    except Exception as e:
        return {"total_documents": 0, "sources": {}, "vector_db_path": VECTOR_DIR, "error": str(e)}


def get_indexed_documents() -> List[Dict[str, Any]]:
    try:
        vs = _vs()
        out = vs.get()
        docs: List[Dict[str, Any]] = []
        for i, md in enumerate(out.get("metadatas", [])):
            text = (out.get("documents", [""])[i] or "")
            docs.append({
                "id": out.get("ids", [""])[i] if i < len(out.get("ids", [])) else f"doc_{i}",
                "source": (md or {}).get("source") or (md or {}).get("url") or "unknown",
                "metadata": md or {},
                "content_preview": (text[:200] + "...") if len(text) > 200 else text,
            })
        return docs
    except Exception as e:
        print(f"[ERROR] Failed to get indexed documents: {e}")
        return []


# ---------- destructive ops ----------
def clear_knowledge_base():
    """Drop the collection and recreate it empty (no where={} errors)."""
    client = PersistentClient(path=VECTOR_DIR)
    try:
        client.delete_collection(COLLECTION)
    except Exception:
        pass
    # recreate empty collection
    _ = Chroma(
        client=client,
        collection_name=COLLECTION,
        embedding_function=embedding_model,
    )
    print("[INFO] Knowledge base cleared successfully")
