import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css"; // Import custom styles
import { API_URL } from "../config"; // Import API URL

const ReportForm = () => {
    const [formData, setFormData] = useState({
        officerName: "",
        badgeNumber: "",
        assignedArea: "",
        incidentTime: "",
        incidentDetails: "",
        healthcare: "no",
        mentalHealth: "no",
        restrictiveHousing: "no",
        inmates: [{ name: "", id: "" }],
    });

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleInmateChange = (index, field, value) => {
        const updatedInmates = [...formData.inmates];
        updatedInmates[index][field] = value;
        setFormData({ ...formData, inmates: updatedInmates });
    };

    const addInmate = () => {
        setFormData({ ...formData, inmates: [...formData.inmates, { name: "", id: "" }] });
    };

    const removeInmate = (index) => {
        const updatedInmates = formData.inmates.filter((_, i) => i !== index);
        setFormData({ ...formData, inmates: updatedInmates });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/generate-report`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.report) {
                setReport(data.report); // ✅ Correctly setting the report
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (error) {
            console.error("Error generating report:", error);
            setError("Failed to generate report. Please check the backend.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            officerName: "",
            badgeNumber: "",
            assignedArea: "",
            incidentTime: "",
            incidentDetails: "",
            healthcare: "no",
            mentalHealth: "no",
            restrictiveHousing: "no",
            inmates: [{ name: "", id: "" }],
        });
        setReport(null);
        setError(null);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-lg p-4">
                <h2 className="mb-4 text-center">📄 434 Report Generator</h2>
                <form onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Officer Name</label>
                            <input type="text" name="officerName" className="form-control" value={formData.officerName} onChange={handleChange} required />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Badge Number</label>
                            <input type="text" name="badgeNumber" className="form-control" value={formData.badgeNumber} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Assigned Area</label>
                            <input type="text" name="assignedArea" className="form-control" value={formData.assignedArea} onChange={handleChange} required />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Time of Incident</label>
                            <input type="time" name="incidentTime" className="form-control" value={formData.incidentTime} onChange={handleChange} required />
                        </div>
                    </div>

                    {/* Dynamic Inmate Section */}
                    <div className="mb-3">
                        <label className="form-label">Individuals in Custody</label>
                        {formData.inmates.map((inmate, index) => (
                            <div key={index} className="row mb-2 align-items-center">
                                <div className="col-md-5">
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        className="form-control"
                                        value={inmate.name}
                                        onChange={(e) => handleInmateChange(index, "name", e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-md-5">
                                    <input
                                        type="text"
                                        placeholder="ID Number"
                                        className="form-control"
                                        value={inmate.id}
                                        onChange={(e) => handleInmateChange(index, "id", e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-md-2 d-flex">
                                    {formData.inmates.length > 1 && (
                                        <button type="button" className="btn btn-danger me-2" onClick={() => removeInmate(index)}>
                                            -
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-success" onClick={addInmate}>
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Incident Details</label>
                        <textarea name="incidentDetails" className="form-control" rows="4" value={formData.incidentDetails} onChange={handleChange} required></textarea>
                    </div>

                    {/* Healthcare, Mental Health, Restrictive Housing Selection */}
                    <div className="row">
                        <div className="col-md-4 mb-3">
                            <label className="form-label">Taken to Healthcare?</label>
                            <select name="healthcare" className="form-select" value={formData.healthcare} onChange={handleChange}>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div className="col-md-4 mb-3">
                            <label className="form-label">Seen by Mental Health Staff?</label>
                            <select name="mentalHealth" className="form-select" value={formData.mentalHealth} onChange={handleChange}>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div className="col-md-4 mb-3">
                            <label className="form-label">Taken to N2 Restrictive Housing?</label>
                            <select name="restrictiveHousing" className="form-select" value={formData.restrictiveHousing} onChange={handleChange}>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                    </div>

                    <div className="d-flex justify-content-center">
                        <button type="submit" className="btn btn-primary me-2" disabled={loading}>
                            {loading ? "Generating Report..." : "Generate Report"}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={handleReset}>
                            Try Again
                        </button>
                    </div>
                </form>
            </div>

            {report && (
                <div className="card mt-4 p-4 shadow-lg">
                    <h3 className="text-center">📜 AI-Generated 434 Report</h3>
                    <pre className="border p-3 bg-light">{report}</pre>
                </div>
            )}
        </div>
    );
};

export default ReportForm;
