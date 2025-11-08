📘 README.md
# 🧩 RAG 2.0 – POC_ONLY Automation

This project automates testing for the **POC_ONLY** restriction type in the RAG 2.0 system.  
It runs discovery (we use for staging system) queries for each prepared POC, retrieves the streamed LLM answers,  
and evaluates them against the original transcripts.

---

## 📁 Folder Structure


inputs/
├── pocs.csv # List of POCs to test
├── questions.csv # Questions linked to each POC
└── transcripts/ # Transcript text files (one per POC) --> (download the transcript from redsys)
results/ # Generated automatically


---

## ⚙️ How It Works

1. The script reads `pocs.csv` → every row = one POC to test.  
2. It matches each POC with questions from `questions.csv`.  
3. For each POC, it finds the transcript file in `/inputs/transcripts/`.  
4. It calls the `discovery` endpoint with `restriction: POC_ONLY`.  
5. It fetches the streamed LLM answer and saves:
   - `query_result_Qx.json`
   - `llm_answer_Qx.txt`
   - `evaluation_Qx.txt`

Each POC gets its own folder under `/results/` (e.g., `/results/test_1/`).

---

## 🚀 Quick Start

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Husameldin92/rag2.git
cd rag2

2️⃣ Install Dependencies

Make sure Node.js (v18+) and npm are installed.

npm install


If needed, initialize manually:

npm init -y
npm install csv-parse dotenv openai

3️⃣ Create .env File

In the root directory:

touch .env


Add your Azure OpenAI key:

AZURE_OPENAI_API_KEY=your_azure_key_here


⚠️ The .env file is already in .gitignore, so it won’t be pushed.

4️⃣ Prepare Your Input Data
Example inputs/pocs.csv
poc_id
184a32500cef1ecfdc7b1ecd
9fbf9770a8b80e1f1a1c3cef

Example inputs/questions.csv
q_id,poc_id,question
1,184a32500cef1ecfdc7b1ecd,Was war die zentrale Beobachtung über die Agilität nach ~20 Jahren?
2,184a32500cef1ecfdc7b1ecd,Was beschreibt Jürgen Appellos Metapher vom Zucker im Kaffee?

Example Transcript File

inputs/transcripts/184a32500cef1ecfdc7b1ecd.txt

Each transcript filename must match its poc_id.

5️⃣ Run the Script

Run all POCs:

node run_poc_only.js


Run only one specific POC:

node run_poc_only.js --only 184a32500cef1ecfdc7b1ecd

6️⃣ View the Results

Generated automatically:

results/
 ├── test_1/
 │   ├── query_result_Q1.json
 │   ├── llm_answer_Q1.txt
 │   └── evaluation_Q1.txt
 └── test_2/
     ├── query_result_Q1.json
     ├── llm_answer_Q1.txt
     └── evaluation_Q1.txt


Each llm_answer_Qx.txt includes:

POC_ID: 184a32500cef1ecfdc7b1ecd
QUESTION:
Was war die zentrale Beobachtung über die Agilität nach ~20 Jahren?

ANSWER:
Die zentrale Beobachtung war, dass ...

🧠 Notes

The script automatically creates and names /results/test_N/ folders.

.env, results/, and node_modules/ are ignored by Git.

--only <POC_ID> allows you to test one POC instead of all.

The evaluator uses the transcript to judge whether the LLM’s answer matches the content.

📦 Dependencies
Package	Purpose
dotenv	Loads the Azure key from .env.
csv-parse	Reads and parses pocs.csv and questions.csv.
openai	Connects to Azure OpenAI for automatic evaluation.

Install everything with:

npm install

🧩 Summary
Step	Description
1	Clone the repo
2	Install dependencies
3	Create .env with your Azure key
4	Add pocs.csv, questions.csv, and transcripts
5	Run the script (--only optional)
6	Check results in /results/

© 2025 Husameldin Osman – RAG 2.0 QA Automation