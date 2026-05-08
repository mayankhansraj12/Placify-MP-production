"""
Placify AI - Model Training Pipeline
Trains Random Forest models for role, tier, and salary prediction.
"""

import os
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, classification_report, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

FEATURE_COLS = [
    "python_score", "java_score", "cpp_score", "javascript_score",
    "ml_skills", "web_dev_score", "dsa_score", "cloud_score",
    "data_analytics_score", "database_score", "aptitude_score",
    "communication_score", "coding_problems_solved", "internships",
    "projects", "certifications", "hackathons", "cgpa",
]


def train_models():
    """Train and persist all ML assets."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "dataset.csv")
    model_dir = os.path.join(base_dir, "models")
    os.makedirs(model_dir, exist_ok=True)

    print("[info] Loading dataset...")
    df = pd.read_csv(data_path)
    print(f"       Shape: {df.shape}")

    role_encoder = LabelEncoder()
    tier_encoder = LabelEncoder()

    df = df.copy()
    df["role_encoded"] = role_encoder.fit_transform(df["role"])
    df["tier_encoded"] = tier_encoder.fit_transform(df["company_tier"])
    train_df, test_df = train_test_split(
        df,
        test_size=0.2,
        random_state=42,
        stratify=df["role"],
    )

    scaler = StandardScaler()
    X_train = scaler.fit_transform(train_df[FEATURE_COLS].values)
    X_test = scaler.transform(test_df[FEATURE_COLS].values)

    y_role_train = train_df["role_encoded"].values
    y_role_test = test_df["role_encoded"].values
    y_tier_train = train_df["tier_encoded"].values
    y_tier_test = test_df["tier_encoded"].values
    y_sal_train = train_df["salary_lpa"].values
    y_sal_test = test_df["salary_lpa"].values

    print("[info] Training role classifier...")
    role_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=1,
    )
    role_model.fit(X_train, y_role_train)
    role_preds = role_model.predict(X_test)
    role_acc = accuracy_score(y_role_test, role_preds)
    print(f"[ok]   Role accuracy: {role_acc:.4f}")
    print(classification_report(y_role_test, role_preds, target_names=role_encoder.classes_, zero_division=0))

    print("[info] Training tier classifier...")
    tier_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=18,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=1,
    )
    tier_model.fit(X_train, y_tier_train)
    tier_preds = tier_model.predict(X_test)
    tier_acc = accuracy_score(y_tier_test, tier_preds)
    print(f"[ok]   Tier accuracy: {tier_acc:.4f}")
    print(classification_report(y_tier_test, tier_preds, target_names=tier_encoder.classes_, zero_division=0))

    print("[info] Training salary regressor...")
    salary_model = RandomForestRegressor(
        n_estimators=200,
        max_depth=20,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=1,
    )
    salary_model.fit(X_train, y_sal_train)
    sal_preds = salary_model.predict(X_test)
    sal_mae = mean_absolute_error(y_sal_test, sal_preds)
    sal_r2 = r2_score(y_sal_test, sal_preds)
    print(f"[ok]   Salary MAE: {sal_mae:.2f} LPA")
    print(f"[ok]   Salary R2: {sal_r2:.4f}")

    print("[info] Top feature importances (role model):")
    importances = role_model.feature_importances_
    indices = np.argsort(importances)[::-1]
    for idx in range(min(10, len(FEATURE_COLS))):
        feature_name = FEATURE_COLS[indices[idx]]
        print(f"       {idx + 1}. {feature_name}: {importances[indices[idx]]:.4f}")

    joblib.dump(role_model, os.path.join(model_dir, "role_model.joblib"))
    joblib.dump(tier_model, os.path.join(model_dir, "tier_model.joblib"))
    joblib.dump(salary_model, os.path.join(model_dir, "salary_model.joblib"))
    joblib.dump(scaler, os.path.join(model_dir, "scaler.joblib"))
    joblib.dump(role_encoder, os.path.join(model_dir, "role_encoder.joblib"))
    joblib.dump(tier_encoder, os.path.join(model_dir, "tier_encoder.joblib"))
    joblib.dump(FEATURE_COLS, os.path.join(model_dir, "feature_cols.joblib"))
    joblib.dump(
        {
            "version": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
            "feature_cols": FEATURE_COLS,
            "role_accuracy": float(role_acc),
            "tier_accuracy": float(tier_acc),
            "salary_mae": float(sal_mae),
            "salary_r2": float(sal_r2),
        },
        os.path.join(model_dir, "metadata.joblib"),
    )

    print(f"[ok] All models saved to {model_dir}")
    print("=" * 60)
    print(f"Role Accuracy:  {role_acc:.2%}")
    print(f"Tier Accuracy:  {tier_acc:.2%}")
    print(f"Salary MAE:     INR {sal_mae:.2f} LPA")
    print(f"Salary R2:      {sal_r2:.4f}")
    print("=" * 60)


if __name__ == "__main__":
    train_models()
