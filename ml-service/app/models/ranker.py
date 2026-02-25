"""
Neural Ranking Model
Two-tower architecture for learning user-post engagement prediction
"""

import tensorflow as tf
from tensorflow import keras
from typing import List, Tuple
import numpy as np
import logging

logger = logging.getLogger(__name__)


class NeuralRanker:
    """
    Two-tower neural ranking model for personalized feed ranking
    
    Architecture:
    - User Tower: 512 -> 256 -> 128 -> 64
    - Post Tower: 512 -> 256 -> 128 -> 64
    - Interaction: Concat(64 + 64 + 3 features) -> 64 -> 32 -> 1
    """
    
    def __init__(self, model_path: str = None):
        """Initialize the ranking model"""
        self.model = None
        self.model_path = model_path
        
        if model_path:
            try:
                self.load_model(model_path)
                logger.info(f"✅ Loaded ranking model from {model_path}")
            except Exception as e:
                logger.warning(f"Could not load model: {e}. Building new model.")
                self.build_model()
        else:
            self.build_model()
    
    def build_model(self):
        """Build the two-tower ranking model"""
        # Input layers
        user_input = keras.Input(shape=(512,), name='user_vector')
        post_input = keras.Input(shape=(512,), name='post_vector')
        features_input = keras.Input(shape=(3,), name='features')  # trending, freshness, tag_overlap
        
        # User Tower
        user_tower = keras.layers.Dense(256, activation='relu', name='user_dense_1')(user_input)
        user_tower = keras.layers.Dropout(0.2)(user_tower)
        user_tower = keras.layers.Dense(128, activation='relu', name='user_dense_2')(user_tower)
        user_tower = keras.layers.Dropout(0.2)(user_tower)
        user_embedding = keras.layers.Dense(64, activation='relu', name='user_embedding')(user_tower)
        
        # Post Tower
        post_tower = keras.layers.Dense(256, activation='relu', name='post_dense_1')(post_input)
        post_tower = keras.layers.Dropout(0.2)(post_tower)
        post_tower = keras.layers.Dense(128, activation='relu', name='post_dense_2')(post_tower)
        post_tower = keras.layers.Dropout(0.2)(post_tower)
        post_embedding = keras.layers.Dense(64, activation='relu', name='post_embedding')(post_tower)
        
        # Interaction Layer
        combined = keras.layers.Concatenate(name='concat')([
            user_embedding, 
            post_embedding, 
            features_input
        ])
        
        interaction = keras.layers.Dense(64, activation='relu', name='interaction_1')(combined)
        interaction = keras.layers.Dropout(0.2)(interaction)
        interaction = keras.layers.Dense(32, activation='relu', name='interaction_2')(interaction)
        interaction = keras.layers.Dropout(0.1)(interaction)
        
        # Output: Engagement probability
        output = keras.layers.Dense(1, activation='sigmoid', name='engagement_score')(interaction)
        
        # Build model
        self.model = keras.Model(
            inputs=[user_input, post_input, features_input],
            outputs=output,
            name='neural_ranker'
        )
        
        logger.info("✅ Built neural ranking model")
    
    def compile_model(self, learning_rate: float = 0.001):
        """Compile the model for training"""
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
            loss='binary_crossentropy',
            metrics=[
                'accuracy',
                keras.metrics.AUC(name='auc'),
                keras.metrics.Precision(name='precision'),
                keras.metrics.Recall(name='recall')
            ]
        )
        logger.info("✅ Model compiled")
    
    def train(
        self,
        user_vectors: np.ndarray,
        post_vectors: np.ndarray,
        features: np.ndarray,
        labels: np.ndarray,
        validation_split: float = 0.2,
        epochs: int = 10,
        batch_size: int = 64,
        callbacks: List = None
    ) -> keras.callbacks.History:
        """
        Train the ranking model
        
        Args:
            user_vectors: User embeddings (N, 512)
            post_vectors: Post embeddings (N, 512)
            features: Additional features (N, 3) [trending, freshness, tag_overlap]
            labels: Engagement labels (N, 1) [0 or 1]
            validation_split: Fraction of data for validation
            epochs: Number of training epochs
            batch_size: Batch size
            callbacks: List of Keras callbacks
            
        Returns:
            Training history
        """
        if self.model is None:
            raise ValueError("Model not built. Call build_model() first.")
        
        logger.info(f"Training with {len(labels)} examples...")
        
        # Default callbacks
        if callbacks is None:
            callbacks = [
                keras.callbacks.EarlyStopping(
                    monitor='val_auc',
                    patience=3,
                    restore_best_weights=True,
                    mode='max'
                ),
                keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=2,
                    min_lr=1e-6
                )
            ]
        
        history = self.model.fit(
            [user_vectors, post_vectors, features],
            labels,
            validation_split=validation_split,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        logger.info("✅ Training completed")
        return history
    
    def predict(
        self,
        user_vectors: np.ndarray,
        post_vectors: np.ndarray,
        features: np.ndarray
    ) -> np.ndarray:
        """
        Predict engagement scores for user-post pairs
        
        Args:
            user_vectors: User embeddings (N, 512)
            post_vectors: Post embeddings (N, 512)
            features: Additional features (N, 3)
            
        Returns:
            Engagement scores (N, 1) [0-1]
        """
        if self.model is None:
            raise ValueError("Model not built or loaded")
        
        scores = self.model.predict(
            [user_vectors, post_vectors, features],
            verbose=0
        )
        
        return scores.flatten()
    
    def rank_posts(
        self,
        user_vector: List[float],
        candidate_posts: List[dict],
        limit: int = 20
    ) -> List[Tuple[dict, float]]:
        """
        Rank candidate posts for a user
        
        Args:
            user_vector: User embedding (512D)
            candidate_posts: List of posts with embeddings and metadata
            limit: Number of top posts to return
            
        Returns:
            List of (post, score) tuples, sorted by score descending
        """
        if not candidate_posts:
            return []
        
        # Prepare inputs
        n_posts = len(candidate_posts)
        user_vectors = np.array([user_vector] * n_posts)
        post_vectors = np.array([p['embedding'] for p in candidate_posts])
        features = np.array([self._extract_features(p) for p in candidate_posts])
        
        # Predict scores
        scores = self.predict(user_vectors, post_vectors, features)
        
        # Combine and sort
        ranked = sorted(
            zip(candidate_posts, scores),
            key=lambda x: x[1],
            reverse=True
        )
        
        return ranked[:limit]
    
    def _extract_features(self, post: dict) -> List[float]:
        """
        Extract additional features from post
        
        Features:
        1. Trending score: normalized upvotes + views
        2. Freshness: hours since posted (normalized)
        3. Tag overlap: will be computed during ranking
        
        Returns:
            [trending_score, freshness_score, tag_overlap]
        """
        import datetime
        
        # Trending score (0-1)
        upvotes = post.get('upvotes', 0)
        views = post.get('viewCount', 0)
        trending = min((upvotes * 2 + views) / 1000, 1.0)
        
        # Freshness score (0-1, higher = newer)
        created_at = post.get('createdAt')
        if isinstance(created_at, str):
            created_at = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        elif not isinstance(created_at, datetime.datetime):
            created_at = datetime.datetime.now()
        
        hours_old = (datetime.datetime.now(datetime.timezone.utc) - created_at.replace(tzinfo=datetime.timezone.utc)).total_seconds() / 3600
        freshness = max(0, 1 - hours_old / (7 * 24))  # Decay over 7 days
        
        # Tag overlap (placeholder, will be set during ranking)
        tag_overlap = 0.0
        
        return [trending, freshness, tag_overlap]
    
    def save_model(self, path: str):
        """Save model to disk"""
        if self.model is None:
            raise ValueError("No model to save")
        
        self.model.save(path)
        logger.info(f"✅ Model saved to {path}")
    
    def load_model(self, path: str):
        """Load model from disk"""
        self.model = keras.models.load_model(path)
        logger.info(f"✅ Model loaded from {path}")
    
    def get_summary(self) -> str:
        """Get model architecture summary"""
        if self.model is None:
            return "Model not built"
        
        import io
        stream = io.StringIO()
        self.model.summary(print_fn=lambda x: stream.write(x + '\n'))
        return stream.getvalue()


# Global ranker instance
_global_ranker = None


def get_ranker(model_path: str = 'app/models/ranking_model.h5') -> NeuralRanker:
    """Get or create global ranker instance"""
    global _global_ranker
    
    if _global_ranker is None:
        _global_ranker = NeuralRanker(model_path)
    
    return _global_ranker
