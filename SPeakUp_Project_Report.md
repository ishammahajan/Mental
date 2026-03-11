# SPeakUp: Confidential AI Reflection Companion & Administrative Platform
**Submission for Maker Lab - Problem Area 8: Mental Health & Well-being Companion**
**Target Institution:** SPJIMR
**Target Faculty/Evaluators:** SPJIMR Faculty & Maker Lab Evaluators
**Date:** February 2026

---

## Technical Stack & Tooling Rationale
Before delving into the project framing, the following table outlines the specific technologies selected to construct the SPeakUp MVP, chosen explicitly to balance zero-cost scalability, data privacy, and modern user experience.

| Technology / Tool | Primary Purpose in SPeakUp MVP | Rationale / Stakeholder Benefit |
| :--- | :--- | :--- |
| **React + TypeScript** | Frontend UI Framework & Type-Safe Logic | Enables the building of a calm, component-driven, responsive UI while strictly enforcing data types to prevent runtime errors during critical user flows. |
| **Firebase Authentication** | Secure User Identity Management | Eliminates manual credential management, ensuring encrypted, standard-compliant logins required for a privacy-first mental health application. |
| **Firebase Firestore** | Real-Time Cloud Database | Provides persistent, secure NoSQL data storage for appointments, user profiles, and chat logs, ensuring data is never lost upon browser refresh. |
| **HuggingFace Inference API** | Core LLM Engine (Qwen2.5-7B) | Powers "SParsh", the AI reflection companion. Chosen over generic APIs because it allows inference of highly capable open-source models at zero cost. |
| **Pinecone Vector DB** | Retrieval-Augmented Generation (RAG) | Stores multi-dimensional embeddings of clinical coping mechanisms, allowing SParsh to retrieve contextually appropriate grounding exercises natively in chat. |

---

## 1. Project Framing (1–1.5 pages)

### 1.1 Stakeholder Definition
The SPeakUp platform operates within a dual-stakeholder ecosystem at SPJIMR:

**Primary Stakeholder 1: The MBA Student**
*   **Role:** High-achieving postgraduate student.
*   **Context & Constraints:** Extremely time-poor, navigating intense academic rigor, internship pressures, and peer competition. They lack the time and emotional energy to navigate heavily bureaucratic or unstructured support systems.
*   **Current Pain Point:** Reactive support mechanisms. Booking a session requires email/WhatsApp back-and-forth which induces friction. Additionally, there is a profound hesitation to seek help due to concerns over privacy, confidentiality, and the stigma of mental health treatment.
*   **Experience Level:** Digital native but highly sensitive to cognitive load when distressed.
*   **Risk Tolerance:** Very low. They fear that expressing vulnerability could impact their academic standing or placement prospects. 

**Primary Stakeholder 2: The College Counselor (Ms. Dimple Wagle)**
*   **Role:** Sole mental health professional for the entire SPJIMR campus.
*   **Context & Constraints:** Severe administrative bottleneck. She manages clinical therapy entirely alone, working 12 PM to 8 PM. Time spent scheduling, managing email threads, and handwriting/digitizing intake forms directly cannibalizes time available for clinical intervention. 
*   **Current Pain Point:** Manual slot tracking, repetitive explanation of confidentiality clauses, and the monthly burden of manually anonymizing logs to report aggregate metrics to supervisors.

### 1.2 Problem Definition
The core problem is the **friction and administrative overhead inherent in reactive mental health support.** 
Currently, the decision to seek help relies entirely on the student overcoming a high activation energy barrier: recognizing distress, deciding to reach out, composing a WhatsApp message, and navigating scheduling conflicts. 

Existing solutions (WhatsApp, emails, manual diaries) are deeply insufficient because:
1.  **They do not scale:** A single counselor cannot manage real-time scheduling for hundreds of students without dropping balls.
2.  **They lack proactive triage:** Students who are isolating or failing to recognize their own decline are entirely missed until a crisis occurs.
3.  **They leak privacy:** WhatsApp conversations mix administrative scheduling with clinical cries for help on an unencrypted, personal channel.

We are not merely solving a "scheduling" problem; we are solving a **trust and friction** problem. The system must lower the barrier to entry for students while simultaneously automating the counselor’s administrative operations.

### 1.3 Value Proposition
**For the Student:** SPeakUp reduces the friction of access to zero. Ambiguity is replaced with a clear, calm digital interface. They can view counselor availability, securely book slots without judgment, and interact with **SParsh** (an AI reflection companion) for immediate, confidential emotional triage or personalized coping mechanisms.

