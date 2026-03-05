"""
Training script for Collaborative Filtering model
Trains on user-post interaction data from MongoDB
"""

import numpy as np
from pymongo import MongoClient
from sklearn.model_selection import train_test_split
from collections import defaultdict
import logging
import argparse
from datetime import datetime
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.collaborative_filter import CollaborativeFilter
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CollaborativeDataCollector:
    """Collect and prepare interaction data for collaborative filtering"""
    
    def __init__(self, mongodb_uri: str = None):
        """Initialize MongoDB connection"""
        uri = mongodb_uri or settings.MONGODB_URI
        self.client = MongoClient(uri)
        
        # Use correct database
        if '/test?' in uri or uri.endswith('/test'):
            self.db = self.client.test
        elif '/edunet?' in uri or uri.endswith('/edunet'):
            self.db = self.client.edunet
        else:
            self.db = self.client.test
        
        self.interactions = self.db.interactions
        logger.info("✅ Connected to MongoDB")
    
    def collect_interaction_data(
        self,
        min_interactions_per_user: int = 3,
        min_interactions_per_post: int = 2
    ):
        """
        Collect user-post interaction data
        
        Args:
            min_interactions_per_user: Filter users with fewer interactions
            min_interactions_per_post: Filter posts with fewer interactions
            
        Returns:
            Tuple of (user_ids, post_ids, interactions_dict, user_post_pairs)
        """
        logger.info("Collecting interaction data from MongoDB...")
        
        # Get all interactions
        all_interactions = list(self.interactions.find({
            'userId': {'$exists': True, '$ne': None},
            'postId': {'$exists': True, '$ne': None}
        }))
        
        logger.info(f"Found {len(all_interactions)} total interactions")
        
        if len(all_interactions) < 100:
            raise ValueError(f"Not enough interactions for training. Need at least 100, found {len(all_interactions)}")
        
        # Aggregate interactions by user-post pair
        interaction_scores = defaultdict(float)
        user_interactions = defaultdict(set)
        post_interactions = defaultdict(set)
        
        for inter in all_interactions:
            user_id = str(inter['userId'])
            post_id = str(inter['postId'])
            
            # Calculate interaction weight
            weight = 0
            if inter.get('viewed'):
                weight += 0.1
            if inter.get('upvoted'):
                weight += 0.5
            if inter.get('saved'):
                weight += 0.3
            if inter.get('commented'):
                weight += 0.4
            
            # Accumulate score
            interaction_scores[(user_id, post_id)] += weight
            user_interactions[user_id].add(post_id)
            post_interactions[post_id].add(user_id)
        
        # Filter users and posts
        valid_users = {
            uid for uid, posts in user_interactions.items()
            if len(posts) >= min_interactions_per_user
        }
        
        valid_posts = {
            pid for pid, users in post_interactions.items()
            if len(users) >= min_interactions_per_post
        }
        
        logger.info(f"Valid users: {len(valid_users)} (min {min_interactions_per_user} interactions)")
        logger.info(f"Valid posts: {len(valid_posts)} (min {min_interactions_per_post} interactions)")
        
        # Filter interaction scores
        filtered_interactions = {
            (uid, pid): score
            for (uid, pid), score in interaction_scores.items()
            if uid in valid_users and pid in valid_posts
        }
        
        logger.info(f"Filtered interactions: {len(filtered_interactions)}")
        
        if len(filtered_interactions) < 100:
            raise ValueError(f"Not enough valid interactions. Need at least 100, found {len(filtered_interactions)}")
        
        # Get unique IDs
        user_ids = sorted(list(valid_users))
        post_ids = sorted(list(valid_posts))
        
        return user_ids, post_ids, filtered_interactions
    
    def prepare_training_data(
        self,
        user_ids: list,
        post_ids: list,
        interactions: dict,
        negative_ratio: int = 3
    ):
        """
        Prepare training data with negative sampling
        
        Args:
            user_ids: List of user IDs
            post_ids: List of post IDs
            interactions: Dictionary of (user_id, post_id) -> score
            negative_ratio: Number of negative samples per positive sample
            
        Returns:
            Tuple of (user_indices, post_indices, labels)
        """
        logger.info("Preparing training data with negative sampling...")
        
        # Create ID to index mappings
        user_to_idx = {uid: idx for idx, uid in enumerate(user_ids)}
        post_to_idx = {pid: idx for idx, pid in enumerate(post_ids)}
        
        # Positive samples
        positive_pairs = []
        for (uid, pid), score in interactions.items():
            user_idx = user_to_idx[uid]
            post_idx = post_to_idx[pid]
            positive_pairs.append((user_idx, post_idx, score))
        
        logger.info(f"Positive samples: {len(positive_pairs)}")
        
        # Negative sampling
        user_positive_posts = defaultdict(set)
        for (uid, pid), _ in interactions.items():
            user_positive_posts[uid].add(pid)
        
        negative_pairs = []
        np.random.seed(42)
        
        for user_idx, user_id in enumerate(user_ids):
            positive_posts = user_positive_posts[user_id]
            num_negatives = len(positive_posts) * negative_ratio
            
            # Sample negative posts
            available_posts = [pid for pid in post_ids if pid not in positive_posts]
            
            if len(available_posts) > 0:
                sampled = np.random.choice(
                    len(available_posts),
                    size=min(num_negatives, len(available_posts)),
                    replace=False
                )
                
                for idx in sampled:
                    post_id = available_posts[idx]
                    post_idx = post_to_idx[post_id]
                    negative_pairs.append((user_idx, post_idx, 0.0))
        
        logger.info(f"Negative samples: {len(negative_pairs)}")
        
        # Combine and convert to arrays
        all_pairs = positive_pairs + negative_pairs
        np.random.shuffle(all_pairs)
        
        user_indices = np.array([p[0] for p in all_pairs], dtype=np.int32)
        post_indices = np.array([p[1] for p in all_pairs], dtype=np.int32)
        
        # Normalize scores to [0, 1] for positive samples
        scores = np.array([p[2] for p in all_pairs], dtype=np.float32)
        max_score = scores.max()
        if max_score > 0:
            scores = scores / max_score
        
        # Convert to binary labels (positive vs negative)
        labels = (scores > 0).astype(np.float32)
        
        logger.info(f"Total training samples: {len(user_indices)}")
        logger.info(f"   Positive: {labels.sum():.0f}")
        logger.info(f"   Negative: {(labels == 0).sum():.0f}")
        
        return user_indices, post_indices, labels
    
    def close(self):
        """Close MongoDB connection"""
        self.client.close()
        logger.info("MongoDB connection closed")


