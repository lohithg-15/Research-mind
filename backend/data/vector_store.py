import os
import numpy as np
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger("researchmind.vector_store")

class VectorStore:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # Default to backend/db/chroma
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(base_dir, "db", "chroma")
        
        logger.info(f"Initializing ChromaDB at: {db_path}")
        os.makedirs(db_path, exist_ok=True)
        
        import chromadb
        self.client = chromadb.PersistentClient(path=db_path)
        
        # Try to use Chroma's default embedding function, with fallback to custom logic if downloading fails
        try:
            from chromadb.utils import embedding_functions
            self.embedding_function = embedding_functions.DefaultEmbeddingFunction()
            # Test it to ensure model loads
            self.embedding_function(["test text"])
            logger.info("ChromaDB default embedding function initialized successfully.")
            self.collection = self.client.get_or_create_collection(
                name="researchmind_papers",
                embedding_function=self.embedding_function
            )
            self._use_fallback_embeddings = False
        except Exception as e:
            logger.warning(f"Could not load default embedding function ({e}). Falling back to simple TF-IDF/Hash embeddings.")
            self.collection = self.client.get_or_create_collection(name="researchmind_papers")
            self._use_fallback_embeddings = True

    def _generate_fallback_embedding(self, text: str) -> List[float]:
        """
        Fallback embedding generator using hashing and numpy. 
        Produces a consistent 384-dimensional unit vector from text.
        """
        dim = 384
        state = np.random.RandomState(abs(hash(text)) % (2**32))
        vec = state.randn(dim)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def add_papers(self, papers: List[Dict[str, Any]]):
        """
        Adds paper metadata and abstracts to the vector database.
        """
        if not papers:
            return
            
        ids = []
        documents = []
        metadatas = []
        embeddings = []
        
        for paper in papers:
            p_id = paper["id"]
            title = paper["title"]
            abstract = paper["abstract"] or ""
            text = f"{title}. {abstract}"
            
            ids.append(p_id)
            documents.append(text)
            metadatas.append({
                "title": title,
                "year": paper["year"],
                "full_text_available": paper["full_text_available"]
            })
            
            if self._use_fallback_embeddings:
                embeddings.append(self._generate_fallback_embedding(text))
                
        try:
            if self._use_fallback_embeddings:
                self.collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas,
                    embeddings=embeddings
                )
            else:
                self.collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
            logger.info(f"Added {len(ids)} papers to vector store.")
        except Exception as e:
            logger.error(f"Error adding papers to vector store: {e}")

    def query_similarity(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Queries the vector store for papers similar to the search query.
        """
        count = self.collection.count()
        if count == 0:
            return []
            
        n_results = min(limit, count)
        
        try:
            if self._use_fallback_embeddings:
                query_embeddings = [self._generate_fallback_embedding(query)]
                results = self.collection.query(
                    query_embeddings=query_embeddings,
                    n_results=n_results
                )
            else:
                results = self.collection.query(
                    query_texts=[query],
                    n_results=n_results
                )
                
            formatted = []
            if results and results["ids"]:
                ids = results["ids"][0]
                distances = results["distances"][0] if results["distances"] else [0.0]*len(ids)
                metadatas = results["metadatas"][0] if results["metadatas"] else [{}]*len(ids)
                documents = results["documents"][0] if results["documents"] else [""]*len(ids)
                
                for i in range(len(ids)):
                    formatted.append({
                        "id": ids[i],
                        "distance": distances[i],
                        "metadata": metadatas[i],
                        "document": documents[i]
                    })
            return formatted
        except Exception as e:
            logger.error(f"Error querying vector store: {e}")
            return []

    def get_embedding(self, paper_id: str) -> Optional[List[float]]:
        """
        Retrieves the embedding vector of a paper by its ID.
        """
        try:
            res = self.collection.get(ids=[paper_id], include=["embeddings"])
            if res and res.get("embeddings") is not None and len(res["embeddings"]) > 0:
                # Convert numpy array to list if needed
                emb = res["embeddings"][0]
                if hasattr(emb, "tolist"):
                    return emb.tolist()
                return list(emb)
        except Exception as e:
            logger.error(f"Error retrieving embedding from vector store: {e}")
        
        # If not found or failed, but using fallback, try loading from metadata
        # or generating it just in case
        return None