**For the Counselor (Ms. Wagle):** SPeakUp eliminates the administrative tax. Scheduling is automated, first-session intake forms and confidentiality agreements are digitized securely, and anonymized monthly utilization reports are generated instantly. This frees the counselor to operate at the top of her clinical license, transforming her role from "scheduler" to "healer."

---

## 2. Functional Assessment (2–3 pages)

SPeakUp is a functional MVP built on React and TypeScript, leveraging Firebase Authentication for secure user login, Firebase Firestore for a secure, real-time cloud database, HuggingFace Inference API (Qwen2.5-7B) for the LLM core, and Pinecone Vector Database for Retrieval-Augmented Generation (RAG).

### 2.1 Workflow Integrity
The system demonstrates continuous, automated data movement without manual breakpoints. 

#### Walkthrough 1: Student Slot Booking
1.  **Input:** Student logs into their dashboard and clicks the "Slot Booking" tab.
2.  **Action:** The system queries Firebase Firestore for all slots marked "open" by the counselor.
3.  **Execution:** The student selects a slot and confirms. The system updates the slot status to 'requested' in the cloud and binds it to the student's ID.
4.  **Output:** A real-time notification is pushed to the Counselor's dashboard.
*   *[Suggest Placeholder: Screenshot of Student Booking Interface]*
*   *[Suggest Placeholder: Screenshot of Counselor Dashboard receiving the request]*

#### Walkthrough 2: Standardized Assessment & Autonomous Triage
1.  **Input:** Student initiates a GAD-7 (Anxiety) quest from the Gamified Wellness Odyssey hub.
2.  **Action:** Student answers 7 structured questions. The system calculates a weighted score.
3.  **Execution:** If the score exceeds the clinical threshold (e.g., severe anxiety), the system avoids forced intervention but triggers a "Low Score Response Mechanism"—a gentle, non-intrusive nudge offering to immediately book a session or anonymously share the score with Ms. Wagle.
4.  **Output:** The student's historical trend graph updates, visualizing their progression over time.
*   *[Suggest Placeholder: Screenshot of GAD-7 Assessment UI]*
*   *[Suggest Placeholder: Screenshot of Historical Trend Graph]*

#### Walkthrough 3: SParsh AI Companion & RAG Coping Mechanisms
1.  **Input:** Student opens the SParsh chat and types, "I'm feeling incredibly overwhelmed with my finance exams."
2.  **Action (Pinecone RAG):** The system vectorizes the input and queries the `speakup-toolkit` Pinecone index, retrieving top clinical coping mechanisms (e.g., "Box Breathing", "Step-back technique").
3.  **Execution (HuggingFace LLM):** The RAG context is injected into the system prompt. Using the Qwen2.5-7B model via HuggingFace Inference API, SParsh generates a peer-to-peer, empathetic response integrating the retrieved coping strategy.
4.  **Output:** SParsh replies playfully yet helpfully, logging a `[[MOOD: anxious]]` hidden tag to subtly tint the user interface.
*   *[Suggest Placeholder: Screenshot of SParsh Chat Interface]*

#### Walkthrough 4: Counselor IT/Admin Monthly Analytics
1.  **Input:** The Admin/Counselor navigates to the Analytics Dashboard to prepare the monthly supervisor report.
2.  **Action:** The system aggregates all historical booking data from the Firebase Firestore database.
3.  **Execution:** It automatically calculates utilization rates, peak distress hours, and generalized (anonymized) demographics, ensuring zero Exposure of Student Names or PII.
4.  **Output:** A clean, chart-based dashboard is rendered, with options to export the data.
*   *[Suggest Placeholder: Screenshot of Admin Analytics Dashboard]*

### 2.2 Data and Retrieval Integrity
**RAG Implementation (Pinecone + HuggingFace):**
Information retrieval is executed cleanly via Pinecone. When the user interacts with SParsh, their text is embedded using `sentence-transformers/all-MiniLM-L6-v2`. Pinecone retrieves the top 2 closest vectors from our seeded psychological toolkit. 
*   **Relevance:** The seeded data consists of curated, standardized coping mechanisms (e.g., 5-4-3-2-1 grounding, reframing).
*   **Context Assembly:** The retrieved text is injected directly into the LLM payload under a strict `[RAG INTELLIGENCE]` header before reaching the LLM, preventing hallucination.
If the API fails, the system safely falls back to a Node.js proxy or a local, rule-based offline tier, ensuring zero downtime.

