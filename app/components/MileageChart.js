'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function MileageChart({ trips }) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Filter for business trips with miles
  const businessTrips = trips.filter(t => t.classification === 'business' && t.roundTripMiles > 0);

  if (businessTrips.length === 0) {
    return null;
  }

  // Group by date
  const dataMap = {};
  businessTrips.forEach(t => {
    const date = t.date;
    dataMap[date] = (dataMap[date] || 0) + (Number(t.roundTripMiles) || 0);
  });

  // Convert to sorted array
  const data = Object.entries(dataMap)
    .map(([date, miles]) => ({
      date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      miles: parseFloat(miles.toFixed(1)),
      rawDate: date
    }))
    .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

  return (
    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
      <div className="card-header" style={{ marginBottom: isVisible ? '1rem' : 0 }}>
        <div className="card-title">
          <span className="card-title-icon">📈</span>
          Mileage Trend
        </div>
        <button 
          className="btn btn-sm btn-secondary" 
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? '🔼 Hide' : '🔽 Show'}
        </button>
      </div>
      
      {isVisible && (
        <div style={{ width: '100%', height: 280, marginTop: '0.5rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '0.875rem'
                }}
                itemStyle={{ color: 'var(--success)' }}
                cursor={{ fill: '#334155', opacity: 0.3 }}
              />
              <Bar 
                dataKey="miles" 
                name="Miles"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="var(--accent-light)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
