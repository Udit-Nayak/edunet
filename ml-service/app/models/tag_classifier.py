"""
Multi-Label Tag Classifier
Deep learning model for automatic tag suggestion
"""

import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
from typing import List, Dict, Tuple
import logging
import os
import pickle

logger = logging.getLogger(__name__)


class TagClassifier:
    """Multi-label tag classifier using Universal Sentence Encoder"""
    
    def __init__(self, num_tags: int = 50):
        """
        Initialize tag classifier
        
        Args:
            num_tags: Number of tag classes to predict
        """
        self.num_tags = num_tags
        self.model = None
        self.tag_classes = None
        self.encoder = None
        
    def build_model(self, trainable_encoder: bool = False):
        """
        Build the neural network architecture
        
        Architecture:
        - Input: Text (string)
        - Universal Sentence Encoder (512D)
        - Dense(256, ReLU) + Dropout(0.3)
        - Dense(128, ReLU) + Dropout(0.3)
        - Dense(num_tags, Sigmoid) → Multi-label probabilities
        """
        logger.info("Building tag classifier model...")
        
        # Load Universal Sentence Encoder
        self.encoder = hub.KerasLayer(
            "https://tfhub.dev/google/universal-sentence-encoder/4",
            trainable=trainable_encoder
        )
        
        # Build model
        text_input = tf.keras.Input(shape=(), dtype=tf.string, name='text_input')
        
        # Embed text to 512D vector
        embedding = self.encoder(text_input)
        
        # Hidden layers with dropout for regularization
        x = tf.keras.layers.Dense(256, activation='relu', name='dense_256')(embedding)
        x = tf.keras.layers.Dropout(0.3, name='dropout_1')(x)
        
        x = tf.keras.layers.Dense(128, activation='relu', name='dense_128')(x)
        x = tf.keras.layers.Dropout(0.3, name='dropout_2')(x)
        
        # Output layer: sigmoid for multi-label classification
        output = tf.keras.layers.Dense(
            self.num_tags,
            activation='sigmoid',
            name='tag_probabilities'
        )(x)
        
        self.model = tf.keras.Model(inputs=text_input, outputs=output, name='tag_classifier')
        
        logger.info(f"✅ Model built with {self.num_tags} tag classes")
        self.model.summary(print_fn=logger.info)
        
        return self.model
    
    def compile_model(self, learning_rate: float = 0.001):
        """
        Compile model with multi-label loss
        
        Args:
            learning_rate: Learning rate for Adam optimizer
        """
        if self.model is None:
            raise ValueError("Model not built. Call build_model() first.")
        
        # Multi-label classification uses binary crossentropy
        self.model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
            loss='binary_crossentropy',
            metrics=[
                'accuracy',
                tf.keras.metrics.AUC(multi_label=True, name='auc'),
                tf.keras.metrics.Precision(name='precision'),
                tf.keras.metrics.Recall(name='recall')
            ]
        )
        
        logger.info("✅ Model compiled with binary crossentropy loss")
    
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        epochs: int = 10,
        batch_size: int = 32
    ) -> tf.keras.callbacks.History:
        """
        Train the model
        
        Args:
            X_train: Training texts (array of strings)
            y_train: Training labels (n_samples, num_tags) binary matrix
            X_val: Validation texts
            y_val: Validation labels
            epochs: Number of training epochs
            batch_size: Batch size
            
        Returns:
            Training history
        """
        if self.model is None:
            raise ValueError("Model not compiled. Call compile_model() first.")
        
        logger.info(f"Training on {len(X_train)} samples...")
        
        # Callbacks
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_auc',
                patience=3,
                mode='max',
                restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=2,
                min_lr=1e-6
            )
        ]
        
        # Train
        history = self.model.fit(
            X_train,
            y_train,
            validation_data=(X_val, y_val),
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
    
    def predict(self, texts: List[str]) -> np.ndarray:
        """
        Predict tag probabilities for texts
        
        Args:
            texts: List of text strings
            
        Returns:
            Array of shape (n_texts, num_tags) with probabilities
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load() first.")
        
        texts_array = np.array(texts)
        predictions = self.model.predict(texts_array, verbose=0)
        
        return predictions
    
    def suggest_tags(
        self,
        text: str,
        threshold: float = 0.3,
        top_k: int = 5
    ) -> List[Dict[str, any]]:
        """
        Suggest tags for a given text
        
        Args:
            text: Input text (title + content)
            threshold: Minimum confidence threshold
            top_k: Maximum number of tags to return
            
        Returns:
            List of {tag, confidence} dictionaries
        """
        if self.tag_classes is None:
            raise ValueError("Tag classes not loaded. Call load() first.")
        
        # Predict probabilities
        probs = self.predict([text])[0]
        
        # Filter by threshold and get top k
        suggestions = []
        for i, prob in enumerate(probs):
            if prob >= threshold:
                suggestions.append({
                    'tag': self.tag_classes[i],
                    'confidence': float(prob)
                })
        
        # Sort by confidence and take top k
        suggestions = sorted(
            suggestions,
            key=lambda x: x['confidence'],
            reverse=True
        )[:top_k]
        
        return suggestions
    
    def save(self, model_path: str, classes_path: str):
        """
        Save model and tag classes
        
        Args:
            model_path: Path to save model (.h5 or SavedModel format)
            classes_path: Path to save tag classes (.pkl)
        """
        if self.model is None:
            raise ValueError("No model to save")
        
        # Save model
        self.model.save(model_path)
        logger.info(f"✅ Model saved to {model_path}")
        
        # Save tag classes
        with open(classes_path, 'wb') as f:
            pickle.dump(self.tag_classes, f)
        logger.info(f"✅ Tag classes saved to {classes_path}")
    
    def load(self, model_path: str, classes_path: str):
        """
        Load trained model and tag classes
        
        Args:
            model_path: Path to saved model
            classes_path: Path to saved tag classes
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")
        
        if not os.path.exists(classes_path):
            raise FileNotFoundError(f"Tag classes not found: {classes_path}")
        
        # Load model
        self.model = tf.keras.models.load_model(
            model_path,
            custom_objects={'KerasLayer': hub.KerasLayer}
        )
        logger.info(f"✅ Model loaded from {model_path}")
        
        # Load tag classes
        with open(classes_path, 'rb') as f:
            self.tag_classes = pickle.load(f)
        
        self.num_tags = len(self.tag_classes)
        logger.info(f"✅ Tag classes loaded: {self.num_tags} tags")
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """
        Evaluate model on test set
        
        Args:
            X_test: Test texts
            y_test: Test labels
            
        Returns:
            Dictionary of metrics
        """
        if self.model is None:
            raise ValueError("Model not loaded")
        
        results = self.model.evaluate(X_test, y_test, verbose=0)
        
        metrics = {}
        for i, name in enumerate(self.model.metrics_names):
            metrics[name] = float(results[i])
        
        return metrics


def get_tag_classifier() -> TagClassifier:
    """
    Get or initialize tag classifier singleton
    """
    return TagClassifier()
