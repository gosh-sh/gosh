import { ReactNode } from 'react';
import { SwiperOptions } from 'swiper';

import { Swiper, SwiperSlide } from 'swiper/react';

import styles from './Slider.module.scss';
import classnames from "classnames/bind";

import 'swiper/css'; // core Swiper
import 'swiper/css/pagination'; // Pagination module

import SwiperCore, {
  Pagination
} from 'swiper';

// install Swiper modules
SwiperCore.use([Pagination]);

export const Slider = ({
  children,
  className
} : SwiperOptions & {
  children: ReactNode[];
  className?: string
}) : JSX.Element => {

  const cn = classnames.bind(styles)

  return (<Swiper
      modules={[Pagination]}
      onSlideChange={() => console.log('slide change')}
      onSwiper={(swiper) => console.log(swiper)}
      direction={'vertical'} 
      mousewheel={true}
      pagination={{
        "clickable": true
      }} 
      className={cn("swiper", className)}>
        {children.map((item, index) => <SwiperSlide className={cn("swiper-slide")} key={index}>{item}</SwiperSlide>)}
    </Swiper>
  );
};

export default Slider;