from utils.resume_parser import compute_skill_scores


def test_abbreviation_aliases_are_counted():
    text = "Built ML and NLP pipelines using PyTorch. Deployed on k8s with CI/CD."
    scores = compute_skill_scores(text)
    assert scores["ml_skills"] > 0
    assert scores["cloud_score"] > 0
