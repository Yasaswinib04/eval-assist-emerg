// Mock data for the EvalAssist prototype
// Based on Class 8 Biology SA1 question paper (Telugu state board / NCERT aligned)

export let CHAPTERS = {
  ch1: { id: "ch1", name: "Cell — Structure & Functions", color: "blue" },
  ch2: { id: "ch2", name: "Microorganisms — Friend & Foe", color: "emerald" },
  ch3: { id: "ch3", name: "Crop Production & Management", color: "amber" },
  ch4: { id: "ch4", name: "Reproduction in Animals", color: "rose" },
};

export let ASSESSMENTS = [
  { id: "asm-001", name: "SA1 — Biological Science", class: "Class 8", subject: "Biology", type: "Summative Assessment 1", totalMarks: 40, totalPapers: 42, pendingReview: 11, avgScore: 27.4, status: "review", createdAt: "2026-02-08" },
  { id: "asm-002", name: "Unit Test — Microorganisms", class: "Class 8", subject: "Biology", type: "Unit Test", totalMarks: 20, totalPapers: 38, pendingReview: 0, avgScore: 14.2, status: "complete", createdAt: "2026-01-22" },
  { id: "asm-003", name: "FA2 — Cell Structure", class: "Class 8", subject: "Biology", type: "Formative Assessment", totalMarks: 25, totalPapers: 40, pendingReview: 0, avgScore: 18.1, status: "complete", createdAt: "2026-01-05" },
  { id: "asm-004", name: "Practice Quiz — Crop Production", class: "Class 8", subject: "Biology", type: "Practice", totalMarks: 15, totalPapers: 36, pendingReview: 0, avgScore: 11.3, status: "draft", createdAt: "2026-02-10" },
];

// Each question carries: chapter, concept, skill, difficulty, prerequisite concepts
export let QUESTIONS = [
  { id: "q1", number: 1, section: "A", maxMarks: 1, text: "Identify the odd one with respect to their fertilization:", options: ["Frog","Butterfly","Hen","Humans"], correctAnswer: "Humans", chapter: "ch4", concept: "Fertilization", skill: "Recall & Compare", difficulty: "Easy", prerequisites: [] },
  { id: "q2", number: 2, section: "A", maxMarks: 1, text: "Identify the correct statement about IVF.", options: ["Baby develops in test tube","Fertilization inside female body","Done when oviducts are blocked","IVF is asexual"], correctAnswer: "Done when oviducts are blocked", chapter: "ch4", concept: "IVF", skill: "Conceptual Understanding", difficulty: "Medium", prerequisites: ["Fertilization", "Internal Fertilization"] },
  { id: "q3", number: 3, section: "A", maxMarks: 1, text: "Best way to prevent Hepatitis A?", options: ["Mosquito nets","Boiled drinking water","Insecticides","Isolation"], correctAnswer: "Boiled drinking water", chapter: "ch2", concept: "Communicable Diseases", skill: "Application", difficulty: "Easy", prerequisites: ["Microorganisms"] },
  { id: "q4", number: 4, section: "A", maxMarks: 1, text: "Reason for growing wheat in Rabi season:", options: ["Plenty of water","High temperature","High humidity","Cool & dry weather"], correctAnswer: "Cool & dry weather", chapter: "ch3", concept: "Crop Seasons", skill: "Reasoning", difficulty: "Easy", prerequisites: [] },
  { id: "q5", number: 5, section: "A", maxMarks: 1, text: "Metamorphosis is seen in:", options: ["Frog only","Frog and Butterfly","Frog, Butterfly, Hen","Dog"], correctAnswer: "Frog and Butterfly", chapter: "ch4", concept: "Metamorphosis", skill: "Recall", difficulty: "Easy", prerequisites: ["Frog Lifecycle"] },
  { id: "q6", number: 6, section: "A", maxMarks: 1, text: "Identify the organism in the diagram (single cell with pseudopodia):", options: ["Paramoecium","Chlamydomonas","Amoeba","Spirogyra"], correctAnswer: "Amoeba", chapter: "ch1", concept: "Unicellular Organisms", skill: "Diagram Reading", difficulty: "Medium", prerequisites: ["Cell Structure"] },
  { id: "q7", number: 7, section: "A", maxMarks: 1, text: "Assertion-Reason on Combine & Ploughing.", options: ["Both true, R explains A","Both true, R doesn't explain A","A true, R false","A false, R true"], correctAnswer: "A false, R true", chapter: "ch3", concept: "Agricultural Implements", skill: "Critical Reasoning", difficulty: "Hard", prerequisites: ["Crop Production"] },
  { id: "q8", number: 8, section: "A", maxMarks: 1, text: "Best irrigation method during drought:", options: ["Drip irrigation","Moat","Lever system","Dhekli"], correctAnswer: "Drip irrigation", chapter: "ch3", concept: "Irrigation", skill: "Application", difficulty: "Easy", prerequisites: ["Crop Production"] },
  { id: "q9", number: 9, section: "A", maxMarks: 1, text: "Find the incorrect statement:", options: ["Hydra reproduces by budding","Amoeba by binary fission","Cloning is sexual","Butterfly is oviparous"], correctAnswer: "Cloning is sexual", chapter: "ch4", concept: "Asexual Reproduction", skill: "Analysis", difficulty: "Medium", prerequisites: ["Modes of Reproduction"] },
  { id: "q10", number: 10, section: "A", maxMarks: 1, text: "Why no chick hatched from market egg?", options: ["Hen only incubates own eggs","Market eggs not fertilised","Treated with chemicals","Too small"], correctAnswer: "Market eggs not fertilised", chapter: "ch4", concept: "Fertilization", skill: "Application", difficulty: "Medium", prerequisites: ["Fertilization"] },
  { id: "q11", number: 11, section: "B", maxMarks: 2, text: "What do we call unwanted plants growing with crops? How can we control them?", expected: "Unwanted plants = weeds. Controlled by weeding, weedicides, tilling.", chapter: "ch3", concept: "Weed Control", skill: "Explanation", difficulty: "Easy", prerequisites: ["Crop Production"] },
  { id: "q12", number: 12, section: "B", maxMarks: 2, text: "Raju takes excess antibiotics. Is it correct? Precautions?", expected: "No — causes resistance. Doctor's advice, full course, not for viral infections.", chapter: "ch2", concept: "Antibiotics & Medicine", skill: "Application", difficulty: "Medium", prerequisites: ["Microorganisms"] },
  { id: "q13", number: 13, section: "B", maxMarks: 2, text: "Two differences between egg and sperm.", expected: "Egg: larger, non-motile, nutrient-rich. Sperm: small, motile, has tail.", chapter: "ch4", concept: "Gametes", skill: "Compare & Contrast", difficulty: "Easy", prerequisites: ["Sexual Reproduction"] },
  { id: "q14", number: 14, section: "C", maxMarks: 4, text: "Four food preservation methods with examples.", expected: "Salting, sugar, oil, heating/cooling, drying — with home examples.", chapter: "ch2", concept: "Food Preservation", skill: "Recall & Apply", difficulty: "Easy", prerequisites: ["Microorganisms"] },
  { id: "q15", number: 15, section: "C", maxMarks: 4, text: "Draw a neat labelled diagram of the Female reproductive system.", expected: "Ovary, oviducts, uterus, cervix, vagina — labelled.", chapter: "ch4", concept: "Female Reproductive System", skill: "Diagram & Labelling", difficulty: "Hard", prerequisites: ["Sexual Reproduction"] },
  { id: "q16", number: 16, section: "D", maxMarks: 8, text: "Diseases table — polio organism, bacterial example, malaria prevention, chicken pox transmission.", expected: "i) Virus ii) TB/Cholera iii) Mosquito control iv) Air/Contact", chapter: "ch2", concept: "Communicable Diseases", skill: "Knowledge & Application", difficulty: "Medium", prerequisites: ["Microorganisms"] },
  { id: "q17", number: 17, section: "D", maxMarks: 8, text: "Asexual reproduction — define and explain two methods.", expected: "Single parent, no gametes. Budding (Hydra), Binary fission (Amoeba).", chapter: "ch4", concept: "Asexual Reproduction", skill: "Explanation & Examples", difficulty: "Medium", prerequisites: ["Modes of Reproduction"] },
];

