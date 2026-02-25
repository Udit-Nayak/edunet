"""
Ranking Service using Neural Ranker
Provides intelligent post ranking for personalized feeds
"""

import os
import logging
from typing import List, Dict, Optional
import numpy as np
from datetime import datetime, timezone

from app.models.ranker import NeuralRanker, get_ranker

logger = logging.getLogger(__name__)


class RankingService:
    """Service for ranking posts using neural model"""
    
    def __init__(self, use_neural_ranker: bool = True):
        """
        Initialize ranking service
        
        Args:
            use_neural_ranker: If False, falls back to rule-based scoring
        """
        self.use_neural_ranker = use_neural_ranker
        self.ranker = None
        
        if use_neural_ranker:
            try:
                self.ranker = get_ranker()
                logger.info("✅ Neural ranker initialized")
            except Exception as e:
                logger.warning(f"Could not load neural ranker: {e}")
                logger.warning("Falling back to rule-based scoring")
                self.use_neural_ranker = False
    
    def rank_posts_for_user(
        self,
        user_vector: List[float],
        user_interests: List[str],
        candidate_posts: List[Dict],
        limit: int = 20
    ) -> List[Dict]:
        """
        Rank candidate posts for a user
        
        Args:
            user_vector: User's interest vector (512D)
            user_interests: User's interest tags
            candidate_posts: List of candidate posts with embeddings
            limit: Number of posts to return
            
        Returns:
            List of ranked posts (top N)
        """
        if not candidate_posts:
            return []
        
        if self.use_neural_ranker and self.ranker:
            return self._neural_ranking(
                user_vector,
                user_interests,
                candidate_posts,
                limit
            )
        else:
            return self._rule_based_ranking(
                user_vector,
                user_interests,
                candidate_posts,
                limit
            )
    
    def _neural_ranking(
        self,
        user_vector: List[float],
        user_interests: List[str],
        candidate_posts: List[Dict],
        limit: int
    ) -> List[Dict]:
        """Rank using neural model"""
        
        # Prepare candidate posts with features
        enriched_candidates = []
        for post in candidate_posts:
            # Add tag overlap feature
            post_tags = set(post.get('tags', []))
            user_tags = set(user_interests)
            
            if post_tags and user_tags:
                tag_overlap = len(post_tags & user_tags) / len(post_tags | user_tags)
            else:
                tag_overlap = 0.0
            
            enriched_post = {
                'embedding': post.get('mlMetadata', {}).get('embedding') or post.get('embedding'),
                'upvotes': post.get('upvotes', 0),
                'viewCount': post.get('viewCount', 0),
                'createdAt': post.get('createdAt'),
                'tags': post.get('tags', []),
                'tag_overlap': tag_overlap,
                '_original': post  # Keep original post data
            }
            
            # Only include posts with embeddings
            if enriched_post['embedding']:
                enriched_candidates.append(enriched_post)
        
        if not enriched_candidates:
            logger.warning("No candidates with embeddings for neural ranking")
            return []
        
        # Use ranker to get scores
        try:
            # Prepare inputs
            n_posts = len(enriched_candidates)
            user_vectors = np.array([user_vector] * n_posts)
            post_vectors = np.array([p['embedding'] for p in enriched_candidates])
            features = np.array([
                self._extract_features(p) for p in enriched_candidates
            ])
            
            # Predict scores
            scores = self.ranker.predict(user_vectors, post_vectors, features)
            
            # Combine posts with scores
            ranked = sorted(
                zip(enriched_candidates, scores),
                key=lambda x: x[1],
                reverse=True
            )
            
            # Return original posts with scores
            results = []
            for post_data, score in ranked[:limit]:
                result = post_data['_original'].copy()
                result['neural_score'] = float(score)
                result['ranking_method'] = 'neural'
                results.append(result)
            
            logger.info(f"✅ Neural ranking: {len(results)} posts")
            return results
            
        except Exception as e:
            logger.error(f"Neural ranking failed: {e}")
            logger.warning("Falling back to rule-based ranking")
            return self._rule_based_ranking(
                user_vector,
                user_interests,
                candidate_posts,
                limit
            )
    
    def _rule_based_ranking(
        self,
        user_vector: List[float],
        user_interests: List[str],
        candidate_posts: List[Dict],
        limit: int
    ) -> List[Dict]:
        """
        Fallback rule-based ranking (Phase 4 method)
        Score = 0.7 * similarity + 0.2 * recency + 0.1 * popularity
        """
        scored_posts = []
        
        for post in candidate_posts:
            embedding = post.get('mlMetadata', {}).get('embedding') or post.get('embedding')
            
            if not embedding:
                continue
            
            # Cosine similarity
            similarity = self._cosine_similarity(user_vector, embedding)
            
            # Recency score
            created_at = post.get('createdAt')
            if isinstance(created_at, str):
                from dateutil import parser
                created_at = parser.parse(created_at)
            
            if created_at:
                hours_old = (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
                recency = 1.0 / (1.0 + hours_old / 24.0)  # Decay over days
            else:
                recency = 0.5
            
            # Popularity score
            upvotes = post.get('upvotes', 0)
            popularity = min(upvotes / 100.0, 1.0)
            
            # Combined score
            final_score = 0.7 * similarity + 0.2 * recency + 0.1 * popularity
            
            result = post.copy()
            result['rule_score'] = final_score
            result['ranking_method'] = 'rule_based'
            scored_posts.append((result, final_score))
        
        # Sort by score
        ranked = sorted(scored_posts, key=lambda x: x[1], reverse=True)
        
        logger.info(f"✅ Rule-based ranking: {len(ranked)} posts")
        return [post for post, score in ranked[:limit]]
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Compute cosine similarity between two vectors"""
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        
        dot_product = np.dot(v1, v2)
        norm_product = np.linalg.norm(v1) * np.linalg.norm(v2)
        
        if norm_product == 0:
            return 0.0
        
        return float(dot_product / norm_product)
    
    def _extract_features(self, post: Dict) -> List[float]:
        """
        Extract features for neural model
        
        Returns:
            [trending_score, freshness_score, tag_overlap]
        """
        # Trending score
        upvotes = post.get('upvotes', 0)
        views = post.get('viewCount', 0)
        trending = min((upvotes * 2 + views) / 1000, 1.0)
        
        # Freshness score
        created_at = post.get('createdAt')
        if isinstance(created_at, str):
            from dateutil import parser
            created_at = parser.parse(created_at)
        
        if created_at:
            hours_old = (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
            freshness = max(0, 1 - hours_old / (7 * 24))
        else:
            freshness = 0.5
        
        # Tag overlap (already computed and stored in post)
        tag_overlap = post.get('tag_overlap', 0.0)
        
        return [trending, freshness, tag_overlap]
    
    def is_neural_ranker_available(self) -> bool:
        """Check if neural ranker is available"""
        return self.use_neural_ranker and self.ranker is not None
    
    def switch_to_neural(self) -> bool:
        """Try to switch to neural ranking"""
        try:
            self.ranker = get_ranker()
            self.use_neural_ranker = True
            logger.info("✅ Switched to neural ranking")
            return True
        except Exception as e:
            logger.error(f"Could not switch to neural ranking: {e}")
            return False
    
    def switch_to_rule_based(self):
        """Switch to rule-based ranking"""
        self.use_neural_ranker = False
        logger.info("✅ Switched to rule-based ranking")


# Global ranking service instance
_global_ranking_service = None


def get_ranking_service(use_neural: bool = True) -> RankingService:
    """Get or create global ranking service instance"""
    global _global_ranking_service
    
    if _global_ranking_service is None:
        _global_ranking_service = RankingService(use_neural_ranker=use_neural)
    
    return _global_ranking_service
