import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import { PDFDocument } from "pdf-lib";
import { fileURLToPath } from "url";
import path from "path";

// Define __dirname manually for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const formatDateForPDF = () => {
    const now = new Date();
    const dayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });
    const month = now.toLocaleString('en-US', { month: 'long' });
    const day = now.getDate();
    const year = now.getFullYear();

    // Add ordinal suffix to the day
    const getOrdinalSuffix = (num) => {
        if (num > 3 && num < 21) return "th"; // Covers 11th-19th
        switch (num % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    };

    return `${dayOfWeek}, ${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
};

const formatTimeForPDF = (time) => {
    let [hour, minute] = time.split(":").map(Number);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12; // Convert to 12-hour format

    return `At approximately ${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
};

// Function to wrap text to fit the Statement of Facts field correctly
const formatNarrativeText = (text, wordsPerLine = 7) => {
    const words = text.split(/\s+/);
    let formattedText = "";
    for (let i = 0; i < words.length; i++) {
        formattedText += words[i] + " ";
        if ((i + 1) % wordsPerLine === 0) {
            formattedText = formattedText.trim() + "\n"; 
        }
    }
    return formattedText.trim();
};



// ✅ **434 REPORT GENERATION ENDPOINT**
app.post("/generate-report", async (req, res) => {
    try {
        console.log("🔹 Received request for /generate-report");
        console.log("🔹 Request Body:", req.body);

        const { officerName, badgeNumber, assignedArea, incidentTime, incidentDetails, healthcare, mentalHealth, restrictiveHousing, inmates } = req.body;

        if (!officerName || !badgeNumber || !assignedArea || !incidentTime || !incidentDetails || !inmates || inmates.length === 0) {
            console.error("❌ Missing required fields for report generation.");
            return res.status(400).json({ error: "Missing required fields. Please fill out all required inputs." });
        }

        console.log("✅ Generating 434 Report...");

// ✅ Create base prompt
let basePrompt = `
On ${formatDateForPDF()}, ${formatTimeForPDF(incidentTime)}, I C/O ${officerName} #${badgeNumber} was assigned to ${assignedArea}.
While conducting my assigned duties, I observed an incident involving an individual in custody.

Incident Summary: ${incidentDetails}
`;

let inmateNamesList = [];
inmates.forEach((inmate, index) => {
    basePrompt += `\nInmate ${index + 1}: ${inmate.name} (ID: ${inmate.id})`;
    inmateNamesList.push(`${inmate.name} (ID: ${inmate.id})`);
});

if (healthcare === "yes") basePrompt += "\nThe individual was taken to the Healthcare unit where they were evaluated by healthcare and mental health staff.";
if (mentalHealth === "yes") basePrompt += "\nThe individual was evaluated by mental health staff.";
if (restrictiveHousing === "yes") basePrompt += "\nThe individual was taken to N2 restrictive housing.";

basePrompt += `\n\nProper chain of command was notified, and ${inmateNamesList.join(", ")} was identified by state-issued ID and Offender 360.`;

// ✅ ADD THIS! (forces it to "stretch out" naturally)
basePrompt += `
Expand the report naturally by describing the inmate's behavior in more detail (movement, tone, any emotional state if observed), how the area looked, any radio communications made, how staff assisted, any brief waiting time for medical attention, and the formal process of securing the scene if needed. 
Do not add fake events, just flesh out the real ones realistically and professionally to fill the full Statement of Facts.
`;

        console.log("🔹 Sending request to OpenAI for 434 Report...");

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125",
            messages: [
                {
                    role: "system",
                    content: `
You are an expert at writing correctional officer incident reports.
Follow these rules VERY carefully:

- The report must be written as ONE continuous paragraph, using full formal sentences.
- DO NOT use headings like "Incident Summary:" or "Inmate involved:".
- DO NOT insert unnecessary line breaks.
- DO NOT skip important details unless absolutely irrelevant.
- Write naturally, just like an official correctional report would be written.

- Keep the report concise **but detailed enough to use most of the Statement of Facts area**.
- If needed, naturally elaborate on reasonable details:
  - Describe where the inmate was located (e.g., "in the corridor", "by the dayroom", "near the showers").
  - Mention observations like inmate behavior, surroundings, visible damage, or medical conditions noticed.
  - Clarify actions taken: giving verbal commands, radioing for assistance, ensuring scene safety, securing evidence if needed.
  - Ensure the narrative sounds completely natural and professional.

The structure must be:

1. Start with:
   "On (Day of the Week), (Month) (Day), (Year), at approximately (time), I C/O (Full Name) #BadgeNumber was assigned to (Assignment)."
2. Continue immediately into a full natural description of the incident in past tense.
3. If medical care was needed:
   - Say "The individual was escorted to the Healthcare Unit for evaluation by healthcare and mental health staff."
4. If restrictive housing was used:
   - Say "The individual was then placed in N2 restrictive housing."
5. End by saying:
   - "Proper chain of command was notified, and (inmate(s) full name with ID) was identified by state-issued ID and Offender 360."

⚡ VERY IMPORTANT:
After the full paragraph narrative is finished, **add a plain text checklist** at the bottom.

Checklist output must exactly match this format (all lowercase true or false):

weapon: true  
propdmg: false  
arrests: false  
media: false  
restraintforce: true  
chemoc: false  
unitLE: false  
injHosp: true

Definition rules:
- weapon: true if any weapon (knife, blade, shank, etc.) was involved.
- propdmg: true if any property was damaged (equipment, floors, doors, etc.).
- arrests: true if the inmate or anyone was formally arrested.
- media: true if media inquiries were made.
- restraintforce: true if physical force, restraints, OC spray, or takedown happened.
- chemoc: true if chemical agents like OC spray were used.
- unitLE: true if any external law enforcement agency (not staff) was contacted.
- injHosp: true if injuries occurred or hospitalization was required.

⚡ Checklist must only say true or false. No extra text. No explanations.

⚡ Return ONLY the narrative followed by the checklist. No extra commentary. No extra sections.



                `
                }
                
,                
                { role: "user", content: `Generate a professional 434 incident report based on these details:\n\n${basePrompt}` },
            ],
        });

        if (!response.choices || response.choices.length === 0) {
            throw new Error("Invalid response from OpenAI");
        }
        
// ✅ Split and clean the AI result
let rawAIResponse = response.choices[0].message.content.trim();

// Splitting narrative and checklist
const [narrativePart, checklistPart] = rawAIResponse.split("weapon:");

// Cleaning them
let cleanNarrative = narrativePart.replace(/\n+/g, ' ').trim();
let checklistFixed = "weapon:" + checklistPart.trim();

const templatePath = path.join(__dirname, "doc0434 Incident Report.pdf");

console.log("📄 Looking for PDF template at:", templatePath);

if (!fs.existsSync(templatePath)) {
    console.error("❌ PDF template not found at:", templatePath);
    return res.status(500).json({ error: "PDF template file is missing!" });
}

const pdfBytes = fs.readFileSync(templatePath);
const pdfDoc = await PDFDocument.load(pdfBytes);
const form = pdfDoc.getForm();

// Log all field names in the PDF
console.log("🔍 Available Form Fields in PDF:");
const fields = form.getFields();
fields.forEach(field => {
    console.log(`📌 Field Name: "${field.getName()}"`);
});

try {

// ✅ Define formatShortTime FIRST
const formatShortTime = (time) => {
    let [hour, minute] = time.split(":").map(Number);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12; // 0 becomes 12
    return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
};

// ✅ Parse Checklist
const checklistFlags = {
    weapon: false,
    propdmg: false,
    arrests: false,
    media: false,
    restraintforce: false,
    chemoc: false,
    unitLE: false,
    injHosp: false,
};

// Check if checklistFixed contains keywords and set flags
if (checklistFixed.includes("weapon: true")) checklistFlags.weapon = true;
if (checklistFixed.includes("propdmg: true")) checklistFlags.propdmg = true;
if (checklistFixed.includes("arrests: true")) checklistFlags.arrests = true;
if (checklistFixed.includes("media: true")) checklistFlags.media = true;
if (checklistFixed.includes("restraintforce: true")) checklistFlags.restraintforce = true;
if (checklistFixed.includes("chemoc: true")) checklistFlags.chemoc = true;
if (checklistFixed.includes("unitLE: true")) checklistFlags.unitLE = true;
if (checklistFixed.includes("injHosp: true")) checklistFlags.injHosp = true;

// ✅ Automatically check or uncheck each box
Object.entries(checklistFlags).forEach(([field, shouldCheck]) => {
    const checkbox = form.getCheckBox(field);
    if (shouldCheck) {
        checkbox.check();
    } else {
        checkbox.uncheck();
    }
});



// ✅ Set basic fields
form.getTextField("Incident Number").setText("");
form.getTextField("Type of Incident").setText("");
form.getTextField("If the answer is yes to any of the following questions explain in narrative below").setText("Menard CC");
form.getTextField("Date of Incident").setText(formatDateForPDF());
form.getTextField("Time of Incident").setText(formatShortTime(incidentTime));

// ✅ Set Inmate Names (if available, else leave blank)
form.getTextField("Name 1").setText(inmates.length > 0 ? inmates[0].name : "");
form.getTextField("Name 2").setText(inmates.length > 1 ? inmates[1].name : "");
form.getTextField("Name 3").setText(inmates.length > 2 ? inmates[2].name : "");

// ✅ Set Inmate IDs (if available, else leave blank)
form.getTextField("ID 1").setText(inmates.length > 0 ? inmates[0].id : "");
form.getTextField("ID 2").setText(inmates.length > 1 ? inmates[1].id : "");
form.getTextField("ID 3").setText(inmates.length > 2 ? inmates[2].id : "");

// ✅ Format and set the Narrative properly
const formatNarrativeText = (text, wordsPerLine = 7) => {
    const words = text.split(/\s+/);
    let formattedText = "";

    for (let i = 0; i < words.length; i++) {
        formattedText += words[i] + " ";
        if ((i + 1) % wordsPerLine === 0) {
            formattedText = formattedText.trim() + "\n"; // Add line break after X words
        }
    }

    return formattedText.trim();
};

const formattedNarrative = formatNarrativeText(cleanNarrative, 44);

const safeNarrative = formattedNarrative.length > 2500 
    ? formattedNarrative.slice(0, 2500) 
    : formattedNarrative;

const narrativeField = form.getTextField("Statement of Facts NARRATIVE");
narrativeField.setFontSize(11.2); // Nice readable font size
narrativeField.setText(safeNarrative);





        } catch (error) {
            console.error("❌ Error setting PDF fields:", error);
            return res.status(500).json({ error: "PDF form fields could not be set." });
        }

        const updatedPdfBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, "generated_report.pdf");
        fs.writeFileSync(outputPath, updatedPdfBytes);

        console.log("✅ Successfully generated PDF Report.");

        // ✅ Set correct response headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'inline; filename="434_Incident_Report.pdf"');

        // ✅ Send the actual binary PDF data (NOT JSON)
        res.send(Buffer.from(updatedPdfBytes));

    } catch (error) {
        console.error("❌ Error generating report:", error);
        res.status(500).json({ error: "Failed to generate PDF report." });
    }
});

