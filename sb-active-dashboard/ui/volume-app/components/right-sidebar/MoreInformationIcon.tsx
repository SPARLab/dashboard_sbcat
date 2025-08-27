
import Tooltip from "../../../components/Tooltip";
import InfoIcon from "../../../components/InfoIcon";

interface InfoTooltipIconProps {
  text: string;
  align?: 'left' | 'center' | 'right';
  yOffset?: string;
  width?: string;
  iconSize?: string;
}

export default function InfoTooltipIcon({ text, align = 'center', yOffset = '0.15rem', width, iconSize = 'w-3.5 h-3.5' }: InfoTooltipIconProps) {
  return (
    <span 
      className={`inline-flex items-center transform -translate-y-[${yOffset}]`} 
      id="info-tooltip-icon-container"
    >
      <Tooltip text={text} align={align} width={width}>
        <InfoIcon className={`${iconSize} text-gray-300 hover:text-gray-500 transition-colors cursor-help`} />
      </Tooltip>
    </span>
  );
} 