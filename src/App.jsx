import { useState } from "react";
import ReportForm from "./components/ReportForm"; // ✅ Corrected path

function App() {
    const [report, setReport] = useState(null);

    const handleGenerateReport = (data) => {
        setReport(data);
    };

    return (
        <div className="container">
            <h1 className="mt-4 text-center">434Me - AI Report Generator</h1>
            <ReportForm onSubmit={handleGenerateReport} />

            {report && (
                <div className="mt-4 p-3 border rounded bg-light">
                    <h3>Generated AI Report</h3>
                    <pre>{report}</pre>
                </div>
            )}
        </div>
    );
}

export default App;
