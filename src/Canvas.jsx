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
// axios.defaults.baseURL = "https://orbit-backend-6wcr.onrender.com";
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
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth * 2);
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

  // Define formatCurrentDate function
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
        console.log("Loading elements from cache:", cacheKey);
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

  // Handle drag start for elements
  const handleDragStart = (event, elementId) => {
    const rect = event.target.getBoundingClientRect();
    setDragOffset({
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
    setDraggingElement(elementId);
  };

  // Handle drag end for elements
  const handleDragEnd = useCallback(
    async (event, elementId) => {
      event.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = Math.round(event.clientX - rect.left - dragOffset.offsetX);
      const newY = Math.round(event.clientY - rect.top - dragOffset.offsetY);

      const screenWidth = window.innerWidth;
      const expansionThreshold = 100;

      if (newX + expansionThreshold > canvasWidth - expansionThreshold) {
        setCanvasWidth((prevWidth) => prevWidth + screenWidth);
        requestAnimationFrame(() => {
          document.querySelector(".canvas-container").scrollLeft += screenWidth / 2;
        });
      }

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
    },
    [canvasWidth, dragOffset, user.uid, elements]
  );

  // Handle drop for new elements
  const handleDrop = async (event) => {
    event.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.round(event.clientX - rect.left - dragOffset.offsetX);
    const newY = Math.round(event.clientY - rect.top - dragOffset.offsetY);
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
          <img
            src="/add-icon.svg"
            alt="Add"
            className="add-button"
            onClick={() => setMenuOpen(!menuOpen)}
          />
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
          <div className="time-display">
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
          canvasWidth={3000}
          canvasHeight={2000}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        id="canvas"
        className="canvas"
        style={{ width: `${canvasWidth}px` }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {Array.isArray(elements) &&
          elements.map((el) => {
            if (el.type === "note") {
              return (
                <Note
                  key={el._id}
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
              );
            } else if (el.type === "task") {
              return (
                <Task
                  key={el._id}
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
              );
            } else if (el.type === "image") {
              return (
                <Image
                  key={el._id}
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
              );
            } else if (el.type === "audio") {
              return (
                <Audio
                  key={el._id}
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
              );
            } else if (el.type === "scribble") {
              return (
                <Scribble
                  key={el._id}
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
              );
            }
            return null;
          })}
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

      {/* Smart crypto Search Overlay */}
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
    </div>
  );
};

export default Canvas;