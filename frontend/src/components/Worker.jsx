import { useState, useEffect, useMemo } from "react";
import "../App.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom"; // 1. Import useNavigate

function Worker() {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [selectedShape, setSelectedShape] = useState("Fancy");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState([]);

  const navigate = useNavigate(); // 2. Initialize navigate
  // 3. Create the function to clear token and log out
  const handleLogout = () => {
    // Remove the token and user data from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Redirect user to login page
    navigate("/login");
  };

  useEffect(() => {
    async function getStudents() {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/Worker");
        if (!response.ok) throw new Error("Failed to fetch Data");
        const data = await response.json();
        setStore(data);
        setError("");
      } catch (error) {
        setError(error.message);
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    getStudents();
  }, []);

  const generateStoredPDF = () => {
    if (store.length === 0) return;

    const doc = new jsPDF();
    doc.text("Stored Records", 14, 15);

    autoTable(doc, {
      startY: 22,
      head: [
        [
          "Name",
          "Shape",
          "Total Weight",
          "Total Rupee",
          "Due Amount",
          "Created At",
        ],
      ],
      body: store.map((item) => [
        item.name,
        item.selectedShape || item.shape || "N/A",
        item.totalWeight?.toFixed(2) || "N/A",
        `Rs:-${item.totalRupee?.toFixed(2) || "N/A"}`,
        `Rs:-${item.totalRupee - (40000)?.toFixed(2) || "N/A"}`,
        new Date(item.createdAt).toLocaleString() || "N/A",
      ]),
    });

    doc.save("stored-records.pdf");
  };

  const output = useMemo(() => {
    const arr = weight
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);

    if (arr.length === 0) return null;

    // Validate all numbers
    if (arr.some(isNaN)) {
      // setError("Please enter valid numbers only");
      return null;
    }

    const weight0to99 = arr
      .filter((value) => value >= 0 && value <= 99)
      .reduce((sum, value) => sum + value, 0);

    const weight100to149 = arr
      .filter((value) => value >= 100 && value <= 149)
      .reduce((sum, value) => sum + value, 0);

    const weight150to199 = arr
      .filter((value) => value >= 150 && value <= 199)
      .reduce((sum, value) => sum + value, 0);

    const weight200to299 = arr
      .filter((value) => value >= 200 && value <= 299)
      .reduce((sum, value) => sum + value, 0);

    const weight300to399 = arr
      .filter((value) => value >= 300 && value <= 399)
      .reduce((sum, value) => sum + value, 0);

    const weight400to499 = arr
      .filter((value) => value >= 400 && value <= 499)
      .reduce((sum, value) => sum + value, 0);

    const weight500 = arr
      .filter((value) => value >= 500)
      .reduce((sum, value) => sum + value, 0);

    const isRound = selectedShape === "Round";

    // FIXED: Changed 0 to 10 for Round shape
    const rupee0to99 = weight0to99 * (isRound ? 0 : 15);
    const rupee100to149 = weight100to149 * (isRound ? 8 : 12);
    const rupee150to199 = weight150to199 * (isRound ? 7.25 : 12);
    const rupee200to299 = weight200to299 * (isRound ? 6.75 : 10);
    const rupee300to399 = weight300to399 * (isRound ? 6.5 : 9);
    const rupee400to499 = weight400to499 * (isRound ? 6.25 : 8.5);
    const rupee500 = weight500 * (isRound ? 5.75 : 7);

    const totalWeight =
      weight0to99 +
      weight100to149 +
      weight150to199 +
      weight200to299 +
      weight300to399 +
      weight400to499 +
      weight500;

    const totalRupee =
      rupee0to99 +
      rupee100to149 +
      rupee150to199 +
      rupee200to299 +
      rupee300to399 +
      rupee400to499 +
      rupee500;

    return {
      weight0to99,
      weight100to149,
      weight150to199,
      weight200to299,
      weight300to399,
      weight400to499,
      weight500,
      rupee0to99,
      rupee100to149,
      rupee150to199,
      rupee200to299,
      rupee300to399,
      rupee400to499,
      rupee500,
      totalWeight,
      totalRupee,
    };
  }, [weight, selectedShape]);

  const calculate = async (e) => {
    e.preventDefault();
    if (!name || !selectedShape || !weight) {
      alert("Please fill all fields");
      return;
    }

    // Validate weight format
    const numbers = weight
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (numbers.some(isNaN)) {
      alert("Please enter valid numbers only");
      return;
    }

    if (!output) {
      alert("Please enter valid weight values");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/Worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          weight,
          shape: selectedShape,
          totalWeight: output.totalWeight,
          totalRupee: output.totalRupee,
          dueAmount: output.totalRupee - 40000,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Worker could not be added");
        return;
      }

      setStore([...store, data]);
      setName("");
      setWeight("");
      setSelectedShape("Fancy");
      setError("");
    } catch (error) {
      setError(error.message);
      console.log(error);
      alert("Failed to save data. Please try again.");
    }
  };

  // Handle delete functionality
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      const response = await fetch(`http://localhost:5000/Worker/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setStore(store.filter((item) => item._id !== id));
      alert("Entry deleted successfully");
    } catch (error) {
      setError(error.message);
      console.log(error);
      alert("Failed to delete entry");
    }
  };

  return (
    <div className='container'>
      {/* Loading State */}
      {loading && (
        <div className='loading'>
          <p>Loading data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className='error' style={{ color: "red", marginBottom: "20px" }}>
          <p>⚠️ Error: {error}</p>
        </div>
      )}

      <form className='form' onSubmit={calculate}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}>
          <h2>Office Weight Calculator</h2>
          <button
            type='button'
            onClick={handleLogout}
            style={{
              backgroundColor: "#dc3545",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
            }}>
            Logout / Expire Token
          </button>
        </div>
        <select
          value={selectedShape}
          onChange={(e) => setSelectedShape(e.target.value)}>
          <option value='Fancy'>Fancy</option>
          <option value='Round'>Round</option>
        </select>
        <input
          type='text'
          placeholder='Enter person name'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          placeholder='Enter values: 50, 120, 250, 350, 450, 600'
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          rows='5'
        />
        <button type='submit'>Calculate</button>
      </form>

      {output && (
        <div className='students-list'>
          <h2>Output: {name || "Unnamed"}</h2>
          <table>
            <thead>
              <tr>
                <th>Weight Range</th>
                <th>Total Weight</th>
                <th>Rate per Unit</th>
                <th>Total Rupee</th>
              </tr>
            </thead>
            <tbody>
              <tr key='range-0-99'>
                <td>0-99</td>
                <td>{output.weight0to99}</td>
                <td>{selectedShape === "Round" ? "₹0" : "₹15"}</td>
                <td>₹{output.rupee0to99.toFixed(2)}</td>
              </tr>
              <tr key='range-100-149'>
                <td>100-149</td>
                <td>{output.weight100to149}</td>
                <td>{selectedShape === "Round" ? "₹8" : "₹12"}</td>
                <td>₹{output.rupee100to149.toFixed(2)}</td>
              </tr>
              <tr key='range-150-199'>
                <td>150-199</td>
                <td>{output.weight150to199}</td>
                <td>{selectedShape === "Round" ? "₹7.25" : "₹12"}</td>
                <td>₹{output.rupee150to199.toFixed(2)}</td>
              </tr>
              <tr key='range-200-299'>
                <td>200-299</td>
                <td>{output.weight200to299}</td>
                <td>{selectedShape === "Round" ? "₹6.75" : "₹10"}</td>
                <td>₹{output.rupee200to299.toFixed(2)}</td>
              </tr>
              <tr key='range-300-399'>
                <td>300-399</td>
                <td>{output.weight300to399}</td>
                <td>{selectedShape === "Round" ? "₹6.5" : "₹9"}</td>
                <td>₹{output.rupee300to399.toFixed(2)}</td>
              </tr>
              <tr key='range-400-499'>
                <td>400-499</td>
                <td>{output.weight400to499}</td>
                <td>{selectedShape === "Round" ? "₹6.25" : "₹8.5"}</td>
                <td>₹{output.rupee400to499.toFixed(2)}</td>
              </tr>
              <tr key='range-500-plus'>
                <td>500+</td>
                <td>{output.weight500}</td>
                <td>{selectedShape === "Round" ? "₹5.75" : "₹7"}</td>
                <td>₹{output.rupee500.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <hr />
          <div className='summary'>
            <div className='summary-item'>
              <h3>Total Weight</h3>
              <div className='value'>{output.totalWeight.toFixed(2)}</div>
            </div>
            <div className='summary-item'>
              <h3>Total Rupee</h3>
              <div className='value'>₹{output.totalRupee.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Display stored data */}
      {store.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
          <div className='two-box'>
            <h2 className='storedata'>Stored Records ({store.length})</h2>
            <button className='databtn' onClick={generateStoredPDF}>
              Download PDF
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Shape</th>
                <th>Total Weight</th>
                <th>Total Rupee</th>
                <th>Due Amount</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {store.map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{item.selectedShape || item.shape}</td>
                  <td>{item.totalWeight?.toFixed(2) || "N/A"}</td>
                  <td>₹{item.totalRupee?.toFixed(2) || "N/A"}</td>
                  <td>
                    {item.totalRupee != null ?
                      `₹${(Number(item.totalRupee) - 40000).toFixed(2)}`
                    : "N/A"}
                  </td>
                  <td>
                    {item.createdAt ?
                      new Date(item.createdAt).toLocaleString()
                    : "N/A"}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(item._id)}
                      style={{
                        background: "#ff4444",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Worker;
