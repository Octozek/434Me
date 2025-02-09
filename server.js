import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config(); // Load API key from .env

const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Uses your API key from .env
});

// ✅ Function to format the date
const getFormattedDate = () => {
    const now = new Date();
    const month = now.toLocaleString("default", { month: "long" });
    const dayName = now.toLocaleString("default", { weekday: "long" });
    const day = now.getDate();
    const year = now.getFullYear();
    return `${month} ${dayName} ${day}, ${year}`;
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

        let basePrompt = `
            On ${getFormattedDate()}, I C/O ${officerName}, Badge #${badgeNumber}, was assigned to ${assignedArea}.
            At approximately ${incidentTime}, while conducting my assigned duties, I observed the following incident:
            
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

        console.log("🔹 Sending request to OpenAI for 434 Report...");

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125",
            messages: [
                {
                    role: "system",
                    content: `
                        You are an expert at writing professional correctional officer incident reports. 
                        Follow these strict rules when generating the report:
                        
                        1. **Every report must start with the following:**  
                           "On (Month) (Day of the Week) (Day) (Year) I (Rank) (Full Name) was assigned to (Assignment)."
                           
                        2. **Describe the officer’s observations in a neutral and factual manner.**
                           - "While conducting my assigned duties, I observed (incident) involving (full inmate name & ID)."

                        3. **If an inmate was injured or required medical attention:**
                           - "The individual was then taken to the Healthcare unit where they were evaluated by proper healthcare staff and mental health staff."

                        4. **All reports must end with:**
                           - "Proper chain of command was notified, and (full name of inmate(s) with ID) was identified by state-issued ID and Offender 360."

                        5. **Ensure proper grammar, spelling, and punctuation throughout the report.**

                        6. **Avoid repeating information already stated (e.g., Healthcare evaluation should only be stated once).**
                    `,
                },
                { role: "user", content: `Generate a professional 434 incident report based on these details:\n\n${basePrompt}` },
            ],
        });

        if (!response.choices || response.choices.length === 0) {
            throw new Error("Invalid response from OpenAI");
        }

        console.log("✅ Successfully generated 434 Report.");
        res.json({ report: response.choices[0].message.content });

    } catch (error) {
        console.error("❌ Error generating report:", error);
        res.status(500).json({ error: "Failed to generate report. Check API key, quota, or backend logs." });
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
            On ${getFormattedDate()}, I C/O ${officerName}, Badge #${badgeNumber}, was assigned to ${assignedArea}.
            At approximately ${incidentTime}, while conducting my assigned duties, I observed the following violation:
            
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