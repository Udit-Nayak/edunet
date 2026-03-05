"""
Tag Suggestion Service
Provides tag suggestions using the trained classifier
"""

import os
import logging
from typing import List, Dict
from app.models.tag_classifier import TagClassifier

logger = logging.getLogger(__name__)


class TagService:
    """Service for tag suggestions"""
    
    def __init__(self):
        """Initialize tag service"""
        self.classifier = None
        self.model_loaded = False
        
        # Try to load model on initialization
        self._load_model()
    
    def _load_model(self):
        """Load the trained tag classifier"""
        try:
            # Look for model in models directory
            models_dir = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'models'
            )
            
            model_path = os.path.join(models_dir, 'tag_classifier.h5')
            classes_path = os.path.join(models_dir, 'tag_classes.pkl')
            
            if not os.path.exists(model_path):
                logger.warning(f"Tag classifier model not found at {model_path}")
                logger.warning("Train the model using: python -m app.training.train_tag_classifier")
                return
            
            if not os.path.exists(classes_path):
                logger.warning(f"Tag classes not found at {classes_path}")
                return
            
            # Load classifier
            self.classifier = TagClassifier()
            self.classifier.load(model_path, classes_path)
            
            self.model_loaded = True
            logger.info(f"✅ Tag classifier loaded with {self.classifier.num_tags} tags")
            
        except Exception as e:
            logger.error(f"Error loading tag classifier: {e}")
            self.model_loaded = False
    
    def is_available(self) -> bool:
        """Check if tag classifier is available"""
        return self.model_loaded
    
    def suggest_tags(
        self,
        text: str,
        threshold: float = 0.3,
        top_k: int = 5
    ) -> List[Dict[str, any]]:
        """
        Suggest tags for text
        
        Args:
            text: Input text (title + content)
            threshold: Minimum confidence threshold
            top_k: Maximum number of tags to return
            
        Returns:
            List of {tag, confidence} dictionaries
        """
        if not self.model_loaded:
            raise RuntimeError("Tag classifier not available. Train the model first.")
        
        if not text or not text.strip():
            return []
        
        try:
            suggestions = self.classifier.suggest_tags(
                text=text,
                threshold=threshold,
                top_k=top_k
            )
            
            logger.info(f"Generated {len(suggestions)} tag suggestions")
            return suggestions
            
        except Exception as e:
            logger.error(f"Error suggesting tags: {e}")
            raise
    
    def get_all_tags(self) -> List[str]:
        """
        Get all available tag classes
        
        Returns:
            List of tag names
        """
        if not self.model_loaded:
            return []
        
        return self.classifier.tag_classes
    
    def reload_model(self):
        """Reload the model (useful after retraining)"""
        logger.info("Reloading tag classifier...")
        self._load_model()


# Global service instance
_tag_service = None


def get_tag_service() -> TagService:
    """Get or create tag service singleton"""
    global _tag_service
    
    if _tag_service is None:
        _tag_service = TagService()
    
    return _tag_service
