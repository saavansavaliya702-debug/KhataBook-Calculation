import { useState, useEffect, useMemo } from "react";
import "../App.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

const getLocalDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRecordDate = (record) => {
  const date = new Date(record.recordDate || record.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

function Worker() {
  const [name, setName] = useState("");
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [selectedShape, setSelectedShape] = useState("Fancy");
  const [weight, setWeight] = useState("");
  const [entryDate, setEntryDate] = useState(() => getLocalDateValue(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() =>
    getLocalDateValue(new Date()).slice(0, 7),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState([]);

  const navigate = useNavigate();
  const monthRecords = useMemo(
    () =>
      store.filter((record) => {
        const recordDate = getRecordDate(record);
        return recordDate && getLocalDateValue(recordDate).slice(0, 7) === selectedMonth;
      }).sort((left, right) => getRecordDate(right) - getRecordDate(left)),
    [store, selectedMonth],
  );
  const monthTotals = useMemo(
    () =>
      monthRecords.reduce(
        (totals, record) => ({
          count: totals.count + Number(record.totalCount || 0),
          weight: totals.weight + Number(record.totalWeight || 0),
          rupees: totals.rupees + Number(record.totalRupee || 0),
        }),
        { count: 0, weight: 0, rupees: 0 },
      ),
    [monthRecords],
  );

  const monthLabel = new Date(`${selectedMonth}-02T12:00:00`).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    async function getStudents() {
      try {
        setLoading(true);
        const peopleResponse = await fetch(
          "https://khatabook-calculation.onrender.com/People",
        );
        if (!peopleResponse.ok) {
          if (peopleResponse.status === 404) {
            throw new Error(
              "People API is not deployed yet. Deploy the latest backend version.",
            );
          }
          throw new Error(`People API request failed (${peopleResponse.status})`);
        }
        const savedPeople = await peopleResponse.json();

        const recordsResponse = await fetch(
          "https://khatabook-calculation.onrender.com/Worker",
        );
        if (!recordsResponse.ok) throw new Error("Failed to fetch ledger records");
        const records = await recordsResponse.json();

        setStore(records);
        setPeople(savedPeople);
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

  const addPerson = async (e) => {
    e.preventDefault();
    const trimmedName = newPersonName.trim();
    if (trimmedName.length < 3) {
      setError("Enter a name with at least 3 characters");
      return;
    }

    try {
      const response = await fetch("https://khatabook-calculation.onrender.com/People", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const person = await response.json();
      if (!response.ok) throw new Error(person.message || "Could not add person");

      setPeople((currentPeople) =>
        [...currentPeople, person].sort((left, right) => left.personNumber - right.personNumber),
      );
      setSelectedPersonId(person._id);
      setName(person.name);
      setNewPersonName("");
      setAddingPerson(false);
      setError("");
    } catch (error) {
      setError(error.message);
    }
  };

  const output = useMemo(() => {
    const arr = weight
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);

    if (arr.length === 0 || arr.some(isNaN)) return null;

    // Calculate total item count automatically
    const totalCount = arr.length;

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

    const rupee0to99 = weight0to99 * (isRound ? 1 : 15);
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
      totalCount,
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

  const generateStoredPDF = () => {
    if (monthRecords.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    doc.setFillColor(31, 49, 59);
    doc.rect(0, 0, pageWidth, 43, "F");
    doc.setFillColor(65, 139, 117);
    doc.rect(0, 41, pageWidth, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("MONTHLY LEDGER REPORT", margin, 13);
    doc.setFontSize(21);
    doc.text(monthLabel, margin, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(206, 220, 221);
    doc.text("Weight and payment summary", margin, 32);
    doc.text(
      `Generated ${new Date().toLocaleDateString()}`,
      pageWidth - margin,
      15,
      { align: "right" },
    );

    const summaryItems = [
      ["ENTRIES", String(monthRecords.length)],
      ["TOTAL ITEMS", String(monthTotals.count)],
      ["TOTAL WEIGHT", `${monthTotals.weight.toFixed(2)} units`],
      ["GROSS VALUE", `Rs. ${monthTotals.rupees.toFixed(2)}`],
      [
        "TOTAL DUE",
        `Rs. ${(monthTotals.rupees - monthRecords.length * 40000).toFixed(2)}`,
      ],
    ];
    const cardGap = 5;
    const cardWidth = (pageWidth - margin * 2 - cardGap * (summaryItems.length - 1)) /
      summaryItems.length;

    summaryItems.forEach(([label, value], index) => {
      const x = margin + index * (cardWidth + cardGap);
      doc.setFillColor(246, 248, 247);
      doc.roundedRect(x, 50, cardWidth, 23, 2, 2, "F");
      doc.setTextColor(103, 119, 117);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(label, x + 4, 57);
      doc.setTextColor(31, 49, 59);
      doc.setFontSize(11);
      doc.text(value, x + 4, 67);
    });

    autoTable(doc, {
      startY: 81,
      margin: { left: margin, right: margin, bottom: 18 },
      head: [
        ["No.", "Date", "Name", "ID", "Type", "Items", "Weight", "Gross value", "Due amount"],
      ],
      body: monthRecords.map((item, index) => {
        const itemQuantity =
          item.totalCount ??
          (item.weight ?
            item.weight.split(/[\s,]+/).filter(Boolean).length
          : "N/A");
        const recordDate = getRecordDate(item);
        const due =
          item.totalRupee != null ?
            (Number(item.totalRupee) - 40000).toFixed(2)
          : "N/A";

        return [
          index + 1,
          recordDate ? recordDate.toLocaleDateString() : "N/A",
          item.name,
          item.personNumber ? `#${item.personNumber}` : "—",
          item.shape || "—",
          itemQuantity,
          item.totalWeight != null ? Number(item.totalWeight).toFixed(2) : "N/A",
          item.totalRupee != null ? `Rs. ${Number(item.totalRupee).toFixed(2)}` : "N/A",
          due === "N/A" ? due : `Rs. ${due}`,
        ];
      }),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3,
        textColor: [51, 65, 67],
        lineColor: [225, 232, 229],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [31, 49, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        cellPadding: 3.5,
      },
      alternateRowStyles: { fillColor: [246, 248, 247] },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { cellWidth: 27 },
        2: { cellWidth: 40 },
        3: { halign: "center", cellWidth: 15 },
        4: { cellWidth: 22 },
        5: { halign: "right", cellWidth: 20 },
        6: { halign: "right", cellWidth: 28 },
        7: { halign: "right", cellWidth: 42 },
        8: { halign: "right", cellWidth: 42 },
      },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(220, 228, 225);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(117, 130, 128);
      doc.text("Generated from the monthly ledger", margin, pageHeight - 7);
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 7, {
        align: "right",
      });
    }

    doc.save(`monthly-ledger-${selectedMonth}.pdf`);
  };

  const calculate = async (e) => {
    e.preventDefault();
    if (!selectedPersonId || !selectedShape || !weight || !entryDate) {
      alert("Please fill all fields");
      return;
    }

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
      const response = await fetch("https://khatabook-calculation.onrender.com/Worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personId: selectedPersonId,
          name,
          shape: selectedShape,
          weight,
          totalCount: output.totalCount,
          totalWeight: output.totalWeight,
          totalRupee: output.totalRupee,
          dueAmount: output.totalRupee - 40000,
          recordDate: new Date(`${entryDate}T12:00:00`).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Worker could not be added");
        return;
      }

      setStore([...store, data]);
      setWeight("");
      setError("");
    } catch (error) {
      setError(error.message);
      console.log(error);
      alert("Failed to save data. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      const response = await fetch(`https://khatabook-calculation.onrender.com/Worker/${id}`, {
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

  const handleDeletePerson = async (person) => {
    if (
      !window.confirm(
        `Remove ${person.name} (ID #${person.personNumber}) from the people list? Their existing ledger records will be kept.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `https://khatabook-calculation.onrender.com/People/${person._id}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not remove person");

      setPeople((currentPeople) =>
        currentPeople.filter((savedPerson) => savedPerson._id !== person._id),
      );
      if (selectedPersonId === person._id) {
        setSelectedPersonId("");
        setName("");
      }
      setError("");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className='container dashboard'>
      <video autoPlay loop muted playsInline className="bg-video">
        <source src="/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {loading && (
        <div className='loading'>
          <p>Loading data...</p>
        </div>
      )}

      {error && (
        <div className='error' style={{ color: "red", marginBottom: "20px" }}>
          <p>⚠️ Error: {error}</p>
        </div>
      )}

      <div className='dashboard-grid'>
        <div className='entry-column'>
          <form className='form' onSubmit={calculate}>
            <img src='/logo.png' alt='Logo' className="mainpage" />

            <div className='form-header'>
              <div>
                <p className='eyebrow'>MONTHLY LEDGER</p>
                <h2>Office Weight Calculator</h2>
              </div>
              <button
                type='button'
                onClick={handleLogout}
                className='logout-button'>
                Logout
              </button>
            </div>

            <p className='entry-hint'>Add a new weight entry. Your totals update as you type.</p>
            <div className='entry-fields'>
              <div className='form-group'>
                <label htmlFor='shape'>Shape</label>
                <select
                  id='shape'
                  value={selectedShape}
                  onChange={(e) => setSelectedShape(e.target.value)}>
                  <option value='Fancy'>Fancy</option>
                  <option value='Round'>Round</option>
                </select>
              </div>
              <div className='form-group form-group-wide'>
                <label htmlFor='person-name'>Person name</label>
                <select
                  id='person-name'
                  value={selectedPersonId}
                  onChange={(e) => {
                    const person = people.find((item) => item._id === e.target.value);
                    setSelectedPersonId(e.target.value);
                    setName(person?.name || "");
                  }}>
                  <option value=''>Choose a person</option>
                  {people.map((person) => (
                    <option key={person._id} value={person._id}>
                      #{person.personNumber} · {person.name}
                    </option>
                  ))}
                </select>
                {selectedPersonId &&
                  <span className='selected-person-id'>
                    Person ID #{people.find((person) => person._id === selectedPersonId)?.personNumber}
                  </span>
                }
                {!addingPerson ?
                  <button
                    type='button'
                    className='person-add-toggle'
                    onClick={() => {
                      setAddingPerson(true);
                      setError("");
                    }}>
                    + Add new person
                  </button>
                : <div className='add-person-row'>
                    <input
                      type='text'
                      aria-label='New person name'
                      placeholder='Enter a new person name'
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                    />
                    <button type='button' onClick={addPerson}>
                      Add person
                    </button>
                    <button
                      type='button'
                      className='cancel-add-person'
                      onClick={() => {
                        setAddingPerson(false);
                        setNewPersonName("");
                        setError("");
                      }}>
                      Cancel
                    </button>
                  </div>
                }
              </div>
              <div className='form-group'>
                <label htmlFor='entry-date'>Entry date</label>
                <input
                  id='entry-date'
                  type='date'
                  value={entryDate}
                  onChange={(e) => {
                    setEntryDate(e.target.value);
                    if (e.target.value) setSelectedMonth(e.target.value.slice(0, 7));
                  }}
                  required
                />
              </div>
              <div className='form-group form-group-wide'>
                <label htmlFor='weights'>Weights</label>
                <textarea
                  id='weights'
                  placeholder='Enter weights separated by commas, spaces, or new lines'
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  rows='3'
                />
                <span className='field-hint'>Example: 50, 120, 250, 350</span>
              </div>
            </div>
            <button type='submit'>Save entry to ledger</button>
          </form>

          {output && (
            <div className='students-list calculation-preview'>
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
                    <td>{selectedShape === "Round" ? "₹1" : "₹15"}</td>
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
                  <h3>Total Items</h3>
                  <div className='value'>{output.totalCount}</div>
                </div>
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

          <section className='people-panel'>
            <div className='people-panel-header'>
              <div>
                <p className='eyebrow'>PEOPLE DIRECTORY</p>
                <h2>Saved people <span>{people.length}</span></h2>
              </div>
            </div>
            {people.length > 0 ?
              <ul className='people-list'>
                {people.map((person) => (
                  <li key={person._id}>
                    <div className='person-identity'>
                      <span className='person-number'>#{person.personNumber}</span>
                      <span className='person-name'>{person.name}</span>
                    </div>
                    <button
                      type='button'
                      className='person-delete-button'
                      onClick={() => handleDeletePerson(person)}
                      aria-label={`Remove ${person.name}`}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            : <p className='people-empty-state'>Add a person to start building your directory.</p>}
            <p className='people-note'>Removing a person keeps their existing ledger records.</p>
          </section>
        </div>

      {/* Display stored data */}
      <section className='monthly-records'>
        <div className='records-header'>
          <div>
            <p className='eyebrow'>RECORDS OVERVIEW</p>
            <h2 className='storedata'>{monthLabel}</h2>
          </div>
          <div className='records-controls'>
            <div className='month-filter-field'>
              <label htmlFor='month-filter'>Month</label>
              <input
                id='month-filter'
                type='month'
                value={selectedMonth}
                onChange={(e) => {
                  const month = e.target.value;
                  if (!month) return;
                  setSelectedMonth(month);
                  setEntryDate(`${month}-01`);
                }}
              />
            </div>
            <button
              className='databtn'
              onClick={generateStoredPDF}
              disabled={monthRecords.length === 0}>
              Download PDF
            </button>
          </div>
        </div>

        <div className='summary month-summary'>
          <div className='summary-item'>
            <h3>Entries</h3>
            <div className='value'>{monthRecords.length}</div>
          </div>
          <div className='summary-item'>
            <h3>Total Items</h3>
            <div className='value'>{monthTotals.count}</div>
          </div>
          <div className='summary-item'>
            <h3>Total Weight</h3>
            <div className='value'>{monthTotals.weight.toFixed(2)}</div>
          </div>
          <div className='summary-item'>
            <h3>Total Rupee</h3>
            <div className='value'>₹{monthTotals.rupees.toFixed(2)}</div>
          </div>
        </div>

        {monthRecords.length > 0 ?
          <div className='records-table-wrap'>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Count</th>
                  <th>Total Weight</th>
                  <th>Total Rupee</th>
                  <th>Due Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {monthRecords.map((item) => {
                  const itemQuantity =
                    item.totalCount ??
                    (item.weight ?
                      item.weight.split(/[\s,]+/).filter(Boolean).length
                    : "N/A");
                  const recordDate = getRecordDate(item);

                  return (
                    <tr key={item._id}>
                      <td>{recordDate ? recordDate.toLocaleDateString() : "N/A"}</td>
                      <td>{item.name}</td>
                      <td>{item.personNumber ? `#${item.personNumber}` : "—"}</td>
                      <td>{itemQuantity}</td>
                      <td>{Number(item.totalWeight || 0).toFixed(2)}</td>
                      <td>₹{Number(item.totalRupee || 0).toFixed(2)}</td>
                      <td>
                        {item.totalRupee != null ?
                          `₹${(Number(item.totalRupee) - 40000).toFixed(2)}`
                        : "N/A"}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className='delete-button'>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        : <p className='empty-state'>No records for {monthLabel} yet. Choose this month’s entry date above to add the first one.</p>}
      </section>
      </div>
    </div>
  );
}

export default Worker;

{
  /* <div class="btn-group">
  <button type="button" class="btn btn-danger dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
    Danger
  </button>
  <ul class="dropdown-menu">
    <li><a class="dropdown-item" href="#">Action</a></li>
    <li><a class="dropdown-item" href="#">Another action</a></li>
    <li><a class="dropdown-item" href="#">Something else here</a></li>
    <li><hr class="dropdown-divider"></li>
    <li><a class="dropdown-item" href="#">Separated link</a></li>
  </ul>
</div> */
}
