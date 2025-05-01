import React, { useRef, useEffect, useState, useCallback } from "react";
import "./assets/styles.css";
import Spacemap from "./Spacemap";
import axios from "axios";
import { useAuth } from "./AuthContext";
import Note from "./elements/Note";
import Task from "./elements/Task";
import Image from "./elements/Image";
import Audio from "./elements/Audio";
import Scribble from "./elements/Scribble";
import SmartSearch from "./SmartSearch";
import Profile from "./Profile";
// import CatchUp from "./CatchUp";
import "./assets/SmartSearch.css";

// Icon imports
import { MdStickyNote2 } from "react-icons/md";
import { FaEarthAsia } from "react-icons/fa6";
import { FaLink } from "react-icons/fa";
import { MdAddPhotoAlternate } from "react-icons/md";
import { MdDraw } from "react-icons/md";
import { FaMicrophone } from "react-icons/fa";
import { TiWarning } from "react-icons/ti";
import { FaCircleCheck } from "react-icons/fa6";
import { MdOutlineAddTask } from "react-icons/md";
import { IoSearch } from "react-icons/io5";

// Set the base URL for Axios
axios.defaults.baseURL = "http://localhost:8001/";

// Base Element class for common functionality
class Element {
  constructor(setElements) {
    this.setElements = setElements;
  }

  // Detect changes between original and updated element
  detectChanges(original, updated) {
    if (!original || !updated) return true;

    // For images and audio, check all relevant fields including data
    if (original.type === "image" || original.type === "audio") {
      return (
        updated.x !== undefined ||
        updated.y !== undefined ||
        updated.image_data !== undefined ||
        updated.audio_data !== undefined ||
        updated.title !== undefined
      );
    }

    // For editable elements (note, task, scribble), check relevant fields
    const editableFields = {
      note: ["title", "content", "x", "y"],
      task: ["title", "content", "due_date", "due_time", "priority", "repeat", "completed", "last_reset", "is_edited", "x", "y"],
      scribble: ["title", "scribbleData", "x", "y"],
    };

    const fieldsToCheck = editableFields[original.type] || [];
    for (let field of fieldsToCheck) {
      if (updated[field] !== undefined && updated[field] !== original[field]) {
        return true;
      }
    }
    return false;
  }

  // Save a new element
  async saveElement(element, userId, showNotification) {
    try {
      const endpoint =
        element.type === "note"
          ? "/notes/"
          : element.type === "task"
            ? "/tasks/"
            : element.type === "image"
              ? "/images/"
              : element.type === "audio"
                ? "/audios/"
                : element.type === "scribble"
                  ? "/scribbles/"
                  : "/elements/";
      const response = await axios.post(endpoint, element, {
        params: { user_id: userId },
      });
      this.setElements((prevElements) => {
        const newElements = [...prevElements, { ...response.data, _id: response.data._id }];
        return newElements;
      });
      showNotification(
        `Element added successfully`,
        "notif-added",
        <FaCircleCheck />
      );
    } catch (error) {
      console.error(`Error saving ${element.type}:`, error.response?.data || error.message);
      showNotification(
        error.response?.data?.detail || `Failed to add ${element.type}`,
        "notif-error",
        <TiWarning />
      );
    }
  }

  // Update an existing element (only if changes are detected)
  async updateElement(id, updatedData, userId, originalElement, onUpdate) {
    try {
      const hasChanges = this.detectChanges(originalElement, updatedData);
      if (!hasChanges) {
        return;
      }

      if (updatedData.x !== undefined) updatedData.x = Math.round(updatedData.x);
      if (updatedData.y !== undefined) updatedData.y = Math.round(updatedData.y);
      await axios.put(`/elements/${id}`, updatedData, {
        params: { user_id: userId },
      });
      this.setElements((prevElements) =>
        prevElements.map((el) => (el._id === id ? { ...el, ...updatedData } : el))
      );
      if (onUpdate) {
        onUpdate({ ...originalElement, ...updatedData });
      }
    } catch (error) {
      console.error("Error updating element:", error);
      throw error;
    }
  }

  // Delete an element
  async deleteElement(id, userId, showNotification) {
    try {
      await axios.delete(`/elements/${id}`, {
        params: { user_id: userId },
      });
      this.setElements((prevElements) => prevElements.filter((el) => el._id !== id));
      showNotification(
        "Element deleted successfully",
        "notif-deleted",
        <FaCircleCheck />
      );
    } catch (error) {
      console.error("Error deleting element:", error);
      showNotification(
        error.response?.data?.detail || "Failed to delete element",
        "notif-error",
        <TiWarning />
      );
    }
  }
}