### 2.3 Prompt and Logic Assembly
The system is explicitly engineered, not simply "ad-hoc prompted."

**Exact System Prompt Template:**
\`\`\`text
**DELIVERABLE 2: SParsh SYSTEM INSTRUCTION (Student Side Only)**
**IDENTITY & PERSONA:**
You are SParsh, the "Her" OS for the SPJIMR campus. 
You are a **Peer**, not a Parent. You are a **Sanctuary**, not a Clinic.
You speak in short, lower-case, warm sentences. You prioritize "Vibe" over "Diagnosis".

**CORE DIRECTIVES:**
1. **The Mirror:** If a student says they are stressed, do not fix it. Mirror it. "That sounds incredibly heavy."

**METADATA OUTPUT (REQUIRED):**
Analyze the user's input and determine their current mood/vibe.
Start your response with a hidden tag in this format: [[MOOD: <vibe>]].
Allowed vibes: 'calm', 'anxious', 'focus', 'tired', 'energetic'.

**THE KILL SWITCH (CRITICAL PROTOCOL):**
If the user's input contains any of the following triggers: "suicide", "kill myself", "want to die"
YOU MUST OUTPUT TRIGGER CODE: [CRISIS_PROTOCOL_TRIGGER]
\`\`\`
*(Note: If RAG context is found, it is appended dynamically as: `\n\n[RAG INTELLIGENCE]: The database retrieved... WEAVE one of these naturally...`)*

**Example Input:** "I can't sleep, I'm so worried about placements."
**Example Output:** `[[MOOD: anxious]] the placement season is a beast. it's completely normal to feel wired. would you like to try a quick 4-7-8 breathing exercise our counselors recommend to help your heart rate settle down?`

### 2.4 Output Consistency
*   **Typical Case:** A student vents about academics. SParsh responds with lower-case empathy, extracts `[[MOOD: tired]]`, and the UI tints grey slightly.
*   **Edge Case:** A student asks a purely informational question ("Where is the cafeteria?"). The LLM maintains its persona but politely pivots back to well-being without breaking character or hallucinating a campus map.
*   **Failure Case (Limitation):** If the HuggingFace API rate-limits the user, the app degrades gracefully to Tier-3 Rule-Based Offline mode. It detects sentiment using basic regex/keyword matching and returns pre-written comforting text, completely masking the API failure from the distressed user.

---

## 3. Logical Coherence & Stakeholder–Solution Fit (2–3 pages)

### 3.1 Decision Logic
The system's decision-making relies on strict, deterministic hierarchies, preventing the AI from making dangerous autonomous choices.

1.  **Risk Detection (Crisis Protocol):** This is a hardcoded, deterministic Tier-1 regex kill-switch. If the user input matches `/suicid|kill\s+myself|end\s+it\s+all/i`, the API call is **abandoned immediately**. The system assumes absolute clinical risk, cuts off the LLM, and forces a hardcoded overlay routing the student to the iCall suicide helpline (9152987821). This supersedes all AI logic.
2.  **Assessment Scoring:** GAD-7 and BDI scores are calculated linearly. Thresholds (<5, 5-9, 10-14, >15) map directly to hardcoded UI nudges. The system does *not* use AI to diagnose; it strictly adheres to the established psychological scales requested by Ms. Wagle in the interview.

### 3.2 Stakeholder–Workflow Alignment
The workflow directly mirrors Ms. Wagle's interview requests:
*   **Reducing Friction:** Email ping-pong is entirely eradicated. A student sees "Tuesday 4 PM" and clicks "Book". The cognitive load of mental healthcare access is reduced to a single click.
*   **Safeguarding Privacy:** "No passive mood tracking," as Ms. Wagle emphasized. Assessing mood relies on the student explicitly entering the SParsh chat or actively initiating a "Quest" (Survey).
*   **Administrative Digestion:** The counselor dashboard replaces the physical diary. The "Intake Form Consent" automatically generates a PDF, closing the loop on legal/institutional requirements without the student needing to physically hold a pen during their vulnerable first 10 minutes of therapy.

