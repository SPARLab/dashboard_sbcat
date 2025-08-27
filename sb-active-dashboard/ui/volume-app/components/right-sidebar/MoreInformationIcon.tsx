
import Tooltip from "../../../components/Tooltip";
import InfoIcon from "../../../components/InfoIcon";

interface InfoTooltipIconProps {
  text: string;
  align?: 'left' | 'center' | 'right';
}

export default function InfoTooltipIcon({ text, align = 'center' }: InfoTooltipIconProps) {
  return (
    <span className="inline-flex items-center ml-1 transform -translate-y-1" id="info-tooltip-icon-container">
      <Tooltip text={text} align={align}>
        <InfoIcon className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 transition-colors cursor-help" />
      </Tooltip>
    </span>
  );
} 