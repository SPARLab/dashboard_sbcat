import { Typography, Divider, List, ListItem, ListItemText, Box as MuiBox } from "@mui/material";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import VolumeBarChart from './VolumeBarChart';
import VolumePieChart from './VolumePieChart';
import { HourlyData } from '../../lib/volume-app/hourlyStats';

ChartJS.register(ArcElement, Tooltip, Legend);

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

type Props = {
  rightMenuOpen: boolean;
  rightMenuWidth: number;
  hourlyData: HourlyData[];
  showBicyclist: boolean;
  showPedestrian: boolean;
  modelCountsBy: string;
};

const VolumeRightSidebar = ({ 
  rightMenuOpen, 
  rightMenuWidth, 
  hourlyData, 
  showBicyclist, 
  showPedestrian,
  modelCountsBy 
}: Props) => (
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
        {modelCountsBy === "aadt" ? (
          <VolumeBarChart 
            hourlyData={hourlyData}
            showBicyclist={showBicyclist}
            showPedestrian={showPedestrian}
            width={280}
            height={250}
          />
        ) : (
          <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
            Hourly data only available for AADT count sites
          </Typography>
        )}
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