import { useState, useEffect } from 'react';
import { Box, Typography, Slider, Button, Collapse, IconButton, Tooltip, Chip } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Info as InfoIcon, RestartAlt as ResetIcon, Check as CheckIcon } from '@mui/icons-material';
import { DEFAULT_VOLUME_WEIGHTS, VolumeWeightConfig } from '../../../../lib/safety-app/utils/incidentRiskMatrix';

interface VolumeWeightControlsProps {
  weights: VolumeWeightConfig;
  onWeightsChange: (weights: VolumeWeightConfig) => void;
  onInfoClick?: () => void;
}

export default function VolumeWeightControls({ 
  weights, 
  onWeightsChange,
  onInfoClick 
}: VolumeWeightControlsProps) {
  const [expanded, setExpanded] = useState(false);
  const [draftWeights, setDraftWeights] = useState<VolumeWeightConfig>(weights);

  // Sync draft weights when committed weights change externally (e.g., from reset)
  useEffect(() => {
    setDraftWeights(weights);
  }, [weights]);

  const handleWeightChange = (category: keyof VolumeWeightConfig, value: number) => {
    setDraftWeights({
      ...draftWeights,
      [category]: value
    });
  };

  const handleApply = () => {
    onWeightsChange(draftWeights);
  };

  const handleReset = () => {
    setDraftWeights(DEFAULT_VOLUME_WEIGHTS);
    onWeightsChange(DEFAULT_VOLUME_WEIGHTS);
  };

  const hasUnappliedChanges = 
    draftWeights.low !== weights.low ||
    draftWeights.medium !== weights.medium ||
    draftWeights.high !== weights.high;

  const isDefault = 
    draftWeights.low === DEFAULT_VOLUME_WEIGHTS.low &&
    draftWeights.medium === DEFAULT_VOLUME_WEIGHTS.medium &&
    draftWeights.high === DEFAULT_VOLUME_WEIGHTS.high;

  return (
    <Box 
      id="volume-weight-controls"
      sx={{ 
        bgcolor: 'background.paper', 
        borderRadius: 1, 
        p: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: expanded ? 2 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            Volume Weighting
          </Typography>
          {hasUnappliedChanges && !expanded && (
            <Chip 
              label="Pending" 
              size="small" 
              color="warning" 
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
          <Tooltip title="Learn how volume weighting works">
            <IconButton 
              id="volume-weight-info-button"
              size="small" 
              onClick={onInfoClick}
              sx={{ p: 0.5 }}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <IconButton 
          id="volume-weight-expand-button"
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ 
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s'
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>

      {/* Collapsed State - Show Current Values */}
      {!expanded && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Low: {weights.low.toFixed(1)}x • Medium: {weights.medium.toFixed(1)}x • High: {weights.high.toFixed(1)}x
          </Typography>
        </Box>
      )}

      {/* Expanded State - Show Sliders */}
      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          {/* Low Volume Weight */}
          <Box id="low-volume-weight-control">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" fontWeight="medium">
                Low Volume Areas
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight="bold" 
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white', 
                  px: 1, 
                  py: 0.25, 
                  borderRadius: 1,
                  minWidth: '48px',
                  textAlign: 'center'
                }}
              >
                {draftWeights.low.toFixed(1)}x
              </Typography>
            </Box>
            <Slider
              value={draftWeights.low}
              onChange={(_, value) => handleWeightChange('low', value as number)}
              min={0}
              max={5}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 2.5, label: '2.5' },
                { value: 5, label: '5' }
              ]}
              sx={{ mt: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {draftWeights.low === 0 
                ? 'Hidden (filtered out)' 
                : `Each incident counts ${draftWeights.low.toFixed(1)}x`}
            </Typography>
          </Box>

          {/* Medium Volume Weight */}
          <Box id="medium-volume-weight-control">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" fontWeight="medium">
                Medium Volume Areas
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight="bold" 
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white', 
                  px: 1, 
                  py: 0.25, 
                  borderRadius: 1,
                  minWidth: '48px',
                  textAlign: 'center'
                }}
              >
                {draftWeights.medium.toFixed(1)}x
              </Typography>
            </Box>
            <Slider
              value={draftWeights.medium}
              onChange={(_, value) => handleWeightChange('medium', value as number)}
              min={0}
              max={5}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 2.5, label: '2.5' },
                { value: 5, label: '5' }
              ]}
              sx={{ mt: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {draftWeights.medium === 0 
                ? 'Hidden (filtered out)' 
                : draftWeights.medium === 1 
                  ? 'Baseline (1x)' 
                  : `Each incident counts ${draftWeights.medium.toFixed(1)}x`}
            </Typography>
          </Box>

          {/* High Volume Weight */}
          <Box id="high-volume-weight-control">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" fontWeight="medium">
                High Volume Areas
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight="bold" 
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white', 
                  px: 1, 
                  py: 0.25, 
                  borderRadius: 1,
                  minWidth: '48px',
                  textAlign: 'center'
                }}
              >
                {draftWeights.high.toFixed(1)}x
              </Typography>
            </Box>
            <Slider
              value={draftWeights.high}
              onChange={(_, value) => handleWeightChange('high', value as number)}
              min={0}
              max={5}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 2.5, label: '2.5' },
                { value: 5, label: '5' }
              ]}
              sx={{ mt: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {draftWeights.high === 0 
                ? 'Hidden (filtered out)' 
                : `Each incident counts ${draftWeights.high.toFixed(1)}x`}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {hasUnappliedChanges && (
              <Box sx={{ bgcolor: 'warning.lighter', px: 1.5, py: 1, borderRadius: 1 }}>
                <Typography variant="caption" color="warning.dark" fontWeight="medium">
                  ⚠️ Changes pending - click Apply to update map
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                id="apply-weights-button"
                variant="contained"
                size="small"
                startIcon={<CheckIcon />}
                onClick={handleApply}
                disabled={!hasUnappliedChanges}
                sx={{ flex: 1 }}
              >
                Apply
              </Button>
              <Button
                id="reset-weights-button"
                variant="outlined"
                size="small"
                startIcon={<ResetIcon />}
                onClick={handleReset}
                disabled={isDefault}
                sx={{ flex: 1 }}
              >
                Reset
              </Button>
            </Box>
          </Box>

          {/* Info Text */}
          <Box sx={{ bgcolor: 'info.lighter', p: 1.5, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              💡 <strong>Tip:</strong> Adjust sliders to preview values, then click <strong>Apply</strong> to update the map. Higher weights increase visual prominence. Set to 0 to filter out a category entirely.
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

