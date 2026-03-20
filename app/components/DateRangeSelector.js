'use client';

export default function DateRangeSelector({ startDate, endDate, onChange }) {
  return (
    <div className="form-row">
      <div>
        <label className="form-label" htmlFor="start-date">From</label>
        <input
          id="start-date"
          type="date"
          className="form-input"
          value={startDate}
          onChange={(e) => onChange(e.target.value, endDate)}
        />
      </div>
      <div>
        <label className="form-label" htmlFor="end-date">To</label>
        <input
          id="end-date"
          type="date"
          className="form-input"
          value={endDate}
          onChange={(e) => onChange(startDate, e.target.value)}
        />
      </div>
    </div>
  );
}
