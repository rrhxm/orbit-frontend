import React, { useState } from "react";
import Note from "./elements/Note";
import Task from "./elements/Task";
import Image from "./elements/Image";
import Audio from "./elements/Audio";
import Scribble from "./elements/Scribble";
import axios from "axios";
import "./assets/SmartSearch.css";
import { IoSearch } from "react-icons/io5";
import { IoIosReturnLeft } from "react-icons/io";

// SmartSearch component for searching elements
const SmartSearch = ({
    elements,
    onNavigate,
    onDoubleClick,
    updateElement,
    deleteElement,
    userId,
    setEditingElement,
    isVisible,
    onClose,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [resultCount, setResultCount] = useState(0);

    // Preprocess the search query by trimming and converting to lowercase
    const preprocessQuery = (query) => {
        return query.trim().toLowerCase();
    };

    // Handle search when the button is clicked
    const handleSearch = async () => {
        if (searchQuery.trim() === "") {
            setSearchResults([]);
            setErrorMessage(null);
            setResultCount(0);
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        setResultCount(0);

        try {
            const processedQuery = preprocessQuery(searchQuery);
            const response = await axios.get("/search", {
                params: {
                    user_id: userId,
                    query: processedQuery,
                },
            });

            // Validate response format
            if (!Array.isArray(response.data)) {
                throw new Error("Unexpected response format: results should be an array");
            }

            // Filter results client-side to match the query in title, content, or transcription
            const filteredResults = response.data
                .filter((el) => {
                    if (!el || !el.type) return false;
                    const titleMatch = el.title?.toLowerCase().includes(processedQuery);
                    const contentMatch = el.content?.toLowerCase().includes(processedQuery);
                    const transcriptionMatch = el.transcription?.toLowerCase().includes(processedQuery);
                    return titleMatch || contentMatch || transcriptionMatch;
                })
                .sort((a, b) => {
                    // Sort by title match priority
                    const aTitleMatch = a.title?.toLowerCase().includes(processedQuery);
                    const bTitleMatch = b.title?.toLowerCase().includes(processedQuery);
                    if (aTitleMatch && !bTitleMatch) return -1;
                    if (!aTitleMatch && bTitleMatch) return 1;
                    return 0;
                });

            setSearchResults(filteredResults);
            setResultCount(filteredResults.length);
        } catch (error) {
            console.error("Error fetching search results:", error);
            setSearchResults([]);
            setResultCount(0);
            setErrorMessage(
                error.response?.data?.detail || "Failed to fetch search results. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Highlight matched text in search results
    const highlightText = (text, query) => {
        if (!text || !query) return text;
        const regex = new RegExp(`(${query})`, "gi");
        return text.replace(regex, "<span class='highlight'>$1</span>");
    };

    // Render a single search result element
    const renderElement = (el) => {
        const commonProps = {
            element: el,
            isEditing: false,
            onDoubleClick: () => onDoubleClick(el),
            onDragStart: () => { },
            onDragEnd: () => { },
            updateElement,
            deleteElement,
            onClose: () => setEditingElement(null),
            userId,
        };

        // Determine which field matched for the snippet
        const processedQuery = preprocessQuery(searchQuery);
        let snippet = "";
        if (el.title?.toLowerCase().includes(processedQuery)) {
            snippet = el.title;
        } else if (el.content?.toLowerCase().includes(processedQuery)) {
            snippet = el.content.slice(0, 50) + (el.content.length > 50 ? "..." : "");
        } else if (el.transcription?.toLowerCase().includes(processedQuery)) {
            snippet = el.transcription.slice(0, 50) + (el.transcription.length > 50 ? "..." : "");
        }

        return (
            <div
                className="search-result-item"
                onClick={() => onNavigate(el.x, el.y)}
                onDoubleClick={() => onDoubleClick(el)}
            >
                {el.type === "note" && <Note {...commonProps} />}
                {el.type === "task" && <Task {...commonProps} />}
                {el.type === "image" && <Image {...commonProps} />}
                {el.type === "audio" && <Audio {...commonProps} />}
                {el.type === "scribble" && <Scribble {...commonProps} />}
                {/* {snippet && (
                    <div
                        className="search-snippet"
                        dangerouslySetInnerHTML={{
                            __html: highlightText(snippet, processedQuery),
                        }}
                    />
                )} */}
            </div>
        );
    };

    // Handle Enter key to trigger search
    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    if (!isVisible) return null;

    return (
        <div className="search-overlay" onClick={onClose}>
            <div className="smart-search-section" onClick={(e) => e.stopPropagation()}>
                <div className="search-bar">
                    <IoSearch alt="Search" className="search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Search notes, tasks, audio..."
                        className="search-input"
                    />
                    <button onClick={handleSearch} className="search-button">
                        <IoIosReturnLeft className="search-button-icon" />
                    </button>
                </div>

                <div className="search-results">
                    {isLoading ? (
                        <div className="loading">
                            <div className="shimmer">
                                <div className="shimmer-line"></div>
                                <div className="shimmer-line"></div>
                                <div className="shimmer-line"></div>
                            </div>
                        </div>
                    ) : errorMessage ? (
                        <div className="error-message">{errorMessage}</div>
                    ) : searchQuery.trim() === "" ? (
                        <div className="empty-search">
                            <p>Nothing yet...</p>
                        </div>
                    ) : (
                        <div className="search-results-content">
                            <div className="search-results-list">
                                {searchResults.length > 0 ? (
                                    searchResults.map((el) => (
                                        <div key={el._id}>{renderElement(el)}</div>
                                    ))
                                ) : (
                                    <div className="no-result">
                                        <p>No results found for "{searchQuery}".</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartSearch;