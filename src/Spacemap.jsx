import React, { useEffect, useRef, useState } from "react";

const Spacemap = ({ elements }) => {
  const spacemapRef = useRef(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0 });
  const [shift, setShift] = useState(0); // Track left shift of elements

  useEffect(() => {
    const handleScroll = () => {
      const mainCanvas = document.querySelector(".canvas-container");
      if (mainCanvas) {
        const newX = mainCanvas.scrollLeft;
        const maxScroll = mainCanvas.scrollWidth - mainCanvas.clientWidth;

        // Shift elements when near right edge
        if (newX > maxScroll - 50) {
          setShift((prev) => Math.min(prev + 10, maxScroll / 20));
        } else if (newX < viewport.x) {
          setShift((prev) => Math.max(prev - 10, 0));
        }

        setViewport({
          x: Math.min(newX, maxScroll), // Clamp within bounds
          y: mainCanvas.scrollTop,
        });
      }
    };

    document.querySelector(".canvas-container")?.addEventListener("scroll", handleScroll);
    return () => document.querySelector(".canvas-container")?.removeEventListener("scroll", handleScroll);
  }, [viewport.x]);

  return (
    <div className="spacemap-container">
      <div className="spacemap" ref={spacemapRef}>
        {Array.isArray(elements) &&
          elements.map((el) => (
            <div
              key={el._id} // Use el._id instead of element.id
              className="spacemap-element"
              style={{
                left: el.x / 20 - shift, // Use el.x instead of element.x
                top: el.y / 24, // Use el.y instead of element.y
              }}
            />
          ))}
        <div
          className="spacemap-viewport"
          style={{
            left: Math.min(viewport.x / 20, 158), // Keep viewport within Spacemap bounds
            top: viewport.y / 10,
          }}
        />
      </div>
    </div>
  );
};

export default Spacemap;