/**
 * RAG 2.0 Automation – POC_ONLY End-to-End Test Runner
 * Creates results/test_N folders automatically
 * Each test folder contains:
 *   - query_result.json
 *   - llm_answer.txt
 *   - evaluation.txt
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { parse } = require("csv-parse/sync");
const OpenAI = require("openai");
require("dotenv").config();

const GRAPHQL_URL = "https://concord.sandsmedia.com/graphql";
const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI1NWE4YWYxOGU4Y2FlMjFiNjM5ZDNlNGYiLCJpYXQiOjE3NjAwMTM4OTksImV4cCI6MTc2MzQ2OTg5OX0.u3CxfMQL3V2rTiSIdsnm4xpx7JBbxAgE81X9CRfAtQg";
const RESULTS_DIR = path.join(__dirname, "results");
const INPUT_DIR = path.join(__dirname, "inputs");
const EVAL_PROMPT_PATH = path.join(__dirname, "eval", "prompts", "poc_only_evaluator.md");

// Azure evaluator setup
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const endpoint = "https://swedishopenaibook.openai.azure.com/";
const deployment = "gpt-4o-mini";
const apiVersion = "2024-04-01-preview";
const openai = new OpenAI({
  apiKey,
  baseURL: `${endpoint}openai/deployments/${deployment}`,
  defaultQuery: { "api-version": apiVersion },
  defaultHeaders: { "api-key": apiKey },
});

// --------------- Helpers ---------------
function postGraphQL(query, variables) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const url = new URL(GRAPHQL_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      port: 443,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "access-token": ACCESS_TOKEN,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ raw: body });
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").trim();
  return parse(text, { columns: true, skip_empty_lines: true });
}

function fetchStreamText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let chunks = "";
        res.on("data", (d) => {
          const s = d.toString();
          if (s.startsWith("data:")) {
            const payload = s.replace(/^data:\s*/, "").trim();
            if (payload && payload !== "[DONE]") {
              try {
                const json = JSON.parse(payload);
                if (json.text) chunks += json.text;
              } catch {
                chunks += payload;
              }
            }
          }
        });
        res.on("end", () => resolve(chunks.trim()));
      })
      .on("error", reject);
  });
}

async function evaluateAnswer(transcript, question, answer) {
  if (!apiKey) return "⚠️ No AZURE_OPENAI_API_KEY found in .env – skipped evaluation.";
  const systemPrompt = fs.existsSync(EVAL_PROMPT_PATH)
    ? fs.readFileSync(EVAL_PROMPT_PATH, "utf8")
    : "You are a strict QA evaluator.";

  const userPrompt = `
TRANSCRIPT:
${transcript.slice(0, 8000)}

QUESTION:
${question}

ANSWER:
${answer}

Evaluate strictly according to the prompt above.
`;

  const res = await openai.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
  });

  return res.choices[0].message.content.trim();
}

// --------------- Main Flow ---------------
async function main() {
  const pocs = readCsv(path.join(INPUT_DIR, "pocs.csv"));
  const questions = readCsv(path.join(INPUT_DIR, "questions.csv"));
  if (!pocs.length) {
    console.error("❌ No POCs found in inputs/pocs.csv");
    return;
  }

  function buildDiscoveryQuery(question, pocId) {
    return `
      query {
        discovery(
          question: "${question.replace(/"/g, '\\"')}"
          restriction: POC_ONLY
          pocIds: ["${pocId}"]
        ) {
          results { _id title }
          streamUrl
        }
      }
    `;
  }

  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR);

  let testCounter = 1;
  for (const poc of pocs) {
    const pocId = poc.poc_id.trim();
    const pocQuestions = questions.filter((q) => q.poc_id.trim() === pocId);
    if (!pocQuestions.length) continue;

    const testDir = path.join(RESULTS_DIR, `test_${testCounter++}`);
    fs.mkdirSync(testDir, { recursive: true });
    console.log(`\n🧪 Starting test for POC ${pocId} (${pocQuestions.length} questions)`);

    const transcriptPath = path.join(INPUT_DIR, "transcripts", `${pocId}.txt`);
    const transcript = fs.existsSync(transcriptPath)
      ? fs.readFileSync(transcriptPath, "utf8")
      : "";

    for (const q of pocQuestions) {
      const question = q.question.trim();
      const qLabel = `Q${q.q_id}`;
      console.log(`\n🔹 ${qLabel}: ${question}`);

      // Run discovery query
      const query = buildDiscoveryQuery(question, pocId);
      const result = await postGraphQL(query, {});
      const outQuery = path.join(testDir, `query_result_${qLabel}.json`);
      fs.writeFileSync(outQuery, JSON.stringify(result, null, 2));
      console.log(`💾 Saved query result: ${outQuery}`);

      // Get stream answer
      const streamUrl = result?.data?.discovery?.streamUrl;
      let answer = "";
      if (streamUrl) {
        answer = await fetchStreamText(streamUrl);
        const outAnswer = path.join(testDir, `llm_answer_${qLabel}.txt`);
        fs.writeFileSync(
          outAnswer,
          `POC_ID: ${pocId}\nQUESTION:\n${question}\n\nANSWER:\n${answer}`
        );
        console.log(`💾 Saved LLM answer: ${outAnswer}`);
      } else {
        console.log("⚠️ No streamUrl found, skipping LLM fetch.");
      }

      // Run evaluator
      const evaluation = await evaluateAnswer(transcript, question, answer);
      const outEval = path.join(testDir, `evaluation_${qLabel}.txt`);
      fs.writeFileSync(outEval, evaluation);
      console.log(`💾 Saved evaluation: ${outEval}`);
    }
  }

  console.log("\n✅ All tests completed.");
}

main().catch((err) => console.error("❌ Error:", err));
