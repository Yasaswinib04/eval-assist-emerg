import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as mockData from '../../frontend/src/data/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.join(__dirname, 'data');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

function writeJson(filename, data) {
    fs.writeFileSync(path.join(outDir, filename), JSON.stringify(data, null, 2));
}

writeJson('assessments.json', mockData.ASSESSMENTS);
writeJson('questions.json', mockData.QUESTIONS);
writeJson('students.json', mockData.STUDENTS);
writeJson('evaluations.json', mockData.EVALUATIONS);
writeJson('interventions.json', mockData.INTERVENTION_ACTIONS);
writeJson('chapters.json', mockData.CHAPTERS);

console.log('Mock data extracted to JSON successfully.');
