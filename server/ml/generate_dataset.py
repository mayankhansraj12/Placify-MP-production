"""
Placify AI — Synthetic Dataset Generator
Generates ~5000 realistic student placement profiles with correlated features.
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)

NUM_SAMPLES = 5000

ROLES = [
    "Software Developer",
    "Frontend Developer", 
    "Backend Developer",
    "Full-Stack Developer",
    "ML Engineer",
    "Data Analyst",
    "Data Scientist",
    "DevOps Engineer"
]

TIERS = [
    "Startup",
    "Service-Based",
    "Product-Based",
    "Fintech",
    "Top-Tier"
]

# ── Role profiles: mean skill scores for each role ──────────────────────────
ROLE_PROFILES = {
    "Software Developer":  {"python": 65, "java": 70, "cpp": 55, "js": 50, "ml": 20, "web": 45, "dsa": 65, "cloud": 35, "analytics": 25, "db": 60},
    "Frontend Developer":  {"python": 30, "java": 25, "cpp": 15, "js": 85, "ml": 10, "web": 90, "dsa": 40, "cloud": 30, "analytics": 20, "db": 35},
    "Backend Developer":   {"python": 70, "java": 75, "cpp": 50, "js": 45, "ml": 15, "web": 40, "dsa": 60, "cloud": 55, "analytics": 25, "db": 75},
    "Full-Stack Developer":{"python": 60, "java": 55, "cpp": 30, "js": 80, "ml": 15, "web": 85, "dsa": 50, "cloud": 45, "analytics": 20, "db": 65},
    "ML Engineer":         {"python": 85, "java": 35, "cpp": 45, "js": 20, "ml": 90, "web": 15, "dsa": 55, "cloud": 50, "analytics": 65, "db": 45},
    "Data Analyst":        {"python": 60, "java": 20, "cpp": 15, "js": 25, "ml": 40, "web": 15, "dsa": 30, "cloud": 20, "analytics": 90, "db": 70},
    "Data Scientist":      {"python": 80, "java": 25, "cpp": 30, "js": 20, "ml": 85, "web": 10, "dsa": 50, "cloud": 40, "analytics": 85, "db": 55},
    "DevOps Engineer":     {"python": 55, "java": 40, "cpp": 30, "js": 30, "ml": 15, "web": 25, "dsa": 35, "cloud": 90, "analytics": 25, "db": 55},
}

# ── Tier salary ranges (LPA) and typical skill multiplier ───────────────────
TIER_CONFIG = {
    "Startup":       {"salary_range": (2.5, 8),   "skill_threshold": 30, "stock_pct": 0.05},
    "Service-Based": {"salary_range": (3.0, 7),   "skill_threshold": 40, "stock_pct": 0.02},
    "Product-Based": {"salary_range": (8, 25),     "skill_threshold": 55, "stock_pct": 0.08},
    "Fintech":       {"salary_range": (10, 35),    "skill_threshold": 60, "stock_pct": 0.12},
    "Top-Tier":      {"salary_range": (20, 60),    "skill_threshold": 75, "stock_pct": 0.20},
}


def clamp(val, lo=0, hi=100):
    return max(lo, min(hi, val))


def generate_samples():
    records = []

    for _ in range(NUM_SAMPLES):
        # Pick a role weighted towards common ones
        role_weights = [0.18, 0.10, 0.12, 0.12, 0.12, 0.12, 0.10, 0.14]
        role = np.random.choice(ROLES, p=role_weights)
        profile = ROLE_PROFILES[role]

        # Generate skill scores with noise around role profile means
        noise_std = 18
        python_score     = clamp(np.random.normal(profile["python"], noise_std))
        java_score       = clamp(np.random.normal(profile["java"], noise_std))
        cpp_score        = clamp(np.random.normal(profile["cpp"], noise_std))
        javascript_score = clamp(np.random.normal(profile["js"], noise_std))
        ml_skills        = clamp(np.random.normal(profile["ml"], noise_std))
        web_dev_score    = clamp(np.random.normal(profile["web"], noise_std))
        dsa_score        = clamp(np.random.normal(profile["dsa"], noise_std))
        cloud_score      = clamp(np.random.normal(profile["cloud"], noise_std))
        data_analytics   = clamp(np.random.normal(profile["analytics"], noise_std))
        database_score   = clamp(np.random.normal(profile["db"], noise_std))

        # Average skill level determines tier
        avg_skill = np.mean([
            python_score, java_score, cpp_score, javascript_score,
            ml_skills, web_dev_score, dsa_score, cloud_score,
            data_analytics, database_score
        ])

        # Meta features correlated with skill level
        aptitude_score = clamp(np.random.normal(avg_skill * 0.9 + 10, 12))
        communication  = clamp(np.random.normal(1 + avg_skill / 25, 0.6), 1, 5)
        communication  = round(communication * 2) / 2  # Round to nearest 0.5

        coding_problems = int(clamp(np.random.normal(avg_skill * 6 + np.random.normal(0, 30), 100), 0, 1000))
        internships     = int(clamp(np.random.normal(avg_skill / 25, 0.8), 0, 5))
        projects        = int(clamp(np.random.normal(avg_skill / 10 + 1, 2.5), 0, 15))
        certifications  = int(clamp(np.random.normal(avg_skill / 15, 1.5), 0, 10))
        hackathons      = int(clamp(np.random.normal(avg_skill / 20, 1.2), 0, 10))
        cgpa            = clamp(np.random.normal(5.5 + avg_skill / 22, 0.7), 4.0, 10.0)
        cgpa            = round(cgpa, 2)

        # Determine company tier based on overall strength
        # Weights: Skills (50%), Leetcode (20%), Aptitude (10%), English (10%), CGPA (10%)
        overall_strength = (
            avg_skill * 0.50 + 
            min(coding_problems / 5.0, 100) * 0.20 +
            aptitude_score * 0.10 + 
            (communication * 20) * 0.10 + 
            (cgpa * 10) * 0.10
        )

        # Deterministic Tier rules
        if overall_strength >= 72 or (coding_problems >= 500 and dsa_score >= 80):
            tier = "Top-Tier"
        elif overall_strength >= 62:
            tier = "Fintech" if dsa_score >= 65 else "Product-Based"
        elif overall_strength >= 48:
            tier = "Product-Based" if (web_dev_score >= 60 or javascript_score >= 60) else "Service-Based"
        elif overall_strength >= 35:
            tier = "Service-Based" if communication >= 3.5 else "Startup"
        else:
            tier = "Startup"

        # Calculate salary based on tier and skills
        tier_cfg = TIER_CONFIG[tier]
        lo, hi = tier_cfg["salary_range"]
        skill_factor = (overall_strength - 20) / 80  # normalize 0-1
        salary = lo + (hi - lo) * clamp(skill_factor + np.random.normal(0, 0.1), 0, 1)
        salary = round(salary, 2)

        records.append({
            "python_score": round(python_score, 1),
            "java_score": round(java_score, 1),
            "cpp_score": round(cpp_score, 1),
            "javascript_score": round(javascript_score, 1),
            "ml_skills": round(ml_skills, 1),
            "web_dev_score": round(web_dev_score, 1),
            "dsa_score": round(dsa_score, 1),
            "cloud_score": round(cloud_score, 1),
            "data_analytics_score": round(data_analytics, 1),
            "database_score": round(database_score, 1),
            "aptitude_score": round(aptitude_score, 1),
            "communication_score": communication,
            "coding_problems_solved": coding_problems,
            "internships": internships,
            "projects": projects,
            "certifications": certifications,
            "hackathons": hackathons,
            "cgpa": cgpa,
            "role": role,
            "company_tier": tier,
            "salary_lpa": salary,
        })

    return pd.DataFrame(records)


if __name__ == "__main__":
    print("🔄 Generating synthetic dataset with 5000 samples...")
    df = generate_samples()

    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, "dataset.csv")
    df.to_csv(output_path, index=False)

    print(f"✅ Dataset saved to {output_path}")
    print(f"\n📊 Dataset shape: {df.shape}")
    print(f"\n📈 Role distribution:\n{df['role'].value_counts()}")
    print(f"\n🏢 Tier distribution:\n{df['company_tier'].value_counts()}")
    print(f"\n💰 Salary stats:\n{df['salary_lpa'].describe()}")
