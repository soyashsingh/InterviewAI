
require("dotenv").config();

const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "InterviewAI backend is running!",
  });
});

function getTopics(role, interviewType) {
  const r = role.toLowerCase();
  const type = interviewType.toLowerCase();

  if (type.includes("behavior") || type.includes("hr")) {
    return [
      "teamwork and collaboration",
      "conflict resolution",
      "leadership and ownership",
      "failure and lessons learned",
      "communication skills",
      "time management",
      "decision making",
      "handling feedback",
      "workplace ethics",
      "adaptability",
    ];
  }

  if (r.includes("frontend") || r.includes("web developer")) {
    return [
      "HTML semantics and accessibility",
      "CSS layout and responsive design",
      "JavaScript scope and closures",
      "DOM and browser events",
      "asynchronous JavaScript and promises",
      "React components and state",
      "API integration and error handling",
      "web performance",
      "frontend security",
      "testing and debugging",
      "browser rendering",
      "frontend architecture",
    ];
  }

  if (r.includes("javascript")) {
    return [
      "JavaScript scope and closures",
      "objects and prototypes",
      "arrays and data transformation",
      "promises and async/await",
      "event loop",
      "error handling",
      "memory and performance",
      "modules",
      "testing",
      "security",
      "debugging scenarios",
      "code maintainability",
    ];
  }

  if (r.includes("python")) {
    return [
      "Python data structures",
      "functions and scope",
      "iterators and generators",
      "decorators",
      "object-oriented programming",
      "exceptions and debugging",
      "file handling",
      "modules and packages",
      "testing",
      "performance and memory",
      "API development",
      "real-world problem solving",
    ];
  }

  if (r.includes("data analyst") || r.includes("data scientist")) {
    return [
      "SQL queries and joins",
      "data cleaning",
      "statistics and probability",
      "exploratory data analysis",
      "visualization and dashboards",
      "business metrics",
      "missing data and outliers",
      "experiment design",
      "model evaluation",
      "communicating insights",
      "data quality",
      "analytical case studies",
    ];
  }

  if (
    r.includes("backend") ||
    r.includes("software developer") ||
    r.includes("software engineer")
  ) {
    return [
      "data structures and algorithms",
      "API design",
      "database design and SQL",
      "authentication and authorization",
      "error handling",
      "caching",
      "testing and debugging",
      "concurrency",
      "system design",
      "performance optimization",
      "security",
      "production incident scenarios",
    ];
  }

  if (r.includes("devops") || r.includes("cloud")) {
    return [
      "Linux and command-line tools",
      "networking fundamentals",
      "CI/CD pipelines",
      "containers",
      "cloud architecture",
      "monitoring and logging",
      "infrastructure as code",
      "security and permissions",
      "scaling and reliability",
      "incident response",
    ];
  }

  if (r.includes("manager") || r.includes("product manager")) {
    return [
      "prioritization",
      "stakeholder management",
      "product strategy",
      "success metrics",
      "handling trade-offs",
      "roadmap planning",
      "customer research",
      "risk management",
      "team conflict",
      "decision scenarios",
    ];
  }

  return [
    "role-specific core knowledge",
    "practical workplace scenarios",
    "problem solving",
    "tools used in this role",
    "decision making",
    "troubleshooting",
    "quality and accuracy",
    "communication",
    "handling difficult situations",
    "process improvement",
    "risk and responsibility",
    "real-world case studies",
  ];
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

app.post("/api/generate-question", async (req, res) => {
  try {
    const {
      role = "Software Developer",
      interviewType = "Technical",
      language = "English",
      experience = "Fresher",
      previousQuestions = [],
    } = req.body || {};

    if (!Array.isArray(previousQuestions)) {
      return res.status(400).json({
        success: false,
        error: "Previous questions must be a list.",
      });
    }

    const topics = getTopics(role, interviewType);
    const selectedTopic =
      topics[previousQuestions.length % topics.length];

    const prompt = `
You are an expert job interviewer.

Generate exactly ONE fresh, open-ended interview question.

Job role: ${role}
Interview type: ${interviewType}
Candidate experience: ${experience}
Question language: ${language}
Focus topic: ${selectedTopic}

Available topics:
${topics.join(", ")}

Previously asked questions:
${JSON.stringify(previousQuestions)}

Rules:
- Make the question specific to the selected job role.
- Do not repeat or closely paraphrase previous questions.
- Test a different concept from earlier questions.
- Vary conceptual, practical, debugging, scenario-based,
  and problem-solving questions when appropriate.
- Match difficulty to the candidate's experience.
- Do not create multiple-choice questions.
- Ask only one clear question.
- Return only the question in the requested language.
- Do not add numbering, answers, hints, or explanations.
`;

    let question = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      const retryPrompt =
        prompt +
        (attempt > 0
          ? "\nGenerate a substantially different question and concept."
          : "");

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: retryPrompt,
      });

      const candidate = (response.text || "")
        .trim()
        .replace(/^["'`]+|["'`]+$/g, "");

      const duplicate = previousQuestions.some(
        (oldQuestion) => normalize(oldQuestion) === normalize(candidate)
      );

      if (candidate && !duplicate) {
        question = candidate;
        break;
      }
    }

    if (!question) {
      return res.status(502).json({
        success: false,
        error: "Fresh question nahi bani. Please retry.",
      });
    }

    res.json({
      success: true,
      question,
      topic: selectedTopic,
    });
  } catch (error) {
    console.error("Gemini error:", error.message);

    res.status(500).json({
      success: false,
      error: "Question generate nahi hua. API key, model access aur connection check karo.",
    });
  }
});

