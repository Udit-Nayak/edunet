import argparse
import sys
import os
from datetime import datetime
from pathlib import Path
import pickle
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

"""
Phase 9: Model Retraining Pipeline
Retrain ranking model with new interaction data (transfer learning)
"""

class ModelRetrainer:
    def __init__(self):
        self.model = None
        self.history = None
        
    def load_training_data(self, data_file):
        """Load training data from pickle file"""
        print(f"📂 Loading training data from {data_file}...")
        
        with open(data_file, 'rb') as f:
            data = pickle.load(f)
        
        print(f"✅ Loaded {data['num_examples']} examples")
        print(f"   Positive ratio: {data['labels'].mean() * 100:.1f}%")
        
        return data
    
    def create_ranking_model(self, user_emb_dim, post_emb_dim, 
                            user_feat_dim=3, post_feat_dim=4):
        """
        Create neural ranking model
        
        Architecture:
        - User tower: embedding + features → hidden layers
        - Post tower: embedding + features → hidden layers
        - Interaction: dot product + concat → final layers
        """
        print("🏗️  Building ranking model...")
        
        # User inputs
        user_embedding_input = layers.Input(shape=(user_emb_dim,), name='user_embedding')
        user_features_input = layers.Input(shape=(user_feat_dim,), name='user_features')
        
        # Post inputs
        post_embedding_input = layers.Input(shape=(post_emb_dim,), name='post_embedding')
        post_features_input = layers.Input(shape=(post_feat_dim,), name='post_features')
        
        # User tower
        user_hidden = layers.Concatenate()([user_embedding_input, user_features_input])
        user_hidden = layers.Dense(256, activation='relu', name='user_dense_1')(user_hidden)
        user_hidden = layers.BatchNormalization()(user_hidden)
        user_hidden = layers.Dropout(0.3)(user_hidden)
        user_hidden = layers.Dense(128, activation='relu', name='user_dense_2')(user_hidden)
        user_output = layers.BatchNormalization()(user_hidden)
        
        # Post tower
        post_hidden = layers.Concatenate()([post_embedding_input, post_features_input])
        post_hidden = layers.Dense(256, activation='relu', name='post_dense_1')(post_hidden)
        post_hidden = layers.BatchNormalization()(post_hidden)
        post_hidden = layers.Dropout(0.3)(post_hidden)
        post_hidden = layers.Dense(128, activation='relu', name='post_dense_2')(post_hidden)
        post_output = layers.BatchNormalization()(post_hidden)
        
        # Interaction features
        dot_product = layers.Dot(axes=1, normalize=True, name='cosine_similarity')([user_output, post_output])
        
        # Combine all features
        combined = layers.Concatenate()([user_output, post_output, layers.Reshape((1,))(dot_product)])
        
        # Final layers
        combined = layers.Dense(128, activation='relu')(combined)
        combined = layers.Dropout(0.3)(combined)
        combined = layers.Dense(64, activation='relu')(combined)
        combined = layers.Dropout(0.2)(combined)
        
        # Output
        output = layers.Dense(1, activation='sigmoid', name='ranking_score')(combined)
        
        model = keras.Model(
            inputs=[user_embedding_input, user_features_input, 
                   post_embedding_input, post_features_input],
            outputs=output,
            name='ranking_model'
        )
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', keras.metrics.AUC(name='auc'), 
                    keras.metrics.Precision(name='precision'),
                    keras.metrics.Recall(name='recall')]
        )
        
        print(f"✅ Model created")
        model.summary()
        
        return model
    
    def load_existing_model(self, model_path):
        """Load existing model for transfer learning"""
        print(f"📂 Loading existing model from {model_path}...")
        
        try:
            model = keras.models.load_model(model_path)
            print(f"✅ Loaded existing model")
            return model
        except Exception as e:
            print(f"⚠️  Could not load model: {e}")
            print("   Will train from scratch")
            return None
    
    def retrain_model(self, training_data, existing_model_path=None,
                     epochs=5, batch_size=256, validation_split=0.2,
                     output_dir='./models'):
        """
        Retrain model with new data (transfer learning)
        """
        print("\n🚀 Starting model retraining...")
        
        # Prepare data
        X_user_emb = training_data['user_embeddings']
        X_user_feat = training_data['user_features']
        X_post_emb = training_data['post_embeddings']
        X_post_feat = training_data['post_features']
        y = training_data['labels']
        
        # Split into train/val
        indices = np.arange(len(y))
        train_idx, val_idx = train_test_split(
            indices, test_size=validation_split, 
            stratify=y, random_state=42
        )
        
        X_train = [
            X_user_emb[train_idx],
            X_user_feat[train_idx],
            X_post_emb[train_idx],
            X_post_feat[train_idx]
        ]
        y_train = y[train_idx]
        
        X_val = [
            X_user_emb[val_idx],
            X_user_feat[val_idx],
            X_post_emb[val_idx],
            X_post_feat[val_idx]
        ]
        y_val = y[val_idx]
        
        print(f"\n📊 Data split:")
        print(f"   Training: {len(y_train)} examples")
        print(f"   Validation: {len(y_val)} examples")
        
        # Balance classes with class weights
        pos_weight = len(y_train) / (2 * np.sum(y_train))
        neg_weight = len(y_train) / (2 * (len(y_train) - np.sum(y_train)))
        class_weights = {0: neg_weight, 1: pos_weight}
        
        print(f"   Class weights: pos={pos_weight:.2f}, neg={neg_weight:.2f}")
        
        # Load or create model
        if existing_model_path and os.path.exists(existing_model_path):
            self.model = self.load_existing_model(existing_model_path)
        
        if self.model is None:
            self.model = self.create_ranking_model(
                user_emb_dim=X_user_emb.shape[1],
                post_emb_dim=X_post_emb.shape[1]
            )
        
        # Callbacks
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        checkpoint_path = os.path.join(output_dir, f'ranking_model_{timestamp}_best.h5')
        
        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=3,
                restore_best_weights=True,
                verbose=1
            ),
            ModelCheckpoint(
                checkpoint_path,
                monitor='val_auc',
                mode='max',
                save_best_only=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=2,
                min_lr=0.00001,
                verbose=1
            )
        ]
        
        # Train
        print(f"\n🎓 Training for {epochs} epochs...")
        start_time = datetime.now()
        
        self.history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            class_weight=class_weights,
            callbacks=callbacks,
            verbose=1
        )
        
        training_duration = (datetime.now() - start_time).total_seconds()
        print(f"✅ Training completed in {training_duration:.1f} seconds")
        
        # Evaluate on validation set
        print("\n📊 Evaluating model...")
        val_pred_probs = self.model.predict(X_val)
        val_pred = (val_pred_probs > 0.5).astype(int).flatten()
        
        metrics = {
            'accuracy': accuracy_score(y_val, val_pred),
            'precision': precision_score(y_val, val_pred),
            'recall': recall_score(y_val, val_pred),
            'f1_score': f1_score(y_val, val_pred),
            'auc': roc_auc_score(y_val, val_pred_probs)
        }
        
        print(f"\n📈 Validation Metrics:")
        print(f"   Accuracy:  {metrics['accuracy']:.4f}")
        print(f"   Precision: {metrics['precision']:.4f}")
        print(f"   Recall:    {metrics['recall']:.4f}")
        print(f"   F1 Score:  {metrics['f1_score']:.4f}")
        print(f"   AUC:       {metrics['auc']:.4f}")
        
        # Save final model
        final_model_path = os.path.join(output_dir, f'ranking_model_{timestamp}.h5')
        self.model.save(final_model_path)
        print(f"\n💾 Model saved to: {final_model_path}")
        
        # Save metadata
        metadata = {
            'timestamp': timestamp,
            'model_path': final_model_path,
            'checkpoint_path': checkpoint_path,
            'training_data_batch': training_data.get('batch_id', 'unknown'),
            'num_train_examples': len(y_train),
            'num_val_examples': len(y_val),
            'epochs': epochs,
            'training_duration_seconds': training_duration,
            'metrics': metrics,
            'final_train_loss': float(self.history.history['loss'][-1]),
            'final_val_loss': float(self.history.history['val_loss'][-1])
        }
        
        metadata_path = os.path.join(output_dir, f'ranking_model_{timestamp}_metadata.pkl')
        with open(metadata_path, 'wb') as f:
            pickle.dump(metadata, f)
        
        return {
            'model_path': final_model_path,
            'checkpoint_path': checkpoint_path,
            'metadata_path': metadata_path,
            'metrics': metrics,
            'timestamp': timestamp
        }


def main():
    parser = argparse.ArgumentParser(description='Retrain ranking model with new data')
    parser.add_argument('--data-file', type=str, required=True, help='Training data pickle file')
    parser.add_argument('--existing-model', type=str, default=None, help='Path to existing model (for transfer learning)')
    parser.add_argument('--epochs', type=int, default=5, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=256, help='Training batch size')
    parser.add_argument('--output-dir', type=str, default='./models', help='Output directory')
    
    args = parser.parse_args()
    
    retrainer = ModelRetrainer()
    
    # Load training data
    training_data = retrainer.load_training_data(args.data_file)
    
    # Retrain model
    result = retrainer.retrain_model(
        training_data=training_data,
        existing_model_path=args.existing_model,
        epochs=args.epochs,
        batch_size=args.batch_size,
        output_dir=args.output_dir
    )
    
    print("\n✅ Retraining complete!")
    print(f"   Model: {result['model_path']}")
    print(f"   Metrics: AUC={result['metrics']['auc']:.4f}, F1={result['metrics']['f1_score']:.4f}")


if __name__ == '__main__':
    main()
