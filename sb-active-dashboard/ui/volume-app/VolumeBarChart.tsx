import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const hourlyLabels = Array.from({ length: 24 }, (_, i) => `${i}`);
const hourlyData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 100) + 20);

const data = {
  labels: hourlyLabels,
  datasets: [
    {
      label: 'Volume',
      data: hourlyData,
      backgroundColor: 'orange',
      borderColor: 'orange',
      borderWidth: 1,
      borderRadius: 0, // No rounded tops
      maxBarThickness: 16,
      hoverBackgroundColor: 'darkgray',
      hoverBorderColor: 'darkgray',
    },
  ],
};

const options = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: {
      enabled: true,
      displayColors: false,
      position: 'nearest' as const,
      callbacks: {
        title: () => '', // No title
        label: (context: { parsed: { y: number } }) => `${context.parsed.y}`,
      },
      backgroundColor: 'rgba(255, 140, 0, 0.95)',
      borderColor: 'orange',
      borderWidth: 1,
      caretSize: 6,
      caretPadding: 20,
      padding: 8,
      bodyFont: { weight: 'bold' as const, size: 14 },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { size: 12 },
        maxRotation: 0,
        minRotation: 0,
      },
      border: { display: false },
    },
    y: {
      grid: { display: false }, // Remove horizontal grid lines
      ticks: { display: false }, // Hide y-axis labels
      border: { display: false }, // Hide y-axis line
    },
  },
  hover: {
    mode: 'index' as const,
    intersect: true,
  },
};

const VolumeBarChart = () => (
  <div style={{ width: 260, height: 140, marginBottom: 8 }}>
    <Bar data={data} options={options} />
  </div>
);

export default VolumeBarChart; 