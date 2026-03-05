"""
Collaborative Filtering Service
Provides collaborative filtering recommendations
"""

import os
import logging
from typing import List, Dict, Tuple
from app.models.collaborative_filter import CollaborativeFilter

logger = logging.getLogger(__name__)


class CollaborativeService:
    """Service for collaborative filtering recommendations"""
    
    def __init__(self):
        """Initialize collaborative service"""
        self.cf = None
        self.model_loaded = False
        
        # Try to load model on initialization
        self._load_model()
    
    def _load_model(self):
        """Load the trained collaborative filter"""
        try:
            # Look for model in models directory
            models_dir = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'models'
            )
            
            model_path = os.path.join(models_dir, 'collaborative_filter.h5')
            mappings_path = os.path.join(models_dir, 'cf_mappings.pkl')
            
            if not os.path.exists(model_path):
                logger.warning(f"Collaborative filter model not found at {model_path}")
                logger.warning("Train the model using: python -m app.training.train_collaborative")
                return
            
            if not os.path.exists(mappings_path):
                logger.warning(f"CF mappings not found at {mappings_path}")
                return
            
            # Load model
            self.cf = CollaborativeFilter()
            self.cf.load(model_path, mappings_path)
            
            self.model_loaded = True
            logger.info(f"✅ Collaborative filter loaded: {self.cf.num_users} users, {self.cf.num_posts} posts")
            
        except Exception as e:
            logger.error(f"Error loading collaborative filter: {e}")
            self.model_loaded = False
    
    def is_available(self) -> bool:
        """Check if collaborative filter is available"""
        return self.model_loaded
    
    def get_recommendations(
        self,
        user_id: str,
        candidate_post_ids: List[str],
        limit: int = 20
    ) -> List[Dict[str, any]]:
        """
        Get collaborative filtering recommendations for user
        
        Args:
            user_id: User ID
            candidate_post_ids: List of candidate post IDs to rank
            limit: Maximum number of recommendations
            
        Returns:
            List of {post_id, score} dictionaries
        """
        if not self.model_loaded:
            raise RuntimeError("Collaborative filter not available. Train the model first.")
        
        if not candidate_post_ids:
            return []
        
        try:
            # Get affinity scores
            results = self.cf.predict_affinity(user_id, candidate_post_ids)
            
            # Format results
            recommendations = [
                {
                    'post_id': post_id,
                    'score': float(score)
                }
                for post_id, score in results[:limit]
            ]
            
            logger.info(f"Generated {len(recommendations)} CF recommendations for user {user_id[:8]}...")
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return []
    
    def get_similar_users(
        self,
        user_id: str,
        top_k: int = 10
    ) -> List[Dict[str, any]]:
        """
        Find users with similar taste
        
        Args:
            user_id: User ID
            top_k: Number of similar users
            
        Returns:
            List of {user_id, similarity} dictionaries
        """
        if not self.model_loaded:
            raise RuntimeError("Collaborative filter not available")
        
        try:
            results = self.cf.find_similar_users(user_id, top_k)
            
            similar_users = [
                {
                    'user_id': uid,
                    'similarity': float(score)
                }
                for uid, score in results
            ]
            
            logger.info(f"Found {len(similar_users)} similar users for {user_id[:8]}...")
            return similar_users
            
        except Exception as e:
            logger.error(f"Error finding similar users: {e}")
            return []
    
    def get_posts_from_similar_users(
        self,
        user_id: str,
        all_post_ids: List[str],
        similar_users_limit: int = 10,
        posts_per_user: int = 5
    ) -> List[str]:
        """
        Get posts that similar users liked
        
        Args:
            user_id: User ID
            all_post_ids: All available post IDs
            similar_users_limit: Number of similar users to consider
            posts_per_user: Number of posts per similar user
            
        Returns:
            List of recommended post IDs
        """
        if not self.model_loaded:
            return []
        
        try:
            # Find similar users
            similar_users = self.get_similar_users(user_id, similar_users_limit)
            
            if not similar_users:
                return []
            
            # Collect posts from similar users
            recommended_posts = []
            
            for similar_user in similar_users:
                similar_user_id = similar_user['user_id']
                
                # Get top posts for this similar user
                user_posts = self.cf.predict_affinity(similar_user_id, all_post_ids)
                
                for post_id, score in user_posts[:posts_per_user]:
                    if post_id not in recommended_posts:
                        recommended_posts.append(post_id)
            
            logger.info(f"Got {len(recommended_posts)} posts from similar users")
            return recommended_posts
            
        except Exception as e:
            logger.error(f"Error getting posts from similar users: {e}")
            return []
    
    def get_model_stats(self) -> Dict[str, any]:
        """
        Get model statistics
        
        Returns:
            Dictionary with model stats
        """
        if not self.model_loaded:
            return {
                'available': False,
                'num_users': 0,
                'num_posts': 0,
                'embedding_dim': 0
            }
        
        return {
            'available': True,
            'num_users': self.cf.num_users,
            'num_posts': self.cf.num_posts,
            'embedding_dim': self.cf.embedding_dim
        }
    
    def reload_model(self):
        """Reload the model (useful after retraining)"""
        logger.info("Reloading collaborative filter...")
        self._load_model()


# Global service instance
_cf_service = None


def get_cf_service() -> CollaborativeService:
    """Get or create collaborative service singleton"""
    global _cf_service
    
    if _cf_service is None:
        _cf_service = CollaborativeService()
    
    return _cf_service
