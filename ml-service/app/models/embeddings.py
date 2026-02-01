import tensorflow as tf
import tensorflow_hub as hub
# import tensorflow_text

import numpy as np
from app.config import settings

class EmbeddingModel:
    def __init__(self):
        print("Loading Universal Sentence Encoder...")
        self.model=hub.load(settings.EMBEDDING_MODEL_URL)
        print("Model loaded successfully.")

    def encode(self, test:list)-> np.ndarray:
        embeddings=self.model(test)
        return embeddings.numpy()
    
    def encode_single(self, text:str)->list:
        embedding=self.model([text])[0]
        return embedding.numpy().tolist()

embedding_model=EmbeddingModel()