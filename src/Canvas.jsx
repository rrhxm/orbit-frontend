import React, { useRef, useEffect, useState } from "react";
import "./assets/styles.css";
import Spacemap from "./Spacemap";
import axios from "axios";
import { useAuth } from "./AuthContext";
import Note from "./elements/Note";
import Task from "./elements/Task";
import Image from "./elements/Image";
import Audio from "./elements/Audio";
import SmartSearch from "./SmartSearch";
import "./assets/SmartSearch.css";

// Icon imports
import { TbNotes } from "react-icons/tb";
import { IoIosImage } from "react-icons/io";
import { FaEarthAsia } from "react-icons/fa6";
import { FaLink } from "react-icons/fa";
import { PiVideoFill } from "react-icons/pi";
import { MdDraw } from "react-icons/md";
import { LuAudioLines } from "react-icons/lu";
import { TiWarning } from "react-icons/ti";
import { FaCircleCheck } from "react-icons/fa6";
import { FaTasks } from "react-icons/fa";
import { IoSearch } from "react-icons/io5";


// Set the base URL for Axios
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL || "https://orbit-backend-6wcr.onrender.com";
// Base Element class for common functionality
class Element {
  constructor(setElements) {
    this.setElements = setElements;
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
          : "/audios/";
      const response = await axios.post(endpoint, element, {
        params: { user_id: userId },
      });
      this.setElements((prevElements) => [
        ...prevElements,
        { ...response.data, _id: response.data._id },
      ]);
      showNotification(
        `${element.type} added successfully`,
        "notif-success",
        <FaCircleCheck />
      );
    } catch (error) {
      console.error(`Error saving ${element.type}:`, error);
      showNotification(
        error.response?.data?.detail || `Failed to add ${element.type}`,
        "notif-error",
        <TiWarning />
      );
    }
  }

  // Update an existing element (no notification)
  async updateElement(id, updatedData, userId) {
    try {
      if (updatedData.x !== undefined) updatedData.x = Math.round(updatedData.x);
      if (updatedData.y !== undefined) updatedData.y = Math.round(updatedData.y);
      await axios.put(`/elements/${id}`, updatedData, {
        params: { user_id: userId },
      });
      this.setElements((prevElements) =>
        prevElements.map((el) => (el._id === id ? { ...el, ...updatedData } : el))
      );
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
      showNotification("Element deleted successfully", "notif-success", <FaCircleCheck />);
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth * 2);
  const [dragOffset, setDragOffset] = useState({ offsetX: 0, offsetY: 0 });
  const [isSearchVisible, setIsSearchVisible] = useState(false); // Add isSearchVisible state

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

  // Load elements for the user
  const loadElements = async () => {
    if (!user) return;
    try {
      const userId = user.uid;
      const response = await axios.get("/elements/", {
        params: { user_id: userId },
      });
      if (!Array.isArray(response.data)) {
        throw new Error("Unexpected response format: elements is not an array");
      }
      setElements(response.data);
    } catch (error) {
      console.error("Error loading elements:", error);
      setElements([]);
      showNotification("Failed to load elements", "notif-error", <TiWarning />);
    }
  };

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
  const handleDragEnd = async (event, elementId) => {
    event.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = event.clientX - rect.left - dragOffset.offsetX;
    const newY = event.clientY - rect.top - dragOffset.offsetY;

    const screenWidth = window.innerWidth;
    const expansionThreshold = 100;

    if (newX + expansionThreshold > canvasWidth - expansionThreshold) {
      setCanvasWidth((prevWidth) => prevWidth + screenWidth);
      requestAnimationFrame(() => {
        document.querySelector(".canvas-container").scrollLeft += screenWidth / 2;
      });
    }
    await elementHandler.updateElement(elementId, { x: newX, y: newY }, user.uid);
  };

  // Handle drop for new elements
  const handleDrop = async (event) => {
    event.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = event.clientX - rect.left - dragOffset.offsetX;
    const newY = event.clientY - rect.top - dragOffset.offsetY;
    if (!Array.isArray(elements)) {
      console.error("Error: elements is not an array", elements);
      return;
    }
    if (draggingElement) {
      const existingElement = elements.find((el) => el._id === draggingElement);
      if (existingElement) {
        await elementHandler.updateElement(draggingElement, { x: newX, y: newY }, user.uid);
      } else {
        const elementType = draggingElement.toLowerCase().includes("note")
          ? "note"
          : draggingElement.toLowerCase().includes("task")
          ? "task"
          : draggingElement.toLowerCase().includes("image")
          ? "image"
          : draggingElement.toLowerCase().includes("audio")
          ? "audio"
          : draggingElement.toLowerCase();
        const formattedDate = formatCurrentDate();
        const newElement = {
          type: elementType,
          x: newX,
          y: newY,
          title:
            elementType === "task"
              ? ""
              : elementType === "image"
              ? `Image ${formattedDate}`
              : elementType === "audio"
              ? `Audio ${formattedDate}`
              : `Note ${formattedDate}`,
          content: elementType === "note" ? "" : undefined,
          due_date: elementType === "task" ? "" : undefined,
          due_time: elementType === "task" ? "" : undefined,
          priority: elementType === "task" ? "low" : undefined,
          repeat: elementType === "task" ? "no" : undefined,
          completed: elementType === "task" ? false : undefined,
          last_reset: elementType === "task" ? new Date().toISOString().split("T")[0] : undefined,
          is_edited: elementType === "task" ? false : undefined,
        };
        await elementHandler.saveElement(newElement, user.uid, showNotification);
      }
      setDraggingElement(null);
    }
  };

  // Handle double-click to edit an element
  const handleDoubleClick = (element) => {
    setEditingElement(element);
  };

  // Navigate to an element's location on the canvas
  const handleNavigate = (x, y) => {
    document.getElementById("canvas").scrollTo({
      left: x - window.innerWidth / 2, // Center the element horizontally
      top: y - window.innerHeight / 2, // Center the element vertically
      behavior: "smooth",
    });
  };

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
        dropdownOpen &&
        !event.target.closest(".profile-dropdown-menu") &&
        !event.target.closest(".profile-button")
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, dropdownOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      loadElements();
    }
  }, [user]);

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

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

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

  return (
    <div className="canvas-container">
      {/* Floating Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="profile-button" onClick={toggleDropdown}>
            <img src={user?.photoURL} alt="Profile" className="profile-pic" />
            <span className="greeting-text">
              {user?.displayName?.split(" ")[0] || "User"}
            </span>
            {dropdownOpen && (
              <div className="profile-dropdown-menu">
                <div className="logout-button" onClick={handleLogout}>
                  Logout
                </div>
              </div>
            )}
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
                onDragStart={() => setDraggingElement("Text Note")}
                className="menu-item"
              >
                <TbNotes className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={() => setDraggingElement("Image")}
                className="menu-item"
              >
                <IoIosImage className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={() => setDraggingElement("Task")}
                className="menu-item"
              >
                <FaTasks className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={() => setDraggingElement("Audio")}
                className="menu-item"
              >
                <LuAudioLines className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={() => setDraggingElement("Drawing")}
                className="menu-item"
              >
                <MdDraw className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={() => setDraggingElement("Browser")}
                className="menu-item"
              >
                <FaEarthAsia className="menu-icon" />
              </div>
              <div
                draggable
                onDragStart={() => setDraggingElement("Link")}
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
            onClick={() => setIsSearchVisible(true)} // Now this should work
          >
            <IoSearch alt="Search" className="search-tab-icon" />
            Search
          </div>
        </div>

        <Spacemap
          elements={elements}
          canvasWidth={3000}
          canvasHeight={2000}
          onNavigate={(canvasX, canvasY) => {
            document.getElementById("canvas").scrollTo({
              left: canvasX,
              top: canvasY,
              behavior: "smooth",
            });
          }}
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
                    elementHandler.updateElement(id, updatedData, user.uid)
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
                    elementHandler.updateElement(id, updatedData, user.uid)
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
                    elementHandler.updateElement(id, updatedData, user.uid)
                  }
                  deleteElement={(id) =>
                    elementHandler.deleteElement(id, user.uid, showNotification)
                  }
                  onClose={() => setEditingElement(null)}
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
                    elementHandler.updateElement(id, updatedData, user.uid)
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

      {/* Smart Search Overlay */}
      {isSearchVisible && (
        <SmartSearch
          elements={elements}
          onNavigate={handleNavigate}
          onDoubleClick={handleDoubleClick}
          updateElement={(id, updatedData) =>
            elementHandler.updateElement(id, updatedData, user.uid)
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
    </div>
  );
};

export default Canvas;