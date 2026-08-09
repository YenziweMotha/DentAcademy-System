import os
import joblib

class PredictionModel:
    def __init__(self):
        env_path = os.getenv('MODEL_PATH', 'ai/models/model.pkl')
        candidate_paths = [
            env_path,
            'ai/models/model.pkl',
            'ai/model.pkl',
            os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', 'model.pkl'),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model.pkl'),
        ]

        self.model = None
        for path in candidate_paths:
            if os.path.exists(path):
                try:
                    self.model = joblib.load(path)
                    break
                except Exception:
                    continue

    def _rule_based_predict(self, features: dict) -> dict:
        module_pct = features.get('module_completion_pct') or 0
        eval_avg = 0
        eval_count = 0
        for key in ['avg_discipline', 'avg_commitment', 'avg_willingness',
                    'avg_teamwork', 'avg_time_management', 'avg_professional_conduct']:
            v = features.get(key)
            if v is not None:
                eval_avg += v
                eval_count += 1
        eval_score = (eval_avg / eval_count * 20) if eval_count > 0 else 0

        academic = features.get('academic_avg_mark') or 0
        assessment = features.get('avg_assessment_score') or 0

        completion = round(
            0.35 * module_pct +
            0.30 * eval_score +
            0.20 * academic +
            0.15 * assessment,
            2
        )
        completion = max(0, min(100, completion))

        dropout = round(100 - completion, 2)
        dropout = max(0, min(100, dropout))

        employment = round(completion * 0.75 + 10, 2)
        employment = max(0, min(100, employment))

        confidence = round(80.0 + (abs(completion - 50) / 50) * 15, 2)
        confidence = max(65, min(98, confidence))

        return {
            'completion_likelihood': completion,
            'dropout_risk': dropout,
            'employment_readiness': employment,
            'confidence_score': confidence,
        }

    def predict(self, features: dict) -> dict:
        if not self.model:
            return self._rule_based_predict(features)

        try:
            feature_vector = [
                features.get('academic_avg_mark') or 0,
                features.get('module_completion_pct') or 0,
                features.get('avg_assessment_score') or 0,
                features.get('avg_discipline') or 0,
                features.get('avg_commitment') or 0,
                features.get('avg_willingness') or 0,
                features.get('avg_teamwork') or 0,
                features.get('avg_time_management') or 0,
                features.get('avg_professional_conduct') or 0,
            ]
            probabilities = self.model.predict_proba([feature_vector])[0]
            return {
                'completion_likelihood': round(probabilities[1] * 100, 2),
                'dropout_risk': round(probabilities[0] * 100, 2),
                'employment_readiness': round(
                    (probabilities[1] * 0.6 +
                     (features.get('module_completion_pct') or 0) * 0.4), 2),
                'confidence_score': round(max(probabilities) * 100, 2),
            }
        except Exception:
            return self._rule_based_predict(features)
