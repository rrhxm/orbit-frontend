import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { MdEdit } from "react-icons/md";
import { FaSun, FaMoon } from "react-icons/fa";
import { SketchPicker } from "react-color";
// import "./assets/styles.css";

const Scribble = ({
    element,
    isEditing,
    onDoubleClick,
    onDragStart,
    onDragEnd,
    updateElement,
    deleteElement,
    onClose,
    userId,
}) => {
    const canvasRef = useRef(null);
    const [title, setTitle] = useState(element.title || "Untitled Scribble");
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState("pencil"); // 'pencil' or 'eraser'
    const [color, setColor] = useState("#000000");
    const [thickness, setThickness] = useState(2);
    const [background, setBackground] = useState("sun"); // 'sun' or 'moon'
    const [showColorPicker, setShowColorPicker] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;

        // Draw existing scribble if available
        if (element.scribbleData) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = element.scribbleData;
        }

        const handleMouseDown = (e) => {
            setIsDrawing(true);
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            ctx.beginPath();
            ctx.moveTo(x, y);
        };

        const handleMouseMove = (e) => {
            if (!isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            ctx.lineTo(x, y);
            ctx.stroke();
            if (tool === "eraser") {
                ctx.globalCompositeOperation = "destination-out";
                ctx.strokeStyle = "#000000";
            } else {
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = color;
            }
        };

        const handleMouseUp = () => {
            setIsDrawing(false);
            ctx.closePath();
            saveScribble();
        };

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mouseleave", handleMouseUp);

        return () => {
            canvas.removeEventListener("mousedown", handleMouseDown);
            canvas.removeEventListener("mousemove", handleMouseMove);
            canvas.removeEventListener("mouseup", handleMouseUp);
            canvas.removeEventListener("mouseleave", handleMouseUp);
        };
    }, [isDrawing, tool, color, thickness, element.scribbleData]);

    const saveScribble = () => {
        const canvas = canvasRef.current;
        const dataURL = canvas.toDataURL();
        updateElement(element._id, { title, scribbleData: dataURL }, userId);
    };

    const handleTitleChange = (e) => {
        setTitle(e.target.value);
    };

    const handleTitleBlur = () => {
        updateElement(element._id, { title }, userId);
    };

    const toggleTool = (newTool) => setTool(newTool);
    const changeColor = (newColor) => setColor(newColor.hex);
    const changeThickness = (newThickness) => setThickness(newThickness);
    const toggleBackground = () => setBackground(background === "sun" ? "moon" : "sun");

    const handleDelete = () => {
        deleteElement(element._id);
        onClose();
    };

    if (!isEditing) {
        return (
            <div
                className="scribble-closed"
                style={{
                    position: "absolute",
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    backgroundImage: element.scribbleData ? `url(${element.scribbleData})` : "none",
                    backgroundSize: "cover",
                }}
                onDoubleClick={onDoubleClick}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                draggable
            >
                <div className="scribble-title">{element.title}</div>
            </div>
        );
    }

    return (
        <div className="scribble-expanded">
            <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                className="scribble-title-input"
            />
            <canvas
                ref={canvasRef}
                width={300}
                height={200}
                style={{ background: background === "sun" ? "#fff" : "#000" }}
            />
            <div className="scribble-tools">
                <button onClick={() => toggleTool("pencil")}>Pencil</button>
                <button onClick={() => toggleTool("eraser")}>Eraser</button>
                <button onClick={() => setShowColorPicker(!showColorPicker)}>Color</button>
                {showColorPicker && (
                    <SketchPicker color={color} onChange={changeColor} />
                )}
                <button onClick={() => changeThickness(2)}>Thin</button>
                <button onClick={() => changeThickness(5)}>Medium</button>
                <button onClick={() => changeThickness(10)}>Thick</button>
                <button onClick={toggleBackground}>
                    {background === "sun" ? <FaSun /> : <FaMoon />}
                </button>
                <button onClick={handleDelete}>Delete</button>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default Scribble;