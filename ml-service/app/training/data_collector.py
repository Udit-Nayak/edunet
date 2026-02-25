"""
Training Data Collector for Neural Ranking Model
Collects positive and negative examples from user interactions
"""

from pymongo import MongoClient
from datetime import datetime, timedelta
import numpy as np
from typing import List, Dict, Tuple
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class TrainingDataCollector:
    """Collect training data from user interactions"""
    
    def __init__(self, mongodb_uri: str = None):
        """Initialize MongoDB connection"""
        uri = mongodb_uri or settings.MONGODB_URI
        self.client = MongoClient(uri)
        
        # Use the database name from the connection string (default to 'test')
        # Extract database name from URI or use default
        if '/test?' in uri or uri.endswith('/test'):
            self.db = self.client.test
        elif '/edunet?' in uri or uri.endswith('/edunet'):
            self.db = self.client.edunet
        else:
            # Default to test database
            self.db = self.client.test
        
        self.users = self.db.users
        self.posts = self.db.posts
        self.interactions = self.db.interactions
        
        logger.info("✅ Connected to MongoDB for training data collection")
    
    def collect_training_data(
        self,
        days: int = 30,
        min_interactions: int = 3,
        negative_ratio: float = 2.0
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Collect training data from user interactions
        
        Args:
            days: Number of days of history to include
            min_interactions: Minimum interactions per user
            negative_ratio: Ratio of negative to positive examples
            
        Returns:
            Tuple of (user_vectors, post_vectors, features, labels)
        """
        logger.info(f"Collecting training data from last {days} days...")
        
        # Get active users with ML profiles
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Find users with embeddings (removed upvotedPosts requirement)
        active_users = list(self.users.find({
            'mlProfile.embedding': {'$exists': True, '$ne': None}
        }))
        
        logger.info(f"Found {len(active_users)} active users")
        
        user_vectors = []
        post_vectors = []
        features_list = []
        labels = []
        
        for user in active_users:
            # Get positive examples (engaged posts)
            positive_examples = self._get_positive_examples(user)
            
            # Get negative examples (shown but not engaged)
            negative_examples = self._get_negative_examples(
                user,
                positive_examples,
                ratio=negative_ratio
            )
            
            # Process positive examples
            for post_data in positive_examples:
                if post_data and post_data.get('embedding'):
                    user_vectors.append(user['mlProfile']['embedding'])
                    post_vectors.append(post_data['embedding'])
                    features_list.append(self._extract_features(post_data, user))
                    labels.append(1)  # Positive
            
            # Process negative examples
            for post_data in negative_examples:
                if post_data and post_data.get('embedding'):
                    user_vectors.append(user['mlProfile']['embedding'])
                    post_vectors.append(post_data['embedding'])
                    features_list.append(self._extract_features(post_data, user))
                    labels.append(0)  # Negative
        
        # Convert to numpy arrays
        user_vectors_np = np.array(user_vectors, dtype=np.float32)
        post_vectors_np = np.array(post_vectors, dtype=np.float32)
        features_np = np.array(features_list, dtype=np.float32)
        labels_np = np.array(labels, dtype=np.float32)
        
        logger.info(f"✅ Collected {len(labels)} training examples")
        logger.info(f"   Positive: {sum(labels)}, Negative: {len(labels) - sum(labels)}")
        
        return user_vectors_np, post_vectors_np, features_np, labels_np
    
    def _get_positive_examples(self, user: dict) -> List[dict]:
        """
        Get posts the user engaged with (upvoted, saved, or commented)
        Uses the Interaction model as source of truth
        """
        positive_posts = []
        
        # Query interactions collection for positive actions
        positive_interactions = self.interactions.find({
            'userId': user['_id'],
            'action': {'$in': ['upvote', 'save', 'comment', 'answer']},
            'label': 1  # Positive label
        })
        
        positive_post_ids = list(set([
            interaction['postId'] 
            for interaction in positive_interactions
        ]))
        
        # Fetch posts with embeddings
        posts = self.posts.find({
            '_id': {'$in': positive_post_ids},
            'mlMetadata.embedding': {'$exists': True, '$ne': None}
        })
        
        for post in posts:
            positive_posts.append({
                'embedding': post['mlMetadata']['embedding'],
                'upvotes': post.get('upvotes', 0),
                'viewCount': post.get('viewCount', 0),
                'createdAt': post.get('createdAt'),
                'tags': post.get('tags', [])
            })
        
        return positive_posts
    
    def _get_negative_examples(
        self,
        user: dict,
        positive_examples: List[dict],
        ratio: float = 2.0
    ) -> List[dict]:
        """
        Get posts user viewed but didn't engage with
        Uses the Interaction model as source of truth
        """
        # Get all view interactions with label=0 (negative)
        negative_interactions = self.interactions.find({
            'userId': user['_id'],
            'action': 'view',
            'label': 0  # Negative label
        })
        
        negative_post_ids = [
            interaction['postId'] 
            for interaction in negative_interactions
        ]
        
        # Limit by ratio
        n_negatives = min(
            len(negative_post_ids),
            int(len(positive_examples) * ratio)
        )
        
        if n_negatives == 0:
            # If no viewed posts, sample random posts from user's interest tags
            return self._sample_random_negatives(user, int(len(positive_examples) * ratio))
        
        # Sample random negatives
        import random
        sampled_ids = random.sample(negative_post_ids, n_negatives)
        
        # Fetch posts with embeddings
        negative_posts = []
        posts = self.posts.find({
            '_id': {'$in': sampled_ids},
            'mlMetadata.embedding': {'$exists': True, '$ne': None}
        })
        
        for post in posts:
            negative_posts.append({
                'embedding': post['mlMetadata']['embedding'],
                'upvotes': post.get('upvotes', 0),
                'viewCount': post.get('viewCount', 0),
                'createdAt': post.get('createdAt'),
                'tags': post.get('tags', [])
            })
        
        return negative_posts
    
    def _sample_random_negatives(self, user: dict, count: int) -> List[dict]:
        """Sample random posts as negatives"""
        interests = user.get('interests', [])
        
        # Get random posts from interest tags
        posts = list(self.posts.aggregate([
            {
                '$match': {
                    'status': 'published',
                    'mlMetadata.embedding': {'$exists': True, '$ne': None},
                    'tags': {'$in': interests} if interests else {'$exists': True}
                }
            },
            {'$sample': {'size': count}}
        ]))
        
        return [{
            'embedding': post['mlMetadata']['embedding'],
            'upvotes': post.get('upvotes', 0),
            'viewCount': post.get('viewCount', 0),
            'createdAt': post.get('createdAt'),
            'tags': post.get('tags', [])
        } for post in posts]
    
    def _extract_features(self, post_data: dict, user: dict) -> List[float]:
        """
        Extract additional features
        
        Returns:
            [trending_score, freshness_score, tag_overlap]
        """
        # Trending score (0-1)
        upvotes = post_data.get('upvotes', 0)
        views = post_data.get('viewCount', 0)
        trending = min((upvotes * 2 + views) / 1000, 1.0)
        
        # Freshness score (0-1)
        created_at = post_data.get('createdAt')
        if created_at:
            if isinstance(created_at, str):
                from dateutil import parser
                created_at = parser.parse(created_at)
            
            hours_old = (datetime.now() - created_at.replace(tzinfo=None)).total_seconds() / 3600
            freshness = max(0, 1 - hours_old / (7 * 24))
        else:
            freshness = 0.5
        
        # Tag overlap
        post_tags = set(post_data.get('tags', []))
        user_interests = set(user.get('interests', []))
        
        if post_tags and user_interests:
            tag_overlap = len(post_tags & user_interests) / len(post_tags | user_interests)
        else:
            tag_overlap = 0.0
        
        return [trending, freshness, tag_overlap]
    
    def get_data_statistics(self) -> dict:
        """Get statistics about available training data"""
        total_users = self.users.count_documents({
            'mlProfile.embedding': {'$exists': True, '$ne': None}
        })
        
        total_interactions = self.interactions.count_documents({})
        
        users_with_interactions = self.users.count_documents({
            'userInteractions.upvotedPosts': {'$exists': True, '$ne': []}
        })
        
        posts_with_embeddings = self.posts.count_documents({
            'mlMetadata.embedding': {'$exists': True, '$ne': None}
        })
        
        return {
            'total_users_with_embeddings': total_users,
            'users_with_interactions': users_with_interactions,
            'total_interactions': total_interactions,
            'posts_with_embeddings': posts_with_embeddings
        }
    
    def close(self):
        """Close MongoDB connection"""
        self.client.close()
        logger.info("MongoDB connection closed")
