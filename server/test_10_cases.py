import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ml.predictor import predict, load_models


OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests", "artifacts")


def run():
    load_models()
    
    base_features = {
        "python_score": 75, "java_score": 60, "cpp_score": 50, "javascript_score": 40,
        "ml_skills": 10, "web_dev_score": 50, "dsa_score": 85, "cloud_score": 20,
        "data_analytics_score": 10, "database_score": 60,
        "aptitude_score": 80, "communication_score": 4.0,
        "internships": 1, "projects": 3,
        "certifications": 1, "hackathons": 1, "cgpa": 8.0
    }
    
    results = []
    
    # Testing 10 distinct LeetCode scenarios on the EXACT SAME base profile
    for leetcode_count in [0, 50, 100, 200, 300, 400, 500, 650, 800, 1000]:
        test_case = base_features.copy()
        test_case["coding_problems_solved"] = leetcode_count
        
        try:
            res = predict(test_case)
            
            # Formatting skill gaps nicely
            skill_gaps_summary = [
                f"{g['skill']}: {g['status'].upper()} (Gap: {g['gap']})" 
                for g in res["skill_gaps"] if g["status"] == "weak"
            ]
            
            results.append({
                "LeetCode Problems": leetcode_count,
                "Predicted Tier": res['predicted_tier'],
                "CTC (LPA)": res['salary_range']['expected'],
                "FAANG Probability": f"{res['faang_probability']}%",
                "Weak Skills": skill_gaps_summary,
                "Top Quick Action": res['quick_actions'][0] if res['quick_actions'] else "None"
            })
        except Exception as e:
            results.append({"LeetCode Problems": leetcode_count, "Error": str(e)})

    # Dump to JSON to read cleanly
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, "test_10_results.json")
    with open(output_path, "w") as f:
        json.dump(results, f, indent=4)

if __name__ == "__main__":
    run()
