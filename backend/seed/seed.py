import asyncio
import json
import os
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "evalassist")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def seed_db():
    print("Seeding database...")
    
    # 1. Clear existing
    await db.curricula.delete_many({})
    await db.assessments.delete_many({})
    await db.questions.delete_many({})
    await db.students.delete_many({})
    await db.evaluations.delete_many({})
    await db.interventions.delete_many({})
    await db.users.delete_many({})
    
    # 2. Seed Users
    hashed = bcrypt.hashpw("demo1234".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = {
        "_id": "teacher-1",
        "name": "Lakshmi Devi",
        "email": "teacher@school.gov.in",
        "school": "Z.P. High School, Hyderabad",
        "subjects": ["Biology", "Physics"],
        "password_hash": hashed
    }
    await db.users.insert_one(user)
    print("Seeded user")

    # 3. Seed Curriculum
    curr_path = os.path.join(os.path.dirname(__file__), "curriculum", "ap-class8-bio.json")
    if os.path.exists(curr_path):
        with open(curr_path) as f:
            curr_data = json.load(f)
            await db.curricula.insert_one(curr_data)
            print("Seeded curriculum")
            
    # 4. Load Mock Data
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    
    with open(os.path.join(data_dir, "assessments.json")) as f:
        assessments = json.load(f)
        for a in assessments:
            a["_id"] = a.pop("id")
        if assessments:
            await db.assessments.insert_many(assessments)
            print(f"Seeded {len(assessments)} assessments")
            
    with open(os.path.join(data_dir, "questions.json")) as f:
        questions = json.load(f)
        for q in questions:
            q["_id"] = q.pop("id")
            q["assessmentId"] = "asm-001" # Default to first assessment
        if questions:
            await db.questions.insert_many(questions)
            print(f"Seeded {len(questions)} questions")
            
    with open(os.path.join(data_dir, "students.json")) as f:
        students = json.load(f)
        for s in students:
            s["_id"] = s.pop("id")
            s["assessmentId"] = "asm-001"
        if students:
            await db.students.insert_many(students)
            print(f"Seeded {len(students)} students")
            
    with open(os.path.join(data_dir, "evaluations.json")) as f:
        evals_raw = json.load(f)
        evals = []
        for student_id, student_evals in evals_raw.items():
            for e in student_evals:
                e["_id"] = f"{student_id}-{e['qId']}"
                e["assessmentId"] = "asm-001"
                e["studentId"] = student_id
                e["approved"] = False
                evals.append(e)
        if evals:
            await db.evaluations.insert_many(evals)
            print(f"Seeded {len(evals)} evaluations")
            
    with open(os.path.join(data_dir, "interventions.json")) as f:
        interventions = json.load(f)
        for i in interventions:
            i["_id"] = i.pop("id")
            i["assessmentId"] = "asm-001"
            i["planned"] = False
        if interventions:
            await db.interventions.insert_many(interventions)
            print(f"Seeded {len(interventions)} interventions")

    print("Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_db())