def train_collaborative_filter(
    embedding_dim: int = 64,
    epochs: int = 10,
    batch_size: int = 512,
    test_size: float = 0.1,
    negative_ratio: int = 3
):
    """
    Train the collaborative filtering model
    
    Args:
        embedding_dim: Dimension of embeddings
        epochs: Number of training epochs
        batch_size: Batch size
        test_size: Proportion for testing
        negative_ratio: Negative samples per positive sample
    """
    logger.info("="*60)
    logger.info("COLLABORATIVE FILTERING MODEL TRAINING")
    logger.info("="*60)
    logger.info("")
    
    # Step 1: Collect data
    logger.info("📊 Step 1: Collecting interaction data...")
    collector = CollaborativeDataCollector()
    
    try:
        user_ids, post_ids, interactions = collector.collect_interaction_data(
            min_interactions_per_user=3,
            min_interactions_per_post=2
        )
    except Exception as e:
        logger.error(f"Error collecting data: {e}")
        collector.close()
        return
    
    logger.info(f"   Users: {len(user_ids)}")
    logger.info(f"   Posts: {len(post_ids)}")
    logger.info(f"   Interactions: {len(interactions)}")
    logger.info("")
    
    # Step 2: Prepare training data
    logger.info("🔨 Step 2: Preparing training data...")
    
    user_indices, post_indices, labels = collector.prepare_training_data(
        user_ids=user_ids,
        post_ids=post_ids,
        interactions=interactions,
        negative_ratio=negative_ratio
    )
    
    logger.info("")
    
    # Step 3: Train/test split
    logger.info("✂️  Step 3: Splitting data...")
    
    indices = np.arange(len(user_indices))
    train_idx, test_idx = train_test_split(
        indices,
        test_size=test_size,
        random_state=42
    )
    
    X_train_user = user_indices[train_idx]
    X_train_post = post_indices[train_idx]
    y_train = labels[train_idx]
    
    X_test_user = user_indices[test_idx]
    X_test_post = post_indices[test_idx]
    y_test = labels[test_idx]
    
    logger.info(f"   Training: {len(X_train_user)} samples")
    logger.info(f"   Test: {len(X_test_user)} samples")
    logger.info("")
    
    # Step 4: Build model
    logger.info("🏗️  Step 4: Building model...")
    
    cf = CollaborativeFilter(embedding_dim=embedding_dim)
    cf.prepare_id_mappings(user_ids, post_ids)
    cf.build_model(num_users=len(user_ids), num_posts=len(post_ids))
    cf.compile_model(learning_rate=0.001)
    
    logger.info("")
    
    # Step 5: Train
    logger.info("🎯 Step 5: Training model...")
    logger.info("")
    
    history = cf.train(
        user_indices=X_train_user,
        post_indices=X_train_post,
        labels=y_train,
        validation_split=0.1,
        epochs=epochs,
        batch_size=batch_size
    )
    
    logger.info("")
    
    # Step 6: Evaluate on test set
    logger.info("📊 Step 6: Evaluating on test set...")
    
    metrics = cf.evaluate(X_test_user, X_test_post, y_test)
    
    logger.info("Test set metrics:")
    for metric, value in metrics.items():
        logger.info(f"   {metric}: {value:.4f}")
    
    logger.info("")
    
    # Step 7: Save model
    logger.info("💾 Step 7: Saving model...")
    
    # Create models directory
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    # Save with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_path = os.path.join(models_dir, f'collaborative_filter_{timestamp}.h5')
    mappings_path = os.path.join(models_dir, f'cf_mappings_{timestamp}.pkl')
    
    # Also save as latest
    latest_model_path = os.path.join(models_dir, 'collaborative_filter.h5')
    latest_mappings_path = os.path.join(models_dir, 'cf_mappings.pkl')
    
    cf.save(model_path, mappings_path)
    cf.save(latest_model_path, latest_mappings_path)
    
    logger.info(f"   Saved to: {model_path}")
    logger.info(f"   Latest: {latest_model_path}")
    logger.info("")
    
    # Step 8: Test predictions
    logger.info("🧪 Step 8: Testing predictions...")
    
    # Test similar users
    test_user = user_ids[0]
    similar_users = cf.find_similar_users(test_user, top_k=5)
    
    logger.info(f"\nSimilar users to {test_user[:8]}...:")
    for uid, score in similar_users[:3]:
        logger.info(f"   {uid[:8]}... (similarity: {score:.3f})")
    
    # Test recommendations
    candidate_posts = post_ids[:20]
    recommendations = cf.predict_affinity(test_user, candidate_posts)
    
    logger.info(f"\nTop recommendations for {test_user[:8]}...:")
    for pid, score in recommendations[:5]:
        logger.info(f"   {pid[:8]}... (score: {score:.3f})")
    
    logger.info("")
    logger.info("="*60)
    logger.info("🎉 Training complete!")
    logger.info("="*60)
    logger.info("")
    logger.info("Next steps:")
    logger.info("1. Restart ML service to load new model")
    logger.info("2. Test with: POST /api/collaborative/recommend")
    logger.info("")
    
    collector.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Train collaborative filtering model')
    
    parser.add_argument('--embedding-dim', type=int, default=64,
                        help='Embedding dimension (default: 64)')
    parser.add_argument('--epochs', type=int, default=10,
                        help='Number of training epochs (default: 10)')
    parser.add_argument('--batch-size', type=int, default=512,
                        help='Batch size (default: 512)')
    parser.add_argument('--test-size', type=float, default=0.1,
                        help='Test set size (default: 0.1)')
    parser.add_argument('--negative-ratio', type=int, default=3,
                        help='Negative samples per positive (default: 3)')
    
    args = parser.parse_args()
    
    train_collaborative_filter(
        embedding_dim=args.embedding_dim,
        epochs=args.epochs,
        batch_size=args.batch_size,
        test_size=args.test_size,
        negative_ratio=args.negative_ratio
    )
