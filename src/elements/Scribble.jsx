import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { BiCollapseAlt } from "react-icons/bi";
import { FaTrashCan } from "react-icons/fa6";
import { FaMoon } from "react-icons/fa";
import { GithubPicker } from "react-color";
import { TbScribble } from "react-icons/tb";
import { BsPencilFill } from "react-icons/bs";
import { BsFillEraserFill } from "react-icons/bs";
import { IoMdColorPalette } from "react-icons/io";
import { FaCircle } from "react-icons/fa6";
import { MdSunny } from "react-icons/md";

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
    const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            console.error("2D context not supported");
            return;
        }

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
            if (!isEditing || !isDrawing) return;
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
            // Optimize by reducing redraw frequency
            ctx.beginPath();
            ctx.moveTo(x, y);
        };

        const handleMouseUp = () => {
            setIsDrawing(false);
            ctx.closePath();
            if (isEditing) saveScribble();
        };

        const handleMouseLeave = () => {
            if (isDrawing) {
                setIsDrawing(false);
                ctx.closePath();
                if (isEditing) saveScribble();
            }
        };

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            canvas.removeEventListener("mousedown", handleMouseDown);
            canvas.removeEventListener("mousemove", handleMouseMove);
            canvas.removeEventListener("mouseup", handleMouseUp);
            canvas.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [isEditing, isDrawing, tool, color, thickness, element.scribbleData]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showColorPicker && !e.target.closest(".scribble-tools")) {
                setShowColorPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showColorPicker]);

    const saveScribble = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
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
        setDeleteMenuOpen(false);
        onClose();
    };

    if (!isEditing) {
        return (
            <div
                className="scribble-closed"
                style={{
                    backgroundImage: element.scribbleData ? `url(${element.scribbleData})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: element.scribbleData ? (background === "sun" ? "#fff" : "#000") : "transparent",
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                }}
                onDoubleClick={onDoubleClick}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                draggable
            >
                {!element.scribbleData && (
                    <div className="scribble-placeholder-icon">
                        <TbScribble />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="scribble-overlay" onClick={onClose}>
            <div
                className="scribble-expanded"
                onClick={(e) => e.stopPropagation()}
            >
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    onBlur={handleTitleBlur}
                    className="scribble-title-input"
                />
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={300}
                    className="scribble-canvas"
                    style={{ background: background === "sun" ? "#fff" : "#000" }}
                />
                <div className="scribble-tools">
                    <button onClick={() => toggleTool("pencil")}>
                        <BsPencilFill />
                    </button>
                    <button onClick={() => toggleTool("eraser")}>
                        <BsFillEraserFill />
                    </button>
                    <button onClick={() => setShowColorPicker(!showColorPicker)}>
                        <IoMdColorPalette />
                    </button>
                    {showColorPicker && (
                        <div
                            className="colorpicker-wrapper"
                            style={{
                                position: "absolute",
                                top: "-70px", // Adjusted to position above the toolbar
                                left: "-5px", // Align with the button
                                zIndex: 1000,
                            }}
                        >
                            <GithubPicker
                                className="custom-colorpicker"
                                color={color}
                                onChange={changeColor}
                                triangle= "hide" // Use default triangle and position it
                            />
                        </div>
                    )}
                    <div className="thickness-options">
                        <button onClick={() => changeThickness(2)}>
                            <FaCircle size={4} />
                        </button>
                        <button onClick={() => changeThickness(5)}>
                            <FaCircle size={8} />
                        </button>
                        <button onClick={() => changeThickness(10)}>
                            <FaCircle size={15} />
                        </button>
                    </div>
                    <button onClick={toggleBackground}>
                        {background === "sun" ? <MdSunny /> : <FaMoon />}
                    </button>
                </div>
                <div className="actions">
                    <BiCollapseAlt
                        className="close-icon"
                        onClick={() => {
                            saveScribble();
                            onClose();
                        }}
                    />
                    <div className="delete">
                        <FaTrashCan
                            className="delete-icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteMenuOpen(true);
                            }}
                        />
                        {deleteMenuOpen && (
                            <div className="delete-confirmation" onClick={(e) => e.stopPropagation()}>
                                <div className="confirm">
                                    <p>Are you sure you want to delete this item permanently?</p>
                                </div>
                                <div
                                    className="cancel"
                                    onClick={() => setDeleteMenuOpen(false)}
                                >
                                    Cancel
                                </div>
                                <div
                                    className="delete-permanently"
                                    onClick={handleDelete}
                                >
                                    Delete
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Scribble;