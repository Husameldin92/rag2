
## ⚙️ How it Works

1. **pocs.csv**  
   - Contains all POCs to test (each with a unique `poc_id`).
   - Example:
     ```
     poc_id
     184a32500cef1ecfdc7b1ecd
     9fbf9770a8b80e1f1a1c3cef
     ```

2. **questions.csv**  
   - Contains all test questions per POC.
   - The `poc_id` column must match the one in `pocs.csv`.
   - Example:
     ```
     q_id,poc_id,question
     1,184a32500cef1ecfdc7b1ecd,Was war die zentrale Beobachtung über die Agilität?
     2,184a32500cef1ecfdc7b1ecd,Was beschreibt Jürgen Appellos Metapher vom Zucker?
     ```

3. **transcripts/**  
   - Each transcript filename must match its `poc_id` (e.g., `184a32500cef1ecfdc7b1ecd.txt`).
   - The evaluator compares the LLM answer to this transcript to judge relevance.

4. **Results**  
   - Created automatically under `/results/test_N/`
   - Each test folder contains:
     ```
     query_result_Q1.json
     llm_answer_Q1.txt
     evaluation_Q1.txt
     ```

---

## ▶️ Run

```bash
node run_poc_only.js
# run only one
node run_poc_only.js --only 184a32500cef1ecfdc7b1ecd