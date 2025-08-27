import Tooltip from "../../../components/Tooltip";
import InfoIcon from "../../../components/InfoIcon";

interface MoreInformationIconProps {
  text: string;
  align?: 'left' | 'center' | 'right';
  yOffset?: string;
  width?: string;
  iconSize?: string;
}

export default function MoreInformationIcon({ 
  text, 
  align = 'center', 
  yOffset = '0.15rem', 
  width, 
  iconSize = 'w-3.5 h-3.5' 
}: MoreInformationIconProps) {
  return (
    <span 
      className={`inline-flex items-center transform -translate-y-[${yOffset}]`} 
      id="safety-info-tooltip-icon-container"
    >
      <Tooltip text={text} align={align} width={width}>
        <InfoIcon className={`${iconSize} text-gray-300 hover:text-gray-500 transition-colors cursor-help`} />
      </Tooltip>
    </span>
  );
} 