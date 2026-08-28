import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { reportsApi } from '../api/endpoints';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [leadConversion, setLeadConversion] = useState(null);
  const [salesPerformance, setSalesPerformance] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [customerEngagement, setCustomerEngagement] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      reportsApi.summary(),
      reportsApi.leadConversion(),
      reportsApi.salesPerformance(),
      reportsApi.revenueTrend(),
      reportsApi.customerEngagement({ limit: 5 }),
    ])
      .then(([s, lc, sp, rt, ce]) => {
        setSummary(s);
        setLeadConversion(lc);
        setSalesPerformance(sp.data);
        setRevenueTrend(rt.data);
        setCustomerEngagement(ce.data);
      })
      .catch(() => setError('Failed to load analytics'));
  }, []);

  if (error) return <div className="alert-error">{error}</div>;
  if (!summary) return <div>Loading dashboard...</div>;

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="stat-grid">
        <StatCard label="Open Leads" value={summary.openLeads} />
        <StatCard label="Open Opportunities" value={summary.openOpportunities} />
        <StatCard label="Pipeline Value" value={`$${summary.pipelineValue.toLocaleString()}`} />
        <StatCard label="Customers" value={summary.totalCustomers} />
        <StatCard label="Open Support Cases" value={summary.openSupportCases} />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Lead Conversion ({leadConversion?.conversionRate}%)</h3>
          <Doughnut
            data={{
              labels: Object.keys(leadConversion?.byStatus || {}),
              datasets: [
                {
                  data: Object.values(leadConversion?.byStatus || {}),
                  backgroundColor: ['#60a5fa', '#fbbf24', '#34d399', '#f87171', '#a78bfa'],
                },
              ],
            }}
          />
        </div>

        <div className="chart-card">
          <h3>Sales Performance by Rep</h3>
          <Bar
            data={{
              labels: salesPerformance.map((s) => s.ownerName),
              datasets: [
                { label: 'Won', data: salesPerformance.map((s) => s.wonCount), backgroundColor: '#34d399' },
                { label: 'Lost', data: salesPerformance.map((s) => s.lostCount), backgroundColor: '#f87171' },
              ],
            }}
          />
        </div>

        <div className="chart-card">
          <h3>Revenue Trend</h3>
          <Line
            data={{
              labels: revenueTrend.map((r) => r.month),
              datasets: [
                {
                  label: 'Won Revenue',
                  data: revenueTrend.map((r) => r.revenue),
                  borderColor: '#60a5fa',
                  backgroundColor: '#60a5fa55',
                  fill: true,
                },
              ],
            }}
          />
        </div>

        <div className="chart-card">
          <h3>Top Engaged Customers</h3>
          <Bar
            data={{
              labels: customerEngagement.map((c) => c.companyName),
              datasets: [
                { label: 'Activities', data: customerEngagement.map((c) => c.activityCount), backgroundColor: '#a78bfa' },
              ],
            }}
            options={{ indexAxis: 'y' }}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
