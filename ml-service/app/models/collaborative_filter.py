"""
Collaborative Filtering Model
Matrix factorization for implicit feedback recommendation
"""

import tensorflow as tf
import numpy as np
from typing import List, Dict, Tuple
import logging
import os
import pickle

logger = logging.getLogger(__name__)


class CollaborativeFilter:
    """
    Collaborative Filtering using Matrix Factorization
    
    Learns user and post embeddings to predict user-post affinity scores.
    Uses implicit feedback (views, upvotes, saves, comments).
    """
    
    def __init__(self, embedding_dim: int = 64):
        """
        Initialize collaborative filter
        
        Args:
            embedding_dim: Dimension of user and post embeddings
        """
        self.embedding_dim = embedding_dim
        self.model = None
        self.user_id_to_index = {}
        self.index_to_user_id = {}
        self.post_id_to_index = {}
        self.index_to_post_id = {}
        self.num_users = 0
        self.num_posts = 0
    
    def build_model(self, num_users: int, num_posts: int):
        """
        Build matrix factorization model
        
        Args:
            num_users: Number of unique users
            num_posts: Number of unique posts
        """
        self.num_users = num_users
        self.num_posts = num_posts
        
        logger.info(f"Building collaborative filter: {num_users} users, {num_posts} posts")
        
        # User input
        user_input = tf.keras.Input(shape=(1,), dtype=tf.int32, name='user_input')
        
        # Post input
        post_input = tf.keras.Input(shape=(1,), dtype=tf.int32, name='post_input')
        
        # User embedding with L2 regularization
        user_embedding_layer = tf.keras.layers.Embedding(
            input_dim=num_users,
            output_dim=self.embedding_dim,
            embeddings_regularizer=tf.keras.regularizers.l2(1e-6),
            name='user_embedding'
        )
        user_embedding = user_embedding_layer(user_input)
        user_embedding = tf.keras.layers.Flatten()(user_embedding)
        
        # Post embedding with L2 regularization
        post_embedding_layer = tf.keras.layers.Embedding(
            input_dim=num_posts,
            output_dim=self.embedding_dim,
            embeddings_regularizer=tf.keras.regularizers.l2(1e-6),
            name='post_embedding'
        )
        post_embedding = post_embedding_layer(post_input)
        post_embedding = tf.keras.layers.Flatten()(post_embedding)
        
        # Dot product for affinity score
        dot_product = tf.keras.layers.Dot(axes=1, name='dot_product')([user_embedding, post_embedding])
        
        # Sigmoid to get probability
        output = tf.keras.layers.Activation('sigmoid', name='affinity_score')(dot_product)
        
        self.model = tf.keras.Model(
            inputs=[user_input, post_input],
            outputs=output,
            name='collaborative_filter'
        )
        
        logger.info("✅ Collaborative filter model built")
        self.model.summary(print_fn=logger.info)
    
    def compile_model(self, learning_rate: float = 0.001):
        """
        Compile model with loss and optimizer
        
        Args:
            learning_rate: Learning rate for Adam optimizer
        """
        if self.model is None:
            raise ValueError("Model not built. Call build_model() first.")
        
        self.model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
            loss='binary_crossentropy',
            metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
        )
        
        logger.info("✅ Model compiled")
    
    def prepare_id_mappings(self, user_ids: List[str], post_ids: List[str]):
        """
        Create mappings between string IDs and integer indices
        
        Args:
            user_ids: List of unique user IDs
            post_ids: List of unique post IDs
        """
        # User mappings
        self.user_id_to_index = {uid: idx for idx, uid in enumerate(user_ids)}
        self.index_to_user_id = {idx: uid for uid, idx in self.user_id_to_index.items()}
        
        # Post mappings
        self.post_id_to_index = {pid: idx for idx, pid in enumerate(post_ids)}
        self.index_to_post_id = {idx: pid for pid, idx in self.post_id_to_index.items()}
        
        logger.info(f"✅ ID mappings created: {len(user_ids)} users, {len(post_ids)} posts")
    
    def train(
        self,
        user_indices: np.ndarray,
        post_indices: np.ndarray,
        labels: np.ndarray,
        validation_split: float = 0.1,
        epochs: int = 10,
        batch_size: int = 512
    ) -> tf.keras.callbacks.History:
        """
        Train the model
        
        Args:
            user_indices: Array of user indices
            post_indices: Array of post indices
            labels: Array of interaction labels (1 for positive, 0 for negative)
            validation_split: Proportion for validation
            epochs: Number of epochs
            batch_size: Batch size
            
        Returns:
            Training history
        """
        if self.model is None:
            raise ValueError("Model not compiled. Call compile_model() first.")
        
        logger.info(f"Training on {len(user_indices)} interactions...")
        logger.info(f"   Positive samples: {labels.sum()}")
        logger.info(f"   Negative samples: {len(labels) - labels.sum()}")
        
        # Callbacks
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_auc',
                patience=3,
                mode='max',
                restore_best_weights=True,
                verbose=1
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=2,
                min_lr=1e-6,
                verbose=1
            )
        ]
        
        # Train
        history = self.model.fit(
            [user_indices, post_indices],
            labels,
            validation_split=validation_split,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        # Log final metrics
        final_auc = history.history['val_auc'][-1]
        final_loss = history.history['val_loss'][-1]
        logger.info(f"✅ Training complete - Val AUC: {final_auc:.4f}, Val Loss: {final_loss:.4f}")
        
        return history
    
    def predict_affinity(
        self,
        user_id: str,
        post_ids: List[str]
    ) -> List[Tuple[str, float]]:
        """
        Predict affinity scores for user-post pairs
        
        Args:
            user_id: User ID
            post_ids: List of post IDs
            
        Returns:
            List of (post_id, score) tuples sorted by score descending
        """
        if self.model is None:
            raise ValueError("Model not loaded")
        
        # Check if user exists
        if user_id not in self.user_id_to_index:
            logger.warning(f"User {user_id} not in training data")
            return []
        
        user_idx = self.user_id_to_index[user_id]
        
        # Filter posts that exist in training data
        valid_pairs = []
        for post_id in post_ids:
            if post_id in self.post_id_to_index:
                post_idx = self.post_id_to_index[post_id]
                valid_pairs.append((post_id, post_idx))
        
        if not valid_pairs:
            return []
        
        # Prepare inputs
        post_ids_list = [p[0] for p in valid_pairs]
        post_indices = np.array([p[1] for p in valid_pairs])
        user_indices = np.full(len(post_indices), user_idx)
        
        # Predict
        scores = self.model.predict(
            [user_indices, post_indices],
            verbose=0
        ).flatten()
        
        # Sort by score
        results = sorted(
            zip(post_ids_list, scores),
            key=lambda x: x[1],
            reverse=True
        )
        
        return results
    
    def get_user_embedding(self, user_id: str) -> np.ndarray:
        """
        Get embedding vector for a user
        
        Args:
            user_id: User ID
            
        Returns:
            Embedding vector
        """
        if user_id not in self.user_id_to_index:
            return None
        
        user_idx = self.user_id_to_index[user_id]
        embedding_layer = self.model.get_layer('user_embedding')
        embedding = embedding_layer.embeddings.numpy()[user_idx]
        
        return embedding
    
    def find_similar_users(
        self,
        user_id: str,
        top_k: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Find users with similar taste
        
        Args:
            user_id: User ID
            top_k: Number of similar users to return
            
        Returns:
            List of (user_id, similarity_score) tuples
        """
        user_embedding = self.get_user_embedding(user_id)
        if user_embedding is None:
            return []
        
        # Get all user embeddings
        embedding_layer = self.model.get_layer('user_embedding')
        all_embeddings = embedding_layer.embeddings.numpy()
        
        # Compute cosine similarity
        user_embedding_norm = user_embedding / np.linalg.norm(user_embedding)
        all_embeddings_norm = all_embeddings / np.linalg.norm(all_embeddings, axis=1, keepdims=True)
        
        similarities = np.dot(all_embeddings_norm, user_embedding_norm)
        
        # Get top K (excluding self)
        user_idx = self.user_id_to_index[user_id]
        similarities[user_idx] = -1  # Exclude self
        
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        results = [
            (self.index_to_user_id[idx], float(similarities[idx]))
            for idx in top_indices
            if similarities[idx] > 0
        ]
        
        return results
    
    def save(self, model_path: str, mappings_path: str):
        """
        Save model and ID mappings
        
        Args:
            model_path: Path to save model
            mappings_path: Path to save ID mappings
        """
        if self.model is None:
            raise ValueError("No model to save")
        
        # Save model
        self.model.save(model_path)
        logger.info(f"✅ Model saved to {model_path}")
        
        # Save mappings
        mappings = {
            'user_id_to_index': self.user_id_to_index,
            'index_to_user_id': self.index_to_user_id,
            'post_id_to_index': self.post_id_to_index,
            'index_to_post_id': self.index_to_post_id,
            'num_users': self.num_users,
            'num_posts': self.num_posts,
            'embedding_dim': self.embedding_dim
        }
        
        with open(mappings_path, 'wb') as f:
            pickle.dump(mappings, f)
        
        logger.info(f"✅ Mappings saved to {mappings_path}")
    
    def load(self, model_path: str, mappings_path: str):
        """
        Load trained model and ID mappings
        
        Args:
            model_path: Path to saved model
            mappings_path: Path to saved mappings
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")
        
        if not os.path.exists(mappings_path):
            raise FileNotFoundError(f"Mappings not found: {mappings_path}")
        
        # Load model
        self.model = tf.keras.models.load_model(model_path)
        logger.info(f"✅ Model loaded from {model_path}")
        
        # Load mappings
        with open(mappings_path, 'rb') as f:
            mappings = pickle.load(f)
        
        self.user_id_to_index = mappings['user_id_to_index']
        self.index_to_user_id = mappings['index_to_user_id']
        self.post_id_to_index = mappings['post_id_to_index']
        self.index_to_post_id = mappings['index_to_post_id']
        self.num_users = mappings['num_users']
        self.num_posts = mappings['num_posts']
        self.embedding_dim = mappings['embedding_dim']
        
        logger.info(f"✅ Mappings loaded: {self.num_users} users, {self.num_posts} posts")
    
    def evaluate(
        self,
        user_indices: np.ndarray,
        post_indices: np.ndarray,
        labels: np.ndarray
    ) -> Dict[str, float]:
        """
        Evaluate model on test set
        
        Args:
            user_indices: Test user indices
            post_indices: Test post indices
            labels: Test labels
            
        Returns:
            Dictionary of metrics
        """
        if self.model is None:
            raise ValueError("Model not loaded")
        
        results = self.model.evaluate(
            [user_indices, post_indices],
            labels,
            verbose=0
        )
        
        metrics = {}
        for i, name in enumerate(self.model.metrics_names):
            metrics[name] = float(results[i])
        
        return metrics


def get_collaborative_filter() -> CollaborativeFilter:
    """Get or initialize collaborative filter singleton"""
    return CollaborativeFilter()
