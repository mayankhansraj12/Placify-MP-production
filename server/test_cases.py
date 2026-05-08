import sys
import os
import json

# Add server directory to path so we can import ml.predictor
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.predictor import predict, load_models


OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests", "artifacts")


def run_tests():
    load_models()

    cases = [
        {
            "name": "Case 1: The Struggler (Low Skills, No Leetcode)",
            "features": {
                "python_score": 20, "java_score": 10, "cpp_score": 0, "javascript_score": 10,
                "ml_skills": 0, "web_dev_score": 15, "dsa_score": 10, "cloud_score": 0,
                "data_analytics_score": 0, "database_score": 10,
                "aptitude_score": 40, "communication_score": 2,
                "coding_problems_solved": 5, "internships": 0, "projects": 1,
                "certifications": 0, "hackathons": 0, "cgpa": 5.5
            }
        },
        {
            "name": "Case 2: The Average Joe (Service Based Target)",
            "features": {
                "python_score": 40, "java_score": 50, "cpp_score": 20, "javascript_score": 30,
                "ml_skills": 0, "web_dev_score": 30, "dsa_score": 40, "cloud_score": 10,
                "data_analytics_score": 10, "database_score": 50,
                "aptitude_score": 65, "communication_score": 3.5,
                "coding_problems_solved": 80, "internships": 0, "projects": 2,
                "certifications": 1, "hackathons": 0, "cgpa": 7.2
            }
        },
        {
            "name": "Case 3: The Web Developer (Product Based Target)",
            "features": {
                "python_score": 30, "java_score": 20, "cpp_score": 10, "javascript_score": 85,
                "ml_skills": 0, "web_dev_score": 90, "dsa_score": 60, "cloud_score": 40,
                "data_analytics_score": 10, "database_score": 60,
                "aptitude_score": 75, "communication_score": 4,
                "coding_problems_solved": 300, "internships": 1, "projects": 4,
                "certifications": 1, "hackathons": 2, "cgpa": 8.0
            }
        },
        {
            "name": "Case 4: The FAANG Star (Top Tier Target)",
            "features": {
                "python_score": 90, "java_score": 85, "cpp_score": 90, "javascript_score": 60,
                "ml_skills": 50, "web_dev_score": 60, "dsa_score": 95, "cloud_score": 60,
                "data_analytics_score": 40, "database_score": 85,
                "aptitude_score": 95, "communication_score": 5,
                "coding_problems_solved": 850, "internships": 3, "projects": 6,
                "certifications": 3, "hackathons": 5, "cgpa": 9.2
            }
        }
    ]

    results_list = []
    for case in cases:
        try:
            res = predict(case["features"])
            results_list.append({
                "name": case["name"],
                "role": f"{res['predicted_role']} ({res['role_confidence']}%)",
                "tier": f"{res['predicted_tier']} ({res['tier_confidence']}%)",
                "salary": f"{res['salary_range']['expected']} LPA",
                "faang_prob": f"{res['faang_probability']}%"
            })
        except Exception as e:
            results_list.append({"name": case["name"], "error": str(e)})

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, "test_results.json")
    with open(output_path, "w") as f:
        json.dump(results_list, f, indent=4)

if __name__ == "__main__":
    run_tests()
