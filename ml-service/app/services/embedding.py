"""
Embedding Service using TensorFlow Hub
Universal Sentence Encoder for generating semantic embeddings
"""

import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
from typing import List
import logging

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        """Initialize the Universal Sentence Encoder model"""
        logger.info("Loading Universal Sentence Encoder model...")
        
        # Load pre-trained encoder
        # This will download ~1GB on first run, then cache locally
        self.encoder = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
        
        logger.info("✅ Model loaded successfully")
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate 512-dimensional embedding for a single text
        
        Args:
            text: Input text string
            
        Returns:
            List of 512 floats representing the embedding
        """
        try:
            # Clean text
            text = text.strip()
            if not text:
                raise ValueError("Empty text provided")
            
            # Generate embedding
            embedding = self.encoder([text])[0].numpy()
            
            # Convert to list for JSON serialization
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"Embedding generation error: {str(e)}")
            raise
    
    def generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batch (more efficient)
        
        Args:
            texts: List of text strings
            
        Returns:
            List of embeddings, each being a list of 512 floats
        """
        try:
            # Clean texts
            cleaned_texts = [text.strip() for text in texts if text.strip()]
            
            if not cleaned_texts:
                raise ValueError("No valid texts provided")
            
            # Batch generate embeddings
            embeddings = self.encoder(cleaned_texts).numpy()
            
            # Convert to list of lists
            return [emb.tolist() for emb in embeddings]
            
        except Exception as e:
            logger.error(f"Batch embedding generation error: {str(e)}")
            raise
    
    def compute_user_vector(
        self,
        viewed_posts: List[dict],
        upvoted_posts: List[dict],
        saved_posts: List[dict]
    ) -> List[float]:
        """
        Compute user interest vector from interaction history
        Uses TensorFlow for GPU-accelerated weighted averaging
        
        Args:
            viewed_posts: List of posts user viewed (with embeddings)
            upvoted_posts: List of posts user upvoted (with embeddings)
            saved_posts: List of posts user saved (with embeddings)
            
        Returns:
            512-dimensional user vector
        """
        try:
            embeddings = []
            weights = []
            
            # Collect embeddings with weights
            # View = 0.3, Upvote = 0.7, Save = 1.0
            
            for post in viewed_posts:
                if 'embedding' in post and post['embedding']:
                    embeddings.append(post['embedding'])
                    weights.append(0.3)
            
            for post in upvoted_posts:
                if 'embedding' in post and post['embedding']:
                    embeddings.append(post['embedding'])
                    weights.append(0.7)
            
            for post in saved_posts:
                if 'embedding' in post and post['embedding']:
                    embeddings.append(post['embedding'])
                    weights.append(1.0)
            
            if not embeddings:
                # Return zero vector if no interactions
                return [0.0] * 512
            
            # Convert to TensorFlow tensors
            embeddings_tensor = tf.constant(embeddings, dtype=tf.float32)
            weights_tensor = tf.constant(weights, dtype=tf.float32)
            
            # Normalize weights to sum to 1
            weights_normalized = weights_tensor / tf.reduce_sum(weights_tensor)
            
            # Weighted average (GPU-accelerated)
            user_vector = tf.reduce_sum(
                embeddings_tensor * weights_normalized[:, tf.newaxis],
                axis=0
            )
            
            return user_vector.numpy().tolist()
            
        except Exception as e:
            logger.error(f"User vector computation error: {str(e)}")
            raise
    
    def update_user_vector_online(
        self,
        current_vector: List[float],
        new_post_embedding: List[float],
        interaction_weight: float,
        alpha: float = 0.1
    ) -> List[float]:
        """
        Update user vector with new interaction using exponential moving average
        This allows real-time vector updates without recomputing from scratch
        
        Args:
            current_vector: Current user vector (512D)
            new_post_embedding: Embedding of newly interacted post (512D)
            interaction_weight: Weight of interaction (0.3 for view, 0.7 for upvote, 1.0 for save)
            alpha: Learning rate (default 0.1)
            
        Returns:
            Updated user vector (512D)
        """
        try:
            # Convert to TensorFlow tensors
            current = tf.constant(current_vector, dtype=tf.float32)
            new_emb = tf.constant(new_post_embedding, dtype=tf.float32)
            
            # Exponential moving average
            # new_vector = (1 - alpha) * current + alpha * weight * new_embedding
            updated_vector = (
                (1 - alpha) * current + 
                alpha * interaction_weight * new_emb
            )
            
            return updated_vector.numpy().tolist()
            
        except Exception as e:
            logger.error(f"User vector update error: {str(e)}")
            raise
    
    def compute_similarity(
        self,
        embedding1: List[float],
        embedding2: List[float]
    ) -> float:
        """
        Compute cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding (512D)
            embedding2: Second embedding (512D)
            
        Returns:
            Similarity score between -1 and 1
        """
        try:
            # Convert to TensorFlow tensors
            emb1 = tf.constant(embedding1, dtype=tf.float32)
            emb2 = tf.constant(embedding2, dtype=tf.float32)
            
            # Cosine similarity
            similarity = tf.reduce_sum(emb1 * emb2) / (
                tf.norm(emb1) * tf.norm(emb2)
            )
            
            return float(similarity.numpy())
            
        except Exception as e:
            logger.error(f"Similarity computation error: {str(e)}")
            raise
    
    def compute_batch_similarity(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[List[float]]
    ) -> List[float]:
        """
        Compute similarity between one query and multiple candidates
        More efficient than computing one by one
        
        Args:
            query_embedding: Query embedding (512D)
            candidate_embeddings: List of candidate embeddings
            
        Returns:
            List of similarity scores
        """
        try:
            # Convert to TensorFlow tensors
            query = tf.constant(query_embedding, dtype=tf.float32)
            candidates = tf.constant(candidate_embeddings, dtype=tf.float32)
            
            # Normalize query
            query_norm = query / tf.norm(query)
            
            # Normalize candidates
            candidates_norm = candidates / tf.norm(candidates, axis=1, keepdims=True)
            
            # Batch cosine similarity
            similarities = tf.matmul(candidates_norm, query_norm[:, tf.newaxis])
            
            return similarities.numpy().flatten().tolist()
            
        except Exception as e:
            logger.error(f"Batch similarity computation error: {str(e)}")
            raise
    
    def get_cold_start_vector(self, interest_tags: List[str]) -> List[float]:
        """
        Generate initial user vector for new users based on their selected interests
        Simple version: creates embedding from tag text
        
        Args:
            interest_tags: List of tags the user is interested in
            
        Returns:
            512-dimensional user vector
        """
        try:
            if not interest_tags:
                # Return zero vector for users with no interests
                return [0.0] * 512
            
            # Create text from tags
            interests_text = " ".join(interest_tags)
            
            # Generate embedding
            vector = self.generate_embedding(interests_text)
            
            return vector
            
        except Exception as e:
            logger.error(f"Cold start vector generation error: {str(e)}")
            raise
    
    def compute_cold_start_from_posts(
        self,
        top_posts_embeddings: List[List[float]]
    ) -> List[float]:
        """
        Generate cold start vector by averaging top posts in user's interest tags
        More accurate than just using tag text
        
        Args:
            top_posts_embeddings: List of embeddings from top posts in interest tags
            
        Returns:
            512-dimensional user vector
        """
        try:
            if not top_posts_embeddings or len(top_posts_embeddings) == 0:
                # Return zero vector if no posts
                return [0.0] * 512
            
            # Convert to TensorFlow tensor
            embeddings_tensor = tf.constant(top_posts_embeddings, dtype=tf.float32)
            
            # Simple average of top posts
            cold_start_vector = tf.reduce_mean(embeddings_tensor, axis=0)
            
            return cold_start_vector.numpy().tolist()
            
        except Exception as e:
            logger.error(f"Cold start from posts error: {str(e)}")
            raise