// Canvas component
const Canvas = () => {
  const canvasRef = useRef(null);
  const { user, logout } = useAuth();
  const [elements, setElements] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draggingElement, setDraggingElement] = useState(null);
  const [editingElement, setEditingElement] = useState(null);
  const [notification, setNotification] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showOverlay, setShowOverlay] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // const [catchUpOpen, setCatchUpOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false); // State for selection mode
  const [selectedElements, setSelectedElements] = useState([]); // State for selected elements
  const [isSelecting, setIsSelecting] = useState(false); // State for drawing selection rectangle
  const [selectionRect, setSelectionRect] = useState({ startX: 0, startY: 0, endX: 0, endY: 0 }); // Selection rectangle coordinates
  const [canvasWidth, setCanvasWidth] = useState(() => {
    // Initialize canvas width from localStorage or default to 2 * screen width
    const savedWidth = localStorage.getItem(`canvasWidth-${user?.uid}`);
    return savedWidth ? parseInt(savedWidth, 10) : window.innerWidth * 2;
  });
  const [dragOffset, setDragOffset] = useState({ offsetX: 0, offsetY: 0 });
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const elementCache = useRef(new Map());

  // Notification handler
  const showNotification = (message, type, Icon) => {
    const displayMessage = Array.isArray(message)
      ? message.map((err) => err.msg).join(", ")
      : message;
    setNotification({ message: displayMessage, type, icon: Icon });
    setTimeout(() => setNotification(null), 3000);
  };

  // Initialize the base Element class
  const elementHandler = new Element(setElements);

  // Format date for new element titles
  const formatCurrentDate = () => {
    const date = new Date();
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Load elements with pagination
  const loadElements = useCallback(async () => {
    if (!user || !hasMore) return;
    try {
      const userId = user.uid;
      const cacheKey = `${userId}-page-${page}`;
      if (elementCache.current.has(cacheKey)) {
        setElements((prev) => [...prev, ...elementCache.current.get(cacheKey)]);
        return;
      }

      const response = await axios.get("/elements/", {
        params: { user_id: userId, page: page, per_page: 10 },
      });
      if (!Array.isArray(response.data)) {
        throw new Error("Unexpected response format: elements is not an array");
      }
      if (response.data.length === 0) {
        setHasMore(false);
        return;
      }
      elementCache.current.set(cacheKey, response.data);
      setElements((prev) => {
        const existingIds = new Set(prev.map((el) => el._id));
        const newElements = response.data.filter((el) => !existingIds.has(el._id));
        return [...prev, ...newElements];
      });
    } catch (error) {
      console.error("Error loading elements:", error);
      showNotification("Failed to load elements", "notif-error", <TiWarning />);
    }
  }, [user, page, hasMore]);

  // Persist canvas width in localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(`canvasWidth-${user.uid}`, canvasWidth.toString());
    }
  }, [canvasWidth, user]);

  // Handle drag start for elements (single or multi-select)
  const handleDragStart = (event, elementId) => {
    const rect = event.target.getBoundingClientRect();
    setDragOffset({
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
    setDraggingElement(elementId);
  };

  // Handle drag end for elements (single or multi-select)
  const handleDragEnd = useCallback(
    async (event, elementId) => {
      event.preventDefault();
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const newX = Math.round(event.clientX - rect.left - dragOffset.offsetX);
      const newY = Math.round(event.clientY - rect.top - dragOffset.offsetY);

      const screenWidth = window.innerWidth;
      const expansionThreshold = 100;

      // Check if the dragged element is near the right edge
      if (newX + expansionThreshold > canvasWidth - expansionThreshold) {
        setCanvasWidth((prevWidth) => {
          const newWidth = prevWidth + screenWidth;
          requestAnimationFrame(() => {
            const centerX = newX - screenWidth / 2;
            canvas.scrollTo({
              left: centerX,
              behavior: "smooth",
            });
          });
          return newWidth;
        });
      } else {
        const scrollX = newX - screenWidth / 2;
        if (scrollX >= 0 && scrollX < canvasWidth - screenWidth) {
          requestAnimationFrame(() => {
            canvas.scrollTo({
              left: scrollX,
              behavior: "smooth",
            });
          });
        }
      }

      // If there are selected elements, move all of them
      if (selectedElements.length > 0) {
        const draggedElement = elements.find((el) => el._id === elementId);
        if (!draggedElement) return;

        const deltaX = newX - draggedElement.x;
        const deltaY = newY - draggedElement.y;

        const updatedElements = elements.map((el) => {
          if (selectedElements.includes(el._id)) {
            const updatedX = Math.round(el.x + deltaX);
            const updatedY = Math.round(el.y + deltaY);
            return { ...el, x: updatedX, y: updatedY };
          }
          return el;
        });

        setElements(updatedElements);

        // Update each selected element's position on the server
        try {
          for (const elId of selectedElements) {
            const el = updatedElements.find((e) => e._id === elId);
            const original = elements.find((e) => e._id === elId);
            await elementHandler.updateElement(elId, { x: el.x, y: el.y }, user.uid, original, null);
          }
        } catch (error) {
          console.error("Error updating selected elements:", error);
          setElements(elements); // Revert on error
        }

        // Exit selection mode after dragging
        setSelectionMode(false);
        setSelectedElements([]);
        setIsSelecting(false);
      } else {
        // Single element drag
        setElements((prev) =>
          prev.map((el) =>
            el._id === elementId ? { ...el, x: newX, y: newY } : el
          )
        );

        try {
          const original = elements.find((el) => el._id === elementId);
          await elementHandler.updateElement(elementId, { x: newX, y: newY }, user.uid, original, null);
        } catch (error) {
          console.error("Error updating element position:", error);
          const original = elements.find((el) => el._id === elementId);
          if (original) setElements((prev) => prev.map((el) => (el._id === elementId ? original : el)));
        }
      }

      setDraggingElement(null);
    },
    [canvasWidth, dragOffset, user.uid, elements, selectedElements]
  );

  // Handle drop for new elements
  const handleDrop = async (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const newX = Math.round(event.clientX - rect.left - dragOffset.offsetX);
    const newY = Math.round(event.clientY - rect.top - dragOffset.offsetY);

    const screenWidth = window.innerWidth;
    const expansionThreshold = 100;

    // Expand canvas if the new element is near the right edge
    if (newX + expansionThreshold > canvasWidth - expansionThreshold) {
      setCanvasWidth((prevWidth) => {
        const newWidth = prevWidth + screenWidth;
        requestAnimationFrame(() => {
          canvas.scrollLeft = newX - screenWidth / 2;
        });
        return newWidth;
      });
    }

    if (!Array.isArray(elements)) {
      console.error("Error: elements is not an array", elements);
      return;
    }
    if (draggingElement) {
      const existingElement = elements.find((el) => el._id === draggingElement);
      if (existingElement) {
        await elementHandler.updateElement(draggingElement, { x: newX, y: newY }, user.uid, existingElement, null);
      } else {
        const elementType = draggingElement.toLowerCase().includes("note")
          ? "note"
          : draggingElement.toLowerCase().includes("task")
            ? "task"
            : draggingElement.toLowerCase().includes("image")
              ? "image"
              : draggingElement.toLowerCase().includes("audio")
                ? "audio"
                : draggingElement.toLowerCase().includes("scribble")
                  ? "scribble"
                  : draggingElement.toLowerCase();
        const formattedDate = formatCurrentDate();
        const newElement = {
          type: elementType,
          x: newX,
          y: newY,
          title:
            elementType === "task"
              ? ""
              : elementType === "note"
                ? ""
                : elementType === "image"
                  ? `Image ${formattedDate}`
                  : elementType === "audio"
                    ? `Audio ${formattedDate}`
                    : elementType === "scribble"
                      ? `Scribble ${formattedDate}`
                      : `Note ${formattedDate}`,
        };
        // Only add fields if they have meaningful values
        if (elementType === "note") newElement.content = "";
        if (elementType === "task") {
          newElement.due_date = "";
          newElement.due_time = "";
          newElement.priority = "low";
          newElement.repeat = "no";
          newElement.completed = false;
          newElement.last_reset = new Date().toISOString().split("T")[0];
          newElement.is_edited = false;
        }
        if (elementType === "scribble") newElement.scribbleData = null;
        await elementHandler.saveElement(newElement, user.uid, showNotification);
      }
      setDraggingElement(null);
    }
  };

  // Handle double-click to edit an element
  const handleDoubleClick = useCallback((element) => {
    setEditingElement(element);
  }, []);

  // Handle double-click on canvas to toggle selection mode
  const handleCanvasDoubleClick = (event) => {
    const canvas = canvasRef.current;
    const isCanvasClick = event.target === canvas && !canvas.contains(event.target.closest('.element-wrapper')) && !canvas.contains(event.target.closest('.fullscreen-overlay'));

    if (isCanvasClick) {
      if (selectionMode) {
        // Exit selection mode and clear selected elements
        setSelectionMode(false);
        setSelectedElements([]);
        setIsSelecting(false);
      } else {
        // Enter selection mode
        setSelectionMode(true);
        setSelectedElements([]);
      }
    }
  };

  // Start drawing the selection rectangle
  const handleMouseDown = (event) => {
    if (!selectionMode) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;

    setSelectionRect({ startX, startY, endX: startX, endY: startY });
    setIsSelecting(true);
  };

  // Update the selection rectangle while dragging
  const handleMouseMove = (event) => {
    if (!isSelecting) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;

    setSelectionRect((prev) => ({ ...prev, endX, endY }));
  };

  // Select elements within the rectangle on mouse up
  const handleMouseUp = () => {
    if (!isSelecting) return;

    setIsSelecting(false);

    const { startX, startY, endX, endY } = selectionRect;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    // Select elements within the rectangle
    const selected = elements
      .filter((el) => {
        const elX = el.x;
        const elY = el.y;
        // Assume elements are roughly 200x200 for simplicity; adjust based on actual sizes if needed
        const elWidth = 200;
        const elHeight = 200;
        return (
          elX + elWidth >= minX &&
          elX <= maxX &&
          elY + elHeight >= minY &&
          elY <= maxY
        );
      })
      .map((el) => el._id);

    setSelectedElements(selected);
  };

  // Navigate to an element's location on the canvas
  const handleNavigate = useCallback((x, y) => {
    document.getElementById("canvas").scrollTo({
      left: x - window.innerWidth / 2,
      top: y - window.innerHeight / 2,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const canvasContainer = document.querySelector(".canvas-container");
    const handleWheelScroll = (event) => {
      if (canvasContainer) {
        canvasContainer.scrollLeft += event.deltaY;
      }
    };
    if (canvasContainer) {
      canvasContainer.addEventListener("wheel", handleWheelScroll);
    }
    return () => {
      if (canvasContainer) {
        canvasContainer.removeEventListener("wheel", handleWheelScroll);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuOpen &&
        !event.target.closest(".add-dropdown-menu") &&
        !event.target.closest(".add-button")
      ) {
        setMenuOpen(false);
      }
      if (
        profileOpen &&
        !event.target.closest(".expanded-profile") &&
        !event.target.closest(".profile-button")
      ) {
        setProfileOpen(false);
      }
      if (
        dropdownOpen &&
        !event.target.closest(".profile-dropdown-menu") &&
        !event.target.closest(".profile-button")
      ) {
        setDropdownOpen(false);
      }
      // if (
      //   catchUpOpen &&
      //   !event.target.closest(".catchup-expanded") &&
      //   !event.target.closest(".time-display")
      // ) {
      //   setCatchUpOpen(false);
      // }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, profileOpen, dropdownOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      setElements([]);
      setPage(1);
      setHasMore(true);
      elementCache.current.clear();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadElements();
      const handleScroll = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const nearBottom = canvas.scrollTop + canvas.clientHeight >= canvas.scrollHeight - 50;
          if (nearBottom && hasMore) {
            setPage((prev) => prev + 1);
          }
        }
      };
      canvasRef.current?.addEventListener("scroll", handleScroll);
      return () => canvasRef.current?.removeEventListener("scroll", handleScroll);
    }
  }, [user, loadElements, hasMore, page]);

  useEffect(() => {
    const handleOffline = () =>
      showNotification("No internet connection", "notif-offline", <TiWarning />);
    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const toggleOverlay = () => {
    if (!showOverlay) {
      setShowOverlay(true);
      setTimeout(() => {
        document.querySelector(".fullscreen-overlay").classList.add("active");
      }, 10);
    } else {
      document.querySelector(".fullscreen-overlay").classList.remove("active");
      setTimeout(() => {
        setShowOverlay(false);
      }, 1000);
    }
  };

  const toggleProfile = () => setProfileOpen(true);

  const handleLogout = async () => {
    try {
      await logout();
      setElements([]);
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const formattedTime = `${currentTime.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} ${currentTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const handleUpdate = (updatedElement) => {
    setElements((prevElements) =>
      prevElements.map((el) => (el._id === updatedElement._id ? updatedElement : el))
    );
  };

  return (
    <div className="canvas-container">
      {/* Floating Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="profile-button" onClick={toggleProfile}>
            <img src={user?.photoURL} alt="Profile" className="toolbar-profile-pic" />
            <span className="greeting-text">
              {user?.displayName?.split(" ")[0] || "User"}
            </span>
          </div>

          {/* Add Button */}
          <div
            className="add-button"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <img src="/overlay-logo.svg " alt="Add" className="add-button-icon" />
          </div>
          {menuOpen && (
            <div className="add-dropdown-menu">
              <div
                draggable
                onDragStart={(event) => handleDragStart(event, "Text Note")}
                className="menu-item"
              >
                <MdStickyNote2 className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={(event) => handleDragStart(event, "Image")}
                className="menu-item"
              >
                <MdAddPhotoAlternate className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={(event) => handleDragStart(event, "Task")}
                className="menu-item"
              >
                <MdOutlineAddTask className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={(event) => handleDragStart(event, "Audio")}
                className="menu-item"
              >
                <FaMicrophone className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={(event) => handleDragStart(event, "Scribble")}
                className="menu-item"
              >
                <MdDraw className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={(event) => handleDragStart(event, "Browser")}
                className="menu-item"
              >
                <FaEarthAsia className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={(event) => handleDragStart(event, "Link")}
                className="menu-item"
              >
                <FaLink className="menu-icon" />
              </div>
            </div>
          )}
        </div>

        <div className="toolbar-center">
          <div className="time-display" >
          {/* <div className="time-display" onClick={() => setCatchUpOpen(true)}> */}
            {formattedTime}
            <span className={`status-dot ${elements.length > 0 ? "green" : "red"}`}></span>
          </div>
        </div>

        <div className="toolbar-right">
          {/* Search Button */}
          <div
            className="search-tab"
            onClick={() => setIsSearchVisible(true)}
          >
            <IoSearch alt="Search" className="search-tab-icon" />
            Search
          </div>
        </div>

        <Spacemap
          elements={elements}
          canvasWidth={canvasWidth}
          canvasHeight={2000}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        id="canvas"
        className={`canvas ${selectionMode ? "selection-mode" : ""}`}
        style={{ width: `${canvasWidth}px` }}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {Array.isArray(elements) &&
          elements.map((el) => {
            const isSelected = selectedElements.includes(el._id);
            if (el.type === "note") {
              return (
                <div
                  key={el._id}
                  className={`element-wrapper ${isSelected ? "selected" : ""}`}
                >
                  <Note
                    element={el}
                    isEditing={editingElement && editingElement._id === el._id}
                    onDoubleClick={handleDoubleClick}
                    onDragStart={(event) => handleDragStart(event, el._id)}
                    onDragEnd={(event) => handleDragEnd(event, el._id)}
                    updateElement={(id, updatedData) =>
                      elementHandler.updateElement(id, updatedData, user.uid, el, null)
                    }
                    deleteElement={(id) =>
                      elementHandler.deleteElement(id, user.uid, showNotification)
                    }
                    onClose={() => setEditingElement(null)}
                    userId={user.uid}
                  />
                </div>
              );
            } else if (el.type === "task") {
              return (
                <div
                  key={el._id}
                  className={`element-wrapper ${isSelected ? "selected" : ""}`}
                >
                  <Task
                    element={el}
                    isEditing={editingElement && editingElement._id === el._id}
                    onDoubleClick={handleDoubleClick}
                    onDragStart={(event) => handleDragStart(event, el._id)}
                    onDragEnd={(event) => handleDragEnd(event, el._id)}
                    updateElement={(id, updatedData) =>
                      elementHandler.updateElement(id, updatedData, user.uid, el, null)
                    }
                    deleteElement={(id) =>
                      elementHandler.deleteElement(id, user.uid, showNotification)
                    }
                    onClose={() => setEditingElement(null)}
                    userId={user.uid}
                  />
                </div>
              );
            } else if (el.type === "image") {
              return (
                <div
                  key={el._id}
                  className={`element-wrapper ${isSelected ? "selected" : ""}`}
                >
                  <Image
                    element={el}
                    isEditing={editingElement && editingElement._id === el._id}
                    onDoubleClick={handleDoubleClick}
                    onDragStart={(event) => handleDragStart(event, el._id)}
                    onDragEnd={(event) => handleDragEnd(event, el._id)}
                    updateElement={(id, updatedData) =>
                      elementHandler.updateElement(id, updatedData, user.uid, el, handleUpdate)
                    }
                    deleteElement={(id) =>
                      elementHandler.deleteElement(id, user.uid, showNotification)
                    }
                    onClose={() => setEditingElement(null)}
                    onUpdate={handleUpdate}
                    userId={user.uid}
                  />
                </div>
              );
            } else if (el.type === "audio") {
              return (
                <div
                  key={el._id}
                  className={`element-wrapper ${isSelected ? "selected" : ""}`}
                >
                  <Audio
                    element={el}
                    isEditing={editingElement && editingElement._id === el._id}
                    onDoubleClick={handleDoubleClick}
                    onDragStart={(event) => handleDragStart(event, el._id)}
                    onDragEnd={(event) => handleDragEnd(event, el._id)}
                    updateElement={(id, updatedData) =>
                      elementHandler.updateElement(id, updatedData, user.uid, el, handleUpdate)
                    }
                    deleteElement={(id) =>
                      elementHandler.deleteElement(id, user.uid, showNotification)
                    }
                    onClose={() => setEditingElement(null)}
                    onUpdate={handleUpdate}
                    userId={user.uid}
                  />
                </div>
              );
            } else if (el.type === "scribble") {
              return (
                <div
                  key={el._id}
                  className={`element-wrapper ${isSelected ? "selected" : ""}`}
                >
                  <Scribble
                    element={el}
                    isEditing={editingElement && String(editingElement._id) === String(el._id)}
                    onDoubleClick={() => handleDoubleClick(el)}
                    onDragStart={(event) => handleDragStart(event, el._id)}
                    onDragEnd={(event) => handleDragEnd(event, el._id)}
                    updateElement={(id, updatedData) =>
                      elementHandler.updateElement(id, updatedData, user.uid, el, null)
                    }
                    deleteElement={(id) =>
                      elementHandler.deleteElement(id, user.uid, showNotification)
                    }
                    onClose={() => setEditingElement(null)}
                    userId={user.uid}
                  />
                </div>
              );
            }
            return null;
          })}

        {/* Selection Rectangle */}
        {isSelecting && (
          <div
            className="selection-rectangle"
            style={{
              left: Math.min(selectionRect.startX, selectionRect.endX),
              top: Math.min(selectionRect.startY, selectionRect.endY),
              width: Math.abs(selectionRect.endX - selectionRect.startX),
              height: Math.abs(selectionRect.endY - selectionRect.startY),
            }}
          />
        )}
      </div>

      <div className="app-version" onClick={toggleOverlay}>
        Alpha v1.0.0
      </div>
      {showOverlay && (
        <div
          className={`fullscreen-overlay ${showOverlay ? "active" : ""}`}
          onClick={toggleOverlay}
        >
          <img
            src="/overlay-logo.svg"
            alt="Orbit Logo"
            className="center-orbit-logo"
          />
        </div>
      )}

      {notification && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          {notification.icon && (
            <span className="notification-icon">{notification.icon}</span>
          )}
        </div>
      )}

      {/* Smart Search Overlay */}
      {isSearchVisible && (
        <SmartSearch
          elements={elements}
          onNavigate={handleNavigate}
          onDoubleClick={handleDoubleClick}
          updateElement={(id, updatedData) =>
            elementHandler.updateElement(id, updatedData, user.uid, elements.find((el) => el._id === id), null)
          }
          deleteElement={(id) =>
            elementHandler.deleteElement(id, user.uid, showNotification)
          }
          userId={user.uid}
          setEditingElement={setEditingElement}
          isVisible={isSearchVisible}
          onClose={() => setIsSearchVisible(false)}
        />
      )}

      {/* Profile Overlay */}
      {profileOpen && (
        <Profile
          user={user}
          handleLogout={handleLogout}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {/* Catch Up Overlay */}
      {/* {catchUpOpen && (
        <CatchUp
          currentTime={currentTime}
          elements={elements}
          onClose={() => setCatchUpOpen(false)}
        />
      )} */}
    </div>
  );
};

export default Canvas;