// Prerequisite concept map — used in Analysis screen
export let CONCEPT_MAP = [
  { concept: "Fertilization", prerequisites: [], leadsTo: ["Internal Fertilization", "IVF"] },
  { concept: "Internal Fertilization", prerequisites: ["Fertilization"], leadsTo: ["IVF"] },
  { concept: "IVF", prerequisites: ["Internal Fertilization"], leadsTo: [] },
  { concept: "Metamorphosis", prerequisites: ["Frog Lifecycle"], leadsTo: [] },
  { concept: "Crop Production", prerequisites: [], leadsTo: ["Irrigation", "Weed Control", "Agricultural Implements"] },
  { concept: "Microorganisms", prerequisites: [], leadsTo: ["Communicable Diseases", "Food Preservation", "Antibiotics & Medicine"] },
  { concept: "Modes of Reproduction", prerequisites: [], leadsTo: ["Asexual Reproduction", "Sexual Reproduction"] },
];

export let STUDENTS = [
  { id: "stu-01", name: "Karan", roll: "08-01", total: 22, status: "review", imageUrls: ["/media/samples/answer_sheets/Karan.jpeg"] },
  { id: "stu-02", name: "Rahul", roll: "08-02", total: 26, status: "review", imageUrls: ["/media/samples/answer_sheets/Rahul.jpeg"] },
  { id: "stu-03", name: "Aryan", roll: "08-03", total: 30, status: "review", imageUrls: ["/media/samples/answer_sheets/Aryan.jpeg"] },
  { id: "stu-04", name: "Janu", roll: "08-04", total: 20, status: "review", imageUrls: ["/media/samples/answer_sheets/Janu.jpeg"] },
  { id: "stu-05", name: "Tara", roll: "08-05", total: 32, status: "review", imageUrls: ["/media/samples/answer_sheets/TARA_01.jpeg", "/media/samples/answer_sheets/TARA_02.jpeg"] },
  { id: "stu-06", name: "Dev", roll: "08-06", total: 28, status: "review", imageUrls: ["/media/samples/answer_sheets/Dev_01.jpeg", "/media/samples/answer_sheets/Dev_02.jpeg"] },
  { id: "stu-07", name: "Sanya", roll: "08-07", total: 24, status: "review", imageUrls: ["/media/samples/answer_sheets/Sanya_01.jpeg", "/media/samples/answer_sheets/Sanya_02.jpeg"] },
  { id: "stu-08", name: "Priya", roll: "08-08", total: 27, status: "review", imageUrls: ["/media/samples/answer_sheets/Priya_01.jpeg", "/media/samples/answer_sheets/Priya_02.jpeg"] },
];

