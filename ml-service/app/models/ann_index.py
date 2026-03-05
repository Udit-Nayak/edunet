"""
Approximate Nearest Neighbors (ANN) Index for Fast Similarity Search

Provides O(log n) similarity search instead of O(n) for large post databases.
Uses Ball Tree algorithm for efficient nearest neighbor queries.
"""

import numpy as np
import pickle
from pathlib import Path
from typing import List, Tuple, Optional
import logging
from sklearn.neighbors import NearestNeighbors
from datetime import datetime

logger = logging.getLogger(__name__)


class ANNIndex:
    """
    Approximate Nearest Neighbors index for fast post similarity search
    
    Uses sklearn's NearestNeighbors with Ball Tree algorithm which provides:
    - O(log n) query time for similarity search
    - Efficient for high-dimensional embeddings (512D)
    - No external dependencies (unlike ScaNN or FAISS)
    
    Attributes:
        embedding_dim (int): Dimension of post embeddings (default 512)
        metric (str): Distance metric ('cosine' for similarity)
        n_neighbors (int): Max neighbors to consider
        index: NearestNeighbors model
        post_ids (List[str]): MongoDB post IDs in index order
        embeddings (np.ndarray): Post embedding matrix
    """
    
    def __init__(
        self,
        embedding_dim: int = 512,
        metric: str = 'cosine',
        n_neighbors: int = 100,
        algorithm: str = 'ball_tree'
    ):
        """
        Initialize ANN index
        
        Args:
            embedding_dim: Dimension of embeddings
            metric: Distance metric (cosine, euclidean, manhattan)
            n_neighbors: Maximum neighbors to retrieve
            algorithm: Algorithm to use (ball_tree, kd_tree, brute)
        """
        self.embedding_dim = embedding_dim
        self.metric = metric
        self.n_neighbors = n_neighbors
        self.algorithm = algorithm
        
        # Index components
        self.index: Optional[NearestNeighbors] = None
        self.post_ids: List[str] = []
        self.embeddings: Optional[np.ndarray] = None
        self.post_metadata: List[dict] = []  # Store title, tags for quick access
        
        # Stats
        self.num_posts = 0
        self.build_time: Optional[datetime] = None
        
        logger.info(
            f"Initialized ANNIndex: dim={embedding_dim}, "
            f"metric={metric}, algorithm={algorithm}"
        )
    
    def build(
        self,
        post_ids: List[str],
        embeddings: np.ndarray,
        metadata: Optional[List[dict]] = None
    ):
        """
        Build the ANN index from post embeddings
        
        Args:
            post_ids: List of MongoDB post IDs
            embeddings: Matrix of embeddings (n_posts x embedding_dim)
            metadata: Optional list of post metadata dicts
        
        Raises:
            ValueError: If inputs are invalid
        """
        # Validate inputs
        if len(post_ids) == 0:
            raise ValueError("Cannot build index with zero posts")
        
        if embeddings.shape[0] != len(post_ids):
            raise ValueError(
                f"Mismatch: {len(post_ids)} post IDs but "
                f"{embeddings.shape[0]} embeddings"
            )
        
        if embeddings.shape[1] != self.embedding_dim:
            raise ValueError(
                f"Expected {self.embedding_dim}D embeddings, "
                f"got {embeddings.shape[1]}D"
            )
        
        logger.info(f"Building ANN index for {len(post_ids)} posts...")
        start_time = datetime.now()
        
        # Store data
        self.post_ids = post_ids
        self.embeddings = embeddings
        self.post_metadata = metadata or [{} for _ in post_ids]
        self.num_posts = len(post_ids)
        
        # Build index
        # Note: For cosine similarity, we normalize embeddings and use euclidean
        # (ball_tree doesn't support cosine directly, but euclidean on normalized
        # vectors is mathematically equivalent to cosine similarity)
        if self.metric == 'cosine':
            # Normalize embeddings for cosine similarity
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1  # Avoid division by zero
            normalized_embeddings = embeddings / norms
            index_metric = 'euclidean'  # Use euclidean on normalized vectors
        else:
            normalized_embeddings = embeddings
            index_metric = self.metric
        
        # Create NearestNeighbors model
        # Use min of n_neighbors and actual post count
        n_neighbors = min(self.n_neighbors, self.num_posts)
        
        self.index = NearestNeighbors(
            n_neighbors=n_neighbors,
            algorithm=self.algorithm,
            metric=index_metric,  # Use appropriate metric for algorithm
            n_jobs=-1  # Use all CPU cores
        )
        
        # Fit the index
        self.index.fit(normalized_embeddings)
        
        build_duration = (datetime.now() - start_time).total_seconds()
        self.build_time = datetime.now()
        
        logger.info(
            f"✓ Built ANN index: {self.num_posts} posts in {build_duration:.2f}s"
        )
    
    def query(
        self,
        query_embedding: np.ndarray,
        k: int = 10,
        exclude_ids: Optional[List[str]] = None
    ) -> Tuple[List[str], List[float]]:
        """
        Find k most similar posts to query embedding
        
        Args:
            query_embedding: Query vector (embedding_dim,)
            k: Number of similar posts to return
            exclude_ids: Post IDs to exclude from results
        
        Returns:
            Tuple of (post_ids, similarity_scores)
            
        Raises:
            ValueError: If index not built or invalid query
        """
        if self.index is None:
            raise ValueError("Index not built. Call build() first.")
        
        # Validate query
        if query_embedding.shape[0] != self.embedding_dim:
            raise ValueError(
                f"Query must be {self.embedding_dim}D, "
                f"got {query_embedding.shape[0]}D"
            )
        
        # Reshape for sklearn
        query = query_embedding.reshape(1, -1)
        
        # Normalize for cosine similarity (to match index normalization)
        if self.metric == 'cosine':
            norm = np.linalg.norm(query)
            if norm > 0:
                query = query / norm
        
        # Query index (get extra results if we need to exclude some)
        k_query = min(k + len(exclude_ids or []) + 5, self.num_posts)
        
        distances, indices = self.index.kneighbors(query, n_neighbors=k_query)
        
        # Process results
        result_ids = []
        result_scores = []
        exclude_set = set(exclude_ids or [])
        
        for dist, idx in zip(distances[0], indices[0]):
            post_id = self.post_ids[idx]
            
            # Skip excluded posts
            if post_id in exclude_set:
                continue
            
            # Convert distance to similarity score
            if self.metric == 'cosine':
                # We used euclidean distance on normalized vectors
                # For unit vectors: cosine_sim = 1 - (euclidean_dist^2 / 2)
                # Clamp to [-1, 1] range (though should be [0, 1] for similar docs)
                similarity = 1.0 - (dist * dist / 2.0)
                similarity = max(-1.0, min(1.0, similarity))
            else:
                # For euclidean/manhattan, convert to similarity (inverse)
                similarity = 1.0 / (1.0 + dist)
            
            result_ids.append(post_id)
            result_scores.append(float(similarity))
            
            if len(result_ids) >= k:
                break
        
        return result_ids, result_scores
    
    def query_with_metadata(
        self,
        query_embedding: np.ndarray,
        k: int = 10,
        exclude_ids: Optional[List[str]] = None
    ) -> List[dict]:
        """
        Query with post metadata included
        
        Returns:
            List of dicts with post_id, similarity, and metadata
        """
        post_ids, scores = self.query(query_embedding, k, exclude_ids)
        
        results = []
        for post_id, score in zip(post_ids, scores):
            # Find metadata
            idx = self.post_ids.index(post_id)
            metadata = self.post_metadata[idx].copy()
            metadata['post_id'] = post_id
            metadata['similarity'] = score
            results.append(metadata)
        
        return results
    
    def get_embedding(self, post_id: str) -> Optional[np.ndarray]:
        """Get embedding for a specific post ID"""
        try:
            idx = self.post_ids.index(post_id)
            return self.embeddings[idx]
        except ValueError:
            return None
    
    def save(self, save_dir: str):
        """
        Save index to disk
        
        Args:
            save_dir: Directory to save index files
        """
        save_path = Path(save_dir)
        save_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Saving ANN index to {save_path}")
        
        # Save index and data
        index_data = {
            'post_ids': self.post_ids,
            'embeddings': self.embeddings,
            'post_metadata': self.post_metadata,
            'num_posts': self.num_posts,
            'build_time': self.build_time,
            'config': {
                'embedding_dim': self.embedding_dim,
                'metric': self.metric,
                'n_neighbors': self.n_neighbors,
                'algorithm': self.algorithm
            }
        }
        
        # Save as pickle
        with open(save_path / 'ann_index.pkl', 'wb') as f:
            pickle.dump(index_data, f, protocol=pickle.HIGHEST_PROTOCOL)
        
        # Save sklearn index separately (might be large)
        with open(save_path / 'sklearn_index.pkl', 'wb') as f:
            pickle.dump(self.index, f, protocol=pickle.HIGHEST_PROTOCOL)
        
        logger.info(f"✓ Saved ANN index: {self.num_posts} posts")
    
    @classmethod
    def load(cls, load_dir: str) -> 'ANNIndex':
        """
        Load index from disk
        
        Args:
            load_dir: Directory containing saved index
            
        Returns:
            Loaded ANNIndex instance
        """
        load_path = Path(load_dir)
        
        logger.info(f"Loading ANN index from {load_path}")
        
        # Load index data
        with open(load_path / 'ann_index.pkl', 'rb') as f:
            index_data = pickle.load(f)
        
        # Load sklearn index
        with open(load_path / 'sklearn_index.pkl', 'rb') as f:
            sklearn_index = pickle.load(f)
        
        # Reconstruct ANNIndex
        config = index_data['config']
        ann_index = cls(
            embedding_dim=config['embedding_dim'],
            metric=config['metric'],
            n_neighbors=config['n_neighbors'],
            algorithm=config['algorithm']
        )
        
        # Restore state
        ann_index.post_ids = index_data['post_ids']
        ann_index.embeddings = index_data['embeddings']
        ann_index.post_metadata = index_data['post_metadata']
        ann_index.num_posts = index_data['num_posts']
        ann_index.build_time = index_data['build_time']
        ann_index.index = sklearn_index
        
        logger.info(
            f"✓ Loaded ANN index: {ann_index.num_posts} posts, "
            f"built at {ann_index.build_time}"
        )
        
        return ann_index
    
    def get_stats(self) -> dict:
        """Get index statistics"""
        return {
            'num_posts': self.num_posts,
            'embedding_dim': self.embedding_dim,
            'metric': self.metric,
            'algorithm': self.algorithm,
            'build_time': self.build_time.isoformat() if self.build_time else None,
            'is_built': self.index is not None
        }
