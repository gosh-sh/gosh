import { ReactNode } from 'react';
import { SwiperOptions } from 'swiper';

import { Swiper, SwiperSlide, useSwiper, SwiperProps } from 'swiper/react';
import styles from './Slider.module.scss';
import _ from "lodash";
import classnames from "classnames/bind";

// Styles must use direct files imports
import 'swiper/scss'; // core Swiper
import 'swiper/scss/pagination'; // Pagination module

// import Swiper core and required modules
import SwiperCore, {
  Pagination
} from 'swiper';

const cn = classnames.bind(styles);

// install Swiper modules
SwiperCore.use([Pagination]);

export const SlideSwitcher = ({direction, children}: {direction: "next" | "prev", children: ReactNode}) => {
  const swiper = useSwiper();
  return (
    <div onClick={() => direction === "prev" ? swiper.slidePrev() : swiper.slideNext()}>{children}</div>
  );
}

export const Slider = ({
  children,
  className,
  direction,
  onSwiper,
  ...props
} : SwiperProps & {
  children: ReactNode[];
  className?: string
}) : JSX.Element => {

  return (<Swiper
    {...props}
      onSwiper={onSwiper}
      direction={direction || 'horizontal'} 
      mousewheel={false}
      noSwiping={true}
      pagination={false} 
      className={cn("swiper", className)}>
        {children.map((item, index) => <SwiperSlide className={cn("swiper-slide")} key={index}>{item}</SwiperSlide>)}
    </Swiper>
  );
};

export default Slider;