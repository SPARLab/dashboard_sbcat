import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Divider } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, Remove as RemoveIcon } from '@mui/icons-material';

interface VolumeWeightModalProps {
  open: boolean;
  onClose: () => void;
}

export default function VolumeWeightModal({ open, onClose }: VolumeWeightModalProps) {
  return (
    <Dialog 
      id="volume-weight-explanation-modal"
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          Understanding Volume-Weighted Incidents
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          {/* Overview */}
          <Box>
            <Typography variant="body1" paragraph>
              This visualization adjusts how incidents appear based on the expected traffic volume in that area.
            </Typography>
          </Box>

          <Divider />

          {/* How It Works */}
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              How It Works
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              {/* Low Volume */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <TrendingUpIcon color="error" sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    Low-Volume Areas (weighted higher)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Incidents on quiet streets appear more prominent because they may indicate unexpected safety issues.
                  </Typography>
                </Box>
              </Box>

              {/* Medium Volume */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <RemoveIcon color="warning" sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    Medium-Volume Areas (baseline)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Standard weighting - incidents shown at their base level.
                  </Typography>
                </Box>
              </Box>

              {/* High Volume */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <TrendingDownIcon color="success" sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    High-Volume Areas (weighted lower)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Incidents on busy roads appear less prominent because some level of incidents is expected with high traffic.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* Why This Matters */}
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Why This Matters
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              💡 <strong>Example:</strong> Five incidents on a quiet residential street may be more concerning than five incidents on a major highway that sees thousands of cyclists daily.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This view helps identify areas where incidents are disproportionate to expected traffic patterns.
            </Typography>
          </Box>

          <Divider />

          {/* Customization */}
          <Box sx={{ bgcolor: 'primary.lighter', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              🎚️ Adjust the Weights
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use the weight controls to explore different perspectives on relative risk. You can even set weights to zero to filter out specific volume categories entirely.
            </Typography>
          </Box>

          {/* Note */}
          <Box sx={{ bgcolor: 'warning.lighter', p: 2, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>⚠️ Note:</strong> Volume levels are modeled estimates. Weight adjustments should be validated by local safety experts familiar with the area's traffic patterns. Default values represent a starting hypothesis that can be refined through analysis.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button 
          id="volume-weight-modal-close-button"
          onClick={onClose} 
          variant="contained"
          fullWidth
        >
          Got It
        </Button>
      </DialogActions>
    </Dialog>
  );
}

