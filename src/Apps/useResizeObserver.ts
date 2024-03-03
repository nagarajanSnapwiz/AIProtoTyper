import { useRef, useState, useEffect } from 'react';

export function useResizeObserver() {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: "100%", height: "100%" });
    useEffect(() => {
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]) {
          const { height, width } = entries[0].contentRect;
          setSize({ height: `${height - 2}px`, width: `${width}px` });
        }
      });
  
      resizeObserver.observe(ref.current!);
  
      return () => {
        resizeObserver.disconnect();
      };
    }, []);
    return { ref, width: size.width, height: size.height };
  }