import json

from database import get_collection, init_db, to_iso


init_db()
rows = get_collection("analyses").find().sort("created_at", -1).limit(3)
for row in rows:
    data = row.get("results", {})
    if isinstance(data, str):
        data = json.loads(data)
    print(to_iso(row.get("created_at")))
    print("keys:", [k for k in data.keys() if "enhanced" in k or "ai_" in k or "company_details" in k or "interview_questions" in k])
    if "ats_feedback_enhanced" in data:
        print("ats_feedback_enhanced type:", type(data["ats_feedback_enhanced"]))
    if "ai_narrative" in data:
        print("ai_narrative type:", type(data["ai_narrative"]))
    print("-" * 20)
