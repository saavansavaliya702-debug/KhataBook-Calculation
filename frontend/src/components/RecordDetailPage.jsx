import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "./RecordDetailPage.css";

const API_BASE = "http://localhost:5000";

const getRecordDate = (record) => {
  const date = new Date(record.recordDate || record.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatAddedAt = (iso) => {
  if (!iso) return "Time unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Time unknown";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function RecordDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const idsToFetch = useMemo(() => {
    const grouped = searchParams.get("ids");
    if (grouped) {
      return grouped
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return id ? [id] : [];
  }, [id, searchParams]);

  useEffect(() => {
    async function fetchRecords() {
      if (idsToFetch.length === 0) {
        setError("No record specified");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const results = await Promise.all(
          idsToFetch.map(async (recordId) => {
            const response = await fetch(`${API_BASE}/Worker/${recordId}`);
            if (!response.ok) throw new Error("Record not found");
            return response.json();
          }),
        );
        setRecords(results);
        setError("");
      } catch (err) {
        setError(err.message);
        console.log(err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecords();
  }, [idsToFetch]);

  const handleBack = () => navigate("/worker");

  const aggregate = useMemo(() => {
    if (records.length === 0) return null;

    const byShape = new Map();
    let totalCount = 0;
    let totalWeight = 0;
    let totalRupee = 0;
    const allWeights = [];

    for (const record of records) {
      const shapeKey = record.shape || "Unknown";
      if (!byShape.has(shapeKey)) {
        byShape.set(shapeKey, {
          shape: shapeKey,
          count: 0,
          weight: 0,
          rupee: 0,
          weights: [],
        });
      }
      const bucket = byShape.get(shapeKey);
      const recordWeights = (record.weight || "")
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);

      bucket.count += Number(record.totalCount || 0);
      bucket.weight += Number(record.totalWeight || 0);
      bucket.rupee += Number(record.totalRupee || 0);

      if (
        Array.isArray(record.weightEntries) &&
        record.weightEntries.length > 0
      ) {
        bucket.weights.push(...record.weightEntries);
      } else {
        bucket.weights.push(
          ...recordWeights.map((value) => ({
            value,
            addedAt: record.createdAt || record.recordDate,
          })),
        );
      }

      totalCount += Number(record.totalCount || 0);
      totalWeight += Number(record.totalWeight || 0);
      totalRupee += Number(record.totalRupee || 0);
    }

    for (const bucket of byShape.values()) {
      allWeights.push(...bucket.weights);
    }

    return {
      byShape: [...byShape.values()],
      totalCount,
      totalWeight,
      totalRupee,
      totalDue: totalRupee - records.length * 40000,
      allWeights,
      personName: records[0].name,
      personNumber: records[0].personNumber,
      recordCount: records.length,
    };
  }, [records]);

  if (loading) {
    return (
      <div className="detail-page-container">
        <video autoPlay loop muted playsInline className="bg-video">
          <source src="/background.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="detail-loading">
          <p>Loading record details...</p>
        </div>
      </div>
    );
  }

  if (error || records.length === 0 || !aggregate) {
    return (
      <div className="detail-page-container">
        <video autoPlay loop muted playsInline className="bg-video">
          <source src="/background.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="detail-error">
          <p>⚠️ Error: {error || "Record not found"}</p>
        </div>
        <button onClick={handleBack} className="detail-error-button">
          Back to Records
        </button>
      </div>
    );
  }

  const numericWeights = aggregate.allWeights
    .map((w) => Number(w.value))
    .filter((n) => !Number.isNaN(n));

  const isGroup = records.length > 1;

  return (
    <div className="detail-page-container">
      <video autoPlay loop muted playsInline className="bg-video">
        <source src="/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="detail-card">
        <div className="detail-header">
          <div className="detail-header-title">
            <p className="eyebrow">
              {isGroup ? "GROUPED RECORD DETAILS" : "RECORD DETAILS"}
            </p>
            <h2>Weight Information</h2>
          </div>
          <button className="back-button" onClick={handleBack}>
            Back to Records
          </button>
        </div>

        <div className="detail-section-header">
          <h3>Basic Information</h3>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Name</span>
            <span className="detail-value">{aggregate.personName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">ID</span>
            <span className="detail-value">
              {aggregate.personNumber ? `#${aggregate.personNumber}` : "—"}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">
              {isGroup ? "Records" : "Date"}
            </span>
            <span className="detail-value">
              {isGroup
                ? `${records.length} entries`
                : getRecordDate(records[0])?.toLocaleDateString() || "N/A"}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Shapes</span>
            <span className="detail-value">
              <span className="shape-badge-group">
                {aggregate.byShape.map((bucket) => (
                  <span
                    key={bucket.shape}
                    className={`shape-badge ${bucket.shape.toLowerCase()}`}
                  >
                    {bucket.shape}
                  </span>
                ))}
              </span>
            </span>
          </div>
        </div>

        {isGroup && (
          <>
            <div className="detail-section-header">
              <h3>Breakdown by Shape</h3>
            </div>

            <div className="shape-breakdown-grid">
              {aggregate.byShape.map((bucket) => (
                <div
                  key={bucket.shape}
                  className={`shape-breakdown-card ${bucket.shape.toLowerCase()}`}
                >
                  <div className="shape-breakdown-title">
                    <span
                      className={`shape-badge ${bucket.shape.toLowerCase()}`}
                    >
                      {bucket.shape}
                    </span>
                  </div>
                  <div className="shape-breakdown-stats">
                    <div className="shape-stat">
                      <span className="shape-stat-label">Items</span>
                      <span className="shape-stat-value">{bucket.count}</span>
                    </div>
                    <div className="shape-stat">
                      <span className="shape-stat-label">Weight</span>
                      <span className="shape-stat-value">
                        {bucket.weight.toFixed(2)}
                      </span>
                    </div>
                    <div className="shape-stat">
                      <span className="shape-stat-label">Rupee</span>
                      <span className="shape-stat-value">
                        ₹{bucket.rupee.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="shape-breakdown-weights">
                    {bucket.weights.length > 0 ? (
                      bucket.weights.map((w, idx) => (
                        <span key={idx} className="weight-tag">
                          {w.value}
                          <span className="weight-tooltip" role="tooltip">
                            Added: {formatAddedAt(w.addedAt)}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="no-weights">No weights recorded</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="detail-section-header">
          <h3>Calculation Summary</h3>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Total Items</span>
            <span className="detail-value">{aggregate.totalCount}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Total Weight</span>
            <span className="detail-value">
              {aggregate.totalWeight.toFixed(2)}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Total Rupee</span>
            <span className="detail-value">
              ₹{aggregate.totalRupee.toFixed(2)}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Due Amount</span>
            <span className="detail-value">
              ₹{aggregate.totalDue.toFixed(2)}
            </span>
          </div>
        </div>

        {!isGroup && (
          <>
            <div className="detail-section-header">
              <h3>Individual Weights</h3>
            </div>

            <div className="weights-list-container">
              {aggregate.allWeights.length > 0 ? (
                <div className="weights-list">
                  {aggregate.allWeights.map((w, idx) => (
                    <span key={idx} className="weight-tag">
                      {w.value}
                      <span className="weight-tooltip" role="tooltip">
                        Added: {formatAddedAt(w.addedAt)}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="no-weights">No weights recorded</p>
              )}
            </div>
          </>
        )}

        <div className="detail-section-header">
          <h3>Weight Statistics</h3>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total Weights</span>
            <span className="stat-value">{numericWeights.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Average Weight</span>
            <span className="stat-value">
              {numericWeights.length > 0
                ? (
                    numericWeights.reduce((a, b) => a + b, 0) /
                    numericWeights.length
                  ).toFixed(2)
                : "N/A"}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Min Weight</span>
            <span className="stat-value">
              {numericWeights.length > 0
                ? Math.min(...numericWeights)
                : "N/A"}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Max Weight</span>
            <span className="stat-value">
              {numericWeights.length > 0
                ? Math.max(...numericWeights)
                : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecordDetailPage;