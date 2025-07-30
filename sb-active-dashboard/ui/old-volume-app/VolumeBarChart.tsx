import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { HourlyData } from '../../lib/volume-app/hourlyStats';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface VolumeBarChartProps {
  hourlyData: HourlyData[];
  showBicyclist: boolean;
  showPedestrian: boolean;
  width?: number;
  height?: number;
}

const VolumeBarChart = ({ hourlyData, showBicyclist, showPedestrian, width = 260, height = 140 }: VolumeBarChartProps) => {
  // Prepare data for stacked bar chart
  const labels = hourlyData.map(data => data.hour.toString());
  
  const datasets = [];
  
  if (showBicyclist) {
    datasets.push({
      label: 'Bicyclist',
      data: hourlyData.map(data => data.bikeCount),
      backgroundColor: '#2196F3', // Blue for bicyclists
      borderColor: '#2196F3',
      borderWidth: 1,
      borderRadius: 0,
      maxBarThickness: 16,
      hoverBackgroundColor: '#1976D2',
      hoverBorderColor: '#1976D2',
    });
  }
  
  if (showPedestrian) {
    datasets.push({
      label: 'Pedestrian',
      data: hourlyData.map(data => data.pedCount),
      backgroundColor: '#FF9800', // Orange for pedestrians
      borderColor: '#FF9800',
      borderWidth: 1,
      borderRadius: 0,
      maxBarThickness: 16,
      hoverBackgroundColor: '#F57C00',
      hoverBorderColor: '#F57C00',
    });
  }

  const data = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Allow chart to fill container height
    plugins: {
      legend: { 
        display: datasets.length > 1, // Only show legend if both datasets are present
        position: 'bottom' as const,
        labels: { font: { size: 12 } },
      },
      title: { display: false },
      tooltip: {
        enabled: true,
        displayColors: true,
        position: 'nearest' as const,
        callbacks: {
          title: (context: any) => `Hour ${context[0].label}:00`,
          label: (context: any) => `${context.dataset.label}: ${context.parsed.y}`,
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(0, 0, 0, 0.8)',
        borderWidth: 1,
        caretSize: 6,
        caretPadding: 20,
        padding: 8,
        bodyFont: { weight: 'bold' as const, size: 12 },
        titleFont: { size: 11 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          maxRotation: 0,
          minRotation: 0,
        },
        border: { display: false },
        title: {
          display: true,
          text: 'Hour of Day',
          font: { size: 12 },
        },
        stacked: true, // Enable stacking on x axis
      },
      y: {
        grid: { display: false },
        ticks: { 
          display: true,
          font: { size: 11 },
        },
        border: { display: false },
        title: {
          display: true,
          text: 'Average Count',
          font: { size: 12 },
        },
        stacked: true, // Enable stacking on y axis
      },
    },
    hover: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  return (
    <div className="w-full" style={{ width, height, marginBottom: 56 }}>
      <Bar data={data} options={options} height={height} />
    </div>
  );
};

export default VolumeBarChart; 