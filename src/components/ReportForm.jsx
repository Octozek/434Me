import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css"; // Custom styles
import { API_URL } from "../config"; 
import Ticket from "./Ticket"; 

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
    const [ticket, setTicket] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [isEditingReport, setIsEditingReport] = useState(false);
    const [isEditingTicket, setIsEditingTicket] = useState(false);
    const [editedReport, setEditedReport] = useState("");
    const [editedTicket, setEditedTicket] = useState("");

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
                setReport(data.report);
                setEditedReport(data.report); 
                setShowModal(true);
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
        setTicket(null);
        setError(null);
        setShowModal(false);
        setIsEditingReport(false);
        setIsEditingTicket(false);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(report);
        alert("Report copied to clipboard!");
    };

    const handleEditReport = () => {
        setIsEditingReport(true);
    };

    const handleSaveReport = () => {
        setIsEditingReport(false);
        setReport(editedReport);
    };

    const handleEditTicket = () => {
        setIsEditingTicket(true);
    };

    const handleSaveTicket = () => {
        setIsEditingTicket(false);
        setTicket(editedTicket);
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
                        <label className="form-label">Incident Summary</label>
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
                    </div>
                </form>
            </div>

            {/* MODAL for Generated 434 Report & Ticket */}
            {report && showModal && (
                <div className="modal d-block" tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">📜 AI-Generated 434 Report</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                
                                {/* Report Section with Edit Mode */}
                                <div className="mb-3">
                                    <h5>
                                        434 Report 
                                        <button className="btn btn-sm btn-outline-secondary ms-2" onClick={handleEditReport}>
                                            ✏️
                                        </button>
                                    </h5>
                                    {isEditingReport ? (
                                        <>
                                            <textarea
                                                className="form-control"
                                                rows="6"
                                                value={editedReport}
                                                onChange={(e) => setEditedReport(e.target.value)}
                                            />
                                            <button className="btn btn-success mt-2" onClick={handleSaveReport}>
                                                ✅ Done
                                            </button>
                                        </>
                                    ) : (
                                        <pre className="border p-3 bg-light">{report}</pre>
                                    )}
                                </div>

                                {/* Ticket Section with Edit Mode */}
                                {ticket && (
                                    <div className="mt-4">
                                        <h5>
                                            Disciplinary Ticket 
                                            <button className="btn btn-sm btn-outline-secondary ms-2" onClick={handleEditTicket}>
                                                ✏️
                                            </button>
                                        </h5>
                                        {isEditingTicket ? (
                                            <>
                                                <textarea
                                                    className="form-control"
                                                    rows="6"
                                                    value={editedTicket}
                                                    onChange={(e) => setEditedTicket(e.target.value)}
                                                />
                                                <button className="btn btn-success mt-2" onClick={handleSaveTicket}>
                                                    ✅ Done
                                                </button>
                                            </>
                                        ) : (
                                            <pre className="border p-3 bg-light">{ticket}</pre>
                                        )}
                                    </div>
                                )}

                                {/* Generate Ticket Button */}
                                {!ticket && (
                                    <Ticket reportData={formData} setTicket={setTicket} setEditedTicket={setEditedTicket} />
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-success" onClick={handlePrint}>Print</button>
                                <button className="btn btn-secondary" onClick={handleReset}>Try Again</button>
                                <button className="btn btn-info" onClick={handleCopy}>Copy</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportForm;