import { Typography, Divider, List, ListItem, ListItemText, Box as MuiBox } from "@mui/material";
import MenuPanel from "../dashboard/Menu/MenuPanel";

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
        {/* Placeholder Bar Chart */}
        <div style={{ width: 220, height: 120, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <span>Bar Chart</span>
        </div>
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
        {/* Placeholder Pie Chart */}
        <div style={{ width: 220, height: 120, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span>Pie Chart</span>
        </div>
      </MuiBox>
    </MenuPanel>
  </MuiBox>
);

export default VolumeRightSidebar; 