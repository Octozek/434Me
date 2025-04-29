import { useState } from "react";
import { API_URL } from "../config"; // Import API URL

const Ticket = ({ reportData, setTicket, setEditedTicket }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateTicket = async () => {
        setLoading(true);
        setError(null);

        console.log("🔹 Sending request to:", `${API_URL}/generate-ticket`);
        console.log("🔹 Request Payload:", JSON.stringify(reportData, null, 2));

        try {
            const response = await fetch(`${API_URL}/generate-ticket`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(reportData),
            });

            console.log("🔹 Raw Response:", response);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Endpoint not found. Please check the URL.");
                } else {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
            }

            const data = await response.json();
            console.log("✅ Received Response:", data);

            if (data.ticket) {
                setTicket(data.ticket);
                setEditedTicket(data.ticket);
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (error) {
            console.error("❌ Error generating ticket:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-3">
            <button className="btn btn-warning" onClick={generateTicket} disabled={loading}>
                {loading ? "Generating Ticket..." : "Want a Ticket Also?"}
            </button>

            {error && <p className="text-danger mt-2">{error}</p>}
        </div>
    );
}; 

export default Ticket;