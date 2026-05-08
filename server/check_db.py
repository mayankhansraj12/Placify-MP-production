import sqlite3
import json

conn = sqlite3.connect('data/placify.db')
rows = conn.execute('SELECT created_at, results FROM analyses ORDER BY created_at DESC LIMIT 3;').fetchall()
for row in rows:
    data = json.loads(row[1])
    print(row[0])
    print("keys:", [k for k in data.keys() if 'enhanced' in k or 'ai_' in k or 'company_details' in k or 'interview_questions' in k])
    if 'ats_feedback_enhanced' in data:
        print("ats_feedback_enhanced type:", type(data['ats_feedback_enhanced']))
    if 'ai_narrative' in data:
        print("ai_narrative type:", type(data['ai_narrative']))
    print("-" * 20)
