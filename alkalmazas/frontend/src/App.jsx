import { useEffect, useState } from "react";

function App() {
    const [backendStatus, setBackendStatus] = useState("ellenőrzés...");

    useEffect(() => {
        fetch("http://localhost:5000/api/health")
            .then((res) => res.json())
            .then((data) => setBackendStatus(data.message))
            .catch(() => setBackendStatus("Backend nem elérhető"));
    }, []);

    return (
        <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
            <h1>Tollaslabda versenyalkalmazás</h1>

            <p>
                <strong>Backend státusz:</strong> {backendStatus}
            </p>
        </div>
    );
}

export default App;
