import os
import joblib

class PredictionModel:
    def __init__(self):
        model_path = os.getenv('MODEL_PATH', 'ai/model.pkl')
        try:
            self.model = joblib.load(model_path)
        except Exception:
            self.model = None

    def predict(self, features: dict) -> dict:
        if not self.model:
            return {
                'completion_likelihood': 0.0,
                'dropout_risk': 0.0,
                'employment_readiness': 0.0,
                'confidence_score': 0.0,
            }
        feature_vector = [
            features['academic_avg_mark'],
            features['module_completion_pct'],
            features['avg_assessment_score'],
            features['avg_discipline'],
            features['avg_commitment'],
            features['avg_willingness'],
            features['avg_teamwork'],
            features['avg_time_management'],
            features['avg_professional_conduct'],
        ]
        probabilities = self.model.predict_proba([feature_vector])[0]
        return {
            'completion_likelihood': round(probabilities[1] * 100, 2),
            'dropout_risk': round(probabilities[0] * 100, 2),
            'employment_readiness': round(
                (probabilities[1] * 0.6 +
                 features['module_completion_pct'] * 0.4), 2),
            'confidence_score': round(max(probabilities) * 100, 2),
        }
