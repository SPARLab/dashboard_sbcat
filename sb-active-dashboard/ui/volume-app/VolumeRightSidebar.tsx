import { Typography, Divider, List, ListItem, ListItemText, Box as MuiBox } from "@mui/material";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import VolumeBarChart from './VolumeBarChart';
import VolumePieChart from './VolumePieChart';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// Show just the hour numbers (0-23)
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

// Randomly generate pie chart data for 3-4 categories
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

const options = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: {
      enabled: true,
      displayColors: false,
      // yAlign: 'bottom' as const,
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

type Props = {
  rightMenuOpen: boolean;
  rightMenuWidth: number;
};

const VolumeRightSidebar = ({ rightMenuOpen, rightMenuWidth }: Props) => (
  <MuiBox
    sx={{
      height: "100%",
      width: rightMenuOpen ? rightMenuWidth : "1px",
      transition: "width 0.5s ease-in-out",
      zIndex: 3000,
      position: "absolute",
      top: 0,
      right: 0,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <MenuPanel drawerOpen={rightMenuOpen} drawerWidth={rightMenuWidth}>
      <MuiBox p={2}>
        <Typography mb={2} variant="h6" sx={{ fontWeight: "bold" }}>
          STATISTICS
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
          Hourly Trends
        </Typography>
        <VolumeBarChart />
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
          Highest Volume Areas
        </Typography>
        <List dense sx={{ py: 0.00 }}>
          <ListItem sx={{ py: 0.00, minHeight: 13 }}>
            <ListItemText primary="1. State Street" sx={{ fontSize: 13 }} />
          </ListItem>
          <ListItem sx={{ py: 0.00, minHeight: 13 }}>
            <ListItemText primary="2. Castillo Street" sx={{ fontSize: 13 }} />
          </ListItem>
          <ListItem sx={{ py: 0.00, minHeight: 13 }}>
            <ListItemText primary="3. Etc" sx={{ fontSize: 13 }} />
          </ListItem>
          <ListItem sx={{ py: 0.00, minHeight: 13 }}>
            <ListItemText primary="4. etc" sx={{ fontSize: 13 }} />
          </ListItem>
          <ListItem sx={{ py: 0.00, minHeight: 13 }}>
            <ListItemText primary="5. etc" sx={{ fontSize: 13 }} />
          </ListItem>
        </List>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
          Mode Ratio
        </Typography>
        <VolumePieChart />
      </MuiBox>
    </MenuPanel>
  </MuiBox>
);

export default VolumeRightSidebar; 