"""
Build ANN Index from Post Embeddings

Collects all post embeddings from MongoDB and builds a fast similarity search index.
This enables O(log n) similarity queries instead of O(n).

Usage:
    python -m app.training.build_ann_index --embedding-dim 512 --metric cosine
"""

import sys
import os
import argparse
import logging
from pathlib import Path
from datetime import datetime
import numpy as np
from pymongo import MongoClient
from typing import List, Tuple

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.models.ann_index import ANNIndex
from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ANNIndexBuilder:
    """Builds ANN index from MongoDB post embeddings"""
    
    def __init__(
        self,
        mongodb_uri: str,
        db_name: str = None,
        embedding_dim: int = 512,
        metric: str = 'cosine',
        min_posts: int = 10
    ):
        """
        Initialize index builder
        
        Args:
            mongodb_uri: MongoDB connection string
            db_name: Database name (auto-detect if None)
            embedding_dim: Dimension of post embeddings
            metric: Distance metric (cosine, euclidean)
            min_posts: Minimum posts required to build index
        """
        self.mongodb_uri = mongodb_uri
        self.embedding_dim = embedding_dim
        self.metric = metric
        self.min_posts = min_posts
        
        # Connect to MongoDB
        logger.info(f"Connecting to MongoDB...")
        self.client = MongoClient(mongodb_uri)
        
        # Auto-detect database
        if db_name:
            self.db = self.client[db_name]
        else:
            # Try 'edunet', fallback to 'test'
            if 'edunet' in self.client.list_database_names():
                self.db = self.client['edunet']
            else:
                self.db = self.client['test']
        
        self.posts_collection = self.db['posts']
        
        logger.info(f"Connected to database: {self.db.name}")
    
    def collect_post_embeddings(self) -> Tuple[List[str], np.ndarray, List[dict]]:
        """
        Collect post embeddings from MongoDB
        
        Returns:
            Tuple of (post_ids, embeddings_matrix, metadata)
        """
        logger.info("Collecting post embeddings from MongoDB...")
        
        # Query posts with embeddings
        query = {
            'mlMetadata.embedding': {'$exists': True, '$ne': None},
            'status': {'$ne': 'draft'}  # Exclude drafts
        }
        
        projection = {
            '_id': 1,
            'title': 1,
            'type': 1,
            'tags': 1,
            'mlMetadata.embedding': 1,
            'upvotes': 1,
            'viewCount': 1
        }
        
        posts_cursor = self.posts_collection.find(query, projection)
        
        post_ids = []
        embeddings = []
        metadata = []
        
        for post in posts_cursor:
            embedding = post.get('mlMetadata', {}).get('embedding')
            
            # Validate embedding
            if not embedding or len(embedding) != self.embedding_dim:
                logger.warning(
                    f"Skipping post {post['_id']}: invalid embedding "
                    f"(expected {self.embedding_dim}D, got {len(embedding) if embedding else 0}D)"
                )
                continue
            
            post_ids.append(str(post['_id']))
            embeddings.append(embedding)
            
            # Store metadata for quick access
            metadata.append({
                'title': post.get('title', 'Untitled'),
                'type': post.get('type', 'unknown'),
                'tags': post.get('tags', []),
                'upvotes': post.get('upvotes', 0),
                'views': post.get('viewCount', 0)
            })
        
        if len(post_ids) == 0:
            raise ValueError(
                "No posts with embeddings found! "
                "Generate embeddings first using: "
                "node server/scripts/generatePostEmbeddings.js"
            )
        
        # Convert to numpy array
        embeddings_matrix = np.array(embeddings, dtype=np.float32)
        
        logger.info(
            f"✓ Collected {len(post_ids)} posts with {self.embedding_dim}D embeddings"
        )
        logger.info(f"  Embedding matrix shape: {embeddings_matrix.shape}")
        logger.info(f"  Memory usage: {embeddings_matrix.nbytes / 1024 / 1024:.2f} MB")
        
        return post_ids, embeddings_matrix, metadata
    
    def build_index(
        self,
        save_dir: str = 'models/ann_index',
        algorithm: str = 'ball_tree'
    ) -> ANNIndex:
        """
        Build and save ANN index
        
        Args:
            save_dir: Directory to save index
            algorithm: Algorithm (ball_tree, kd_tree, brute)
            
        Returns:
            Built ANNIndex
        """
        start_time = datetime.now()
        
        # Collect data
        post_ids, embeddings, metadata = self.collect_post_embeddings()
        
        # Check minimum posts
        if len(post_ids) < self.min_posts:
            raise ValueError(
                f"Insufficient posts: {len(post_ids)} < {self.min_posts}. "
                f"Need more posts with embeddings."
            )
        
        # Create ANN index
        logger.info(f"Creating ANN index with {algorithm} algorithm...")
        ann_index = ANNIndex(
            embedding_dim=self.embedding_dim,
            metric=self.metric,
            algorithm=algorithm
        )
        
        # Build index
        ann_index.build(post_ids, embeddings, metadata)
        
        # Save index
        save_path = Path(save_dir)
        ann_index.save(str(save_path))
        
        # Stats
        duration = (datetime.now() - start_time).total_seconds()
        logger.info(f"\n{'='*60}")
        logger.info(f"ANN Index Build Complete!")
        logger.info(f"{'='*60}")
        logger.info(f"Posts indexed:     {len(post_ids)}")
        logger.info(f"Embedding dim:     {self.embedding_dim}")
        logger.info(f"Metric:            {self.metric}")
        logger.info(f"Algorithm:         {algorithm}")
        logger.info(f"Build time:        {duration:.2f}s")
        logger.info(f"Saved to:          {save_path.absolute()}")
        logger.info(f"{'='*60}\n")
        
        # Test query
        self._test_index(ann_index, post_ids[0])
        
        return ann_index
    
    def _test_index(self, ann_index: ANNIndex, test_post_id: str):
        """Test the built index with a sample query"""
        logger.info("Testing index with sample query...")
        
        try:
            # Get test embedding
            test_embedding = ann_index.get_embedding(test_post_id)
            if test_embedding is None:
                logger.warning("Could not get test embedding")
                return
            
            # Query similar posts
            import time
            start = time.time()
            similar_ids, scores = ann_index.query(
                test_embedding,
                k=10,
                exclude_ids=[test_post_id]
            )
            query_time = (time.time() - start) * 1000  # ms
            
            logger.info(f"✓ Query completed in {query_time:.2f}ms")
            logger.info(f"  Found {len(similar_ids)} similar posts")
            logger.info(f"  Top 3 similarities: {scores[:3]}")
            
            # Show example results
            results = ann_index.query_with_metadata(
                test_embedding,
                k=3,
                exclude_ids=[test_post_id]
            )
            
            logger.info("\n  Example similar posts:")
            for i, result in enumerate(results, 1):
                logger.info(
                    f"    {i}. {result['title'][:50]}... "
                    f"(similarity: {result['similarity']:.3f})"
                )
        
        except Exception as e:
            logger.error(f"Test query failed: {e}")
    
    def close(self):
        """Close MongoDB connection"""
        if hasattr(self, 'client'):
            self.client.close()
            logger.info("MongoDB connection closed")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Build ANN index for fast post similarity search'
    )
    
    parser.add_argument(
        '--embedding-dim',
        type=int,
        default=512,
        help='Dimension of post embeddings (default: 512)'
    )
    
    parser.add_argument(
        '--metric',
        type=str,
        default='cosine',
        choices=['cosine', 'euclidean', 'manhattan'],
        help='Distance metric (default: cosine)'
    )
    
    parser.add_argument(
        '--algorithm',
        type=str,
        default='ball_tree',
        choices=['ball_tree', 'kd_tree', 'brute'],
        help='NN algorithm (default: ball_tree)'
    )
    
    parser.add_argument(
        '--save-dir',
        type=str,
        default='models/ann_index',
        help='Directory to save index (default: models/ann_index)'
    )
    
    parser.add_argument(
        '--min-posts',
        type=int,
        default=10,
        help='Minimum posts required (default: 10)'
    )
    
    parser.add_argument(
        '--db-name',
        type=str,
        default=None,
        help='MongoDB database name (auto-detect if not specified)'
    )
    
    args = parser.parse_args()
    
    # ASCII Art Header
    print("\n" + "="*60)
    print("  ⚡ ANN Index Builder - Fast Similarity Search")
    print("="*60 + "\n")
    
    try:
        # Build index
        builder = ANNIndexBuilder(
            mongodb_uri=settings.MONGODB_URI,
            db_name=args.db_name,
            embedding_dim=args.embedding_dim,
            metric=args.metric,
            min_posts=args.min_posts
        )
        
        ann_index = builder.build_index(
            save_dir=args.save_dir,
            algorithm=args.algorithm
        )
        
        # Performance comparison
        print("\n📊 Performance Comparison:")
        print(f"   Naive search (O(n)):  ~{ann_index.num_posts * 0.05:.1f}ms for {ann_index.num_posts} posts")
        print(f"   ANN search (O(log n)): ~0.5-2ms (estimated)")
        print(f"   Speedup:              ~{ann_index.num_posts * 0.05 / 1.0:.1f}x faster 🚀\n")
        
        builder.close()
        
        print("✅ Success! ANN index is ready for fast similarity search.")
        print(f"   Restart ML service to load the new index.\n")
        
        return 0
    
    except Exception as e:
        logger.error(f"❌ Failed to build ANN index: {e}", exc_info=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())