### 3.3 Internal Logical Consistency
We acknowledge specific structural constraints. Building an LLM system for mental health carries implicit risks of "bot reliance." To counteract this, the system is designed to act as a *bridge*, not a *destination*. The explicit goal of the platform—via nudges, SParsh chat, and surveys—is to funnel the student toward a human (Ms. Wagle) or to provide immediate grounding, never to simulate long-term clinical therapy. 

---

## 4. User Experience (UX) and Iterability (1.5–2 pages)

### 4.1 Guidance
The MVP operates on a principle of "calm UI." 
*   **Color Palette:** Dominated by light greens (Sage), warm beige (Sand), and slate grey. Dark/heavy themes were explicitly avoided as requested by the counselor to prevent triggering anxious users.
*   **Onboarding:** A "Know How It Works" section explicitly details the boundaries of confidentiality, mitigating the hesitation students feel over institutional spying.
*   *[Suggest Placeholder: Screenshot of "Know How It Works" / Confidentiality agreement]*

### 4.2 Ambiguity Reduction
When a student is distressed, open text fields can be paralyzing. The app utilizes "Interactive Quests" (Gamified GAD-7 assessments) rather than presenting a sterile medical form. Instead of asking "How are you?", the system leverages environmental widgets (Weather APIs) to start the conversation: "It's raining in Mumbai today, how's your energy holding up?" 

### 4.3 Iteration and Feedback Loops
*   **Self-Correction:** Students control their data. If an assessment yields a high-risk score, the system *suggests* sharing it with the Counselor, but enforces user autonomy. The user dictates the data loop.
*   **Counselor Refusal:** Ms. Wagle can view pending slot requests and has the explicit UI capability to 'Decline' or 'Reschedule', creating a synchronous feedback loop with the student dashboard.

---

## 5. Testing and Reflection (1 page)

### 5.1 Testing Protocol
Our MVP underwent staged functional testing simulating over 12 user scenarios:
*   **Variations Introduced:** Injecting API key failures, simulating network disconnections during chat, testing crisis keywords hidden within long paragraphs, and cross-booking the same slot simultaneously from two simulated students.
*   **Surprises:** Initially, Vite (the frontend bundler) crashed entirely when attempting to load the Pinecone Node.js SDK gracefully in the browser. We had to rapidly refactor the architecture to utilize native REST `fetch` queries to Pinecone to achieve a stable frontend RAG implementation.

### 5.2 Failure Analysis
Honesty in MVP development is critical. Currently, the system has structural behaviors that we observed fading under certain conditions:
1.  **Firebase Real-time Listener Overhead:** While Firebase Firestore listeners provide instant state sync for slot bookings, we noticed that rapidly toggling between views could stack listener hooks in React. We rigorously managed unsubscribe functions, but maintaining real-time chat plus real-time bookings simultaneously requires aggressive optimization to prevent memory overhead.
2.  **LLM Latency & Hallucination:** Relying on the HuggingFace free inference tier occasionally yields 2-4 second latencies. Furthermore, despite strict prompting, LLMs can occasionally adopt an overly cheerful tone inappropriate for severe grieving.

### 5.3 Roadmap to Version 2
*   **Feature Expansion (Phase 2):** Implementation of "Proactive Disengagement Nudges." Synthesizing student inactivity (15+ days) and automatically rendering warm UI intervention tiles to encourage re-booking.
*   **Counselor Copilot:** Expanding the RAG implementation to include institutional policies (SPJIMR Handbook) and advanced CBT/DBT clinical literature to act as an offline assistant explicitly for Ms. Wagle's dashboard.

### 5.4 Known Bugs and UI Improvements
While fully functional, we have documented the following minor bugs and UI enhancement targets for future iterations:
*   **Bug 1:** Occasionally, if the SParsh AI chat is closed rapidly while generating a response, the text stream continues in the background and abruptly populates upon reopening. A robust DOM abort controller is needed to kill the fetch request on component unmount.
*   **Bug 2:** The Markdown parser in the Wellness Wall posts sometimes fails to render complex nested lists correctly, falling back to raw text.
*   **UI Improvement 1:** The date-picker calendar for the counselor slot-creation currently requires manual text input (e.g., "YYYY-MM-DD"). Iteration 2 will replace this with an interactive visual calendar widget.
*   **UI Improvement 2:** Transition animations between the Student Dashboard tabs ("Home" vs. "Tasks") are currently instantaneous. We plan to pad these with soft fade-in CSS animations to better maintain the "calm interface" philosophy.

---
*End of Report*
