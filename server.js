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

app.post("/generate-report", async (req, res) => {
    try {
        const { officerName, badgeNumber, assignedArea, incidentTime, incidentDetails, healthcare, mentalHealth, restrictiveHousing, inmates } = req.body;

        // Check if all required fields are provided
        if (!officerName || !badgeNumber || !assignedArea || !incidentTime || !incidentDetails || !inmates || inmates.length === 0) {
            return res.status(400).json({ error: "Missing required fields. Please fill out all required inputs." });
        }

        // Debugging Log: Show received data
        console.log("Received Data:", req.body);

        // Format date correctly
        const now = new Date();
        const month = now.toLocaleString("default", { month: "long" }); // Full month name
        const dayName = now.toLocaleString("default", { weekday: "long" }); // Full day name
        const day = now.getDate(); // Day of the month
        const year = now.getFullYear(); // Full year

        // Generate the required structured report start
        let basePrompt = `
            On ${month} ${dayName} ${day}, ${year}, I C/O ${officerName}, Badge #${badgeNumber}, was assigned to ${assignedArea}.
            At approximately ${incidentTime}, while conducting my assigned duties, I observed the following incident:
            
            Incident Summary: ${incidentDetails}
        `;

        // Add inmate details ensuring full name and ID are mentioned first
        let inmateNamesList = [];
        inmates.forEach((inmate, index) => {
            basePrompt += `\nInmate ${index + 1}: ${inmate.name} (ID: ${inmate.id})`;
            inmateNamesList.push(`${inmate.name} (ID: ${inmate.id})`);
        });

        if (healthcare === "yes") basePrompt += "\nThe individual was then taken to the Healthcare unit where they were evaluated by proper healthcare staff and mental health staff.";
        if (mentalHealth === "yes") basePrompt += "\nThe individual was evaluated by mental health staff.";
        if (restrictiveHousing === "yes") basePrompt += "\nThe individual was taken to N2 restrictive housing.";

        // Ensure the report ends with the required statement
        basePrompt += `\n\nProper chain of command was notified, and ${inmateNamesList.join(", ")} was identified by state-issued ID and Offender 360.`;

        // AI Rules for Report Generation
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125", // Use the best cost-effective model
            messages: [
                {
                    role: "system",
                    content: `
                        You are an expert at writing professional correctional officer incident reports. 
                        Follow these strict rules when generating the report:
                        
                        1. **Every report must start with the following:**  
                           "On (Month) (Day of the Week) (Day) (Year) I (Rank) (Full Name) was assigned to (Assignment)."
                           
                        2. **The next section must describe what the officer observed in a neutral and factual manner.**
                           - "While conducting my assigned duties, I observed (incident) involving (full inmate name & ID)."

                        3. **If emergency assistance is called, the report must include:**
                           - "I called for my Sgt and a Code 3 was initiated in (location)."

                        4. **If an inmate was injured or required medical attention:**
                           - "The individual was then taken to the Healthcare unit where they were evaluated by proper healthcare staff and mental health staff."

                        5. **All reports must end with:**
                           - "Proper chain of command was notified, and (full name of inmate(s) with ID) was identified by state-issued ID and Offender 360."

                        6. **Ensure proper grammar, spelling, and punctuation throughout the report.**

                        7. **Do not include personal opinions or assumptions—only factual observations and actions taken.**
                    `,
                },
                { role: "user", content: `Generate a professional 434 incident report based on these details:\n\n${basePrompt}` },
            ],
        });

        if (!response.choices || response.choices.length === 0) {
            throw new Error("Invalid response from OpenAI");
        }

        res.json({ report: response.choices[0].message.content });

    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Failed to generate report. Check API key, quota, or backend logs." });
    }
});

// Start the server
app.listen(5000, () => console.log("🚀 Server running on port 5000"));