// ✅ **Offense Code Mapping**
const offenseCodes = {
    "Possession of Money": "312 - Possession of Money",
    "Disobeying a Direct Order": "313 - Disobeying a Direct Order",
    "Health, Smoking, or Safety Violations": "402 - Health, Smoking, or Safety Violations",
    "Violation of Rules": "404 - Violation of Rules",
    "Failure to Report": "405 - Failure to Report",
    "Trading or Trafficking": "406 - Trading or Trafficking",
    "Violating State or Federal Laws": "501 - Violating State or Federal Laws",
    "Aiding and Abetting, Attempt, Solicitation, or Conspiracy": "601 - Aiding and Abetting, Attempt, Solicitation, or Conspiracy",
    "Drugs and Drug Paraphernalia": "203 - Drugs and Drug Paraphernalia",
    "Forgery": "204 - Forgery",
    "Security Threat Group or Unauthorized Organizational Activity": "205 - Security Threat Group or Unauthorized Organizational Activity",
    "Intimidation or Threats": "206 - Intimidation or Threats",
    "Dangerous Communications": "208 - Dangerous Communications",
    "Dangerous Written Material": "209 - Dangerous Written Material",
    "Impairment of Surveillance": "210 - Impairment of Surveillance",
    "Possession or Solicitation of Unauthorized Personal Information": "211 - Possession or Solicitation of Unauthorized Personal Information",
    "Frivolous Lawsuit": "212 - Frivolous Lawsuit",
    "Failure to Reveal Assets": "213 - Failure to Reveal Assets",
    "Fighting": "214 - Fighting",
    "Disobeying a Direct Order Essential to Safety and Security": "215 - Disobeying a Direct Order Essential to Safety and Security",
    "Gambling": "302 - Gambling",
    "Giving False Information to an Employee": "303 - Giving False Information to an Employee",
    "Theft": "305 - Theft",
    "Insolence": "304 - Insolence",
    "Transfer of Funds": "306 - Transfer of Funds",
    "Unauthorized Movement": "307 - Unauthorized Movement",
    "Contraband or Unauthorized Property": "308 - Contraband or Unauthorized Property",
    "Petitions, Postings, and Business Ventures": "309 - Petitions, Postings, and Business Ventures",
    "Abuse of Privileges": "310 - Abuse of Privileges",
    "Failure to Submit to Medical or Forensic Tests": "311 - Failure to Submit to Medical or Forensic Tests"
};

