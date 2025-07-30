import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const pieLabels = ['Bicyclist', 'Pedestrian'];
const pieDataArr = Array.from({ length: pieLabels.length }, () => Math.floor(Math.random() * 100) + 10);
const pieData = {
  labels: pieLabels,
  datasets: [
    {
      data: pieDataArr,
      backgroundColor: ['#FFB300', '#D32F2F'], // Burnt yellow and red
      borderColor: 'transparent',
      borderWidth: 0,
    },
  ],
};
const pieOptions = {
  responsive: true,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      align: 'start' as const,
      labels: { font: { size: 12 } },
    },
    tooltip: { enabled: true },
  },
};

const VolumePieChart = () => (
  <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Pie data={pieData} options={pieOptions} />
  </div>
);

export default VolumePieChart; 