import styles from './progressRing.module.scss';
import classnames from "classnames/bind";


export const ProgressRing = ({
  radius = 11.5,
  stroke = 4,
  percent
}: {
  radius?: number;
  stroke?: number;
  percent: number
}) : JSX.Element => {

  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = -1 * (circumference - percent / 100 * circumference);
  
  const cn = classnames.bind(styles);

  return <svg
    className={cn("progress-ring")}
    height={radius * 2}
    width={radius * 2}
    >
    <circle
      className={cn("circle-back")}
      strokeWidth={ stroke }
      r={ normalizedRadius }
      cx={ radius }
      cy={ radius }
      />
    <circle
      className={cn("circle-bar")}
      strokeWidth={ stroke }
      strokeDasharray={ circumference + ' ' + circumference * 100 }
      style={ { strokeDashoffset } }
      r={ normalizedRadius }
      cx={ radius }
      cy={ radius }
      />
  </svg>
}

export default ProgressRing;