app.post("/api/evaluate-answer", async (req, res) => {
  try {
    const {
      role = "Frontend Developer",
      interviewType = "Technical",
      language = "English",
      experience = "Beginner",
      question = "",
      answer = "",
    } = req.body || {};

    if (!question.trim() || !answer.trim()) {
      return res.status(400).json({
        success: false,
        error: "Question aur answer dono required hain.",
      });
    }

    const prompt = `
You are a professional job interviewer.

Job role: ${role}
Interview type: ${interviewType}
Candidate experience: ${experience}
Language: ${language}

Interview question:
${question}

Candidate's answer:
${answer}

Your task:
1. Understand the candidate's answer.
2. Decide whether one useful follow-up question is appropriate.
3. Ask about a missing concept, unclear statement, practical example,
   reasoning, or a relevant technical detail.
4. Do not repeat the original question.
5. If the answer is completely irrelevant or empty, ask one concise
   question that helps clarify the candidate's understanding.
6. If a follow-up would not be useful, set shouldFollowUp to false.
7. Keep the follow-up appropriate for the candidate's experience.
8. Do not reveal the final score or detailed evaluation yet.

Return only valid JSON in this exact format:
{
  "shouldFollowUp": true,
  "followUpQuestion": "Your follow-up question here"
}

If no follow-up is useful, return:
{
  "shouldFollowUp": false,
  "followUpQuestion": ""
}

Write the follow-up in ${language}.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
    });

    const raw = (response.text || "").trim();
    const clean = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const result = JSON.parse(clean);

    res.json({
      success: true,
      shouldFollowUp: Boolean(result.shouldFollowUp),
      followUpQuestion: result.shouldFollowUp
        ? String(result.followUpQuestion || "")
        : "",
    });
  } catch (error) {
    console.error("Answer evaluation error:", error.message);

    res.status(500).json({
      success: false,
      error: "AI answer analyze nahi kar paya. Please retry.",
    });
  }
});

app.post("/api/check-answer", async (req, res) => {
  try {
    const { role, question, answer, language } = req.body;

    if (!question || typeof answer !== "string") {
      return res.status(400).json({
        error: "Question and answer are required."
      });
    }

    if (!answer.trim()) {
      return res.status(400).json({
        error: "Please write your answer first."
      });
    }

    const prompt = `
You are a professional mock interview evaluator.

Job role: ${role || "General"}
Question: ${question}
Candidate answer: ${answer}
Preferred language: ${language || "English"}

Evaluate the answer fairly. Return only valid JSON:
{
  "status": "Correct, Partially Correct, or Incorrect",
  "score": 0,
  "maxScore": 10,
  "whatWasGood": "What was correct",
  "weaknesses": ["What was missing or wrong"],
  "betterAnswer": "An improved sample answer",
  "improvementTip": "One practical tip"
}

Score out of 10 using correctness, relevance, completeness
and clarity. Accept valid alternative wording.
Explain mistakes simply. Write feedback in the preferred language.
`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const evaluation = JSON.parse(result.text);
    res.json(evaluation);

  } catch (error) {
    console.error("Answer checking error:", error);
    res.status(500).json({
      error: "Could not evaluate this answer. Please try again."
    });
  }
});


app.post("/api/generate-learning-plan", async (req, res) => {
  try {
    const {
      role = "Software Developer",
      experience = "Beginner",
      interviewType = "Technical",
      language = "English",
      evaluations = [],
      followUps = []
    } = req.body || {};

    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one completed evaluation is required."
      });
    }

    const prompt = `
You are an expert interview coach and personalized learning planner.

Create a practical, personalized 7-day improvement plan using the
candidate's actual interview questions, answers and AI evaluations.

Candidate profile:
- Job role: ${role}
- Experience level: ${experience}
- Interview type: ${interviewType}
- Required output language: ${language}

Actual interview evaluation data:
${JSON.stringify(evaluations)}

Follow-up question and evaluation data:
${JSON.stringify(followUps)}

Requirements:
1. Return exactly 7 days in chronological order.
2. Identify each question's topic and subtopic from its actual content.
3. Prioritize topics using scores, weaknesses, missing concepts,
   incorrect claims and follow-up evaluation evidence.
4. Do not invent weaknesses unsupported by the supplied evidence.
5. Distinguish technical knowledge, coding/problem solving,
   communication and behavioral-answer skills where relevant.
6. Give specific study tasks, practice questions and answer strategies.
7. For behavioral questions, suggest a relevant STAR structure
   (Situation, Task, Action, Result) when appropriate.
8. Include daily minutes, priority, reason, 2-4 tasks and a measurable goal.
9. Include 1-3 relevant learning references per day when possible.
10. Prefer official documentation and trustworthy educational sources.
11. Reference URLs must be genuine and relevant. Never invent URLs.
12. Adapt the plan to the candidate's selected role and experience.
13. Write every user-facing field in ${language}.
14. If evidence is insufficient, explicitly say so instead of guessing.

Return only JSON in this format:
{
  "title": "Your Personalized 7-Day Learning Plan",
  "summary": "Short summary based on the interview evidence",
  "days": [
    {
      "day": 1,
      "topic": "Specific topic",
      "subtopics": ["Subtopic 1", "Subtopic 2"],
      "priority": "High",
      "minutes": 30,
      "evidence": "Specific question, score and recorded weakness",
      "answerStrategy": "How to approach this type of answer",
      "tasks": ["Specific task 1", "Specific task 2"],
      "practiceQuestions": ["Practice question 1"],
      "goal": "A measurable learning goal",
      "references": [
        {
          "title": "Resource title",
          "url": "https://example.com"
        }
      ]
    }
  ]
}
`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const plan = JSON.parse(result.text);

    if (!Array.isArray(plan.days) || plan.days.length !== 7) {
      throw new Error("AI did not return exactly seven plan days.");
    }

    res.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error("Learning plan error:", error.message);

    res.status(500).json({
      success: false,
      error: "Personalized learning plan generate nahi hua. Please retry."
    });
  }
});

app.listen(PORT, () => {
  console.log(`InterviewAI running at http://localhost:${PORT}`);
});