export let EVALUATIONS = {
  "stu-01": [
    { qId: "q1", studentAnswer: "C) Hen", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Student selected \"Hen\" but correct answer is \"Humans\"." },
    { qId: "q2", studentAnswer: "C", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Correct option. IVF is performed when oviducts are blocked." },
    { qId: "q3", studentAnswer: "B", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Correct. Boiled drinking water prevents water-borne Hepatitis A." },
    { qId: "q4", studentAnswer: "D", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Correct. Wheat needs cool and dry weather." },
    { qId: "q5", studentAnswer: "B", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Both frog and butterfly undergo metamorphosis." },
    { qId: "q6", studentAnswer: "Amoeba", aiMark: 0, confidence: "low", confidenceScore: 50, needsReview: true, reasoning: "Handwriting unclear — verify the diagram-based answer." },
    { qId: "q7", studentAnswer: "A", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Incorrect. Combine is for harvesting, not ploughing." },
    { qId: "q8", studentAnswer: "A", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Drip irrigation conserves water during drought." },
    { qId: "q9", studentAnswer: "C", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Cloning is asexual; statement C is incorrect." },
    { qId: "q10", studentAnswer: "B", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Market eggs are not fertilised." },
    { qId: "q11", studentAnswer: "Unwanted plants are weeds. We remove them by hand.", aiMark: 1.0, confidence: "low", confidenceScore: 50, needsReview: true, reasoning: "Definition correct (1). Mentioned manual removal (0.5)." },
    { qId: "q12", studentAnswer: "No, antibiotics need doctor advice. Finish full course.", aiMark: 1.0, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Both parts addressed." },
    { qId: "q13", studentAnswer: "Egg is large. Sperm is small with tail.", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Two valid differences." },
    { qId: "q14", studentAnswer: "Salt - fish. Sugar - jam. Oil - pickle. Drying - papad.", aiMark: 3.0, confidence: "medium", confidenceScore: 75, needsReview: false, reasoning: "Four methods with valid examples." },
    { qId: "q15", studentAnswer: "[Diagram drawn]", aiMark: 1.5, confidence: "low", confidenceScore: 50, needsReview: true, reasoning: "Diagram present; labels partially clear." },
    { qId: "q16", studentAnswer: "i) Virus ii) TB iii) Mosquito nets iv) Air/Contact", aiMark: 6.5, confidence: "medium", confidenceScore: 81, needsReview: false, reasoning: "All four sub-parts correct." },
    { qId: "q17", studentAnswer: "One parent. Budding in Hydra. Binary fission in Amoeba.", aiMark: 5.5, confidence: "medium", confidenceScore: 68, needsReview: false, reasoning: "Definition (2/2), Budding (2/2), Binary fission (2/4)." },
  ],
  "stu-02": [
    { qId: "q1", studentAnswer: "C) Hen", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Student selected \"Hen\" but correct answer is \"Humans\"." },
    { qId: "q2", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct option. IVF is performed when oviducts are blocked." },
    { qId: "q3", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct. Boiled drinking water prevents water-borne Hepatitis A." },
    { qId: "q4", studentAnswer: "D", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct. Wheat needs cool and dry weather." },
    { qId: "q5", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both frog and butterfly undergo metamorphosis." },
    { qId: "q6", studentAnswer: "Amoeba", aiMark: 1, confidence: "low", confidenceScore: 99, needsReview: true, reasoning: "Handwriting unclear — verify the diagram-based answer." },
    { qId: "q7", studentAnswer: "A", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Incorrect. Combine is for harvesting, not ploughing." },
    { qId: "q8", studentAnswer: "A", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Drip irrigation conserves water during drought." },
    { qId: "q9", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Cloning is asexual; statement C is incorrect." },
    { qId: "q10", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Market eggs are not fertilised." },
    { qId: "q11", studentAnswer: "Unwanted plants are weeds. We remove them by hand.", aiMark: 1.5, confidence: "low", confidenceScore: 75, needsReview: true, reasoning: "Definition correct (1). Mentioned manual removal (0.5)." },
    { qId: "q12", studentAnswer: "No, antibiotics need doctor advice. Finish full course.", aiMark: 2, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both parts addressed." },
    { qId: "q13", studentAnswer: "Egg is large. Sperm is small with tail.", aiMark: 1.5, confidence: "low", confidenceScore: 75, needsReview: true, reasoning: "Two valid differences." },
    { qId: "q14", studentAnswer: "Salt - fish. Sugar - jam. Oil - pickle. Drying - papad.", aiMark: 4, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Four methods with valid examples." },
    { qId: "q15", studentAnswer: "[Diagram drawn]", aiMark: 2.5, confidence: "low", confidenceScore: 62, needsReview: true, reasoning: "Diagram present; labels partially clear." },
    { qId: "q16", studentAnswer: "i) Virus ii) TB iii) Mosquito nets iv) Air/Contact", aiMark: 7.0, confidence: "medium", confidenceScore: 87, needsReview: false, reasoning: "All four sub-parts correct." },
    { qId: "q17", studentAnswer: "One parent. Budding in Hydra. Binary fission in Amoeba.", aiMark: 6.0, confidence: "low", confidenceScore: 75, needsReview: true, reasoning: "Definition (2/2), Budding (2/2), Binary fission (2/4)." },
  ],
  "stu-03": [
    { qId: "q1", studentAnswer: "C) Hen", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Student selected \"Hen\" but correct answer is \"Humans\"." },
    { qId: "q2", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct option. IVF is performed when oviducts are blocked." },
    { qId: "q3", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct. Boiled drinking water prevents water-borne Hepatitis A." },
    { qId: "q4", studentAnswer: "D", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct. Wheat needs cool and dry weather." },
    { qId: "q5", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both frog and butterfly undergo metamorphosis." },
    { qId: "q6", studentAnswer: "Amoeba", aiMark: 1, confidence: "low", confidenceScore: 99, needsReview: true, reasoning: "Handwriting unclear — verify the diagram-based answer." },
    { qId: "q7", studentAnswer: "A", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Incorrect. Combine is for harvesting, not ploughing." },
    { qId: "q8", studentAnswer: "A", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Drip irrigation conserves water during drought." },
    { qId: "q9", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Cloning is asexual; statement C is incorrect." },
    { qId: "q10", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Market eggs are not fertilised." },
    { qId: "q11", studentAnswer: "Unwanted plants are weeds. We remove them by hand.", aiMark: 2, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Definition correct (1). Mentioned manual removal (0.5)." },
    { qId: "q12", studentAnswer: "No, antibiotics need doctor advice. Finish full course.", aiMark: 2, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both parts addressed." },
    { qId: "q13", studentAnswer: "Egg is large. Sperm is small with tail.", aiMark: 2, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Two valid differences." },
    { qId: "q14", studentAnswer: "Salt - fish. Sugar - jam. Oil - pickle. Drying - papad.", aiMark: 4, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Four methods with valid examples." },
    { qId: "q15", studentAnswer: "[Diagram drawn]", aiMark: 3.0, confidence: "low", confidenceScore: 75, needsReview: true, reasoning: "Diagram present; labels partially clear." },
    { qId: "q16", studentAnswer: "i) Virus ii) TB iii) Mosquito nets iv) Air/Contact", aiMark: 8, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "All four sub-parts correct." },
    { qId: "q17", studentAnswer: "One parent. Budding in Hydra. Binary fission in Amoeba.", aiMark: 7.0, confidence: "medium", confidenceScore: 87, needsReview: false, reasoning: "Definition (2/2), Budding (2/2), Binary fission (2/4)." },
  ],
  "stu-04": [
    { qId: "q1", studentAnswer: "C) Hen", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Student selected \"Hen\" but correct answer is \"Humans\"." },
    { qId: "q2", studentAnswer: "C", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Correct option. IVF is performed when oviducts are blocked." },
    { qId: "q3", studentAnswer: "B", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Correct. Boiled drinking water prevents water-borne Hepatitis A." },
    { qId: "q4", studentAnswer: "D", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Correct. Wheat needs cool and dry weather." },
    { qId: "q5", studentAnswer: "B", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Both frog and butterfly undergo metamorphosis." },
    { qId: "q6", studentAnswer: "Amoeba", aiMark: 0, confidence: "low", confidenceScore: 50, needsReview: true, reasoning: "Handwriting unclear — verify the diagram-based answer." },
    { qId: "q7", studentAnswer: "A", aiMark: 0, confidence: "high", confidenceScore: 55, needsReview: false, reasoning: "Incorrect. Combine is for harvesting, not ploughing." },
    { qId: "q8", studentAnswer: "A", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Drip irrigation conserves water during drought." },
    { qId: "q9", studentAnswer: "C", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Cloning is asexual; statement C is incorrect." },
    { qId: "q10", studentAnswer: "B", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Market eggs are not fertilised." },
    { qId: "q11", studentAnswer: "Unwanted plants are weeds. We remove them by hand.", aiMark: 0.5, confidence: "low", confidenceScore: 50, needsReview: true, reasoning: "Definition correct (1). Mentioned manual removal (0.5)." },
    { qId: "q12", studentAnswer: "No, antibiotics need doctor advice. Finish full course.", aiMark: 1.5, confidence: "medium", confidenceScore: 75, needsReview: false, reasoning: "Both parts addressed." },
    { qId: "q13", studentAnswer: "Egg is large. Sperm is small with tail.", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Two valid differences." },
    { qId: "q14", studentAnswer: "Salt - fish. Sugar - jam. Oil - pickle. Drying - papad.", aiMark: 3.0, confidence: "medium", confidenceScore: 75, needsReview: false, reasoning: "Four methods with valid examples." },
    { qId: "q15", studentAnswer: "[Diagram drawn]", aiMark: 1.5, confidence: "low", confidenceScore: 50, needsReview: true, reasoning: "Diagram present; labels partially clear." },
    { qId: "q16", studentAnswer: "i) Virus ii) TB iii) Mosquito nets iv) Air/Contact", aiMark: 6.5, confidence: "medium", confidenceScore: 81, needsReview: false, reasoning: "All four sub-parts correct." },
    { qId: "q17", studentAnswer: "One parent. Budding in Hydra. Binary fission in Amoeba.", aiMark: 4.5, confidence: "low", confidenceScore: 56, needsReview: true, reasoning: "Definition (2/2), Budding (2/2), Binary fission (2/4)." },
  ],
  "stu-05": [
    { qId: "q1", studentAnswer: "C) Hen", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Student selected \"Hen\" but correct answer is \"Humans\"." },
    { qId: "q2", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct option. IVF is performed when oviducts are blocked." },
    { qId: "q3", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct. Boiled drinking water prevents water-borne Hepatitis A." },
    { qId: "q4", studentAnswer: "D", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct. Wheat needs cool and dry weather." },
    { qId: "q5", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both frog and butterfly undergo metamorphosis." },
    { qId: "q6", studentAnswer: "Amoeba", aiMark: 1, confidence: "low", confidenceScore: 99, needsReview: true, reasoning: "Handwriting unclear — verify the diagram-based answer." },
    { qId: "q7", studentAnswer: "A", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Incorrect. Combine is for harvesting, not ploughing." },
    { qId: "q8", studentAnswer: "A", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Drip irrigation conserves water during drought." },
    { qId: "q9", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Cloning is asexual; statement C is incorrect." },
    { qId: "q10", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Market eggs are not fertilised." },
    { qId: "q11", studentAnswer: "Unwanted plants are weeds. We remove them by hand.", aiMark: 2, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Definition correct (1). Mentioned manual removal (0.5)." },
    { qId: "q12", studentAnswer: "No, antibiotics need doctor advice. Finish full course.", aiMark: 2, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both parts addressed." },
    { qId: "q13", studentAnswer: "Egg is large. Sperm is small with tail.", aiMark: 2, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Two valid differences." },
    { qId: "q14", studentAnswer: "Salt - fish. Sugar - jam. Oil - pickle. Drying - papad.", aiMark: 4, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Four methods with valid examples." },
    { qId: "q15", studentAnswer: "[Diagram drawn]", aiMark: 4, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Diagram present; labels partially clear." },
    { qId: "q16", studentAnswer: "i) Virus ii) TB iii) Mosquito nets iv) Air/Contact", aiMark: 8, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "All four sub-parts correct." },
    { qId: "q17", studentAnswer: "One parent. Budding in Hydra. Binary fission in Amoeba.", aiMark: 6.5, confidence: "medium", confidenceScore: 81, needsReview: false, reasoning: "Definition (2/2), Budding (2/2), Binary fission (2/4)." },
  ],
  "stu-06": [
    { qId: "q1", studentAnswer: "C) Hen", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Student selected \"Hen\" but correct answer is \"Humans\"." },
    { qId: "q2", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct option. IVF is performed when oviducts are blocked." },
    { qId: "q3", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct. Boiled drinking water prevents water-borne Hepatitis A." },
    { qId: "q4", studentAnswer: "D", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct. Wheat needs cool and dry weather." },
    { qId: "q5", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both frog and butterfly undergo metamorphosis." },
    { qId: "q6", studentAnswer: "Amoeba", aiMark: 1, confidence: "low", confidenceScore: 99, needsReview: true, reasoning: "Handwriting unclear — verify the diagram-based answer." },
    { qId: "q7", studentAnswer: "A", aiMark: 0, confidence: "high", confidenceScore: 52, needsReview: false, reasoning: "Incorrect. Combine is for harvesting, not ploughing." },
    { qId: "q8", studentAnswer: "A", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Drip irrigation conserves water during drought." },
    { qId: "q9", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Cloning is asexual; statement C is incorrect." },
    { qId: "q10", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Market eggs are not fertilised." },
    { qId: "q11", studentAnswer: "Unwanted plants are weeds. We remove them by hand.", aiMark: 1.5, confidence: "medium", confidenceScore: 75, needsReview: false, reasoning: "Definition correct (1). Mentioned manual removal (0.5)." },
    { qId: "q12", studentAnswer: "No, antibiotics need doctor advice. Finish full course.", aiMark: 2, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both parts addressed." },
    { qId: "q13", studentAnswer: "Egg is large. Sperm is small with tail.", aiMark: 2, confidence: "low", confidenceScore: 99, needsReview: true, reasoning: "Two valid differences." },
    { qId: "q14", studentAnswer: "Salt - fish. Sugar - jam. Oil - pickle. Drying - papad.", aiMark: 4, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Four methods with valid examples." },
    { qId: "q15", studentAnswer: "[Diagram drawn]", aiMark: 2.5, confidence: "low", confidenceScore: 62, needsReview: true, reasoning: "Diagram present; labels partially clear." },
    { qId: "q16", studentAnswer: "i) Virus ii) TB iii) Mosquito nets iv) Air/Contact", aiMark: 7.5, confidence: "medium", confidenceScore: 93, needsReview: false, reasoning: "All four sub-parts correct." },
    { qId: "q17", studentAnswer: "One parent. Budding in Hydra. Binary fission in Amoeba.", aiMark: 6.0, confidence: "medium", confidenceScore: 75, needsReview: false, reasoning: "Definition (2/2), Budding (2/2), Binary fission (2/4)." },
  ],
  "stu-07": [
    { qId: "q1", studentAnswer: "C) Hen", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Student selected \"Hen\" but correct answer is \"Humans\"." },
    { qId: "q2", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct option. IVF is performed when oviducts are blocked." },
    { qId: "q3", studentAnswer: "B", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Correct. Boiled drinking water prevents water-borne Hepatitis A." },
    { qId: "q4", studentAnswer: "D", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Correct. Wheat needs cool and dry weather." },
    { qId: "q5", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both frog and butterfly undergo metamorphosis." },
    { qId: "q6", studentAnswer: "Amoeba", aiMark: 0.5, confidence: "low", confidenceScore: 50, needsReview: true, reasoning: "Handwriting unclear — verify the diagram-based answer." },
    { qId: "q7", studentAnswer: "A", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Incorrect. Combine is for harvesting, not ploughing." },
    { qId: "q8", studentAnswer: "A", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Drip irrigation conserves water during drought." },
    { qId: "q9", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Cloning is asexual; statement C is incorrect." },
    { qId: "q10", studentAnswer: "B", aiMark: 0.5, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Market eggs are not fertilised." },
    { qId: "q11", studentAnswer: "Unwanted plants are weeds. We remove them by hand.", aiMark: 1.0, confidence: "low", confidenceScore: 50, needsReview: true, reasoning: "Definition correct (1). Mentioned manual removal (0.5)." },
    { qId: "q12", studentAnswer: "No, antibiotics need doctor advice. Finish full course.", aiMark: 2, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both parts addressed." },
    { qId: "q13", studentAnswer: "Egg is large. Sperm is small with tail.", aiMark: 1.0, confidence: "medium", confidenceScore: 50, needsReview: false, reasoning: "Two valid differences." },
    { qId: "q14", studentAnswer: "Salt - fish. Sugar - jam. Oil - pickle. Drying - papad.", aiMark: 3.5, confidence: "medium", confidenceScore: 87, needsReview: false, reasoning: "Four methods with valid examples." },
    { qId: "q15", studentAnswer: "[Diagram drawn]", aiMark: 2.0, confidence: "low", confidenceScore: 50, needsReview: true, reasoning: "Diagram present; labels partially clear." },
    { qId: "q16", studentAnswer: "i) Virus ii) TB iii) Mosquito nets iv) Air/Contact", aiMark: 6.5, confidence: "medium", confidenceScore: 81, needsReview: false, reasoning: "All four sub-parts correct." },
    { qId: "q17", studentAnswer: "One parent. Budding in Hydra. Binary fission in Amoeba.", aiMark: 6.0, confidence: "low", confidenceScore: 75, needsReview: true, reasoning: "Definition (2/2), Budding (2/2), Binary fission (2/4)." },
  ],
  "stu-08": [
    { qId: "q1", studentAnswer: "C) Hen", aiMark: 0, confidence: "high", confidenceScore: 50, needsReview: false, reasoning: "Student selected \"Hen\" but correct answer is \"Humans\"." },
    { qId: "q2", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct option. IVF is performed when oviducts are blocked." },
    { qId: "q3", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct. Boiled drinking water prevents water-borne Hepatitis A." },
    { qId: "q4", studentAnswer: "D", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Correct. Wheat needs cool and dry weather." },
    { qId: "q5", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both frog and butterfly undergo metamorphosis." },
    { qId: "q6", studentAnswer: "Amoeba", aiMark: 1, confidence: "low", confidenceScore: 99, needsReview: true, reasoning: "Handwriting unclear — verify the diagram-based answer." },
    { qId: "q7", studentAnswer: "A", aiMark: 0, confidence: "high", confidenceScore: 54, needsReview: false, reasoning: "Incorrect. Combine is for harvesting, not ploughing." },
    { qId: "q8", studentAnswer: "A", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Drip irrigation conserves water during drought." },
    { qId: "q9", studentAnswer: "C", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Cloning is asexual; statement C is incorrect." },
    { qId: "q10", studentAnswer: "B", aiMark: 1, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Market eggs are not fertilised." },
    { qId: "q11", studentAnswer: "Unwanted plants are weeds. We remove them by hand.", aiMark: 1.5, confidence: "medium", confidenceScore: 75, needsReview: false, reasoning: "Definition correct (1). Mentioned manual removal (0.5)." },
    { qId: "q12", studentAnswer: "No, antibiotics need doctor advice. Finish full course.", aiMark: 2, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Both parts addressed." },
    { qId: "q13", studentAnswer: "Egg is large. Sperm is small with tail.", aiMark: 1.5, confidence: "low", confidenceScore: 75, needsReview: true, reasoning: "Two valid differences." },
    { qId: "q14", studentAnswer: "Salt - fish. Sugar - jam. Oil - pickle. Drying - papad.", aiMark: 4, confidence: "high", confidenceScore: 99, needsReview: false, reasoning: "Four methods with valid examples." },
    { qId: "q15", studentAnswer: "[Diagram drawn]", aiMark: 2.5, confidence: "low", confidenceScore: 62, needsReview: true, reasoning: "Diagram present; labels partially clear." },
    { qId: "q16", studentAnswer: "i) Virus ii) TB iii) Mosquito nets iv) Air/Contact", aiMark: 7.0, confidence: "medium", confidenceScore: 87, needsReview: false, reasoning: "All four sub-parts correct." },
    { qId: "q17", studentAnswer: "One parent. Budding in Hydra. Binary fission in Amoeba.", aiMark: 6.0, confidence: "medium", confidenceScore: 75, needsReview: false, reasoning: "Definition (2/2), Budding (2/2), Binary fission (2/4)." },
  ],
};

export let SCORE_DISTRIBUTION = [
  { range: "0-10", count: 2 },
  { range: "11-20", count: 6 },
  { range: "21-25", count: 9 },
  { range: "26-30", count: 14 },
  { range: "31-35", count: 8 },
  { range: "36-40", count: 3 },
];

export let LEARNING_GAPS = [
  { topic: "Diagram of Female Reproductive System (Q15)", studentsStruggled: 25, percentage: 60 },
  { topic: "Assertion-Reason on Combine machine (Q7)", studentsStruggled: 22, percentage: 52 },
  { topic: "Asexual reproduction — Binary fission detail (Q17)", studentsStruggled: 18, percentage: 43 },
  { topic: "Fertilization odd-one-out (Q1)", studentsStruggled: 15, percentage: 36 },
  { topic: "Weed control methods — naming weedicides (Q11)", studentsStruggled: 13, percentage: 31 },
];

// Concept mastery across class (from AI grading roll-up)
export let CONCEPT_MASTERY = [
  { concept: "Crop Seasons", chapter: "ch3", mastery: 88, attempts: 42 },
  { concept: "Irrigation", chapter: "ch3", mastery: 84, attempts: 42 },
  { concept: "Food Preservation", chapter: "ch2", mastery: 79, attempts: 42 },
  { concept: "Antibiotics & Medicine", chapter: "ch2", mastery: 72, attempts: 42 },
  { concept: "Communicable Diseases", chapter: "ch2", mastery: 68, attempts: 42 },
  { concept: "Crop Production", chapter: "ch3", mastery: 64, attempts: 42 },
  { concept: "Asexual Reproduction", chapter: "ch4", mastery: 57, attempts: 42 },
  { concept: "Gametes", chapter: "ch4", mastery: 54, attempts: 42 },
  { concept: "Weed Control", chapter: "ch3", mastery: 52, attempts: 42 },
  { concept: "Fertilization", chapter: "ch4", mastery: 48, attempts: 42 },
  { concept: "Unicellular Organisms", chapter: "ch1", mastery: 46, attempts: 42 },
  { concept: "Metamorphosis", chapter: "ch4", mastery: 41, attempts: 42 },
  { concept: "Female Reproductive System", chapter: "ch4", mastery: 38, attempts: 42 },
  { concept: "Agricultural Implements", chapter: "ch3", mastery: 35, attempts: 42 },
  { concept: "IVF", chapter: "ch4", mastery: 32, attempts: 42 },
];

export let CHAPTER_PERFORMANCE = [
  { id: "ch1", name: "Cell — Structure & Functions", mastery: 46, questions: 1 },
  { id: "ch2", name: "Microorganisms", mastery: 73, questions: 4 },
  { id: "ch3", name: "Crop Production", mastery: 65, questions: 4 },
  { id: "ch4", name: "Reproduction in Animals", mastery: 45, questions: 8 },
];

export let ROOT_CAUSE_INSIGHTS = [
  { id: "rc1", insight: "72% of students who struggled with IVF also struggled with Fertilization, indicating a prerequisite knowledge gap.", linkedConcepts: ["IVF", "Fertilization"], severity: "high" },
  { id: "rc2", insight: "58% of students who missed Metamorphosis questions had weak Frog Lifecycle understanding — revisit the foundational concept.", linkedConcepts: ["Metamorphosis", "Frog Lifecycle"], severity: "medium" },
  { id: "rc3", insight: "Diagram-based questions (Q6, Q15) show 40% lower scores than text answers — consider more in-class diagram practice.", linkedConcepts: ["Female Reproductive System", "Unicellular Organisms"], severity: "medium" },
];

export let INTERVENTION_LIST = [
  { studentId: "stu-01", name: "Karan", roll: "08-01", score: 22, weakConcepts: ["IVF", "Agricultural Implements", "Binary Fission"], priority: "high" },
  { studentId: "stu-04", name: "Janu", roll: "08-04", score: 18, weakConcepts: ["Fertilization", "IVF", "Female Reproductive System"], priority: "high" },
  { studentId: "stu-07", name: "Sanya", roll: "08-07", score: 24, weakConcepts: ["Metamorphosis", "Asexual Reproduction"], priority: "medium" },
  { studentId: "stu-02", name: "Rahul", roll: "08-02", score: 26, weakConcepts: ["Female Reproductive System"], priority: "low" },
];

// Per-student concept profile (for the Student Learning Profile page)
export let STUDENT_PROFILES = {
  "stu-02": {
    strong: [
      { concept: "Crop Production", chapter: "ch3", mastery: 92 },
      { concept: "Irrigation", chapter: "ch3", mastery: 90 },
      { concept: "Food Preservation", chapter: "ch2", mastery: 88 },
      { concept: "Communicable Diseases", chapter: "ch2", mastery: 85 },
    ],
    developing: [
      { concept: "Fertilization", chapter: "ch4", mastery: 60 },
      { concept: "Asexual Reproduction", chapter: "ch4", mastery: 65 },
      { concept: "Weed Control", chapter: "ch3", mastery: 70 },
    ],
    weak: [
      { concept: "IVF", chapter: "ch4", mastery: 30 },
      { concept: "Metamorphosis", chapter: "ch4", mastery: 35 },
      { concept: "Female Reproductive System", chapter: "ch4", mastery: 38 },
    ],
    misconceptions: [
      "Student understands the source of gametes but cannot explain their role in fertilization.",
      "Confuses IVF with asexual reproduction in long-answer questions.",
      "Labels female reproductive parts but reverses the function of oviducts and uterus.",
    ],
  },
};

export let INTERVENTION_ACTIONS = [
  { id: "act-1", concept: "IVF", chapter: "Reproduction in Animals", priority: "high", studentsAffected: 39, action: "Re-teach Fertilization before revisiting IVF. Use a short video and a labelled diagram." },
  { id: "act-2", concept: "Metamorphosis", chapter: "Reproduction in Animals", priority: "high", studentsAffected: 23, action: "Conduct a revision activity on Metamorphosis using the frog lifecycle chart." },
  { id: "act-3", concept: "Female Reproductive System", chapter: "Reproduction in Animals", priority: "high", studentsAffected: 25, action: "Use diagram-based exercises on the male and female reproductive system." },
  { id: "act-4", concept: "Internal Fertilization", chapter: "Reproduction in Animals", priority: "medium", studentsAffected: 12, action: "Run a 15-minute recap of Internal Fertilization with worked examples and a quick exit quiz." },
  { id: "act-5", concept: "Agricultural Implements", chapter: "Crop Production & Management", priority: "medium", studentsAffected: 22, action: "Hands-on demo of ploughs, hoes, combine — clarify which tool is used at which stage of farming." },
  { id: "act-6", concept: "Asexual Reproduction", chapter: "Reproduction in Animals", priority: "medium", studentsAffected: 18, action: "Show short videos of Hydra budding and Amoeba binary fission. Compare with sexual reproduction." },
  { id: "act-7", concept: "Weed Control", chapter: "Crop Production & Management", priority: "low", studentsAffected: 13, action: "Quick name-drop activity: list local weedicides and discuss safe usage." },
];

export let ASSESSMENT_STATUS_LABEL = {
  review: "needs review",
  complete: "complete",
  draft: "draft",
  processing: "processing",
};

export let getAssessment = (id) => ASSESSMENTS.find((a) => a.id === id) || ASSESSMENTS[0];
export let getEvaluationForStudent = (studentId) => EVALUATIONS[studentId] || EVALUATIONS["stu-02"];
export let getStudentProfile = (studentId) => STUDENT_PROFILES[studentId] || STUDENT_PROFILES["stu-02"];

// ── Cross-assessment trend data (Term 2: Nov 2025 – Feb 2026) ──
// Score timelines per student across 4 assessments (oldest → newest)
export let STUDENT_TERM_TRENDS = {
  "stu-02": [
    { assessmentId: "asm-003", name: "FA2 — Cell Structure", date: "2026-01-05", totalMarks: 25, studentScore: 14, classAvg: 18.1 },
    { assessmentId: "asm-002", name: "Unit Test — Microorganisms", date: "2026-01-22", totalMarks: 20, studentScore: 13, classAvg: 14.2 },
    { assessmentId: "asm-001", name: "SA1 — Biological Science", date: "2026-02-08", totalMarks: 40, studentScore: 28, classAvg: 27.4 },
    { assessmentId: "asm-004", name: "Practice Quiz — Crop Production", date: "2026-02-10", totalMarks: 15, studentScore: 11, classAvg: 11.3 },
  ],
  "stu-01": [
    { assessmentId: "asm-003", name: "FA2 — Cell Structure", date: "2026-01-05", totalMarks: 25, studentScore: 19, classAvg: 18.1 },
    { assessmentId: "asm-002", name: "Unit Test — Microorganisms", date: "2026-01-22", totalMarks: 20, studentScore: 16, classAvg: 14.2 },
    { assessmentId: "asm-001", name: "SA1 — Biological Science", date: "2026-02-08", totalMarks: 40, studentScore: 32, classAvg: 27.4 },
    { assessmentId: "asm-004", name: "Practice Quiz — Crop Production", date: "2026-02-10", totalMarks: 15, studentScore: 13, classAvg: 11.3 },
  ],
};

// Concept mastery evolution per student (selected key concepts)
export let STUDENT_CONCEPT_TRENDS = {
  "stu-02": [
    { concept: "Fertilization", chapter: "ch4", history: [40, 45, 55, 60], trend: "up", delta: 20 },
    { concept: "IVF", chapter: "ch4", history: [20, 22, 28, 30], trend: "up", delta: 10 },
    { concept: "Metamorphosis", chapter: "ch4", history: [45, 42, 38, 35], trend: "down", delta: -10 },
    { concept: "Crop Production", chapter: "ch3", history: [70, 78, 88, 92], trend: "up", delta: 22 },
    { concept: "Communicable Diseases", chapter: "ch2", history: [60, 70, 80, 85], trend: "up", delta: 25 },
    { concept: "Female Reproductive System", chapter: "ch4", history: [50, 45, 40, 38], trend: "down", delta: -12 },
  ],
};

export let getStudentTermTrend = (studentId) => STUDENT_TERM_TRENDS[studentId] || STUDENT_TERM_TRENDS["stu-02"];
export let getStudentConceptTrend = (studentId) => STUDENT_CONCEPT_TRENDS[studentId] || STUDENT_CONCEPT_TRENDS["stu-02"];
