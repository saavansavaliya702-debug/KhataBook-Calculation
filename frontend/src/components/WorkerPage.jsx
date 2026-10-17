import { useState, useEffect, useMemo, useRef } from "react";
import "../CSS/Worker.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

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

const computeTotals = (arr, shape) => {
  const isRound = shape === "Round";

  const sumRange = (min, max) =>
    arr.filter((v) => v >= min && v <= max).reduce((s, v) => s + v, 0);

  const weight0to99 = sumRange(0, 99);
  const weight100to149 = sumRange(100, 149);
  const weight150to199 = sumRange(150, 199);
  const weight200to299 = sumRange(200, 299);
  const weight300to399 = sumRange(300, 399);
  const weight400to499 = sumRange(400, 499);
  const weight500 = arr.filter((v) => v >= 500).reduce((s, v) => s + v, 0);

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
    totalCount: arr.length,
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
};

/* ─── Themed Alert Component ─── */
function ThemedAlert({ alert, onClose }) {
  if (!alert) return null;

  const {
    type = "info",
    title,
    message,
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
  } = alert;
  const isConfirm = typeof onConfirm === "function";

  const iconMap = {
    success: "✓",
    error: "!",
    warning: "⚠",
    info: "i",
  };

  const handleBackdropClick = () => {
    if (isConfirm && onCancel) onCancel();
    else onClose();
  };

  return (
    <div className="themed-alert-backdrop" onClick={handleBackdropClick}>
      <div
        className={`themed-alert themed-alert-${type}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="themed-alert-icon">{iconMap[type] || "i"}</div>
        <h3 className="themed-alert-title">{title}</h3>
        {message && <p className="themed-alert-message">{message}</p>}

        <div className="themed-alert-actions">
          {isConfirm ? (
            <>
              <button
                type="button"
                className="themed-alert-btn themed-alert-btn-cancel"
                onClick={onCancel}
              >
                {cancelText || "Cancel"}
              </button>
              <button
                type="button"
                className="themed-alert-btn themed-alert-btn-confirm"
                onClick={onConfirm}
              >
                {confirmText || "Confirm"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="themed-alert-btn themed-alert-btn-confirm"
              onClick={onClose}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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

  // View mode + selected date for the Datewise view
  const [viewMode, setViewMode] = useState("monthwise"); // "monthwise" | "datewise"
  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDateValue(new Date()),
  );

  // Custom person dropdown state
  const [personDropdownOpen, setPersonDropdownOpen] = useState(false);
  const personDropdownRef = useRef(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState([]);
  const [peoplePage, setPeoplePage] = useState(1);
  const peoplePerPage = 10;

  // Themed alert state
  const [alert, setAlert] = useState(null);

  const navigate = useNavigate();

  // Helper: show a themed alert
  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
  };

  // Helper: show a themed confirm
  const showConfirm = ({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
  }) => {
    setAlert({
      type: "warning",
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setAlert(null);
        onConfirm?.();
      },
      onCancel: () => {
        setAlert(null);
        onCancel?.();
      },
    });
  };

  const closeAlert = () => setAlert(null);

  // Filtered records for the current view (monthwise or datewise)
  const displayedRecords = useMemo(() => {
    const filtered = store.filter((record) => {
      const recordDate = getRecordDate(record);
      if (!recordDate) return false;
      if (viewMode === "datewise") {
        return getLocalDateValue(recordDate) === selectedDate;
      }
      return getLocalDateValue(recordDate).slice(0, 7) === selectedMonth;
    });
    return filtered.sort(
      (left, right) => getRecordDate(right) - getRecordDate(left),
    );
  }, [store, selectedMonth, selectedDate, viewMode]);

  // Group displayed records by person, combining shapes into one row
  const groupedRecords = useMemo(() => {
    const map = new Map();

    for (const record of displayedRecords) {
      const key =
        record.personId ||
        `${record.name || "unknown"}__${record.personNumber || "—"}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          personId: record.personId,
          personNumber: record.personNumber,
          name: record.name,
          recordIds: [],
          shapes: new Set(),
          totalCount: 0,
          totalWeight: 0,
          totalRupee: 0,
          earliestDate: null,
        });
      }

      const group = map.get(key);
      group.recordIds.push(record._id);
      if (record.shape) group.shapes.add(record.shape);
      group.totalCount += Number(record.totalCount || 0);
      group.totalWeight += Number(record.totalWeight || 0);
      group.totalRupee += Number(record.totalRupee || 0);

      const recordDate = getRecordDate(record);
      if (recordDate) {
        if (!group.earliestDate || recordDate < group.earliestDate) {
          group.earliestDate = recordDate;
        }
      }
    }

    return [...map.values()]
      .map((group) => ({
        ...group,
        shapes: [...group.shapes],
        totalDue: group.totalRupee - group.recordIds.length * 40000,
      }))
      .sort((left, right) => {
        const leftDate = left.earliestDate ? left.earliestDate.getTime() : 0;
        const rightDate = right.earliestDate
          ? right.earliestDate.getTime()
          : 0;
        return rightDate - leftDate;
      });
  }, [displayedRecords]);

  const groupedTotals = useMemo(
    () =>
      groupedRecords.reduce(
        (totals, group) => ({
          count: totals.count + group.totalCount,
          weight: totals.weight + group.totalWeight,
          rupees: totals.rupees + group.totalRupee,
        }),
        { count: 0, weight: 0, rupees: 0 },
      ),
    [groupedRecords],
  );

  const monthLabel = new Date(`${selectedMonth}-02T12:00:00`).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );

  const dateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
    undefined,
    { day: "numeric", month: "long", year: "numeric" },
  );

  const viewLabel = viewMode === "datewise" ? dateLabel : monthLabel;

  const selectedPerson = useMemo(
    () => people.find((p) => p._id === selectedPersonId) || null,
    [people, selectedPersonId],
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
        const peopleResponse = await fetch(`${API_BASE}/People`);
        if (!peopleResponse.ok) {
          if (peopleResponse.status === 404) {
            throw new Error(
              "People API is not deployed yet. Deploy the latest backend version.",
            );
          }
          throw new Error(
            `People API request failed (${peopleResponse.status})`,
          );
        }
        const savedPeople = await peopleResponse.json();

        const recordsResponse = await fetch(`${API_BASE}/Worker`);
        if (!recordsResponse.ok)
          throw new Error("Failed to fetch ledger records");
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

  // Close the person dropdown on outside click or Escape
  useEffect(() => {
    if (!personDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (
        personDropdownRef.current &&
        !personDropdownRef.current.contains(event.target)
      ) {
        setPersonDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setPersonDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [personDropdownOpen]);

  const addPerson = async (e) => {
    e.preventDefault();
    const trimmedName = newPersonName.trim();
    if (trimmedName.length < 3) {
      setError("Enter a name with at least 3 characters");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/People`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const person = await response.json();
      if (!response.ok)
        throw new Error(person.message || "Could not add person");

      setPeople((currentPeople) =>
        [...currentPeople, person].sort(
          (left, right) => left.personNumber - right.personNumber,
        ),
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
    return computeTotals(arr, selectedShape);
  }, [weight, selectedShape]);

  const generateStoredPDF = () => {
    if (groupedRecords.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    const reportTitle =
      viewMode === "datewise"
        ? "DAILY LEDGER REPORT"
        : "MONTHLY LEDGER REPORT";

    doc.setFillColor(31, 49, 59);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setFillColor(65, 139, 117);
    doc.rect(0, 26, pageWidth, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(reportTitle, margin, 10);
    doc.setFontSize(14);
    doc.text(viewLabel, margin, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(206, 220, 221);
    doc.text("Weight and payment summary", margin, 24);
    doc.text(
      `Generated ${new Date().toLocaleDateString()}`,
      pageWidth - margin,
      10,
      { align: "right" },
    );

    const summaryItems = [
      ["PEOPLE", String(groupedRecords.length)],
      ["TOTAL ITEMS", String(groupedTotals.count)],
      ["TOTAL WEIGHT", `${groupedTotals.weight.toFixed(2)} units`],
      ["GROSS VALUE", `Rs. ${groupedTotals.rupees.toFixed(2)}`],
      [
        "TOTAL DUE",
        `Rs. ${(
          groupedTotals.rupees -
          displayedRecords.length * 40000
        ).toFixed(2)}`,
      ],
    ];
    const cardGap = 4;
    const cardWidth =
      (pageWidth - margin * 2 - cardGap * (summaryItems.length - 1)) /
      summaryItems.length;

    summaryItems.forEach(([label, value], index) => {
      const x = margin + index * (cardWidth + cardGap);
      doc.setFillColor(246, 248, 247);
      doc.roundedRect(x, 35, cardWidth, 18, 1.5, 1.5, "F");
      doc.setTextColor(103, 119, 117);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(label, x + 3, 41);
      doc.setTextColor(31, 49, 59);
      doc.setFontSize(9);
      doc.text(value, x + 3, 49);
    });

    autoTable(doc, {
      startY: 60,
      margin: { left: margin, right: margin, bottom: 15 },
      head: [
        [
          "No.",
          "Date",
          "Name",
          "ID",
          "Type",
          "Items",
          "Weight",
          "Gross value",
          "Due amount",
        ],
      ],
      body: groupedRecords.map((group, index) => [
        index + 1,
        group.earliestDate
          ? group.earliestDate.toLocaleDateString()
          : "N/A",
        group.name,
        group.personNumber ? `#${group.personNumber}` : "—",
        group.shapes.length === 0
          ? "—"
          : group.shapes.length === 1
          ? group.shapes[0]
          : "Both",
        group.totalCount,
        group.totalWeight.toFixed(2),
        `Rs. ${group.totalRupee.toFixed(2)}`,
        `Rs. ${group.totalDue.toFixed(2)}`,
      ]),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3,
        textColor: [51, 65, 67],
        lineColor: [225, 232, 229],
        lineWidth: 0.1,
        valign: "middle",
      },
      headStyles: {
        fillColor: [31, 49, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        cellPadding: 4,
        fontSize: 8,
        halign: "center",
        valign: "middle",
      },
      alternateRowStyles: { fillColor: [246, 248, 247] },
      columnStyles: {
        0: { halign: "center", cellWidth: 10, fontStyle: "bold" },
        1: { cellWidth: 28 },
        2: { cellWidth: 38 },
        3: { halign: "center", cellWidth: 14, fontStyle: "bold" },
        4: { halign: "center", cellWidth: 20 },
        5: { halign: "center", cellWidth: 18 },
        6: { halign: "right", cellWidth: 26 },
        7: { halign: "right", cellWidth: 38 },
        8: { halign: "right", cellWidth: 38, fontStyle: "bold" },
      },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(220, 228, 225);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(117, 130, 128);
      doc.text("Generated from the ledger", margin, pageHeight - 6);
      doc.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: "right" },
      );
    }

    const filename =
      viewMode === "datewise"
        ? `daily-ledger-${selectedDate}.pdf`
        : `monthly-ledger-${selectedMonth}.pdf`;
    doc.save(filename);
  };

  const calculate = async (e) => {
    e.preventDefault();

    if (!selectedPersonId || !selectedShape || !weight || !entryDate) {
      showAlert(
        "warning",
        "Missing fields",
        "Please fill all fields before saving.",
      );
      return;
    }

    const numbers = weight
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (numbers.length === 0 || numbers.some(isNaN)) {
      showAlert("error", "Invalid weights", "Please enter valid numbers only.");
      return;
    }

    if (!output) {
      showAlert("error", "Invalid weights", "Please enter valid weight values.");
      return;
    }

    const entryDateKey = entryDate.slice(0, 10);
    const now = new Date().toISOString();

    const newWeightEntries = numbers.map((value) => ({
      value,
      addedAt: now,
    }));

    const existingEntry = store.find((item) => {
      if (item.personId !== selectedPersonId) return false;
      if (item.shape !== selectedShape) return false;
      const recordDate = getRecordDate(item);
      if (!recordDate) return false;
      return getLocalDateValue(recordDate) === entryDateKey;
    });

    try {
      if (existingEntry) {
        const existingWeights = (existingEntry.weight || "").trim();
        const combinedWeights = existingWeights
          ? `${existingWeights}, ${weight.trim()}`
          : weight.trim();

        const combinedNumbers = combinedWeights
          .split(/[\s,]+/)
          .filter(Boolean)
          .map(Number);

        const combinedEntries = [
          ...(existingEntry.weightEntries || []),
          ...newWeightEntries,
        ];

        const totals = computeTotals(combinedNumbers, selectedShape);

        const response = await fetch(
          `${API_BASE}/Worker/${existingEntry._id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              weight: combinedWeights,
              weightEntries: combinedEntries,
              totalCount: totals.totalCount,
              totalWeight: totals.totalWeight,
              totalRupee: totals.totalRupee,
              dueAmount: totals.totalRupee - 40000,
            }),
          },
        );

        const data = await response.json();
        if (!response.ok) {
          showAlert(
            "error",
            "Update failed",
            data.message || "Failed to update entry.",
          );
          return;
        }

        setStore(
          store.map((item) =>
            item._id === existingEntry._id ? data : item,
          ),
        );
        showAlert(
          "success",
          "Entry merged",
          "New weights were merged into the existing record.",
        );
      } else {
        const response = await fetch(`${API_BASE}/Worker`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: selectedPersonId,
            name,
            shape: selectedShape,
            weight,
            weightEntries: newWeightEntries,
            totalCount: output.totalCount,
            totalWeight: output.totalWeight,
            totalRupee: output.totalRupee,
            dueAmount: output.totalRupee - 40000,
            recordDate: new Date(`${entryDateKey}T12:00:00`).toISOString(),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          showAlert(
            "error",
            "Save failed",
            data.message || "Worker could not be added.",
          );
          return;
        }

        setStore([...store, data]);
        showAlert(
          "success",
          "Entry added",
          "The new entry was saved to the ledger.",
        );
      }

      setWeight("");
      setError("");
    } catch (error) {
      setError(error.message);
      console.log(error);
      showAlert(
        "error",
        "Save failed",
        "Failed to save data. Please try again.",
      );
    }
  };

  const handleDelete = (id) => {
    showConfirm({
      title: "Delete this entry?",
      message:
        "This action cannot be undone. The record will be permanently removed from the ledger.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE}/Worker/${id}`, {
            method: "DELETE",
          });

          if (!response.ok) throw new Error("Failed to delete");

          setStore(store.filter((item) => item._id !== id));
          showAlert(
            "success",
            "Entry deleted",
            "The entry was removed successfully.",
          );
        } catch (error) {
          setError(error.message);
          console.log(error);
          showAlert("error", "Delete failed", "Failed to delete the entry.");
        }
      },
    });
  };

  // Bulk delete for a grouped row in RECORDS OVERVIEW
  const handleDeleteGroup = (group) => {
    const count = group.recordIds.length;
    showConfirm({
      title:
        count === 1
          ? "Delete this entry?"
          : `Delete all ${count} entries for ${group.name}?`,
      message:
        count === 1
          ? "This action cannot be undone. The record will be permanently removed from the ledger."
          : `This will permanently remove all ${count} ledger records shown for this person in the current view.`,
      confirmText: count === 1 ? "Delete" : "Delete all",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await Promise.all(
            group.recordIds.map((id) =>
              fetch(`${API_BASE}/Worker/${id}`, { method: "DELETE" }),
            ),
          );
          setStore((prev) =>
            prev.filter((item) => !group.recordIds.includes(item._id)),
          );
          showAlert(
            "success",
            "Entry deleted",
            count === 1
              ? "The entry was removed successfully."
              : `${count} entries were removed successfully.`,
          );
        } catch (error) {
          setError(error.message);
          console.log(error);
          showAlert("error", "Delete failed", "Failed to delete the entry.");
        }
      },
    });
  };

  const handleDeletePerson = (person) => {
    showConfirm({
      title: `Remove ${person.name}?`,
      message: `Remove ${person.name} (ID #${person.personNumber}) from the people list? Their existing ledger records will be kept.`,
      confirmText: "Remove",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE}/People/${person._id}`, {
            method: "DELETE",
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.message || "Could not remove person");

          setPeople((currentPeople) =>
            currentPeople.filter(
              (savedPerson) => savedPerson._id !== person._id,
            ),
          );
          if (selectedPersonId === person._id) {
            setSelectedPersonId("");
            setName("");
          }
          setError("");
          showAlert(
            "success",
            "Person removed",
            `${person.name} was removed from the directory.`,
          );
        } catch (error) {
          setError(error.message);
          showAlert(
            "error",
            "Remove failed",
            error.message || "Could not remove person.",
          );
        }
      },
    });
  };

  return (
    <div className="container dashboard">
      <video autoPlay loop muted playsInline className="bg-video">
        <source src="/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Themed alert / confirm modal */}
      <ThemedAlert alert={alert} onClose={closeAlert} />

      {loading && (
        <div className="loading">
          <p>Loading data...</p>
        </div>
      )}

      {error && (
        <div className="error" style={{ color: "red", marginBottom: "20px" }}>
          <p>⚠️ Error: {error}</p>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="entry-column">
          <form className="form" onSubmit={calculate}>
            <img src="/logo.png" alt="Logo" className="mainpage" />

            <div className="form-header">
              <div>
                <p className="eyebrow">MONTHLY LEDGER</p>
                <h2>Office Weight Calculator</h2>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="logout-button"
              >
                Logout
              </button>
            </div>

            <p className="entry-hint">
              Add a new weight entry. Your totals update as you type.
            </p>
            <div className="entry-fields">
              <div className="form-group">
                <label htmlFor="shape">Shape</label>
                <select
                  id="shape"
                  value={selectedShape}
                  onChange={(e) => setSelectedShape(e.target.value)}
                >
                  <option value="Fancy">Fancy</option>
                  <option value="Round">Round</option>
                </select>
              </div>

              <div className="form-group form-group-wide">
                <label htmlFor="person-name">Person name</label>

                <div className="person-dropdown" ref={personDropdownRef}>
                  <button
                    id="person-name"
                    type="button"
                    className={`person-dropdown-trigger ${
                      personDropdownOpen ? "open" : ""
                    }`}
                    aria-haspopup="listbox"
                    aria-expanded={personDropdownOpen}
                    onClick={() => setPersonDropdownOpen((open) => !open)}
                  >
                    <span className="person-dropdown-value">
                      {selectedPerson ? (
                        <>
                          <span className="person-dropdown-number">
                            {selectedPerson.personNumber}--
                          </span>
                          <span className="person-dropdown-name">
                            {selectedPerson.name}
                          </span>
                        </>
                      ) : (
                        <span className="person-dropdown-placeholder">
                          Choose a person
                        </span>
                      )}
                    </span>
                    <span
                      className={`person-dropdown-caret ${
                        personDropdownOpen ? "open" : ""
                      }`}
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </button>

                  {personDropdownOpen && (
                    <ul className="person-dropdown-menu" role="listbox">
                      {people.length === 0 ? (
                        <li className="person-dropdown-empty">
                          No people yet — add one below.
                        </li>
                      ) : (
                        people.map((person) => {
                          const isSelected = person._id === selectedPersonId;
                          return (
                            <li
                              key={person._id}
                              role="option"
                              aria-selected={isSelected}
                              className={`person-dropdown-option ${
                                isSelected ? "selected" : ""
                              }`}
                              onClick={() => {
                                setSelectedPersonId(person._id);
                                setName(person.name);
                                setPersonDropdownOpen(false);
                              }}
                            >
                              <span className="person-dropdown-number">
                                {person.personNumber}--{" "}
                              </span>
                              <span className="person-dropdown-name">
                                {person.name}
                              </span>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}
                </div>

                {!addingPerson ? (
                  <button
                    type="button"
                    className="person-add-toggle"
                    onClick={() => {
                      setAddingPerson(true);
                      setError("");
                    }}
                  >
                    + Add new person
                  </button>
                ) : (
                  <div className="add-person-row">
                    <input
                      type="text"
                      aria-label="New person name"
                      placeholder="Enter a new person name"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                    />
                    <button type="button" onClick={addPerson}>
                      Add person
                    </button>
                    <button
                      type="button"
                      className="cancel-add-person"
                      onClick={() => {
                        setAddingPerson(false);
                        setNewPersonName("");
                        setError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="entry-date">Entry date</label>
                <input
                  id="entry-date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => {
                    setEntryDate(e.target.value);
                    if (e.target.value)
                      setSelectedMonth(e.target.value.slice(0, 7));
                  }}
                  required
                />
              </div>
              <div className="form-group form-group-wide">
                <label htmlFor="weights">Weights</label>
                <textarea
                  id="weights"
                  placeholder="Enter weights separated by commas, spaces, or new lines"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  rows="3"
                />
                <span className="field-hint">
                  Example: 50, 120, 250, 350
                </span>
              </div>
            </div>
            <button type="submit">Save entry to ledger</button>
          </form>

          {output && (
            <div className="students-list calculation-preview">
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
                  <tr key="range-0-99">
                    <td>0-99</td>
                    <td>{output.weight0to99}</td>
                    <td>{selectedShape === "Round" ? "₹1" : "₹15"}</td>
                    <td>₹{output.rupee0to99.toFixed(2)}</td>
                  </tr>
                  <tr key="range-100-149">
                    <td>100-149</td>
                    <td>{output.weight100to149}</td>
                    <td>{selectedShape === "Round" ? "₹8" : "₹12"}</td>
                    <td>₹{output.rupee100to149.toFixed(2)}</td>
                  </tr>
                  <tr key="range-150-199">
                    <td>150-199</td>
                    <td>{output.weight150to199}</td>
                    <td>{selectedShape === "Round" ? "₹7.25" : "₹12"}</td>
                    <td>₹{output.rupee150to199.toFixed(2)}</td>
                  </tr>
                  <tr key="range-200-299">
                    <td>200-299</td>
                    <td>{output.weight200to299}</td>
                    <td>{selectedShape === "Round" ? "₹6.75" : "₹10"}</td>
                    <td>₹{output.rupee200to299.toFixed(2)}</td>
                  </tr>
                  <tr key="range-300-399">
                    <td>300-399</td>
                    <td>{output.weight300to399}</td>
                    <td>{selectedShape === "Round" ? "₹6.5" : "₹9"}</td>
                    <td>₹{output.rupee300to399.toFixed(2)}</td>
                  </tr>
                  <tr key="range-400-499">
                    <td>400-499</td>
                    <td>{output.weight400to499}</td>
                    <td>{selectedShape === "Round" ? "₹6.25" : "₹8.5"}</td>
                    <td>₹{output.rupee400to499.toFixed(2)}</td>
                  </tr>
                  <tr key="range-500-plus">
                    <td>500+</td>
                    <td>{output.weight500}</td>
                    <td>{selectedShape === "Round" ? "₹5.75" : "₹7"}</td>
                    <td>₹{output.rupee500.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <hr />
              <div className="summary">
                <div className="summary-item">
                  <h3>Total Items</h3>
                  <div className="value">{output.totalCount}</div>
                </div>
                <div className="summary-item">
                  <h3>Total Weight</h3>
                  <div className="value">{output.totalWeight.toFixed(2)}</div>
                </div>
                <div className="summary-item">
                  <h3>Total Rupee</h3>
                  <div className="value">₹{output.totalRupee.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          <section className="people-panel">
            <div className="people-panel-header">
              <div>
                <p className="eyebrow">PEOPLE DIRECTORY</p>
                <h2>
                  Saved people <span>{people.length}</span>
                </h2>
              </div>
            </div>
            {people.length > 0 ? (
              <>
                <ul className="people-list">
                  {people
                    .slice(
                      (peoplePage - 1) * peoplePerPage,
                      peoplePage * peoplePerPage,
                    )
                    .map((person) => (
                      <li key={person._id}>
                        <div className="person-identity">
                          <span className="person-number">
                            #{person.personNumber}
                          </span>
                          <span className="person-name">{person.name}</span>
                        </div>
                        <button
                          type="button"
                          className="person-delete-button"
                          onClick={() => handleDeletePerson(person)}
                          aria-label={`Remove ${person.name}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                </ul>
                {people.length > peoplePerPage && (
                  <div className="people-pagination">
                    <button
                      type="button"
                      className="pagination-button"
                      onClick={() =>
                        setPeoplePage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={peoplePage === 1}
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page {peoplePage} of{" "}
                      {Math.ceil(people.length / peoplePerPage)}
                    </span>
                    <button
                      type="button"
                      className="pagination-button"
                      onClick={() =>
                        setPeoplePage((prev) =>
                          Math.min(
                            Math.ceil(people.length / peoplePerPage),
                            prev + 1,
                          ),
                        )
                      }
                      disabled={
                        peoplePage ===
                        Math.ceil(people.length / peoplePerPage)
                      }
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="people-empty-state">
                Add a person to start building your directory.
              </p>
            )}
            <p className="people-note">
              Removing a person keeps their existing ledger records.
            </p>
          </section>
        </div>

        {/* Display stored data */}
        <section className="monthly-records">
          <div className="records-header">
            <div>
              <p className="eyebrow">RECORDS OVERVIEW</p>
              <h2 className="storedata">{viewLabel}</h2>
            </div>
            <div className="records-controls">
              <div className="view-toggle" role="tablist" aria-label="View mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "monthwise"}
                  className={`view-toggle-btn ${
                    viewMode === "monthwise" ? "active" : ""
                  }`}
                  onClick={() => setViewMode("monthwise")}
                >
                  Monthwise
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "datewise"}
                  className={`view-toggle-btn ${
                    viewMode === "datewise" ? "active" : ""
                  }`}
                  onClick={() => setViewMode("datewise")}
                >
                  Datewise
                </button>
              </div>

              {viewMode === "monthwise" && (
                <div className="month-filter-field">
                  <label htmlFor="month-filter">Month</label>
                  <input
                    id="month-filter"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      const month = e.target.value;
                      if (!month) return;
                      setSelectedMonth(month);
                      setEntryDate(`${month}-01`);
                    }}
                  />
                </div>
              )}

              {viewMode === "datewise" && (
                <div className="month-filter-field">
                  <label htmlFor="date-filter">Date</label>
                  <input
                    id="date-filter"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      const date = e.target.value;
                      if (!date) return;
                      setSelectedDate(date);
                      setEntryDate(date);
                      setSelectedMonth(date.slice(0, 7));
                    }}
                  />
                </div>
              )}

              <button
                className="databtn"
                onClick={generateStoredPDF}
                disabled={groupedRecords.length === 0}
              >
                Download PDF
              </button>
            </div>
          </div>

          <div className="summary month-summary">
            <div className="summary-item">
              <h3>People</h3>
              <div className="value">{groupedRecords.length}</div>
            </div>
            <div className="summary-item">
              <h3>Total Items</h3>
              <div className="value">{groupedTotals.count}</div>
            </div>
            <div className="summary-item">
              <h3>Total Weight</h3>
              <div className="value">{groupedTotals.weight.toFixed(2)}</div>
            </div>
            <div className="summary-item">
              <h3>Total Rupee</h3>
              <div className="value">₹{groupedTotals.rupees.toFixed(2)}</div>
            </div>
          </div>

          {groupedRecords.length > 0 ? (
            <div className="records-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Count</th>
                    <th>Total Weight</th>
                    <th>Total Rupee</th>
                    <th>Due Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRecords.map((group) => (
                    <tr key={group.key}>
                      <td>
                        {group.earliestDate
                          ? group.earliestDate.toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td>{group.name}</td>
                      <td>
                        {group.personNumber
                          ? `#${group.personNumber}`
                          : "—"}
                      </td>
                      <td>
                        {group.shapes.length === 0 ? (
                          "—"
                        ) : group.shapes.length === 1 ? (
                          <span
                            className={`shape-badge-mini ${group.shapes[0].toLowerCase()}`}
                          >
                            {group.shapes[0]}
                          </span>
                        ) : (
                          <span className="shape-badge-mini both">Both</span>
                        )}
                      </td>
                      <td>{group.totalCount}</td>
                      <td>{group.totalWeight.toFixed(2)}</td>
                      <td>₹{group.totalRupee.toFixed(2)}</td>
                      <td>₹{group.totalDue.toFixed(2)}</td>
                      <td>
                        <button
                          onClick={() => {
                            if (group.recordIds.length === 1) {
                              navigate(`/worker/${group.recordIds[0]}`);
                            } else {
                              navigate(
                                `/worker/group?ids=${group.recordIds.join(",")}`,
                              );
                            }
                          }}
                          className="view-details-button"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">
              {viewMode === "datewise"
                ? `No records for ${dateLabel} yet.`
                : `No records for ${monthLabel} yet. Choose this month's entry date above to add the first one.`}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export default Worker;