// ✅ **TICKET GENERATION ENDPOINT**
app.post("/generate-ticket", async (req, res) => {
    try {
        console.log("🔹 Received request for /generate-ticket");
        console.log("🔹 Request Body:", req.body);

        const { officerName, badgeNumber, assignedArea, incidentTime, incidentDetails, healthcare, mentalHealth, restrictiveHousing, inmates } = req.body;

        if (!officerName || !badgeNumber || !assignedArea || !incidentTime || !incidentDetails || !inmates || inmates.length === 0) {
            console.error("❌ Missing required fields for ticket generation.");
            return res.status(400).json({ error: "Missing required fields for ticket generation." });
        }

        console.log("✅ Generating Ticket...");

        let ticketPrompt = `
            On ${formatDateForPDF()}, I C/O ${officerName}, Badge #${badgeNumber}, was assigned to ${assignedArea}.
            At approximately ${formatTimeForPDF(incidentTime)}, while conducting my assigned duties, I observed the following violation:
            
            Incident Summary: ${incidentDetails}
        `;

        let inmateNamesList = [];
        let offensesList = [];

        inmates.forEach((inmate, index) => {
            ticketPrompt += `\nInmate ${index + 1}: ${inmate.name} (ID: ${inmate.id})`;
            inmateNamesList.push(`${inmate.name} (ID: ${inmate.id})`);
        });

        // ✅ **AI-assisted offense detection using the predefined codes**
        ticketPrompt += `\n\nThe following offenses were identified based on the described incident:`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125",
            messages: [
                {
                    role: "system",
                    content: `
                        You are an expert at writing professional correctional officer disciplinary tickets.
                        Your task is to:
                        - Identify the correct offense codes **ONLY** from the provided list.
                        - If an offense applies, assign it to the inmate.
                        - If multiple offenses apply, list them all.
                        - Ensure the ticket remains factual and aligned with standard correctional facility reporting.
                        - Do NOT create new offenses. Use only those from the provided list.
                    `
                },
                { 
                    role: "user", 
                    content: `Given this incident summary:\n"${incidentDetails}"\nMatch the correct offenses from this list:\n${Object.values(offenseCodes).join("\n")}\n\nProvide the offense codes and a brief justification for each.` 
                }
            ]
        });

        if (!response.choices || response.choices.length === 0) {
            throw new Error("Invalid response from OpenAI");
        }

        const aiGeneratedOffenses = response.choices[0].message.content.split("\n").filter(line => line.trim() !== "");

        aiGeneratedOffenses.forEach(offense => {
            offensesList.push(offense);
        });

        // Add offenses to the ticket
        if (offensesList.length > 0) {
            ticketPrompt += `\n\nOffense Codes:\n${offensesList.join("\n")}`;
        }

        if (healthcare === "yes") ticketPrompt += "\nThe individual was taken to the Healthcare unit for evaluation.";
        if (mentalHealth === "yes") ticketPrompt += "\nThe individual was evaluated by mental health staff.";
        if (restrictiveHousing === "yes") ticketPrompt += "\nThe individual was taken to N2 restrictive housing.";

        ticketPrompt += `\n\nProper chain of command was notified, and ${inmateNamesList.join(", ")} was identified by state-issued ID and Offender 360.`;

        console.log("✅ Successfully generated Ticket.");
        res.json({ ticket: ticketPrompt });

    } catch (error) {
        console.error("❌ Error generating ticket:", error);
        res.status(500).json({ error: "Failed to generate ticket. Check API key, quota, or backend logs." });
    }
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));